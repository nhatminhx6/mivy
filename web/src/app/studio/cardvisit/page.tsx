'use client';
// Card visit / danh thiếp: chọn mẫu → điền thông tin → đổi màu/font/khổ → tải file in 2 mặt (PDF 300dpi,
// lề xén 2mm, vạch cắt) hoặc gửi yêu cầu in. Mẫu = bố cục × màu × font, render code 100%.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  CV_BLEED_MM, CV_FIELDS, CV_FONTS, CV_FONT_CSS, CV_LAYOUTS, CV_PALETTES, CV_SIZES, CV_TEMPLATES,
  CardVisitSvg, cvSize, defaultCVData, useCVFonts, type CVData, type CVSpec,
} from '@/lib/cardvisit-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs } from '@/components/Mockup3D';

const FIRST: CVSpec = { layout: 'leftbar', palette: 'navy', font: 'bvp', size: '90x54' };

export default function CardVisitPage() {
  const ready = useCVFonts();
  const [spec, setSpec] = useState<CVSpec>(FIRST);
  const [data, setData] = useState<CVData>(defaultCVData());
  const [busy, setBusy] = useState('');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const printFrontRef = useRef<HTMLDivElement | null>(null);
  const printBackRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const set = (p: Partial<CVSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const sz = cvSize(spec.size);
  const slug = slugify(`card-visit-${data.name || data.company || ''}`, 'card-visit');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgToPng(el, CV_FONT_CSS, 1800), `${slug}-mat-truoc.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const fr = svgOf(printFrontRef), bk = svgOf(printBackRef); if (!fr || !bk) return;
    downloadBlob(await svgsToPrintPdf([fr, bk], CV_FONT_CSS, sz, CV_BLEED_MM), `${slug}-${sz.id}-file-in.pdf`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printFrontRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, CV_FONT_CSS), `${slug}-mat-truoc-file-in.svg`);
  });

  const makeFiles = async () => {
    const fr = svgOf(printFrontRef), bk = svgOf(printBackRef), pv = svgOf(frontRef);
    if (!fr || !bk || !pv) throw new Error('Chưa dựng xong card, thử lại nhé.');
    const [file, preview] = await Promise.all([
      svgsToPrintPdf([fr, bk], CV_FONT_CSS, sz, CV_BLEED_MM),
      svgToJpeg(pv, CV_FONT_CSS, 900),
    ]);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };
  // 3D đọc đúng SVG mặt trước/sau đang hiện (thiết kế mới nhất) lúc dựng
  const build3d = () => import('@/lib/cardvisit-3d').then((m) => m.cardVisitBuilder({ front: svgOf(frontRef), back: svgOf(backRef), wMm: sz.wMm, hMm: sz.hMm, fontCss: CV_FONT_CSS }));
  const orderTitle = `Card visit ${sz.name} · ${CV_LAYOUTS.find((l) => l.id === spec.layout)?.name}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Card visit" sub="Danh thiếp 2 mặt — chọn mẫu, điền thông tin, tải file in chuẩn (300dpi, lề xén, vạch cắt) gửi thẳng xưởng, hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CV_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {CV_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="cv-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <CardVisitSvg spec={{ ...t.spec, size: spec.size }} data={data} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin">
              <div className="grid grid-cols-2 gap-3">
                {CV_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cv-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="cv-palettes">
                    {CV_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: pl.accent }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="cv-fonts">
                    {CV_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`}
                        style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.name || 'Quốc Bảo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CV_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="cv-size">{s.name}</button>)}
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
              <Mockup3DView build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={spec.size} debounce={400} className="rounded-lg aspect-[16/11] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt trước</div>
                <div ref={frontRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="cv-front">
                  <CardVisitSvg spec={spec} data={data} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>
                <div ref={backRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="cv-back">
                  <CardVisitSvg spec={spec} data={data} side="back" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · in 300dpi · lề xén {CV_BLEED_MM}mm · vạch cắt</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cv-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cv-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cv-svg" title="File vector, chữ đã outline — xưởng mở bằng AI/Corel, không cần font">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="cardvisit" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: tải PDF 2 mặt đúng khổ thật, nền tràn lề xén + vạch cắt — xưởng in thẳng. Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).</p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) để xuất PDF 2 mặt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={printFrontRef}><CardVisitSvg spec={spec} data={data} side="front" bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printBackRef}><CardVisitSvg spec={spec} data={data} side="back" bleed style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
