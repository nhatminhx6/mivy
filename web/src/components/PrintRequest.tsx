'use client';
// Nút "Gửi yêu cầu in" + hộp đặt in: chưa đăng nhập thì đăng ký/đăng nhập NGAY trong hộp (không rời trang → không mất
// thiết kế) → điền số lượng, chất liệu, SĐT/Zalo, ngày cần → gửi kèm file in + ảnh xem trước. Admin báo giá qua Zalo.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Printer, X } from 'lucide-react';
import { authApi, orderApi, useAuth, type PrintOrder, type PrintProduct } from '@/lib/auth';

const QTY: Record<PrintProduct, number[]> = {
  card: [50, 100, 200, 300, 500],
  sticker: [50, 100, 200, 500, 1000],
  keychain: [10, 20, 50, 100, 200],
  hashtag: [1, 2, 5, 10, 20],
  custom: [1, 10, 50, 100, 500],
};
const MATERIALS: Record<PrintProduct, string[]> = {
  card: ['Giấy mỹ thuật (sang, dày)', 'Giấy couche (bóng, rẻ)', 'Giấy kraft (mộc)', 'Chưa biết — tư vấn giúp'],
  sticker: ['Decal giấy', 'Decal nhựa (chống nước)', 'Decal trong', 'Chưa biết — tư vấn giúp'],
  keychain: ['Mica trong 3mm', 'Mica trắng 3mm', 'Chưa biết — tư vấn giúp'],
  hashtag: ['Formex 5mm (cứng, nhẹ)', 'Formex 3mm (rẻ)', 'Mica trắng 3mm (bền)', 'Chưa biết — tư vấn giúp'],
  custom: ['Chưa biết — tư vấn giúp'],
};
const plusDays = (n: number) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };

export interface PrintFiles { file: Blob; fileName: string; preview: Blob }

export function PrintRequest({ product, title, defaultMaterial, design, makeFiles }: {
  product: PrintProduct; title: string; defaultMaterial?: string; design: unknown; makeFiles: () => Promise<PrintFiles>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm" data-testid="print-request">
        <Printer className="w-4 h-4" /> Gửi yêu cầu in
      </button>
      {open && <Dialog onClose={() => setOpen(false)} {...{ product, title, defaultMaterial, design, makeFiles }} />}
    </>
  );
}

