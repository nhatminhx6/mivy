// Ảnh bìa (FB/Zalo/Shopee/YouTube) + Avatar — render bằng code từ Brand Kit. 0 AI realtime.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';

const SERIF = '"Playfair Display", Georgia, serif';

export interface AssetKind { id: string; label: string; w: number; h: number; }

export const COVER_TEMPLATES: { id: string; label: string }[] = [
  { id: 'elegant', label: '✦ Fine-dining' },
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
  scale?: number; // supersampling khi xuất file
}

// ===== Tông "concept sạch" (đồng bộ poster): nền gradient đặc theo tông + glow góc + chữ rõ =====
interface Tone {
  grad: [string, string, string]; glow: string; accent: string; accentLight: string; onAccent: string;
  text: string; textSec: string; textMuted: string; dark: boolean;
}
function mixHex(a: string, b: string, t: number): string {
  const pa = (a || '#000000').replace('#', ''), pb = (b || '#000000').replace('#', '');
  if (pa.length < 6 || pb.length < 6) return a;
  const f = (i: number) => Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - t) + parseInt(pb.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0');
  return `#${f(0)}${f(2)}${f(4)}`;
}
// base = màu nền gốc; accent = màu điểm nhấn. mode 'dark' ép nền tối (dùng khi base là màu rực như tia sáng).
function toneTheme(base: string, accent: string, mode: 'auto' | 'dark' = 'auto'): Tone {
  const L = lum(base);
  const light = mode === 'auto' && L > 0.6;
  let grad: [string, string, string];
  if (light) {
    grad = [mixHex(base, '#ffffff', 0.55), mixHex(base, '#ffffff', 0.2), mixHex(base, '#000000', 0.07)];
  } else {
    const deep = Math.min(0.72, Math.max(0, (L - 0.15) * 1.5));
    const b0 = mixHex(base, '#000000', deep);
    grad = [mixHex(b0, '#000000', 0.2), b0, mixHex(b0, '#000000', 0.48)];
  }
  return {
    grad, glow: hexA(accent, light ? 0.24 : 0.3), accent, accentLight: mixHex(accent, '#ffffff', 0.45),
    onAccent: lum(accent) > 0.6 ? '#141414' : '#ffffff',
    text: light ? '#17202e' : '#ffffff',
    textSec: light ? '#4b5563' : 'rgba(255,255,255,0.82)',
    textMuted: light ? '#6b7280' : 'rgba(255,255,255,0.62)',
    dark: !light,
  };
}
// Nền gradient đặc + quầng sáng góc phải-trên (và quầng nhẹ góc trái-dưới). solid = nền phẳng 1 màu.
function paintTone(ctx: CanvasRenderingContext2D, W: number, H: number, T: Tone, solid = false) {
  if (solid) { ctx.fillStyle = T.grad[1]; ctx.fillRect(0, 0, W, H); }
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, T.grad[0]); g.addColorStop(0.55, T.grad[1]); g.addColorStop(1, T.grad[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  glowAt(ctx, W, H, W * 0.92, 0, Math.max(H * 1.7, W * 0.45), T.glow);
  glowAt(ctx, W, H, W * 0.02, H, Math.max(H * 1.1, W * 0.28), T.glow.replace(/[\d.]+\)$/, '0.12)'));
}
function glowAt(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// Ảnh đặt gọn trong khung bo góc (cover-fit) + viền accent — không tràn nền
function photoPanel(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number, ring: string) {
  const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height; if (!sw || !sh) return;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = h * 0.06; ctx.shadowOffsetY = h * 0.02;
  rr(ctx, x, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  const sc = Math.max(w / sw, h / sh); ctx.drawImage(img, x + (w - sw * sc) / 2, y + (h - sh * sc) / 2, sw * sc, sh * sc); ctx.restore();
  ctx.save(); ctx.strokeStyle = ring; ctx.lineWidth = Math.max(3, h * 0.012); rr(ctx, x, y, w, h, r); ctx.stroke(); ctx.restore();
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
function uspChip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, accent: string, onDark: boolean, font: string, solidBg?: string): number {
  const fs = h * 0.42;
  ctx.font = `700 ${fs}px ${font}`;
  const tw = ctx.measureText(text).width;
  const padL = h * 0.95, padR = h * 0.5, w = padL + tw + padR;
  ctx.save();
  ctx.fillStyle = solidBg || (onDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)');
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  if (!solidBg) { ctx.strokeStyle = onDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1.5; ctx.stroke(); }
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

// ===== Helpers tinh thần Fine-dining (giấy ấm + grain + vignette + hoạ tiết) =====
function hexA(hex: string, a: number): string {
  const c = (hex || '#000000').replace('#', ''); if (c.length < 6) return `rgba(0,0,0,${a})`;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}
function grain(ctx: CanvasRenderingContext2D, W: number, H: number, amt: number, dark: boolean) {
  const n = Math.floor((W * H) / 1100);
  for (let i = 0; i < n; i++) { const x = Math.random() * W, y = Math.random() * H; const a = Math.random() * amt; ctx.fillStyle = dark ? `rgba(255,255,255,${a})` : `rgba(80,60,40,${a})`; ctx.fillRect(x, y, 1, 1); }
}
// ⎯⎯ ◆ ⎯⎯
function ornamentLine(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number, color: string) {
  ctx.save(); const gap = half * 0.14, d = Math.max(4, half * 0.035);
  const grad = (x0: number, x1: number) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, hexA(color, 0)); g.addColorStop(1, hexA(color, 0.85)); return g; };
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = grad(cx - half, cx - gap); ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx - gap, y); ctx.stroke();
  ctx.strokeStyle = grad(cx + half, cx + gap); ctx.beginPath(); ctx.moveTo(cx + half, y); ctx.lineTo(cx + gap, y); ctx.stroke();
  ctx.fillStyle = color; ctx.translate(cx, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-d, -d, d * 2, d * 2); ctx.restore();
}
// khung đôi + 4 góc nhấn
function doubleFrame(ctx: CanvasRenderingContext2D, W: number, H: number, fm: number, color: string) {
  ctx.save();
  ctx.strokeStyle = hexA(color, 0.9); ctx.lineWidth = 2.5; ctx.strokeRect(fm, fm, W - fm * 2, H - fm * 2);
  ctx.strokeStyle = hexA(color, 0.42); ctx.lineWidth = 1; ctx.strokeRect(fm + 8, fm + 8, W - fm * 2 - 16, H - fm * 2 - 16);
  const t = Math.min(W, H) * 0.045; ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  const corner = (x: number, y: number, sx: number, sy: number) => { ctx.beginPath(); ctx.moveTo(x, y + sy * t); ctx.lineTo(x, y); ctx.lineTo(x + sx * t, y); ctx.stroke(); };
  corner(fm, fm, 1, 1); corner(W - fm, fm, -1, 1); corner(fm, H - fm, 1, -1); corner(W - fm, H - fm, -1, -1);
  ctx.restore();
}

