'use client';
// Quản trị (chỉ admin — email nằm trong ADMIN_EMAILS của backend):
// - Đơn in: xem file, báo giá + cọc, đổi trạng thái, ghi chú xưởng; nhắn Zalo/gọi khách 1 chạm
// - Khách hàng: danh sách khách, số đơn, tổng chi, ghi chú chăm sóc
// - Ví: cộng/trừ tiền sau khi nhận chuyển khoản

import { useEffect, useState } from 'react';
import { Download, Loader2, MessageCircle, Phone, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  KIND_LABEL, ORDER_STEPS, STATUS_LABEL, authApi, fmtVnd, orderApi, useAuth, zaloLink,
  type Customer, type Me, type OrderStatus, type PrintOrder, type Tx,
} from '@/lib/auth';

type Tab = 'orders' | 'customers' | 'wallet';
const TABS: { id: Tab; name: string }[] = [{ id: 'orders', name: 'Đơn in' }, { id: 'customers', name: 'Khách hàng' }, { id: 'wallet', name: 'Ví' }];
const ALL_STATUS: OrderStatus[] = [...ORDER_STEPS.map((s) => s.id), 'cancelled'];

export default function AdminPage() {
  const { me, ready } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');
  if (!ready) return null;
  if (!me?.is_admin) return <div className="p-8 text-sm text-slate-400">Trang này chỉ dành cho admin.</div>;
  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-6xl">
      <PageHeader title="Quản trị" sub="Đơn in, khách hàng, ví." />
      <div className="mv-seg" role="tablist">
        {TABS.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} data-active={tab === t.id} className="mv-seg-btn" data-testid={`admin-tab-${t.id}`}>{t.name}</button>)}
      </div>
      {tab === 'orders' ? <OrdersTab /> : tab === 'customers' ? <CustomersTab /> : <WalletTab />}
    </div>
  );
}

