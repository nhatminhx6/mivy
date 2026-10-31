// Xoá vật thể (inpainting) bằng MI-GAN (Picsart, MIT) chạy ngay trên trình duyệt — không tốn server.
// Model ~28MB tải 1 lần từ HuggingFace rồi cache. Chỉ xử lý vùng quanh chỗ tô → ảnh lớn vẫn nhanh,
// phần ngoài vùng tô giữ nguyên độ nét gốc.

import { getSession } from './ort';

const MODEL_URL = 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx';
const MAX_SIDE = 1024; // cạnh dài tối đa của vùng đưa vào model

/** Tải sẵn model (gọi khi mở tab để lúc bấm Xoá khỏi chờ). */
export const loadInpainter = () => getSession(MODEL_URL);

/** Nới vùng tô thêm r px (vuông) — phủ luôn viền/bóng mờ quanh vật để xoá không để lại vệt. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9; // vị trí điểm tô gần nhất bên trái
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; if (x - last <= r) tmp[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

/**
 * Xoá vùng mask (1 = cần xoá) trên canvas, vẽ kết quả đè lên chính canvas đó.
 * Trả false nếu mask rỗng.
 */
export async function inpaintCanvas(cv: HTMLCanvasElement, mask: Uint8Array): Promise<boolean> {
  const W = cv.width, H = cv.height;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return false;
  // lấy vùng quanh chỗ tô (rộng gấp đôi + tối thiểu 256px) để model có đủ ngữ cảnh xung quanh
  const pad = Math.max(128, Math.round(Math.max(x1 - x0, y1 - y0) * 0.6));
  const cx = Math.max(0, x0 - pad), cy = Math.max(0, y0 - pad);
  const cw = Math.min(W, x1 + pad + 1) - cx, ch = Math.min(H, y1 + pad + 1) - cy;
  const k = Math.min(1, MAX_SIDE / Math.max(cw, ch));
  const iw = Math.max(8, Math.round(cw * k)), ih = Math.max(8, Math.round(ch * k));

  // ảnh vùng cắt (đã thu nhỏ nếu cần)
  const crop = document.createElement('canvas'); crop.width = iw; crop.height = ih;
  const cctx = crop.getContext('2d', { willReadFrequently: true })!;
  cctx.drawImage(cv, cx, cy, cw, ch, 0, 0, iw, ih);
  const rgba = cctx.getImageData(0, 0, iw, ih).data;
  // mask vùng cắt cùng cỡ: vẽ mask ra canvas rồi co giãn
  const mFull = document.createElement('canvas'); mFull.width = cw; mFull.height = ch;
  const mctx = mFull.getContext('2d')!; const md = mctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (mask[(y + cy) * W + x + cx]) md.data[(y * cw + x) * 4 + 3] = 255;
  mctx.putImageData(md, 0, 0);
  const mSmall = document.createElement('canvas'); mSmall.width = iw; mSmall.height = ih;
  const sctx = mSmall.getContext('2d', { willReadFrequently: true })!; sctx.drawImage(mFull, 0, 0, iw, ih);
  const ma = sctx.getImageData(0, 0, iw, ih).data;

  const n = iw * ih;
  const img = new Uint8Array(3 * n), msk = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    img[i] = rgba[i * 4]; img[n + i] = rgba[i * 4 + 1]; img[2 * n + i] = rgba[i * 4 + 2];
    msk[i] = ma[i * 4 + 3] > 8 ? 0 : 255; // MI-GAN: 0 = cần vẽ lại, 255 = giữ
  }
  const { ort, session } = await loadInpainter();
  const out = await session.run({
    image: new ort.Tensor('uint8', img, [1, 3, ih, iw]),
    mask: new ort.Tensor('uint8', msk, [1, 1, ih, iw]),
  });
  const res = out.result.data as Uint8Array;
  const rd = cctx.createImageData(iw, ih);
  for (let i = 0; i < n; i++) { rd.data[i * 4] = res[i]; rd.data[i * 4 + 1] = res[n + i]; rd.data[i * 4 + 2] = res[2 * n + i]; rd.data[i * 4 + 3] = 255; }
  cctx.putImageData(rd, 0, 0);

  // chỉ dán lại phần đã tô (viền mềm) → ngoài vùng tô giữ nguyên ảnh gốc nét căng
  const patch = document.createElement('canvas'); patch.width = cw; patch.height = ch;
  const pctx = patch.getContext('2d')!;
  pctx.filter = `blur(${Math.max(1, Math.round(2 / k))}px)`;
  pctx.drawImage(mFull, 0, 0);
  pctx.filter = 'none';
  pctx.globalCompositeOperation = 'source-in';
  pctx.drawImage(crop, 0, 0, iw, ih, 0, 0, cw, ch);
  cv.getContext('2d')!.drawImage(patch, cx, cy);
  return true;
}
