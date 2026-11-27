'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi, useAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // chỉ cho quay về trang nội bộ
  const returnPath = params.get('next') || '';
  const next = /^\/(?![/\\])/.test(returnPath) && !/[\s\\]/.test(returnPath) ? returnPath : '/studio/templates';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'register') {
        if (password !== passwordConfirmation) throw new Error('Mật khẩu xác nhận chưa khớp.');
        await authApi.register(name, phone, email, password, passwordConfirmation);
      } else {
        await authApi.login(identifier, password);
      }
      await refresh();
      router.replace(next);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); setBusy(false); }
  };
  const tab = (m: 'login' | 'register', label: string) => (
    <button type="button" onClick={() => { setMode(m); setErr(''); }} data-active={mode === m} className="mv-seg-btn flex-1 !justify-center">{label}</button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-mv-hair rounded-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <Link href="/" className="text-2xl font-black text-mv-fg tracking-tight">mivy</Link>
          <p className="text-xs text-slate-400">{mode === 'register' ? 'Tạo tài khoản để đặt in và theo dõi đơn' : 'Đăng nhập tài khoản Mivy'}</p>
        </div>
        <div className="mv-seg flex" data-testid="auth-tabs">{tab('login', 'Đăng nhập')}{tab('register', 'Đăng ký')}</div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mv-label">Tên của bạn</span><input className="mv-input w-full mt-1" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                <label className="block"><span className="mv-label">SĐT / Zalo</span><input className="mv-input w-full mt-1" type="tel" required placeholder="0909 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" data-testid="auth-phone" /></label>
              </div>
              <label className="block"><span className="mv-label">Email (tùy chọn)</span><input className="mv-input w-full mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" /></label>
              <label className="block"><span className="mv-label">Mật khẩu</span><input className="mv-input w-full mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" data-testid="auth-password" /></label>
              <label className="block"><span className="mv-label">Xác nhận mật khẩu</span><input className="mv-input w-full mt-1" type="password" required minLength={6} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} autoComplete="new-password" data-testid="auth-password-confirmation" /></label>
            </>
          ) : (
            <>
              <label className="block"><span className="mv-label">Số điện thoại hoặc email</span><input className="mv-input w-full mt-1" type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" data-testid="auth-identifier" /></label>
              <label className="block"><span className="mv-label">Mật khẩu</span><input className="mv-input w-full mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" data-testid="auth-password" /></label>
            </>
          )}
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
