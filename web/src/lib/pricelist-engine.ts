// Bảng giá / Menu — render bằng code. Concept sạch: nền gradient đặc theo tông thương hiệu + glow góc, tiêu đề to, giá accent.
import { fontFamilyById } from './brand-presets';
import { drawWatermark } from './design-engine';
import type { PosterTheme } from '@/types';

const SERIF = '"Playfair Display", Georgia, serif';

export interface PriceItem { name: string; price: string; desc?: string; }

export interface PriceListOpts {
  title: string;
  items: PriceItem[];
  brandName?: string;
  contact?: string;
  colorPrimary: string;
  colorAccent: string;
  logoImg?: HTMLImageElement | null;
  bgImg?: HTMLImageElement | null;
  fontHeadingId?: string;
  fontBodyId?: string;
  style?: 'dark' | 'light' | 'elegant';
  aspect?: '4:5' | '9:16' | '1:1';
  scale?: number; // supersampling khi xuất file
  theme?: PosterTheme; // optional: đồng bộ tông với poster (nếu không có → suy ra từ colorPrimary/colorAccent)
}

function lum(hex: string): number {
  const c = (hex || '').replace('#', ''); if (c.length < 6) return 0.5;
  return (0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16)) / 255;
}
function hexA(hex: string, a: number): string {
  const c = (hex || '#000000').replace('#', ''); if (c.length < 6) return `rgba(0,0,0,${a})`;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}
// trộn 2 màu hex: t=0 → a, t=1 → b
function mix(a: string, b: string, t: number): string {
  const pa = (a || '#000000').replace('#', ''), pb = (b || '#000000').replace('#', '');
  if (pa.length < 6 || pb.length < 6) return a || '#000000';
  const ch = (i: number) => Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - t) + parseInt(pb.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Hoạ tiết: ⎯⎯ ◆ ⎯⎯
function ornament(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number, color: string) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
  const gap = 14, d = 5;
  const grad = (x0: number, x1: number) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, hexA(color, 0)); g.addColorStop(1, hexA(color, 0.85)); return g; };
  ctx.strokeStyle = grad(cx - half, cx - gap); ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx - gap, y); ctx.stroke();
  ctx.strokeStyle = grad(cx + half, cx + gap); ctx.beginPath(); ctx.moveTo(cx + half, y); ctx.lineTo(cx + gap, y); ctx.stroke();
  ctx.save(); ctx.translate(cx, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-d, -d, d * 2, d * 2); ctx.restore();
  ctx.restore();
}

