// Video ngắn TikTok / Reels / Shorts (9:16) từ 1 ảnh sản phẩm — dựng 100% bằng code (canvas), không AI realtime.
// Mỗi mẫu = 1 hàm vẽ khung hình theo thời gian t. Xem trước: requestAnimationFrame. Xuất: WebCodecs (H.264) + mp4-muxer → .mp4.
// Bố cục né vùng bị nút TikTok che (cột phải ~16%, đáy ~24%): chữ/giá/CTA nằm trong y < 0.76H, x < 0.84W.

import { drawWatermark } from '@/lib/design-engine';
import { paintStudioBg, type ShotBg } from '@/lib/product-shot';

export const VW = 1080, VH = 1920, FPS = 30;
export type VideoTpl = 'launch' | 'flash' | 'luxury' | 'reasons' | 'kinetic' | 'cards' | 'countdown' | 'unbox' | 'showcase' | 'neon' | 'editorial' | 'party';
export const VIDEO_TEMPLATES: { id: VideoTpl; name: string; desc: string; dur: number }[] = [
  { id: 'launch', name: 'Ra mắt sản phẩm', desc: 'Nền studio sáng, sản phẩm trồi lên, giá + 3 điểm nổi bật', dur: 9 },
  { id: 'flash', name: 'Flash sale', desc: 'Màu rực, chữ nảy, đếm giá giảm, đồng hồ đếm ngược', dur: 9 },
  { id: 'luxury', name: 'Sang trọng', desc: 'Nền tối đèn rọi, ánh sáng lướt qua sản phẩm, chữ có chân', dur: 9 },
  { id: 'reasons', name: '3 lý do nên mua', desc: 'Lần lượt hiện 3 lý do, chốt giá + kêu gọi mua', dur: 10 },
  { id: 'kinetic', name: 'Chữ động', desc: 'Chữ to đập liên tiếp trên khối màu rồi lộ sản phẩm — kiểu TikTok', dur: 8 },
  { id: 'cards', name: 'Thẻ trượt', desc: 'Mỗi điểm nổi bật là 1 thẻ trượt vào như story', dur: 9 },
  { id: 'countdown', name: 'Đếm ngược mở bán', desc: '3 – 2 – 1 rồi bùng sáng mở bán', dur: 8 },
  { id: 'unbox', name: 'Mở hộp', desc: '2 cánh cửa màu thương hiệu mở ra để lộ hàng mới', dur: 9 },
  { id: 'showcase', name: 'Bục trưng bày', desc: 'Sản phẩm hạ xuống bục, vòng sáng bay quanh, thẻ giá đung đưa', dur: 9 },
  { id: 'neon', name: 'Neon đêm', desc: 'Chữ neon nhấp nháy, nhiễu glitch — hợp đồ công nghệ, streetwear', dur: 9 },
  { id: 'editorial', name: 'Tạp chí tối giản', desc: 'Chữ có chân căn trái, sản phẩm trượt vào — sang, nhẹ nhàng', dur: 9 },
  { id: 'party', name: 'Tiệc sale', desc: 'Pháo giấy rơi, băng rôn khuyến mãi, sản phẩm nảy', dur: 8 },
];
export const tplDur = (id: VideoTpl) => VIDEO_TEMPLATES.find((t) => t.id === id)!.dur;

export interface VideoData { img: HTMLImageElement | null; cut: boolean; name: string; price: string; oldPrice: string; usps: string[]; cta: string; shop: string }
export interface VideoTheme { main: string; deep: string; tint: string; tint2: string; soft: string }

const SANS = '"Be Vietnam Pro", sans-serif';
const DISPLAY = '"Anton", "Be Vietnam Pro", sans-serif';
const SERIF = '"Playfair Display", Georgia, serif';
const CX = VW * 0.47; // tâm nội dung lệch trái chút, né cột nút bên phải
const MAXW = VW * 0.8;

