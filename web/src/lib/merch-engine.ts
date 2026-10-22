// Vẽ mockup vật phẩm thương hiệu bằng code (vector có khối: bóng đổ, highlight, nếp vải, chất liệu).
// Ghép logo/brand vào vùng in rồi phủ shading để trông như in thật. KHÔNG gen AI realtime.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';
import type { PosterTheme } from '@/types';

export interface MerchItem { id: string; label: string; }

export const MERCH_ITEMS: MerchItem[] = [
  { id: 'tshirt', label: 'Áo thun' },
  { id: 'cap', label: 'Nón' },
  { id: 'mug', label: 'Ly nước' },
  { id: 'tumbler', label: 'Ly giữ nhiệt' },
  { id: 'tote', label: 'Túi tote' },
  { id: 'namecard', label: 'Name card' },
  { id: 'standee', label: 'Standee' },
  { id: 'box', label: 'Túi giấy' },
  { id: 'phonecase', label: 'Ốp điện thoại' },
];

export interface MerchOpts {
  item: string;
  productColor: string;
  bgColor?: string;
  logoImg?: HTMLImageElement | null;
  brandName?: string;
  slogan?: string;
  accent?: string;
  fontHeadingId?: string;
  contact?: string;
  mode?: 'vector' | 'photo';
  mockupImg?: HTMLImageElement | null;
  scale?: number; // supersampling khi xuất file
  theme?: Partial<PosterTheme>; // tông poster (tuỳ chọn) — đồng bộ nền/nhãn với poster
  // --- studio vật phẩm (ảnh thật) ---
  productTint?: string;            // đổi màu sản phẩm ngay trên ảnh (cần maskImg); trắng/bỏ trống = giữ nguyên
  maskImg?: HTMLImageElement | null; // mặt nạ vùng sản phẩm (/mockups/masks/<item>.png, tạo offline)
  printBox?: { x: number; y: number; w: number; h: number }; // vị trí in (mặc định PHOTO_PRINT)
  logoScale?: number;              // 0.5–1.3, phóng quanh tâm vùng in
  logoInk?: LogoInk;               // auto: sản phẩm sáng in logo màu, sản phẩm tối in logo trắng
}

export type LogoInk = 'auto' | 'color' | 'white' | 'black';

// Vị trí in từng món + khổ in thật (cm) để xuất file in 300dpi.
// Vùng in trên ảnh mockup thật (toạ độ trong khung 1080×1080). Chỉ item có ảnh mới liệt kê.
export const PHOTO_PRINT: Record<string, { x: number; y: number; w: number; h: number }> = {
  tshirt: { x: 417, y: 185, w: 250, h: 220 },
  mug: { x: 500, y: 430, w: 310, h: 260 },
  tumbler: { x: 450, y: 445, w: 190, h: 230 },
  tote: { x: 379, y: 540, w: 300, h: 280 },
  cap: { x: 425, y: 320, w: 230, h: 150 },
  box: { x: 545, y: 450, w: 250, h: 200 },
};

