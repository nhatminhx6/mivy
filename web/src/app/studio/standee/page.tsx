'use client';
// Standee: chọn mẫu → điền nội dung → đổi màu/font/khổ → tải file in đúng khổ (PDF, bleed 10mm, vạch cắt)
// hoặc gửi yêu cầu in. Mẫu = bố cục × màu × font, render code 100%.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  ST_BLEED_MM, ST_FIELDS, ST_FONTS, ST_FONT_CSS, ST_LAYOUTS, ST_PALETTES, ST_SIZES, ST_TEMPLATES,
  StandeeSvg, stSize, defaultSTData, useSTFonts, type STData, type STSpec,
} from '@/lib/standee-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs } from '@/components/Mockup3D';

const FIRST: STSpec = { layout: 'promo', palette: 'red', font: 'montserrat', size: '60x160' };

export default function StandeePage() {
  const ready = useSTFonts();
  const [spec, setSpec] = useState<STSpec>(FIRST);
  const [data, setData] = useState<STData>(defaultSTData());
  const [busy, setBusy] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const set = (p: Partial<STSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const sz = stSize(spec.size);
  const slug = slugify(`standee-${data.brand || data.title || ''}`, 'standee');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const downloadPng = () => run('png', async () => { const el = svgOf(previewRef); if (!el) return; downloadBlob(await svgToPng(el, ST_FONT_CSS, 1400), `${slug}.png`); });
  const downloadPdf = () => run('pdf', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgToPrintPdf(el, ST_FONT_CSS, sz, ST_BLEED_MM, sz.dpi), `${slug}-${sz.id}-file-in.pdf`); });
  const downloadSvg = () => run('svg', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgFileBlob(el, ST_FONT_CSS), `${slug}-${sz.id}-file-in.svg`); });

  const makeFiles = async () => {
    const pr = svgOf(printRef), pv = svgOf(previewRef);
    if (!pr || !pv) throw new Error('Chưa dựng xong standee, thử lại nhé.');
    const [file, preview] = await Promise.all([svgToPrintPdf(pr, ST_FONT_CSS, sz, ST_BLEED_MM, sz.dpi), svgToJpeg(pv, ST_FONT_CSS, 700)]);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };
  const build3d = () => import('@/lib/standee-3d').then((m) => m.standeeBuilder({ el: svgOf(previewRef), wMm: sz.wMm, hMm: sz.hMm, fontCss: ST_FONT_CSS, xFrame: sz.id.endsWith('x') }));
  const orderTitle = `Standee ${sz.name} · ${ST_LAYOUTS.find((l) => l.id === spec.layout)?.name}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Standee" sub="Standee cuốn / chữ X khổ lớn — chọn mẫu, điền nội dung, tải file in đúng khổ (bleed, vạch cắt) gửi thẳng xưởng, hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${ST_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {ST_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="st-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <StandeeSvg spec={{ ...t.spec, size: spec.size }} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {ST_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.multiline ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline ? (
                      <textarea className="mv-input min-h-[84px]" rows={3} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`st-${f.key}`} />
                    ) : (
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`st-${f.key}`} />
                    )}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="st-palettes">
                    {ST_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: pl.accent }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="st-fonts">
                    {ST_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ST_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="st-size">{s.name}</button>)}
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
            {tab === '3d' && (
              <Mockup3DView build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={spec.size} debounce={400} className="rounded-lg aspect-[3/4] w-full max-h-[62vh]" />
            )}
            <div ref={previewRef} className={`mx-auto rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${tab === '3d' ? 'hidden' : ''}`} style={{ maxHeight: '58vh', aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="st-preview">
              <StandeeSvg spec={spec} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · bleed {ST_BLEED_MM}mm · vạch cắt</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="st-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="st-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="st-svg" title="File vector, chữ đã outline">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="standee" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: tải file đúng khổ thật (bleed + vạch cắt) — xưởng in thẳng. Hoặc gửi yêu cầu, Mivy in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 400, pointerEvents: 'none' }}>
          <StandeeSvg spec={spec} data={data} bleed style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