// ---------- tiện ích ----------
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const outCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const inOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const outBack = (p: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (h: string, a: number) => `rgba(${hex(h).join(',')},${a})`;
const mixHex = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const digits = (s: string) => { const d = s.replace(/\D/g, ''); return d ? Number(d) : NaN; };
const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: string, weight = 800) {
  ctx.font = `${weight} ${size}px ${font}`;
  const w = ctx.measureText(text).width;
  return w > maxW ? Math.max(12, (size * maxW) / w) : size;
}
// xuống dòng tối đa n dòng
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, font: string, size: number, weight: number, n = 2): string[] {
  ctx.font = `${weight} ${size}px ${font}`;
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = '';
  for (const w of words) { const tryL = cur ? `${cur} ${w}` : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; }
  if (cur) lines.push(cur);
  if (lines.length > n) { const head = lines.slice(0, n - 1); head.push(lines.slice(n - 1).join(' ')); return head; }
  return lines;
}
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, font: string, color: string, o: { weight?: number; align?: CanvasTextAlign; alpha?: number; spacing?: number; shadow?: string } = {}) {
  if (!s || (o.alpha ?? 1) <= 0) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight ?? 800} ${size}px ${font}`; ctx.fillStyle = color;
  ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic';
  if (o.spacing) ctx.letterSpacing = `${o.spacing}px`;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06; }
  ctx.fillText(s, x, y); ctx.restore();
}
function pill(ctx: CanvasRenderingContext2D, s: string, cx: number, cy: number, size: number, bg: string, fg: string, o: { alpha?: number; scale?: number; outline?: boolean; font?: string } = {}) {
  if ((o.alpha ?? 1) <= 0) return;
  const font = o.font ?? SANS;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy); ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.font = `800 ${size}px ${font}`; const w = ctx.measureText(s).width + size * 2.2, h = size * 2.1;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  if (o.outline) { ctx.lineWidth = 3; ctx.strokeStyle = bg; ctx.stroke(); } else { ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, size * 0.04);
  ctx.restore();
}
function check(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, bg: string, fg: string) {
  ctx.save(); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = fg; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.42, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.34); ctx.lineTo(x + r * 0.46, y - r * 0.3); ctx.stroke(); ctx.restore();
}

// ---------- chuẩn bị (1 lần mỗi khi đổi nội dung) ----------
interface Box { cx: number; top: number; w: number; h: number }
export interface VideoCache { key: string; bg: HTMLCanvasElement; prod: HTMLCanvasElement | null; box: Box; tmp: HTMLCanvasElement }

function trimImage(img: HTMLImageElement): HTMLCanvasElement {
  const iw = img.naturalWidth, ih = img.naturalHeight; const k = Math.min(1, 360 / Math.max(iw, ih));
  const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(iw * k)); t.height = Math.max(1, Math.round(ih * k));
  const tc = t.getContext('2d', { willReadFrequently: true })!; tc.drawImage(img, 0, 0, t.width, t.height);
  const d = tc.getImageData(0, 0, t.width, t.height).data; let x0 = t.width, y0 = t.height, x1 = -1, y1 = -1;
  for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) if (d[(y * t.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = document.createElement('canvas');
  if (x1 < 0) { out.width = iw; out.height = ih; out.getContext('2d')!.drawImage(img, 0, 0); return out; }
  const sx = Math.max(0, Math.floor(x0 / k) - 1), sy = Math.max(0, Math.floor(y0 / k) - 1);
  const sw = Math.min(iw - sx, Math.ceil((x1 - x0 + 1) / k) + 2), sh = Math.min(ih - sy, Math.ceil((y1 - y0 + 1) / k) + 2);
  out.width = sw; out.height = sh; out.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); return out;
}
// ảnh chưa tách nền → khung ảnh bo góc viền trắng
function cardImage(img: HTMLImageElement): HTMLCanvasElement {
  const iw = img.naturalWidth, ih = img.naturalHeight; const bw = Math.round(Math.min(iw, ih) * 0.035), r = Math.min(iw, ih) * 0.05;
  const c = document.createElement('canvas'); c.width = iw + bw * 2; c.height = ih + bw * 2; const cc = c.getContext('2d')!;
  cc.fillStyle = '#fff'; cc.beginPath(); cc.roundRect(0, 0, c.width, c.height, r + bw); cc.fill();
  cc.save(); cc.beginPath(); cc.roundRect(bw, bw, iw, ih, r); cc.clip(); cc.drawImage(img, bw, bw); cc.restore(); return c;
}

const ZONES: Record<VideoTpl, { cy: number; maxW: number; maxH: number; cx?: number }> = {
  launch: { cy: 0.4, maxW: 0.66, maxH: 0.3 },
  flash: { cy: 0.37, maxW: 0.62, maxH: 0.27 },
  luxury: { cy: 0.41, maxW: 0.64, maxH: 0.32 },
  reasons: { cy: 0.27, maxW: 0.56, maxH: 0.22 },
  kinetic: { cy: 0.41, maxW: 0.64, maxH: 0.3 },
  cards: { cy: 0.28, maxW: 0.56, maxH: 0.22 },
  countdown: { cy: 0.4, maxW: 0.62, maxH: 0.3 },
  unbox: { cy: 0.4, maxW: 0.62, maxH: 0.28 },
  showcase: { cy: 0.38, maxW: 0.5, maxH: 0.25 },
  neon: { cy: 0.4, maxW: 0.6, maxH: 0.28 },
  editorial: { cy: 0.43, maxW: 0.5, maxH: 0.3, cx: 0.62 },
  party: { cy: 0.4, maxW: 0.62, maxH: 0.3 },
};
const BG_OF: Record<VideoTpl, ShotBg['kind']> = {
  launch: 'gradient', flash: 'pop', luxury: 'spotlight', reasons: 'white', kinetic: 'gradient', cards: 'gray',
  countdown: 'burst', unbox: 'cream', showcase: 'podium', neon: 'neon', editorial: 'cream', party: 'aurora',
};

export function makeVideoCache(tpl: VideoTpl, d: VideoData, th: VideoTheme): VideoCache {
  const key = [tpl, d.img?.src, d.cut, th.main, th.tint].join('|');
  const prod = d.img ? (d.cut ? trimImage(d.img) : cardImage(d.img)) : null;
  const z = ZONES[tpl];
  const pw = prod?.width || 1, ph = prod?.height || 1; const k = Math.min((VW * z.maxW) / pw, (VH * z.maxH) / ph);
  const box: Box = { cx: z.cx ? VW * z.cx : CX, w: pw * k, h: ph * k, top: VH * z.cy - (ph * k) / 2 };
  const bg = document.createElement('canvas'); bg.width = VW; bg.height = VH;
  paintStudioBg(bg.getContext('2d')!, { kind: BG_OF[tpl], tint: th.tint, soft: th.soft, main: th.main }, VW, VH, box);
  const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.round(box.w)); tmp.height = Math.max(1, Math.round(box.h));
  return { key, bg, prod, box, tmp };
}

// vẽ sản phẩm: bóng chạm sàn + bóng mềm, biến đổi quanh đáy sản phẩm
function drawProd(ctx: CanvasRenderingContext2D, c: VideoCache, o: { s?: number; dx?: number; dy?: number; rot?: number; a?: number; dark?: boolean; shine?: number }) {
  if (!c.prod || (o.a ?? 1) <= 0) return;
  const { box } = c; const s = o.s ?? 1; const baseX = box.cx + (o.dx ?? 0), baseY = box.top + box.h + (o.dy ?? 0);
  ctx.save(); ctx.globalAlpha *= o.a ?? 1;
  // bóng chạm sàn
  ctx.save(); ctx.translate(baseX, baseY - 4); ctx.scale(1, 0.12);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * 0.5 * s); g.addColorStop(0, `rgba(0,0,0,${o.dark ? 0.7 : 0.4})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, box.w * 0.5 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.translate(baseX, baseY); ctx.rotate(o.rot ?? 0); ctx.scale(s, s);
  let src: CanvasImageSource = c.prod;
  if (o.shine !== undefined && o.shine > -0.5 && o.shine < 1.5) {
    // vệt sáng lướt chéo qua sản phẩm (chỉ trên phần có pixel)
    const tc = c.tmp.getContext('2d')!; const w = c.tmp.width, h = c.tmp.height;
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, w, h); tc.drawImage(c.prod, 0, 0, w, h);
    tc.globalCompositeOperation = 'source-atop';
    const x = -w * 0.6 + o.shine * w * 2.2; const lg = tc.createLinearGradient(x - w * 0.25, 0, x + w * 0.25, h * 0.4);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    tc.fillStyle = lg; tc.fillRect(0, 0, w, h); src = c.tmp;
  }
  ctx.shadowColor = o.dark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.22)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
  ctx.drawImage(src, -box.w / 2, -box.h, box.w, box.h);
  ctx.restore();
}

function priceParts(d: VideoData) {
  const now = digits(d.price), was = digits(d.oldPrice);
  const off = !isNaN(now) && !isNaN(was) && was > now ? Math.round((1 - now / was) * 100) : 0;
  return { now, was, off };
}

