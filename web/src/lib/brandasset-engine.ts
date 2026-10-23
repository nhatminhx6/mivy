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
  { id: 'bold', label: 'Aa Chữ khổng lồ' },
  { id: 'pastel', label: '◍ Pastel dịu' },
  { id: 'band', label: '▬ Băng ngang' },
  { id: 'neon', label: '✧ Neon tối' },
  { id: 'corner', label: '◣ Khối góc' },
  { id: 'wave', label: '〰 Sóng lượn' },
];

export const AVATAR_TEMPLATES: { id: string; label: string }[] = [
  { id: 'ring', label: '◎ Vòng accent' },
  { id: 'solid', label: '● Tròn đặc' },
  { id: 'squircle', label: '▢ Vuông bo' },
  { id: 'outline', label: '○ Viền mảnh' },
  { id: 'stamp', label: '✺ Huy hiệu chữ' },
  { id: 'diagonal', label: '◩ Chéo 2 màu' },
  { id: 'monogram', label: 'Aa Monogram' },
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
  coverTemplate?: string; // mẫu bìa: xem COVER_TEMPLATES
  avatarTemplate?: string; // kiểu avatar: xem AVATAR_TEMPLATES
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

// ===================== Mẫu bìa bổ sung =====================
// Pill chữ (đặc hoặc viền). Trả về chiều rộng.
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fs: number, bg: string, fg: string, font: string, outline = false): number {
  ctx.save(); ctx.font = `800 ${fs}px ${font}`;
  const w = ctx.measureText(text).width + fs * 2.2, h = fs * 2.1;
  rr(ctx, x, y, w, h, h / 2);
  if (outline) { ctx.lineWidth = Math.max(2, fs * 0.12); ctx.strokeStyle = bg; ctx.stroke(); } else { ctx.fillStyle = bg; ctx.fill(); }
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore(); return w;
}
const pillW = (ctx: CanvasRenderingContext2D, text: string, fs: number, font: string) => { ctx.save(); ctx.font = `800 ${fs}px ${font}`; const w = ctx.measureText(text).width + fs * 2.2; ctx.restore(); return w; };
// trần cỡ chữ theo bề rộng khổ (bìa YouTube lớn hơn nhiều so với FB)
const capOf = (W: number) => (v: number) => v * Math.max(0.75, W / 1640);