export function hasPhoto(item: string): boolean {
  return item in PHOTO_PRINT;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lum(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Phủ khối sáng-tối lên vùng đã clip (soft-light): tạo cảm giác 3D + chất liệu.
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, orient: 'v' | 'h' = 'v', strength = 1) {
  // Khối nhẹ, tinh tế (tránh soft-light bóng loáng gây "ảo")
  ctx.save();
  const g = orient === 'v' ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, `rgba(255,255,255,${0.1 * strength})`);
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.14 * strength})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Highlight rất nhẹ — gần như tắt (giữ chữ ký API, hạn chế gây ảo).
function gloss(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a = 0.5) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(255,255,255,${a * 0.14})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.filter = 'blur(26px)';
  ctx.fillStyle = 'rgba(15,23,42,0.28)';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function placeBrand(
  ctx: CanvasRenderingContext2D, o: MerchOpts,
  x: number, y: number, w: number, h: number, inkColor: string, font: string,
) {
  if (o.logoImg) {
    const im = o.logoImg;
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (iw && ih) {
      const scale = Math.min(w / iw, h / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      return;
    }
  }
  const name = (o.brandName || 'BRAND').toUpperCase();
  ctx.save();
  ctx.fillStyle = inkColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = Math.min(h * 0.55, w / Math.max(5, name.length) * 1.7);
  ctx.font = `800 ${fs}px ${font}`;
  while (ctx.measureText(name).width > w && fs > 8) { fs -= 2; ctx.font = `800 ${fs}px ${font}`; }
  ctx.fillText(name, x + w / 2, y + h / 2 - (o.slogan ? fs * 0.38 : 0));
  if (o.slogan) {
    ctx.font = `500 ${fs * 0.4}px ${font}`;
    ctx.fillStyle = o.accent || inkColor;
    ctx.fillText(o.slogan, x + w / 2, y + h / 2 + fs * 0.52);
  }
  ctx.restore();
}


export const PRINT_SPOTS: Record<string, { id: string; name: string; box: { x: number; y: number; w: number; h: number }; cm: number }[]> = {
  tshirt: [{ id: 'giua-nguc', name: 'Giữa ngực', box: PHOTO_PRINT.tshirt, cm: 25 }, { id: 'nguc-trai', name: 'Ngực trái', box: { x: 606, y: 195, w: 88, h: 72 }, cm: 9 }],
  cap: [{ id: 'mat-truoc', name: 'Mặt trước', box: PHOTO_PRINT.cap, cm: 10 }],
  mug: [{ id: 'than-ly', name: 'Thân ly', box: PHOTO_PRINT.mug, cm: 8 }],
  tumbler: [{ id: 'than-ly', name: 'Thân ly', box: PHOTO_PRINT.tumbler, cm: 6 }],
  tote: [{ id: 'giua-tui', name: 'Giữa túi', box: PHOTO_PRINT.tote, cm: 25 }],
  box: [{ id: 'mat-truoc', name: 'Mặt trước', box: PHOTO_PRINT.box, cm: 12 }],
};
// Độ cong thân (nửa góc logo trải trên thân trụ, rad) và độ bóng bề mặt (men sứ/nhựa bóng phủ cả lên logo).
const CURVE: Record<string, number> = { mug: 0.58, tumbler: 0.57, cap: 0.37 };
const GLOSS: Record<string, number> = { mug: 0.75, tumbler: 0.65, box: 0.12, cap: 0.08, tshirt: 0.04, tote: 0.04 };

// Màu mực thực tế cho 1 màu sản phẩm (auto: sáng → logo màu, tối → logo trắng).
export function inkFor(ink: LogoInk | undefined, productTint?: string): Exclude<LogoInk, 'auto'> {
  if (ink && ink !== 'auto') return ink;
  return productTint && lum(productTint) < 0.45 ? 'white' : 'color';
}

// Logo tô 1 màu (bản trắng/đen) — cache theo ảnh gốc.
const tintCache = new WeakMap<HTMLImageElement, Record<string, HTMLCanvasElement>>();
export function tintedLogo(im: HTMLImageElement, color: string): HTMLCanvasElement {
  const m = tintCache.get(im) || {};
  if (!m[color]) {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
    const x = c.getContext('2d')!;
    x.drawImage(im, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    m[color] = c; tintCache.set(im, m);
  }
  return m[color];
}

// Thống kê ảnh gốc ở đúng kích thước đang vẽ (cache): độ sáng từng điểm, mặt nạ, trung vị & điểm sáng nhất trong vùng sản phẩm.
interface PhotoStats { w: number; h: number; blur: number; lum: Float32Array; lumBig: Float32Array; mask: Uint8ClampedArray; med: number; hi: number }
const statCache = new WeakMap<HTMLImageElement, PhotoStats>();
// blur: làm mịn độ sáng trước khi dùng (khử nhiễu nén JPEG — nếu không, vệt bóng/nếp bị vỡ ô vuông)
function photoStats(photo: HTMLImageElement, mask: HTMLImageElement, w: number, h: number, blur: number): PhotoStats {
  const c = statCache.get(photo);
  if (c && c.w === w && c.h === h && c.blur === blur) return c;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d', { willReadFrequently: true })!;
  if (blur > 0) x.filter = `blur(${blur}px)`;
  x.drawImage(photo, 0, 0, w, h);
  x.filter = 'none';
  const p = x.getImageData(0, 0, w, h).data;
  // nền sáng cục bộ (mịn mạnh) — vệt bóng = chỗ sáng hơn hẳn xung quanh
  x.filter = `blur(${Math.max(4, Math.round((w / 1080) * 22))}px)`;
  x.drawImage(photo, 0, 0, w, h);
  x.filter = 'none';
  const pb = x.getImageData(0, 0, w, h).data;
  x.clearRect(0, 0, w, h); x.drawImage(mask, 0, 0, w, h);
  const m = x.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h); const lumBig = new Float32Array(w * h); const ma = new Uint8ClampedArray(w * h); const hist = new Uint32Array(256); let n = 0;
  for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
    lum[j] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; ma[j] = m[i + 3];
    lumBig[j] = 0.299 * pb[i] + 0.587 * pb[i + 1] + 0.114 * pb[i + 2];
    if (ma[j] > 200) { hist[Math.round(lum[j])]++; n++; }
  }
  const q = (f: number) => { let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= n * f) return v; } return 255; };
  const s = { w, h, blur, lum, lumBig, mask: ma, med: Math.max(40, q(0.5)), hi: Math.max(60, q(0.995)) };
  statCache.set(photo, s);
  return s;
}