// ---------- các mẫu ----------
function launch(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = th.deep;
  const enter = outCubic(seg(t, 0.1, 1.2));
  const up = inOut(seg(t, 3.6, 4.3)) - inOut(seg(t, 6.6, 7.3)); // pha 2: sản phẩm nhích lên nhường chỗ cho 3 ý
  drawProd(ctx, c, { a: enter, dy: (1 - enter) * VH * 0.1 - up * VH * 0.07, s: (0.9 + 0.1 * enter) * (1 + 0.04 * (t / 9)) * (1 - 0.1 * up) });
  const a1 = outCubic(seg(t, 0.5, 1.1));
  text(ctx, (d.shop || '').toUpperCase(), CX, VH * 0.07, 34, SANS, th.main, { alpha: a1, spacing: 8 });
  const lines = wrap(ctx, d.name, MAXW, SANS, 84, 800, 2); const ns = Math.min(84, ...lines.map((l) => fit(ctx, l, MAXW, 84, SANS)));
  const a2 = outCubic(seg(t, 0.7, 1.4));
  lines.forEach((l, i) => text(ctx, l, CX, VH * 0.125 + i * ns * 1.12 + (1 - a2) * 40, ns, SANS, ink, { alpha: a2 }));
  // giá (pha 1 + pha 3)
  const pShow = Math.min(seg(t, 1.6, 2.2), 1 - seg(t, 3.4, 3.8)) + seg(t, 6.8, 7.3);
  const { off } = priceParts(d);
  if (pShow > 0) {
    const sc = t < 4 ? outBack(seg(t, 1.6, 2.2)) : outBack(seg(t, 6.8, 7.3));
    ctx.save(); ctx.translate(CX, VH * 0.635); ctx.scale(sc, sc);
    if (d.oldPrice) {
      ctx.font = `600 46px ${SANS}`; const ow = ctx.measureText(d.oldPrice).width;
      text(ctx, d.oldPrice, 0, -88, 46, SANS, rgba(ink, 0.5), { weight: 600, alpha: pShow });
      ctx.save(); ctx.globalAlpha *= pShow; ctx.strokeStyle = rgba(ink, 0.55); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-ow / 2 - 6, -102); ctx.lineTo(ow / 2 + 6, -102); ctx.stroke(); ctx.restore();
    }
    const ps = fit(ctx, d.price, MAXW * 0.8, 120, SANS);
    text(ctx, d.price, 0, 20, ps, SANS, th.main, { alpha: pShow });
    if (off) { ctx.font = `800 ${ps}px ${SANS}`; const pw = ctx.measureText(d.price).width; pill(ctx, `-${off}%`, pw / 2 + 70, -60, 34, '#ef4444', '#fff', { alpha: pShow }); }
    ctx.restore();
  }
  // pha 2: 3 điểm nổi bật
  const usps = d.usps.filter(Boolean).slice(0, 3);
  usps.forEach((u, i) => {
    const p = outCubic(seg(t, 4.0 + i * 0.45, 4.6 + i * 0.45)) * (1 - seg(t, 6.2, 6.6));
    if (p <= 0) return;
    const y = VH * (0.56 + i * 0.062); const x0 = VW * 0.14 - (1 - p) * 80;
    ctx.save(); ctx.globalAlpha = p;
    ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.beginPath(); ctx.roundRect(x0 - 20, y - 52, MAXW * 0.95, 96, 48); ctx.fill();
    check(ctx, x0 + 30, y - 4, 28, th.main, '#fff');
    const fs = fit(ctx, u, MAXW * 0.95 - 120, 44, SANS, 700);
    text(ctx, u, x0 + 80, y + fs * 0.33, fs, SANS, ink, { align: 'left', weight: 700 });
    ctx.restore();
  });
  // CTA
  const ca = Math.min(seg(t, 2.3, 2.8), 1 - seg(t, 3.4, 3.8)) + seg(t, 7.3, 7.8);
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.715, 44, th.main, '#fff', { alpha: ca, scale: t > 7.3 ? 1 + 0.04 * Math.sin(t * 6) : 1 });
}

