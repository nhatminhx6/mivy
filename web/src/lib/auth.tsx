'use client';
// Tài khoản + ví đồng Mivy (1 đồng = 1.000đ). Gọi backend qua /v1 (Next chuyển tiếp) → cookie đăng nhập cùng domain.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface Me { id: number; email: string; name: string; phone: string; balance: number; is_admin: boolean; prices?: { tryon: number } }
export interface Tx { id: number; email: string; amount: number; kind: 'signup' | 'topup' | 'charge' | 'refund'; note: string; balance_after: number; created_at: string }

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: Record<string, unknown>) { super(message); }
}

export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try { r = await fetch(path, { credentials: 'include', ...init }); }
  catch { throw new ApiError('Không kết nối được máy chủ, thử lại sau nhé.', 0); }
  if (r.ok) return (r.headers.get('content-type')?.includes('json') ? r.json() : r) as Promise<T>;
  const body = await r.json().catch(() => null);
  const err = body?.error || {};
  throw new ApiError(err.message || `Máy chủ báo lỗi (${r.status}).`, r.status, err);
}
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const authApi = {
  me: () => call<Me>('/v1/me'),
  login: (email: string, password: string) => call<Me>('/v1/auth/login', json({ email, password })),
  register: (email: string, password: string, name: string, phone = '') => call<Me>('/v1/auth/register', json({ email, password, name, phone })),
  updateMe: (p: { name?: string; phone?: string }) => call<Me>('/v1/me', { ...json(p), method: 'PATCH' }),
  logout: () => call('/v1/auth/logout', { method: 'POST' }),
  transactions: () => call<Tx[]>('/v1/me/transactions'),
  adminUsers: (q: string) => call<(Me & { created_at: string })[]>(`/v1/admin/users?q=${encodeURIComponent(q)}`),
  adminTopup: (email: string, amount: number, note: string) => call<{ email: string; balance: number }>('/v1/admin/topup', json({ email, amount, note })),
  adminTransactions: () => call<Tx[]>('/v1/admin/transactions'),
};

