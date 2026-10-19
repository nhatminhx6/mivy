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

/**
 * Vẽ trang trí mùa sale lên poster (overlay, trước sticker).
 */
export function drawSeasonDecor(canvas: HTMLCanvasElement, marketing: MarketingState) {
  const s = getSeason(marketing.season);
  if (!s || s.id === 'none') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = canvas.width / 1080; // ctx đã scale ở entry → dùng toạ độ logic
  const W = canvas.width / S;
  const H = canvas.height / S;
  const t = Math.max(10, Math.round(W * 0.012)); // độ dày viền

  ctx.save();

  // 1) Khung viền kép theo tông mùa
  ctx.strokeStyle = s.c1;
  ctx.lineWidth = t;
  ctx.strokeRect(t / 2, t / 2, W - t, H - t);
  ctx.strokeStyle = s.c2;
  ctx.lineWidth = Math.max(3, t * 0.3);
  ctx.strokeRect(t * 1.6, t * 1.6, W - t * 3.2, H - t * 3.2);

  // Chỉ dùng KHUNG MÀU theo mùa — KHÔNG vẽ hoạ tiết đè nội dung (hoa/đèn/banner).
  // Tông mùa còn thể hiện qua màu chữ ưu đãi + Sticker người dùng tự thêm.

  ctx.restore();
}