function flash(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const { now, was, off } = priceParts(d);
  // tia sáng xoay chậm sau sản phẩm
  ctx.save(); ctx.translate(c.box.cx, c.box.top + c.box.h * 0.5); ctx.rotate(t * 0.22); ctx.globalAlpha = 0.13; ctx.fillStyle = '#fff';
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VH, -VH * 0.08); ctx.lineTo(VH, VH * 0.08); ctx.closePath(); if (i % 2 === 0) ctx.fill(); }
  ctx.restore();
  // FLASH SALE
  const z = outBack(seg(t, 0, 0.5)); const shake = t < 0.9 ? Math.sin(t * 60) * 8 * (1 - seg(t, 0.4, 0.9)) : 0;
  ctx.save(); ctx.translate(CX + shake, VH * 0.105); ctx.scale(0.4 + 0.6 * z, 0.4 + 0.6 * z);
  const fs = fit(ctx, 'FLASH SALE', MAXW, 190, DISPLAY, 400);
  text(ctx, 'FLASH SALE', 0, fs * 0.35, fs, DISPLAY, '#fff', { weight: 400, alpha: seg(t, 0, 0.2), shadow: rgba(th.deep, 0.5) });
  ctx.restore();
  text(ctx, (d.shop || '').toUpperCase(), CX, VH * 0.178, 34, SANS, rgba('#ffffff', 0.9), { alpha: seg(t, 0.5, 0.9), spacing: 6 });
  // sản phẩm nảy vào + lắc nhẹ + nổi bồng bềnh
  const pin = outBack(seg(t, 0.4, 1.2));
  drawProd(ctx, c, { s: 0.3 + 0.7 * pin, a: seg(t, 0.4, 0.6), rot: Math.sin(t * 2.1) * 0.03, dy: Math.sin(t * 2.4) * 12 });
  // tem giảm giá
  if (off) {
    const bp = outBack(seg(t, 1.2, 1.6)); const bx = c.box.cx + c.box.w * 0.42, by = c.box.top + c.box.h * 0.1; const R = 96;
    if (bp > 0) {
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.2 + t * 0.15); ctx.scale(bp, bp);
      ctx.fillStyle = '#ffd400'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const r = i % 2 ? R * 0.84 : R; const a = (i / 24) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.rotate(0.2 - t * 0.15); text(ctx, `-${off}%`, 0, 18, 58, SANS, th.deep, {});
      ctx.restore();
    }
  }
  // khung giá: giá đếm lùi từ giá gốc về giá bán
  const bp = outCubic(seg(t, 1.4, 1.9));
  if (bp > 0) {
    const y = VH * 0.6 + (1 - bp) * 60; const w = MAXW * 0.92, h = 210;
    ctx.save(); ctx.globalAlpha = bp; ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(CX - w / 2, y - h / 2, w, h, 36); ctx.fill(); ctx.restore();
    const cnt = inOut(seg(t, 1.7, 2.9));
    const shown = !isNaN(now) && !isNaN(was) && was > now ? (cnt < 1 ? vnd(was + (now - was) * cnt) : d.price) : d.price;
    const pop = t > 2.9 ? 1 + 0.12 * Math.sin(Math.PI * seg(t, 2.9, 3.2)) : 1;
    ctx.save(); ctx.translate(CX, y + 40); ctx.scale(pop, pop);
    const ps = fit(ctx, shown, w * 0.86, 110, SANS);
    text(ctx, shown, 0, 0, ps, SANS, th.main, { alpha: bp });
    ctx.restore();
    if (d.oldPrice) {
      text(ctx, `Giá gốc ${d.oldPrice}`, CX, y - 50, 38, SANS, '#64748b', { weight: 600, alpha: bp });
      ctx.save(); ctx.globalAlpha = bp; ctx.font = `600 38px ${SANS}`; const ow = ctx.measureText(d.oldPrice).width; const fw = ctx.measureText(`Giá gốc ${d.oldPrice}`).width;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(CX + fw / 2 - ow, y - 63); ctx.lineTo(CX + fw / 2, y - 63); ctx.stroke(); ctx.restore();
    }
  }
  // đồng hồ đếm ngược (đếm theo thời gian video)
  const ca = seg(t, 3.2, 3.6);
  if (ca > 0) {
    const left = Math.max(0, 3 * 3600 - 1 - Math.floor(t * 7)); const hh = String(Math.floor(left / 3600)).padStart(2, '0'), mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
    text(ctx, `⏱ Kết thúc sau ${hh}:${mm}:${ss}`, CX, VH * 0.682, 40, SANS, '#fff', { weight: 700, alpha: ca, shadow: 'rgba(0,0,0,0.3)' });
  }
  // CTA nhấp nháy
  const cta = seg(t, 4.2, 4.6);
  pill(ctx, (d.cta || 'Mua ngay').toUpperCase(), CX, VH * 0.735, 46, '#ffd400', th.deep, { alpha: cta, scale: 1 + 0.06 * Math.max(0, Math.sin(t * 7)) });
  // dải chữ chạy (trang trí, nằm vùng dưới)
  const tk = seg(t, 2.6, 3.0);
  if (tk > 0) {
    const y = VH * 0.8; ctx.save(); ctx.globalAlpha = tk; ctx.fillStyle = th.deep; ctx.fillRect(0, y - 50, VW, 100);
    const msg = (d.usps.filter(Boolean).join('   ★   ') || 'Freeship toàn quốc') + '   ★   ';
    ctx.font = `800 40px ${SANS}`; const mw = ctx.measureText(msg).width; const off2 = (t * 220) % mw;
    ctx.fillStyle = '#ffd400'; ctx.textBaseline = 'middle'; for (let x = -off2; x < VW; x += mw) ctx.fillText(msg, x, y + 2);
    ctx.restore();
  }
}

function luxury(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const gold = '#e9c77b';
  const a = inOut(seg(t, 0.2, 1.8));
  drawProd(ctx, c, { a, s: 1 + 0.06 * (t / 9), dark: true, shine: t < 4 ? (t - 1.6) / 1.3 : (t - 5.4) / 1.3 });
  const la = inOut(seg(t, 1.2, 2.2));
  ctx.save(); ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(CX - 150 * la, VH * 0.085); ctx.lineTo(CX + 150 * la, VH * 0.085); ctx.stroke(); ctx.restore();
  text(ctx, (d.shop || '').toUpperCase(), CX, VH * 0.07, 30, SANS, gold, { weight: 600, alpha: seg(t, 1.4, 2.2), spacing: 4 + 8 * inOut(seg(t, 1.4, 3)) });
  const lines = wrap(ctx, d.name, MAXW, SERIF, 92, 800, 2); const ns = Math.min(92, ...lines.map((l) => fit(ctx, l, MAXW, 92, SERIF)));
  lines.forEach((l, i) => text(ctx, l, CX, VH * 0.135 + i * ns * 1.12, ns, SERIF, '#ffffff', { alpha: inOut(seg(t, 1.8 + i * 0.3, 2.8 + i * 0.3)) }));
  const usp = d.usps.filter(Boolean).slice(0, 3);
  usp.forEach((u, i) => { const p = Math.min(seg(t, 3.2 + i * 0.6, 3.8 + i * 0.6), 1 - seg(t, 6, 6.5)); text(ctx, u, CX, VH * (0.63 + i * 0.04), 40, SANS, 'rgba(255,255,255,0.85)', { weight: 500, alpha: p }); });
  const pa = inOut(seg(t, 6.4, 7.2));
  if (d.oldPrice) text(ctx, d.oldPrice, CX, VH * 0.625, 40, SANS, 'rgba(255,255,255,0.45)', { weight: 500, alpha: pa });
  if (d.oldPrice && pa > 0) { ctx.save(); ctx.globalAlpha = pa * 0.6; ctx.font = `500 40px ${SANS}`; const ow = ctx.measureText(d.oldPrice).width; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CX - ow / 2, VH * 0.625 - 13); ctx.lineTo(CX + ow / 2, VH * 0.625 - 13); ctx.stroke(); ctx.restore(); }
  text(ctx, d.price, CX, VH * 0.675, fit(ctx, d.price, MAXW, 96, SERIF), SERIF, gold, { alpha: pa });
  pill(ctx, d.cta || 'Đặt hàng ngay', CX, VH * 0.725, 36, gold, gold, { alpha: inOut(seg(t, 7.2, 7.8)), outline: true });
}