// ---- Chữ khổng lồ: tên thương hiệu cực lớn, chữ vọng viền phía sau ----
function coverBold(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const cap = capOf(W);
  const T = toneTheme(P, A); paintTone(ctx, W, H, T);
  const short = H < W * 0.32; const pad = short ? H * 0.14 : H * 0.12;
  const name = (o.brandName || 'BRAND').toUpperCase();
  ctx.save(); const ef = fitText(ctx, name, W * 1.15, H * 1.1, '900', HEAD);
  ctx.font = `900 ${ef}px ${HEAD}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(2, ef * 0.012); ctx.strokeStyle = T.dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
  ctx.strokeText(name, W + ef * 0.05, H + ef * 0.18); ctx.restore();
  let y = short ? H * 0.16 : pad * 1.2; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (o.slogan) { const sf = Math.min(H * (short ? 0.11 : 0.06), cap(34)); ctx.fillStyle = A; ctx.font = `700 ${sf}px ${BODY}`; ctx.fillText(o.slogan.toUpperCase(), pad, y); y += sf * 1.6; }
  const nf = fitText(ctx, name, W * (short ? 0.5 : 0.7), short ? H * 0.42 : H * 0.3, '900', HEAD);
  ctx.fillStyle = T.text; ctx.font = `900 ${nf}px ${HEAD}`; ctx.fillText(name, pad, y); y += nf * 1.02;
  ctx.fillStyle = A; rr(ctx, pad, y + H * 0.01, Math.min(nf * 2.4, W * 0.16), Math.max(6, H * 0.018), H * 0.01); ctx.fill();
  const fs = Math.min(H * (short ? 0.1 : 0.05), cap(32)); const cta = (o.cta || 'MUA NGAY').toUpperCase();
  if (short) {
    const cw = pillW(ctx, cta, fs, HEAD); const py = (H - fs * 2.1) / 2;
    pill(ctx, cta, W - pad - cw, py, fs, A, T.onAccent, HEAD);
    if (o.badge) { const b = o.badge.toUpperCase(); pill(ctx, b, W - pad - cw - fs - pillW(ctx, b, fs, HEAD), py, fs, T.text, T.text, HEAD, true); }
  } else {
    let bx = pad; const by = y + H * 0.08;
    if (o.badge) bx += pill(ctx, o.badge.toUpperCase(), bx, by, fs, A, T.onAccent, HEAD) + fs * 0.8;
    pill(ctx, cta, bx, by, fs, T.text, T.text, HEAD, true);
    if (o.logoImg) drawLogoOrInitial(ctx, o, W - pad - H * 0.22, pad, H * 0.22, T.text, HEAD);
  }
}

// ---- Pastel dịu: nền pastel + blob mềm + thẻ trắng bo góc, logo tròn bên phải ----
function coverPastel(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const cap = capOf(W);
  const short = H < W * 0.32; const pad = short ? H * 0.12 : H * 0.1;
  ctx.fillStyle = mixHex(A, '#ffffff', 0.86); ctx.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, c: string, a: number) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  blob(W * 0.9, H * 0.15, H * 0.55, A, 0.28); blob(W * 0.72, H * 1.05, H * 0.5, mixHex(A, P, 0.5), 0.2); blob(W * 0.05, H * 0.95, H * 0.35, A, 0.18);
  dotPattern(ctx, W, H, P, 0.04);
  const ink = mixHex(P, '#000000', 0.2);
  const cw = short ? W * 0.6 : W * 0.56, ch = H - pad * 2;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = H * 0.08; ctx.shadowOffsetY = H * 0.02;
  rr(ctx, pad, pad, cw, ch, Math.min(ch * 0.18, cap(48))); ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill(); ctx.restore();
  const ip = short ? ch * 0.16 : ch * 0.12; let y = pad + ip; const x = pad + ip * 1.2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const eb = Math.min(H * (short ? 0.1 : 0.055), cap(30)); ctx.fillStyle = A === '#ffffff' ? ink : shift(A, -18); ctx.font = `800 ${eb}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), x, y); y += eb * 1.4;
  const hero = (o.badge || o.brandName || 'XIN CHÀO').toUpperCase(); const hf = fitText(ctx, hero, cw - ip * 2.4, short ? ch * 0.36 : ch * 0.26, '900', HEAD);
  ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hero, x, y); y += hf * 1.08;
  if (o.slogan && !short) { const sf = fitText(ctx, o.slogan, cw - ip * 2.4, ch * 0.08, '500', BODY); ctx.fillStyle = '#6b7280'; ctx.font = `500 ${sf}px ${BODY}`; ctx.fillText(o.slogan, x, y); y += sf * 1.6; }
  if (!short) { const fs = Math.min(H * 0.045, cap(28)); pill(ctx, (o.cta || 'MUA NGAY').toUpperCase(), x, y + ch * 0.03, fs, A, lum(A) > 0.6 ? '#141414' : '#ffffff', HEAD); }
  const R = Math.min(H * 0.3, (W - cw - pad * 3) / 2.2);
  if (R > 20) {
    const cx = pad + cw + (W - cw - pad) / 2, cy = H / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = R * 0.3; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, cx, cy, R * 0.9, A); else drawLogoOrInitial(ctx, o, cx - R * 0.55, cy - R * 0.55, R * 1.1, shift(A, -18), HEAD);
  }
}