// ---------- đơn in ----------
export type OrderStatus = 'new' | 'quoted' | 'deposited' | 'sample' | 'printing' | 'delivered' | 'cancelled';
export type PrintProduct = 'card' | 'sticker' | 'keychain' | 'hashtag' | 'custom';
export interface PrintOrder {
  id: number; code: string; product: PrintProduct; title: string; quantity: number; material: string;
  contact_name: string; phone: string; address: string; need_by: string; note: string;
  status: OrderStatus; status_label: string; price: number | null; deposit: number | null; file_name: string;
  created_at: string; updated_at: string | null;
  user_id?: number; email?: string; admin_note?: string;
}
export interface Customer extends Me { note: string; created_at: string; orders: number; last_order_at: string | null; total: number }
export const ORDER_STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'new', label: 'Mới gửi' }, { id: 'quoted', label: 'Đã báo giá' }, { id: 'deposited', label: 'Đã cọc' },
  { id: 'sample', label: 'Đang in mẫu' }, { id: 'printing', label: 'Đang in' }, { id: 'delivered', label: 'Đã giao' },
];
export const STATUS_LABEL: Record<OrderStatus, string> = { ...Object.fromEntries(ORDER_STEPS.map((s) => [s.id, s.label])), cancelled: 'Đã huỷ' } as Record<OrderStatus, string>;
// Mỗi trạng thái nói cho khách biết đang tới đâu + cần làm gì → bớt hỏi, bớt lo khi chạy đơn thật.
export const STATUS_GUIDE: Record<OrderStatus, string> = {
  new: 'Mivy đang xem file và tìm xưởng phù hợp, sẽ báo giá qua Zalo trong ngày.',
  quoted: 'Đã có báo giá — chuyển cọc để Mivy in mẫu cho bạn duyệt.',
  deposited: 'Đã nhận cọc. Mivy đang chuẩn bị in mẫu, sẽ gửi ảnh mẫu qua Zalo để bạn duyệt.',
  sample: 'Đang in mẫu — Mivy gửi mẫu cho bạn duyệt trước khi in số lượng lớn.',
  printing: 'Đang in số lượng của bạn — Mivy sẽ báo khi giao.',
  delivered: 'Đã giao — cảm ơn bạn! Cần in thêm cứ quay lại nhé.',
  cancelled: 'Đơn đã huỷ. Cần hỗ trợ cứ nhắn Zalo cho Mivy.',
};
const patch = (body: unknown): RequestInit => ({ ...json(body), method: 'PATCH' });
export const orderApi = {
  create: (form: FormData) => call<PrintOrder>('/v1/print-orders', { method: 'POST', body: form }),
  mine: () => call<PrintOrder[]>('/v1/me/print-orders'),
  fileUrl: (id: number) => `/v1/print-orders/${id}/file`,
  previewUrl: (id: number) => `/v1/print-orders/${id}/preview`,
  adminList: (status = '', q = '') => call<PrintOrder[]>(`/v1/admin/print-orders?status=${status}&q=${encodeURIComponent(q)}`),
  adminUpdate: (id: number, p: Partial<Pick<PrintOrder, 'status' | 'price' | 'deposit' | 'admin_note'>>) => call<PrintOrder>(`/v1/admin/print-orders/${id}`, patch(p)),
  customers: (q = '') => call<Customer[]>(`/v1/admin/customers?q=${encodeURIComponent(q)}`),
  updateCustomer: (id: number, p: { name?: string; phone?: string; note?: string }) => call<Customer>(`/v1/admin/customers/${id}`, patch(p)),
};
export const fmtVnd = (n?: number | null) => (n == null ? '—' : `${n.toLocaleString('vi-VN')}đ`);
export const zaloLink = (phone: string) => `https://zalo.me/${phone}`;
// Kênh liên hệ Mivy cho khách (đặt in theo yêu cầu, hỏi đáp). Số/Zalo công khai, điền ở web/.env.local.
export const MIVY_ZALO = process.env.NEXT_PUBLIC_MIVY_ZALO || '';
export const mivyZaloLink = MIVY_ZALO ? zaloLink(MIVY_ZALO) : '';
// QR chuyển khoản (VietQR) có sẵn số tiền + mã đơn — cần NEXT_PUBLIC_BANK_BIN (mã/tên ngân hàng, vd 970436 hoặc vcb)
export function vietQr(amount: number, info: string): string | null {
  const bin = process.env.NEXT_PUBLIC_BANK_BIN || process.env.NEXT_PUBLIC_BANK_ID || '';
  if (!bin || !BANK.account) return null;
  const q = new URLSearchParams({ amount: String(amount), addInfo: info, accountName: BANK.owner });
  return `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(BANK.account)}-compact2.png?${q}`;
}

interface AuthCtx { me: Me | null; ready: boolean; refresh: () => Promise<void>; setBalance: (b: number) => void; logout: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ me: null, ready: false, refresh: async () => {}, setBalance: () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try { setMe(await authApi.me()); } catch { setMe(null); } finally { setReady(true); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const setBalance = useCallback((b: number) => setMe((m) => (m ? { ...m, balance: b } : m)), []);
  const logout = useCallback(async () => { await authApi.logout().catch(() => null); setMe(null); }, []);
  return <Ctx.Provider value={{ me, ready, refresh, setBalance, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

export const fmtDong = (n: number) => `${n.toLocaleString('vi-VN')} đồng`;
export const KIND_LABEL: Record<Tx['kind'], string> = { signup: 'Quà đăng ký', topup: 'Nạp tiền', charge: 'Dùng AI', refund: 'Hoàn tiền' };
// Thông tin chuyển khoản (đặt trong web/.env.local)
export const BANK = {
  name: process.env.NEXT_PUBLIC_BANK_NAME || '',
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || '',
  owner: process.env.NEXT_PUBLIC_BANK_OWNER || '',
  contact: process.env.NEXT_PUBLIC_TOPUP_CONTACT || '',
};