function Dialog({ product, title, defaultMaterial, design, makeFiles, onClose }: {
  product: PrintProduct; title: string; defaultMaterial?: string; design: unknown; makeFiles: () => Promise<PrintFiles>; onClose: () => void;
}) {
  const { me, ready, refresh } = useAuth();
  const [qty, setQty] = useState(QTY[product][1]);
  const [material, setMaterial] = useState(defaultMaterial && MATERIALS[product].includes(defaultMaterial) ? defaultMaterial : MATERIALS[product][0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [needBy, setNeedBy] = useState(plusDays(10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<PrintOrder | null>(null);

  useEffect(() => { if (me) { setName((n) => n || me.name); setPhone((p) => p || me.phone || ''); } }, [me]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const f = await makeFiles();
      const fd = new FormData();
      Object.entries({ product, title, quantity: String(qty), material, contact_name: name, phone, address, need_by: needBy, note, design: JSON.stringify(design) })
        .forEach(([k, v]) => fd.append(k, v));
      fd.append('file', f.file, f.fileName);
      fd.append('preview', f.preview, 'preview.jpg');
      setDone(await orderApi.create(fd));
      refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/50 p-0 sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-mv-surface rounded-t-2xl sm:rounded-2xl border border-mv-hair shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Gửi yêu cầu in" data-testid="print-dialog">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-mv-fg">Gửi yêu cầu in</div>
            <div className="text-xs text-slate-400 mt-0.5">{title}</div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-slate-400 hover:text-mv-fg" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        {!ready ? <div className="h-32 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          : done ? <Done order={done} onClose={onClose} />
            : !me ? <MiniAuth onDone={refresh} />
              : (
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <span className="mv-label block mb-1.5">Số lượng</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {QTY[product].map((n) => (
                        <button key={n} type="button" onClick={() => setQty(n)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${qty === n ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300'}`}>{n}</button>
                      ))}
                      <input type="number" min={1} max={100000} required className="mv-input !w-24 !py-1.5" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Số lượng khác" data-testid="print-qty" />
                    </div>
                  </div>
                  <label className="block"><span className="mv-label block mb-1.5">Chất liệu</span>
                    <select className="mv-input" value={material} onChange={(e) => setMaterial(e.target.value)} data-testid="print-material">
                      {MATERIALS[product].map((m) => <option key={m}>{m}</option>)}
                    </select></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mv-label block mb-1.5">Tên người nhận</span>
                      <input className="mv-input" required value={name} onChange={(e) => setName(e.target.value)} data-testid="print-name" /></label>
                    <label className="block"><span className="mv-label block mb-1.5">SĐT / Zalo</span>
                      <input className="mv-input" required inputMode="tel" placeholder="0909 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="print-phone" /></label>
                  </div>
                  <label className="block"><span className="mv-label block mb-1.5">Địa chỉ giao (TP.HCM)</span>
                    <input className="mv-input" placeholder="Số nhà, đường, phường, quận" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="print-address" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mv-label block mb-1.5">Cần nhận trước ngày</span>
                      <input className="mv-input" type="date" min={plusDays(3)} value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></label>
                    <label className="block"><span className="mv-label block mb-1.5">Ghi chú</span>
                      <input className="mv-input" placeholder="Cán màng, bo góc…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
                  </div>
                  <div className="rounded-xl bg-ink/[0.03] border border-mv-hair px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
                    File in đúng chuẩn được gửi kèm tự động. Mivy báo giá qua <b>Zalo trong ngày</b> → bạn chuyển cọc → in <b>mẫu cho bạn duyệt</b> trước khi in số lượng lớn. Hiện chỉ giao trong TP.HCM.
                  </div>
                  {err && <p className="text-xs text-rose-400" data-testid="print-error">{err}</p>}
                  <button type="submit" disabled={busy} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 disabled:opacity-70" data-testid="print-submit">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo file in & gửi…</> : 'Gửi yêu cầu — nhận báo giá miễn phí'}
                  </button>
                </form>
              )}
      </div>
    </div>
  );
}

function MiniAuth({ onDone }: { onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'register') await authApi.register(email, password, name, phone); else await authApi.login(email, password);
      await onDone();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="print-auth">
      <p className="text-xs text-slate-400">Tạo tài khoản (30 giây) để Mivy gửi báo giá và bạn theo dõi đơn. Thiết kế đang làm vẫn giữ nguyên.</p>
      <div className="mv-seg flex">
        <button type="button" onClick={() => { setMode('register'); setErr(''); }} data-active={mode === 'register'} className="mv-seg-btn flex-1 !justify-center">Tạo tài khoản</button>
        <button type="button" onClick={() => { setMode('login'); setErr(''); }} data-active={mode === 'login'} className="mv-seg-btn flex-1 !justify-center">Đã có tài khoản</button>
      </div>
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mv-label block mb-1.5">Tên</span><input className="mv-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-testid="auth-name" /></label>
          <label className="block"><span className="mv-label block mb-1.5">SĐT / Zalo</span><input className="mv-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" data-testid="auth-phone" /></label>
        </div>
      )}
      <label className="block"><span className="mv-label block mb-1.5">Email</span><input className="mv-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" /></label>
      <label className="block"><span className="mv-label block mb-1.5">Mật khẩu</span><input className="mv-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} data-testid="auth-password" /></label>
      {err && <p className="text-xs text-rose-400" data-testid="auth-error">{err}</p>}
      <button type="submit" disabled={busy} className="mv-btn mv-btn-primary w-full !flex justify-center !py-2.5 disabled:opacity-70" data-testid="auth-submit">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'register' ? 'Tạo tài khoản & tiếp tục' : 'Đăng nhập & tiếp tục'}
      </button>
    </form>
  );
}

function Done({ order, onClose }: { order: PrintOrder; onClose: () => void }) {
  return (
    <div className="text-center space-y-3 py-2" data-testid="print-done">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
      <div className="text-base font-bold text-mv-fg">Đã gửi yêu cầu · mã đơn <span data-testid="print-code">{order.code}</span></div>
      <p className="text-xs text-slate-400 leading-relaxed">Mivy sẽ nhắn báo giá qua Zalo <b>{order.phone}</b> trong ngày. Bạn xem trạng thái đơn bất cứ lúc nào ở mục <b>Đơn in của tôi</b>.</p>
      <div className="flex gap-2 justify-center pt-1">
        <button type="button" onClick={onClose} className="mv-btn mv-btn-ghost !text-xs">Tiếp tục thiết kế</button>
        <Link href="/studio/orders" className="mv-btn mv-btn-primary !text-xs">Xem đơn của tôi</Link>
      </div>
    </div>
  );
}