// ---- Mẫu FINE-DINING: giấy ấm, tên serif, hoạ tiết tinh tế, khung góc nhấn ----
function coverElegant(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#b4703a';
  const ink = '#2b2219', sub = '#7a6b57';
  const short = H < W * 0.32;
  const hasPhoto = o.style === 'photo' && !!o.bgImg;

  // nền: giấy kem đặc ngả theo tông thương hiệu + quầng sáng góc (KHÔNG phủ ảnh)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mixHex('#f8f2e6', A, 0.05)); g.addColorStop(1, mixHex('#eee3cf', A, 0.1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W, H, W * 0.92, 0, Math.max(H * 1.5, W * 0.4), hexA(A, 0.16));
  grain(ctx, W, H, 0.03, false);

  const fm = Math.min(W, H) * (short ? 0.09 : 0.1);
  doubleFrame(ctx, W, H, fm, A);

  const cx = W / 2;
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);

  if (short) {
    // Bìa thấp: logo trái + tên/slogan, usp phải — gọn
    let x = fm + W * 0.03;
    if (o.logoImg) { drawLogoOrInitial(ctx, o, x, H / 2 - H * 0.22, H * 0.44, ink, HEAD); x += H * 0.54; }
    else if (hasPhoto) { maskedPhotoCircle(ctx, o.bgImg!, x + H * 0.22, H / 2, H * 0.22, A); x += H * 0.54; }
    ctx.textAlign = 'left';
    ctx.fillStyle = A; ctx.textBaseline = 'alphabetic'; ctx.font = `600 ${H * 0.1}px ${HEAD}`;
    ctx.save(); ctx.letterSpacing = '4px'; ctx.fillText((o.brandName || '').toUpperCase(), x, H * 0.44); ctx.restore();
    if (o.slogan) { ctx.fillStyle = sub; ctx.font = `400 ${H * 0.085}px ${BODY}`; ctx.fillText(o.slogan, x, H * 0.66); }
    if (o.contact) { ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.font = `600 ${H * 0.085}px ${BODY}`; ctx.fillText(o.contact, W - fm - W * 0.03, H * 0.58); }
    return;
  }

  // Bìa cao: căn giữa, trang trọng
  let y = H * (o.logoImg || hasPhoto ? 0.2 : 0.26);
  if (!o.logoImg && hasPhoto) { maskedPhotoCircle(ctx, o.bgImg!, cx, H * 0.27, H * 0.11, A); y = H * 0.44; }
  if (o.logoImg) { drawLogoOrInitial(ctx, o, cx - H * 0.11, H * 0.16, H * 0.22, ink, HEAD); y = H * 0.44; }

  // eyebrow (nếu có slogan thì brand làm eyebrow nhỏ, slogan là tagline; nếu không thì brand là hero)
  ctx.textAlign = 'center';
  // tên brand serif lớn
  ctx.fillStyle = ink; ctx.textBaseline = 'middle';
  const nameFs = fitText(ctx, o.brandName || 'Thương hiệu', W * 0.72, H * 0.2, '700', SERIF);
  ctx.font = `700 ${nameFs}px ${SERIF}`; ctx.fillText(o.brandName || 'Thương hiệu', cx, y);
  y += nameFs * 0.72;

  ornamentLine(ctx, cx, y, W * 0.14, A); y += H * 0.07;

  if (o.slogan) {
    const sf = fitText(ctx, o.slogan, W * 0.62, H * 0.07, '400', BODY);
    ctx.fillStyle = sub; ctx.font = `400 ${sf}px ${BODY}`; ctx.textBaseline = 'middle'; ctx.fillText(o.slogan, cx, y); y += sf * 1.4;
  }

  // dòng USP ngăn bằng chấm (· ) — kiểu menu, hết chip rối
  if (usps.length) {
    const txt = usps.join('   ·   ');
    const uf = fitText(ctx, txt, W * 0.7, H * 0.045, '600', BODY);
    ctx.fillStyle = A; ctx.font = `600 ${uf}px ${BODY}`; ctx.textBaseline = 'middle';
    ctx.save(); ctx.letterSpacing = '1px'; ctx.fillText(txt, cx, Math.min(y + H * 0.02, H - fm - H * 0.14)); ctx.restore();
  }

  // contact dưới khung
  if (o.contact) { ctx.fillStyle = ink; ctx.font = `600 ${Math.min(H * 0.045, 30)}px ${BODY}`; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.contact, cx, H - fm - H * 0.06); }

  // badge nhỏ góc (tuỳ chọn) — tag viền, không loè loẹt
  if (o.badge) {
    ctx.save(); const bf = H * 0.05; ctx.font = `700 ${bf}px ${HEAD}`;
    const label = o.badge.toUpperCase(); const bw = ctx.measureText(label).width + H * 0.08, bh = bf * 1.9;
    const bx = W - fm - bw - W * 0.015, by = fm + H * 0.03;
    rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = hexA(A, 0.14); ctx.fill();
    ctx.strokeStyle = A; ctx.lineWidth = 1.5; rr(ctx, bx, by, bw, bh, bh / 2); ctx.stroke();
    ctx.fillStyle = A; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1); ctx.restore();
  }

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
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffffff'); g.addColorStop(1, mixHex(A, '#ffffff', 0.78)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W, H, W * 0.92, 0, Math.max(H * 1.7, W * 0.45), hexA(A, 0.2));
  dotPattern(ctx, W, H, A, 0.04);
  // khu tròn bên phải
  const rcx = W * 0.8, rcy = H * 0.5, R = Math.min(H * 0.4, W * 0.2);
  ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = A; ctx.lineWidth = H * 0.016; ctx.beginPath(); ctx.arc(rcx, rcy, R * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, rcx, rcy, R, A);
  else { ctx.save(); const gg = ctx.createLinearGradient(rcx - R, rcy - R, rcx + R, rcy + R); gg.addColorStop(0, shift(A, 12)); gg.addColorStop(1, shift(A, -22)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(rcx, rcy, R, 0, Math.PI * 2); ctx.fill(); drawLogoOrInitial(ctx, o, rcx - R * 0.48, rcy - R * 0.48, R * 0.96, onA, HEAD); ctx.restore(); }
  circleBadge(ctx, rcx - R * 0.98, rcy - R * 0.62, H * 0.15, o, A, onA, HEAD);
  // trái
  let y = short ? H * 0.16 : pad;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = shift(A, -12); ctx.font = `800 ${Math.min(H * 0.07, 38)}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), pad, y); y += Math.min(H * 0.07, 38) * 1.3;
  const hero = (o.badge || 'FLASH SALE').toUpperCase(); const hf = fitText(ctx, hero, W * 0.52, short ? H * 0.42 : H * 0.3, '900', HEAD);
  ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hero, pad, y); y += hf * 1.05;
  ctx.fillStyle = A; rr(ctx, pad, y, Math.min(hf * 2.2, W * 0.14), Math.max(6, H * 0.016), H * 0.008); ctx.fill(); y += H * 0.04;
  if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, W * 0.48, H * 0.08, '600', BODY); ctx.fillStyle = '#4b5563'; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.5; }
  const cta = (o.cta || 'MUA NGAY').toUpperCase(); const cf = Math.min(H * 0.058, 34); ctx.font = `800 ${cf}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + H * 0.1, chh = cf * 2; const cyy = short ? H - pad - chh : y + H * 0.02;
  ctx.save(); ctx.shadowColor = hexA(A, 0.35); ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = A; ctx.fill(); ctx.restore();
  ctx.fillStyle = onA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${cf}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);
  if (usps.length && !short) { let cxx = pad; const chipH = H * 0.1; const uy = H - pad - chipH; for (const u of usps) { ctx.font = `700 ${chipH * 0.42}px ${BODY}`; const w = chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5; if (cxx + w > W * 0.58) break; uspChip(ctx, u, cxx, uy, chipH, A, false, BODY); cxx += w + H * 0.03; } }
}

