// Bộ ảnh chi tiết sản phẩm (kiểu "详情页套图" của shop Taobao): ảnh bìa, điểm nổi bật, thông số, bảng size,
// hướng dẫn dùng, cam kết shop. User chỉ điền chữ + 1 ảnh → vẽ canvas trên trình duyệt, 0 AI, 0 server.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';
import type { PosterColors } from './infographic-engine';

export type DetailPlatformId = 'shopee' | 'lazada' | 'tiktok' | 'facebook';
// max = số ảnh tối đa sàn cho mỗi sản phẩm
export const DETAIL_PLATFORMS: { id: DetailPlatformId; name: string; w: number; h: number; max: number }[] = [
  { id: 'shopee', name: 'Shopee', w: 1080, h: 1080, max: 9 },
  { id: 'lazada', name: 'Lazada', w: 1080, h: 1080, max: 8 },
  { id: 'tiktok', name: 'TikTok Shop', w: 1080, h: 1080, max: 9 },
  { id: 'facebook', name: 'Facebook · Instagram', w: 1080, h: 1350, max: 10 },
];

export type DetailSlideId = 'cover' | 'features' | 'specs' | 'size' | 'steps' | 'policy';
export const DETAIL_SLIDES: { id: DetailSlideId; name: string }[] = [
  { id: 'cover', name: 'Ảnh bìa' }, { id: 'features', name: 'Điểm nổi bật' }, { id: 'specs', name: 'Thông số' },
  { id: 'size', name: 'Bảng size' }, { id: 'steps', name: 'Hướng dẫn dùng' }, { id: 'policy', name: 'Cam kết shop' },
];

export type PolicyIcon = 'genuine' | 'return' | 'ship' | 'warranty' | 'check' | 'refund';
export const POLICY_PRESETS: { icon: PolicyIcon; text: string }[] = [
  { icon: 'genuine', text: 'Chính hãng 100%' }, { icon: 'return', text: 'Đổi trả trong 7 ngày' }, { icon: 'ship', text: 'Freeship toàn quốc' },
  { icon: 'warranty', text: 'Bảo hành 12 tháng' }, { icon: 'check', text: 'Kiểm hàng trước khi nhận' }, { icon: 'refund', text: 'Hoàn tiền nếu lỗi' },
];

export interface DetailData {
  name: string;
  tagline: string;
  badges: string[];
  features: { title: string; desc: string }[];
  specs: { k: string; v: string }[];
  sizeHead: string[];
  sizeRows: string[][];
  sizeNote: string;
  steps: string[];
  policies: { icon: PolicyIcon; text: string }[];
  shop: string;
  hotline: string;
}

export interface DetailOpts {
  slide: DetailSlideId;
  platform: DetailPlatformId;
  data: DetailData;
  img: HTMLImageElement | null;
  colors: PosterColors;
  fontId?: string;
  scale?: number;
  watermark?: boolean;
}

/** Slide có đủ nội dung để xuất không (slide trống thì bỏ khỏi bộ). */
export function slideHasContent(id: DetailSlideId, d: DetailData): boolean {
  if (id === 'cover') return !!d.name.trim();
  if (id === 'features') return d.features.some((f) => f.title.trim());
  if (id === 'specs') return d.specs.some((s) => s.k.trim() && s.v.trim());
  if (id === 'size') return d.sizeHead.some((h) => h.trim()) && d.sizeRows.some((r) => r.some((c) => c.trim()));
  if (id === 'steps') return d.steps.some((s) => s.trim());
  return d.policies.some((p) => p.text.trim());
}

// Icon nét kiểu lucide (khung 24×24)
const ICONS: Record<PolicyIcon, string[]> = {
  genuine: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'M9 12l2 2 4-4'],
  return: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  ship: ['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14', 'M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
  warranty: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
  check: ['M16 16l2 2 4-4', 'M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14', 'M3.29 7L12 12l8.71-5', 'M12 22V12'],
  refund: ['M2 6h20v12H2z', 'M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M6 12h.01', 'M18 12h.01'],
};

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

