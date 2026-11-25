'use client';
// Lót ly in logo: chọn mẫu (cà phê, bia, trà sữa, nhà hàng, đám cưới, khai trương) → điền mặt trước + mặt sau
// (wifi, QR, instagram) → chọn hình (tròn, vuông, cắt theo hạt cà phê / chiếc lá / ly) + chất liệu (giấy bồi, gỗ, cao su)
// → xem 3D trên bàn quán → tải PNG, PDF in 2 mặt, file in–cắt (tờ mặt trước có CutContour + tờ mặt sau cột đảo).

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  CO_BLEED_MM, CO_FIELDS, CO_FONTS, CO_FONT_CSS, CO_LAYOUTS, CO_MATERIALS, CO_PALETTES, CO_PURPOSES, CO_SAMPLES, CO_SHAPES, CO_SHEET, CO_TEMPLATES,
  CoasterSheetSvg, CoasterSvg, coAccent, coBaseColor, coMaterial, coShape, coSheetFit, defaultCoSpec, useCoFonts,
  type CoData, type CoPurpose, type CoSpec,
} from '@/lib/coaster-engine';
import type { CoDrink } from '@/lib/coaster-3d';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi ngành: ô còn nguyên chữ mẫu ngành cũ → chữ mẫu ngành mới; ô khách tự viết thì giữ
function switchData(d: CoData, from: CoPurpose, to: CoPurpose): CoData {
  const oldS = CO_SAMPLES[from], next: CoData = { ...CO_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

const DRINK: Record<CoPurpose, CoDrink> = { cafe: 'coffee', beer: 'beer', milktea: 'milktea', restaurant: 'coffee', wedding: 'peach', opening: 'coffee' };
const te = new TextEncoder();

export default function CoasterPage() {
  const ready = useCoFonts();
  const [spec, setSpec] = useState<CoSpec>(defaultCoSpec);
  const [data, setData] = useState<CoData>({ ...CO_SAMPLES.cafe });
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const frontBleed = useRef<HTMLDivElement | null>(null);
  const backBleed = useRef<HTMLDivElement | null>(null);
  const sheetF = useRef<HTMLDivElement | null>(null);
  const sheetB = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sh = coShape(spec.shape);
  const mat = coMaterial(spec.material);
  const fit = coSheetFit(spec.shape);
  const slug = slugify(`lot-ly-${data.brand || ''}`, 'lot-ly');
  const set = (p: Partial<CoSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setPurpose = (pp: CoPurpose) => { if (pp === spec.purpose) return; setData((d) => switchData(d, spec.purpose, pp)); set({ purpose: pp }); };
  const pickTpl = (t: (typeof CO_TEMPLATES)[number]) => {
    if (t.spec.purpose !== spec.purpose) setData((d) => switchData(d, spec.purpose, t.spec.purpose));
    setSpec((s) => ({ ...s, ...t.spec }));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // tờ in–cắt: lót ly (defs) thay bằng bản đã outline → file vector độc lập font
  const sheetFile = async (side: 'front' | 'back'): Promise<string> => {
    const el = svgOf(side === 'front' ? sheetF : sheetB), one = svgOf(side === 'front' ? frontBleed : backBleed);
    if (!el || !one) throw new Error('Chưa dựng xong tờ in');
    const [clone, co] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(one, undefined, { outline: true })]);
    const vb = one.viewBox.baseVal;
    co.setAttribute('width', String(vb.width)); co.setAttribute('height', String(vb.height));
    clone.querySelector('[data-coaster-def] > svg')?.replaceWith(co);
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(CO_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return new XMLSerializer().serializeToString(clone);
  };
  const zipSheets = async (): Promise<Blob> => {
    const [f, b] = [await sheetFile('front'), await sheetFile('back')];
    return zipStore([
      { name: `${slug}-${sh.id}-mat-truoc-in-cat.svg`, data: te.encode(f) },
      { name: `${slug}-${sh.id}-mat-sau.svg`, data: te.encode(b) },
    ]);
  };

  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, CO_FONT_CSS, 1600), `${slug}-${side === 'front' ? 'mat-truoc' : 'mat-sau'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const f = svgOf(frontBleed), b = svgOf(backBleed); if (!f || !b) return;
    downloadBlob(await svgsToPrintPdf([f, b], CO_FONT_CSS, { wMm: sh.wMm, hMm: sh.hMm }, CO_BLEED_MM), `${slug}-${sh.id}-file-in-2-mat.pdf`);
  });
  const downloadZip = () => run('zip', async () => downloadBlob(await zipSheets(), `${slug}-${sh.id}-${fit.per}cai-to-in-cat.zip`));
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    if (!pv) throw new Error('Chưa dựng xong lót ly, thử lại nhé.');
    const file = await zipSheets();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, CO_FONT_CSS, 900))
      : await svgToJpeg(pv, CO_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sh.id}-to-in-cat.zip`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo'); }
  };

  const build3d = () => import('@/lib/coaster-3d').then((m) => m.coasterBuilder({
    front: svgOf(frontRef), back: svgOf(backRef), d: sh.d, wMm: sh.wMm, hMm: sh.hMm, material: spec.material,
    rubber: coBaseColor(spec), fontCss: CO_FONT_CSS, drink: DRINK[spec.purpose], straw: coAccent(spec), ring: sh.kind !== 'die',
  }));
  // hook QC (dev): chụp 3D đúng góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __coSnap?: (w: number, h: number) => Promise<string> }).__coSnap = async (w, h) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return (await core.snapshot(b, w, h)).toDataURL('image/png');
  };
  const orderTitle = `Lót ly ${sh.name} · ${mat.name} · in 2 mặt`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const aspect = `${sh.wMm} / ${sh.hMm}`;
  const thumbBg = spec.material === 'wood' ? 'linear-gradient(135deg,#E8D2B0,#D3B286)' : '#E9ECF1';
  const field = (side: 'front' | 'back') => (
    <div className="grid grid-cols-2 gap-3">
      {CO_FIELDS.filter((f) => f.side === side).map((f) => (
        <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
          <span className="mv-label block mb-1.5">{f.label}</span>
          <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`co-field-${f.key}`} />
        </label>
      ))}
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Lót ly in logo" sub="Lót ly quán cà phê, bar, trà sữa, nhà hàng, đám cưới — in 2 mặt (mặt sau wifi + QR), cắt tròn, vuông hoặc theo hình hạt cà phê, chiếc lá, chiếc ly. Giấy bồi, gỗ hoặc cao su." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CO_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {CO_TEMPLATES.map((t) => {
                  const on = spec.shape === t.spec.shape && spec.palette === t.spec.palette && spec.layout === t.spec.layout && spec.purpose === t.spec.purpose;
                  const ts = coShape(t.spec.shape);
                  const td = t.spec.purpose === spec.purpose ? data : switchData(data, spec.purpose, t.spec.purpose);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="co-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg grid place-items-center p-3 aspect-square" style={{ background: thumbBg }}>
                        <div style={{ width: ts.wMm >= ts.hMm ? '100%' : `${(ts.wMm / ts.hMm) * 100}%`, aspectRatio: `${ts.wMm} / ${ts.hMm}` }}>
                          <CoasterSvg spec={{ ...spec, ...t.spec }} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung mặt trước">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Ngành (đổi hình minh hoạ + chữ mẫu + ly nước trong ảnh 3D)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="co-purposes">
                    {CO_PURPOSES.map((p) => <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={chip(spec.purpose === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                {field('front')}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="co-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Logo thay hình minh hoạ · ảnh xử lý ngay trên máy</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mặt sau (wifi · QR · instagram)">
              <div className="space-y-2">
                {field('back')}
                <div className="text-[11px] text-slate-400">Mã QR tạo từ link (quét được thật). Đám cưới: mặt sau in lời cảm ơn + QR album, không in wifi.</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Hình cắt, bố cục, màu & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Hình / khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="co-shapes">
                    {CO_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)} data-testid="co-shape">{s.name}{s.kind === 'die' ? ` ${s.wMm / 10}×${s.hMm / 10}cm` : ''}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="co-layouts">
                    {CO_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid="co-layout">{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="co-palettes">
                    {CO_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="co-fonts">
                    {CO_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="co-materials">
                    {CO_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} !py-2 text-left`} data-testid={`co-mat-${m.id}`}>
                        <span className="font-semibold">{m.name}</span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{m.note}</span>
                      </button>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.shape}|${spec.material}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg grid grid-cols-2 gap-4 p-5" style={{ background: thumbBg }}>
                {(['front', 'back'] as const).map((side) => (
                  <div key={side} className="grid place-items-center">
                    <div data-testid={`co-preview-${side}`} style={{ width: sh.wMm >= sh.hMm ? '100%' : `${(sh.wMm / sh.hMm) * 100}%`, aspectRatio: aspect }}>
                      <CoasterSvg spec={spec} data={data} logo={logo} side={side} cut style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
                    </div>
                    <div className="text-[10.5px] text-slate-600 mt-1.5">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in mặt trước {CO_SHEET.wMm / 10}×{CO_SHEET.hMm / 10}cm · {fit.per} cái · nét hồng = đường bế (CutContour)</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[220px]" data-testid="co-sheet">
                  <CoasterSheetSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sh.name}{sh.kind === 'die' ? ` (${sh.wMm}×${sh.hMm}mm)` : ''} · {mat.name} · in 2 mặt · lề xén {CO_BLEED_MM}mm · {fit.per} cái/tờ</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="co-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="co-png">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="co-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="co-pdf" title="2 trang: mặt trước + mặt sau, lề xén 2mm + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in 2 mặt
              </button>
              <button type="button" onClick={downloadZip} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs col-span-2" data-testid="co-zip" title="Tờ mặt trước (In + CutContour) + tờ mặt sau (cột đảo ngược), chữ đã outline">
                {busy === 'zip' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt 2 mặt (.zip)
              </button>
            </div>
            <PrintRequest product="coaster" title={orderTitle} defaultMaterial={spec.material === 'pulp' ? 'Lót ly giấy bồi dày 1.5mm' : spec.material === 'wood' ? 'Lót ly gỗ in UV' : 'Lót ly silicon/cao su'} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in–cắt: tờ mặt trước có lớp <b>In</b> (tràn lề 2mm) + <b>CutContour</b> (đường bế, spot Magenta); tờ mặt sau xếp cột ngược để in 2 mặt khớp khi lật giấy ngang — chữ đã outline, có dấu đăng ký 4 góc. Gỗ: chỗ không in để lộ vân gỗ; cao su: đúc 1 màu mực trên nền màu.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={frontRef}><CoasterSvg spec={spec} data={data} logo={logo} side="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backRef}><CoasterSvg spec={spec} data={data} logo={logo} side="back" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={frontBleed}><CoasterSvg spec={spec} data={data} logo={logo} side="front" bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backBleed}><CoasterSvg spec={spec} data={data} logo={logo} side="back" bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetF}><CoasterSheetSvg spec={spec} data={data} logo={logo} side="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetB}><CoasterSheetSvg spec={spec} data={data} logo={logo} side="back" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