// ---- Băng ngang: dải accent nghiêng giữa bìa, tên trái + offer/CTA phải ----
function coverBand(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff'; const cap = capOf(W);
  const short = H < W * 0.32; const pad = short ? H * 0.12 : H * 0.1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mixHex(P, '#ffffff', 0.94)); g.addColorStop(1, mixHex(P, '#ffffff', 0.84)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const by0 = short ? H * 0.12 : H * 0.3, bh = short ? H * 0.76 : H * 0.42;
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, by0 + bh * 0.08); ctx.lineTo(W, by0 - bh * 0.06); ctx.lineTo(W, by0 + bh * 0.94); ctx.lineTo(0, by0 + bh * 1.06); ctx.closePath();
  ctx.fillStyle = A; ctx.fill(); ctx.clip(); diagStripes(ctx, W, H, '#ffffff', 0.06, H * 0.06); ctx.restore();
  const mid = by0 + bh / 2;
  let x = pad; const ls = bh * 0.56;
  if (o.logoImg) { drawLogoOrInitial(ctx, o, x, mid - ls / 2, ls, onA, HEAD); x += ls + pad * 0.6; }
  const name = (o.brandName || 'BRAND').toUpperCase();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const nf = fitText(ctx, name, W * 0.34, bh * 0.36, '900', HEAD);
  ctx.fillStyle = onA; ctx.font = `900 ${nf}px ${HEAD}`; ctx.fillText(name, x, o.slogan && !short ? mid - nf * 0.32 : mid);
  if (o.slogan && !short) { ctx.font = `600 ${nf * 0.36}px ${BODY}`; ctx.fillStyle = onA === '#ffffff' ? 'rgba(255,255,255,0.85)' : '#333333'; ctx.fillText(o.slogan, x, mid + nf * 0.5); }
  const fs = Math.min(bh * 0.16, cap(30)); const cta = (o.cta || 'MUA NGAY').toUpperCase(); const ctaX = W - pad - pillW(ctx, cta, fs, HEAD);
  pill(ctx, cta, ctaX, mid - fs * 1.05, fs, onA, onA === '#ffffff' ? shift(A, -14) : '#ffffff', HEAD);
  if (o.badge) {
    const hero = o.badge.toUpperCase(); const hf = fitText(ctx, hero, W * 0.24, bh * 0.5, '900', HEAD);
    ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillStyle = onA; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(hero, ctaX - pad * 0.6, mid + 2);
  }
  if (!short) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tag = ((o.usps && o.usps[0]) || 'CHÍNH HÃNG').toUpperCase();
    ctx.fillStyle = shift(A, -10); ctx.font = `800 ${Math.min(H * 0.05, cap(30))}px ${HEAD}`; ctx.save(); ctx.letterSpacing = '6px'; ctx.fillText(`★  ${tag}  ★`, W / 2, by0 / 2); ctx.restore();
    if (o.contact) { ctx.fillStyle = mixHex(P, '#000000', 0.1); ctx.font = `600 ${Math.min(H * 0.045, cap(28))}px ${BODY}`; ctx.fillText(o.contact, W / 2, by0 + bh + (H - by0 - bh) / 2); }
  }
}

// ---- Neon tối: nền gần đen + lưới mờ, tên phát sáng màu accent ----
function coverNeon(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const cap = capOf(W);
  const short = H < W * 0.32; const pad = short ? H * 0.14 : H * 0.12;
  const neon = lum(A) < 0.3 ? mixHex(A, '#ffffff', 0.5) : A; const onNeon = lum(neon) > 0.6 ? '#0b0b0b' : '#ffffff';
  ctx.fillStyle = mixHex(P, '#05060a', 0.82); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = hexA(neon, 0.08); ctx.lineWidth = 1; const gs = H * (short ? 0.2 : 0.1);
  for (let gx = 0; gx < W; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += gs) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.restore();
  glowAt(ctx, W, H, W * 0.75, H * 0.5, Math.max(W, H) * 0.5, hexA(neon, 0.18));
  let y = short ? H * 0.18 : pad * 1.1; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const eb = Math.min(H * (short ? 0.1 : 0.055), cap(32)); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `700 ${eb}px ${BODY}`;
  ctx.save(); ctx.letterSpacing = '4px'; ctx.fillText((o.slogan || 'OPEN NOW').toUpperCase(), pad, y); ctx.restore(); y += eb * 1.6;
  const name = (o.brandName || 'BRAND').toUpperCase(); const nf = fitText(ctx, name, W * (short ? 0.55 : 0.6), short ? H * 0.4 : H * 0.28, '900', HEAD);
  ctx.save(); ctx.font = `900 ${nf}px ${HEAD}`; ctx.fillStyle = neon; ctx.shadowColor = neon; ctx.shadowBlur = nf * 0.5; ctx.fillText(name, pad, y); ctx.shadowBlur = nf * 0.15; ctx.fillText(name, pad, y); ctx.restore();
  y += nf * 1.15;
  const fs = Math.min(H * (short ? 0.09 : 0.05), cap(30)); const cta = (o.cta || 'MUA NGAY').toUpperCase();
  if (!short) {
    let bx = pad; if (o.badge) bx += pill(ctx, o.badge.toUpperCase(), bx, y, fs, neon, neon, HEAD, true) + fs;
    pill(ctx, cta, bx, y, fs, neon, onNeon, HEAD);
    const R = Math.min(H * 0.3, W * 0.14), cx = W - pad - R * 1.1, cy = H / 2;
    ctx.save(); ctx.strokeStyle = neon; ctx.lineWidth = Math.max(3, R * 0.04); ctx.shadowColor = neon; ctx.shadowBlur = R * 0.25; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, cx, cy, R * 0.86, 'rgba(0,0,0,0)'); else drawLogoOrInitial(ctx, o, cx - R * 0.55, cy - R * 0.55, R * 1.1, '#ffffff', HEAD);
  } else {
    pill(ctx, cta, W - pad - pillW(ctx, cta, fs, HEAD), (H - fs * 2.1) / 2, fs, neon, onNeon, HEAD);
  }
}