function ContactLinks({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <a href={zaloLink(phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-mv-accent font-bold hover:underline"><MessageCircle className="w-3.5 h-3.5" /> Zalo</a>
      <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-mv-accent font-bold hover:underline"><Phone className="w-3.5 h-3.5" /> {phone}</a>
    </span>
  );
}

// ---------- Đơn in ----------
function OrdersTab() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PrintOrder[] | null>(null);
  const load = (s = status, query = q) => orderApi.adminList(s, query).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['', ...ALL_STATUS] as const).map((s) => (
          <button key={s || 'all'} type="button" onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${status === s ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-400'}`}>{s ? STATUS_LABEL[s] : 'Tất cả'}</button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 ml-auto">
          <input className="mv-input !py-1.5 !text-xs !w-56" placeholder="Mã đơn, SĐT, tên, email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="mv-btn mv-btn-ghost !px-3"><Search className="w-4 h-4" /></button>
        </form>
      </div>
      {!rows ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : rows.length === 0 ? <p className="text-sm text-slate-400">Chưa có đơn.</p>
        : rows.map((o) => <AdminOrder key={o.id} o={o} onSaved={(n) => setRows((r) => r!.map((x) => (x.id === n.id ? { ...x, ...n } : x)))} />)}
    </div>
  );
}

function AdminOrder({ o, onSaved }: { o: PrintOrder; onSaved: (o: PrintOrder) => void }) {
  const [st, setSt] = useState<OrderStatus>(o.status);
  const [price, setPrice] = useState(o.price?.toString() || '');
  const [deposit, setDeposit] = useState(o.deposit?.toString() || '');
  const [note, setNote] = useState(o.admin_note || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dirty = st !== o.status || price !== (o.price?.toString() || '') || deposit !== (o.deposit?.toString() || '') || note !== (o.admin_note || '');
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/\D/g, '')))));
  const save = async () => {
    setBusy(true); setMsg('');
    try { onSaved(await orderApi.adminUpdate(o.id, { status: st, price: num(price), deposit: num(deposit), admin_note: note })); setMsg('Đã lưu'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Lỗi'); } finally { setBusy(false); }
  };
  // điền nhanh cọc 50%
  const half = () => { const p = num(price); if (p) setDeposit(String(Math.round(p / 2 / 1000) * 1000)); };
  return (
    <div className="glass-panel border border-mv-hair rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,320px)] gap-4" data-testid="admin-order">
      <a href={orderApi.previewUrl(o.id)} target="_blank" rel="noreferrer"><img src={orderApi.previewUrl(o.id)} alt="" className="w-full h-36 object-contain rounded-xl bg-[#EEF1F6]" /></a>
      <div className="min-w-0 space-y-1.5 text-xs">
        <div className="text-sm font-bold text-mv-fg">{o.code} · {o.title}</div>
        <div className="text-slate-400"><b className="text-mv-fg">{o.quantity} cái</b>{o.material && ` · ${o.material}`} · gửi {new Date(o.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div className="text-slate-400">Khách: <b className="text-mv-fg">{o.contact_name || '—'}</b> · {o.email} · <ContactLinks phone={o.phone} /></div>
        {o.address && <div className="text-slate-400">Giao: {o.address}</div>}
        {o.need_by && <div className="text-slate-400">Cần trước: <b className="text-mv-fg">{new Date(o.need_by).toLocaleDateString('vi-VN')}</b></div>}
        {o.note && <div className="text-slate-400">Khách ghi chú: <span className="text-mv-fg">{o.note}</span></div>}
        <a href={orderApi.fileUrl(o.id)} className="inline-flex items-center gap-1.5 font-bold text-mv-accent hover:underline pt-1"><Download className="w-3.5 h-3.5" /> Tải file in ({o.file_name.split('.').pop()?.toUpperCase()})</a>
      </div>
      <div className="space-y-2">
        <select className="mv-input !py-2 !text-xs" value={st} onChange={(e) => setSt(e.target.value as OrderStatus)} aria-label="Trạng thái" data-testid="admin-order-status">
          {ALL_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="mv-label block mb-1">Tổng tiền (đ)</span><input className="mv-input !py-1.5 !text-xs" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="admin-order-price" /></label>
          <div>
            <div className="flex justify-between mb-1"><label htmlFor={`dep-${o.id}`} className="mv-label">Cọc (đ)</label><button type="button" onClick={half} className="text-[11px] font-bold text-mv-accent">50%</button></div>
            <input id={`dep-${o.id}`} className="mv-input !py-1.5 !text-xs" inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} data-testid="admin-order-deposit" />
          </div>
        </div>
        <textarea className="mv-input !text-xs min-h-[52px]" rows={2} placeholder="Ghi chú nội bộ: xưởng nào, giá gốc…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={busy || !dirty} className="mv-btn mv-btn-primary !py-1.5 !text-xs disabled:opacity-50" data-testid="admin-order-save">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Lưu</button>
          <span className="text-[11px] text-slate-400">{msg || (o.price ? `${fmtVnd(o.price)} · cọc ${fmtVnd(o.deposit)}` : '')}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Khách hàng ----------
function CustomersTab() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Customer[] | null>(null);
  const load = (query = q) => orderApi.customers(query).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 max-w-sm">
        <input className="mv-input flex-1" placeholder="Tìm tên, SĐT, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="mv-btn mv-btn-ghost !px-3"><Search className="w-4 h-4" /></button>
      </form>
      {!rows ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
        <div className="glass-panel border border-mv-hair rounded-2xl divide-y divide-mv-hair">
          {rows.map((c) => <CustomerRow key={c.id} c={c} />)}
          {rows.length === 0 && <p className="p-4 text-sm text-slate-400">Không có khách nào.</p>}
        </div>
      )}
    </div>
  );
}

function CustomerRow({ c }: { c: Customer }) {
  const [note, setNote] = useState(c.note);
  const [phone, setPhone] = useState(c.phone);
  const [saved, setSaved] = useState({ note: c.note, phone: c.phone });
  const [busy, setBusy] = useState(false);
  const dirty = note !== saved.note || phone !== saved.phone;
  const save = async () => {
    setBusy(true);
    try { const r = await orderApi.updateCustomer(c.id, { note, phone }); setSaved({ note: r.note, phone: r.phone }); setPhone(r.phone); }
    catch (e) { alert(e instanceof Error ? e.message : 'Lỗi'); } finally { setBusy(false); }
  };
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 text-xs" data-testid="admin-customer">
      <div className="space-y-1 min-w-0">
        <div className="text-sm font-bold text-mv-fg truncate">{c.name || '(chưa có tên)'} <span className="font-normal text-slate-400">· {c.email}</span></div>
        <div className="text-slate-400">{c.orders} đơn · đã chi <b className="text-mv-fg">{fmtVnd(c.total)}</b>{c.last_order_at && ` · đơn gần nhất ${new Date(c.last_order_at).toLocaleDateString('vi-VN')}`} · tham gia {new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
        <div className="flex items-center gap-2"><input className="mv-input !py-1 !text-xs !w-36" placeholder="SĐT / Zalo" value={phone} onChange={(e) => setPhone(e.target.value)} /><ContactLinks phone={saved.phone} /></div>
      </div>
      <div className="flex gap-2 items-start">
        <textarea className="mv-input !text-xs min-h-[52px] flex-1" rows={2} placeholder="Ghi chú chăm sóc: khách quen, thích giấy gì, dịp sắp tới…" value={note} onChange={(e) => setNote(e.target.value)} data-testid="admin-customer-note" />
        <button type="button" onClick={save} disabled={busy || !dirty} className="mv-btn mv-btn-ghost !py-1.5 !text-xs disabled:opacity-40">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lưu'}</button>
      </div>
    </div>
  );
}

// ---------- Ví (giữ như cũ) ----------
function WalletTab() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<(Me & { created_at: string })[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = (query = q) => { authApi.adminUsers(query).then(setUsers).catch(() => null); authApi.adminTransactions().then(setTxs).catch(() => null); };
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`${amount > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(amount)} đồng cho ${email}?`)) return;
    setBusy(true); setMsg(null);
    try { const r = await authApi.adminTopup(email, amount, note); setMsg({ ok: true, text: `Xong: ${r.email} còn ${r.balance} đồng.` }); setNote(''); load(); }
    catch (e2) { setMsg({ ok: false, text: e2 instanceof Error ? e2.message : 'Lỗi' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Nhận chuyển khoản (nội dung MIVY &lt;số tài khoản&gt;) → cộng tiền cho đúng người. Số âm để trừ.</p>
      <form onSubmit={topup} className="glass-panel border border-mv-hair rounded-2xl p-5 grid sm:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end" data-testid="admin-topup">
        <label className="block"><span className="mv-label">Email</span><input className="mv-input w-full mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><span className="mv-label">Số đồng</span><input className="mv-input w-full mt-1" type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        <label className="block"><span className="mv-label">Ghi chú</span><input className="mv-input w-full mt-1" placeholder="CK 100k ngày…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button type="submit" disabled={busy} className="mv-btn mv-btn-primary !flex justify-center disabled:opacity-60">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Cộng tiền</button>
        {msg && <p className={`sm:col-span-4 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
      </form>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-panel border border-mv-hair rounded-2xl p-5 space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="flex gap-2">
            <input className="mv-input flex-1" placeholder="Tìm email…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="mv-btn mv-btn-ghost !px-3"><Search className="w-4 h-4" /></button>
          </form>
          <div className="divide-y divide-mv-hair">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => setEmail(u.email)} className="w-full flex items-center gap-3 py-2 text-xs text-left hover:bg-ink/[0.03]">
                <span className="text-slate-500 w-10">#{u.id}</span>
                <span className="text-slate-200 flex-1 truncate">{u.email}{u.is_admin && ' · admin'}</span>
                <span className="font-bold text-mv-fg">{u.balance}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-panel border border-mv-hair rounded-2xl p-5">
          <div className="text-sm font-bold text-mv-fg mb-3">Giao dịch gần đây</div>
          <div className="divide-y divide-mv-hair">
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
