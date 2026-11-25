'use client';
// Hộp khăn giấy in logo: chọn dáng hộp + mẫu ngành → điền tên, slogan, hotline, logo → xem thành phẩm 3D (khăn bung lên khỏi lỗ)
// → tải khuôn trải phẳng (nét cắt, nét gấp, đường xé lỗ rút, vạch màng PE, lề in 3mm) gửi xưởng, hoặc gửi yêu cầu in.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  FaceSvg, TB_FIELDS, TB_FONTS, TB_FONT_CSS, TB_KINDS, TB_LAYOUTS, TB_LOOKS, TB_PALETTES, TB_PATTERNS, TissueDieline,
  tbDieline, tbLook, tbSize, tbSizesFor, tbSpecFor, useTbFonts,
  type TbData, type TbKind, type TbSpec,
} from '@/lib/tissuebox-engine';
import { svgFileBlob, svgToSizedPdf } from '@/lib/svg-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const build3d = (spec: TbSpec, data: TbData, logo: string) => () => import('@/lib/tissuebox-3d').then((m) => m.tissueboxBuilder(spec, data, logo || undefined));
const kindOf = (v: string | null): TbKind => (v === 'cube' || v === 'pocket' ? v : 'rect');

// logo khách: thu nhỏ ≤ 800px ngay trên máy, không gửi đi đâu
async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 800 / Math.max(im.width, im.height));
    const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function TissueboxPage() {
  return <Suspense fallback={null}><TissueboxStudio /></Suspense>;
}

function TissueboxStudio() {
  const ready = useTbFonts();
  const qKind = kindOf(useSearchParams().get('kind'));
  const [spec, setSpec] = useState<TbSpec>(() => tbSpecFor(qKind));
  const [data, setData] = useState<TbData>(() => ({ ...TB_LOOKS[0].data }));
  const [logo, setLogo] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<TbSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setTouched(true); setData((d) => ({ ...d, [key]: v })); };
  const pickKind = (k: TbKind) => setSpec((s) => (s.kind === k ? s : { ...s, kind: k, size: tbSizesFor(k)[0].id }));
  const pickLook = (id: string) => {
    const l = tbLook(id);
    set({ look: l.id, palette: l.palette, font: l.font, pattern: l.pattern, layout: l.layout });
    if (!touched) setData({ ...l.data });
  };
  useEffect(() => { pickKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps

  const sz = tbSize(spec.size);
  const die = ready ? tbDieline(spec) : null;
  const kindName = TB_KINDS.find((k) => k.id === spec.kind)!.name;
  const slug = slugify(`hop-khan-giay-${data.brand || ''}`, 'hop-khan-giay');
  const material = 'Hộp khăn giấy ivory 350 in offset';

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const printSvg = () => printRef.current?.querySelector('svg') as SVGSVGElement | null;
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (px: number, watermark = false) => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" rồi thử lại nhé.');
    return view3d.current.snapshot(px, Math.round(px * 0.75), { watermark });
  };
  const pdfOf = async () => {
    const el = printSvg(); if (!el || !die) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    const dpi = Math.max(150, Math.min(300, Math.floor((9000 / Math.max(die.W, die.H)) * 25.4)));
    return svgToSizedPdf(el, TB_FONT_CSS, die.W, die.H, dpi);
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfOf(), `${slug}-khuon-be.pdf`));
  const downloadSvg = () => run('svg', async () => { const el = printSvg(); if (!el) return; downloadBlob(await svgFileBlob(el, TB_FONT_CSS), `${slug}-khuon-be.svg`); });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([pdfOf(), shot(1200).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-khuon-be.pdf`, preview };
  };

  // hook cho QC: chụp 3D lớn ở góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __tbSnap?: (w: number, h: number, view?: { az: number; el: number }) => Promise<string> }).__tbSnap = async (w, h, view) => {
      const core = await import('@/lib/mockup3d');
      const b = await build3d(spec, data, logo)();
      return (await core.snapshot(b, w, h, { view })).toDataURL('image/png');
    };
  }, [spec, data, logo]);

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo.'); } };
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `Hộp khăn giấy ${kindName.toLowerCase()} ${sz.name}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp khăn giấy in logo" sub="Hộp khăn giấy để bàn nhà hàng, phòng khách sạn, spa, xe dịch vụ — in logo + hotline quanh 4 mặt, xem thành phẩm 3D, tải khuôn bế đúng khổ gửi xưởng, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-xl" role="tablist">
        {TB_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={spec.kind === k.id} className="mv-seg-btn flex-1" data-testid="tb-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TB_LOOKS.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TB_LOOKS.map((l) => {
                  const on = spec.look === l.id;
                  const tSpec: TbSpec = { ...spec, look: l.id, palette: l.palette, font: l.font, pattern: l.pattern, layout: l.layout };
                  return (
                    <button key={l.id} type="button" onClick={() => pickLook(l.id)} data-testid="tb-tpl" data-active={on}
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm bg-white">
                        <FaceSvg face="front" spec={tSpec} data={touched ? data : l.data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{l.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin in trên hộp">
              <div className="grid grid-cols-2 gap-3">
                {TB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn)</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="tb-logo" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {logo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="w-9 h-9 rounded-full object-cover border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                    {!logo && <span className="text-[11px] text-slate-500">Chưa có logo thì dùng chữ viết tắt tên. Ảnh xử lý ngay trên máy anh/chị.</span>}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, hoạ tiết & kích thước">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="tb-palettes">
                    {TB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair grid place-items-center" style={{ background: p.bg }}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.accent }} />
                        </span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Hoạ tiết nền</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tb-patterns">
                    {TB_PATTERNS.map((p) => <button key={p.id} type="button" onClick={() => set({ pattern: p.id })} className={chip(spec.pattern === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tb-layouts">
                    {TB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="tb-fonts">
                    {TB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kích thước (dài × rộng × cao)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tb-sizes">
                    {tbSizesFor(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="tb-size">{s.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' ? (
              <Mockup3DView ref={view3d} build={build3d(spec, data, logo)} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={350} className="rounded-lg aspect-[4/3] w-full" />
            ) : (
              <div className="rounded-lg overflow-auto bg-white border border-mv-hair max-h-[70vh]" data-testid="tb-flat">
                <TissueDieline spec={spec} data={data} logo={logo || undefined} preview style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">
              {kindName} {sz.name} · {material}{die ? ` · tấm khuôn ${Math.round(die.W)}×${Math.round(die.H)}mm` : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="tb-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tb-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-svg" title="File vector, chữ đã outline, có lớp CutContour / Fold / Perf">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn</button>
            </div>
            <PrintRequest product="tissuebox" title={orderTitle} defaultMaterial={material} design={{ spec, data, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Khuôn hộp dán 2 đầu: nét hồng = cắt, nét xanh đứt = gấp, chấm hồng = đường xé lỗ rút khăn, vạch xanh lá = màng PE xẻ rãnh, lề in 3mm. Mivy chốt khuôn cuối với xưởng rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <TissueDieline spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
