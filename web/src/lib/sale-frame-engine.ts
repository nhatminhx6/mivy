// Khung viền ảnh bìa theo đợt sale (11.11, 12.12, Tết, Flash Sale…) — kiểu khung shop Shopee hay dùng.
// 6 kiểu khung vẽ bằng canvas, đổi chữ/màu/giá tự do, áp cho cả loạt sản phẩm. 0 AI, 0 server.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';
import { ellipsize, fitSize, rr } from './detail-set-engine';

export interface SaleEvent { id: string; name: string; label: string; sub: string; main: string; accent: string }
export const SALE_EVENTS: SaleEvent[] = [
  { id: '1111', name: '11.11', label: '11.11', sub: 'SIÊU SALE', main: '#ee4d2d', accent: '#ffd93d' },
  { id: '1212', name: '12.12', label: '12.12', sub: 'SALE CUỐI NĂM', main: '#c8102e', accent: '#ffd700' },
  { id: 'bf', name: 'Black Friday', label: 'BLACK FRIDAY', sub: 'GIẢM SỐC', main: '#111111', accent: '#ffd400' },
  { id: 'tet', name: 'Tết', label: 'SALE TẾT', sub: 'LỘC ĐẦU NĂM', main: '#b91c1c', accent: '#f5c542' },
  { id: 'flash', name: 'Flash Sale', label: 'FLASH SALE', sub: 'GIÁ SỐC HÔM NAY', main: '#f4511e', accent: '#ffeb3b' },
  { id: 'freeship', name: 'Freeship', label: 'FREESHIP', sub: 'MIỄN PHÍ VẬN CHUYỂN', main: '#0b6bcb', accent: '#ffffff' },
  { id: 'genuine', name: 'Chính hãng', label: 'CHÍNH HÃNG', sub: 'CAM KẾT 100%', main: '#1d2b53', accent: '#e3b04b' },
  { id: 'new', name: 'Hàng mới', label: 'NEW', sub: 'HÀNG MỚI VỀ', main: '#6d28d9', accent: '#fbcfe8' },
  { id: '83', name: '8/3', label: '8.3', sub: 'QUÀ TẶNG NÀNG', main: '#db2777', accent: '#fde68a' },
  { id: 'birthday', name: 'Sinh nhật shop', label: 'SINH NHẬT SHOP', sub: 'TRI ÂN KHÁCH HÀNG', main: '#0f766e', accent: '#fcd34d' },
];

export type FrameStyle = 'band' | 'bars' | 'ribbon' | 'sticker' | 'corner' | 'stripe';
export const FRAME_STYLES: { id: FrameStyle; name: string }[] = [
  { id: 'band', name: 'Viền + dải giá' }, { id: 'bars', name: 'Thanh trên dưới' }, { id: 'ribbon', name: 'Băng rôn chéo' },
  { id: 'sticker', name: 'Tem tròn' }, { id: 'corner', name: 'Góc khối' }, { id: 'stripe', name: 'Viền sọc' },
];

export interface FrameOpts {
  style: FrameStyle;
  img: HTMLImageElement | null;
  cut: boolean; // ảnh đã tách nền → đặt trên nền trắng + bóng; chưa tách → phủ kín khung
  label: string;
  sub: string;
  extra: string; // vd "Mua 2 giảm 10%"
  price: string;
  oldPrice: string;
  main: string;
  accent: string;
  logo?: HTMLImageElement | null;
  fontId?: string;
  scale?: number;
  watermark?: boolean;
}

const num = (s: string) => { const d = s.replace(/[^\d]/g, ''); return d ? Number(d) : 0; };
/** "199000" → "199.000đ"; chữ khác (vd "199k") giữ nguyên */
export function fmtPrice(s: string): string {
  const t = s.trim(); if (!t) return '';
  if (/^[\d.,\s]+đ?$/.test(t)) return `${num(t).toLocaleString('vi-VN')}đ`;
  return t;
}
export function discountOf(price: string, old: string): number {
  const p = num(price), o = num(old);
  return p > 0 && o > p ? Math.round((1 - p / o) * 100) : 0;
}

