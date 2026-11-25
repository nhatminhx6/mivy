'use client';
// Hộp bánh kem · cupcake · tráng miệng: chọn loại hộp + mẫu tiệm bánh + hình cửa sổ → điền tên tiệm, hotline, logo →
// xem thành phẩm 3D (thấy bánh qua màng PET, đóng/mở nắp) → tải khuôn bế đúng khổ (nét cắt + nét gấp + lỗ cửa sổ / khay)
// gửi xưởng, hoặc gửi yêu cầu in. Render code 100%.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CB_FIELDS, CB_FONTS, CB_FONT_CSS, CB_KINDS, CB_LOOKS, CB_PALETTES, CB_WINDOWS, CakeboxDieline, HeroThumb,
  cbDieline, cbLook, cbSize, cbSizesFor, cbSpecFor, useCbFonts,
  type CbData, type CbKind, type CbSpec,
} from '@/lib/cakebox-engine';
import type { CbPose } from '@/lib/cakebox-3d';
import { svgFileBlob, svgToSizedPdf } from '@/lib/svg-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const build3d = (spec: CbSpec, data: CbData, logo: string, pose: CbPose) => () => import('@/lib/cakebox-3d').then((m) => m.cakeboxBuilder(spec, data, logo || undefined, pose));
const kindOf = (v: string | null): CbKind => (v === 'cupcake' || v === 'dessert' ? v : 'cake');
const KIND_SLUG: Record<CbKind, string> = { cake: 'hop-banh-kem', cupcake: 'hop-cupcake', dessert: 'hop-trang-mieng' };

// ảnh logo khách: thu nhỏ ≤ 800px ngay trên máy, không gửi đi đâu
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

export default function CakeboxPage() {
  return <Suspense fallback={null}><CakeboxStudio /></Suspense>;
}

