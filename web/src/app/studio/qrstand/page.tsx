'use client';
// Kệ mica QR để bàn: chọn mục đích mã (chuyển khoản / menu / wifi / đánh giá, ghép được 2 mã) → chọn mẫu → điền nội dung
// → khổ thẻ + kiểu kệ (chữ L, chữ T, nghiêng đế gỗ) + số bàn → xem thành phẩm 3D trên bàn quán → tải PDF in / đặt in.
// Mã QR mã hoá ngay trên máy; ảnh QR ngân hàng khách tải lên chỉ nằm trên máy, không gửi đi đâu.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  QS_BANKS, QS_BLEED_MM, QS_FIELDS, QS_FONTS, QS_FONT_CSS, QS_LAYOUTS, QS_PALETTES, QS_PURPOSES, QS_SIZES, QS_STANDS, QS_TEMPLATES,
  QrCardSvg, defaultQSData, purposeOf, qrItem, qsSize, tableList, useQSFonts, type Purpose, type QSData, type QSSpec,
} from '@/lib/qrstand-engine';
import { svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: QSSpec = { layout: 'pay', palette: 'navy', font: 'montserrat', size: 'a6', stand: 'L', q1: 'bank', q2: 'none', table: false };

// ảnh QR ngân hàng của khách: thu nhỏ ≤1200px, giữ nét (PNG), chỉ nằm trên máy
async function loadImg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = k < 1; x.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function QrStandPage() {
  const ready = useQSFonts();
  const [spec, setSpec] = useState<QSSpec>(FIRST);
  const [data, setData] = useState<QSData>(defaultQSData());
  const [inviteTouched, setInviteTouched] = useState(false);
  const [bankImg, setBankImg] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const cardRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set = (p: Partial<QSSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { if (k === 'invite') setInviteTouched(true); setData((d) => ({ ...d, [k]: v })); };
  const setQ1 = (q: Purpose) => {
    set({ q1: q, q2: spec.q2 === q ? 'none' : spec.q2 });
    if (!inviteTouched) setData((d) => ({ ...d, invite: purposeOf(q).invite }));
  };
  const sz = qsSize(spec.size);
  const tables = useMemo(() => tableList(data, spec.table), [data, spec.table]);
  const purposes = [spec.q1, ...(spec.q2 !== 'none' ? [spec.q2] : [])];
  const slug = slugify(`ke-qr-${data.brand || ''}`, 'ke-qr');
  const ratio = `${sz.wMm} / ${sz.hMm}`;
  const stand = QS_STANDS.find((s) => s.id === spec.stand)!;
  const perStand = spec.stand === 'T' ? 2 : 1;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => {
    const list = Array.from(printRef.current?.querySelectorAll('svg') || []) as SVGSVGElement[];
    if (!list.length) throw new Error('Chưa dựng xong thẻ, thử lại nhé.');
    return list;
  };
  const pdfName = `${slug}-${sz.id}-${tables.length > 1 || tables[0] != null ? `${tables.length}-ban` : '1-the'}-file-in.pdf`;
  const downloadPng = () => run('png', async () => { const el = svgOf(cardRef); if (el) downloadBlob(await svgToPng(el, QS_FONT_CSS, 1600), `${slug}.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await svgsToPrintPdf(printSvgs(), QS_FONT_CSS, sz, QS_BLEED_MM), pdfName));

  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const makeFiles = async () => {
    const pv = svgOf(cardRef);
    if (!pv) throw new Error('Chưa dựng xong thẻ, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, QS_FONT_CSS, 900))
      : svgToJpeg(pv, QS_FONT_CSS, 900);
    const [file, pre] = await Promise.all([svgsToPrintPdf(printSvgs(), QS_FONT_CSS, sz, QS_BLEED_MM), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/qrstand-3d').then((m) => m.qrstandBuilder({ card: svgOf(cardRef), wMm: sz.wMm, hMm: sz.hMm, stand: spec.stand, fontCss: QS_FONT_CSS }));
  // dev: QC chụp ảnh 3D lớn để soi / quét thử mã
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __qsSnap?: (w: number, h: number) => Promise<string> }).__qsSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); }; // góc mặc định

  const nTables = tables[0] == null ? 0 : tables.length;
  const orderTitle = `Kệ mica QR ${stand.name} · thẻ ${sz.name} · ${purposes.map((q) => purposeOf(q).name).join(' + ')}${nTables ? ` · ${nTables} bàn` : ''}`;

  const onBankImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setBankImg(await loadImg(f)); } catch { alert('Không đọc được ảnh này, thử ảnh PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = QS_FIELDS.filter((f) => !f.for || purposes.includes(f.for));
  const item1 = qrItem(spec.q1, data);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Kệ mica QR để bàn" sub="QR chuyển khoản, gọi món, wifi, đánh giá — chọn mẫu, điền thông tin, có số bàn. Mã QR tạo ngay trên máy, quét được bằng mọi app ngân hàng. Tải PDF in hoặc đặt Mivy in + làm kệ mica." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title="1 · Mã QR dùng để làm gì?">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Mã chính</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="qs-q1">
                    {QS_PURPOSES.map((q) => <button key={q.id} type="button" onClick={() => setQ1(q.id)} className={chip(spec.q1 === q.id)}>{q.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ghép thêm mã thứ 2 (tuỳ chọn)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="qs-q2">
                    <button type="button" onClick={() => set({ q2: 'none' })} className={chip(spec.q2 === 'none')}>Không</button>
                    {QS_PURPOSES.filter((q) => q.id !== spec.q1).map((q) => <button key={q.id} type="button" onClick={() => set({ q2: q.id })} className={chip(spec.q2 === q.id)}>{q.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Chọn mẫu (${QS_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {QS_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="qs-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: ratio }}>
                        <QrCardSvg spec={{ ...spec, ...t.spec }} data={data} table={tables[0]} bankImg={bankImg} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-4">
                {purposes.includes('bank') && (
                  <div className="rounded-xl border border-mv-hair p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block col-span-2 sm:col-span-1">
                        <span className="mv-label block mb-1.5">Ngân hàng</span>
                        <select className="mv-input" value={data.bankBin} onChange={(e) => setField('bankBin', e.target.value)} data-testid="qs-bank">
                          {QS_BANKS.map((b) => <option key={b.bin} value={b.bin}>{b.name}</option>)}
                        </select>
                      </label>
                      <div className="col-span-2 sm:col-span-1 flex items-end gap-2">
                        <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !py-2 !text-xs" data-testid="qs-bankimg-btn">
                          <ImagePlus className="w-3.5 h-3.5" /> {bankImg ? 'Đổi ảnh QR' : 'Dùng ảnh QR của ngân hàng'}
                        </button>
                        {bankImg && <button type="button" onClick={() => setBankImg('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ</button>}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onBankImg} data-testid="qs-bankimg" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mivy tạo mã <b>VietQR</b> chuẩn từ ngân hàng + số tài khoản — mọi app ngân hàng quét ra đúng tài khoản, tự điền tên chủ TK.
                      Muốn dùng đúng mã trong app ngân hàng của anh chị: tải ảnh QR lên, hoặc dán chuỗi mã vào ô dưới (ảnh chỉ nằm trên máy, không gửi đi).
                    </p>
                    <label className="block">
                      <span className="mv-label block mb-1.5">Chuỗi mã QR từ app ngân hàng (nâng cao, tuỳ chọn)</span>
                      <input className="mv-input font-mono !text-xs" value={data.bankPayload || ''} onChange={(e) => setField('bankPayload', e.target.value)} placeholder="000201010211…" data-testid="qs-bankPayload" />
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`qs-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 break-all" data-testid="qs-payload">Mã chính chứa: <span className="font-mono">{bankImg && spec.q1 === 'bank' ? '(ảnh QR ngân hàng anh chị tải lên)' : item1.text}</span></div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ thẻ, kiểu kệ, số bàn, màu & font">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ thẻ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QS_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="qs-size">{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Kiểu kệ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QS_STANDS.map((s) => <button key={s.id} type="button" onClick={() => set({ stand: s.id })} className={chip(spec.stand === s.id)} title={s.note} data-testid="qs-stand">{s.name}</button>)}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">{stand.note}</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.table} onChange={(e) => set({ table: e.target.checked })} data-testid="qs-table" /> In số bàn trên thẻ
                  </label>
                  {spec.table && (
                    <>
                      <label className="block w-24"><span className="mv-label block mb-1">Từ bàn</span><input className="mv-input" inputMode="numeric" value={data.tableFrom} onChange={(e) => setField('tableFrom', e.target.value)} data-testid="qs-tableFrom" /></label>
                      <label className="block w-24"><span className="mv-label block mb-1">Đến bàn</span><input className="mv-input" inputMode="numeric" value={data.tableTo} onChange={(e) => setField('tableTo', e.target.value)} data-testid="qs-tableTo" /></label>
                      <span className="text-[11px] text-slate-500 pb-2">→ {tables.length} thẻ, mỗi bàn 1 số (tối đa 60)</span>
                    </>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="qs-palettes">
                    {QS_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QS_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tiêu đề</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="qs-fonts">
                      {QS_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, bankImg.length])} refitKey={`${spec.size}|${spec.stand}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div ref={cardRef} className="mx-auto max-w-[300px] rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="qs-card">
                <QrCardSvg spec={spec} data={data} table={tables[0]} bankImg={bankImg} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Thẻ {sz.name} · {stand.name} · {nTables ? `${nTables} bàn · ` : ''}in 300dpi · lề xén {QS_BLEED_MM}mm{perStand > 1 ? ' · 2 thẻ/kệ' : ''}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="qs-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="qs-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in{nTables > 1 ? ` (${nTables} thẻ)` : ''}
              </button>
            </div>
            <PrintRequest product="qrstand" title={orderTitle} design={{ spec, data: { ...data, bankPayload: data.bankPayload ? '(đã dán)' : '' }, hasBankImg: !!bankImg }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Quét thử mã trên màn hình bằng điện thoại trước khi in. File PDF đúng khổ thẻ, nền tràn lề xén + vạch cắt{nTables > 1 ? ', mỗi bàn 1 trang' : ''}.
              {perStand > 1 ? ' Kệ chữ T cần 2 thẻ/kệ (2 mặt) — đặt số lượng gấp đôi.' : ''}
            </p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) để xuất PDF — mỗi bàn 1 thẻ */}
      {ready && (
        <div aria-hidden ref={printRef} style={{ position: 'fixed', left: -100000, top: 0, width: 400, pointerEvents: 'none' }} data-testid="qs-print">
          {tables.map((t, i) => <QrCardSvg key={i} spec={spec} data={data} table={t} bankImg={bankImg} bleed style={{ width: '100%', display: 'block' }} />)}
        </div>
      )}
    </div>
  );
}
