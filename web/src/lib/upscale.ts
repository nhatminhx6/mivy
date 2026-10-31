// Làm nét + phóng to ảnh bằng Real-ESRGAN general v3 (BSD-3, ~5MB, để sẵn ở /models) chạy trên trình duyệt.
// Ảnh chia ô nhỏ (có chồng mép) → chạy từng ô → ghép lại, báo tiến độ. Model luôn ×4; muốn ×2 thì thu lại.

import { getSession } from './ort';

const MODEL_URL = '/models/realesr-general-x4v3.onnx';
const TILE = 192; // cạnh ô đưa vào model
const PAD = 12; // chồng mép mỗi bên để ghép không lộ đường nối
export const MAX_OUT = 4096; // cạnh dài tối đa của ảnh ra

export const loadUpscaler = () => getSession(MODEL_URL, true);

/** Các mức phóng hợp lệ cho ảnh w×h (ảnh ra không quá MAX_OUT). */
export const scalesFor = (w: number, h: number) => ([2, 4] as const).filter((s) => Math.max(w, h) * s <= MAX_OUT);

export async function upscaleImage(img: CanvasImageSource & { width: number; height: number }, scale: 2 | 4, onProgress?: (p: number) => void): Promise<HTMLCanvasElement> {
  const W = img.width, H = img.height;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, W, H); // ảnh trong suốt → nền trắng
  sctx.drawImage(img, 0, 0, W, H);
  const out = document.createElement('canvas'); out.width = W * 4; out.height = H * 4;
  const octx = out.getContext('2d')!;
  const { ort, session } = await loadUpscaler();

  const cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
  let done = 0;
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const x0 = tx * TILE, y0 = ty * TILE, x1 = Math.min(W, x0 + TILE), y1 = Math.min(H, y0 + TILE);
    const px0 = Math.max(0, x0 - PAD), py0 = Math.max(0, y0 - PAD), px1 = Math.min(W, x1 + PAD), py1 = Math.min(H, y1 + PAD);
    const w = px1 - px0, h = py1 - py0, n = w * h;
    const d = sctx.getImageData(px0, py0, w, h).data;
    const inp = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { inp[i] = d[i * 4] / 255; inp[n + i] = d[i * 4 + 1] / 255; inp[2 * n + i] = d[i * 4 + 2] / 255; }
    const res = await session.run({ input: new ort.Tensor('float32', inp, [1, 3, h, w]) });
    const o = res.output.data as Float32Array;
    const ow = w * 4, oh = h * 4, on = ow * oh;
    const tile = new ImageData(ow, oh);
    for (let i = 0; i < on; i++) {
      tile.data[i * 4] = Math.max(0, Math.min(255, o[i] * 255 + 0.5));
      tile.data[i * 4 + 1] = Math.max(0, Math.min(255, o[on + i] * 255 + 0.5));
      tile.data[i * 4 + 2] = Math.max(0, Math.min(255, o[2 * on + i] * 255 + 0.5));
      tile.data[i * 4 + 3] = 255;
    }
    // chỉ dán phần lõi của ô (bỏ mép chồng)
    octx.putImageData(tile, px0 * 4, py0 * 4, (x0 - px0) * 4, (y0 - py0) * 4, (x1 - x0) * 4, (y1 - y0) * 4);
    onProgress?.(++done / (cols * rows));
  }
  if (scale === 4) return out;
  const half = document.createElement('canvas'); half.width = W * 2; half.height = H * 2;
  const hctx = half.getContext('2d')!; hctx.imageSmoothingQuality = 'high'; hctx.drawImage(out, 0, 0, half.width, half.height);
  return half;
}