// ---- Mẫu NĂNG ĐỘNG: nền rực, badge % tròn khổng lồ, vòng tròn viền ----
function coverRibbon(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#10b981'; const short = H < W * 0.32; const pad = H * 0.12;
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 10)); g.addColorStop(1, shift(A, -34)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W, H, W * 0.92, 0, Math.max(H * 1.7, W * 0.45), 'rgba(255,255,255,0.2)');
  // vòng tròn viền trang trí
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.12; ctx.lineWidth = H * 0.03;
  ctx.beginPath(); ctx.arc(W * 0.12, H * 0.9, H * 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W * 0.95, H * 0.1, H * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
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
  ctx.fillStyle = '#fff'; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText('FLASH SALE', pad, y); y += hf * 1.1;
  if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, W * 0.5, H * 0.08, '600', BODY); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.6; }
  const cta = (o.cta || 'MUA NGAY').toUpperCase(); const cf = Math.min(H * 0.058, 34); ctx.font = `800 ${cf}px ${HEAD}`;
  const cw = ctx.measureText(cta).width + H * 0.1, chh = cf * 2; const cyy = short ? H - pad - chh : y + H * 0.02;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); ctx.fillStyle = shift(A, -14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${cf}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);
}

// ---- Mẫu TỐI GIẢN: khung viền mảnh, offer giữa, sang trọng ----
function coverMinimal(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const A = o.colorAccent || '#10b981'; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff';
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 8)); g.addColorStop(1, shift(A, -20)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W, H, W * 0.92, 0, Math.max(H * 1.7, W * 0.45), onA === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.3)');
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
  const W = 1200, H = 420;
  const S = Math.max(1, Math.min(4, o.scale || 1));
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.scale(S, S); ctx.imageSmoothingQuality = 'high';
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
  drawBrandAssetCore(canvas, o);
  drawWatermark(canvas); // gói Free — luôn chạy dù Core return sớm
}