// ---- Khối góc: nền trắng, khối tròn accent lớn ở góc phải-dưới chứa logo ----
function coverCorner(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff'; const cap = capOf(W);
  const short = H < W * 0.32; const pad = short ? H * 0.14 : H * 0.12;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W, H, 0, 0, Math.max(W, H) * 0.6, hexA(A, 0.08));
  const R = short ? H * 1.25 : H * 0.95; const ox = W + R * 0.05, oy = H + R * 0.08;
  ctx.save(); ctx.fillStyle = mixHex(A, '#ffffff', 0.8); ctx.beginPath(); ctx.arc(ox, oy, R * 1.18, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(W - R, H - R, W, H); g.addColorStop(0, shift(A, 10)); g.addColorStop(1, shift(A, -18)); ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const ls = short ? H * 0.42 : H * 0.28; const lx = W - pad - ls, ly = H - pad - ls;
  if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, lx + ls / 2, ly + ls / 2, ls * 0.62, '#ffffff'); else drawLogoOrInitial(ctx, o, lx, ly, ls, onA, HEAD);
  const ink = mixHex(P, '#000000', 0.15);
  let y = short ? H * 0.16 : pad; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const eb = Math.min(H * (short ? 0.1 : 0.055), cap(32)); ctx.fillStyle = shift(A, -12); ctx.font = `800 ${eb}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), pad, y); y += eb * 1.4;
  const hero = (o.badge || o.slogan || o.brandName || 'XIN CHÀO').toUpperCase(); const hf = fitText(ctx, hero, W * (short ? 0.5 : 0.55), short ? H * 0.4 : H * 0.28, '900', HEAD);
  ctx.fillStyle = ink; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hero, pad, y); y += hf * 1.08;
  if (o.slogan && o.badge && !short) { const sf = fitText(ctx, o.slogan, W * 0.5, H * 0.07, '500', BODY); ctx.fillStyle = '#6b7280'; ctx.font = `500 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.7; }
  if (!short) {
    pill(ctx, (o.cta || 'MUA NGAY').toUpperCase(), pad, y + H * 0.02, Math.min(H * 0.048, cap(30)), ink, '#ffffff', HEAD);
    const usps = (o.usps || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
    if (usps.length) { let ux = pad; const chH = H * 0.085; const uy = H - pad - chH; for (const u of usps) { const w = uspChip(ctx, u, ux, uy, chH, A, false, BODY); ux += w + H * 0.03; if (ux > W * 0.55) break; } }
  }
}