function reasons(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = th.deep;
  text(ctx, '3 LÝ DO NÊN MUA', CX, VH * 0.07, fit(ctx, '3 LÝ DO NÊN MUA', MAXW, 78, SANS), SANS, th.main, { alpha: outCubic(seg(t, 0.1, 0.6)) });
  text(ctx, d.name, CX, VH * 0.105, fit(ctx, d.name, MAXW, 46, SANS, 700), SANS, ink, { weight: 700, alpha: outCubic(seg(t, 0.4, 0.9)) });
  const pe = outBack(seg(t, 0.5, 1.3));
  drawProd(ctx, c, { s: 0.6 + 0.4 * pe, a: seg(t, 0.5, 0.8), dy: Math.sin(t * 1.8) * 6 });
  const usps = (d.usps.filter(Boolean).length ? d.usps.filter(Boolean) : ['Chất lượng cao', 'Giá tốt', 'Giao nhanh']).slice(0, 3);
  const out = seg(t, 6.2, 6.7);
  usps.forEach((u, i) => {
    const p = outBack(seg(t, 1.6 + i * 1.4, 2.1 + i * 1.4)); const a = seg(t, 1.6 + i * 1.4, 1.9 + i * 1.4) * (1 - out);
    if (a <= 0) return;
    const y = VH * (0.47 + i * 0.085); const x = VW * 0.1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + (1 - p) * -120, y);
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(15,23,42,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.beginPath(); ctx.roundRect(0, -70, MAXW * 0.95, 140, 32); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = th.main; ctx.beginPath(); ctx.arc(76, 0, 46, 0, Math.PI * 2); ctx.fill();
    text(ctx, String(i + 1), 76, 22, 60, SANS, '#fff', {});
    const lines = wrap(ctx, u, MAXW * 0.95 - 170, SANS, 46, 700, 2); const fs = Math.min(46, ...lines.map((l) => fit(ctx, l, MAXW * 0.95 - 170, 46, SANS, 700)));
    lines.forEach((l, k) => text(ctx, l, 150, (k - (lines.length - 1) / 2) * fs * 1.15 + fs * 0.35, fs, SANS, ink, { align: 'left', weight: 700 }));
    ctx.restore();
  });
  // chốt: giá + CTA
  const pa = outBack(seg(t, 6.8, 7.4));
  if (pa > 0) {
    ctx.save(); ctx.translate(CX, VH * 0.56); ctx.scale(pa, pa);
    if (d.oldPrice) text(ctx, `Giá gốc ${d.oldPrice}`, 0, -110, 44, SANS, rgba(ink, 0.5), { weight: 600 });
    text(ctx, d.price, 0, 20, fit(ctx, d.price, MAXW, 130, SANS), SANS, th.main, {});
    ctx.restore();
  }
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.66, 46, th.main, '#fff', { alpha: seg(t, 7.4, 7.9), scale: t > 7.9 ? 1 + 0.04 * Math.sin(t * 6) : 1 });
}

// ---------- mẫu bổ sung ----------
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function priceBlock(ctx: CanvasRenderingContext2D, d: VideoData, x: number, y: number, color: string, oldColor: string, a: number, o: { align?: CanvasTextAlign; font?: string; size?: number } = {}) {
  if (a <= 0) return;
  const font = o.font ?? SANS; const align = o.align ?? 'center'; const size = fit(ctx, d.price, MAXW * 0.8, o.size ?? 110, font);
  text(ctx, d.price, x, y, size, font, color, { alpha: a, align });
  if (d.oldPrice) {
    text(ctx, d.oldPrice, x, y - size * 0.95, 42, SANS, oldColor, { weight: 600, alpha: a, align });
    ctx.save(); ctx.globalAlpha *= a; ctx.font = `600 42px ${SANS}`; const ow = ctx.measureText(d.oldPrice).width;
    const x0 = align === 'left' ? x : x - ow / 2; ctx.strokeStyle = oldColor; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 - 4, y - size * 0.95 - 14); ctx.lineTo(x0 + ow + 4, y - size * 0.95 - 14); ctx.stroke(); ctx.restore();
  }
}
function nameLines(ctx: CanvasRenderingContext2D, d: VideoData, x: number, y: number, color: string, a: number, o: { font?: string; size?: number; align?: CanvasTextAlign; maxW?: number; upper?: boolean } = {}) {
  const font = o.font ?? SANS; const mw = o.maxW ?? MAXW; const s0 = o.size ?? 84; const nm = o.upper ? d.name.toUpperCase() : d.name;
  const lines = wrap(ctx, nm, mw, font, s0, 800, 2); const ns = Math.min(s0, ...lines.map((l) => fit(ctx, l, mw, s0, font)));
  lines.forEach((l, i) => text(ctx, l, x, y + i * ns * 1.12, ns, font, color, { alpha: a, align: o.align }));
  return y + lines.length * ns * 1.12;
}

// Chữ động: từng chữ to đập vào màn hình trên khối màu, rồi lộ sản phẩm
function kinetic(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const { off } = priceParts(d);
  const words = ['SIÊU PHẨM', off ? `GIẢM ${off}%` : 'HÀNG HOT', 'SĂN NGAY!'];
  const fills = [th.main, th.deep, '#ffd400']; const inks = ['#ffffff', '#ffd400', th.deep];
  const reveal = inOut(seg(t, 2.4, 3.0));
  if (t < 3.0) {
    const i = Math.min(2, Math.floor(t / 0.8)); const lt = (t - i * 0.8) / 0.8;
    ctx.save(); ctx.translate(0, -reveal * VH); ctx.fillStyle = fills[i]; ctx.fillRect(0, 0, VW, VH);
    const sc = 1.5 - 0.5 * outBack(clamp(lt * 2.2)); const fs = fit(ctx, words[i], VW * 0.86, 230, DISPLAY, 400);
    ctx.translate(VW / 2, VH * 0.45); ctx.rotate(-0.06 + (i % 2) * 0.12); ctx.scale(sc, sc);
    text(ctx, words[i], 0, fs * 0.35, fs, DISPLAY, inks[i], { weight: 400 });
    ctx.restore();
  }
  if (reveal <= 0) return;
  const pin = outBack(seg(t, 2.7, 3.5));
  drawProd(ctx, c, { s: 0.4 + 0.6 * pin, a: seg(t, 2.7, 2.9), dy: Math.sin(t * 2) * 8 });
  nameLines(ctx, d, CX, VH * 0.1, th.deep, outCubic(seg(t, 3.2, 3.8)), { upper: true, font: DISPLAY, size: 110 });
  priceBlock(ctx, d, CX, VH * 0.665, th.main, rgba(th.deep, 0.5), outBack(seg(t, 3.8, 4.4)));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.725, 44, th.main, '#fff', { alpha: seg(t, 4.6, 5), scale: 1 + 0.05 * Math.max(0, Math.sin(t * 7)) });
}

