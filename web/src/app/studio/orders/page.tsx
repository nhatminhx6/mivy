'use client';
// Đơn in của tôi: khách xem trạng thái từng đơn (mới gửi → báo giá → cọc → in mẫu → in → giao), giá, QR chuyển cọc.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { BANK, ORDER_STEPS, fmtVnd, orderApi, useAuth, vietQr, type PrintOrder } from '@/lib/auth';

export default function MyOrdersPage() {
  const { me, ready } = useAuth();
  const [orders, setOrders] = useState<PrintOrder[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (me) orderApi.mine().then(setOrders).catch((e) => setErr(e.message)); }, [me]);

  if (!ready) return null;
  if (!me) return (
    <div className="p-8 space-y-3">
      <p className="text-sm text-slate-400">Đăng nhập để xem đơn in của bạn.</p>
      <Link href="/login?next=/studio/orders" className="mv-btn mv-btn-primary !text-sm">Đăng nhập</Link>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-5">
      <PageHeader title="Đơn in của tôi" sub="Theo dõi đơn: báo giá, cọc, duyệt mẫu, giao hàng. Có gì cần gấp cứ nhắn Zalo cho Mivy." />
      {err && <p className="text-sm text-rose-400">{err}</p>}
      {!orders ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : orders.length === 0 ? (
        <div className="glass-panel border border-mv-hair rounded-2xl p-8 text-center space-y-3" data-testid="orders-empty">
          <Printer className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm text-slate-400">Chưa có đơn nào. Thiết kế thiệp, sticker hay móc khoá rồi bấm <b>Gửi yêu cầu in</b> nhé.</p>
          <Link href="/studio/cards" className="mv-btn mv-btn-primary !text-sm">Làm thiệp</Link>
        </div>
      ) : orders.map((o) => <OrderCard key={o.id} o={o} />)}
    </div>
  );
}

function OrderCard({ o }: { o: PrintOrder }) {
  const step = ORDER_STEPS.findIndex((s) => s.id === o.status);
  const cancelled = o.status === 'cancelled';
  const qr = o.status === 'quoted' && o.deposit ? vietQr(o.deposit, o.code) : null;
  return (
    <div className="glass-panel border border-mv-hair rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4" data-testid="order-card">
      <img src={orderApi.previewUrl(o.id)} alt="" className="w-full sm:w-36 h-40 sm:h-36 object-contain rounded-xl bg-[#EEF1F6] shrink-0" />
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-mv-fg">{o.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{o.code} · {o.quantity} cái{o.material && ` · ${o.material}`} · gửi {new Date(o.created_at).toLocaleDateString('vi-VN')}</div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cancelled ? 'bg-rose-500/10 text-rose-500' : o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-mv-accent-soft text-mv-accent'}`} data-testid="order-status">{o.status_label}</span>
        </div>
        {!cancelled && (
          <div className="flex items-center gap-1" aria-label="Tiến độ đơn">
            {ORDER_STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 min-w-0">
                <div className={`h-1.5 rounded-full ${i <= step ? 'bg-mv-accent' : 'bg-ink/10'}`} />
                <div className={`text-[10px] mt-1 truncate ${i === step ? 'text-mv-fg font-bold' : 'text-slate-500'}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span className="text-slate-400">Tổng: <b className="text-mv-fg">{o.price ? fmtVnd(o.price) : 'đang báo giá'}</b></span>
          {o.deposit != null && <span className="text-slate-400">Cọc: <b className="text-mv-fg">{fmtVnd(o.deposit)}</b></span>}
          {o.need_by && <span className="text-slate-400">Cần trước: <b className="text-mv-fg">{new Date(o.need_by).toLocaleDateString('vi-VN')}</b></span>}
        </div>
        {o.status === 'quoted' && o.deposit ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3" data-testid="order-deposit">
            {qr && <img src={qr} alt="QR chuyển khoản cọc" className="w-32 h-32 rounded-lg bg-white" />}
            <div className="text-xs text-slate-500 space-y-0.5">
              <div className="font-bold text-mv-fg">Chuyển cọc {fmtVnd(o.deposit)} để Mivy in mẫu</div>
              {BANK.account && <div>{BANK.name} · {BANK.account} · {BANK.owner}</div>}
              <div>Nội dung chuyển khoản: <b className="text-mv-fg">{o.code}</b></div>
            </div>
          </div>
        ) : null}
        <a href={orderApi.fileUrl(o.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-mv-accent hover:underline"><Download className="w-3.5 h-3.5" /> Tải file in</a>
      </div>
    </div>
  );
}
