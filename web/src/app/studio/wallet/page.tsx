'use client';
// Ví đồng Mivy: số dư, hướng dẫn nạp (chuyển khoản → admin cộng tay), lịch sử giao dịch.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy, LogIn, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { BANK, KIND_LABEL, authApi, fmtDong, useAuth, type Tx } from '@/lib/auth';

const PACKS = [50, 100, 200, 500]; // đồng = nghìn đồng
const BANK_ID = process.env.NEXT_PUBLIC_BANK_ID || ''; // mã ngân hàng VietQR, vd vcb, mbbank, tcb

export default function WalletPage() {
  const { me, ready, refresh } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pack, setPack] = useState(100);
  const [copied, setCopied] = useState('');
  useEffect(() => { if (me) { authApi.transactions().then(setTxs).catch(() => null); refresh(); } }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!me) return (
    <div className="p-6 lg:p-8"><div className="glass-panel border border-white/10 rounded-2xl p-10 text-center space-y-3">
      <p className="text-sm text-slate-300">Đăng nhập để xem ví và nạp tiền.</p>
      <Link href="/login?next=/studio/wallet" className="mv-btn mv-btn-primary !inline-flex"><LogIn className="w-4 h-4" /> Đăng nhập</Link>
    </div></div>
  );

  const memo = `MIVY ${me.id}`;
  const copy = (k: string, v: string) => { navigator.clipboard?.writeText(v).catch(() => null); setCopied(k); setTimeout(() => setCopied(''), 1500); };
  const price = me.prices?.tryon ?? 2;
  const row = (k: string, label: string, v: string) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <button type="button" onClick={() => copy(k, v)} className="text-sm font-semibold text-white flex items-center gap-1.5 hover:text-indigo-200">{v} <Copy className="w-3.5 h-3.5 text-slate-500" />{copied === k && <span className="text-[10px] text-emerald-300">đã chép</span>}</button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <PageHeader title="Ví của tôi" sub="1 đồng Mivy = 1.000đ. Công cụ thiết kế miễn phí; chỉ tính năng AI mới trừ tiền." />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-panel border border-amber-500/30 bg-amber-500/[0.05] rounded-2xl p-5 space-y-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-amber-300" /> Số dư</div>
          <div className="text-3xl font-black text-white" data-testid="wallet-balance">{fmtDong(me.balance)}</div>
          <div className="text-xs text-slate-400">≈ {Math.floor(me.balance / price)} lượt Người mẫu AI ({price} đồng / lượt)</div>
        </div>
        <div className="glass-panel border border-white/10 rounded-2xl p-5 space-y-3" data-testid="wallet-topup">
          <div className="text-sm font-bold text-white">Nạp tiền bằng chuyển khoản</div>
          <div className="flex flex-wrap gap-1.5">{PACKS.map((p) => <button key={p} type="button" onClick={() => setPack(p)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${pack === p ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white'}`}>{p}k → {p} đồng</button>)}</div>
          {BANK_ID && BANK.account && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://img.vietqr.io/image/${BANK_ID}-${BANK.account}-compact2.png?amount=${pack * 1000}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK.owner)}`} alt="Mã QR chuyển khoản" className="w-44 h-44 rounded-xl bg-white mx-auto" />
          )}
          <div>
            {BANK.name && row('bank', 'Ngân hàng', BANK.name)}
            {BANK.account && row('acc', 'Số tài khoản', BANK.account)}
            {BANK.owner && row('owner', 'Chủ tài khoản', BANK.owner)}
            {row('amount', 'Số tiền', `${(pack * 1000).toLocaleString('vi-VN')}đ`)}
            {row('memo', 'Nội dung (bắt buộc)', memo)}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">Ghi đúng nội dung <b className="text-slate-200">{memo}</b> để Mivy cộng đúng tài khoản. Tiền được cộng trong vài giờ (giờ hành chính).{BANK.contact && <> Cần gấp: {BANK.contact}</>}</p>
        </div>
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl p-5">
        <div className="text-sm font-bold text-white mb-3">Lịch sử</div>
        {txs.length ? (
          <div className="divide-y divide-white/[0.06]" data-testid="wallet-history">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 text-xs">
                <span className="text-slate-500 w-32 shrink-0">{new Date(t.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="text-slate-300 flex-1 truncate">{KIND_LABEL[t.kind]}{t.note && (t.kind === 'charge' || t.kind === 'topup') ? ` · ${t.note.split(' · ')[0]}` : ''}</span>
                <span className={`font-bold w-20 text-right ${t.amount > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                <span className="text-slate-500 w-16 text-right">{t.balance_after}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-slate-500">Chưa có giao dịch.</p>}
      </div>
    </div>
  );
}
