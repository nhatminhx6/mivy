// Tự tìm chữ trên ảnh (watermark, chữ Trung của ảnh nguồn, giá…) bằng PaddleOCR PP-OCRv4 det (Apache-2.0, ~5MB)
// chạy trên trình duyệt. Trả về mask vùng chữ (đã nới rộng) để đưa thẳng sang xoá vật thể.

import { dilate, inpaintCanvas } from './inpaint';
import { getSession } from './ort';

const MODEL_URL = '/models/ppocr-v4-det.onnx';
const MAX_SIDE = 960;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

export const loadTextDetector = () => getSession(MODEL_URL);

/** Mask W×H (1 = có chữ) cho canvas. */
export async function findText(cv: HTMLCanvasElement, threshold = 0.25): Promise<Uint8Array> {
  const W = cv.width, H = cv.height;
  const k = Math.min(1, MAX_SIDE / Math.max(W, H));
  const iw = Math.max(32, Math.round((W * k) / 32) * 32), ih = Math.max(32, Math.round((H * k) / 32) * 32); // model cần bội số 32
  const t = document.createElement('canvas'); t.width = iw; t.height = ih;
  const tctx = t.getContext('2d', { willReadFrequently: true })!; tctx.drawImage(cv, 0, 0, iw, ih);
  const d = tctx.getImageData(0, 0, iw, ih).data, n = iw * ih;
  const x = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) x[c * n + i] = (d[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  const { ort, session } = await loadTextDetector();
  const out = await session.run({ x: new ort.Tensor('float32', x, [1, 3, ih, iw]) });
  const p = Object.values(out)[0].data as Float32Array;
  // bản đồ xác suất → phóng về cỡ ảnh
  const pm = tctx.createImageData(iw, ih);
  for (let i = 0; i < n; i++) pm.data[i * 4 + 3] = p[i] >= threshold ? 255 : 0;
  tctx.clearRect(0, 0, iw, ih); tctx.putImageData(pm, 0, 0);
  const full = document.createElement('canvas'); full.width = W; full.height = H;
  const fctx = full.getContext('2d', { willReadFrequently: true })!; fctx.drawImage(t, 0, 0, W, H);
  const a = fctx.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 100 ? 1 : 0;
  // model chỉ trả "lõi" dòng chữ → nới ra phủ hết nét chữ + viền
  return dilate(m, W, H, Math.max(4, Math.min(16, Math.round(Math.max(W, H) * 0.01))));
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

/**
 * Xoá chữ tự động cho 1 ảnh (dùng khi xoá hàng loạt). keepCut = ảnh tách nền → giữ chữ/logo in trên sản phẩm,
 * chỉ xoá chữ ở nền (watermark, chữ quảng cáo). Trả null nếu không thấy chữ.
 * Có ảnh tách nền thì trả kèm bản tách nền mới (alpha cũ + điểm ảnh mới) → khỏi tách nền lại.
 */
export async function autoEraseText(src: string, cut?: string, keepOnProduct = true): Promise<{ src: string; cut?: string } | null> {
  const im = await loadImg(src);
  const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0);
  const mask = await findText(cv);
  const cutIm = cut ? await loadImg(cut) : null;
  if (cutIm && keepOnProduct) {
    const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height;
    const tctx = t.getContext('2d', { willReadFrequently: true })!; tctx.drawImage(cutIm, 0, 0, cv.width, cv.height);
    const a = tctx.getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 0; i < mask.length; i++) if (a[i * 4 + 3] > 96) mask[i] = 0;
  }
  if (!(await inpaintCanvas(cv, mask))) return null;
  const out: { src: string; cut?: string } = { src: cv.toDataURL('image/jpeg', 0.93) };
  if (cutIm) {
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
    const x = c2.getContext('2d')!; x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(cutIm, 0, 0, cv.width, cv.height);
    out.cut = c2.toDataURL('image/png');
  }
  return out;
}
