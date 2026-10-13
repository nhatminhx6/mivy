// Ảnh bìa (FB/Zalo/Shopee/YouTube) + Avatar — render bằng code từ Brand Kit. 0 AI realtime.
import { fontFamilyById } from './brand-presets';

export interface AssetKind { id: string; label: string; w: number; h: number; }

export const COVER_TEMPLATES: { id: string; label: string }[] = [
  { id: 'burst', label: '🔥 Tia sáng' },
  { id: 'split', label: '◧ Chia đôi' },
  { id: 'ribbon', label: '▞ Sọc chéo' },
  { id: 'minimal', label: '▭ Tối giản' },
  { id: 'brand', label: 'Thương hiệu' },
];

export const ASSET_KINDS: AssetKind[] = [
  { id: 'fb', label: 'Bìa Facebook', w: 1640, h: 624 },
  { id: 'zalo', label: 'Bìa Zalo OA', w: 1200, h: 450 },
  { id: 'shopee', label: 'Bìa Shopee', w: 1200, h: 300 },
  { id: 'youtube', label: 'Bìa YouTube', w: 2560, h: 1440 },
  { id: 'avatar', label: 'Avatar', w: 1024, h: 1024 },
];

export interface BrandAssetOpts {
  kind: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  logoImg?: HTMLImageElement | null;
  bgImg?: HTMLImageElement | null; // nền ảnh tuỳ chọn
  brandName?: string;
  slogan?: string;
  contact?: string;
  badge?: string; // badge khuyến mãi góc (tuỳ chọn)
  usps?: string[]; // điểm nổi bật (Freeship, Chính hãng...)
  cta?: string; // nút kêu gọi (vd MUA NGAY)
  coverTemplate?: string; // mẫu bìa: burst | split | ribbon | minimal | brand
  fontHeadingId?: string;
  fontBodyId?: string;
  style?: 'solid' | 'gradient' | 'photo';
}

