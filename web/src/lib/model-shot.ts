'use client';
// Người mẫu AI: người mẫu gen sẵn + ảnh đồ của shop → người mẫu mặc đúng món đồ đó.
// Model: FASHN VTON 1.5 (Apache-2.0). Gọi qua backend Mivy (/v1/tryon): trừ tiền ví trước, lỗi thì hoàn;
// backend chỉ chuyển yêu cầu sang GPU Hugging Face. Bản free = tab Nền studio.
import { call } from '@/lib/auth';

export type Garment = 'top' | 'bottom' | 'dress';
export const GARMENTS: { id: Garment; name: string; fashn: string }[] = [
  { id: 'top', name: 'Áo', fashn: 'tops' },
  { id: 'bottom', name: 'Quần, váy', fashn: 'bottoms' },
  { id: 'dress', name: 'Đầm, bộ liền', fashn: 'one-pieces' },
];
// Kho người mẫu gen sẵn (anh duyệt từng tấm) — public/try-on/models
export const MODELS: { id: string; name: string; src: string }[] = [
  { id: 'nu-1', name: 'Nữ 1', src: '/try-on/models/nu-1.jpg' },
];
export type PhotoType = 'flat-lay' | 'model';
export interface ShotChoice { garment: Garment; model: string; photo: PhotoType }

// thu nhỏ ≤1024px, nền trắng → JPEG nhẹ đường truyền
async function toBlob(src: string): Promise<Blob> {
  const im = new Image(); im.src = src; await im.decode();
  const k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh lỗi'))), 'image/jpeg', 0.92));
}

// Trả ảnh (data URL) + số dư mới. Lỗi ném ApiError: 401 chưa đăng nhập, 402 hết tiền, 429/502 AI lỗi (đã hoàn tiền).
export async function generateModelShot(productSrc: string, choice: ShotChoice, onStatus?: (s: string) => void): Promise<{ image: string; balance: number }> {
  onStatus?.('Đang gửi ảnh…');
  const m = MODELS.find((x) => x.id === choice.model) || MODELS[0];
  const fd = new FormData();
  fd.append('person', await toBlob(m.src), 'person.jpg');
  fd.append('garment', await toBlob(productSrc), 'garment.jpg');
  fd.append('garment_kind', choice.garment); fd.append('photo_type', choice.photo);
  onStatus?.('AI đang mặc đồ cho người mẫu… khoảng 30–60 giây');
  const r = await call<Response>('/v1/tryon', { method: 'POST', body: fd });
  const blob = await r.blob();
  const image = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.readAsDataURL(blob); });
  return { image, balance: Number(r.headers.get('X-Balance')) };
}

// ---------- chuyển ảnh sang trang khác (Video ngắn / Ảnh sản phẩm) ----------
export function handoffImage(target: 'video' | 'image', dataUrl: string) {
  try { sessionStorage.setItem(`mivy-handoff-${target}`, dataUrl); } catch { /* ảnh quá lớn → bỏ qua */ }
}
export function takeHandoff(target: 'video' | 'image'): string | null {
  try { const v = sessionStorage.getItem(`mivy-handoff-${target}`); if (v) sessionStorage.removeItem(`mivy-handoff-${target}`); return v; } catch { return null; }
}
