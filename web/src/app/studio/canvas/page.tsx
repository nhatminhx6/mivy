'use client';
// Tranh canvas in ảnh: chọn mẫu (1 ảnh / ghép / ảnh + chữ / bộ 3 tấm) → tải ảnh (chỉ xử lý trên máy) → căn ảnh
// (phóng to, kéo) → khổ, khung dày, kiểu mép → xem tranh treo tường 3D → tải file in (mặt + phần gấp mép + vạch gấp)
// hoặc gửi yêu cầu in. Ảnh thấp phân giải thì cảnh báo trước khi in.

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileDown, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import {
  CV_DEPTHS, CV_EDGES, CV_FIELDS, CV_FONTS, CV_FONT_CSS, CV_LAYOUTS, CV_PALETTES, CV_SAMPLES, CV_SIZES, CV_TEMPLATES, CV_TRIP_GAP,
  CanvasSvg, cvDims, cvLayout, cvPanels, cvPrintDims, cvSize, defaultCVData, photoDpis, samplePhotos, useCVFonts, withSamples,
  type CVData, type CVPhoto, type CVSpec, type CVTemplate,
} from '@/lib/canvas-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: CVSpec = { layout: 'couple', palette: 'cream', font: 'greatvibes', size: '40x60', land: false, depth: 30, edge: 'solid', edgeTone: 'bg' };
const MAX_PX = 5000; // giữ đủ nét cho khổ lớn (60×90 ≈ 140dpi) mà trang không quá nặng

// ảnh khách: chỉ đọc trên máy, thu nhỏ còn ≤5000px
async function loadPhoto(file: File): Promise<CVPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, MAX_PX / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return { src: c.toDataURL('image/jpeg', 0.92), w: c.width, h: c.height, zoom: 1, px: 0, py: 0, name: file.name };
  } finally { URL.revokeObjectURL(url); }
}

