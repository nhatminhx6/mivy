import { MarketingState, StickerCorner } from '@/types';
import { qcBox } from './qc-capture';

// Kho sticker sale gen sẵn (vector, render bằng code — KHÔNG gọi AI).
// Mỗi preset: hình + màu cố định, text cho sửa.
export type StickerShape = 'burst' | 'ribbon' | 'pill' | 'tag';

export interface StickerPreset {
  id: string;
  label: string;      // tên hiển thị ở UI
  defaultText: string;
  shape: StickerShape;
  bg: string;
  fg: string;
  accent?: string;    // viền/điểm nhấn
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: 'none', label: 'Không dán', defaultText: '', shape: 'pill', bg: '', fg: '' },
  { id: 'sale-burst', label: 'Giảm giá (ngôi sao)', defaultText: 'GIẢM\n50%', shape: 'burst', bg: '#ef4444', fg: '#ffffff', accent: '#fde047' },
  { id: 'flash', label: 'Flash Sale', defaultText: '⚡ FLASH SALE', shape: 'ribbon', bg: '#f59e0b', fg: '#1f2937', accent: '#fff7ed' },
  { id: 'freeship', label: 'Freeship', defaultText: 'FREESHIP', shape: 'pill', bg: '#10b981', fg: '#042f2e', accent: '#a7f3d0' },
  { id: 'combo', label: 'Mua 1 tặng 1', defaultText: 'MUA 1\nTẶNG 1', shape: 'tag', bg: '#8b5cf6', fg: '#ffffff', accent: '#ede9fe' },
  { id: 'new', label: 'Hàng mới', defaultText: 'NEW', shape: 'burst', bg: '#0ea5e9', fg: '#ffffff', accent: '#e0f2fe' },
  { id: 'hot', label: 'Bán chạy', defaultText: '🔥 HOT', shape: 'ribbon', bg: '#dc2626', fg: '#fff7ed', accent: '#fee2e2' },
];

export function getPreset(id?: string): StickerPreset | undefined {
  return STICKER_PRESETS.find((p) => p.id === id);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// vị trí tâm theo góc chọn
function anchor(corner: StickerCorner, W: number, H: number, m: number) {
  switch (corner) {
    case 'tl': return { x: m, y: m };
    case 'bl': return { x: m, y: H - m };
    case 'br': return { x: W - m, y: H - m };
    default: return { x: W - m, y: m }; // tr
  }
}

function drawLines(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string) {
  const lines = text.split('\n');
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px Montserrat, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.05;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lh));
}

/**
 * Vẽ sticker sale lên trên poster (overlay sau cùng). An toàn với mọi layout.
 */
export function drawSaleSticker(canvas: HTMLCanvasElement, marketing: MarketingState) {
  const cfg = marketing.sticker;
  if (!cfg || !cfg.preset || cfg.preset === 'none') return;
  // (qcBox import ở đầu file)
  const preset = getPreset(cfg.preset);
  if (!preset) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const _sc = canvas.width / 1080; // ctx đã scale ở entry → dùng toạ độ logic
  const W = canvas.width / _sc;
  const H = canvas.height / _sc;
  const text = (cfg.text ?? preset.defaultText) || preset.defaultText;
  const S = Math.round(W * 0.2); // kích thước cơ bản ~ 216px khi W=1080
  const margin = Math.round(W * 0.055);
  // QC: ghi box vùng sticker (quanh góc đặt) để audit đè CTA/nội dung
  { const a = anchor(cfg.corner, W, H, margin + S * 0.5); qcBox('sticker', a.x - S * 0.75, a.y - S * 0.75, S * 1.5, S * 1.5, cfg.preset); }

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  if (preset.shape === 'burst') {
    // huy hiệu ngôi sao (zig-zag tròn)
    const p = anchor(cfg.corner, W, H, margin + S * 0.5);
    const r = S * 0.56;
    const spikes = 16;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (Math.PI * i) / spikes;
      const rad = i % 2 === 0 ? r : r * 0.82;
      const px = p.x + Math.cos(ang) * rad;
      const py = p.y + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = preset.bg;
    ctx.fill();
    if (preset.accent) {
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = Math.max(4, S * 0.03);
      ctx.strokeStyle = preset.accent;
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    const fs = text.includes('\n') ? S * 0.26 : S * 0.2;
    drawLines(ctx, text, p.x, p.y, fs, preset.fg);
  } else if (preset.shape === 'ribbon') {
    // dải chéo ở góc
    const diag = S * 1.7;
    const corner = cfg.corner;
    ctx.save();
    // dịch về góc tương ứng
    if (corner === 'tr') { ctx.translate(W, 0); ctx.rotate(Math.PI / 2); }
    else if (corner === 'br') { ctx.translate(W, H); ctx.rotate(Math.PI); }
    else if (corner === 'bl') { ctx.translate(0, H); ctx.rotate(-Math.PI / 2); }
    // mặc định tl: không xoay
    const band = S * 0.42;
    const off = diag * 0.62;
    ctx.beginPath();
    ctx.moveTo(off, 0);
    ctx.lineTo(diag, 0);
    ctx.lineTo(0, diag);
    ctx.lineTo(0, off);
    ctx.closePath();
    ctx.fillStyle = preset.bg;
    ctx.fill();
    // text dọc theo dải
    ctx.shadowColor = 'transparent';
    ctx.translate(off * 0.72, off * 0.72);
    ctx.rotate(Math.PI / 4);
    drawLines(ctx, text.replace('\n', ' '), 0, 0, Math.min(band * 0.5, S * 0.17), preset.fg);
    ctx.restore();
  } else if (preset.shape === 'tag') {
    // thẻ bo góc có lỗ treo
    const w = S * 1.25;
    const hgt = S * 0.95;
    const p = anchor(cfg.corner, W, H, margin);
    let x = p.x, y = p.y;
    if (cfg.corner === 'tr' || cfg.corner === 'br') x = p.x - w;
    if (cfg.corner === 'bl' || cfg.corner === 'br') y = p.y - hgt;
    roundRect(ctx, x, y, w, hgt, 22);
    ctx.fillStyle = preset.bg;
    ctx.fill();
    if (preset.accent) {
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 5;
      ctx.strokeStyle = preset.accent;
      roundRect(ctx, x + 10, y + 10, w - 20, hgt - 20, 16);
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    const fs = text.includes('\n') ? hgt * 0.3 : hgt * 0.34;
    drawLines(ctx, text, x + w / 2, y + hgt / 2, fs, preset.fg);
  } else {
    // pill
    ctx.font = `900 ${S * 0.2}px Montserrat, system-ui, sans-serif`;
    const t = text.replace('\n', ' ');
    const tw = ctx.measureText(t).width;
    const padX = S * 0.22;
    const w = tw + padX * 2;
    const hgt = S * 0.46;
    const p = anchor(cfg.corner, W, H, margin);
    let x = p.x, y = p.y;
    if (cfg.corner === 'tr' || cfg.corner === 'br') x = p.x - w;
    if (cfg.corner === 'bl' || cfg.corner === 'br') y = p.y - hgt;
    roundRect(ctx, x, y, w, hgt, hgt / 2);
    ctx.fillStyle = preset.bg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    drawLines(ctx, t, x + w / 2, y + hgt / 2, S * 0.2, preset.fg);
  }

  ctx.restore();
}