// ---- Sóng lượn: nền tông thương hiệu + 2 lớp sóng accent ở đáy ----
function coverWave(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string, BODY: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const cap = capOf(W);
  const T = toneTheme(P, A); paintTone(ctx, W, H, T);
  const short = H < W * 0.32; const pad = short ? H * 0.14 : H * 0.12;
  const wave = (yBase: number, amp: number, len: number, color: string, alpha: number) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let wx = 0; wx <= W + 8; wx += 8) ctx.lineTo(wx, yBase + Math.sin((wx / len) * Math.PI * 2) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  wave(H * (short ? 0.78 : 0.74), H * 0.06, W * 0.45, T.accentLight, 0.35);
  wave(H * (short ? 0.86 : 0.82), H * 0.05, W * 0.6, A, 0.95);
  let y = short ? H * 0.14 : pad; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const eb = Math.min(H * (short ? 0.1 : 0.055), cap(32)); ctx.fillStyle = T.accentLight; ctx.font = `800 ${eb}px ${HEAD}`; ctx.fillText((o.brandName || '').toUpperCase(), pad, y); y += eb * 1.4;
  const hero = (o.badge || o.slogan || o.brandName || 'XIN CHÀO').toUpperCase(); const hf = fitText(ctx, hero, W * (short ? 0.55 : 0.6), short ? H * 0.34 : H * 0.26, '900', HEAD);
  ctx.fillStyle = T.text; ctx.font = `900 ${hf}px ${HEAD}`; ctx.fillText(hero, pad, y); y += hf * 1.08;
  if (o.slogan && o.badge && !short) { const sf = fitText(ctx, o.slogan, W * 0.55, H * 0.07, '500', BODY); ctx.fillStyle = T.textSec; ctx.font = `500 ${sf}px ${BODY}`; ctx.fillText(o.slogan, pad, y); y += sf * 1.6; }
  const fs = Math.min(H * (short ? 0.085 : 0.048), cap(30)); const cta = (o.cta || 'MUA NGAY').toUpperCase();
  if (!short) {
    pill(ctx, cta, pad, y + H * 0.02, fs, A, T.onAccent, HEAD);
    const R = Math.min(H * 0.22, W * 0.1), cx = W - pad - R, cy = pad + R;
    ctx.save(); ctx.fillStyle = T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (o.bgImg) maskedPhotoCircle(ctx, o.bgImg, cx, cy, R * 0.9, A); else drawLogoOrInitial(ctx, o, cx - R * 0.6, cy - R * 0.6, R * 1.2, T.text, HEAD);
  } else {
    pill(ctx, cta, W - pad - pillW(ctx, cta, fs, HEAD), H * 0.18, fs, A, T.onAccent, HEAD);
  }
}

// ===================== Kiểu avatar bổ sung =====================
// Chữ chạy theo cung tròn phía trên (canvas không có textPath)
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, font: string, color: string, spacing: number) {
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = Array.from(text); const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) / r; let ang = -Math.PI / 2 - total / 2;
  chars.forEach((c, i) => { const w = widths[i] / r; ang += w / 2; ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.rotate(ang + Math.PI / 2); ctx.fillText(c, 0, 0); ctx.restore(); ang += w / 2; });
  ctx.restore();
}

