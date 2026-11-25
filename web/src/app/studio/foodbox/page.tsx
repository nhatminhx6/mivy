'use client';
// Hộp đồ ăn · hộp pizza: chọn loại hộp + mẫu món → điền tên quán, hotline, logo → xem thành phẩm 3D →
// tải khuôn bế (PDF/SVG đúng khổ, nét cắt + nét gấp + lề in) gửi xưởng, hoặc gửi yêu cầu in. Render code 100%.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  FB_FIELDS, FB_FONTS, FB_FONT_CSS, FB_KINDS, FB_PALETTES, FoodboxDieline, HeroThumb,
  fbDieline, fbLook, fbLooksFor, fbSize, fbSizesFor, fbSpecFor, useFbFonts,
  type FbData, type FbKind, type FbSpec,
} from '@/lib/foodbox-engine';
import { svgFileBlob, svgToSizedPdf } from '@/lib/svg-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const build3d = (spec: FbSpec, data: FbData, logo: string) => () => import('@/lib/foodbox-3d').then((m) => m.foodboxBuilder(spec, data, logo || undefined));
const kindOf = (v: string | null): FbKind => (v === 'meal' || v === 'burger' || v === 'tray' ? v : 'pizza');
const KIND_SLUG: Record<FbKind, string> = { pizza: 'hop-pizza', meal: 'hop-com', burger: 'hop-burger', tray: 'khay-giay' };

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

export default function FoodboxPage() {
  return <Suspense fallback={null}><FoodboxStudio /></Suspense>;
}

function FoodboxStudio() {
  const ready = useFbFonts();
  const qKind = kindOf(useSearchParams().get('kind'));
  const [spec, setSpec] = useState<FbSpec>(() => fbSpecFor(qKind));
  const [data, setData] = useState<FbData>(() => ({ ...fbLook(fbSpecFor(qKind).look).data }));
  const [logo, setLogo] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<FbSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setTouched(true); setData((d) => ({ ...d, [key]: v })); };
  const pickKind = (k: FbKind) => {
    if (k === spec.kind) return;
    const cur = fbLook(spec.look);
    const next = fbSpecFor(k, cur);
    setSpec(next);
    if (!touched) setData({ ...fbLook(next.look).data });
  };
  const pickLook = (id: string) => {
    const l = fbLook(id);
    set({ look: l.id, palette: l.palette, font: l.font });
    if (!touched) setData({ ...l.data });
  };
  useEffect(() => { pickKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps

  const sz = fbSize(spec.size);
  const die = ready ? fbDieline(spec) : null;
  const looks = fbLooksFor(spec.kind);
  const kindName = FB_KINDS.find((k) => k.id === spec.kind)!.name;
  const slug = slugify(`${KIND_SLUG[spec.kind]}-${data.brand || ''}`, KIND_SLUG[spec.kind]);
  const pal = FB_PALETTES.find((p) => p.id === spec.palette);
  const material = spec.kind === 'pizza' ? 'Carton sóng E (hộp pizza)' : pal?.kraft ? 'Giấy kraft chống dầu' : 'Giấy Ivory tráng PE (chống dầu)';

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
  // khổ lớn (hộp pizza trải phẳng ~70cm) → hạ dpi để canvas không quá tải, vẫn ≥150dpi
  const pdfOf = async () => {
    const el = printSvg(); if (!el || !die) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    const dpi = Math.max(150, Math.min(300, Math.floor((9000 / Math.max(die.W, die.H)) * 25.4)));
    return svgToSizedPdf(el, FB_FONT_CSS, die.W, die.H, dpi);
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfOf(), `${slug}-khuon-be.pdf`));
  const downloadSvg = () => run('svg', async () => { const el = printSvg(); if (!el) return; downloadBlob(await svgFileBlob(el, FB_FONT_CSS), `${slug}-khuon-be.svg`); });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([pdfOf(), shot(1200).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-khuon-be.pdf`, preview };
  };

  // hook cho QC: chụp 3D lớn ở góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __fbSnap?: (w: number, h: number, view?: { az: number; el: number }) => Promise<string> }).__fbSnap = async (w, h, view) => {
      const core = await import('@/lib/mockup3d');
      const b = await build3d(spec, data, logo)();
      return (await core.snapshot(b, w, h, { view })).toDataURL('image/png');
    };
  }, [spec, data, logo]);

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo.'); } };
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `${kindName} ${sz.w}×${sz.d}×${sz.h}mm`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp đồ ăn · hộp pizza" sub="Hộp pizza, hộp cơm, hộp burger, khay giấy in logo quán — xem thành phẩm 3D, tải khuôn bế đúng khổ (nét cắt + nét gấp) gửi xưởng, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-2xl" role="tablist">
        {FB_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={spec.kind === k.id} className="mv-seg-btn flex-1" data-testid="fb-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${looks.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {looks.map((l) => {
                  const on = spec.look === l.id;
                  const tSpec: FbSpec = { ...spec, look: l.id, palette: l.palette, font: l.font };
                  return (
                    <button key={l.id} type="button" onClick={() => pickLook(l.id)} data-testid="fb-tpl" data-active={on}
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

            <CollapsibleSection title="2 · Thông tin quán">
              <div className="grid grid-cols-2 gap-3">
                {FB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo quán (tuỳ chọn)</span>
                  <div className="flex items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="fb-logo" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {logo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="w-9 h-9 rounded-full object-cover border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      </>
                    )}
                    {!logo && <span className="text-[11px] text-slate-500">Chưa có logo thì dùng hình món ăn theo mẫu. Ảnh xử lý ngay trên máy anh/chị.</span>}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & kích thước">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="fb-palettes">
                    {FB_PALETTES.map((p) => (
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
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="fb-fonts">
                    {FB_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kích thước (dài × rộng × cao, mm)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fb-sizes">
                    {fbSizesFor(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="fb-size">{s.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d(spec, data, logo)} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={300} className="rounded-lg aspect-[4/3] w-full" />
            ) : die && (
              <div className="rounded-lg overflow-auto bg-white border border-mv-hair max-h-[70vh]" data-testid="fb-flat">
                <FoodboxDieline spec={spec} data={data} logo={logo || undefined} preview style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">
              {kindName} {sz.w}×{sz.d}×{sz.h}mm · {material}{die ? ` · tấm khuôn ${Math.round(die.W)}×${Math.round(die.H)}mm` : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="fb-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="fb-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fb-svg" title="File vector, chữ đã outline, có lớp CutContour">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn</button>
            </div>
            <PrintRequest product="foodbox" title={orderTitle} defaultMaterial={material} design={{ spec, data, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Khuôn bế để báo giá + duyệt bố cục: nét hồng = cắt, nét xanh đứt = gấp, lề in {3}mm. Gửi yêu cầu, Mivy chốt khuôn cuối với xưởng rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <FoodboxDieline spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
