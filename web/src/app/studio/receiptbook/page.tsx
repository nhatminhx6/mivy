'use client';
// Hoá đơn · phiếu thu/chi · phiếu giao hàng · phiếu bảo hành (liên carbonless, đóng cuốn, số nhảy):
// chọn loại phiếu → mẫu → điền thông tin cửa hàng → số liên/khổ/số dòng → tải PDF in (mỗi liên 1 trang + trang thông số
// gửi xưởng) hoặc gửi yêu cầu in. Render code 100%.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  RB_BLEED_MM, RB_FIELDS, RB_FONTS, RB_FONT_CSS, RB_PALETTES, RB_PAPER, RB_PAPER_NAME, RB_SIZES, RB_TEMPLATES, RB_TYPES,
  ReceiptFormSvg, SpecNoteSvg, defaultRBData, lienLabel, rbHasTable, rbNumber, rbSize, rbType, useRBFonts,
  type RBData, type RBSpec, type RBType,
} from '@/lib/receiptbook-engine';
import { svgFileBlob, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: RBSpec = { layout: 'band', palette: 'navy', font: 'bvp', size: 'a5d', parts: 2, rows: 10, perBook: 50, books: 10 };

// logo khách: thu nhỏ ≤600px ngay trên máy (không gửi đi đâu)
async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const s = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function ReceiptBookPage() {
  const ready = useRBFonts();
  const [type, setType] = useState<RBType>('invoice');
  const [spec, setSpec] = useState<RBSpec>(FIRST);
  const [data, setData] = useState<RBData>(defaultRBData());
  const [part, setPart] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const viewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<RBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const sz = rbSize(spec.size);
  const T = rbType(type);
  const curPart = Math.min(part, spec.parts - 1);
  const slug = slugify(`${T.name}-${data.shop || ''}`, 'hoa-don');
  const total = spec.perBook * spec.books;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsOf = (r: RefObject<HTMLDivElement | null>) => Array.from(r.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const printPdf = async () => {
    const els = [...svgsOf(printRef)];
    const note = svgOf(noteRef);
    if (!els.length || !note) throw new Error('Chưa dựng xong phiếu, thử lại nhé.');
    return svgsToPrintPdf([...els, note], RB_FONT_CSS, sz, RB_BLEED_MM);
  };
  const pdfName = `${slug}-${sz.id}-${spec.parts}lien-file-in.pdf`;
  const downloadPng = () => run('png', async () => {
    const el = svgOf(viewRef); if (!el) return;
    downloadBlob(await svgToPng(el, RB_FONT_CSS, 1800), `${slug}-lien${curPart + 1}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), pdfName));
  const downloadSvg = () => run('svg', async () => {
    const el = svgsOf(printRef)[0]; if (!el) return;
    downloadBlob(await svgFileBlob(el, RB_FONT_CSS), `${slug}-lien1-file-in.svg`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const file = await printPdf();
    if (!view3d.current) throw new Error('Chưa dựng xong ảnh 3D, mở tab Thành phẩm 3D rồi thử lại.');
    const c = await view3d.current.snapshot(1200, 900);
    const preview = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
    return { file, fileName: pdfName, preview };
  };

  const build3d = () => import('@/lib/receiptbook-3d').then((m) => {
    const [top, under, torn] = svgsOf(texRef);
    return m.receiptBookBuilder({ top, under, torn, wMm: sz.wMm, hMm: sz.hMm, parts: spec.parts, perBook: spec.perBook, fontCss: RB_FONT_CSS });
  });
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __rbSnap?: (w: number, h: number) => Promise<string> }).__rbSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setField('logo', await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử ảnh PNG/JPG khác nhé.'); }
  };

  const material = spec.parts === 1 ? 'Giấy Ford 1 liên (xé)' : spec.parts === 2 ? 'Giấy carbonless 2 liên' : 'Giấy carbonless 3 liên';
  const orderTitle = `${(data.title || '').trim() || T.name} ${sz.name} · ${spec.parts} liên · ${spec.perBook} bộ/cuốn · ${spec.books} cuốn`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = RB_FIELDS.filter((f) => !f.only || f.only.includes(type));
  const formProps = { type, spec, data };
  // số dòng bảng thực tế vừa khổ (engine tự bớt dòng nếu khổ nhỏ) — đọc từ SVG sau khi vẽ
  const [rowsUsed, setRowsUsed] = useState(spec.rows);
  useEffect(() => {
    const el = viewRef.current?.querySelector('svg');
    const n = el ? Number(el.getAttribute('data-rows')) : spec.rows;
    if (n !== rowsUsed) setRowsUsed(n);
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hoá đơn · phiếu liên" sub="Hoá đơn bán lẻ, phiếu thu/chi, phiếu giao hàng, phiếu bảo hành — in liên giấy carbonless, đóng cuốn, số nhảy. Tải file in gửi xưởng hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {RB_TYPES.map((t) => (
          <button key={t.id} type="button" className="mv-seg-btn" data-active={type === t.id} onClick={() => setType(t.id)} data-testid={`rb-type-${t.id}`}>{t.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${RB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {RB_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="rb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-white shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <ReceiptFormSvg {...formProps} spec={{ ...spec, ...t.spec }} part={0} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin cửa hàng">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-mv-hair bg-white grid place-items-center overflow-hidden shrink-0">
                    {data.logo ? <img src={data.logo} alt="logo" className="w-full h-full object-contain" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer" data-testid="rb-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {data.logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="rb-logo" />
                  </label>
                  {data.logo && <button type="button" className="mv-btn mv-btn-ghost !text-xs" onClick={() => setField('logo', '')}><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                </div>
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[84px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`rb-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.key === 'title' ? T.title : f.ph} data-testid={`rb-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Liên, số nhảy & đóng cuốn">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Số liên (giấy carbonless tự in sang liên dưới)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([1, 2, 3] as const).map((n) => (
                      <button key={n} type="button" onClick={() => { set({ parts: n }); setPart(0); }} className={`flex items-center gap-2 ${chip(spec.parts === n)}`} data-testid={`rb-parts-${n}`}>
                        <span className="flex -space-x-1">{Array.from({ length: n }, (_, i) => <span key={i} className="w-3.5 h-3.5 rounded-sm border border-slate-300" style={{ background: RB_PAPER[n > 1 ? i : 0] }} />)}</span>
                        {n === 1 ? '1 liên (xé)' : `${n} liên`}
                      </button>
                    ))}
                  </div>
                  {spec.parts > 1 && (
                    <div className="text-[11px] text-slate-400 mt-1.5">{Array.from({ length: spec.parts }, (_, i) => `${lienLabel(type, spec.parts, i)} (giấy ${RB_PAPER_NAME[i]})`).join(' · ')}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mv-label block mb-1.5">Ký hiệu trước số</span>
                    <input className="mv-input" value={data.prefix || ''} maxLength={4} onChange={(e) => setField('prefix', e.target.value.replace(/[^A-Za-z0-9]/g, ''))} data-testid="rb-prefix" />
                  </label>
                  <label className="block">
                    <span className="mv-label block mb-1.5">Số bắt đầu</span>
                    <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, '').slice(0, 6))} data-testid="rb-start" />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div>
                    <div className="mv-label mb-1.5">Bộ / cuốn</div>
                    <div className="flex gap-1.5">{([50, 100] as const).map((n) => <button key={n} type="button" onClick={() => set({ perBook: n })} className={chip(spec.perBook === n)}>{n} bộ</button>)}</div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Số cuốn</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="rb-books">{[5, 10, 20, 50, 100].map((n) => <button key={n} type="button" onClick={() => set({ books: n })} className={chip(spec.books === n)}>{n}</button>)}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400" data-testid="rb-range">Số nhảy từ <b className="text-mv-fg">{rbNumber(data, 0)}</b> đến <b className="text-mv-fg">{rbNumber(data, total - 1)}</b> · {total.toLocaleString('vi-VN')} bộ</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, màu mực & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-sizes">
                    {RB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                {rbHasTable(type) && (
                  <div>
                    <div className="mv-label mb-1.5">Số dòng bảng hàng</div>
                    <div className="flex flex-wrap items-center gap-1.5" data-testid="rb-rows">
                      {[5, 8, 10, 12, 15].map((n) => <button key={n} type="button" onClick={() => set({ rows: n })} className={chip(spec.rows === n)}>{n} dòng</button>)}
                      {rowsUsed < spec.rows && <span className="text-[11px] text-amber-500">Khổ này vừa {rowsUsed} dòng</span>}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Màu mực (in 1 màu, số nhảy đỏ)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="rb-palettes">
                    {RB_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: pl.ink }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên cửa hàng & tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="rb-fonts">
                    {RB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([type, spec, data])} refitKey={`${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              {spec.parts > 1 && (
                <div className="flex gap-1.5 mb-2" data-testid="rb-part-tabs">
                  {Array.from({ length: spec.parts }, (_, i) => (
                    <button key={i} type="button" onClick={() => setPart(i)} className={`flex items-center gap-1.5 ${chip(curPart === i)}`}>
                      <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ background: RB_PAPER[i] }} /> Liên {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <div ref={viewRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="rb-preview">
                <ReceiptFormSvg {...formProps} part={curPart} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {spec.parts} liên · {spec.perBook} bộ/cuốn · số nhảy đỏ · lề xén {RB_BLEED_MM}mm</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="rb-3d" title="Mở tab Thành phẩm 3D để tải">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG liên {curPart + 1}
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="rb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({spec.parts} liên)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-svg" title="File vector, chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG liên 1
              </button>
            </div>
            <PrintRequest product="receiptbook" title={orderTitle} defaultMaterial={material} design={{ type, spec, data: { ...data, logo: data.logo ? '(logo)' : '' } }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF in: mỗi liên 1 trang (mẫu bộ số đầu) + 1 trang <b>thông số in</b> dặn xưởng (màu giấy liên, dải số nhảy, đóng cuốn). Màu giấy liên là giấy carbonless, không in nền.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: file in (mỗi liên, có lề xén, giấy trắng) + trang thông số + texture 3D */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={printRef}>
            {Array.from({ length: spec.parts }, (_, i) => (
              <div key={i}><ReceiptFormSvg {...formProps} part={i} bleed paper={false} style={{ width: '100%', display: 'block' }} /></div>
            ))}
          </div>
          <div ref={noteRef}><SpecNoteSvg {...formProps} /></div>
          <div ref={texRef}>
            <div><ReceiptFormSvg {...formProps} part={0} numberOffset={1} style={{ width: '100%', display: 'block' }} /></div>
            <div><ReceiptFormSvg {...formProps} part={Math.min(1, spec.parts - 1)} numberOffset={1} style={{ width: '100%', display: 'block' }} /></div>
            <div><ReceiptFormSvg {...formProps} part={Math.min(1, spec.parts - 1)} numberOffset={0} filled style={{ width: '100%', display: 'block' }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