function drawAvatarStyle(ctx: CanvasRenderingContext2D, o: BrandAssetOpts, W: number, H: number, HEAD: string) {
  const P = o.colorPrimary || '#0f172a', A = o.colorAccent || '#10b981'; const T = toneTheme(P, A);
  const cx = W / 2, cy = H / 2; const tpl = o.avatarTemplate; const onA = lum(A) > 0.6 ? '#141414' : '#ffffff';
  const dy = o.badge && tpl !== 'stamp' ? -W * 0.06 : 0;
  const logo = (size: number, ink: string) => {
    if (o.style === 'photo' && o.bgImg && !o.logoImg) { maskedPhotoCircle(ctx, o.bgImg, cx, cy + dy, size / 2, 'rgba(0,0,0,0)'); return; }
    drawLogoOrInitial(ctx, o, cx - size / 2, cy - size / 2 + dy, size, ink, HEAD);
  };
  if (tpl === 'solid') {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shift(A, 12)); g.addColorStop(1, shift(A, -20)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    glowAt(ctx, W, H, W * 0.8, H * 0.15, W * 0.7, 'rgba(255,255,255,0.22)');
    logo(W * 0.52, onA);
  } else if (tpl === 'squircle') {
    paintTone(ctx, W, H, T);
    const s = W * 0.7;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = W * 0.05; ctx.shadowOffsetY = W * 0.015;
    const g = ctx.createLinearGradient(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2); g.addColorStop(0, shift(A, 14)); g.addColorStop(1, shift(A, -16));
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.26); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    logo(s * 0.62, onA);
  } else if (tpl === 'outline') {
    ctx.fillStyle = mixHex(A, '#ffffff', 0.9); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = A; ctx.lineWidth = W * 0.012; ctx.beginPath(); ctx.arc(cx, cy, W * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = W * 0.004; ctx.beginPath(); ctx.arc(cx, cy, W * 0.385, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    logo(W * 0.46, mixHex(P, '#000000', 0.1));
  } else if (tpl === 'stamp') {
    paintTone(ctx, W, H, T, true);
    const R = W * 0.44;
    ctx.save(); ctx.fillStyle = A; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = onA; ctx.globalAlpha = 0.5; ctx.lineWidth = W * 0.004; ctx.setLineDash([W * 0.012, W * 0.01]); ctx.beginPath(); ctx.arc(cx, cy, R * 0.94, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const inner = R * 0.6;
    ctx.save(); ctx.fillStyle = T.grad[1]; ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const name = (o.brandName || 'BRAND').toUpperCase(); const n = Math.max(4, Array.from(name).length);
    const fs = Math.min(W * 0.075, (Math.PI * R * 0.79 * 0.82) / (n * 0.95));
    arcText(ctx, name, cx, cy, R * 0.79, `800 ${fs}px ${HEAD}`, onA, fs * 0.22);
    sparkle(ctx, cx - R * 0.79, cy + fs * 0.1, fs * 0.32, onA); sparkle(ctx, cx + R * 0.79, cy + fs * 0.1, fs * 0.32, onA);
    if (o.badge) { ctx.save(); ctx.font = `800 ${fs * 0.8}px ${HEAD}`; ctx.fillStyle = onA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.badge.toUpperCase(), cx, cy + R * 0.79); ctx.restore(); }
    logo(inner * 1.2, T.dark ? '#ffffff' : T.text);
  } else if (tpl === 'diagonal') {
    ctx.fillStyle = T.grad[1]; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, H, W, 0); g.addColorStop(0, shift(A, -10)); g.addColorStop(1, shift(A, 14)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(cx, cy + dy, W * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    logo(W * 0.48, '#ffffff');
  } else if (tpl === 'monogram') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    glowAt(ctx, W, H, W * 0.85, H * 0.1, W * 0.7, hexA(A, 0.12));
    if (o.logoImg) logo(W * 0.55, P);
    else {
      const ini = (o.brandName || 'M').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = mixHex(P, '#000000', 0.1);
      ctx.font = `700 ${W * (ini.length > 1 ? 0.42 : 0.56)}px ${SERIF}`; ctx.fillText(ini, cx, cy - W * 0.02 + dy);
      ctx.fillStyle = A; ctx.beginPath(); ctx.arc(cx + W * (ini.length > 1 ? 0.27 : 0.2), cy + W * 0.15 + dy, W * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = hexA(P, 0.15); ctx.lineWidth = W * 0.004; ctx.beginPath(); ctx.arc(cx, cy, W * 0.44, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (o.badge && tpl !== 'stamp') {
    const light = tpl === 'solid' || tpl === 'diagonal';
    ctx.save(); ctx.font = `800 ${W * 0.05}px ${HEAD}`; const bw = ctx.measureText(o.badge.toUpperCase()).width + W * 0.07;
    const bx = cx - bw / 2, by = H * 0.76;
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = W * 0.016; ctx.shadowOffsetY = W * 0.005;
    rr(ctx, bx, by, bw, W * 0.09, W * 0.045); ctx.fillStyle = light ? '#ffffff' : A; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = light ? shift(A, -14) : onA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.badge.toUpperCase(), cx, by + W * 0.045 + 1); ctx.restore();
  }
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
    if (o.avatarTemplate && o.avatarTemplate !== 'ring') { drawAvatarStyle(ctx, o, W, H, HEAD); return; }
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
  if (tpl === 'bold') { coverBold(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'pastel') { coverPastel(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'band') { coverBand(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'neon') { coverNeon(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'corner') { coverCorner(ctx, o, W, H, HEAD, BODY); return; }
  if (tpl === 'wave') { coverWave(ctx, o, W, H, HEAD, BODY); return; }

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