// Thẻ trượt: mỗi điểm nổi bật là 1 thẻ lớn trượt từ phải vào như story
function cards(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = th.deep;
  nameLines(ctx, d, CX, VH * 0.075, ink, outCubic(seg(t, 0.2, 0.8)), { size: 72 });
  drawProd(ctx, c, { a: seg(t, 0.3, 0.7), s: 0.85 + 0.15 * outBack(seg(t, 0.3, 1.1)) });
  const usps = (d.usps.filter(Boolean).length ? d.usps.filter(Boolean) : ['Chất lượng cao', 'Giá tốt', 'Giao nhanh']).slice(0, 3);
  const icons = ['✦', '♥', '⚡'];
  usps.forEach((u, i) => {
    const t0 = 1.4 + i * 1.5; const pin = outCubic(seg(t, t0, t0 + 0.5)); const pout = inOut(seg(t, t0 + 1.3, t0 + 1.7));
    if (pin <= 0 || (pout >= 1 && i < usps.length - 1) || t > 6.6) return;
    const x = CX + (1 - pin) * VW - (i < usps.length - 1 ? pout * VW : 0);
    const y = VH * 0.6; const w = MAXW * 0.95, h = 230;
    ctx.save(); ctx.translate(x, y); ctx.rotate((1 - pin) * 0.08);
    ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 40); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = th.tint; ctx.beginPath(); ctx.arc(-w / 2 + 110, 0, 70, 0, Math.PI * 2); ctx.fill();
    text(ctx, icons[i], -w / 2 + 110, 26, 72, SANS, th.main, {});
    text(ctx, `${i + 1}/${usps.length}`, w / 2 - 40, -h / 2 + 56, 30, SANS, rgba(ink, 0.4), { align: 'right', weight: 700 });
    const lines = wrap(ctx, u, w - 260, SANS, 52, 800, 2); const fs = Math.min(52, ...lines.map((l) => fit(ctx, l, w - 260, 52, SANS)));
    lines.forEach((l, k) => text(ctx, l, -w / 2 + 210, (k - (lines.length - 1) / 2) * fs * 1.15 + fs * 0.35, fs, SANS, ink, { align: 'left' }));
    ctx.restore();
  });
  priceBlock(ctx, d, CX, VH * 0.635, th.main, rgba(ink, 0.5), outBack(seg(t, 6.7, 7.2)));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.715, 44, th.main, '#fff', { alpha: seg(t, 7.2, 7.6) });
}

// Đếm ngược 3-2-1 rồi mở bán
function countdown(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  if (t < 2.4) {
    const i = Math.floor(t / 0.8); const lt = (t - i * 0.8) / 0.8;
    ctx.fillStyle = th.deep; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.15); ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(VW / 2, VH * 0.43, 300, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = th.main; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(VW / 2, VH * 0.43, 300, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lt)); ctx.stroke(); ctx.restore();
    const sc = 1.4 - 0.4 * outCubic(clamp(lt * 2)); ctx.save(); ctx.translate(VW / 2, VH * 0.43); ctx.scale(sc, sc);
    text(ctx, String(3 - i), 0, 120, 340, DISPLAY, '#fff', { weight: 400, alpha: 1 - seg(lt, 0.75, 1) }); ctx.restore();
    text(ctx, 'MỞ BÁN SAU', VW / 2, VH * 0.22, 56, SANS, rgba('#ffffff', 0.7), { spacing: 8 });
    return;
  }
  const flash = 1 - seg(t, 2.4, 2.8);
  ctx.save(); ctx.translate(c.box.cx, c.box.top + c.box.h * 0.5); ctx.rotate(t * 0.3); ctx.globalAlpha = 0.16; ctx.fillStyle = '#fff';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); if (i % 2) continue; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VH, -VH * 0.1); ctx.lineTo(VH, VH * 0.1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  drawProd(ctx, c, { s: 0.5 + 0.5 * outBack(seg(t, 2.4, 3.2)), a: 1, dy: Math.sin(t * 2.2) * 8 });
  text(ctx, 'ĐÃ MỞ BÁN!', CX, VH * 0.085, fit(ctx, 'ĐÃ MỞ BÁN!', MAXW, 120, DISPLAY, 400), DISPLAY, th.deep, { weight: 400, alpha: seg(t, 2.6, 2.9) });
  nameLines(ctx, d, CX, VH * 0.135, th.deep, outCubic(seg(t, 2.9, 3.4)), { size: 60 });
  priceBlock(ctx, d, CX, VH * 0.655, th.main, rgba(th.deep, 0.5), outBack(seg(t, 3.4, 4)));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.725, 44, th.main, '#fff', { alpha: seg(t, 4.2, 4.6), scale: 1 + 0.05 * Math.max(0, Math.sin(t * 7)) });
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, VW, VH); }
}

// Mở hộp: 2 cánh cửa màu thương hiệu trượt ra để lộ sản phẩm
function unbox(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = th.deep;
  drawProd(ctx, c, { s: 0.92 + 0.08 * outCubic(seg(t, 0.6, 2)) + 0.03 * (t / 9) });
  pill(ctx, 'HÀNG MỚI VỀ', CX, VH * 0.075, 34, th.main, '#fff', { alpha: seg(t, 1.8, 2.1), scale: outBack(seg(t, 1.8, 2.3)) });
  nameLines(ctx, d, CX, VH * 0.135, ink, outCubic(seg(t, 2.1, 2.7)), { size: 76 });
  const usps = d.usps.filter(Boolean).slice(0, 3);
  const rowY = VH * 0.585;
  usps.forEach((u, i) => {
    const p = outBack(seg(t, 3.2 + i * 0.3, 3.7 + i * 0.3)) * (1 - seg(t, 6, 6.4)); if (p <= 0) return;
    pill(ctx, `✓ ${u}`, CX, rowY + i * 72, 30, '#ffffff', ink, { scale: p });
  });
  priceBlock(ctx, d, CX, VH * 0.665, th.main, rgba(ink, 0.5), outBack(seg(t, 6.4, 7)));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.725, 44, th.main, '#fff', { alpha: seg(t, 7, 7.4) });
  // 2 cánh cửa
  const open = inOut(seg(t, 0.5, 1.7));
  if (open < 1) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? -open * VW / 2 : VW / 2 + open * VW / 2;
      const g = ctx.createLinearGradient(x, 0, x + VW / 2, 0); g.addColorStop(0, side < 0 ? th.main : mixHex(th.main, '#000000', 0.15)); g.addColorStop(1, side < 0 ? mixHex(th.main, '#000000', 0.15) : th.main);
      ctx.fillStyle = g; ctx.fillRect(x, 0, VW / 2, VH);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(side < 0 ? x + VW / 2 - 6 : x, 0, 6, VH);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(side < 0 ? x + VW / 2 - 60 : x + 40, VH * 0.46, 20, 140, 10); ctx.fill();
    }
    text(ctx, (d.shop || 'NEW').toUpperCase(), VW / 2, VH * 0.4, fit(ctx, (d.shop || 'NEW').toUpperCase(), VW * 0.7, 90, DISPLAY, 400), DISPLAY, '#fff', { weight: 400, alpha: 1 - seg(t, 0.3, 0.6) });
  }
}

