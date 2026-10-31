// Đổi màu sản phẩm bằng code (không AI): 1 ảnh áo/giày/túi → nhiều màu cho shop bán nhiều phân loại.
// Vùng đổi = sản phẩm (alpha của ảnh tách nền) ∩ "màu chính" (dải hue chiếm nhiều nhất) → khoá kéo, đế giày,
// logo khác màu giữ nguyên. Giữ sáng tối (nếp vải, bóng) bằng cách dời độ sáng quanh màu đích.

export interface RecolorSource { w: number; h: number; rgba: Uint8ClampedArray; alpha: Uint8ClampedArray }
export interface RecolorPlan { neutral: boolean; hue: number; meanL: number; weight: Float32Array }

const rgb2hsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hue2 = (p: number, q: number, t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
const hsl2rgb = (h: number, s: number, l: number): [number, number, number] => {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, k = h / 360;
  return [hue2(p, q, k + 1 / 3) * 255, hue2(p, q, k) * 255, hue2(p, q, k - 1 / 3) * 255];
};
export const hexToHsl = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return rgb2hsl((n >> 16) & 255, (n >> 8) & 255, n & 255); };
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/** Đọc ảnh gốc + alpha của ảnh tách nền (cùng cỡ), thu nhỏ còn tối đa maxSide. */
export function readSource(img: HTMLImageElement, cut: HTMLImageElement, maxSide = 0): RecolorSource {
  const k = maxSide ? Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, w, h); const rgba = x.getImageData(0, 0, w, h).data;
  x.clearRect(0, 0, w, h); x.drawImage(cut, 0, 0, w, h); const cd = x.getImageData(0, 0, w, h).data;
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < alpha.length; i++) alpha[i] = Math.min(cd[i * 4 + 3], rgba[i * 4 + 3]);
  return { w, h, rgba, alpha };
}

/**
 * Tìm vùng đổi màu. whole = cả sản phẩm; không thì chỉ "màu chính" (tolerance: độ rộng dải hue, độ).
 * Sản phẩm trắng/đen/xám (ít bão hoà) → màu chính là phần trung tính.
 */
export function planRecolor(src: RecolorSource, whole: boolean, tolerance = 28): RecolorPlan {
  const { w, h, rgba, alpha } = src, n = w * h;
  const bins = new Float32Array(36); let neutralW = 0, colorW = 0;
  const hs = new Float32Array(n), ss = new Float32Array(n), ls = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [hh, s, l] = rgb2hsl(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]); hs[i] = hh; ss[i] = s; ls[i] = l;
    const a = alpha[i] / 255; if (a < 0.5) continue;
    if (s < 0.18 || l < 0.08 || l > 0.94) neutralW += a; else { colorW += a * s; bins[Math.floor(hh / 10) % 36] += a * s; }
  }
  const neutral = neutralW > colorW * 1.6;
  let best = 0; for (let b = 1; b < 36; b++) if (bins[b] + bins[(b + 35) % 36] + bins[(b + 1) % 36] > bins[best] + bins[(best + 35) % 36] + bins[(best + 1) % 36]) best = b;
  // hue trung bình có trọng số quanh bin mạnh nhất
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) if (alpha[i] > 127 && ss[i] >= 0.18 && hueDist(hs[i], best * 10 + 5) < 20) { sx += Math.cos((hs[i] * Math.PI) / 180) * ss[i]; sy += Math.sin((hs[i] * Math.PI) / 180) * ss[i]; }
  const hue = ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
  const weight = new Float32Array(n); let lw = 0, lsum = 0;
  for (let i = 0; i < n; i++) {
    const a = alpha[i] / 255; if (!a) continue;
    let m = 1;
    if (!whole) {
      if (neutral) m = ss[i] < 0.22 ? 1 : ss[i] < 0.32 ? (0.32 - ss[i]) / 0.1 : 0;
      else {
        const d = hueDist(hs[i], hue), satOk = ss[i] < 0.1 ? 0 : ss[i] < 0.18 ? (ss[i] - 0.1) / 0.08 : 1;
        m = (d <= tolerance ? 1 : d < tolerance + 12 ? (tolerance + 12 - d) / 12 : 0) * satOk;
      }
    }
    weight[i] = a * m; lw += weight[i]; lsum += weight[i] * ls[i];
  }
  return { neutral, hue, meanL: lw ? lsum / lw : 0.5, weight };
}

/** Vẽ 1 biến thể màu ra canvas (ảnh gốc, chỉ vùng sản phẩm đổi màu). */
export function renderVariant(src: RecolorSource, plan: RecolorPlan, hex: string, out?: HTMLCanvasElement): HTMLCanvasElement {
  const { w, h, rgba } = src;
  const [th, ts, tl] = hexToHsl(hex);
  const c = out || document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; const id = x.createImageData(w, h); const d = id.data;
  // giữ tương phản sáng tối của vải, nén lại khi màu đích quá tối/sáng để khỏi cháy
  const k = tl < 0.2 || tl > 0.85 ? 0.55 : 0.9;
  for (let i = 0; i < w * h; i++) {
    const j = i * 4, wt = plan.weight[i];
    if (wt <= 0) { d[j] = rgba[j]; d[j + 1] = rgba[j + 1]; d[j + 2] = rgba[j + 2]; d[j + 3] = rgba[j + 3]; continue; }
    const [, s, l] = rgb2hsl(rgba[j], rgba[j + 1], rgba[j + 2]);
    const nl = Math.max(0.02, Math.min(0.98, tl + (l - plan.meanL) * k));
    const ns = plan.neutral ? ts : Math.min(1, ts * (0.6 + 0.4 * Math.min(1, s / 0.5)));
    const [r, g, b] = hsl2rgb(th, ns, nl);
    d[j] = rgba[j] + (r - rgba[j]) * wt; d[j + 1] = rgba[j + 1] + (g - rgba[j + 1]) * wt; d[j + 2] = rgba[j + 2] + (b - rgba[j + 2]) * wt; d[j + 3] = rgba[j + 3];
  }
  x.putImageData(id, 0, 0);
  return c;
}

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Đen', hex: '#222222' }, { name: 'Trắng', hex: '#f2f2f0' }, { name: 'Xám', hex: '#8c8c8c' }, { name: 'Be', hex: '#d8c3a5' },
  { name: 'Nâu', hex: '#7a4a2b' }, { name: 'Đỏ', hex: '#c62828' }, { name: 'Đỏ đô', hex: '#7b1e2b' }, { name: 'Hồng', hex: '#f2a0b8' },
  { name: 'Cam', hex: '#e8711c' }, { name: 'Vàng', hex: '#f2c94c' }, { name: 'Xanh rêu', hex: '#5b6b3a' }, { name: 'Xanh mint', hex: '#a8dcc8' },
  { name: 'Xanh dương', hex: '#2160b8' }, { name: 'Xanh navy', hex: '#1c2b4a' }, { name: 'Tím', hex: '#6b4c9a' }, { name: 'Tím pastel', hex: '#c7b6e6' },
];
