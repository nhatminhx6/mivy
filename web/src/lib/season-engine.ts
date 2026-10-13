import { MarketingState } from '@/types';

// Trang trí theo mùa sale VN — vẽ 100% bằng code (khung viền + hoạ tiết + tông màu),
// phủ lên poster có sẵn. KHÔNG tải ảnh mới, áp được cho mọi layout.
export interface SeasonPreset {
  id: string;
  label: string;
  c1: string; // màu chính
  c2: string; // màu phụ
  suggest: string; // gợi ý chữ sticker/ưu đãi cho dịp
}

export const SEASON_PRESETS: SeasonPreset[] = [
  { id: 'none', label: 'Không', c1: '', c2: '', suggest: '' },
  { id: 'tet', label: '🌸 Tết', c1: '#c81e1e', c2: '#fbbf24', suggest: 'SALE TẾT' },
  { id: '1111', label: '🛒 11.11', c1: '#7c3aed', c2: '#f472b6', suggest: '11.11' },
  { id: '1212', label: '🛒 12.12', c1: '#2563eb', c2: '#f59e0b', suggest: '12.12' },
  { id: 'blackfriday', label: '🖤 Black Friday', c1: '#111827', c2: '#fbbf24', suggest: 'BLACK FRIDAY' },
  { id: 'trungthu', label: '🏮 Trung Thu', c1: '#b91c1c', c2: '#f59e0b', suggest: 'SALE TRUNG THU' },
  { id: '8thang3', label: '🌹 8/3', c1: '#db2777', c2: '#f9a8d4', suggest: 'QUÀ 8/3' },
  { id: 'noel', label: '🎄 Giáng Sinh', c1: '#166534', c2: '#dc2626', suggest: 'MERRY XMAS' },
];

export function getSeason(id?: string): SeasonPreset | undefined {
  return SEASON_PRESETS.find((s) => s.id === id);
}

function fivePetal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, center: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(0, -r * 0.72, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate((Math.PI * 2) / 5);
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, cap: string) {
  ctx.save();
  ctx.translate(x, y);
  // dây treo
  ctx.strokeStyle = cap;
  ctx.lineWidth = Math.max(2, s * 0.04);
  ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(0, -s * 0.7); ctx.stroke();
  // nắp
  ctx.fillStyle = cap;
  ctx.fillRect(-s * 0.4, -s * 0.72, s * 0.8, s * 0.18);
  // thân
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.62, s * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  // gân
  ctx.strokeStyle = cap;
  ctx.lineWidth = Math.max(1.5, s * 0.03);
  for (const dx of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.ellipse(s * dx * 0.62, 0, s * 0.12, s * 0.72, 0, 0, Math.PI * 2); ctx.stroke(); }
  // tua
  ctx.fillStyle = cap;
  ctx.fillRect(-s * 0.06, s * 0.68, s * 0.12, s * 0.35);
  ctx.restore();
}

function rose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(2, r * 0.14);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.25 + i * 0.22), i * 0.6, i * 0.6 + Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Vẽ trang trí mùa sale lên poster (overlay, trước sticker).
 */
export function drawSeasonDecor(canvas: HTMLCanvasElement, marketing: MarketingState) {
  const s = getSeason(marketing.season);
  if (!s || s.id === 'none') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const t = Math.max(10, Math.round(W * 0.012)); // độ dày viền

  ctx.save();

  // 1) Khung viền kép theo tông mùa
  ctx.strokeStyle = s.c1;
  ctx.lineWidth = t;
  ctx.strokeRect(t / 2, t / 2, W - t, H - t);
  ctx.strokeStyle = s.c2;
  ctx.lineWidth = Math.max(3, t * 0.3);
  ctx.strokeRect(t * 1.6, t * 1.6, W - t * 3.2, H - t * 3.2);

  // 2) Hoạ tiết theo từng dịp
  const r = W * 0.05;
  if (s.id === 'tet') {
    fivePetal(ctx, W * 0.1, H * 0.09, r, s.c2, s.c1);
    fivePetal(ctx, W * 0.9, H * 0.09, r * 0.8, s.c2, s.c1);
    fivePetal(ctx, W * 0.07, H * 0.93, r * 0.7, s.c2, s.c1);
    fivePetal(ctx, W * 0.93, H * 0.94, r, s.c2, s.c1);
  } else if (s.id === 'trungthu') {
    lantern(ctx, W * 0.12, H * 0.12, r, s.c1, s.c2);
    lantern(ctx, W * 0.88, H * 0.1, r * 0.85, s.c1, s.c2);
  } else if (s.id === '8thang3') {
    rose(ctx, W * 0.11, H * 0.1, r, s.c2);
    rose(ctx, W * 0.9, H * 0.11, r * 0.85, s.c2);
    rose(ctx, W * 0.92, H * 0.92, r, s.c2);
  } else if (s.id === 'noel') {
    // tuyết rơi
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const seed = [0.08, 0.2, 0.33, 0.47, 0.6, 0.72, 0.85, 0.95, 0.15, 0.4, 0.55, 0.78];
    seed.forEach((fx, i) => {
      const fy = ((i * 0.137) % 1);
      const rad = (i % 3 + 1) * W * 0.004;
      ctx.beginPath(); ctx.arc(W * fx, H * fy, rad, 0, Math.PI * 2); ctx.fill();
    });
  } else if (s.id === 'blackfriday' || s.id === '1111' || s.id === '1212') {
    // dải tiêu đề dịp ở đỉnh
    const bh = H * 0.07;
    ctx.fillStyle = s.c1;
    ctx.fillRect(0, 0, W, bh);
    ctx.fillStyle = s.c2;
    ctx.font = `900 ${bh * 0.52}px Montserrat, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.suggest, W / 2, bh / 2);
  }

  ctx.restore();
}
