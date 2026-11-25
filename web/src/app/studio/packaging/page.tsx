'use client';
// Hộp giấy, túi giấy & hộp quai xách: chọn loại + mẫu → điền thương hiệu → đổi màu/font/kích thước → tải dàn khuôn bế (PDF
// đúng khổ, nét cắt + nét bế) gửi xưởng, hoặc gửi yêu cầu in. Render code 100%.

import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  PKG_FIELDS, PKG_FONTS, PKG_FONT_CSS, PKG_KINDS, PKG_PALETTES,
  PackagingSvg, carryLookData, defaultPkgData, pkgNetMm, pkgSize, pkgTemplates, sizesForKind, usePkgFonts,
  type PkgData, type PkgKind, type PkgSpec,
} from '@/lib/packaging-engine';
import { svgFileBlob, svgToSizedPdf } from '@/lib/svg-export';
import { Mockup3DThumb, Mockup3DView, type Mockup3DHandle } from '@/components/Mockup3D';

const build3d = (spec: PkgSpec, data: PkgData) => () => import('@/lib/packaging-3d').then((m) => m.packagingBuilder(spec, data));
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const FIRST: PkgSpec = { kind: 'box', palette: 'kraft', font: 'bvp', size: 'box-s' };
// mở đúng loại khi vào từ catalog (?kind=carry / bag / box)
const startSpec = (k: PkgKind): PkgSpec => {
  if (k === 'box') return FIRST;
  if (k === 'carry') { const t = pkgTemplates('carry')[0]; return { ...t.spec, size: sizesForKind('carry')[0].id }; }
  return { kind: k, palette: 'kraft', font: 'montserrat', size: sizesForKind(k)[0].id };
};
const kindOf = (v: string | null): PkgKind => (v === 'carry' || v === 'bag' ? v : 'box');
const sampleFor = (s: Pick<PkgSpec, 'kind' | 'look'>) => (s.kind === 'carry' ? carryLookData(s.look) : defaultPkgData());

export default function PackagingPage() {
  return <Suspense fallback={null}><PackagingStudio /></Suspense>;
}

function PackagingStudio() {
  const ready = usePkgFonts();
  const qKind = kindOf(useSearchParams().get('kind'));
  const [spec, setSpec] = useState<PkgSpec>(() => startSpec(qKind));
  const [data, setData] = useState<PkgData>(() => sampleFor(startSpec(qKind)));
  const [touched, setTouched] = useState(false); // khách đã sửa chữ → đổi mẫu giữ nguyên chữ của khách
  const [busy, setBusy] = useState('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<PkgSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setTouched(true); setData((d) => ({ ...d, [key]: v })); };
  const pickKind = (k: PkgKind) => {
    if (k === spec.kind) return;
    const next: PkgSpec = k === 'carry' ? startSpec('carry')
      : { ...spec, kind: k, look: undefined, size: sizesForKind(k)[0].id, font: k === 'box' ? 'bvp' : 'montserrat', palette: spec.kind === 'carry' ? 'kraft' : spec.palette };
    setSpec(next);
    if (!touched) setData(sampleFor(next));
  };
  const pickTemplate = (t: Omit<PkgSpec, 'size'>) => {
    set({ palette: t.palette, font: t.font, look: t.look });
    if (!touched) setData(sampleFor(t));
  };
  // đang ở trang mà bấm link catalog khác loại (?kind=…) → chuyển loại
  useEffect(() => { pickKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps
  const sz = pkgSize(spec.size);
  const net = pkgNetMm(spec);
  const templates = pkgTemplates(spec.kind);
  const kindSlug = spec.kind === 'box' ? 'hop-giay' : spec.kind === 'carry' ? 'hop-quai-xach' : 'tui-giay';
  const slug = slugify(`${kindSlug}-${data.brand || ''}`, kindSlug);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (px: number, watermark = false) => {
    if (!view3d.current) throw new Error('Chưa dựng xong ảnh 3D, thử lại nhé.');
    return view3d.current.snapshot(px, px, { watermark });
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-thanh-pham.png`));
  const downloadPdf = () => run('pdf', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgToSizedPdf(el, PKG_FONT_CSS, net.wMm, net.hMm, 150), `${slug}-khuon-be.pdf`); });
  const downloadSvg = () => run('svg', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgFileBlob(el, PKG_FONT_CSS), `${slug}-khuon-be.svg`); });

  const makeFiles = async () => {
    const pr = svgOf(printRef);
    if (!pr) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    const [file, preview] = await Promise.all([svgToSizedPdf(pr, PKG_FONT_CSS, net.wMm, net.hMm, 150), shot(900).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-khuon-be.pdf`, preview };
  };
  const orderTitle = `${spec.kind === 'box' ? 'Hộp giấy' : spec.kind === 'carry' ? 'Hộp quai xách' : 'Túi giấy'} ${sz.w}×${sz.d}×${sz.h}mm`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp & túi giấy" sub="Dựng dàn khuôn bế (dieline) có nét cắt + nét bế gấp, gắn thương hiệu — tải PDF đúng khổ gửi xưởng bế, hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 max-w-md" role="tablist">
        {PKG_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={spec.kind === k.id} className="mv-seg-btn flex-1" data-testid="pkg-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${templates.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {templates.map((t) => {
                  const on = spec.palette === t.spec.palette && spec.look === t.spec.look;
                  const tData = touched ? data : sampleFor(t.spec);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t.spec)} data-testid="pkg-tpl" data-active={on}
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm aspect-square">
                        <Mockup3DThumb build={build3d({ ...spec, palette: t.spec.palette, font: t.spec.font, look: t.spec.look }, tData)} rebuildKey={JSON.stringify([spec.kind, spec.size, t.spec, tData])} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thương hiệu">
              <div className="grid grid-cols-2 gap-3">
                {PKG_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pkg-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & kích thước">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pkg-palettes">
                    {PKG_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: pl.face }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pkg-fonts">
                    {PKG_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">{spec.kind === 'carry' ? 'Thân hộp (dài × hông × cao, mm) — chưa tính mái + quai' : 'Kích thước (dài × hông × cao, mm)'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sizesForKind(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="pkg-size">{s.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <span className="text-sm font-bold text-mv-fg">Thành phẩm</span>
            <Mockup3DView ref={view3d} build={build3d(spec, data)} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.kind}|${spec.size}`} className="rounded-lg aspect-square w-full" />
            <div className="pt-1">
              <div className="text-[11px] text-slate-400 mb-1">Dàn khuôn bế · file gửi xưởng</div>
              <div className="mx-auto rounded-lg overflow-hidden bg-white border border-mv-hair" style={{ aspectRatio: `${net.wMm} / ${net.hMm}` }}>
                <PackagingSvg spec={spec} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Tấm khuôn {Math.round(net.wMm)}×{Math.round(net.hMm)}mm · nét cắt liền + nét bế đứt</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pkg-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pkg-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pkg-svg" title="File vector, chữ đã outline">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="packaging" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Bản dàn khuôn để báo giá + duyệt bố cục. Gửi yêu cầu, Mivy chốt khuôn bế cuối với xưởng rồi in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <PackagingSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
