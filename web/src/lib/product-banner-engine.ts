// Banner sản phẩm đa sàn: ghép ảnh sản phẩm (đã tách nền) + nền + giá + sale tag, render code.
import { fontFamilyById } from './brand-presets';

export interface BannerSize { id: string; label: string; w: number; h: number; }
export const BANNER_SIZES: BannerSize[] = [
  { id: 'square', label: 'Vuông · Shopee/Lazada/TikTok', w: 1080, h: 1080 },
  { id: 'post', label: 'Dọc · FB/Instagram', w: 1080, h: 1350 },
  { id: 'vertical', label: 'Story/Reels · TikTok', w: 1080, h: 1920 },
  { id: 'wide', label: 'Ngang · Web/FB ad', w: 1200, h: 628 },
];

export interface ProductBannerOpts {
  size: string;
  productImg?: HTMLImageElement | null; // ảnh đã tách nền
  bgStyle?: 'studio' | 'gradient' | 'solid';
  headline?: string;
  price?: string;
  oldPrice?: string;
  saleTag?: string; // vd -30%
  brandName?: string;
  cta?: string;
  colorPrimary: string;
  colorAccent: string;
  fontHeadingId?: string;
  fontBodyId?: string;
}

function lum(hex: string): number {
  const c = (hex || '').replace('#', ''); if (c.length < 6) return 0.5;
  return (0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16)) / 255;
}
function shift(hex: string, amt: number): string {
  const c = (hex || '#000000').replace('#', ''); if (c.length < 6) return hex;
  const f = (i: number) => Math.max(0, Math.min(255, parseInt(c.slice(i, i + 2), 16) + Math.round(amt * 2.55))).toString(16).padStart(2, '0');
  return `#${f(0)}${f(2)}${f(4)}`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fit(ctx: CanvasRenderingContext2D, t: string, maxW: number, start: number, weight: string, font: string): number {
  let fs = start; ctx.font = `${weight} ${fs}px ${font}`;
  while (ctx.measureText(t).width > maxW && fs > 12) { fs -= 2; ctx.font = `${weight} ${fs}px ${font}`; }
  return fs;
}

function drawProduct(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const sc = Math.min(w / iw, h / ih); const dw = iw * sc, dh = ih * sc;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  // bóng đổ mềm dưới sản phẩm
  ctx.save(); ctx.filter = 'blur(22px)'; ctx.fillStyle = 'rgba(15,23,42,0.25)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, dy + dh - dh * 0.02, dw * 0.4, dh * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Badge sale tròn (vd -30%)
function saleBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, text: string, font: string) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = r * 0.2; ctx.shadowOffsetY = r * 0.06;
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = Math.max(2, r * 0.05); ctx.setLineDash([r * 0.16, r * 0.12]);
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.52}px ${font}`; ctx.fillText(text, cx, cy); ctx.restore();
}

export function drawProductBanner(canvas: HTMLCanvasElement, o: ProductBannerOpts) {
  const sz = BANNER_SIZES.find((s) => s.id === o.size) || BANNER_SIZES[0];
  const W = sz.w, H = sz.h; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const A = o.colorAccent || '#10b981';
  const P = o.colorPrimary || '#0f172a';
  const bgStyle = o.bgStyle || 'studio';
  const wide = W > H * 1.3;

  // ===== Nền =====
  if (bgStyle === 'solid') { ctx.fillStyle = P; ctx.fillRect(0, 0, W, H); }
  else if (bgStyle === 'gradient') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 18)); g.addColorStop(1, shift(A, -26)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  else { // studio sáng
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.5, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e7ebf0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const dark = bgStyle !== 'studio';
  const ink = dark ? '#ffffff' : '#17202e';
  const sub = dark ? 'rgba(255,255,255,0.8)' : '#5b6472';

  const m = W * 0.06;
  const hasProd = !!o.productImg;

  if (wide) {
    // ẢNH PHẢI · CHỮ TRÁI
    if (hasProd) drawProduct(ctx, o.productImg!, W * 0.52, H * 0.08, W * 0.44, H * 0.84);
    let y = H * 0.16;
    ctx.textAlign = 'left'; ctx.fillStyle = A; ctx.textBaseline = 'top';
    ctx.font = `800 ${H * 0.06}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), m, y); y += H * 0.09;
    const hl = (o.headline || 'SẢN PHẨM MỚI').toUpperCase(); const hf = fit(ctx, hl, W * 0.44, H * 0.14, '900', HEAD);
    ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hl, m, y); y += hf * 1.2;
    drawPriceBlock(ctx, o, m, y, A, ink, sub, HEAD, BODY, H * 0.11, false);
    y += H * 0.2;
    drawCta(ctx, o, m, H - H * 0.2, A, HEAD, H * 0.06, false);
    if (o.saleTag) saleBadge(ctx, W * 0.56, H * 0.2, H * 0.11, o.saleTag, HEAD);
  } else {
    // ẢNH TRÊN · CHỮ DƯỚI
    const prodH = H * 0.5;
    if (hasProd) drawProduct(ctx, o.productImg!, m, H * 0.06, W - m * 2, prodH);
    // dải chữ dưới
    let y = H * 0.6;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = A; ctx.font = `800 ${W * 0.042}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), W / 2, y); y += W * 0.062;
    const hl = (o.headline || 'SẢN PHẨM MỚI').toUpperCase(); const hf = fit(ctx, hl, W * 0.88, W * 0.09, '900', HEAD);
    ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hl, W / 2, y); y += hf * 1.2;
    drawPriceBlock(ctx, o, W / 2, y, A, ink, sub, HEAD, BODY, W * 0.085, true);
    // CTA dưới cùng
    drawCta(ctx, o, W / 2, H - H * (sz.id === 'vertical' ? 0.14 : 0.13), A, HEAD, W * 0.05, true);
    if (o.saleTag) saleBadge(ctx, W - m - W * 0.12, H * 0.06 + W * 0.12, W * 0.12, o.saleTag, HEAD);
  }
}

function drawPriceBlock(ctx: CanvasRenderingContext2D, o: ProductBannerOpts, x: number, y: number, A: string, ink: string, sub: string, HEAD: string, BODY: string, size: number, center: boolean) {
  if (!o.price) return;
  ctx.textAlign = center ? 'center' : 'left'; ctx.textBaseline = 'top';
  ctx.font = `900 ${size}px ${HEAD}`;
  const pw = ctx.measureText(o.price).width;
  const startX = center ? x - (o.oldPrice ? pw / 2 : pw / 2) : x;
  ctx.fillStyle = A; ctx.fillText(o.price, center ? x : x, y);
  if (o.oldPrice) {
    ctx.font = `500 ${size * 0.44}px ${BODY}`; ctx.fillStyle = sub;
    const ox = center ? x + pw / 2 + size * 0.2 : x + pw + size * 0.24;
    const oy = y + size * 0.28;
    ctx.textAlign = 'left';
    ctx.fillText(o.oldPrice, ox, oy);
    const ow = ctx.measureText(o.oldPrice).width;
    ctx.strokeStyle = sub; ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath(); ctx.moveTo(ox, oy + size * 0.22); ctx.lineTo(ox + ow, oy + size * 0.22); ctx.stroke();
  }
}

function drawCta(ctx: CanvasRenderingContext2D, o: ProductBannerOpts, x: number, y: number, A: string, HEAD: string, size: number, center: boolean) {
  const cta = (o.cta || 'MUA NGAY').toUpperCase();
  ctx.font = `800 ${size}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + size * 1.8, chh = size * 2;
  const bx = center ? x - cw / 2 : x;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rr(ctx, bx, y, cw, chh, chh / 2); ctx.fillStyle = A; ctx.fill(); ctx.restore();
  ctx.fillStyle = lum(A) > 0.6 ? '#141414' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${HEAD}`; ctx.fillText(cta, bx + cw / 2, y + chh / 2 + 1);
}