function placeProduct(ctx: CanvasRenderingContext2D, o: FrameOpts, x: number, y: number, w: number, h: number, r = 0) {
  ctx.save();
  rr(ctx, x, y, w, h, r); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
  const im = o.img, iw = im?.naturalWidth || 0, ih = im?.naturalHeight || 0;
  if (im && iw && ih) {
    if (o.cut) {
      const pad = Math.min(w, h) * 0.08, bw = w - pad * 2, bh = h - pad * 2;
      const s = Math.min(bw / iw, bh / ih), dw = iw * s, dh = ih * s, dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
      ctx.save();
      ctx.filter = `blur(${Math.round(dw * 0.04)}px)`; ctx.fillStyle = 'rgba(15,23,42,0.2)';
      ctx.beginPath(); ctx.ellipse(dx + dw / 2, dy + dh * 0.985, dw * 0.42, dh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.drawImage(im, dx, dy, dw, dh);
    } else {
      const s = Math.max(w / iw, h / ih);
      ctx.drawImage(im, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    }
  }
  ctx.restore();
}

function burst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, n = 18) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2, rad = i % 2 ? r * 0.86 : r;
    if (i) ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
}

// chữ gạch ngang (giá gốc)
function strike(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, fs: number) {
  ctx.fillText(t, x, y);
  const w = ctx.measureText(t).width, x0 = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'right' ? x - w : x;
  ctx.fillRect(x0, y - fs * 0.32, w, Math.max(2, fs * 0.08));
}

