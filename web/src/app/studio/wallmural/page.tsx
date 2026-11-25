'use client';
// Tranh dán tường: chọn mẫu → nhập khổ tường (m) + vùng cửa cần né → sửa chữ / tải ảnh, logo → xem góc quán 3D →
// tải file in đã chia tấm (khổ cuộn, chồng mí, dư mép, số tấm) + trang sơ đồ dán, hoặc gửi yêu cầu in.

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileDown, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';
import {
  WM_EXTRA, WM_FIELDS, WM_FONTS, WM_FONT_CSS, WM_LAYOUTS, WM_OVERLAPS, WM_PALETTES, WM_ROLLS, WM_TEMPLATES, WM_WALLS,
  MapSvg, MuralSvg, PanelSvg, defaultWMData, photoDpiWall, useWMFonts, wmLayout, wmPalette, wmPanels, wmScene,
  type WMData, type WMPhoto, type WMSpec, type WMTemplate,
} from '@/lib/wallmural-engine';
import { samplePhotos } from '@/lib/canvas-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: WMSpec = {
  layout: 'tropical', palette: 'cream', font: 'playfair', W: 4000, H: 2700, roll: 1200, overlap: 30,
  obs: { on: false, x: 2700, y: 600, w: 900, h: 2100, label: 'Cửa' },
};
const MAX_PX = 6000;

async function readImage(file: File, max: number): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    const png = /png|webp|svg/.test(file.type);
    return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.92), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
