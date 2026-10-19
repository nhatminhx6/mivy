// Banner sản phẩm đa sàn: ghép ảnh sản phẩm (đã tách nền) + nền + giá + sale tag, render code.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';

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
  scale?: number; // supersampling: 1 = preview, 2-3 = xuất nét căng
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

// Vignette mềm quanh mép cho chiều sâu (ảnh pro thường có)
function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength: number) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Spotlight studio: quầng sáng sau sản phẩm
function spotlight(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, hexA(color, alpha)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}

function hexA(hex: string, a: number): string {
  const c = (hex || '#000000').replace('#', ''); if (c.length < 6) return `rgba(255,255,255,${a})`;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

// Mesh gradient: nhiều quầng màu cùng tông hoà vào nhau → nền sang, hết "phẳng 2 màu"
function meshBg(ctx: CanvasRenderingContext2D, W: number, H: number, A: string) {
  ctx.fillStyle = shift(A, -22); ctx.fillRect(0, 0, W, H);
  const blobs = [
    { x: 0.16, y: 0.18, r: 0.95, c: shift(A, 34), a: 0.95 },
    { x: 0.86, y: 0.12, r: 0.8, c: shift(A, 6), a: 0.85 },
    { x: 0.78, y: 0.92, r: 1.05, c: shift(A, -34), a: 0.9 },
    { x: 0.08, y: 0.96, r: 0.85, c: shift(A, 16), a: 0.7 },
    { x: 0.5, y: 0.45, r: 0.6, c: shift(A, 22), a: 0.45 },
  ];
  const M = Math.max(W, H);
  for (const b of blobs) {
    const g = ctx.createRadialGradient(W * b.x, H * b.y, 0, W * b.x, H * b.y, M * b.r);
    g.addColorStop(0, hexA(b.c, b.a)); g.addColorStop(1, hexA(b.c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// Phản chiếu sàn: bản lật mờ dần dưới sản phẩm (studio)
function reflection(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  ctx.save();
  ctx.translate(dx, dy + dh * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.22;
  ctx.drawImage(img, 0, 0, dw, dh);
  ctx.restore();
  // fade dần bằng gradient che
  ctx.save();
  const g = ctx.createLinearGradient(0, dy + dh, 0, dy + dh * 1.7);
  g.addColorStop(0, 'rgba(238,241,245,0)'); g.addColorStop(1, 'rgba(238,241,245,1)');
  ctx.fillStyle = g; ctx.fillRect(dx - 4, dy + dh, dw + 8, dh * 0.75);
  ctx.restore();
}

// Hạt nhiễu rất mảnh — khử dải màu (banding) trên gradient, cho cảm giác film/pro
function grain(ctx: CanvasRenderingContext2D, W: number, H: number, amt: number) {
  const n = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * amt})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
function fit(ctx: CanvasRenderingContext2D, t: string, maxW: number, start: number, weight: string, font: string): number {
  let fs = start; ctx.font = `${weight} ${fs}px ${font}`;
  while (ctx.measureText(t).width > maxW && fs > 12) { fs -= 2; ctx.font = `${weight} ${fs}px ${font}`; }
  return fs;
}

function drawProduct(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, reflect = false) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const sc = Math.min(w / iw, h / ih); const dw = iw * sc, dh = ih * sc;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  if (reflect) reflection(ctx, img, dx, dy, dw, dh);
  // bóng đổ tiếp đất: 2 lớp (gần đậm + xa mềm) cho cảm giác thật
  ctx.save();
  ctx.filter = 'blur(32px)'; ctx.fillStyle = 'rgba(15,23,42,0.18)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, dy + dh - dh * 0.01, dw * 0.46, dh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.filter = 'blur(12px)'; ctx.fillStyle = 'rgba(15,23,42,0.22)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, dy + dh - dh * 0.005, dw * 0.3, dh * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Badge sale tròn cao cấp (vd -30%): gradient đỏ, highlight, viền chấm mảnh, nghiêng nhẹ
function saleBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, text: string, font: string) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.12);
  // viền chấm ngoài
  ctx.save(); ctx.strokeStyle = 'rgba(239,68,68,0.9)'; ctx.lineWidth = Math.max(2, r * 0.045); ctx.setLineDash([r * 0.14, r * 0.13]);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  // thân badge + bóng
  ctx.save(); ctx.shadowColor = 'rgba(190,18,18,0.45)'; ctx.shadowBlur = r * 0.35; ctx.shadowOffsetY = r * 0.1;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, '#ff6b6b'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#c81e1e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // highlight bóng kính trên
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const hg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, -r * 0.3, -r * 0.4, r * 0.8);
  hg.addColorStop(0, 'rgba(255,255,255,0.35)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // chữ
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.54}px ${font}`;
  ctx.shadowColor = 'rgba(120,0,0,0.3)'; ctx.shadowBlur = r * 0.06; ctx.shadowOffsetY = r * 0.03;
  ctx.fillText(text, 0, r * 0.02);
  ctx.restore();
}

export function drawProductBanner(canvas: HTMLCanvasElement, o: ProductBannerOpts) {
  const sz = BANNER_SIZES.find((s) => s.id === o.size) || BANNER_SIZES[0];
  const W = sz.w, H = sz.h;
  const S = Math.max(1, Math.min(4, o.scale || 1)); // supersampling
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.scale(S, S); // vẽ theo toạ độ logic W×H, xuất ở độ phân giải cao
  ctx.imageSmoothingQuality = 'high';
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const A = o.colorAccent || '#10b981';
  const P = o.colorPrimary || '#0f172a';
  const bgStyle = o.bgStyle || 'studio';
  const wide = W > H * 1.3;

  // ===== Nền =====
  // tâm quầng sáng / sản phẩm tuỳ bố cục (ngang: phải; dọc: trên)
  const wideTmp = W > H * 1.3;
  const spotX = wideTmp ? W * 0.72 : W * 0.5;
  const spotY = wideTmp ? H * 0.5 : H * 0.32;
  if (bgStyle === 'solid') {
    ctx.fillStyle = P; ctx.fillRect(0, 0, W, H);
    // sàn gradient nhẹ + spotlight tông sáng để sản phẩm nổi
    const fl = ctx.createLinearGradient(0, H * 0.5, 0, H); fl.addColorStop(0, hexA('#000000', 0)); fl.addColorStop(1, hexA('#000000', lum(P) > 0.5 ? 0.06 : 0.22));
    ctx.fillStyle = fl; ctx.fillRect(0, 0, W, H);
    spotlight(ctx, spotX, spotY, Math.max(W, H) * 0.55, lum(P) > 0.5 ? '#ffffff' : A, lum(P) > 0.5 ? 0.5 : 0.16);
  } else if (bgStyle === 'gradient') {
    meshBg(ctx, W, H, A);
    spotlight(ctx, spotX, spotY, Math.max(W, H) * 0.62, '#ffffff', 0.16);
  } else { // studio sáng: tường + sàn + spotlight
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fbfcfd'); g.addColorStop(0.62, '#eef1f5'); g.addColorStop(1, '#dfe4ea');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    spotlight(ctx, spotX, spotY, Math.max(W, H) * 0.52, '#ffffff', 0.9);
    // ambient nhẹ theo màu nhấn cho đỡ vô hồn
    spotlight(ctx, spotX, spotY, Math.max(W, H) * 0.7, A, 0.05);
  }
  const dark = bgStyle !== 'studio';
  const ink = dark ? '#ffffff' : '#17202e';
  const sub = dark ? 'rgba(255,255,255,0.8)' : '#5b6472';

  const m = W * 0.06;
  const hasProd = !!o.productImg;

  if (wide) {
    // ẢNH PHẢI · CHỮ TRÁI
    if (hasProd) drawProduct(ctx, o.productImg!, W * 0.52, H * 0.08, W * 0.44, H * 0.84, !dark);
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
    if (hasProd) drawProduct(ctx, o.productImg!, m, H * 0.06, W - m * 2, prodH, !dark);
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

  // ===== Hoàn thiện: chiều sâu + khử banding =====
  vignette(ctx, W, H, dark ? 0.22 : 0.08);
  grain(ctx, W, H, dark ? 0.03 : 0.015);
  drawWatermark(canvas); // gói Free
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
  const arrow = size * 1.1; // chỗ cho mũi tên
  const cw = ctx.measureText(cta).width + size * 2.0 + arrow, chh = size * 2;
  const bx = center ? x - cw / 2 : x;
  const ink = lum(A) > 0.6 ? '#141414' : '#ffffff';
  // thân nút: gradient + bóng màu nhấn
  ctx.save(); ctx.shadowColor = hexA(A, 0.45); ctx.shadowBlur = size * 0.5; ctx.shadowOffsetY = size * 0.18;
  const g = ctx.createLinearGradient(bx, y, bx, y + chh); g.addColorStop(0, shift(A, 14)); g.addColorStop(1, shift(A, -10));
  rr(ctx, bx, y, cw, chh, chh / 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  // viền sáng mảnh phía trên (cảm giác nổi khối)
  ctx.save(); rr(ctx, bx, y + 1, cw, chh - 2, chh / 2); ctx.strokeStyle = hexA('#ffffff', 0.22); ctx.lineWidth = Math.max(1, size * 0.03); ctx.stroke(); ctx.restore();
  // chữ
  const tx = bx + (cw - arrow) / 2;
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${HEAD}`; ctx.fillText(cta, tx, y + chh / 2 + 1);
  // mũi tên →
  const ax = bx + cw - size * 1.1, ay = y + chh / 2;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = Math.max(2, size * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(ax - size * 0.28, ay); ctx.lineTo(ax + size * 0.18, ay); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax + size * 0.02, ay - size * 0.2); ctx.lineTo(ax + size * 0.22, ay); ctx.lineTo(ax + size * 0.02, ay + size * 0.2); ctx.stroke();
}