// file in: SVG → ảnh đúng mm (dpi tự hạ cho khổ to, tối đa ~7000px cạnh dài) → PDF nhiều trang (bộ 3 tấm = 3 trang)
const dpiFor = (maxMm: number, cap: number, maxPx: number) => Math.max(60, Math.min(cap, Math.floor((maxPx * 25.4) / maxMm)));
async function renderPrint(el: SVGSVGElement, wMm: number, hMm: number, dpi: number) {
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  return svgToCanvas(await selfContainedSvg(el, CV_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
}
async function printPdf(els: SVGSVGElement[], wMm: number, hMm: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation: wMm >= hMm ? 'landscape' : 'portrait', compress: true });
  const dpi = dpiFor(Math.max(wMm, hMm), 150, 7000);
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], wMm >= hMm ? 'landscape' : 'portrait');
    const c = await renderPrint(els[i], wMm, hMm, dpi);
    pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function CanvasPage() {
  const ready = useCVFonts();
  const [spec, setSpec] = useState<CVSpec>(FIRST);
  const [data, setData] = useState<CVData>(defaultCVData());
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<CVPhoto[]>([]);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [showPrint, setShowPrint] = useState(false);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ảnh mẫu vẽ bằng code (chỉ chạy trên trình duyệt)
  useEffect(() => { setPhotos(withSamples(samplePhotos(), 2)); }, []); // mẫu đầu: ảnh cưới · kem (đồi hoa)

  const set = (p: Partial<CVSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: CVTemplate) => {
    const sq = cvSize(spec.size).wMm === cvSize(spec.size).hMm;
    set({ ...t.spec, land: sq ? false : !!t.spec.land });
    if (!dirty && CV_SAMPLES[t.spec.layout]) setData((d) => ({ ...d, ...CV_SAMPLES[t.spec.layout] }));
    setPhotos((ps) => withSamples(ps, t.sample));
  };
  const setPhoto = (i: number, p: Partial<CVPhoto>) => setPhotos((ps) => ps.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const dims = cvDims(spec);
  const L = cvLayout(spec.layout);
  const panels = cvPanels(spec.layout);
  const pd = cvPrintDims(spec);
  const dpis = useMemo(() => (photos.length ? photoDpis(spec, photos) : []), [spec, photos]);
  const slug = slugify(`tranh-canvas-${data.title || ''}`, 'tranh-canvas');
  const square = cvSize(spec.size).wMm === cvSize(spec.size).hMm;
  const usedSample = photos.slice(0, L.photos).some((p) => p.sample);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsOf = (r: RefObject<HTMLDivElement | null>) => Array.from(r.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const printSvgs = () => {
    const els = svgsOf(printRef);
    if (els.length !== panels) throw new Error('Chưa dựng xong tranh, thử lại nhé.');
    return els;
  };
  const pdfName = `${slug}-${dims.name}cm-khung${dims.D / 10}cm${panels > 1 ? '-bo-3-tam' : ''}-file-in.pdf`;

  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(printSvgs(), pd.wMm, pd.hMm), pdfName));
  const downloadJpg = () => run('jpg', async () => {
    const els = printSvgs();
    const dpi = dpiFor(Math.max(pd.wMm, pd.hMm), 150, 6000);
    for (let i = 0; i < els.length; i++) {
      const c = await renderPrint(els[i], pd.wMm, pd.hMm, dpi);
      downloadBlob(await toBlob(c, 'image/jpeg', 0.93), `${slug}-${dims.name}cm${panels > 1 ? `-tam-${i + 1}` : ''}-file-in.jpg`);
    }
  });
  const downloadShot = () => run('shot', async () => {
    if (view3d.current) {
      const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
      downloadBlob(await toBlob(c, 'image/png'), `${slug}-anh-3d.png`);
    } else {
      const el = svgsOf(faceRef)[0]; if (!el) return;
      downloadBlob(await svgToPng(el, CV_FONT_CSS, 1600), `${slug}-xem-truoc.png`);
    }
  });
  const makeFiles = async () => {
    const els = printSvgs();
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : svgToPng(svgsOf(faceRef)[0], CV_FONT_CSS, 900);
    const [file, pre] = await Promise.all([printPdf(els, pd.wMm, pd.hMm), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/canvas-3d').then((m) => m.canvasBuilder({
    texEls: svgsOf(texRef), wMm: dims.W, hMm: dims.H, depth: dims.D, fontCss: CV_FONT_CSS, gap: CV_TRIP_GAP,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __cvSnap?: (w: number, h: number) => Promise<string> }).__cvSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onPhoto = (i: number) => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const p = await loadPhoto(f); setPhotos((ps) => ps.map((x, k) => (k === i ? p : x))); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const edgeName = CV_EDGES.find((e) => e.id === spec.edge)?.name || '';
  const orderTitle = `Tranh canvas ${dims.name}cm${panels > 1 ? ' × 3 tấm' : ''} · khung ${dims.D / 10}cm · ${edgeName} · ${L.name}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = `${dims.W} / ${dims.H}`;
  const fields = CV_FIELDS.filter((f) => f.layouts.includes(spec.layout));
  const photoSet = photos.length ? photos : [];
  const rebuildKey = JSON.stringify([spec, data, photos.map((p) => [p.src.length, p.zoom, p.px, p.py])]);
  const dpiTag = (d: number) => d >= 120 ? { t: 'Nét', c: 'text-emerald-600', ok: true } : d >= 75 ? { t: 'Tạm được', c: 'text-amber-600', ok: true } : { t: 'Ảnh mờ — dễ vỡ hạt', c: 'text-rose-600', ok: false };
  const lowDpi = !usedSample && dpis.slice(0, L.photos).some((d) => d > 0 && d < 75);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tranh canvas in ảnh" sub="In ảnh gia đình, ảnh cưới, ảnh du lịch lên vải canvas căng khung gỗ — ghép nhiều ảnh, thêm tên & ngày, bộ 3 tấm. Ảnh chỉ xử lý trên máy anh chị." />

      {!ready || !photos.length ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CV_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {CV_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const ts: CVSpec = { ...spec, ...t.spec, land: square ? false : !!t.spec.land };
                  const td = cvDims(ts);
                  const n = cvPanels(ts.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="cv-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#ECE7DF] aspect-square grid place-items-center p-3">
                        <div className="flex gap-[4%] items-center justify-center w-full h-full">
                          {Array.from({ length: n }, (_, k) => (
                            <div key={k} className="shadow-[2px_4px_10px_-2px_rgba(0,0,0,0.35)] overflow-hidden" style={{ aspectRatio: `${td.W} / ${td.H}`, [td.W * n > td.H ? 'width' : 'height']: n > 1 ? '30%' : '100%', maxWidth: '100%', maxHeight: '100%' }}>
                              <CanvasSvg spec={ts} data={dirty ? data : { ...data, ...(CV_SAMPLES[ts.layout] || {}) }} photos={withSamples(photoSet, t.sample)} panel={k} style={{ width: '100%', height: '100%', display: 'block' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Ảnh (${L.photos})`}>
              <div className="space-y-3">
                {usedSample && <p className="text-[11px] text-slate-500">Đang dùng ảnh minh hoạ — bấm “Tải ảnh” để thay bằng ảnh của anh chị (ảnh chỉ xử lý trên máy, không gửi đi đâu cho tới khi đặt in).</p>}
                {Array.from({ length: L.photos }, (_, i) => {
                  const p = photos[i];
                  const d = dpis[i] || 0;
                  const tag = dpiTag(d);
                  return (
                    <div key={i} className="flex gap-3 items-start rounded-xl border border-mv-hair p-2.5" data-testid="cv-slot">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-ink/[0.04]">{p && <img src={p.src} alt="" className="w-full h-full object-cover" />}</div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => fileRefs.current[i]?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid={`cv-upload-${i}`}>
                            <ImagePlus className="w-3.5 h-3.5" /> {p?.sample ? 'Tải ảnh' : 'Đổi ảnh'}{L.photos > 1 ? ` ${i + 1}` : ''}
                          </button>
                          <button type="button" onClick={() => setPhoto(i, { zoom: 1, px: 0, py: 0 })} className="mv-btn mv-btn-ghost !py-1 !text-xs" title="Căn lại giữa"><RotateCcw className="w-3.5 h-3.5" /></button>
                          {p && !p.sample && d > 0 && (
                            <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${tag.c}`} data-testid={`cv-dpi-${i}`} data-dpi={Math.round(d)}>
                              {tag.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {tag.t} · {Math.round(d)} dpi
                            </span>
                          )}
                          {p?.sample && <span className="text-[11px] text-slate-500">Ảnh mẫu: {p.name}</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                          <label className="space-y-0.5">Phóng to<input type="range" min={1} max={3} step={0.02} value={p?.zoom ?? 1} onChange={(e) => setPhoto(i, { zoom: +e.target.value })} className="w-full" data-testid={`cv-zoom-${i}`} /></label>
                          <label className="space-y-0.5">Kéo ngang<input type="range" min={-1} max={1} step={0.02} value={p?.px ?? 0} onChange={(e) => setPhoto(i, { px: +e.target.value })} className="w-full" data-testid={`cv-px-${i}`} /></label>
                          <label className="space-y-0.5">Kéo dọc<input type="range" min={-1} max={1} step={0.02} value={p?.py ?? 0} onChange={(e) => setPhoto(i, { py: +e.target.value })} className="w-full" data-testid={`cv-py-${i}`} /></label>
                        </div>
                      </div>
                      <input ref={(el) => { fileRefs.current[i] = el; }} type="file" accept="image/*" className="hidden" onChange={onPhoto(i)} data-testid={`cv-photo-${i}`} />
                    </div>
                  );
                })}
                {lowDpi && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex gap-2" data-testid="cv-dpi-warn">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Ảnh hơi nhỏ so với khổ {dims.name}cm — in ra sẽ mờ/vỡ hạt. Nên chọn khổ nhỏ hơn, bớt phóng to hoặc dùng ảnh gốc (chụp máy ảnh / ảnh gốc điện thoại, không qua Zalo/Facebook).
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {fields.length > 0 && (
              <CollapsibleSection title="3 · Chữ trên tranh">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`space-y-1 ${f.multiline ? 'sm:col-span-2' : ''}`}>
                      <span className="text-xs font-medium text-slate-400">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cv-field-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cv-field-${f.key}`} />}
                    </label>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title={`${fields.length ? 4 : 3} · Khổ, khung & mép tranh`}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Khổ (cm){panels > 1 ? ' — mỗi tấm' : ''}</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cv-sizes">
                    {CV_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id, land: s.wMm === s.hMm ? false : spec.land })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  {!square && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-400">Chiều tranh</div>
                      <div className="flex gap-1.5" data-testid="cv-orient">
                        <button type="button" onClick={() => set({ land: false })} className={chip(!spec.land)}>Dọc</button>
                        <button type="button" onClick={() => set({ land: true })} className={chip(spec.land)}>Ngang</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Khung gỗ dày</div>
                    <div className="flex gap-1.5" data-testid="cv-depths">
                      {CV_DEPTHS.map((d) => <button key={d} type="button" onClick={() => set({ depth: d })} className={chip(spec.depth === d)}>{d / 10} cm</button>)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Mép tranh (cạnh khung)</div>
                  <div className="grid sm:grid-cols-3 gap-1.5" data-testid="cv-edges">
                    {CV_EDGES.map((e) => (
                      <button key={e.id} type="button" onClick={() => set({ edge: e.id })} className={`${chip(spec.edge === e.id)} text-left`}>
                        <div>{e.name}</div><div className="text-[10px] font-normal text-slate-500 leading-snug mt-0.5">{e.hint}</div>
                      </button>
                    ))}
                  </div>
                  {spec.edge === 'solid' && (
                    <div className="flex gap-1.5 pt-1" data-testid="cv-tones">
                      {([['bg', 'Theo màu mẫu'], ['white', 'Trắng'], ['black', 'Đen']] as const).map(([k, n]) => <button key={k} type="button" onClick={() => set({ edgeTone: k })} className={chip(spec.edgeTone === k)}>{n}</button>)}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Màu nền / dải chữ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cv-palettes">
                    {CV_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`${chip(spec.palette === p.id)} inline-flex items-center gap-1.5`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: p.bg }} />{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                {fields.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Kiểu chữ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="cv-fonts">
                      {CV_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"` }}>{f.name}</button>)}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5" data-testid="cv-layouts">
                  <span className="text-xs font-medium text-slate-400 w-full">Bố cục</span>
                  {CV_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.size}|${spec.land}|${spec.layout === 'triptych'}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-end gap-1.5 text-[11px]">
                <button type="button" onClick={() => setShowPrint(false)} className={chip(!showPrint)}>Mặt tranh</button>
                <button type="button" onClick={() => setShowPrint(true)} className={chip(showPrint)} data-testid="cv-show-print">File in (có mép gấp)</button>
              </div>
              <div ref={faceRef} className={`rounded-lg bg-[#ECE7DF] p-4 flex gap-3 items-center justify-center ${showPrint ? 'hidden' : ''}`} data-testid="cv-face">
                {Array.from({ length: panels }, (_, k) => (
                  <div key={k} className="shadow-[3px_6px_16px_-4px_rgba(0,0,0,0.4)] overflow-hidden" style={{ aspectRatio: ratio, width: panels > 1 ? '31%' : dims.W >= dims.H ? '100%' : `${(dims.W / dims.H) * 100}%` }}>
                    <CanvasSvg spec={spec} data={data} photos={photos} panel={k} style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                ))}
              </div>
              {showPrint && (
                <div className={`grid gap-2 ${panels > 1 ? 'grid-cols-3' : ''}`}>
                  {Array.from({ length: panels }, (_, k) => (
                    <div key={k} className="rounded-md overflow-hidden border border-mv-hair bg-white">
                      <CanvasSvg spec={spec} data={data} photos={photos} panel={k} mode="print" style={{ width: '100%', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {dims.name} cm{panels > 1 ? ' × 3 tấm' : ''} · khung {dims.D / 10} cm · {edgeName} · file in {Math.round(pd.wMm / 10)}×{Math.round(pd.hMm / 10)} cm
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadShot} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cv-shot">
                {busy === 'shot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cv-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadJpg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cv-jpg" title="Ảnh file in đúng khổ (gồm mép gấp + vạch gấp)">
                {busy === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Ảnh file in
              </button>
            </div>
            {lowDpi && <p className="text-[11px] text-rose-600 text-center">Có ảnh độ phân giải thấp so với khổ — xem cảnh báo ở mục Ảnh.</p>}
            <PrintRequest product="canvas" title={orderTitle} defaultMaterial="Tranh canvas căng khung gỗ" design={{ spec, data, photos: photos.slice(0, L.photos).map((p) => ({ name: p.name, sample: !!p.sample, w: p.w, h: p.h })) }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm mặt tranh + {dims.wrap / 10} cm mỗi cạnh để gấp qua khung (dày {dims.D / 10} cm) và bấm ghim sau lưng; vạch liền = mép mặt tranh, vạch đứt = mép sau khung.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (mặt + cạnh) và file in (có mép gấp + vạch) */}
      {ready && photos.length > 0 && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texRef}>{Array.from({ length: panels }, (_, k) => <div key={k}><CanvasSvg spec={spec} data={data} photos={photos} panel={k} mode="tex" style={{ width: '100%', display: 'block' }} /></div>)}</div>
          <div ref={printRef} data-testid="cv-print">{Array.from({ length: panels }, (_, k) => <div key={k}><CanvasSvg spec={spec} data={data} photos={photos} panel={k} mode="print" style={{ width: '100%', display: 'block' }} /></div>)}</div>
        </div>
      )}
    </div>
  );
}
