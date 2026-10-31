'use client';
// Tài khoản + ví đồng Mivy (1 đồng = 1.000đ). Gọi backend qua /v1 (Next chuyển tiếp) → cookie đăng nhập cùng domain.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface Me { id: number; email: string; name: string; balance: number; is_admin: boolean; prices?: { tryon: number } }
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
  register: (email: string, password: string, name: string) => call<Me>('/v1/auth/register', json({ email, password, name })),
  logout: () => call('/v1/auth/logout', { method: 'POST' }),
  transactions: () => call<Tx[]>('/v1/me/transactions'),
  adminUsers: (q: string) => call<(Me & { created_at: string })[]>(`/v1/admin/users?q=${encodeURIComponent(q)}`),
  adminTopup: (email: string, amount: number, note: string) => call<{ email: string; balance: number }>('/v1/admin/topup', json({ email, amount, note })),
  adminTransactions: () => call<Tx[]>('/v1/admin/transactions'),
};

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
