'use client';
// Góc dưới menu studio: số dư ví + nạp tiền, hoặc nút đăng nhập.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Printer, ShieldCheck, Wallet } from 'lucide-react';
import { fmtDong, useAuth } from '@/lib/auth';

export function AccountBox() {
  const { me, ready, logout } = useAuth();
  const pathname = usePathname();
  if (!ready) return <div className="h-[58px] rounded-xl bg-ink/[0.03] animate-pulse" />;
  if (!me) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-mv-accent-soft border border-transparent hover:border-mv-accent/30 transition-colors" data-testid="account-login">
        <LogIn className="w-4 h-4 text-mv-accent shrink-0" />
        <span className="text-xs font-bold text-mv-accent flex-1">Đăng nhập / Đăng ký</span>
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-mv-hair bg-mv-surface-2 p-3 space-y-2" data-testid="account-box">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 truncate" title={me.email}>{me.name || me.email}</span>
        <button type="button" onClick={logout} title="Đăng xuất" className="text-slate-500 hover:text-mv-fg"><LogOut className="w-3.5 h-3.5" /></button>
      </div>
      <Link href="/studio/wallet" className="flex items-center gap-2 group" data-testid="account-balance">
        <Wallet className="w-4 h-4 text-mv-pro shrink-0" />
        <span className="text-base font-bold text-mv-fg flex-1 tabular-nums">{fmtDong(me.balance)}</span>
        <span className="text-xs font-bold text-mv-accent group-hover:underline">Nạp tiền</span>
      </Link>
      <Link href="/studio/orders" className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-mv-fg" data-testid="account-orders"><Printer className="w-3.5 h-3.5" /> Đơn in của tôi</Link>
      {me.is_admin && (
        <Link href="/studio/admin" className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-mv-fg"><ShieldCheck className="w-3.5 h-3.5" /> Quản trị đơn · khách · ví</Link>
      )}
    </div>
  );
}