function CakeboxStudio() {
  const ready = useCbFonts();
  const qKind = kindOf(useSearchParams().get('kind'));
  const [spec, setSpec] = useState<CbSpec>(() => cbSpecFor(qKind));
  const [data, setData] = useState<CbData>(() => ({ ...CB_LOOKS[0].data }));
  const [logo, setLogo] = useState('');
  const [touched, setTouched] = useState(false);
  const [pose, setPose] = useState<CbPose>('closed');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<CbSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setTouched(true); setData((d) => ({ ...d, [key]: v })); };
  const pickKind = (k: CbKind) => {
    if (k === spec.kind) return;
    setSpec((s) => ({ ...cbSpecFor(k, cbLook(s.look)), palette: s.palette, font: s.font }));
  };
  const pickLook = (id: string) => {
    const l = cbLook(id);
    set({ look: l.id, palette: l.palette, font: l.font });
    if (!touched) setData({ ...l.data });
  };
  useEffect(() => { pickKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps

  const sz = cbSize(spec.size);
  const die = ready ? cbDieline(spec) : null;
  const kind = CB_KINDS.find((k) => k.id === spec.kind)!;
  const slug = slugify(`${KIND_SLUG[spec.kind]}-${data.brand || ''}`, KIND_SLUG[spec.kind]);

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
  // tấm khuôn lớn (hộp bánh kem trải phẳng ~80cm) → hạ dpi để canvas không quá tải, vẫn ≥150dpi
  const pdfOf = async () => {
    const el = printSvg(); if (!el || !die) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    const dpi = Math.max(150, Math.min(300, Math.floor((9000 / Math.max(die.W, die.H)) * 25.4)));
    return svgToSizedPdf(el, CB_FONT_CSS, die.W, die.H, dpi);
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfOf(), `${slug}-khuon-be.pdf`));
  const downloadSvg = () => run('svg', async () => { const el = printSvg(); if (!el) return; downloadBlob(await svgFileBlob(el, CB_FONT_CSS), `${slug}-khuon-be.svg`); });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([pdfOf(), shot(1200).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-khuon-be.pdf`, preview };
  };

  // hook cho QC: chụp 3D lớn ở góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __cbSnap?: (w: number, h: number, p?: CbPose, view?: { az: number; el: number }) => Promise<string> }).__cbSnap = async (w, h, p, view) => {
      const core = await import('@/lib/mockup3d');
      const b = await build3d(spec, data, logo, p || pose)();
      return (await core.snapshot(b, w, h, { view })).toDataURL('image/png');
    };
  }, [spec, data, logo, pose]);

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo.'); } };
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const winName = CB_WINDOWS.find((w) => w.id === spec.win)!.name;
  const orderTitle = `${kind.name} ${sz.w}×${sz.d}×${sz.h}mm · cửa sổ ${winName.toLowerCase()}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp bánh kem · cupcake" sub="Hộp bánh kem có cửa sổ, hộp cupcake có khay, hộp mousse in logo tiệm — xem thành phẩm 3D thấy bánh qua màng PET, tải khuôn bế đúng khổ gửi xưởng, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-2xl" role="tablist">
        {CB_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={spec.kind === k.id} className="mv-seg-btn flex-1" data-testid="cb-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CB_LOOKS.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CB_LOOKS.map((l) => {
                  const on = spec.look === l.id;
                  const tSpec: CbSpec = { ...spec, look: l.id, palette: l.palette, font: l.font };
                  return (
                    <button key={l.id} type="button" onClick={() => pickLook(l.id)} data-testid="cb-tpl" data-active={on}
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm aspect-[4/3] bg-white grid place-items-center">
                        <HeroThumb spec={tSpec} data={touched ? data : l.data} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{l.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin tiệm bánh">
              <div className="grid grid-cols-2 gap-3">
                {CB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo tiệm (tuỳ chọn)</span>
                  <div className="flex items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="cb-logo" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {logo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="w-9 h-9 rounded-full object-cover border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                    {!logo && <span className="text-[11px] text-slate-500">Chưa có logo thì dùng hình bánh theo mẫu. Ảnh xử lý ngay trên máy anh/chị.</span>}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Cửa sổ, kích thước, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Cửa sổ màng PET {spec.kind === 'dessert' ? '(mặt trước)' : '(trên nắp)'}</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cb-wins">
                    {CB_WINDOWS.map((w) => <button key={w.id} type="button" onClick={() => set({ win: w.id })} className={chip(spec.win === w.id)} data-testid="cb-win">{w.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kích thước (dài × rộng × cao, mm)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cb-sizes">
                    {cbSizesFor(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="cb-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="cb-palettes">
                    {CB_PALETTES.map((p) => (
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
                  <div className="mv-label mb-1.5">Font tên tiệm</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5" data-testid="cb-fonts">
                    {CB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
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
              <>
                <Mockup3DView ref={view3d} build={build3d(spec, data, logo, pose)} rebuildKey={JSON.stringify([spec, data, logo.length, pose])} refitKey={`${spec.kind}|${spec.size}|${pose}`} debounce={300} className="rounded-lg aspect-[4/3] w-full" />
                <div className="mv-seg w-full" role="tablist">
                  {(['closed', 'open'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPose(p)} data-active={pose === p} className="mv-seg-btn flex-1 !text-xs" data-testid="cb-pose">{p === 'closed' ? 'Đóng nắp' : 'Mở nắp'}</button>
                  ))}
                </div>
              </>
            ) : die && (
              <div className="rounded-lg overflow-auto bg-white border border-mv-hair max-h-[70vh]" data-testid="cb-flat">
                <CakeboxDieline spec={spec} data={data} logo={logo || undefined} preview style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">
              {kind.name} {sz.w}×{sz.d}×{sz.h}mm · cửa sổ {winName.toLowerCase()}{die ? ` · tấm khuôn ${Math.round(die.W)}×${Math.round(die.H)}mm` : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="cb-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cb-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cb-svg" title="File vector, chữ đã outline, có lớp CutContour">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn</button>
            </div>
            <PrintRequest product="cakebox" title={orderTitle} defaultMaterial={kind.material} design={{ spec, data, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Khuôn bế để báo giá + duyệt bố cục: nét hồng = cắt (gồm lỗ cửa sổ{spec.kind === 'cupcake' ? ', lỗ khay' : ''}), nét xanh đứt = gấp, lề in 3mm. Cửa sổ dán màng PET an toàn thực phẩm từ mặt trong. Gửi yêu cầu, Mivy chốt khuôn với xưởng rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <CakeboxDieline spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
