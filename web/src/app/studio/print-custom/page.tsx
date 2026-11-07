'use client';
// Đặt in theo yêu cầu: khách KHÔNG cần dùng công cụ thiết kế của Mivy — tự tả cái cần in + tải file/ảnh tham khảo của họ
// → tạo đơn product="custom", tái dùng y nguyên backend đơn in + admin. Mivy báo giá qua Zalo, môi giới xưởng.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, LogIn, MessageCircle, Printer, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MIVY_ZALO, mivyZaloLink, orderApi, useAuth, type PrintOrder } from '@/lib/auth';

const ACCEPT = '.pdf,.svg,.png,.jpg,.jpeg,.webp,.heic,.ai,.psd,.cdr,.eps,.tif,.tiff,.zip';
const EXT_OK = ACCEPT.split(',');
const MAX_MB = 40;
const QTY = [1, 10, 50, 100, 300, 500];
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const isImage = (f: File) => /^image\//.test(f.type) && f.size <= 6 * 1024 * 1024;

export default function PrintCustomPage() {
  const { me, ready, refresh } = useAuth();
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [needBy, setNeedBy] = useState(plusDays(10));
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<PrintOrder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (me) { setName((n) => n || me.name); setPhone((p) => p || me.phone || ''); } }, [me]);

  const pick = (f?: File | null) => {
    if (!f) return;
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!EXT_OK.includes(ext)) { setErr('File chưa hỗ trợ. Nhận PDF, SVG, ảnh, AI, PSD, CDR, EPS, ZIP.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`File tối đa ${MAX_MB}MB.`); return; }
    setErr(''); setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr('Tải lên file in hoặc ảnh tham khảo giúp Mivy nhé.'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries({
        product: 'custom', title: title.trim() || 'Đặt in theo yêu cầu', quantity: String(qty),
        material: '', contact_name: name, phone, address, need_by: needBy, note, design: '',
      }).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file, file.name);
      if (isImage(file)) fd.append('preview', file, 'preview.jpg');
      setDone(await orderApi.create(fd));
      refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); } finally { setBusy(false); }
  };

  if (!ready) return <div className="p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <PageHeader title="Đặt in theo yêu cầu" sub="Cần in thứ chưa có trong Studio? Tả nhu cầu + tải file/ảnh của bạn — Mivy báo giá qua Zalo và lo xưởng in." />

      {done ? (
        <div className="glass-panel border border-mv-hair rounded-2xl p-8 text-center space-y-3" data-testid="custom-done">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="text-lg font-bold text-mv-fg">Đã gửi yêu cầu · mã đơn <span data-testid="custom-code">{done.code}</span></div>
          <p className="text-sm text-slate-400 leading-relaxed">Mivy sẽ nhắn báo giá qua Zalo <b>{done.phone}</b> trong ngày. Theo dõi đơn ở mục <b>Đơn in của tôi</b>.</p>
          <div className="flex gap-2 justify-center pt-1">
            <button type="button" onClick={() => { setDone(null); setFile(null); setTitle(''); setNote(''); }} className="mv-btn mv-btn-ghost !text-sm">Gửi yêu cầu khác</button>
            <Link href="/studio/orders" className="mv-btn mv-btn-primary !text-sm">Xem đơn của tôi</Link>
          </div>
        </div>
      ) : !me ? (
        <div className="glass-panel border border-mv-hair rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-300">Đăng nhập để gửi yêu cầu in và theo dõi đơn.</p>
          <Link href="/login?next=/studio/print-custom" className="mv-btn mv-btn-primary !inline-flex"><LogIn className="w-4 h-4" /> Đăng nhập</Link>
          {mivyZaloLink && <p className="text-xs text-slate-400">Hoặc nhắn thẳng Zalo Mivy: <a href={mivyZaloLink} target="_blank" rel="noopener noreferrer" className="text-indigo-300 font-semibold">{MIVY_ZALO}</a></p>}
        </div>
      ) : (
        <form onSubmit={submit} className="glass-panel border border-mv-hair rounded-2xl p-5 sm:p-6 space-y-4" data-testid="custom-form">
          <label className="block"><span className="mv-label block mb-1.5">Bạn cần in gì?</span>
            <input className="mv-input" required placeholder="VD: Hộp giấy đựng trà, standee sự kiện, tem dán ly…" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="custom-title" /></label>

          <label className="block"><span className="mv-label block mb-1.5">Mô tả chi tiết</span>
            <textarea className="mv-input min-h-[88px] resize-y" placeholder="Kích thước, chất liệu mong muốn, màu, số mặt in, cán màng/bo góc… Càng rõ Mivy báo giá càng nhanh." value={note} onChange={(e) => setNote(e.target.value)} data-testid="custom-note" /></label>

          <div>
            <span className="mv-label block mb-1.5">Số lượng</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {QTY.map((n) => (
                <button key={n} type="button" onClick={() => setQty(n)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${qty === n ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300'}`}>{n}</button>
              ))}
              <input type="number" min={1} max={100000} required className="mv-input !w-24 !py-1.5" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Số lượng khác" data-testid="custom-qty" />
            </div>
          </div>

          <div>
            <span className="mv-label block mb-1.5">File in / ảnh tham khảo</span>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="custom-file-input" />
            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-mv-hair bg-ink/[0.03] px-3 py-2.5" data-testid="custom-file">
                <span className="text-sm text-mv-fg truncate flex items-center gap-2"><FileUp className="w-4 h-4 text-indigo-300 shrink-0" />{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-slate-400 hover:text-mv-fg shrink-0" aria-label="Bỏ file"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-mv-hair hover:border-indigo-400/60 px-4 py-6 text-center text-sm text-slate-400" data-testid="custom-file-btn">
                <FileUp className="w-5 h-5 mx-auto mb-1.5 text-slate-500" /> Bấm để tải lên
                <span className="block text-[11px] text-slate-500 mt-1">PDF, SVG, ảnh, AI, PSD, CDR, EPS, ZIP · tối đa {MAX_MB}MB</span>
              </button>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5">Chưa có file cũng được — tải 1 ảnh mẫu bạn thích, Mivy dựng lại giúp.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mv-label block mb-1.5">Tên người nhận</span>
              <input className="mv-input" required value={name} onChange={(e) => setName(e.target.value)} data-testid="custom-name" /></label>
            <label className="block"><span className="mv-label block mb-1.5">SĐT / Zalo</span>
              <input className="mv-input" required inputMode="tel" placeholder="0909 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="custom-phone" /></label>
          </div>
          <label className="block"><span className="mv-label block mb-1.5">Địa chỉ giao (TP.HCM)</span>
            <input className="mv-input" placeholder="Số nhà, đường, phường, quận" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="custom-address" /></label>
          <label className="block"><span className="mv-label block mb-1.5">Cần nhận trước ngày</span>
            <input className="mv-input !w-48" type="date" min={plusDays(3)} value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></label>

          <div className="rounded-xl bg-ink/[0.03] border border-mv-hair px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
            Mivy báo giá qua <b>Zalo trong ngày</b> → bạn chuyển cọc → in <b>mẫu cho bạn duyệt</b> trước khi in số lượng lớn. Hiện chỉ giao trong TP.HCM.
          </div>
          {err && <p className="text-xs text-rose-400" data-testid="custom-error">{err}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={busy} className="mv-btn mv-btn-primary flex-1 !flex justify-center !py-3 disabled:opacity-70" data-testid="custom-submit">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi…</> : <><Printer className="w-4 h-4" /> Gửi yêu cầu — nhận báo giá miễn phí</>}
            </button>
            {mivyZaloLink && (
              <a href={mivyZaloLink} target="_blank" rel="noopener noreferrer" className="mv-btn mv-btn-ghost !flex justify-center !py-3" data-testid="custom-zalo"><MessageCircle className="w-4 h-4" /> Nhắn Zalo</a>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
