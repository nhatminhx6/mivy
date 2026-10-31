'use client';
// Đăng nhập / đăng ký bằng email + mật khẩu. Đăng ký mới được tặng 1 lượt Người mẫu AI.

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gift, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // chỉ cho quay về trang nội bộ
  const next = (params.get('next') || '').startsWith('/') && !(params.get('next') || '').startsWith('//') ? params.get('next')! : '/studio/image';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'register') await authApi.register(email, password, name); else await authApi.login(email, password);
      router.replace(next);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); setBusy(false); }
  };
  const tab = (m: 'login' | 'register', label: string) => (
    <button type="button" onClick={() => { setMode(m); setErr(''); }} data-active={mode === m} className="mv-seg-btn flex-1 !justify-center">{label}</button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <Link href="/" className="text-2xl font-black text-white tracking-tight">mivy</Link>
          <p className="text-xs text-slate-400">{mode === 'register' ? 'Tạo tài khoản để dùng tính năng AI' : 'Đăng nhập tài khoản Mivy'}</p>
        </div>
        <div className="mv-seg flex" data-testid="auth-tabs">{tab('login', 'Đăng nhập')}{tab('register', 'Đăng ký')}</div>
        {mode === 'register' && (
          <div className="flex items-center gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2"><Gift className="w-4 h-4 shrink-0" /> Đăng ký mới được tặng 1 lượt Người mẫu AI</div>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <label className="block"><span className="mv-label">Tên shop / tên bạn</span><input className="mv-input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          )}
          <label className="block"><span className="mv-label">Email</span><input className="mv-input w-full mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" /></label>
          <label className="block"><span className="mv-label">Mật khẩu</span><input className="mv-input w-full mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} data-testid="auth-password" /></label>
          {err && <p className="text-xs text-rose-300" data-testid="auth-error">{err}</p>}
          <button type="submit" disabled={busy} className="w-full mv-btn mv-btn-primary !flex justify-center !py-2.5 disabled:opacity-70" data-testid="auth-submit">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-500">Các công cụ thiết kế vẫn dùng miễn phí, không cần đăng nhập.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