export function drawSaleFrame(canvas: HTMLCanvasElement, o: FrameOpts) {
  const sc = o.scale ?? 1;
  const W = Math.round(1080 * sc), H = W, u = W / 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const F = fontFamilyById(o.fontId);
  const M = o.main, A = o.accent;
  const label = o.label.trim(), sub = o.sub.trim(), extra = o.extra.trim();
  const price = fmtPrice(o.price), old = fmtPrice(o.oldPrice), off = discountOf(o.price, o.oldPrice);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

  // nhãn chữ trên nền màu: tự cỡ cho vừa
  const text = (t: string, x: number, y: number, maxW: number, size: number, weight: string, color: string, align: CanvasTextAlign = 'left', min = 14) => {
    if (!t) return 0;
    const fs = fitSize(ctx, t, maxW, size * u, min * u, weight, F);
    ctx.font = `${weight} ${fs}px ${F}`; ctx.fillStyle = color; ctx.textAlign = align;
    ctx.fillText(ellipsize(ctx, t, maxW), x, y); ctx.textAlign = 'left';
    return fs;
  };
  const pill = (t: string, cx: number, cy: number, maxW: number, size: number, bg: string, fg: string, stroke?: string) => {
    if (!t) return;
    ctx.font = `800 ${size * u}px ${F}`;
    const s = ellipsize(ctx, t, maxW - 44 * u), w = ctx.measureText(s).width + 44 * u, h = size * u * 1.9;
    ctx.fillStyle = bg; rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 4 * u; ctx.stroke(); }
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(s, cx, cy + size * u * 0.36); ctx.textAlign = 'left';
  };
  const offBadge = (cx: number, cy: number, r: number, bg: string, fg: string, starry = true) => {
    if (!off) return false;
    ctx.fillStyle = bg;
    if (starry) burst(ctx, cx, cy, r); else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
    ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = fg;
    ctx.font = `900 ${r * 0.5}px ${F}`; ctx.fillText(`-${off}%`, cx, cy + r * 0.12);
    ctx.font = `800 ${r * 0.2}px ${F}`; ctx.fillText('GIẢM', cx, cy + r * 0.42);
    ctx.textAlign = 'left';
    return true;
  };
  const logo = (x: number, y: number, box: number, align: 'left' | 'right' = 'right') => {
    const im = o.logo, iw = im?.naturalWidth || 0, ih = im?.naturalHeight || 0;
    if (!im || !iw || !ih) return;
    const s = Math.min(box * 1.8 / iw, box / ih), w = iw * s, h = ih * s;
    ctx.drawImage(im, align === 'right' ? x - w : x, y + (box - h) / 2, w, h);
  };

  if (o.style === 'band') {
    const b = 26 * u, bandH = 200 * u;
    ctx.fillStyle = M; ctx.fillRect(0, 0, W, H);
    placeProduct(ctx, o, b, b, W - b * 2, H - b * 2 - bandH, 28 * u);
    // tab nhãn góc trên trái
    ctx.font = `900 ${56 * u}px ${F}`; const lw = Math.min(W * 0.62, Math.max(ctx.measureText(label).width, (ctx.font = `700 ${24 * u}px ${F}`, ctx.measureText(sub).width)) + 52 * u);
    ctx.fillStyle = M; rr(ctx, -30 * u, -30 * u, lw + b + 30 * u, (sub ? 140 : 110) * u + 30 * u, 30 * u); ctx.fill();
    text(label, b + 22 * u, b + 60 * u, lw - 40 * u, 56, '900', A);
    text(sub, b + 22 * u, b + 98 * u, lw - 40 * u, 24, '700', '#fff');
    logo(W - b - 24 * u, b + 20 * u, 80 * u);
    // dải giá dưới
    const by = H - b - bandH, cy = by + bandH / 2;
    const hasOff = offBadge(W - b - 100 * u, by + 10 * u, 92 * u, A, M);
    const pw = W - b * 2 - (hasOff ? 230 : 40) * u;
    if (price) {
      text(price, b + 20 * u, cy + (old ? 18 : 30) * u, pw, 92, '900', '#fff');
      if (old) { ctx.font = `600 ${34 * u}px ${F}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; strike(ctx, ellipsize(ctx, old, pw * 0.5), b + 22 * u, cy + 70 * u, 34 * u); }
    } else {
      text(extra || sub || label, b + 20 * u, cy + 24 * u, pw, 64, '900', '#fff');
    }
    // dòng ưu đãi: góc dưới trái vùng ảnh
    if (extra && price) { ctx.font = `800 ${28 * u}px ${F}`; const ew = Math.min(W * 0.5, ctx.measureText(extra).width + 44 * u); pill(extra, b + 24 * u + ew / 2, by - 48 * u, W * 0.5, 28, A, M); }
  }

  if (o.style === 'bars') {
    const th = 150 * u, bh = 180 * u;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    placeProduct(ctx, o, 0, th, W, H - th - bh);
    ctx.fillStyle = M; ctx.fillRect(0, 0, W, th); ctx.fillRect(0, H - bh, W, bh);
    ctx.fillStyle = A; ctx.fillRect(0, th - 8 * u, W, 8 * u); ctx.fillRect(0, H - bh, W, 8 * u);
    const lw = o.logo ? W * 0.62 : W - 80 * u;
    text(label, 40 * u, sub ? 82 * u : 98 * u, lw, 60, '900', A);
    text(sub, 40 * u, 124 * u, lw, 26, '700', '#fff');
    logo(W - 40 * u, 30 * u, 82 * u);
    const cy = H - bh / 2 + 4 * u;
    const hasOff = offBadge(W - 120 * u, cy, 86 * u, A, M);
    const pw = W - (hasOff ? 300 : 80) * u;
    if (price) {
      text(price, 40 * u, cy + (old ? 14 : 30) * u, pw, 88, '900', '#fff');
      if (old) { ctx.font = `600 ${32 * u}px ${F}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; strike(ctx, ellipsize(ctx, old, pw * 0.5), 42 * u, cy + 62 * u, 32 * u); }
    } else text(extra || sub, 40 * u, cy + 22 * u, pw, 60, '900', '#fff');
    if (extra && price) pill(extra, W / 2, H - bh - 46 * u, W * 0.7, 30, A, M, M);
  }

  if (o.style === 'ribbon') {
    const b = 16 * u;
    ctx.fillStyle = M; ctx.fillRect(0, 0, W, H);
    placeProduct(ctx, o, b, b, W - b * 2, H - b * 2, 22 * u);
    // băng rôn chéo góc trên trái
    const a = 150 * u, bw = 150 * u;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(b, a); ctx.lineTo(a, b); ctx.lineTo(a + bw, b); ctx.lineTo(b, a + bw); ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 18 * u; ctx.fillStyle = M; ctx.fill();
    ctx.restore();
    ctx.fillStyle = A; ctx.beginPath(); ctx.moveTo(b, a + bw); ctx.lineTo(a + bw, b); ctx.lineTo(a + bw + 8 * u, b); ctx.lineTo(b, a + bw + 8 * u); ctx.closePath(); ctx.fill();
    ctx.save();
    const mid = (a + bw / 2 + b) / 2;
    ctx.translate(mid, mid); ctx.rotate(-Math.PI / 4);
    const len = (a + bw / 2) * Math.SQRT2 * 0.82;
    text(label, 0, sub ? 6 * u : 18 * u, len, 50, '900', A, 'center');
    text(sub, 0, 44 * u, len * 0.9, 22, '700', '#fff', 'center');
    ctx.restore();
    offBadge(W - 150 * u, 150 * u, 112 * u, A, M);
    if (price) {
      ctx.font = `900 ${80 * u}px ${F}`;
      const pfs = fitSize(ctx, price, W * 0.5, 80 * u, 40 * u, '900', F), pwid = Math.min(W * 0.5, ctx.measureText(price).width) + 70 * u;
      const ph = (old ? 170 : 130) * u, px = W - b - 30 * u - pwid, py = H - b - 30 * u - ph;
      ctx.fillStyle = M; rr(ctx, px, py, pwid, ph, 22 * u); ctx.fill(); ctx.strokeStyle = A; ctx.lineWidth = 5 * u; ctx.stroke();
      text(price, px + pwid / 2, py + 50 * u + pfs * 0.5, pwid - 50 * u, 80, '900', '#fff', 'center', 40);
      if (old) { ctx.font = `600 ${30 * u}px ${F}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'center'; strike(ctx, ellipsize(ctx, old, pwid - 60 * u), px + pwid / 2, py + ph - 30 * u, 30 * u); ctx.textAlign = 'left'; }
    }
    if (extra) pill(extra, b + 40 * u + Math.min(W * 0.4, 360 * u) / 2, H - b - 70 * u, W * 0.4, 28, A, M);
    logo(W - b - 30 * u, H - b - 30 * u - (price ? 260 : 100) * u, 70 * u);
  }

  if (o.style === 'sticker') {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    placeProduct(ctx, o, 56 * u, 56 * u, W - 112 * u, H - 112 * u);
    ctx.strokeStyle = M; ctx.lineWidth = 12 * u; ctx.strokeRect(20 * u, 20 * u, W - 40 * u, H - 40 * u);
    ctx.lineWidth = 3 * u; ctx.strokeRect(42 * u, 42 * u, W - 84 * u, H - 84 * u);
    // tem tròn góc phải: % giảm, không có thì nhãn đợt sale
    const cx = W - 190 * u, cy = 190 * u, r = 140 * u;
    if (!offBadge(cx, cy, r, A, M)) {
      ctx.fillStyle = A; burst(ctx, cx, cy, r); ctx.fill();
      text(label, cx, cy + 18 * u, r * 1.3, 52, '900', M, 'center', 20);
    } else pill(label, 80 * u + Math.min(W * 0.5, 480 * u) / 2, 110 * u, W * 0.5, 34, M, A);
    if (off && sub) text(sub, 80 * u + 4 * u, 180 * u, W * 0.45, 26, '800', M);
    if (!off && sub) pill(sub, 80 * u + Math.min(W * 0.5, 480 * u) / 2, 110 * u, W * 0.5, 30, M, '#fff');
    if (price) {
      ctx.font = `900 ${76 * u}px ${F}`;
      const w = Math.min(W * 0.55, ctx.measureText(price).width) + 70 * u, h = 120 * u, x = 70 * u, y = H - 70 * u - h;
      ctx.fillStyle = M; rr(ctx, x, y, w, h, h / 2); ctx.fill();
      text(price, x + w / 2, y + h / 2 + 26 * u, w - 50 * u, 76, '900', '#fff', 'center', 36);
      if (old) { ctx.font = `700 ${34 * u}px ${F}`; ctx.fillStyle = '#64748b'; strike(ctx, ellipsize(ctx, old, W * 0.4), x + 30 * u, y - 22 * u, 34 * u); }
    }
    if (extra) pill(extra, W - 70 * u - Math.min(W * 0.36, 340 * u) / 2, H - 130 * u, W * 0.36, 26, A, M);
    logo(W - 80 * u, H - 80 * u - 200 * u, 70 * u);
  }

  if (o.style === 'corner') {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    placeProduct(ctx, o, 0, 0, W, H);
    const t = 22 * u, arm = 360 * u;
    // khối góc trên trái + cạnh L
    ctx.font = `900 ${62 * u}px ${F}`;
    const lw = Math.min(W * 0.6, Math.max(ctx.measureText(label).width, (ctx.font = `700 ${26 * u}px ${F}`, ctx.measureText(sub).width)) + 70 * u);
    const lh = (sub ? 150 : 120) * u;
    ctx.fillStyle = M; ctx.fillRect(0, 0, lw, lh); ctx.fillRect(0, 0, t, arm + lh); ctx.fillRect(0, 0, arm + lw, t);
    text(label, 34 * u, sub ? 84 * u : 90 * u, lw - 50 * u, 62, '900', A);
    text(sub, 34 * u, 126 * u, lw - 50 * u, 26, '700', '#fff');
    if (extra) { ctx.font = `800 ${26 * u}px ${F}`; const ew = Math.min(W * 0.5, ctx.measureText(extra).width + 44 * u); pill(extra, 30 * u + ew / 2, lh + 50 * u, W * 0.5, 26, A, M); }
    // khối giá góc dưới phải + cạnh L
    ctx.font = `900 ${80 * u}px ${F}`;
    const pw = price ? Math.min(W * 0.6, ctx.measureText(price).width) + 80 * u : 0, ph = old ? 180 * u : 140 * u;
    ctx.fillStyle = M; ctx.fillRect(W - t, H - arm - (price ? ph : 0), t, arm + (price ? ph : 0)); ctx.fillRect(W - arm - pw, H - t, arm + pw, t);
    if (price) {
      ctx.fillRect(W - pw, H - ph, pw, ph);
      text(price, W - pw / 2, H - ph + 92 * u, pw - 50 * u, 80, '900', '#fff', 'center', 36);
      if (old) { ctx.font = `600 ${32 * u}px ${F}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'center'; strike(ctx, ellipsize(ctx, old, pw - 60 * u), W - pw / 2, H - 40 * u, 32 * u); ctx.textAlign = 'left'; }
      offBadge(W - pw - 20 * u, H - ph - 10 * u, 84 * u, A, M, false);
    } else offBadge(W - 140 * u, H - 140 * u, 96 * u, A, M, false);
    logo(W - 40 * u, 36 * u, 80 * u);
  }

  if (o.style === 'stripe') {
    const b = 46 * u;
    ctx.fillStyle = A; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(b, b, W - b * 2, H - b * 2); ctx.clip('evenodd');
    ctx.fillStyle = M;
    for (let x = -H; x < W + H; x += 64 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 32 * u, 0); ctx.lineTo(x + 32 * u - H, H); ctx.lineTo(x - H, H); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    placeProduct(ctx, o, b, b, W - b * 2, H - b * 2);
    // nhãn trên giữa, giá dưới giữa — đè lên viền
    ctx.font = `900 ${56 * u}px ${F}`;
    const lw = Math.min(W * 0.78, ctx.measureText(label).width + 90 * u), lh = (sub ? 128 : 96) * u;
    ctx.fillStyle = M; rr(ctx, (W - lw) / 2, 16 * u, lw, lh, 24 * u); ctx.fill(); ctx.strokeStyle = A; ctx.lineWidth = 6 * u; ctx.stroke();
    text(label, W / 2, 16 * u + (sub ? 64 : 66) * u, lw - 50 * u, 56, '900', A, 'center');
    text(sub, W / 2, 16 * u + 104 * u, lw - 50 * u, 24, '700', '#fff', 'center');
    if (price) {
      ctx.font = `900 ${72 * u}px ${F}`;
      const pw = Math.min(W * 0.62, ctx.measureText(price).width + 90 * u), ph = (old ? 150 : 116) * u, py = H - 16 * u - ph;
      ctx.fillStyle = '#fff'; rr(ctx, (W - pw) / 2, py, pw, ph, 24 * u); ctx.fill(); ctx.strokeStyle = M; ctx.lineWidth = 6 * u; ctx.stroke();
      text(price, W / 2, py + 78 * u, pw - 50 * u, 72, '900', M, 'center', 34);
      if (old) { ctx.font = `700 ${30 * u}px ${F}`; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; strike(ctx, ellipsize(ctx, old, pw - 60 * u), W / 2, py + ph - 22 * u, 30 * u); ctx.textAlign = 'left'; }
      offBadge((W - pw) / 2 - 20 * u, py + 10 * u, 84 * u, M, A);
    } else offBadge(W - 150 * u, H - 150 * u, 100 * u, M, A);
    if (extra) pill(extra, W - b - 30 * u - Math.min(W * 0.36, 340 * u) / 2, b + 170 * u, W * 0.36, 26, M, '#fff');
    logo(b + 20 * u, b + 20 * u, 70 * u, 'left');
  }

  if (o.watermark !== false) drawWatermark(canvas);
}
