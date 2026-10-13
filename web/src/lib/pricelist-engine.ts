// Bảng giá / Menu — render bằng code từ Brand Kit. 0 AI realtime.
import { fontFamilyById } from './brand-presets';

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

export function drawPriceList(canvas: HTMLCanvasElement, o: PriceListOpts) {
  const W = 1080;
  const H = o.aspect === '1:1' ? 1080 : o.aspect === '9:16' ? 1920 : 1350;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const HEAD = fontFamilyById(o.fontHeadingId);
  const BODY = fontFamilyById(o.fontBodyId || o.fontHeadingId);
  const P = o.colorPrimary || '#0f172a';
  const A = o.colorAccent || '#10b981';
  const style = o.style || 'dark';

  const light = style === 'light' || style === 'elegant';
  const ink = light ? '#1a1f2b' : '#ffffff';
  const sub = light ? '#5b6472' : 'rgba(255,255,255,0.72)';

  // nền
  if (o.bgImg) {
    const im = o.bgImg; const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    const sc = Math.max(W / sw, H / sh); ctx.drawImage(im, (W - sw * sc) / 2, (H - sh * sc) / 2, sw * sc, sh * sc);
    ctx.fillStyle = light ? 'rgba(255,255,255,0.86)' : 'rgba(8,12,20,0.78)'; ctx.fillRect(0, 0, W, H);
  } else if (light) {
    ctx.fillStyle = '#f6f7f9'; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shift(P, 12)); g.addColorStop(1, shift(P, -24));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const m = 90;
  let y = 120;

  // brand nhỏ trên cùng
  if (o.brandName) {
    ctx.fillStyle = A; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `700 30px ${HEAD}`; ctx.fillText(o.brandName.toUpperCase(), W / 2, y); y += 54;
  }
  // tiêu đề
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const tfs = style === 'elegant' ? 92 : 84;
  ctx.font = `900 ${tfs}px ${HEAD}`;
  const title = (o.title || 'BẢNG GIÁ').toUpperCase();
  ctx.fillText(title, W / 2, y); y += tfs * 1.1;
  // gạch accent giữa
  ctx.fillStyle = A; ctx.fillRect(W / 2 - 70, y + 10, 140, 8); y += 60;

  // danh sách
  const items = (o.items || []).filter((it) => it.name || it.price).slice(0, 12);
  const footerH = o.contact ? 150 : 90;
  const availH = H - y - footerH;
  const rowH = Math.min(availH / Math.max(items.length, 1), 150);
  const nameFs = Math.max(30, Math.min(46, rowH * 0.34));
  const priceFs = nameFs + 2;
  const descFs = nameFs * 0.62;

  items.forEach((it, i) => {
    const cy = y + i * rowH;
    const center = cy + rowH / 2;
    // tên (trái)
    ctx.fillStyle = ink; ctx.textAlign = 'left';
    ctx.font = `700 ${nameFs}px ${BODY}`;
    const hasDesc = !!(it.desc && it.desc.trim());
    ctx.textBaseline = hasDesc ? 'alphabetic' : 'middle';
    const nameY = hasDesc ? center - 2 : center;
    ctx.fillText(it.name || '', m, nameY);
    const nameW = ctx.measureText(it.name || '').width;
    // mô tả
    if (hasDesc) {
      ctx.fillStyle = sub; ctx.font = `400 ${descFs}px ${BODY}`; ctx.textBaseline = 'top';
      ctx.fillText(it.desc!.trim(), m, center + descFs * 0.2);
    }
    // giá (phải)
    ctx.fillStyle = A; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${priceFs}px ${HEAD}`;
    ctx.fillText(it.price || '', W - m, center);
    const priceW = ctx.measureText(it.price || '').width;
    // leader chấm
    const lx1 = m + nameW + 24, lx2 = W - m - priceW - 24;
    if (lx2 > lx1 && !hasDesc) {
      ctx.strokeStyle = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3; ctx.setLineDash([3, 10]); ctx.beginPath(); ctx.moveTo(lx1, center); ctx.lineTo(lx2, center); ctx.stroke(); ctx.setLineDash([]);
    }
  });

  // footer liên hệ
  if (o.contact) {
    ctx.fillStyle = A; ctx.fillRect(0, H - footerH, W, footerH);
    ctx.fillStyle = lum(A) > 0.6 ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 38px ${HEAD}`; ctx.fillText(o.contact, W / 2, H - footerH / 2);
  }
}