export function drawPriceList(canvas: HTMLCanvasElement, o: PriceListOpts) {
  const W = 1080;
  const H = o.aspect === '1:1' ? 1080 : o.aspect === '9:16' ? 1920 : 1350;
  const S = Math.max(1, Math.min(4, o.scale || 1));
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.scale(S, S); ctx.imageSmoothingQuality = 'high';
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const style = o.style || 'light';
  const th = o.theme;
  const dark = th ? lum(th.bg) < 0.5 : style === 'dark';
  const elegant = style === 'elegant';

  // ===== Palette theo tông thương hiệu =====
  let A = th?.accent || o.colorAccent || '#b4703a';
  // tông nền: ưu tiên màu chính nếu đủ đậm, không thì dùng accent
  let tone = o.colorPrimary || A;
  if (lum(tone) > 0.55) tone = A;
  if (lum(tone) > 0.55) tone = mix(tone, '#000000', 0.45);

  let grad: [string, string, string];
  let glow: string;
  let ink: string, sub: string, line: string, priceColor: string;
  if (dark) {
    grad = th?.bgGrad ? [th.bgGrad[0], th.bgGrad[1], th.bgGrad[2]] : [mix(tone, '#000000', 0.86), mix(tone, '#000000', 0.7), mix(tone, '#000000', 0.9)];
    glow = th?.glow || hexA(lum(A) < 0.3 ? mix(A, '#ffffff', 0.35) : A, 0.24);
    if (lum(A) < 0.42) A = mix(A, '#ffffff', 0.5); // nhấn quá tối → sáng lên cho nổi
    ink = th?.textPrimary || mix(tone, '#ffffff', 0.93);
    sub = hexA(ink, 0.62);
    line = hexA(ink, 0.14);
    priceColor = th?.accentLight || A;
  } else {
    grad = [mix(A, '#ffffff', elegant ? 0.92 : 0.95), mix(A, '#ffffff', elegant ? 0.84 : 0.89), mix(A, '#ffffff', elegant ? 0.9 : 0.93)];
    glow = hexA(A, elegant ? 0.16 : 0.13);
    if (lum(A) > 0.55) A = mix(A, '#000000', 0.4); // nhấn quá sáng trên nền sáng → đậm lại
    ink = mix(tone, '#000000', 0.55);
    sub = hexA(ink, 0.58);
    line = hexA(ink, 0.14);
    priceColor = A;
  }

  // ===== Nền: gradient đặc + glow góc (đồng bộ poster) =====
  const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
  bg.addColorStop(0, grad[0]); bg.addColorStop(0.5, grad[1]); bg.addColorStop(1, grad[2]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (o.bgImg) {
    // ảnh nền tuỳ chọn: chìm dưới lớp tông thương hiệu để chữ vẫn rõ
    const im = o.bgImg; const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height; const sc = Math.max(W / sw, H / sh);
    ctx.save(); ctx.globalAlpha = 0.18;
    ctx.drawImage(im, (W - sw * sc) / 2, (H - sh * sc) / 2, sw * sc, sh * sc);
    ctx.restore();
  }
  const g1 = ctx.createRadialGradient(W * 0.92, 0, 20, W * 0.92, 0, W * 0.85);
  g1.addColorStop(0, glow); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.05, H, 20, W * 0.05, H, W * 0.8);
  g2.addColorStop(0, glow); g2.addColorStop(1, 'transparent');
  ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); ctx.restore();

  // ===== Khung viền (chỉ style elegant) =====
  const fm = W * 0.058;
  if (elegant) {
    ctx.save();
    ctx.strokeStyle = hexA(A, 0.9); ctx.lineWidth = 2.5; ctx.strokeRect(fm, fm, W - fm * 2, H - fm * 2);
    ctx.strokeStyle = hexA(A, 0.45); ctx.lineWidth = 1; ctx.strokeRect(fm + 9, fm + 9, W - fm * 2 - 18, H - fm * 2 - 18);
    const t = 26; ctx.strokeStyle = A; ctx.lineWidth = 2.5;
    const corner = (x: number, y: number, sx: number, sy: number) => { ctx.beginPath(); ctx.moveTo(x, y + sy * t); ctx.lineTo(x, y); ctx.lineTo(x + sx * t, y); ctx.stroke(); };
    corner(fm, fm, 1, 1); corner(W - fm, fm, -1, 1); corner(fm, H - fm, 1, -1); corner(W - fm, H - fm, -1, -1);
    ctx.restore();
  }

  const cx = W / 2;
  const padX = W * 0.13;

  // ===== Header =====
  let hy = H * 0.08;
  if (o.brandName) {
    ctx.fillStyle = priceColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `700 ${W * 0.026}px ${HEAD}`;
    ctx.save(); ctx.letterSpacing = '7px'; ctx.fillText(o.brandName.toUpperCase(), cx + 3.5, hy); ctx.restore();
    hy += W * 0.058;
  }
  // tiêu đề to, rõ (elegant giữ serif; dark/light dùng font thương hiệu đậm)
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const title = o.title || 'THỰC ĐƠN';
  let tfs = (elegant ? 0.115 : 0.112) * W;
  ctx.font = elegant ? `700 ${tfs}px ${SERIF}` : `800 ${tfs}px ${HEAD}`;
  const maxTW = W - padX * 2;
  const tw0 = ctx.measureText(title).width;
  if (tw0 > maxTW) { tfs *= maxTW / tw0; ctx.font = elegant ? `700 ${tfs}px ${SERIF}` : `800 ${tfs}px ${HEAD}`; }
  ctx.fillText(title, cx, hy);
  hy += tfs * 1.1;
  if (elegant) {
    ornament(ctx, cx, hy + 18, W * 0.15, A);
  } else {
    // thanh accent ngắn — điểm nhấn duy nhất
    ctx.fillStyle = priceColor; rr(ctx, cx - 44, hy + 14, 88, 6, 3); ctx.fill();
  }
  hy += 52;

  // ===== Vùng item =====
  const items = (o.items || []).filter((it) => it.name || it.price).slice(0, 12);
  const footerY = H - H * (o.contact ? 0.135 : 0.085);
  const areaTop = hy + H * 0.035, areaBot = footerY - H * 0.02;
  const n = Math.max(items.length, 1);
  const rowCap = n <= 4 ? H * 0.155 : n <= 7 ? H * 0.12 : H * 0.095;
  const rowH = Math.min((areaBot - areaTop) / n, rowCap);
  const blockH = rowH * n;
  const topMargin = Math.min(Math.max((areaBot - areaTop) - blockH, 0) / 2, H * 0.02);
  const startY = areaTop + topMargin;

  items.forEach((it, i) => {
    const cyRow = startY + i * rowH + rowH / 2;
    const hasDesc = !!(it.desc && it.desc.trim());
    const nameFs = Math.max(30, Math.min(52, rowH * 0.34));
    const priceFs = nameFs * 1.02;

    // tên món
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.font = `700 ${nameFs}px ${BODY}`;
    ctx.textBaseline = hasDesc ? 'alphabetic' : 'middle';
    const nameBaseY = hasDesc ? cyRow - nameFs * 0.08 : cyRow;
    ctx.fillText(it.name || '', padX, nameBaseY);
    const nameW = ctx.measureText(it.name || '').width;

    // giá (phải) — accent, đậm hơn tên
    ctx.fillStyle = priceColor; ctx.textAlign = 'right'; ctx.textBaseline = hasDesc ? 'alphabetic' : 'middle';
    ctx.font = `800 ${priceFs}px ${BODY}`;
    ctx.fillText(it.price || '', W - padX, hasDesc ? nameBaseY : cyRow);
    const priceW = ctx.measureText(it.price || '').width;

    // leader chấm mảnh nối tên ↔ giá (trên dòng tên)
    const leaderY = hasDesc ? nameBaseY - nameFs * 0.28 : cyRow;
    const lx1 = padX + nameW + 22, lx2 = W - padX - priceW - 22;
    if (lx2 > lx1) {
      ctx.save(); ctx.strokeStyle = hexA(dark ? ink : A, dark ? 0.26 : 0.42);
      ctx.lineWidth = 2; ctx.setLineDash([1.5, 9]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx1, leaderY); ctx.lineTo(lx2, leaderY); ctx.stroke(); ctx.restore();
    }

    // mô tả
    if (hasDesc) {
      ctx.fillStyle = sub; ctx.font = `400 ${nameFs * 0.5}px ${BODY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(it.desc!.trim(), padX, cyRow + nameFs * 0.14);
    }

    // đường kẻ mảnh giữa các món
    if (i < items.length - 1) {
      const ly = startY + (i + 1) * rowH;
      ctx.save(); ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padX, ly); ctx.lineTo(W - padX, ly); ctx.stroke(); ctx.restore();
    }
  });

  // ===== Footer liên hệ =====
  if (o.contact) {
    const ch = W * 0.064;
    const by = H - fm - ch - H * 0.022;
    ctx.save();
    ctx.font = `600 ${W * 0.027}px ${HEAD}`;
    const cw = ctx.measureText(o.contact).width + W * 0.09;
    const bx = cx - cw / 2;
    const pillBg = dark ? (th?.accent || A) : A;
    ctx.fillStyle = pillBg; rr(ctx, bx, by, cw, ch, ch / 2); ctx.fill();
    ctx.fillStyle = lum(pillBg) > 0.6 ? '#1a1410' : '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${W * 0.027}px ${HEAD}`;
    ctx.fillText(o.contact, cx, by + ch / 2 + 1);
    ctx.restore();
  }
  drawWatermark(canvas); // gói Free
}