// Bục trưng bày: sản phẩm hạ xuống bục, vòng sáng bay quanh, thẻ giá treo đung đưa
function showcase(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = th.deep; const drop = seg(t, 0.3, 1.2);
  const dy = drop < 1 ? -(1 - outCubic(drop)) * VH * 0.35 : -Math.abs(Math.sin(seg(t, 1.2, 1.6) * Math.PI)) * 30 * (1 - seg(t, 1.2, 1.6));
  // vòng sáng quỹ đạo
  const ocx = c.box.cx, ocy = c.box.top + c.box.h * 0.75, rx = c.box.w * 0.75, ry = c.box.w * 0.16;
  const back = (Math.sin(t * 2.2) < 0);
  const dot = () => { const a = t * 2.2; const x = ocx + Math.cos(a) * rx, y = ocy + Math.sin(a) * ry; ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 40; ctx.fillStyle = '#fff'; ctx.globalAlpha = seg(t, 1.5, 2); ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  ctx.save(); ctx.globalAlpha = 0.35 * seg(t, 1.5, 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ocx, ocy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (back) dot();
  drawProd(ctx, c, { dy, a: seg(t, 0.3, 0.5) });
  if (!back) dot();
  text(ctx, (d.shop || '').toUpperCase(), CX, VH * 0.045, 30, SANS, th.main, { alpha: seg(t, 1.2, 1.6), spacing: 6 });
  nameLines(ctx, d, CX, VH * 0.095, ink, outCubic(seg(t, 1.4, 2)), { size: 78 });
  // thẻ giá treo
  const tp = outBack(seg(t, 2.2, 2.8));
  if (tp > 0) {
    const ax = c.box.cx + c.box.w * 0.55, ay = VH * 0.2; const sw = Math.sin(t * 2.6) * 0.12 * (1 - seg(t, 2.2, 6)) + Math.sin(t * 1.3) * 0.03;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(sw); ctx.scale(tp, tp);
    ctx.strokeStyle = rgba(ink, 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -VH * 0.2); ctx.lineTo(0, 0); ctx.stroke();
    ctx.font = `800 64px ${SANS}`; const w = Math.max(260, ctx.measureText(d.price).width + 80);
    ctx.fillStyle = th.main; ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.beginPath(); ctx.roundRect(-w / 2, 0, w, 150, 24); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 26, 10, 0, Math.PI * 2); ctx.fill();
    if (d.oldPrice) text(ctx, d.oldPrice, 0, 72, 30, SANS, rgba('#ffffff', 0.7), { weight: 600 });
    text(ctx, d.price, 0, 128, fit(ctx, d.price, w - 40, 60, SANS), SANS, '#fff', {});
    ctx.restore();
  }
  const usps = d.usps.filter(Boolean).slice(0, 3);
  usps.forEach((u, i) => text(ctx, `✓  ${u}`, CX, VH * (0.655 + i * 0.033), 36, SANS, ink, { weight: 700, alpha: seg(t, 3.4 + i * 0.4, 3.8 + i * 0.4) * (1 - seg(t, 6.4, 6.8)) }));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.7, 46, th.main, '#fff', { alpha: seg(t, 6.8, 7.2), scale: 1 + 0.04 * Math.sin(t * 6) });
}

// Neon đêm: chữ neon nhấp nháy khi bật, vệt nhiễu glitch
function neonNight(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const neon = mixHex(th.main, '#ffffff', 0.35);
  const flick = t < 1 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.15) : 1;
  drawProd(ctx, c, { a: seg(t, 0.4, 1), s: 1 + 0.03 * Math.sin(t * 1.5), dark: true });
  const glowText = (s: string, y: number, size: number, col: string, a: number, font = SANS) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.fillStyle = mixHex(col, '#ffffff', 0.7);
    ctx.shadowColor = col; for (const b of [60, 24, 8]) { ctx.shadowBlur = b; ctx.fillText(s, CX, y); } ctx.restore();
  };
  glowText('HOT DEAL', VH * 0.1, fit(ctx, 'HOT DEAL', MAXW, 150, DISPLAY, 400), neon, flick * seg(t, 0, 0.1), DISPLAY);
  const lines = wrap(ctx, d.name, MAXW, SANS, 64, 800, 2); lines.forEach((l, i) => glowText(l, VH * 0.15 + i * 72, fit(ctx, l, MAXW, 64, SANS), '#7dd3fc', outCubic(seg(t, 1.2 + i * 0.2, 1.8 + i * 0.2))));
  glowText(d.price, VH * 0.665, fit(ctx, d.price, MAXW, 120, SANS), '#fde047', outCubic(seg(t, 2.6, 3.2)));
  if (d.oldPrice) text(ctx, `Giá gốc ${d.oldPrice}`, CX, VH * 0.6, 40, SANS, 'rgba(255,255,255,0.55)', { weight: 600, alpha: seg(t, 2.4, 2.8) });
  const usps = d.usps.filter(Boolean).slice(0, 3);
  if (usps.length) { const i = Math.floor(seg(t, 3.6, 7.2) * usps.length * 0.999); const lt = (seg(t, 3.6, 7.2) * usps.length) % 1; glowText(usps[Math.min(i, usps.length - 1)], VH * 0.61 - 90, 44, neon, t > 3.6 && t < 7.2 ? Math.min(seg(lt, 0, 0.15), 1 - seg(lt, 0.85, 1)) : 0); }
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.73, 44, neon, neon, { alpha: seg(t, 3.4, 3.8), outline: true, scale: 1 + 0.03 * Math.sin(t * 6) });
  // glitch: dịch ngang vài lát cắt
  for (const g0 of [3.0, 6.2]) {
    const gp = seg(t, g0, g0 + 0.18); if (gp <= 0 || gp >= 1) continue;
    const r = rng(Math.floor(t * 30)); const cv = ctx.canvas; const S = cv.width / VW;
    for (let k = 0; k < 6; k++) { const y = r() * cv.height, h = (20 + r() * 80) * S, dx = (r() - 0.5) * 80 * S; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h); ctx.restore(); }
  }
}