function lum(hex: string): number {
  const c = (hex || '').replace('#', '');
  if (c.length < 6) return 0.5;
  return (0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16)) / 255;
}
function shift(hex: string, amt: number): string {
  const c = (hex || '#000000').replace('#', ''); if (c.length < 6) return hex;
  const f = (i: number) => Math.max(0, Math.min(255, parseInt(c.slice(i, i + 2), 16) + Math.round(amt * 2.55))).toString(16).padStart(2, '0');
  return `#${f(0)}${f(2)}${f(4)}`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fitText(ctx: CanvasRenderingContext2D, t: string, maxW: number, start: number, weight: string, font: string): number {
  let fs = start; ctx.font = `${weight} ${fs}px ${font}`;
  while (ctx.measureText(t).width > maxW && fs > 10) { fs -= 2; ctx.font = `${weight} ${fs}px ${font}`; }
  return fs;
}

function sunburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, color: string, alpha: number, n = 20) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.translate(cx, cy);
  for (let i = 0; i < n; i++) {
    ctx.rotate((Math.PI * 2) / n);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.06); ctx.lineTo(R, R * 0.06); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0); ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0); ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s); ctx.fill(); ctx.restore();
}
function dotPattern(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  const gap = Math.max(26, Math.round(H * 0.06));
  for (let y = gap; y < H; y += gap) for (let x = gap; x < W; x += gap) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// chip "✓ text"
function uspChip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, accent: string, onDark: boolean, font: string): number {
  const fs = h * 0.42;
  ctx.font = `700 ${fs}px ${font}`;
  const tw = ctx.measureText(text).width;
  const padL = h * 0.95, padR = h * 0.5, w = padL + tw + padR;
  ctx.save();
  ctx.fillStyle = onDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  // check tròn
  const cr = h * 0.3, ccx = x + h * 0.5, ccy = y + h / 2;
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, cr * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(ccx - cr * 0.42, ccy + cr * 0.02); ctx.lineTo(ccx - cr * 0.08, ccy + cr * 0.36); ctx.lineTo(ccx + cr * 0.45, ccy - cr * 0.38); ctx.stroke();
  ctx.fillStyle = onDark ? '#ffffff' : '#1a1f2b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${fs}px ${font}`; ctx.fillText(text, x + padL, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function diagStripes(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number, gap: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = gap * 0.5;
  for (let x = -H; x < W + H; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
  ctx.restore();
}

function drawLogoOrInitial(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, x: number, y: number, size: number, ink: string, font: string) {
  if (o.logoImg) {
    const im = o.logoImg; const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (iw && ih) { const s = Math.min(size / iw, size / ih); ctx.drawImage(im, x + (size - iw * s) / 2, y + (size - ih * s) / 2, iw * s, ih * s); return; }
  }
  const initials = (o.brandName || 'M').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  ctx.save(); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${size * 0.6}px ${font}`; ctx.fillText(initials, x + size / 2, y + size / 2 + 2); ctx.restore();
}

// Badge tròn "% OFF" (nhân vật quen thuộc của banner sale)
function circleBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, o: BrandAssetOpts, bg: string, fg: string, font: string) {
  const raw = (o.badge || '').toString();
  const mNum = raw.match(/\d+\s*%?/);
  const big = mNum ? mNum[0].replace(/\s/g, '') : 'SALE';
  const small = /giảm/i.test(raw) ? 'GIẢM' : (/\d/.test(raw) ? 'OFF' : '');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = r * 0.2; ctx.shadowOffsetY = r * 0.06;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // vòng gạch đứt
  ctx.save(); ctx.strokeStyle = bg; ctx.lineWidth = Math.max(2, r * 0.05); ctx.setLineDash([r * 0.16, r * 0.12]);
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * (big.length > 3 ? 0.42 : 0.6)}px ${font}`; ctx.fillText(big, cx, cy - (small ? r * 0.14 : 0));
  if (small) { ctx.font = `800 ${r * 0.26}px ${font}`; ctx.fillText(small, cx, cy + r * 0.44); }
  ctx.restore();
}

function maskedPhotoCircle(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number, ring: string) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height; const sc = Math.max((2 * r) / sw, (2 * r) / sh);
  ctx.drawImage(img, cx - sw * sc / 2, cy - sh * sc / 2, sw * sc, sh * sc); ctx.restore();
  ctx.save(); ctx.strokeStyle = ring; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ---- Mẫu HIỆN ĐẠI: nền sáng, offer trái, khung tròn (ảnh/logo) + badge % phải ----
function coverSplit(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#10b981'; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff';
  const short = H < W * 0.32; const pad = H * 0.12; const ink = '#17202e';
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffffff'); g.addColorStop(1, shift(A, 44)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  dotPattern(ctx, W, H, A, 0.07);
  // khu tròn bên phải
  const rcx = W * 0.8, rcy = H * 0.5, R = Math.min(H * 0.4, W * 0.2);
  ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = A; ctx.lineWidth = H * 0.016; ctx.beginPath(); ctx.arc(rcx, rcy, R * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, rcx, rcy, R, A);
  else { ctx.save(); const gg = ctx.createLinearGradient(rcx - R, rcy - R, rcx + R, rcy + R); gg.addColorStop(0, shift(A, 12)); gg.addColorStop(1, shift(A, -22)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(rcx, rcy, R, 0, Math.PI * 2); ctx.fill(); drawLogoOrInitial(ctx, o, rcx - R * 0.48, rcy - R * 0.48, R * 0.96, onA, HEAD); ctx.restore(); }
  circleBadge(ctx, rcx - R * 0.98, rcy - R * 0.62, H * 0.15, o, A, onA, HEAD);
  // trái
  let y = short ? H * 0.16 : pad;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = A; ctx.font = `800 ${Math.min(H * 0.07, 38)}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), pad, y); y += Math.min(H * 0.07, 38) * 1.3;
  const hero = (o.badge || 'FLASH SALE').toUpperCase(); const hf = fitText(ctx, hero, W * 0.52, short ? H * 0.42 : H * 0.3, '900', HEAD);
  ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hero, pad, y); y += hf * 1.05;
  if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, W * 0.48, H * 0.08, '600', BODY); ctx.fillStyle = '#5b6472'; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.5; }
  const cta = (o.cta || 'MUA NGAY').toUpperCase(); const cf = Math.min(H * 0.058, 34); ctx.font = `800 ${cf}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + H * 0.1, chh = cf * 2; const cyy = short ? H - pad - chh : y + H * 0.02;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = A; ctx.fill(); ctx.restore();
  ctx.fillStyle = onA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${cf}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);
  if (usps.length && !short) { let cxx = pad; const chipH = H * 0.1; const uy = H - pad - chipH; for (const u of usps) { ctx.font = `700 ${chipH * 0.42}px ${BODY}`; const w = chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5; if (cxx + w > W * 0.58) break; uspChip(ctx, u, cxx, uy, chipH, A, false, BODY); cxx += w + H * 0.03; } }
}

// ---- Mẫu NĂNG ĐỘNG: nền rực, badge % tròn khổng lồ, vòng tròn viền ----
function coverRibbon(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#10b981'; const short = H < W * 0.32; const pad = H * 0.12;
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 18)); g.addColorStop(1, shift(A, -28)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // vòng tròn viền trang trí
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.12; ctx.lineWidth = H * 0.03;
  ctx.beginPath(); ctx.arc(W * 0.12, H * 0.9, H * 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W * 0.95, H * 0.1, H * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  dotPattern(ctx, W, H, '#ffffff', 0.05);
  sparkle(ctx, W * 0.5, H * 0.16, H * 0.045, 'rgba(255,255,255,0.5)');
  // badge % tròn lớn bên phải
  const R = Math.min(H * 0.34, W * 0.17); const bcx = W * 0.8, bcy = H * 0.5;
  circleBadge(ctx, bcx, bcy, R, o, '#ffffff', shift(A, -16), HEAD);
  // trái
  let y = short ? H * 0.2 : H * 0.22;
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  ctx.font = `800 ${Math.min(H * 0.07, 38)}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), pad, y); y += Math.min(H * 0.07, 38) * 1.3;
  ctx.font = `900 ${fitText(ctx, 'FLASH SALE', W * 0.55, H * 0.2, '900', HEAD)}px ${HEAD}`;
  const hf = fitText(ctx, 'FLASH SALE', W * 0.55, H * 0.2, '900', HEAD);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff'; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText('FLASH SALE', pad, y); ctx.restore(); y += hf * 1.1;
  if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, W * 0.5, H * 0.08, '600', BODY); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.6; }
  const cta = (o.cta || 'MUA NGAY').toUpperCase(); const cf = Math.min(H * 0.058, 34); ctx.font = `800 ${cf}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + H * 0.1, chh = cf * 2; const cyy = short ? H - pad - chh : y + H * 0.02;
  rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = shift(A, -14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${cf}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);
}

// ---- Mẫu TỐI GIẢN: khung viền mảnh, offer giữa, sang trọng ----
function coverMinimal(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#10b981'; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff';
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 8)); g.addColorStop(1, shift(A, -16)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = W / 2; const mid = H * 0.52;
  // khung viền mảnh
  ctx.save(); ctx.strokeStyle = onA; ctx.globalAlpha = 0.45; ctx.lineWidth = Math.max(2, H * 0.006);
  const fm = H * 0.1; ctx.strokeRect(fm, fm, W - fm * 2, H - fm * 2); ctx.restore();
  ctx.textAlign = 'center'; ctx.fillStyle = onA; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.min(H * 0.065, 36)}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), cx, H * 0.24);
  const hero = (o.badge || 'GIẢM 50%').toUpperCase(); const hf = fitText(ctx, hero, W * 0.66, H * 0.28, '900', HEAD);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = onA; ctx.lineWidth = Math.max(2, H * 0.005);
  ctx.beginPath(); ctx.moveTo(cx - W * 0.26, mid - hf * 0.72); ctx.lineTo(cx + W * 0.26, mid - hf * 0.72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - W * 0.26, mid + hf * 0.72); ctx.lineTo(cx + W * 0.26, mid + hf * 0.72); ctx.stroke(); ctx.restore();
  ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillStyle = onA; ctx.fillText(hero, cx, mid);
  if (o.slogan) { ctx.font = `500 ${Math.min(H * 0.05, 30)}px ${BODY}`; ctx.fillStyle = onA === '#ffffff' ? 'rgba(255,255,255,0.85)' : '#333'; ctx.fillText(o.slogan, cx, mid + hf * 0.95); }
  const cta = (o.cta || 'MUA NGAY').toUpperCase(); const cf = Math.min(H * 0.048, 28); ctx.font = `800 ${cf}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + H * 0.1, chh = cf * 2; const cyy = H * 0.76;
  rr(ctx, cx - cw / 2, cyy, cw, chh, chh / 2); ctx.fillStyle = onA; ctx.fill(); ctx.fillStyle = onA === '#ffffff' ? shift(A, -12) : '#ffffff'; ctx.textBaseline = 'middle'; ctx.font = `800 ${cf}px ${HEAD}`; ctx.fillText(cta, cx, cyy + chh / 2 + 1);
}

// Logo wordmark: mark tròn (logo/chữ cái) + tên brand + slogan. Nền trong suốt.
export function drawWordmark(canvas: HTMLCanvasElement, o: BrandAssetOpts) {
  const W = 1200, H = 420; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const A = o.colorAccent || '#10b981'; const ink = o.colorPrimary || '#17202e';
  const r = H * 0.34, mx = W * 0.08, cx = mx + r, cy = H / 2;
  // mark
  ctx.save(); const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, shift(A, 12)); g.addColorStop(1, shift(A, -18));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  drawLogoOrInitial(ctx, o, cx - r * 0.55, cy - r * 0.55, r * 1.1, lum(A) > 0.6 ? '#141414' : '#fff', HEAD);
  // tên + slogan
  const tx = cx + r + W * 0.05;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const name = o.brandName || 'Thương hiệu';
  const nf = fitText(ctx, name, W - tx - mx, H * 0.4, '900', HEAD);
  ctx.fillStyle = ink; ctx.font = `900 ${nf}px ${HEAD}`;
  ctx.fillText(name, tx, o.slogan ? cy - nf * 0.3 : cy);
  if (o.slogan) { ctx.fillStyle = A; ctx.font = `600 ${nf * 0.4}px ${BODY}`; ctx.fillText(o.slogan, tx, cy + nf * 0.5); }
}

export function drawBrandAsset(canvas: HTMLCanvasElement, o: BrandAssetOpts) {
  const k = ASSET_KINDS.find((a) => a.id === o.kind) || ASSET_KINDS[0];
  const W = k.w, H = k.h; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const P = o.colorPrimary || '#0f172a';
  const A = o.colorAccent || '#10b981';
  const onP = lum(P) > 0.6 ? '#141414' : '#ffffff';
  const style = o.style || 'gradient';

  // ===== Nền =====
  if (style === 'photo' && o.bgImg) {
    const im = o.bgImg; const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    const sc = Math.max(W / sw, H / sh);
    ctx.drawImage(im, (W - sw * sc) / 2, (H - sh * sc) / 2, sw * sc, sh * sc);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, `${P}e6`); g.addColorStop(0.55, `${P}99`); g.addColorStop(1, '#00000033');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (style === 'solid') {
    ctx.fillStyle = P; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, shift(P, 10)); g.addColorStop(1, shift(P, -22));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ===== AVATAR =====
  if (o.kind === 'avatar') {
    const cx = W / 2, cy = H / 2, r = W * 0.46;
    // nền tròn
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(P, 12)); g.addColorStop(1, shift(P, -20));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    // vòng accent
    ctx.save(); ctx.lineWidth = W * 0.03; ctx.strokeStyle = A; ctx.beginPath(); ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    drawLogoOrInitial(ctx, o, cx - r * 0.5, cy - r * 0.55, r, onP, HEAD);
    if (o.brandName && !o.logoImg) {
      // nếu có initial thì thêm tên nhỏ dưới
    }
    if (o.badge) {
      ctx.save(); ctx.font = `800 ${W * 0.05}px ${HEAD}`; const bw = ctx.measureText(o.badge.toUpperCase()).width + W * 0.06;
      const bx = cx - bw / 2, by = cy + r * 0.52;
      rr(ctx, bx, by, bw, W * 0.09, W * 0.045); ctx.fillStyle = A; ctx.fill();
      ctx.fillStyle = lum(A) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.badge.toUpperCase(), cx, by + W * 0.045); ctx.restore();
    }
    return;
  }

  // ===== COVER (ngang) =====
  const onDark = lum(P) <= 0.6;
  const short = H < W * 0.32; // bìa thấp (vd Shopee 1200×300)
  const pad = short ? H * 0.14 : H * 0.12;
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const tpl = o.coverTemplate || 'burst';

  if (tpl === 'split') { coverSplit(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'ribbon') { coverRibbon(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'minimal') { coverMinimal(ctx, o, W, H, HEAD, BODY); return; }

  // ===== MẪU TIA SÁNG (offer-led, nền rực) =====
  if (tpl !== 'brand') {
    if (!(style === 'photo' && o.bgImg)) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, shift(A, 20)); g.addColorStop(1, shift(A, -30));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const onA = '#ffffff';
    const chkC = shift(A, -26);
    sunburst(ctx, W * 0.33, H * 0.44, Math.max(W, H) * 0.95, '#ffffff', 0.06, 24);
    dotPattern(ctx, W, H, '#ffffff', 0.05);
    sparkle(ctx, W * 0.6, H * 0.18, H * 0.05, 'rgba(255,255,255,0.55)');
    sparkle(ctx, W * 0.9, H * 0.74, H * 0.04, 'rgba(255,255,255,0.45)');
    sparkle(ctx, W * 0.5, H * 0.82, H * 0.03, 'rgba(255,255,255,0.4)');

    // eyebrow: logo + brand
    let yy: number;
    if (o.logoImg && !short) { drawLogoOrInitial(ctx, o, pad, pad, H * 0.2, onA, HEAD); yy = pad + H * 0.24; }
    else yy = short ? H * 0.14 : pad;
    ctx.fillStyle = onA; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const eb = Math.min(H * 0.075, 40); ctx.font = `800 ${eb}px ${HEAD}`;
    ctx.fillText((o.brandName || '').toUpperCase(), pad, yy); yy += eb * 1.25;

    // HERO = offer
    const hero = (o.badge || 'GIẢM 50%').toUpperCase();
    const heroFs = fitText(ctx, hero, short ? W * 0.52 : W * 0.6, short ? H * 0.44 : H * 0.34, '900', HEAD);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.fillStyle = onA; ctx.font = `900 ${heroFs}px ${HEAD}`; ctx.textBaseline = 'top';
    ctx.fillText(hero, pad, yy); ctx.restore(); yy += heroFs * 1.04;

    if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, W * 0.55, H * 0.08, '600', BODY); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, yy + H * 0.01); yy += sf * 1.7; }

    // CTA pill
    const cta = (o.cta || 'MUA NGAY').toUpperCase();
    const ctaFs = Math.min(H * 0.065, 40); ctx.font = `800 ${ctaFs}px ${HEAD}`;
    const cw = ctx.measureText(cta).width + H * 0.12, chh = ctaFs * 2;
    const cyy = short ? H - pad - chh : Math.min(yy + H * 0.02, H - pad - chh);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
    ctx.fillStyle = shift(A, -14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${ctaFs}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);

    // USP chips bên phải
    if (usps.length) {
      const chipH = short ? H * 0.2 : H * 0.1;
      let uy = short ? (H - (usps.length * (chipH + H * 0.05) - H * 0.05)) / 2 : pad;
      for (const u of usps) {
        ctx.font = `700 ${chipH * 0.42}px ${BODY}`;
        const w = chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5;
        uspChip(ctx, u, W - pad - w, uy, chipH, chkC, true, BODY); uy += chipH + H * (short ? 0.05 : 0.03);
      }
    }
    return;
  }

  // ===== MẪU THƯƠNG HIỆU =====
  // pattern chấm tinh tế
  dotPattern(ctx, W, H, onDark ? '#ffffff' : '#000000', 0.05);

  // khối accent chéo bên phải (panel)
  ctx.save();
  ctx.fillStyle = A; ctx.globalAlpha = style === 'photo' ? 0.0 : 0.16;
  ctx.beginPath();
  ctx.moveTo(W * 0.70, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.58, H); ctx.closePath(); ctx.fill();
  ctx.restore();
  // vòng tròn accent trang trí trong panel
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = A;
  ctx.beginPath(); ctx.arc(W * 0.9, H * 0.28, H * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  // logo
  const logoSize = short ? H * 0.42 : H * 0.24;
  let ty = pad;
  if (o.logoImg && !short) { drawLogoOrInitial(ctx, o, pad, pad, logoSize, onP, HEAD); ty = pad + logoSize + H * 0.05; }
  else { ty = short ? H * 0.26 : H * 0.26; }

  const textX = pad;
  // tên brand
  const name = o.brandName || 'Thương hiệu';
  const nameMaxW = short ? W * 0.5 : W * 0.56;
  const nameFs = fitText(ctx, name, nameMaxW, short ? H * 0.34 : H * 0.2, '900', HEAD);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 8;
  ctx.fillStyle = onP; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `900 ${nameFs}px ${HEAD}`; ctx.fillText(name, textX, ty); ctx.restore();
  ty += nameFs * 1.08;
  // gạch accent
  ctx.fillStyle = A; rr(ctx, textX, ty + H * 0.015, Math.min(nameFs * 3, W * 0.14), Math.max(6, H * 0.018), H * 0.01); ctx.fill();
  ty += H * (short ? 0.1 : 0.07);
  if (o.slogan) {
    const sf = fitText(ctx, o.slogan, nameMaxW, short ? H * 0.1 : H * 0.085, '500', BODY);
    ctx.fillStyle = onDark ? 'rgba(255,255,255,0.88)' : '#333';
    ctx.font = `500 ${sf}px ${BODY}`; ctx.textBaseline = 'top'; ctx.fillText(o.slogan, textX, ty); ty += sf * 1.5;
  }
  if (o.contact && !short) {
    const cf = Math.min(H * 0.07, 42);
    ctx.fillStyle = onDark ? 'rgba(255,255,255,0.8)' : '#444';
    ctx.font = `600 ${cf}px ${BODY}`; ctx.textBaseline = 'top'; ctx.fillText(o.contact, textX, ty);
  }

  // USP chips
  if (usps.length) {
    const chipH = short ? H * 0.26 : H * 0.12;
    if (short) {
      // bìa thấp: xếp dọc bên phải
      let cyy = (H - (usps.length * (chipH + H * 0.06) - H * 0.06)) / 2;
      for (const u of usps) {
        const cw = (() => { ctx.font = `700 ${chipH * 0.42}px ${BODY}`; return chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5; })();
        uspChip(ctx, u, W - pad - cw, cyy, chipH, A, onDark, BODY); cyy += chipH + H * 0.06;
      }
    } else {
      // bìa cao: xếp ngang dưới
      let cxx = textX; const cyy = H - pad - chipH;
      for (const u of usps) { const w = uspChip(ctx, u, cxx, cyy, chipH, A, onDark, BODY); cxx += w + H * 0.04; if (cxx > W * 0.92) break; }
    }
  }

  // badge khuyến mãi góc phải trên
  if (o.badge) {
    ctx.save(); const bf = short ? H * 0.16 : H * 0.11; ctx.font = `900 ${bf}px ${HEAD}`;
    const bw = ctx.measureText(o.badge.toUpperCase()).width + H * 0.14;
    const bh = bf * 1.7, bx = W - bw - pad, by = pad * 0.8;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = A; ctx.fill(); ctx.restore();
    ctx.fillStyle = lum(A) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.badge.toUpperCase(), bx + bw / 2, by + bh / 2 + 2); ctx.restore();
  }
}