// khổ lớn nhìn xa: ~50–100 dpi, giới hạn ~7000 px cạnh dài mỗi tấm cho máy nhẹ
const dpiFor = (maxMm: number) => Math.max(40, Math.min(100, Math.floor((7000 * 25.4) / maxMm)));
async function renderSvg(el: SVGSVGElement, wMm: number, hMm: number, dpi: number) {
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  return svgToCanvas(await selfContainedSvg(el, WM_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
}
async function panelsPdf(mapEl: SVGSVGElement, panelEls: SVGSVGElement[], sizes: { w: number; h: number }[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: [420, 297], orientation: 'landscape', compress: true });
  const mc = await renderSvg(mapEl, 420, 297, 150);
  pdf.addImage(mc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
  for (let i = 0; i < panelEls.length; i++) {
    const { w, h } = sizes[i];
    pdf.addPage([w, h], w >= h ? 'landscape' : 'portrait');
    const c = await renderSvg(panelEls[i], w, h, dpiFor(Math.max(w, h)));
    pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, w, h, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function WallMuralPage() {
  const ready = useWMFonts();
  const [spec, setSpec] = useState<WMSpec>(FIRST);
  const [data, setData] = useState<WMData>(defaultWMData('tropical'));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState<WMPhoto | null>(null);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [flatView, setFlatView] = useState<'wall' | 'map'>('wall');
  const [wIn, setWIn] = useState('400'), [hIn, setHIn] = useState('270');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setPhoto({ ...samplePhotos()[0] }); }, []); // ảnh minh hoạ vẽ bằng code cho mẫu "ảnh"

  const set = (p: Partial<WMSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setObs = (p: Partial<WMSpec['obs']>) => setSpec((s) => ({ ...s, obs: { ...s.obs, ...p } }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: WMTemplate) => {
    set(t.spec);
    if (!dirty) setData(defaultWMData(t.spec.layout));
  };
  const setWall = (wMm: number, hMm: number) => {
    const W = Math.round(Math.min(12000, Math.max(800, wMm))), H = Math.round(Math.min(5000, Math.max(800, hMm)));
    setWIn(String(W / 10)); setHIn(String(H / 10));
    setSpec((s) => {
      // giữ vùng cửa nằm trong tường mới
      const o = s.obs;
      const ow = Math.min(o.w, W * 0.8), oh = Math.min(o.h, H);
      return { ...s, W, H, obs: { ...o, w: ow, h: oh, x: Math.min(Math.max(0, o.x), W - ow), y: Math.min(Math.max(0, o.y), H - oh) } };
    });
  };
  const applyWallInputs = () => {
    const w = parseFloat(wIn.replace(',', '.')), h = parseFloat(hIn.replace(',', '.'));
    if (w > 0 && h > 0) setWall(w * 10, h * 10);
  };
  const obsPreset = (kind: 'door-r' | 'door-l' | 'window') => {
    const { W, H } = spec;
    if (kind === 'window') { const w = Math.min(1200, W * 0.3), h = Math.min(1100, H * 0.4); setObs({ on: true, label: 'Cửa sổ', w, h, x: (W - w) / 2, y: H * 0.3 }); return; }
    const w = Math.min(900, W * 0.3), h = Math.min(2100, H - 100);
    setObs({ on: true, label: 'Cửa', w, h, x: kind === 'door-r' ? W - w - Math.min(400, W * 0.08) : Math.min(400, W * 0.08), y: H - h });
  };

  const L = wmLayout(spec.layout);
  const pal = wmPalette(spec.palette);
  const panels = useMemo(() => wmPanels(spec.W, spec.H, spec.roll, spec.overlap), [spec.W, spec.H, spec.roll, spec.overlap]);
  const fields = WM_FIELDS.filter((f) => f.layouts.includes(spec.layout));
  const usesPhoto = spec.layout === 'photo';
  const usesLogo = spec.layout === 'brand' || spec.layout === 'values';
  const dpi = usesPhoto && photo ? photoDpiWall(spec.W, spec.H, photo) : 0;
  const lowDpi = usesPhoto && !!photo && !photo.sample && dpi < 35;
  const slug = slugify(`tranh-dan-tuong-${data.small || data.title || ''}`, 'tranh-dan-tuong');
  const wallName = `${(spec.W / 1000).toFixed(2).replace('.', ',')}×${(spec.H / 1000).toFixed(2).replace('.', ',')}m`;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsIn = (el: HTMLDivElement | null) => Array.from(el?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const pdfName = `${slug}-${spec.W / 10}x${spec.H / 10}cm-${panels.length}tam.pdf`;
  const makePdf = async () => {
    const els = svgsIn(printRef.current);
    const map = mapRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!map || els.length !== panels.length) throw new Error('Chưa dựng xong file in, thử lại nhé.');
    return panelsPdf(map, els, panels.map((p) => ({ w: p.w, h: p.h })));
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadPng = () => run('png', async () => {
    const el = viewRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (el) downloadBlob(await svgToPng(el, WM_FONT_CSS, 2400), `${slug}-tong-the.png`);
  });
  const downloadShot = () => run('shot', async () => {
    if (!view3d.current) return;
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-anh-3d.png`);
  });
  const makeFiles = async () => {
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : svgToPng(viewRef.current!.querySelector('svg') as SVGSVGElement, WM_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/wallmural-3d').then((m) => m.wallmuralBuilder({
    tex: texRef.current?.querySelector('svg') as SVGSVGElement | null, W: spec.W, H: spec.H, fontCss: WM_FONT_CSS,
    obs: spec.obs.on ? spec.obs : null, dark: !!pal.dark, ...wmScene(spec.layout),
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __wmSnap?: (w: number, h: number) => Promise<string> }).__wmSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const im = await readImage(f, MAX_PX); setPhoto({ ...im, zoom: 1, px: 0, py: 0, name: f.name }); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo((await readImage(f, 900)).src); } catch { alert('Không đọc được logo này.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = `${spec.W} / ${spec.H}`;
  const rebuildKey = JSON.stringify([spec, data, usesPhoto ? [photo?.src.length, photo?.zoom, photo?.px, photo?.py] : 0, usesLogo ? logo.length : 0]);
  const orderTitle = `Tranh dán tường ${wallName} · ${L.name} · ${panels.length} tấm`;
  const pv = { photo: usesPhoto ? photo : null, logo: usesLogo ? logo : '' };
  const num = (v: number) => Math.round(v / 10);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tranh dán tường" sub="Decal dán tường khổ lớn cho quán cà phê, văn phòng, homestay, phòng bé — nhập khổ tường, né cửa, file in tự chia tấm theo khổ cuộn kèm sơ đồ dán." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${WM_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {WM_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const ts: WMSpec = { ...spec, ...t.spec };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="wm-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#ECE7DF] aspect-[4/3] grid place-items-center overflow-hidden">
                        <MuralSvg spec={ts} data={dirty ? data : defaultWMData(t.spec.layout)} photo={t.spec.layout === 'photo' ? photo : null} logo={logo} mode="thumb" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Khổ tường & vùng cần né">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="wm-walls">
                  {WM_WALLS.map((w) => <button key={w.id} type="button" onClick={() => setWall(w.w, w.h)} className={chip(spec.W === w.w && spec.H === w.h)}>{w.name}</button>)}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1"><span className="text-xs font-medium text-slate-400">Rộng (cm)</span>
                    <input className="mv-input w-28" inputMode="decimal" value={wIn} onChange={(e) => setWIn(e.target.value)} onBlur={applyWallInputs} onKeyDown={(e) => e.key === 'Enter' && applyWallInputs()} data-testid="wm-w" /></label>
                  <label className="space-y-1"><span className="text-xs font-medium text-slate-400">Cao (cm)</span>
                    <input className="mv-input w-28" inputMode="decimal" value={hIn} onChange={(e) => setHIn(e.target.value)} onBlur={applyWallInputs} onKeyDown={(e) => e.key === 'Enter' && applyWallInputs()} data-testid="wm-h" /></label>
                  <button type="button" onClick={applyWallInputs} className="mv-btn mv-btn-ghost !py-2 !text-xs" data-testid="wm-apply">Áp dụng</button>
                </div>
                <div className="space-y-2 rounded-xl border border-mv-hair p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-400 mr-1">Cửa / cửa sổ trên tường:</span>
                    <button type="button" onClick={() => setObs({ on: false })} className={chip(!spec.obs.on)} data-testid="wm-obs-none">Không có</button>
                    <button type="button" onClick={() => obsPreset('door-r')} className={chip(spec.obs.on && spec.obs.label === 'Cửa' && spec.obs.x > spec.W / 2)} data-testid="wm-obs-door">Cửa đi bên phải</button>
                    <button type="button" onClick={() => obsPreset('door-l')} className={chip(spec.obs.on && spec.obs.label === 'Cửa' && spec.obs.x <= spec.W / 2)}>Cửa đi bên trái</button>
                    <button type="button" onClick={() => obsPreset('window')} className={chip(spec.obs.on && spec.obs.label !== 'Cửa')} data-testid="wm-obs-window">Cửa sổ</button>
                  </div>
                  {spec.obs.on && (
                    <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400" data-testid="wm-obs-fields">
                      {([['x', 'Cách trái'], ['y', 'Cách trần'], ['w', 'Rộng'], ['h', 'Cao']] as const).map(([k, n]) => (
                        <label key={k} className="space-y-0.5">{n} (cm)
                          <input type="number" className="mv-input !py-1" value={num(spec.obs[k])} onChange={(e) => {
                            const v = Math.max(0, (parseFloat(e.target.value) || 0) * 10);
                            const o = { ...spec.obs, [k]: v };
                            o.w = Math.min(o.w, spec.W); o.h = Math.min(o.h, spec.H); o.x = Math.min(o.x, spec.W - o.w); o.y = Math.min(o.y, spec.H - o.h);
                            setObs(o);
                          }} />
                        </label>
                      ))}
                      <p className="col-span-4 text-[11px] text-slate-500">Nội dung chính (chữ, hình lớn) tự dời sang vùng trống; vùng cửa vẫn in nhưng thợ cắt bỏ khi dán.</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Khổ cuộn in (rộng mỗi tấm)</div>
                    <div className="flex gap-1.5" data-testid="wm-rolls">{WM_ROLLS.map((r) => <button key={r} type="button" onClick={() => set({ roll: r })} className={chip(spec.roll === r)}>{(r / 1000).toFixed(2).replace('.', ',')} m</button>)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Chồng mí</div>
                    <div className="flex gap-1.5" data-testid="wm-overlaps">{WM_OVERLAPS.map((o) => <button key={o} type="button" onClick={() => set({ overlap: o })} className={chip(spec.overlap === o)}>{o / 10} cm</button>)}</div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-3">
                {usesPhoto && (
                  <div className="flex gap-3 items-start rounded-xl border border-mv-hair p-2.5" data-testid="wm-photo-slot">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-ink/[0.04]">{photo && <img src={photo.src} alt="" className="w-full h-full object-cover" />}</div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => photoInput.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="wm-photo-btn"><ImagePlus className="w-3.5 h-3.5" /> {photo?.sample ? 'Tải ảnh' : 'Đổi ảnh'}</button>
                        <button type="button" onClick={() => photo && setPhoto({ ...photo, zoom: 1, px: 0, py: 0 })} className="mv-btn mv-btn-ghost !py-1 !text-xs" title="Căn lại giữa"><RotateCcw className="w-3.5 h-3.5" /></button>
                        {photo && !photo.sample && (
                          <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${dpi >= 60 ? 'text-emerald-600' : dpi >= 35 ? 'text-amber-600' : 'text-rose-600'}`} data-testid="wm-dpi" data-dpi={Math.round(dpi)}>
                            {dpi >= 35 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {dpi >= 60 ? 'Nét' : dpi >= 35 ? 'Tạm được (nhìn xa)' : 'Ảnh mờ — dễ vỡ hạt'} · {Math.round(dpi)} dpi
                          </span>
                        )}
                        {photo?.sample && <span className="text-[11px] text-slate-500">Ảnh minh hoạ — thay bằng ảnh của anh chị</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <label className="space-y-0.5">Phóng to<input type="range" min={1} max={3} step={0.02} value={photo?.zoom ?? 1} onChange={(e) => photo && setPhoto({ ...photo, zoom: +e.target.value })} className="w-full" data-testid="wm-zoom" /></label>
                        <label className="space-y-0.5">Kéo ngang<input type="range" min={-1} max={1} step={0.02} value={photo?.px ?? 0} onChange={(e) => photo && setPhoto({ ...photo, px: +e.target.value })} className="w-full" /></label>
                        <label className="space-y-0.5">Kéo dọc<input type="range" min={-1} max={1} step={0.02} value={photo?.py ?? 0} onChange={(e) => photo && setPhoto({ ...photo, py: +e.target.value })} className="w-full" /></label>
                      </div>
                    </div>
                    <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="wm-photo" />
                  </div>
                )}
                {lowDpi && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex gap-2" data-testid="wm-dpi-warn">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Ảnh hơi nhỏ so với bức tường {wallName} — dán lên sẽ mờ/vỡ hạt khi đứng gần. Nên dùng ảnh gốc độ phân giải cao (≥ {Math.round((spec.W / 25.4) * 40)} px chiều ngang), hoặc chọn mẫu vẽ sẵn.
                  </div>
                )}
                {usesLogo && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => logoInput.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="wm-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}</button>
                    {logo && <><img src={logo} alt="" className="h-8 w-8 object-contain rounded bg-white" /><button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-1 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button></>}
                    <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="wm-logo" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={`${f.key}-${f.label}`} className={`space-y-1 ${f.multiline ? 'sm:col-span-2' : ''}`}>
                      <span className="text-xs font-medium text-slate-400">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`wm-field-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`wm-field-${f.key}`} />}
                    </label>
                  ))}
                </div>
                {dirty && <button type="button" onClick={() => { setData(defaultWMData(spec.layout)); setDirty(false); }} className="text-[11px] text-indigo-400 hover:underline">Nạp lại chữ mẫu của bố cục này</button>}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu, kiểu chữ & bố cục">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="wm-palettes">
                  {WM_PALETTES.map((p) => (
                    <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`${chip(spec.palette === p.id)} inline-flex items-center gap-1.5`}>
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} />{p.name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="wm-fonts">
                  {WM_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"` }}>{f.name}</button>)}
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="wm-layouts">
                  {WM_LAYOUTS.map((l) => <button key={l.id} type="button" title={l.use} onClick={() => { set({ layout: l.id }); if (!dirty) setData(defaultWMData(l.id)); }} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* xem trước ghim */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.W}|${spec.H}|${spec.obs.on}`} debounce={500} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-end gap-1.5 text-[11px]">
                <button type="button" onClick={() => setFlatView('wall')} className={chip(flatView === 'wall')}>Bức tường + vạch tấm</button>
                <button type="button" onClick={() => setFlatView('map')} className={chip(flatView === 'map')} data-testid="wm-show-map">Sơ đồ dán</button>
              </div>
              <div className={`rounded-lg bg-[#ECE7DF] p-3 ${flatView === 'wall' ? '' : 'hidden'}`} data-testid="wm-view">
                <div className="shadow-[3px_6px_16px_-4px_rgba(0,0,0,0.35)] mx-auto" style={{ aspectRatio: ratio, maxHeight: 360, width: spec.W >= spec.H ? '100%' : 'auto', height: spec.W >= spec.H ? 'auto' : 360 }}>
                  <MuralSvg spec={spec} data={data} {...pv} mode="view" seams style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              {flatView === 'map' && <div className="rounded-lg border border-mv-hair bg-white overflow-hidden"><MapSvg spec={spec} data={data} {...pv} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>}
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="wm-summary" data-panels={panels.length}>
              Tường {wallName} · {panels.length} tấm × {(panels[0].w / 1000).toFixed(3).replace('.', ',')} m (cuộn {(spec.roll / 1000).toFixed(2).replace('.', ',')} m) · chồng mí {spec.overlap / 10} cm · dư mép {WM_EXTRA / 10} cm
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadShot} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wm-shot">
                {busy === 'shot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="wm-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({panels.length} tấm)
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wm-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG tổng thể
              </button>
            </div>
            <PrintRequest product="wallmural" title={orderTitle} defaultMaterial="Decal PP dán tường cán mờ"
              design={{ spec, data, panels: panels.length, photo: usesPhoto && photo ? { name: photo.name, sample: !!photo.sample, w: photo.w, h: photo.h } : null, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF gồm trang sơ đồ dán (A3) + từng tấm đúng khổ thật (~{dpiFor(spec.H + WM_EXTRA * 2)} dpi — chuẩn tranh tường nhìn xa). Mỗi tấm có số thứ tự, mũi tên TRÊN, vạch chồng mí; dư mép {WM_EXTRA / 10} cm quanh tường để thợ xén theo trần, sàn.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D, các tấm in, sơ đồ (cần nằm trong DOM để outline chữ) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={viewRef}><MuralSvg spec={spec} data={data} {...pv} mode="view" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texRef}><MuralSvg spec={spec} data={data} {...pv} mode="tex" seams style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="wm-print">{panels.map((p) => <div key={p.i}><PanelSvg spec={spec} data={data} {...pv} panel={p} style={{ width: 200, height: 'auto', display: 'block' }} /></div>)}</div>
          <div ref={mapRef} data-testid="wm-map"><MapSvg spec={spec} data={data} {...pv} style={{ width: 800, height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