// Đổi màu vùng sản phẩm, GIỮ nếp/độ sáng tối: màu sáng → nhân theo độ sáng tương đối; màu tối → CỘNG chênh lệch sáng
// (áo đen vẫn thấy nếp gấp thay vì đen bệt).
function recolor(ctx: CanvasRenderingContext2D, st: PhotoStats, tint: string) {
  const img = ctx.getImageData(0, 0, st.w, st.h); const d = img.data;
  const s = tint.replace('#', ''); const t = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  const w = Math.min(1, Math.max(0, (0.55 - lum(tint)) / 0.45));
  for (let j = 0, i = 0; j < st.lum.length; j++, i += 4) {
    const a = st.mask[j] / 255; if (a < 0.01) continue;
    const L = st.lum[j], shade = Math.min(1.25, L / st.med), dl = (L - st.med) * 1.05;
    for (let c = 0; c < 3; c++) {
      const v = Math.min(255, Math.max(0, t[c] * shade * (1 - w) + (t[c] + dl) * w));
      d[i + c] += (v - d[i + c]) * a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Vệt bóng của men sứ/nhựa: phủ trắng lên cả logo ở những điểm ảnh gốc sáng nhất (logo như in dưới lớp men).
function glaze(ctx: CanvasRenderingContext2D, st: PhotoStats, gloss: number) {
  if (gloss <= 0) return;
  const img = ctx.getImageData(0, 0, st.w, st.h); const d = img.data;
  for (let j = 0, i = 0; j < st.lum.length; j++, i += 4) {
    if (st.mask[j] < 3) continue;
    // đỉnh sáng cục bộ (không phải vùng sáng chung) → chỉ vệt bóng thật được làm nổi
    const u = Math.min(1, Math.max(0, (st.lum[j] - st.lumBig[j] - 5) / 28)) * (st.lum[j] > st.med ? 1 : 0);
    if (u <= 0) continue;
    const s = u * u * (3 - 2 * u) * gloss * (st.mask[j] / 255); // smoothstep: chuyển mềm, không gắt
    d[i] += (255 - d[i]) * s; d[i + 1] += (255 - d[i + 1]) * s; d[i + 2] += (255 - d[i + 2]) * s;
  }
  ctx.putImageData(img, 0, 0);
}

// Vẽ logo uốn theo thân trụ: cắt dải dọc, dải ở mép co lại (sin), giữa võng nhẹ xuống như vành ly nhìn từ trên.
function drawCurved(x: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, theta: number, S: number) {
  if (!theta) { x.drawImage(src, dx, dy, dw, dh); return; }
  const n = Math.max(24, Math.ceil((dw * S) / 2)), st = Math.sin(theta);
  for (let k = 0; k < n; k++) {
    const s0 = (k / n) * 2 - 1, s1 = ((k + 1) / n) * 2 - 1;
    const u0 = (Math.asin(s0 * st) / theta + 1) / 2, u1 = (Math.asin(s1 * st) / theta + 1) / 2;
    const phi = Math.asin(((s0 + s1) / 2) * st);
    const sag = (Math.cos(phi) - Math.cos(theta)) * 0.05 * dh;
    x.drawImage(src, u0 * sw, 0, Math.max(0.5, (u1 - u0) * sw), sh, dx + ((s0 + 1) / 2) * dw, dy + sag, dw / n + 0.6, dh);
  }
}

export function drawMerch(canvas: HTMLCanvasElement, o: MerchOpts) {
  drawMerchCore(canvas, o);
  drawWatermark(canvas); // gói Free — luôn chạy dù Core return sớm
}

function drawMerchCore(canvas: HTMLCanvasElement, o: MerchOpts) {
  const W = 1080, H = 1080;
  const S = Math.max(1, Math.min(4, o.scale || 1));
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(S, S); ctx.imageSmoothingQuality = 'high';
  const font = fontFamilyById(o.fontHeadingId);
  const pc = o.productColor || '#1f2937';
  const onProduct = lum(pc) > 0.62 ? '#17181c' : '#ffffff';
  const accent = o.accent || '#10b981';
  const cx = W / 2;

  // ===== MODE ẢNH THẬT: vẽ ảnh mockup + ghép logo vào vùng in (blend multiply) =====
  if (o.mode === 'photo' && o.mockupImg && PHOTO_PRINT[o.item]) {
    ctx.drawImage(o.mockupImg, 0, 0, W, H);
    const tint = o.productTint && o.productTint.toLowerCase() !== '#ffffff' ? o.productTint : undefined;
    const st = o.maskImg ? photoStats(o.mockupImg, o.maskImg, canvas.width, canvas.height, ((GLOSS[o.item] ?? 0) > 0.5 ? 2.4 : 0.8) * S) : null;
    if (tint && st) recolor(ctx, st, tint);
    const base = o.printBox || PHOTO_PRINT[o.item];
    const k = Math.max(0.4, Math.min(1.4, o.logoScale ?? 1));
    const pa = { x: base.x + (base.w * (1 - k)) / 2, y: base.y + (base.h * (1 - k)) / 2, w: base.w * k, h: base.h * k };
    if (o.logoImg && (o.logoInk || o.maskImg)) {
      // studio: mực theo màu sản phẩm, logo uốn theo thân, ăn theo nếp/độ sáng, cắt theo mép, bóng men phủ lên
      const ink = inkFor(o.logoInk, tint);
      const src: CanvasImageSource = ink === 'color' ? o.logoImg : tintedLogo(o.logoImg, ink === 'white' ? '#ffffff' : '#111111');
      const iw = o.logoImg.naturalWidth || o.logoImg.width, ih = o.logoImg.naturalHeight || o.logoImg.height;
      const sc = Math.min(pa.w / iw, pa.h / ih), dw = iw * sc, dh = ih * sc;
      const lc = document.createElement('canvas'); lc.width = canvas.width; lc.height = canvas.height;
      const lx = lc.getContext('2d', { willReadFrequently: true })!; lx.scale(S, S); lx.imageSmoothingQuality = 'high';
      drawCurved(lx, src, iw, ih, pa.x + (pa.w - dw) / 2, pa.y + (pa.h - dh) / 2, dw, dh, CURVE[o.item] || 0, S);
      lx.setTransform(1, 0, 0, 1, 0, 0);
      if (o.maskImg) { lx.globalCompositeOperation = 'destination-in'; lx.drawImage(o.maskImg, 0, 0, lc.width, lc.height); lx.globalCompositeOperation = 'source-over'; }
      if (st && ink !== 'color') {
        // mực trắng/đen phủ (không nhân): tự ăn theo nếp vải/độ sáng tối của sản phẩm
        const ld = lx.getImageData(0, 0, lc.width, lc.height); const p = ld.data;
        for (let j = 0, i = 0; j < st.lum.length; j++, i += 4) {
          if (!p[i + 3]) continue;
          const f = Math.min(1.12, Math.max(0.5, st.lum[j] / st.med));
          p[i] *= f; p[i + 1] *= f; p[i + 2] *= f;
        }
        lx.putImageData(ld, 0, 0);
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = ink === 'white' ? 0.93 : 0.95;
      ctx.globalCompositeOperation = ink === 'white' ? 'source-over' : 'multiply';
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
      if (st) glaze(ctx, st, GLOSS[o.item] ?? 0);
      return;
    }
    // (trang Logo / Brand pack) đo độ sáng vùng in để chọn cách hoà logo
    let bright = 0.8;
    try {
      const d = ctx.getImageData(pa.x * S, pa.y * S, Math.max(1, pa.w * S), Math.max(1, pa.h * S)).data;
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 40) { sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
      bright = n ? sum / n : 0.8;
    } catch { /* ignore */ }
    ctx.save();
    if (bright > 0.55) {
      ctx.globalAlpha = 0.95;
      ctx.globalCompositeOperation = 'multiply';
      placeBrand(ctx, o, pa.x, pa.y, pa.w, pa.h, '#1b1b1b', font);
    } else {
      ctx.globalAlpha = 0.96;
      placeBrand(ctx, o, pa.x, pa.y, pa.w, pa.h, '#ffffff', font);
    }
    ctx.restore();
    return;
  }

  // ===== NỀN "concept sạch": gradient đặc theo tông + quầng sáng góc (đồng bộ poster) =====
  const th = o.theme || {};
  let bgStops: [string, string, string];
  if (th.bgGrad && th.bgGrad.length >= 3) bgStops = [th.bgGrad[0], th.bgGrad[1], th.bgGrad[2]];
  else if (o.bgColor) bgStops = [mixHex(o.bgColor, '#ffffff', 0.35), o.bgColor, mixHex(o.bgColor, '#000000', 0.06)];
  else bgStops = [mixHex(accent, '#ffffff', 0.94), mixHex(accent, '#ffffff', 0.88), mixHex(accent, '#ffffff', 0.8)];
  const bg = bgStops[1];
  const isDarkBg = lum(bg) < 0.4;
  const glowCol = th.glow || hexToRgba(accent, isDarkBg ? 0.22 : 0.2);
  const bgG = ctx.createLinearGradient(0, 0, W, H);
  bgG.addColorStop(0, bgStops[0]); bgG.addColorStop(0.5, bgStops[1]); bgG.addColorStop(1, bgStops[2]);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.88, H * 0.12, 40, W * 0.88, H * 0.12, W * 0.7);
  g1.addColorStop(0, glowCol); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.12, H * 0.88, 30, W * 0.12, H * 0.88, W * 0.6);
  g2.addColorStop(0, glowCol); g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  // quầng sáng studio nhẹ sau vật phẩm để vật thể nổi khỏi nền
  const spot = ctx.createRadialGradient(cx, H * 0.48, 40, cx, H * 0.5, H * 0.5);
  spot.addColorStop(0, isDarkBg ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
  // vệt accent mảnh trên cùng
  ctx.fillStyle = th.accent || accent; ctx.fillRect(0, 0, W, 6);

  // nhãn gọn dưới đáy: pill tên vật phẩm + tên thương hiệu
  {
    const itemLabel = (MERCH_ITEMS.find((m) => m.id === o.item)?.label || '').toUpperCase();
    const acc = th.accent || accent;
    const brandTxt = (o.brandName || '').trim();
    if (itemLabel) {
      ctx.save();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = `800 22px ${font}`;
      const pw = ctx.measureText(itemLabel).width + 44, ph = 44, py = 1080 - 40 - ph;
      ctx.font = `600 22px ${font}`;
      const bw2 = brandTxt ? ctx.measureText(brandTxt).width : 0;
      const gap = brandTxt ? 18 : 0;
      const tw2 = pw + gap + bw2;
      const px = (W - tw2) / 2;
      ctx.fillStyle = acc; rr(ctx, px, py, pw, ph, ph / 2); ctx.fill();
      ctx.fillStyle = th.accentText || (lum(acc) > 0.6 ? '#111827' : '#ffffff');
      ctx.font = `800 22px ${font}`; ctx.fillText(itemLabel, px + 22, py + ph / 2 + 1);
      if (brandTxt) {
        ctx.fillStyle = th.textSecondary || (isDarkBg ? '#e5e7eb' : '#475569');
        ctx.font = `600 22px ${font}`; ctx.fillText(brandTxt, px + pw + gap, py + ph / 2 + 1);
      }
      ctx.restore();
    }
  }

  // vùng in: vẽ shape -> brand -> clip -> shade. Hàm con dùng chung.
  const withShade = (pathFn: () => void, box: [number, number, number, number], orient: 'v' | 'h', strength: number) => {
    ctx.save(); pathFn(); ctx.clip();
    shade(ctx, box[0], box[1], box[2], box[3], orient, strength);
    ctx.restore();
  };

  if (o.item === 'tshirt') {
    const bx = 300, by = 320, bw = 480, bh = 520;
    groundShadow(ctx, cx, by + bh + 40, 260, 44);
    const body = () => {
      ctx.beginPath();
      // tay trái
      ctx.moveTo(bx, by + 30); ctx.lineTo(176, by + 118); ctx.lineTo(252, by + 312); ctx.lineTo(bx, by + 196);
      // thân
      ctx.lineTo(bx, by + bh - 36); ctx.arcTo(bx, by + bh, bx + 36, by + bh, 36);
      ctx.lineTo(bx + bw - 36, by + bh); ctx.arcTo(bx + bw, by + bh, bx + bw, by + bh - 36, 36);
      ctx.lineTo(bx + bw, by + 196); ctx.lineTo(904, by + 118 + 194); ctx.lineTo(828, by + 118); ctx.lineTo(bx + bw, by + 30);
      // cổ
      ctx.lineTo(cx + 92, by + 24); ctx.quadraticCurveTo(cx, by + 92, cx - 92, by + 24);
      ctx.closePath();
    };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    // cổ áo (viền ribbed)
    ctx.save(); ctx.strokeStyle = shiftLight(pc, lum(pc) > 0.5 ? -18 : 26); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(cx - 92, by + 24); ctx.quadraticCurveTo(cx, by + 92, cx + 92, by + 24); ctx.stroke(); ctx.restore();
    placeBrand(ctx, o, cx - 150, 470, 300, 220, onProduct, font);
    // nếp gấp mờ
    withShade(body, [bx - 10, by, bw + 20, bh], 'v', 1);
    ctx.save(); body(); ctx.clip();
    ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(bx + 70, by + 120); ctx.quadraticCurveTo(bx + 40, by + 320, bx + 90, by + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - 70, by + 120); ctx.quadraticCurveTo(bx + bw - 40, by + 320, bx + bw - 90, by + bh); ctx.stroke();
    ctx.restore();
    gloss(ctx, cx - 60, by + 160, 220, 0.25);
  } else if (o.item === 'mug' || o.item === 'tumbler') {
    const mx = 360, my = 330, mw = 350, mh = 440;
    groundShadow(ctx, mx + mw / 2 + 10, my + mh + 26, 210, 34);
    // quai
    ctx.save(); ctx.lineWidth = 48; ctx.strokeStyle = pc;
    ctx.beginPath(); ctx.arc(mx + mw + 10, my + mh / 2, 92, -Math.PI / 2.1, Math.PI / 2.1); ctx.stroke();
    ctx.lineWidth = 48; ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(mx + mw + 10, my + mh / 2, 92, Math.PI / 6, Math.PI / 2.1); ctx.stroke(); ctx.restore();
    const body = () => rr(ctx, mx, my, mw, mh, 34);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.14)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    // miệng ly (ellipse sáng)
    ctx.save(); ctx.fillStyle = shiftLight(pc, lum(pc) > 0.5 ? -14 : 30);
    ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + 6, mw / 2, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isDarkBg ? '#0b0f17' : '#1118270f'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + 6, mw / 2 - 16, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    placeBrand(ctx, o, mx + 40, my + 120, mw - 80, mh - 210, onProduct, font);
    withShade(body, [mx, my, mw, mh], 'h', 1.15);
    gloss(ctx, mx + 70, my + 150, 150, 0.4);
  } else if (o.item === 'cap') {
    groundShadow(ctx, cx + 40, 650, 250, 34);
    // lưỡi trai
    ctx.save(); ctx.fillStyle = pc; ctx.shadowColor = 'rgba(0,0,0,0.14)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.ellipse(cx + 150, 600, 250, 72, 0, 0, Math.PI); ctx.fill(); ctx.restore();
    const dome = () => { ctx.beginPath(); ctx.arc(cx, 600, 262, Math.PI, 0); ctx.closePath(); };
    ctx.save(); ctx.fillStyle = pc; dome(); ctx.fill(); ctx.restore();
    // nút đỉnh
    ctx.save(); ctx.fillStyle = shiftLight(pc, lum(pc) > 0.5 ? -16 : 24); ctx.beginPath(); ctx.arc(cx, 346, 16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // đường panel
    ctx.save(); dome(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, 346); ctx.lineTo(cx, 600); ctx.moveTo(cx, 440); ctx.quadraticCurveTo(cx - 180, 470, cx - 250, 600);
    ctx.moveTo(cx, 440); ctx.quadraticCurveTo(cx + 180, 470, cx + 250, 600); ctx.stroke(); ctx.restore();
    placeBrand(ctx, o, cx - 165, 420, 330, 150, onProduct, font);
    withShade(dome, [cx - 262, 338, 524, 262], 'v', 1);
    gloss(ctx, cx - 90, 440, 150, 0.3);
  } else if (o.item === 'tote') {
    const tx = 330, ty = 380, tw = 420, th = 470;
    groundShadow(ctx, tx + tw / 2, ty + th + 26, 230, 34);
    // quai
    ctx.save(); ctx.lineWidth = 32; ctx.strokeStyle = shiftLight(pc, lum(pc) > 0.5 ? -20 : 24); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(tx + tw * 0.32, ty + 6, 72, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx + tw * 0.68, ty + 6, 72, Math.PI, 0); ctx.stroke(); ctx.restore();
    const body = () => rr(ctx, tx, ty, tw, th, 16);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.14)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 12;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    // vải canvas: sọc dọc rất nhẹ
    ctx.save(); body(); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 2;
    for (let gx = tx + 8; gx < tx + tw; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, ty); ctx.lineTo(gx, ty + th); ctx.stroke(); }
    // nếp đáy
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(tx + 20, ty + th - 40); ctx.lineTo(tx + tw - 20, ty + th - 40); ctx.stroke();
    ctx.restore();
    placeBrand(ctx, o, tx + 60, ty + 130, tw - 120, th - 240, onProduct, font);
    withShade(body, [tx, ty, tw, th], 'v', 0.9);
  } else if (o.item === 'namecard') {
    const w = 640, h = 384, x = (W - w) / 2, y = (H - h) / 2 - 10;
    groundShadow(ctx, cx, y + h + 20, 300, 30);
    const body = () => rr(ctx, x, y, w, h, 26);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = accent; rr(ctx, x, y + h - 58, w, 58, 0); ctx.clip(); ctx.fillRect(x, y + h - 58, w, 58); ctx.restore();
    placeBrand(ctx, o, x + 52, y + 54, w - 104, h - 180, onProduct, font);
    if (o.contact) {
      ctx.save(); ctx.fillStyle = lum(accent) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 25px ${font}`; ctx.fillText(o.contact, cx, y + h - 29); ctx.restore();
    }
    gloss(ctx, x + 120, y + 70, 220, 0.18);
  } else if (o.item === 'standee') {
    const w = 430, h = 740, x = (W - w) / 2, y = 150;
    groundShadow(ctx, cx, y + h + 46, 220, 30);
    // chân đế
    ctx.save(); ctx.fillStyle = '#9aa7b5'; rr(ctx, cx - 130, y + h + 6, 260, 26, 12); ctx.fill();
    ctx.fillStyle = '#c3ccd6'; rr(ctx, cx - 130, y + h + 6, 260, 10, 6); ctx.fill(); ctx.restore();
    const body = () => rr(ctx, x, y, w, h, 18);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.16)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    placeBrand(ctx, o, x + 50, y + 90, w - 100, 250, onProduct, font);
    ctx.save(); ctx.fillStyle = accent; rr(ctx, x + 70, y + h - 180, w - 140, 92, 46); ctx.fill();
    ctx.fillStyle = lum(accent) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 34px ${font}`; ctx.fillText('KHAI TRƯƠNG', cx, y + h - 134); ctx.restore();
    withShade(body, [x, y, w, h], 'v', 0.75);
    gloss(ctx, x + 120, y + 120, 200, 0.2);
  } else if (o.item === 'box') {
    const x = 330, y = 440, w = 420, h = 320, d = 86;
    groundShadow(ctx, x + w / 2 + 20, y + h + 24, 250, 30);
    // mặt phải
    ctx.save(); ctx.fillStyle = shiftLight(pc, -16);
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.restore();
    // mặt trên
    ctx.save(); ctx.fillStyle = shiftLight(pc, 20);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.restore();
    // mặt trước
    const front = () => rr(ctx, x, y, w, h, 10);
    ctx.save(); ctx.fillStyle = pc; front(); ctx.fill(); ctx.restore();
    placeBrand(ctx, o, x + 56, y + 76, w - 112, h - 150, onProduct, font);
    withShade(front, [x, y, w, h], 'v', 0.7);
  } else if (o.item === 'phonecase') {
    const w = 350, h = 700, x = (W - w) / 2, y = 190;
    groundShadow(ctx, cx, y + h + 20, 150, 26);
    const body = () => rr(ctx, x, y, w, h, 64);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14;
    ctx.fillStyle = pc; body(); ctx.fill(); ctx.restore();
    // cụm camera
    ctx.save(); ctx.fillStyle = shiftLight(pc, lum(pc) > 0.5 ? -14 : 22); rr(ctx, x + 36, y + 36, 128, 128, 30); ctx.fill();
    ctx.fillStyle = '#0b0f17'; [[0, 0], [1, 0], [0, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + 74 + a * 52, y + 74 + b * 52, 20, 0, Math.PI * 2); ctx.fill(); }); ctx.restore();
    placeBrand(ctx, o, x + 50, y + 250, w - 100, 220, onProduct, font);
    withShade(body, [x, y, w, h], 'h', 0.9);
    gloss(ctx, x + 70, y + 120, 140, 0.35);
  }
}

function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', ''), pb = b.replace('#', '');
  if (pa.length < 6 || pb.length < 6) return a;
  const f = (i: number) => Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - t) + parseInt(pb.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0');
  return `#${f(0)}${f(2)}${f(4)}`;
}

function hexToRgba(hex: string, a: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return `rgba(16,185,129,${a})`;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

// đổi độ sáng hex (amt: -100..100)
function shiftLight(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;
  const f = (i: number) => {
    const v = Math.max(0, Math.min(255, parseInt(c.slice(i, i + 2), 16) + Math.round(amt * 2.55)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(2)}${f(4)}`;
}