function drawBrandAssetCore(canvas: HTMLCanvasElement, o: BrandAssetOpts) {
  const k = ASSET_KINDS.find((a) => a.id === o.kind) || ASSET_KINDS[0];
  const W = k.w, H = k.h;
  const S = Math.max(1, Math.min(4, o.scale || 1));
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.scale(S, S); ctx.imageSmoothingQuality = 'high';
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const P = o.colorPrimary || '#0f172a';
  const A = o.colorAccent || '#10b981';
  const style = o.style || 'gradient';
  const hasPhoto = style === 'photo' && !!o.bgImg;
  const tpl = o.coverTemplate || 'burst';

  // Nền tông thương hiệu (concept sạch): gradient đặc + glow góc. Các mẫu elegant/split/ribbon/minimal tự vẽ nền riêng.
  const T = toneTheme(P, A);
  if (o.kind === 'avatar' || tpl === 'brand') paintTone(ctx, W, H, T, style === 'solid');

  // ===== AVATAR =====
  if (o.kind === 'avatar') {
    const cx = W / 2, cy = H / 2, r = W * 0.46;
    // đĩa tròn trung tâm: tông sáng hơn nền một nấc
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const dg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    dg.addColorStop(0, mixHex(T.grad[1], T.dark ? '#ffffff' : '#000000', 0.12)); dg.addColorStop(1, T.grad[2]);
    ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
    glowAt(ctx, W, H, cx + r * 0.5, cy - r * 0.6, r * 1.2, T.glow);
    ctx.restore();
    // vòng accent (gradient accent -> accentLight)
    const rw = W * 0.026;
    ctx.save(); ctx.lineWidth = rw;
    const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rg.addColorStop(0, T.accentLight); rg.addColorStop(1, A); ctx.strokeStyle = rg;
    ctx.beginPath(); ctx.arc(cx, cy, r - rw / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (hasPhoto && !o.logoImg) {
      maskedPhotoCircle(ctx, o.bgImg!, cx, cy, r - rw * 1.4, 'rgba(0,0,0,0)');
    } else {
      drawLogoOrInitial(ctx, o, cx - r * 0.5, cy - r * (o.badge ? 0.62 : 0.5), r, T.dark ? '#ffffff' : T.text, HEAD);
    }
    if (o.badge) {
      ctx.save(); ctx.font = `800 ${W * 0.05}px ${HEAD}`; const bw = ctx.measureText(o.badge.toUpperCase()).width + W * 0.07;
      const bx = cx - bw / 2, by = cy + r * 0.52;
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = W * 0.016; ctx.shadowOffsetY = W * 0.005;
      rr(ctx, bx, by, bw, W * 0.09, W * 0.045); ctx.fillStyle = A; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = T.onAccent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.badge.toUpperCase(), cx, by + W * 0.045 + 1); ctx.restore();
    }
    return;
  }

  // ===== COVER (ngang) =====
  const short = H < W * 0.32; // bìa thấp (vd Shopee 1200×300)
  const pad = short ? H * 0.14 : H * 0.12;
  const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);

  if (tpl === 'elegant') { coverElegant(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'split') { coverSplit(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'ribbon') { coverRibbon(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'minimal') { coverMinimal(ctx, o, W, H, HEAD, BODY); return; }

  // ===== MẪU TIA SÁNG (offer-led): nền đậm theo tông accent + glow, chữ trắng to, accent điểm nhấn =====
  if (tpl !== 'brand') {
    const B = toneTheme(A, A, 'dark');
    paintTone(ctx, W, H, B, style === 'solid');
    sunburst(ctx, W * 0.33, H * 0.44, Math.max(W, H) * 0.95, B.accent, 0.06, 24);
    sparkle(ctx, W * 0.6, H * 0.18, H * 0.05, hexA(B.accentLight, 0.55));
    sparkle(ctx, W * 0.9, H * 0.74, H * 0.04, hexA(B.accentLight, 0.4));

    // ảnh (nếu có) đặt gọn trong khung bên phải, không tràn nền
    let px = 0;
    if (hasPhoto) {
      px = W * 0.62;
      photoPanel(ctx, o.bgImg!, px, pad, W - pad - px, H - pad * 2, H * 0.05, B.accent);
    }
    const textW = hasPhoto ? W * 0.5 : W * 0.6;

    // eyebrow: logo + brand
    let yy: number;
    if (o.logoImg && !short) { drawLogoOrInitial(ctx, o, pad, pad, H * 0.2, '#ffffff', HEAD); yy = pad + H * 0.24; }
    else yy = short ? H * 0.14 : pad;
    ctx.fillStyle = B.accentLight; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const eb = Math.min(H * 0.075, 40); ctx.font = `800 ${eb}px ${HEAD}`;
    ctx.save(); ctx.letterSpacing = '2px'; ctx.fillText((o.brandName || '').toUpperCase(), pad, yy); ctx.restore(); yy += eb * 1.25;

    // HERO = offer (trắng to rõ, KHÔNG đổ bóng đục)
    const hero = (o.badge || 'GIẢM 50%').toUpperCase();
    const heroFs = fitText(ctx, hero, short ? Math.min(W * 0.52, textW) : textW, short ? H * 0.44 : H * 0.34, '900', HEAD);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 ${heroFs}px ${HEAD}`; ctx.textBaseline = 'top';
    ctx.fillText(hero, pad, yy); yy += heroFs * 1.04;
    if (!short) { ctx.fillStyle = B.accent; rr(ctx, pad, yy, Math.min(heroFs * 2.2, W * 0.14), Math.max(6, H * 0.016), H * 0.008); ctx.fill(); yy += H * 0.035; }

    if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, hasPhoto ? W * 0.48 : W * 0.55, H * 0.08, '600', BODY); ctx.fillStyle = B.textSec; ctx.font = `600 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, yy + H * 0.01); yy += sf * 1.7; }

    // CTA pill: accent đặc
    const cta = (o.cta || 'MUA NGAY').toUpperCase();
    const ctaFs = Math.min(H * 0.065, 40); ctx.font = `800 ${ctaFs}px ${HEAD}`;
    const cw = ctx.measureText(cta).width + H * 0.12, chh = ctaFs * 2;
    const cyy = short ? H - pad - chh : Math.min(yy + H * 0.02, H - pad - chh);
    ctx.save(); ctx.shadowColor = hexA(B.accent, 0.4); ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    rr(ctx, pad, cyy, cw, chh, chh / 2); ctx.fillStyle = B.accent; ctx.fill(); ctx.restore();
    ctx.fillStyle = B.onAccent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${ctaFs}px ${HEAD}`; ctx.fillText(cta, pad + cw / 2, cyy + chh / 2 + 1);

    // USP chips: bên phải (không ảnh) / xếp dưới khung ảnh (có ảnh, bìa cao)
    if (usps.length && !(hasPhoto && short)) {
      const chipH = hasPhoto ? H * 0.085 : (short ? H * 0.2 : H * 0.1);
      if (hasPhoto) {
        let uy = H - pad - H * 0.03 - chipH;
        for (const u of usps.slice().reverse()) {
          uspChip(ctx, u, px + H * 0.03, uy, chipH, B.accent, true, BODY, hexA(B.grad[2], 0.88)); uy -= chipH + H * 0.02;
        }
      } else {
        let uy = short ? (H - (usps.length * (chipH + H * 0.05) - H * 0.05)) / 2 : pad;
        for (const u of usps) {
          ctx.font = `700 ${chipH * 0.42}px ${BODY}`;
          const w = chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5;
          uspChip(ctx, u, W - pad - w, uy, chipH, B.accent, true, BODY); uy += chipH + H * (short ? 0.05 : 0.03);
        }
      }
    }
    return;
  }

  // ===== MẪU THƯƠNG HIỆU: nền tông primary + glow, tên to rõ, accent điểm =====
  // khối accent chéo bên phải (panel) — rất nhẹ
  ctx.save();
  ctx.fillStyle = A; ctx.globalAlpha = hasPhoto ? 0 : 0.1;
  ctx.beginPath();
  ctx.moveTo(W * 0.70, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.58, H); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (!hasPhoto) {
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = A;
    ctx.beginPath(); ctx.arc(W * 0.9, H * 0.28, H * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // badge: tính trước để đặt khung ảnh bên dưới
  const bf = short ? H * 0.16 : H * 0.11;
  let bwid = 0, bhei = 0;
  if (o.badge) { ctx.save(); ctx.font = `900 ${bf}px ${HEAD}`; bwid = ctx.measureText(o.badge.toUpperCase()).width + H * 0.14; bhei = bf * 1.7; ctx.restore(); }
  const panelX = W * 0.64;
  if (hasPhoto) {
    const py = short ? pad : Math.max(pad, pad * 0.8 + bhei + pad * 0.4);
    photoPanel(ctx, o.bgImg!, panelX, py, W - pad - panelX, H - pad - py, H * 0.05, A);
  }

  // logo
  const logoSize = short ? H * 0.42 : H * 0.24;
  let ty = pad;
  if (o.logoImg && !short) { drawLogoOrInitial(ctx, o, pad, pad, logoSize, T.text, HEAD); ty = pad + logoSize + H * 0.05; }
  else { ty = H * 0.26; }

  const textX = pad;
  const name = o.brandName || 'Thương hiệu';
  const nameMaxW = hasPhoto ? W * 0.5 : (short ? W * 0.5 : W * 0.56);
  const nameFs = fitText(ctx, name, nameMaxW, short ? H * 0.34 : H * 0.2, '900', HEAD);
  ctx.fillStyle = T.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `900 ${nameFs}px ${HEAD}`; ctx.fillText(name, textX, ty);
  ty += nameFs * 1.08;
  // gạch accent
  ctx.fillStyle = A; rr(ctx, textX, ty + H * 0.015, Math.min(nameFs * 3, W * 0.14), Math.max(6, H * 0.018), H * 0.01); ctx.fill();
  ty += H * (short ? 0.1 : 0.07);
  if (o.slogan) {
    const sf = fitText(ctx, o.slogan, nameMaxW, short ? H * 0.1 : H * 0.085, '500', BODY);
    ctx.fillStyle = T.textSec;
    ctx.font = `500 ${sf}px ${BODY}`; ctx.textBaseline = 'top'; ctx.fillText(o.slogan, textX, ty); ty += sf * 1.5;
  }
  if (o.contact && !short) {
    const cf = Math.min(H * 0.07, 42);
    ctx.fillStyle = T.textMuted;
    ctx.font = `600 ${cf}px ${BODY}`; ctx.textBaseline = 'top'; ctx.fillText(o.contact, textX, ty);
  }

  // USP chips
  if (usps.length && !(hasPhoto && short)) {
    const chipH = short ? H * 0.26 : H * 0.12;
    if (short) {
      // bìa thấp: xếp dọc bên phải
      let cyy = (H - (usps.length * (chipH + H * 0.06) - H * 0.06)) / 2;
      for (const u of usps) {
        const cw = (() => { ctx.font = `700 ${chipH * 0.42}px ${BODY}`; return chipH * 0.95 + ctx.measureText(u).width + chipH * 0.5; })();
        uspChip(ctx, u, W - pad - cw, cyy, chipH, A, T.dark, BODY); cyy += chipH + H * 0.06;
      }
    } else {
      // bìa cao: xếp ngang dưới (chừa chỗ khung ảnh nếu có)
      let cxx = textX; const cyy = H - pad - chipH; const limit = hasPhoto ? panelX - H * 0.04 : W * 0.92;
      for (const u of usps) { const w = uspChip(ctx, u, cxx, cyy, chipH, A, T.dark, BODY); cxx += w + H * 0.04; if (cxx > limit) break; }
    }
  }

  // badge khuyến mãi góc phải trên (có ảnh: đè nhẹ góc khung ảnh, pill đặc)
  if (o.badge) {
    ctx.save(); ctx.font = `900 ${bf}px ${HEAD}`;
    const bx = hasPhoto && short ? panelX + H * 0.04 : W - bwid - pad, by = hasPhoto && short ? pad + H * 0.04 : pad * 0.8;
    ctx.save(); ctx.shadowColor = hexA(A, 0.4); ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    rr(ctx, bx, by, bwid, bhei, bhei / 2); ctx.fillStyle = A; ctx.fill(); ctx.restore();
    ctx.fillStyle = T.onAccent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.badge.toUpperCase(), bx + bwid / 2, by + bhei / 2 + 2); ctx.restore();
  }
}
