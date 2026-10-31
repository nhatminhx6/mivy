'use client';
// Quản trị ví (chỉ admin — email nằm trong ADMIN_EMAILS của backend): tìm user, cộng/trừ tiền sau khi nhận chuyển khoản.

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KIND_LABEL, authApi, useAuth, type Me, type Tx } from '@/lib/auth';

export default function AdminPage() {
  const { me, ready } = useAuth();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<(Me & { created_at: string })[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = (query = q) => { authApi.adminUsers(query).then(setUsers).catch(() => null); authApi.adminTransactions().then(setTxs).catch(() => null); };
  useEffect(() => { if (me?.is_admin) load(''); }, [me?.is_admin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!me?.is_admin) return <div className="p-8 text-sm text-slate-400">Trang này chỉ dành cho admin.</div>;

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`${amount > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(amount)} đồng cho ${email}?`)) return;
    setBusy(true); setMsg(null);
    try { const r = await authApi.adminTopup(email, amount, note); setMsg({ ok: true, text: `Xong: ${r.email} còn ${r.balance} đồng.` }); setNote(''); load(); }
    catch (e2) { setMsg({ ok: false, text: e2 instanceof Error ? e2.message : 'Lỗi' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <PageHeader title="Quản trị ví" sub="Nhận chuyển khoản (nội dung MIVY <số tài khoản>) → cộng tiền cho đúng người. Số âm để trừ." />
      <form onSubmit={topup} className="glass-panel border border-white/10 rounded-2xl p-5 grid sm:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end" data-testid="admin-topup">
        <label className="block"><span className="mv-label">Email</span><input className="mv-input w-full mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><span className="mv-label">Số đồng</span><input className="mv-input w-full mt-1" type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        <label className="block"><span className="mv-label">Ghi chú</span><input className="mv-input w-full mt-1" placeholder="CK 100k ngày…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button type="submit" disabled={busy} className="mv-btn mv-btn-primary !flex justify-center disabled:opacity-60">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Cộng tiền</button>
        {msg && <p className={`sm:col-span-4 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
      </form>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-panel border border-white/10 rounded-2xl p-5 space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="flex gap-2">
            <input className="mv-input flex-1" placeholder="Tìm email…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="mv-btn mv-btn-ghost !px-3"><Search className="w-4 h-4" /></button>
          </form>
          <div className="divide-y divide-white/[0.06]">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => setEmail(u.email)} className="w-full flex items-center gap-3 py-2 text-xs text-left hover:bg-white/[0.03]">
                <span className="text-slate-500 w-10">#{u.id}</span>
                <span className="text-slate-200 flex-1 truncate">{u.email}{u.is_admin && ' · admin'}</span>
                <span className="font-bold text-white">{u.balance}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-panel border border-white/10 rounded-2xl p-5">
          <div className="text-sm font-bold text-white mb-3">Giao dịch gần đây</div>
          <div className="divide-y divide-white/[0.06]">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-2 text-xs">
                <span className="text-slate-500 w-24 shrink-0">{new Date(t.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="text-slate-300 flex-1 truncate" title={t.note}>{t.email} · {KIND_LABEL[t.kind]}</span>
                <span className={`font-bold ${t.amount > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
