'use client';
// Tem bảo hành · tem vỡ · tem niêm phong: chọn mẫu → điền shop/hotline/seri → chọn chất liệu (decal vỡ, bạc 7 màu, giấy)
// → xem thành phẩm 3D → tải tờ in A4 (mỗi con 1 số seri, lớp In + CutContour) hoặc gửi yêu cầu in.

import { Suspense, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  SEAL_BLEED_MM, SEAL_FIELDS, SEAL_FONTS, SEAL_FONT_CSS, SEAL_MATERIALS, SEAL_PALETTES, SEAL_TEMPLATES, SHEET,
  SealSheetSvg, SealSvg, defaultSealData, sealCount, sealLayout, sealSize, serialOf, sheetFit, sheetPages, useSealFonts, zipStore,
  type SealData, type SealKind, type SealSpec,
} from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const firstOf = (kind: SealKind): SealSpec => {
  const t = SEAL_TEMPLATES.find((x) => x.spec.kind === kind)!;
  return { ...t.spec };
};

export default function SealPage() {
  return <Suspense fallback={null}><SealStudio /></Suspense>;
}

function SealStudio() {
  const qs = useSearchParams();
  const ready = useSealFonts();
  const [spec, setSpec] = useState<SealSpec>(() => firstOf(qs.get('kind') === 'seal' ? 'seal' : 'warranty'));
  const [data, setData] = useState<SealData>(defaultSealData());
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [sheetPage, setSheetPage] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLDivElement | null>(null);
  const stampRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = sealSize(spec.size);
  const layout = sealLayout(spec.layout);
  const fit = sheetFit(spec);
  const pages = sheetPages(spec, data);
  const count = sealCount(data);
  const label = spec.kind === 'seal' ? 'tem-niem-phong' : 'tem-bao-hanh';
  const slug = slugify(`${label}-${(spec.kind === 'seal' ? data.brand : data.shop) || ''}`, label);

  const setKind = (k: SealKind) => { if (k !== spec.kind) setSpec(firstOf(k)); };
  const pickTpl = (t: (typeof SEAL_TEMPLATES)[number]) => setSpec((s) => {
    const l = sealLayout(t.spec.layout);
    return { ...t.spec, size: l.sizes.includes(s.size) ? s.size : t.spec.size };
  });
  const set = (p: Partial<SealSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); setSheetPage(0); }
  };

  // Tờ in số i: hình tem (defs) thay bằng bản đã outline, số seri từng con outline → file vector độc lập font
  const sheetSvg = async (i: number): Promise<SVGSVGElement> => {
    flushSync(() => setSheetPage(i));
    const el = svgOf(sheetRef), stamp = svgOf(stampRef);
    if (!el || !stamp) throw new Error('Chưa dựng xong tờ in');
    const [clone, st] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(stamp, undefined, { outline: true })]);
    const vb = stamp.viewBox.baseVal;
    st.setAttribute('width', String(vb.width)); st.setAttribute('height', String(vb.height));
    clone.querySelector('[data-stamp-def] > svg')?.replaceWith(st);
    if (clone.querySelector('text')) { // còn chữ chưa outline được → nhúng font cho chắc
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(SEAL_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return clone;
  };
  const ser = (s: SVGSVGElement) => new XMLSerializer().serializeToString(s);

  const cutFile = async (): Promise<{ blob: Blob; name: string }> => {
    if (pages === 1) {
      const s = await sheetSvg(0);
      return { blob: new Blob([ser(s)], { type: 'image/svg+xml' }), name: `${slug}-${sz.id}-${count}con-to-in-cat.svg` };
    }
    const enc = new TextEncoder(); const files: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < pages; i++) {
      setBusy(`svg ${i + 1}/${pages}`);
      files.push({ name: `${slug}-to-${String(i + 1).padStart(2, '0')}.svg`, data: enc.encode(ser(await sheetSvg(i))) });
    }
    return { blob: zipStore(files), name: `${slug}-${sz.id}-${count}con-${pages}to-in-cat.zip` };
  };

  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, SEAL_FONT_CSS, 1600), `${slug}-1-con.png`);
  });
  const downloadSvg = () => run('svg', async () => { const f = await cutFile(); downloadBlob(f.blob, f.name); });
  const downloadPdf = () => run('pdf', async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [SHEET.wMm, SHEET.hMm], orientation: 'portrait', compress: true });
    const outW = Math.round((SHEET.wMm / 25.4) * 300), outH = Math.round((SHEET.hMm / 25.4) * 300);
    for (let i = 0; i < pages; i++) {
      setBusy(`pdf ${i + 1}/${pages}`);
      const s = await sheetSvg(i);
      s.querySelector('#CutContour')?.remove(); // PDF = lớp in; đường bế nằm ở file SVG
      const c = await svgToCanvas(s, outW, outH, '#ffffff');
      if (i > 0) pdf.addPage([SHEET.wMm, SHEET.hMm], 'portrait');
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, SHEET.wMm, SHEET.hMm, undefined, 'FAST');
    }
    downloadBlob(pdf.output('blob'), `${slug}-${sz.id}-${count}con-${pages}to.pdf`);
  });

  const makeFiles = async () => {
    const pv = svgOf(previewRef);
    if (!pv) throw new Error('Chưa dựng xong tem, thử lại nhé.');
    const f = await cutFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, SEAL_FONT_CSS, 900))
      : await svgToJpeg(pv, SEAL_FONT_CSS, 900);
    return { file: f.blob, fileName: f.name, preview };
  };

  // hook cho QC (Playwright chụp ảnh 3D lớn để soi)
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __sealSnap?: (w: number, h: number) => Promise<string> }).__sealSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/seal-3d').then((m) => m.sealBuilder({
    ink: svgOf(inkRef), shape: sz.shape, wMm: sz.wMm, hMm: sz.hMm, kind: spec.kind, material: spec.material, fontCss: SEAL_FONT_CSS,
    serials: Array.from({ length: 9 }, (_, i) => serialOf(data, i)),
  }));
  const matName = SEAL_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const orderTitle = `${spec.kind === 'seal' ? 'Tem niêm phong' : 'Tem bảo hành'} ${sz.name} · ${matName} · ${count} con`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = SEAL_TEMPLATES.filter((t) => t.spec.kind === spec.kind);
  const fields = SEAL_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const busyLabel = (k: string, txt: string) => (busy.startsWith(k) ? (busy.includes(' ') ? busy.split(' ')[1] : '') : txt);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tem bảo hành · niêm phong" sub="Tem vỡ, tem bạc 7 màu, tem niêm phong miệng hộp — mỗi con 1 số seri riêng, file in–cắt chuẩn xưởng (lớp In + CutContour)." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'warranty'} onClick={() => setKind('warranty')} data-testid="seal-kind-warranty">Tem bảo hành · tem vỡ</button>
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'seal'} onClick={() => setKind('seal')} data-testid="seal-kind-seal">Tem niêm phong</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className={`grid gap-2.5 ${spec.kind === 'seal' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'}`}>
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  const l = sealLayout(t.spec.layout);
                  const tsize = l.sizes.includes(spec.size) ? spec.size : t.spec.size;
                  const ts = sealSize(tsize);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="seal-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#EEF0F4] grid place-items-center p-3" style={{ aspectRatio: spec.kind === 'seal' ? '3 / 1' : ts.shape === 'round' ? '1 / 1' : '2 / 1' }}>
                        <SealSvg spec={{ ...t.spec, size: tsize }} data={data} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 2px 4px rgba(15,23,42,0.18))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin & số seri">
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`seal-field-${f.key}`} />
                  </label>
                ))}
                <label className="block col-span-2 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Tiền tố seri</span>
                  <input className="mv-input" value={data.prefix || ''} maxLength={4} onChange={(e) => setField('prefix', e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())} placeholder="AK" data-testid="seal-prefix" />
                </label>
                <label className="block col-span-1 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Số bắt đầu</span>
                  <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="1" data-testid="seal-start" />
                </label>
                <label className="block col-span-1 sm:col-span-2">
                  <span className="mv-label block mb-1.5">Số lượng tem (mỗi con 1 số)</span>
                  <input className="mv-input" inputMode="numeric" value={data.count || ''} onChange={(e) => setField('count', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="500" data-testid="seal-count" />
                </label>
                <div className="col-span-2 text-[11px] text-slate-400">
                  Seri chạy từ <b className="text-mv-fg">{serialOf(data, 0)}</b> đến <b className="text-mv-fg">{serialOf(data, count - 1)}</b> · {fit.per} con/tờ A4 · {pages} tờ
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chất liệu, màu & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chất liệu decal</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="seal-materials">
                    {SEAL_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} !py-2 text-left`}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: m.id === 'holo' ? 'conic-gradient(#f3c4e4,#c3e3f7,#cff3d2,#f6edb9,#dcccf6,#f3c4e4)' : m.id === 'void' ? 'repeating-linear-gradient(45deg,#fff 0 3px,#e5e7eb 3px 4px)' : '#fff' }} />
                          <span className="font-semibold">{m.name}</span>
                        </span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{m.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu mực</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="seal-palettes">
                    {SEAL_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: pl.ink }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-3 gap-1.5" data-testid="seal-fonts">
                    {SEAL_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {spec.kind === 'seal' ? 'NIÊM PHONG' : 'BẢO HÀNH'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ tem ({layout.name})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {layout.sizes.map((id) => <button key={id} type="button" onClick={() => set({ size: id })} className={chip(spec.size === id)} data-testid="seal-size">{sealSize(id).name}mm</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.shop, data.months, data.hotline, data.voidText, data.brand, data.warn, data.prefix, data.start])} refitKey={`${spec.kind}|${spec.size}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#EEF0F4] grid place-items-center p-6" style={{ aspectRatio: sz.shape === 'round' ? '4 / 3' : spec.kind === 'seal' ? '5 / 2' : '2 / 1' }}>
                <div ref={previewRef} data-testid="seal-preview" style={{ width: sz.shape === 'round' ? '62%' : '100%', aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                  <SealSvg spec={spec} data={data} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.25))' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in A4 · trang 1/{pages} · {Math.min(fit.per, count)} con · seri riêng từng con · nét hồng = đường bế</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[260px]" data-testid="seal-sheet">
                  <SealSheetSvg spec={spec} data={data} page={0} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name}mm · {matName} · {count} con · {pages} tờ A4 · nền tràn {SEAL_BLEED_MM}mm</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="seal-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="seal-svg" title="File in–cắt vector: lớp In + CutContour, mỗi con 1 số seri — xưởng nạp thẳng máy in–cắt decal">
                {busy.startsWith('svg') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyLabel('svg', pages > 1 ? 'File cắt (.zip)' : 'File cắt SVG')}
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="seal-pdf">
                {busy.startsWith('pdf') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyLabel('pdf', 'PDF in')}
              </button>
            </div>
            <PrintRequest product="seal" title={orderTitle} defaultMaterial={matName} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File cắt: mỗi tờ A4 có lớp <b>In</b> (hình + số seri từng con) và <b>CutContour</b> (đường bế, spot Magenta) — chữ đã outline, xưởng in–cắt thẳng không cần font. Tem bạc 7 màu: phần nền là chất liệu bạc, file chỉ chứa mực in.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: mực in 1 con (3D), hình tem có lề xén (outline cho tờ in), tờ in trang đang xuất */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={inkRef}><SealSvg spec={spec} data={data} print style={{ width: '100%', display: 'block' }} /></div>
          <div ref={stampRef}><SealSvg spec={spec} data={data} print bleed serial={null} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef}><SealSheetSvg spec={spec} data={data} page={sheetPage} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