// Tạp chí tối giản: chữ có chân căn trái, sản phẩm trượt vào từ phải
function editorial(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const ink = '#1c1917'; const X = VW * 0.09;
  drawProd(ctx, c, { dx: (1 - outCubic(seg(t, 0.2, 1.5))) * VW * 0.5, a: seg(t, 0.2, 0.6) });
  const la = inOut(seg(t, 0.8, 1.8));
  ctx.save(); ctx.fillStyle = th.main; ctx.fillRect(X, VH * 0.06, 90 * la, 5); ctx.restore();
  text(ctx, (d.shop ? `${d.shop} — ` : '') + 'NEW COLLECTION', X, VH * 0.09, 30, SANS, rgba(ink, 0.6), { weight: 600, align: 'left', spacing: 4, alpha: seg(t, 1, 1.6) });
  nameLines(ctx, d, X, VH * 0.145, ink, inOut(seg(t, 1.2, 2.2)), { font: SERIF, size: 96, align: 'left', maxW: VW * 0.78 });
  const usps = d.usps.filter(Boolean).slice(0, 3);
  usps.forEach((u, i) => {
    const a = inOut(seg(t, 2.6 + i * 0.4, 3.2 + i * 0.4)); const y = VH * (0.6 + i * 0.035);
    text(ctx, `0${i + 1}`, X, y, 30, SERIF, th.main, { align: 'left', alpha: a });
    text(ctx, u, X + 70, y, 36, SANS, ink, { weight: 500, align: 'left', alpha: a });
  });
  const pa = inOut(seg(t, 4.6, 5.4));
  ctx.save(); ctx.globalAlpha = pa; ctx.fillStyle = rgba(ink, 0.15); ctx.fillRect(X, VH * 0.665, VW * 0.78, 2); ctx.restore();
  text(ctx, d.price, X, VH * 0.715, fit(ctx, d.price, VW * 0.4, 80, SERIF), SERIF, ink, { align: 'left', alpha: pa });
  if (d.oldPrice) text(ctx, d.oldPrice, X + VW * 0.42, VH * 0.712, 36, SANS, rgba(ink, 0.4), { weight: 500, align: 'left', alpha: pa });
  pill(ctx, d.cta || 'Mua ngay', VW * 0.66, VH * 0.75, 30, ink, '#fff', { alpha: seg(t, 5.6, 6) });
}

// Tiệc sale: pháo giấy rơi, băng rôn chéo, sản phẩm nảy
function party(ctx: CanvasRenderingContext2D, d: VideoData, th: VideoTheme, c: VideoCache, t: number) {
  const r = rng(7); const cols = [th.main, '#ffd400', '#22d3ee', '#ffffff', mixHex(th.main, '#000000', 0.2)];
  for (let i = 0; i < 70; i++) {
    const x0 = r() * VW, sp = 220 + r() * 320, ph = r() * 10, w = 14 + r() * 16, col = cols[i % cols.length], start = r() * 1.5;
    const y = ((t - start) * sp + r() * VH) % (VH + 100) - 50; if (t < start * 0.3) continue;
    ctx.save(); ctx.translate(x0 + Math.sin(t * 2 + ph) * 40, y); ctx.rotate(t * 3 + ph); ctx.scale(1, Math.abs(Math.cos(t * 4 + ph)) + 0.2);
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(-w / 2, -w / 4, w, w / 2); ctx.restore();
  }
  drawProd(ctx, c, { s: 0.4 + 0.6 * outBack(seg(t, 0.3, 1.1)), a: seg(t, 0.3, 0.5), dy: -Math.abs(Math.sin(t * 3)) * 18 * seg(t, 1.1, 1.5) });
  const promo = (d.usps.find(Boolean) || 'SALE TƯNG BỪNG').toUpperCase();
  const bp = outBack(seg(t, 1.2, 1.7));
  if (bp > 0) {
    ctx.save(); ctx.translate(CX, VH * 0.1); ctx.rotate(-0.06); ctx.scale(bp, bp);
    const fs = fit(ctx, promo, MAXW * 0.9, 80, DISPLAY, 400); ctx.font = `400 ${fs}px ${DISPLAY}`; const w = ctx.measureText(promo).width + 120;
    ctx.fillStyle = th.main; ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 40, -fs * 0.75); ctx.lineTo(w / 2 + 40, -fs * 0.75); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 + 40, fs * 0.75); ctx.lineTo(-w / 2 - 40, fs * 0.75); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent'; text(ctx, promo, 0, fs * 0.36, fs, DISPLAY, '#fff', { weight: 400 }); ctx.restore();
  }
  nameLines(ctx, d, CX, VH * 0.175, th.deep, outCubic(seg(t, 1.8, 2.4)), { size: 64 });
  priceBlock(ctx, d, CX, VH * 0.665, th.main, rgba(th.deep, 0.5), outBack(seg(t, 2.8, 3.4)));
  pill(ctx, d.cta || 'Mua ngay', CX, VH * 0.725, 44, '#ffd400', th.deep, { alpha: seg(t, 3.8, 4.2), scale: 1 + 0.06 * Math.max(0, Math.sin(t * 7)) });
}

const RENDER: Record<VideoTpl, typeof launch> = { launch, flash, luxury, reasons, kinetic, cards, countdown, unbox, showcase, neon: neonNight, editorial, party };

/** Vẽ 1 khung hình tại thời điểm t (giây). ctx có thể đã scale (xem trước nhỏ). */
export function renderVideoFrame(canvas: HTMLCanvasElement, tpl: VideoTpl, d: VideoData, th: VideoTheme, c: VideoCache, t: number, watermark = true) {
  const ctx = canvas.getContext('2d')!; const S = canvas.width / VW;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.drawImage(c.bg, 0, 0, VW, VH);
  RENDER[tpl](ctx, d, th, c, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (watermark) drawWatermark(canvas);
}

/** Xuất MP4 (H.264, 1080×1920, 30fps) — dựng từng khung, nhanh hơn thời gian thực, không cần server. */
export async function exportVideoMp4(tpl: VideoTpl, d: VideoData, th: VideoTheme, onProgress?: (p: number) => void): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ xuất video (dùng Chrome / Edge bản mới).');
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const base = { width: VW, height: VH, bitrate: 10_000_000, framerate: FPS };
  let codec = '';
  for (const cdc of ['avc1.640033', 'avc1.640032', 'avc1.4d0033', 'avc1.42e033']) { if ((await VideoEncoder.isConfigSupported({ ...base, codec: cdc })).supported) { codec = cdc; break; } }
  if (!codec) throw new Error('Máy chưa hỗ trợ mã hoá H.264.');
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: VW, height: VH }, fastStart: 'in-memory' });
  let err: unknown = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
  enc.configure({ ...base, codec });
  const canvas = document.createElement('canvas'); canvas.width = VW; canvas.height = VH;
  const cache = makeVideoCache(tpl, d, th);
  const n = Math.round(tplDur(tpl) * FPS);
  for (let i = 0; i < n; i++) {
    if (err) throw err;
    renderVideoFrame(canvas, tpl, d, th, cache, i / FPS);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
    while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4));
    if (i % 6 === 0) { onProgress?.(i / n); await new Promise((r) => setTimeout(r, 0)); }
  }
  await enc.flush(); enc.close(); muxer.finalize();
  if (err) throw err;
  onProgress?.(1);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