// giảm cỡ chữ tới khi vừa 1 dòng (không nhỏ hơn min)
export function fitSize(ctx: CanvasRenderingContext2D, t: string, maxW: number, start: number, min: number, weight: string, fam: string): number {
  let fs = start; ctx.font = `${weight} ${fs}px ${fam}`;
  while (ctx.measureText(t).width > maxW && fs > min) { fs -= 1; ctx.font = `${weight} ${fs}px ${fam}`; }
  return fs;
}

// ngắt dòng theo từ; quá maxLines thì cắt "…" (font phải set trước)
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    let last = keep[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    keep[maxLines - 1] = `${last.trimEnd()}…`;
    return keep;
  }
  // 1 từ quá dài → cắt
  return lines.map((l) => {
    if (ctx.measureText(l).width <= maxW) return l;
    let s = l; while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
    return `${s}…`;
  });
}

export function ellipsize(ctx: CanvasRenderingContext2D, t: string, maxW: number): string {
  if (ctx.measureText(t).width <= maxW) return t;
  let s = t; while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

// sản phẩm vừa khung + bóng tiếp đất
function drawProduct(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s, dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  ctx.filter = `blur(${Math.round(dw * 0.04)}px)`; ctx.fillStyle = 'rgba(15,23,42,0.2)';
  ctx.beginPath(); ctx.ellipse(dx + dw / 2, dy + dh * 0.985, dw * 0.42, dh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.drawImage(img, dx, dy, dw, dh);
}

function icon(ctx: CanvasRenderingContext2D, name: PolicyIcon, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const d of ICONS[name]) ctx.stroke(new Path2D(d));
  ctx.restore();
}

export function drawDetailSlide(canvas: HTMLCanvasElement, o: DetailOpts) {
  const p = DETAIL_PLATFORMS.find((x) => x.id === o.platform) || DETAIL_PLATFORMS[0];
  const sc = o.scale ?? 1;
  const W = Math.round(p.w * sc), H = Math.round(p.h * sc), u = W / 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const F = fontFamilyById(o.fontId);
  const c = o.colors, d = o.data;
  const ink = c.deep, sub = 'rgba(15,23,42,0.62)';
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

  // ---- khung chung: nền đặc, nhãn + tiêu đề, tên shop chân trang ----
  const M = 56 * u;
  const yB = H - 92 * u;
  const header = (label: string, title: string, rightPad = 0) => {
    ctx.font = `800 ${24 * u}px ${F}`;
    const lw = ctx.measureText(label).width + 40 * u;
    ctx.fillStyle = c.main; rr(ctx, M, 52 * u, lw, 50 * u, 25 * u); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, M + 20 * u, 86 * u);
    const fs = fitSize(ctx, title, W - M * 2 - rightPad, 60 * u, 34 * u, '900', F);
    ctx.fillStyle = ink; ctx.font = `900 ${fs}px ${F}`;
    ctx.fillText(ellipsize(ctx, title, W - M * 2 - rightPad), M, 176 * u);
  };
  const footer = () => {
    if (!d.shop.trim()) return;
    ctx.font = `700 ${24 * u}px ${F}`; ctx.fillStyle = sub; ctx.textAlign = 'left';
    ctx.fillText(ellipsize(ctx, d.shop.trim(), W * 0.6), M, H - 40 * u);
  };
  const y0 = 222 * u;

  if (o.slide === 'cover') {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const hasTag = !!d.tagline.trim();
    const pb = H - (hasTag ? 250 : 200) * u;
    ctx.fillStyle = c.tint2;
    ctx.beginPath(); ctx.arc(W / 2, (130 * u + pb) / 2, Math.min(W * 0.4, (pb - 130 * u) / 2), 0, Math.PI * 2); ctx.fill();
    if (o.img) drawProduct(ctx, o.img, 110 * u, 130 * u, W - 220 * u, pb - 150 * u);
    // nhãn ưu điểm góc trên
    let bx = 48 * u;
    ctx.font = `800 ${26 * u}px ${F}`;
    for (const b of d.badges.map((x) => x.trim()).filter(Boolean).slice(0, 3)) {
      const bw = ctx.measureText(b).width + 44 * u;
      if (bx + bw > W - 48 * u) break;
      ctx.fillStyle = c.main; rr(ctx, bx, 48 * u, bw, 56 * u, 28 * u); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(b, bx + 22 * u, 86 * u);
      bx += bw + 14 * u;
    }
    ctx.textAlign = 'center';
    const name = d.name.trim();
    const fs = fitSize(ctx, name, W - 120 * u, 76 * u, 40 * u, '900', F);
    ctx.font = `900 ${fs}px ${F}`; ctx.fillStyle = ink;
    ctx.fillText(ellipsize(ctx, name, W - 120 * u), W / 2, H - (hasTag ? 150 : 100) * u);
    if (hasTag) {
      const ts = fitSize(ctx, d.tagline.trim(), W - 160 * u, 36 * u, 24 * u, '600', F);
      ctx.font = `600 ${ts}px ${F}`; ctx.fillStyle = c.main;
      ctx.fillText(ellipsize(ctx, d.tagline.trim(), W - 160 * u), W / 2, H - 88 * u);
    }
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = c.tint; ctx.fillRect(0, 0, W, H);
  }

  if (o.slide === 'features') {
    header('ĐIỂM NỔI BẬT', d.name.trim());
    const list = d.features.filter((f) => f.title.trim()).slice(0, 5);
    const lx = M, lw = 430 * u;
    ctx.fillStyle = c.tint2;
    ctx.beginPath(); ctx.arc(lx + lw / 2, (y0 + yB) / 2, Math.min(lw / 2, (yB - y0) / 2), 0, Math.PI * 2); ctx.fill();
    if (o.img) drawProduct(ctx, o.img, lx + 10 * u, y0 + 20 * u, lw - 20 * u, yB - y0 - 40 * u);
    const cx = lx + lw + 30 * u, cw = W - M - cx, gap = 18 * u;
    const ch = Math.min(210 * u, (yB - y0 - gap * (list.length - 1)) / list.length);
    let y = y0 + (yB - y0 - (ch * list.length + gap * (list.length - 1))) / 2;
    list.forEach((f, i) => {
      ctx.fillStyle = '#fff'; rr(ctx, cx, y, cw, ch, 24 * u); ctx.fill();
      const r = 28 * u, nx = cx + 24 * u + r;
      ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(nx, y + 24 * u + r, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${28 * u}px ${F}`; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), nx, y + 24 * u + r + 10 * u); ctx.textAlign = 'left';
      const tx = nx + r + 20 * u, tw = cx + cw - 24 * u - tx;
      const ts = fitSize(ctx, f.title.trim(), tw, 32 * u, 24 * u, '800', F);
      ctx.fillStyle = ink; ctx.font = `800 ${ts}px ${F}`;
      ctx.fillText(ellipsize(ctx, f.title.trim(), tw), tx, y + 24 * u + r + 11 * u);
      if (f.desc.trim()) {
        ctx.font = `500 ${24 * u}px ${F}`; ctx.fillStyle = sub;
        const lh = 33 * u, room = Math.max(1, Math.floor((ch - 98 * u) / lh) + 1);
        wrap(ctx, f.desc, tw, Math.min(3, room)).forEach((ln, k) => ctx.fillText(ln, tx, y + 24 * u + r + 52 * u + k * lh));
      }
      y += ch + gap;
    });
  }

  if (o.slide === 'specs') {
    header('THÔNG SỐ SẢN PHẨM', d.name.trim());
    const rows = d.specs.filter((s) => s.k.trim() && s.v.trim()).slice(0, 10);
    const pw = 360 * u;
    if (o.img) drawProduct(ctx, o.img, M, y0 + 10 * u, pw, yB - y0 - 20 * u);
    const tx = M + pw + 30 * u, tw = W - M - tx;
    const rh = Math.min(92 * u, (yB - y0) / rows.length);
    const th = rh * rows.length, ty = y0 + (yB - y0 - th) / 2;
    ctx.save(); rr(ctx, tx, ty, tw, th, 24 * u); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    const kw = tw * 0.4;
    rows.forEach((s, i) => {
      const y = ty + i * rh;
      if (i % 2) { ctx.fillStyle = c.tint; ctx.fillRect(tx, y, tw, rh); }
      ctx.font = `600 ${Math.min(24 * u, rh * 0.32)}px ${F}`; ctx.fillStyle = sub;
      ctx.fillText(ellipsize(ctx, s.k.trim(), kw - 40 * u), tx + 26 * u, y + rh / 2 + 8 * u);
      const vs = Math.min(26 * u, rh * 0.34);
      ctx.font = `800 ${vs}px ${F}`; ctx.fillStyle = ink;
      const lines = wrap(ctx, s.v, tw - kw - 26 * u, rh >= 80 * u ? 2 : 1);
      const lh = vs * 1.25, sy = y + rh / 2 - ((lines.length - 1) * lh) / 2 + vs * 0.35;
      lines.forEach((ln, k) => ctx.fillText(ln, tx + kw, sy + k * lh));
    });
    ctx.restore();
  }

  if (o.slide === 'size') {
    const thumb = o.img ? 150 * u : 0;
    header('BẢNG SIZE', d.name.trim(), thumb ? thumb + 20 * u : 0);
    if (o.img) {
      ctx.fillStyle = '#fff'; rr(ctx, W - M - thumb, 40 * u, thumb, thumb, 24 * u); ctx.fill();
      drawProduct(ctx, o.img, W - M - thumb + 14 * u, 54 * u, thumb - 28 * u, thumb - 28 * u);
    }
    const cols = Math.max(1, d.sizeHead.length);
    const rows = d.sizeRows.filter((r) => r.some((x) => x.trim())).slice(0, 10);
    const note = d.sizeNote.trim();
    const tB = note ? yB - 80 * u : yB;
    const tx = M, tw = W - M * 2, hh = 84 * u;
    const rh = Math.min(84 * u, (tB - y0 - hh) / Math.max(1, rows.length));
    const cw = tw / cols;
    ctx.save(); rr(ctx, tx, y0, tw, hh + rh * rows.length, 24 * u); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    ctx.fillStyle = c.main; ctx.fillRect(tx, y0, tw, hh);
    ctx.textAlign = 'center';
    d.sizeHead.forEach((h, j) => {
      const fs = fitSize(ctx, h.trim(), cw - 16 * u, 26 * u, 16 * u, '800', F);
      ctx.font = `800 ${fs}px ${F}`; ctx.fillStyle = '#fff';
      ctx.fillText(ellipsize(ctx, h.trim(), cw - 16 * u), tx + cw * j + cw / 2, y0 + hh / 2 + fs * 0.35);
    });
    rows.forEach((r, i) => {
      const y = y0 + hh + i * rh;
      if (i % 2) { ctx.fillStyle = c.tint; ctx.fillRect(tx, y, tw, rh); }
      for (let j = 0; j < cols; j++) {
        const t = (r[j] || '').trim();
        const fs = fitSize(ctx, t, cw - 16 * u, Math.min(28 * u, rh * 0.4), 14 * u, j ? '600' : '800', F);
        ctx.font = `${j ? 600 : 800} ${fs}px ${F}`; ctx.fillStyle = j ? ink : c.main;
        ctx.fillText(ellipsize(ctx, t, cw - 16 * u), tx + cw * j + cw / 2, y + rh / 2 + fs * 0.35);
      }
    });
    ctx.restore();
    ctx.textAlign = 'left';
    if (note) {
      ctx.font = `500 ${23 * u}px ${F}`; ctx.fillStyle = sub;
      wrap(ctx, `* ${note}`, tw, 2).forEach((ln, k) => ctx.fillText(ln, tx, y0 + hh + rh * rows.length + 46 * u + k * 32 * u));
    }
  }

  if (o.slide === 'steps') {
    header('HƯỚNG DẪN SỬ DỤNG', d.name.trim());
    const list = d.steps.filter((s) => s.trim()).slice(0, 5);
    const pw = 380 * u, lx = M, lw = W - M * 2 - pw - 20 * u;
    if (o.img) {
      ctx.fillStyle = c.tint2; rr(ctx, W - M - pw, y0, pw, yB - y0, 32 * u); ctx.fill();
      drawProduct(ctx, o.img, W - M - pw + 30 * u, y0 + 30 * u, pw - 60 * u, yB - y0 - 60 * u);
    }
    const r = 34 * u, step = Math.min(170 * u, (yB - y0) / list.length);
    const top = y0 + (yB - y0 - step * list.length) / 2 + r;
    if (list.length > 1) { ctx.fillStyle = c.soft; ctx.fillRect(lx + r - 3 * u, top, 6 * u, step * (list.length - 1)); }
    list.forEach((s, i) => {
      const cy = top + i * step;
      ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(lx + r, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${30 * u}px ${F}`; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), lx + r, cy + 11 * u); ctx.textAlign = 'left';
      ctx.font = `600 ${29 * u}px ${F}`; ctx.fillStyle = ink;
      const lh = 38 * u, lines = wrap(ctx, s, lw - r * 2 - 24 * u, Math.max(1, Math.min(3, Math.floor((step - 10 * u) / lh))));
      const sy = cy - ((lines.length - 1) * lh) / 2 + 10 * u;
      lines.forEach((ln, k) => ctx.fillText(ln, lx + r * 2 + 24 * u, sy + k * lh));
    });
  }

  if (o.slide === 'policy') {
    header('CAM KẾT CỦA SHOP', d.shop.trim() ? `Mua yên tâm tại ${d.shop.trim()}` : d.name.trim());
    const list = d.policies.filter((x) => x.text.trim()).slice(0, 6);
    const hot = d.hotline.trim();
    const gB = hot ? yB - 110 * u : yB;
    const cols = list.length <= 1 ? 1 : list.length <= 4 || list.length === 6 ? 2 : 3;
    const rowsN = Math.ceil(list.length / cols), gap = 22 * u;
    const cw = (W - M * 2 - gap * (cols - 1)) / cols;
    const ch = Math.min(320 * u, (gB - y0 - gap * (rowsN - 1)) / rowsN);
    const gy = y0 + (gB - y0 - (ch * rowsN + gap * (rowsN - 1))) / 2;
    list.forEach((pl, i) => {
      const x = M + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap);
      ctx.fillStyle = '#fff'; rr(ctx, x, y, cw, ch, 28 * u); ctx.fill();
      const ir = Math.min(52 * u, ch * 0.2), icy = y + ch * 0.12 + ir;
      ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(x + cw / 2, icy, ir, 0, Math.PI * 2); ctx.fill();
      icon(ctx, pl.icon, x + cw / 2, icy, ir * 1.05, '#fff');
      ctx.textAlign = 'center'; ctx.fillStyle = ink;
      const fs = Math.min(30 * u, ch * 0.11);
      ctx.font = `800 ${fs}px ${F}`;
      const lines = wrap(ctx, pl.text, cw - 40 * u, 2);
      const ty = icy + ir + (y + ch - icy - ir) / 2 - ((lines.length - 1) * fs * 1.25) / 2 + fs * 0.35;
      lines.forEach((ln, k) => ctx.fillText(ln, x + cw / 2, ty + k * fs * 1.25));
      ctx.textAlign = 'left';
    });
    if (hot) {
      ctx.font = `800 ${32 * u}px ${F}`;
      const t = ellipsize(ctx, `Hotline / Zalo: ${hot}`, W - M * 2 - 60 * u), tw = ctx.measureText(t).width + 64 * u;
      ctx.fillStyle = c.main; rr(ctx, (W - tw) / 2, yB - 78 * u, tw, 72 * u, 36 * u); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(t, W / 2, yB - 31 * u); ctx.textAlign = 'left';
    }
  }

  if (o.slide !== 'cover') footer();
  if (o.watermark !== false) drawWatermark(canvas);
}
