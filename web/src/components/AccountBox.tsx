'use client';
// Góc dưới menu studio: số dư ví + nạp tiền, hoặc nút đăng nhập.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, ShieldCheck, Wallet } from 'lucide-react';
import { fmtDong, useAuth } from '@/lib/auth';

export function AccountBox() {
  const { me, ready, logout } = useAuth();
  const pathname = usePathname();
  if (!ready) return <div className="h-[58px] rounded-xl bg-white/[0.03] animate-pulse" />;
  if (!me) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-indigo-500/[0.06] border border-indigo-500/30 hover:border-indigo-500/50 transition-colors" data-testid="account-login">
        <LogIn className="w-4 h-4 text-indigo-300 shrink-0" />
        <span className="text-xs font-bold text-white flex-1">Đăng nhập / Đăng ký</span>
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2" data-testid="account-box">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 truncate" title={me.email}>{me.name || me.email}</span>
        <button type="button" onClick={logout} title="Đăng xuất" className="text-slate-500 hover:text-white"><LogOut className="w-3.5 h-3.5" /></button>
      </div>
      <Link href="/studio/wallet" className="flex items-center gap-2 group" data-testid="account-balance">
        <Wallet className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="text-sm font-bold text-white flex-1">{fmtDong(me.balance)}</span>
        <span className="text-[11px] font-semibold text-amber-300 group-hover:text-amber-200">Nạp tiền</span>
      </Link>
      {me.is_admin && (
        <Link href="/studio/admin" className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-white"><ShieldCheck className="w-3.5 h-3.5" /> Quản trị ví</Link>
      )}
    </div>
  );
}
