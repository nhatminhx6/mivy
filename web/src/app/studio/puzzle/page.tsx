'use client';
// Puzzle ghép hình in ảnh: chọn mẫu → tải ảnh (chỉ xử lý trên máy, có phóng to/kéo + cảnh báo ảnh mờ) → chữ → số mảnh,
// dáng (chữ nhật / trái tim), chất liệu → xem puzzle 3D trên bàn + hộp quà → tải file in (tràn lề 3mm), file cắt
// CutContour (jigsaw sinh bằng code, cố định theo seed), giấy bồi nắp hộp — hoặc gửi yêu cầu in.

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileDown, ImagePlus, Loader2, RotateCcw, Scissors } from 'lucide-react';
import {
  LidSvg, PZ_BLEED, PZ_FIELDS, PZ_FONTS, PZ_FONT_CSS, PZ_LAYOUTS, PZ_MATERIALS, PZ_PALETTES, PZ_SAMPLES, PZ_SIZES, PZ_TEMPLATES,
  PuzzleCutSvg, PuzzleSvg, defaultPZData, lidDims, loosePieces, looseRows, pieceD, pzDims, pzDpi, pzGrid, pzPalette, pzSize,
  type PZData, type PZSpec, type PZTemplate,
} from '@/lib/puzzle-engine';
import { samplePhotos, useCVFonts, type CVPhoto } from '@/lib/canvas-engine';
import { svgFileBlob, svgToPng, svgToPrintPdf, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PZSpec = { layout: 'caption', palette: 'cream', font: 'greatvibes', size: '120', shape: 'rect', material: 'paper', lines: true };
const MAX_PX = 5000;

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
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function PuzzlePage() {
  const ready = useCVFonts();
  const [spec, setSpec] = useState<PZSpec>(FIRST);
  const [data, setData] = useState<PZData>(defaultPZData('caption'));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhotoState] = useState<CVPhoto | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [showLid, setShowLid] = useState(false);
  const refs = {
    face: useRef<HTMLDivElement | null>(null), tex: useRef<HTMLDivElement | null>(null), groove: useRef<HTMLDivElement | null>(null),
    lidTop: useRef<HTMLDivElement | null>(null), lidSide: useRef<HTMLDivElement | null>(null), print: useRef<HTMLDivElement | null>(null),
    cut: useRef<HTMLDivElement | null>(null), lidPrint: useRef<HTMLDivElement | null>(null),
  };
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setPhotoState({ ...samplePhotos()[2] }); }, []);

  const set = (p: Partial<PZSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const setPhoto = (p: Partial<CVPhoto>) => setPhotoState((x) => (x ? { ...x, ...p } : x));
  const pickTemplate = (t: PZTemplate) => {
    set({ ...t.spec, shape: t.spec.shape ?? 'rect', size: t.spec.size ?? (spec.size === '30' && t.spec.layout !== 'kids' ? '120' : spec.size) });
    if (!dirty) setData({ ...PZ_SAMPLES[t.spec.layout] });
    setPhotoState((x) => (!x || x.sample ? { ...samplePhotos()[t.sample] } : x));
  };

  const dims = pzDims(spec.size, spec.shape);
  const grid = pzGrid(spec.size, spec.shape);
  const size = pzSize(spec.size);
  const mat = PZ_MATERIALS.find((m) => m.id === spec.material)!;
  const pal = pzPalette(spec.palette);
  const lid = lidDims(spec.size);
  const dpi = useMemo(() => pzDpi(spec, photo || undefined), [spec, photo]);
  const slug = slugify(`puzzle-${data.box || data.title || ''}`, 'puzzle');
  const tag = dpi >= 150 ? { t: 'Nét', c: 'text-emerald-600', ok: true } : dpi >= 100 ? { t: 'Tạm được', c: 'text-amber-600', ok: true } : { t: 'Ảnh mờ — dễ vỡ hạt', c: 'text-rose-600', ok: false };
  const lowDpi = !!photo && !photo.sample && dpi > 0 && dpi < 100;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => {
    const el = r.current?.querySelector('svg') as SVGSVGElement | null;
    if (!el) throw new Error('Chưa dựng xong, thử lại nhé.');
    return el;
  };
  const shapeName = spec.shape === 'heart' ? 'trái tim' : 'chữ nhật';
  const base = `${slug}-${grid.count}manh-${dims.W / 10}x${dims.H / 10}cm`;
  const printDpi = Math.max(dims.W, dims.H) > 320 ? 200 : 300;
  const printPdf = () => svgToPrintPdf(svgOf(refs.print), PZ_FONT_CSS, { wMm: dims.W, hMm: dims.H }, PZ_BLEED, printDpi);

  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${base}-file-in.pdf`));
  const downloadCut = () => run('cut', async () => downloadBlob(await svgFileBlob(svgOf(refs.cut), PZ_FONT_CSS), `${base}-file-cat.svg`));
  const downloadLid = () => run('lid', async () => {
    const el = svgOf(refs.lidPrint);
    downloadBlob(await svgToSizedPdf(el, PZ_FONT_CSS, lid.W + PZ_BLEED * 2, lid.H + PZ_BLEED * 2 + 10, 200), `${slug}-nap-hop-${lid.bw / 10}x${lid.bh / 10}x${lid.bd / 10}cm.pdf`);
  });
  const downloadShot = () => run('shot', async () => {
    if (view3d.current) {
      const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
      downloadBlob(await toBlob(c, 'image/png'), `${slug}-anh-3d.png`);
    } else downloadBlob(await svgToPng(svgOf(refs.face), PZ_FONT_CSS, 1600), `${slug}-xem-truoc.png`);
  });
  const makeFiles = async () => {
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : svgToPng(svgOf(refs.face), PZ_FONT_CSS, 900);
    const [file, pre] = await Promise.all([printPdf(), preview]);
    return { file, fileName: `${base}-file-in.pdf`, preview: pre };
  };

  const loose = useMemo(() => loosePieces(grid, 4, looseRows(spec.layout)).map((p) => ({ d: pieceD(p), cx: p.cx, cy: p.cy })), [grid, spec.layout]);
  const build3d = () => import('@/lib/puzzle-3d').then((m) => m.puzzleBuilder({
    texEl: refs.tex.current?.querySelector('svg') || null, grooveEl: refs.groove.current?.querySelector('svg') || null,
    lidTopEl: refs.lidTop.current?.querySelector('svg') || null, lidSideEl: refs.lidSide.current?.querySelector('svg') || null,
    W: dims.W, H: dims.H, thick: mat.thick, material: spec.material, outline: grid.outline, loose,
    box: pzSize(spec.size).box, lidColor: pal.bg, fontCss: PZ_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __pzSnap?: (w: number, h: number) => Promise<string> }).__pzSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhotoState(await loadPhoto(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };

  const orderTitle = `Puzzle ${shapeName} ${grid.count} mảnh · ${dims.W / 10}×${dims.H / 10} cm · ${mat.name} · kèm hộp`;
  const defaultMaterial = spec.material === 'wood' ? 'Puzzle gỗ' : spec.size === '300' || spec.size === '500' ? 'Puzzle 300 mảnh + hộp' : 'Puzzle giấy bồi 120 mảnh';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = PZ_FIELDS.filter((f) => f.layouts.includes(spec.layout));
  const rebuildKey = JSON.stringify([spec, data, photo ? [photo.src.length, photo.zoom, photo.px, photo.py] : 0]);
  const ph = photo || undefined;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Puzzle ghép hình in ảnh" sub="In ảnh gia đình, ảnh cưới, ảnh bé lên tranh ghép 30–500 mảnh, dáng chữ nhật hoặc trái tim, kèm hộp quà in bìa. Ảnh chỉ xử lý trên máy anh chị." />

      {!ready || !photo ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PZ_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {PZ_TEMPLATES.map((t) => {
                  const ts: PZSpec = { ...spec, ...t.spec, shape: t.spec.shape ?? 'rect', size: t.spec.size ?? '120', lines: true };
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.shape === ts.shape;
                  const p = photo.sample ? samplePhotos()[t.sample] : photo;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pz-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9E2D6] aspect-square grid place-items-center p-2.5">
                        <PuzzleSvg spec={ts} data={dirty ? data : PZ_SAMPLES[t.spec.layout]} photo={p} style={{ width: '100%', maxHeight: '100%', display: 'block', filter: 'drop-shadow(1px 3px 5px rgba(0,0,0,0.3))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Ảnh">
              <div className="space-y-3">
                {photo.sample && <p className="text-[11px] text-slate-500">Đang dùng ảnh minh hoạ — bấm “Tải ảnh” để thay bằng ảnh của anh chị (ảnh chỉ xử lý trên máy, không gửi đi đâu cho tới khi đặt in).</p>}
                <div className="flex gap-3 items-start rounded-xl border border-mv-hair p-2.5">
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-ink/[0.04]"><img src={photo.src} alt="" className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="pz-upload"><ImagePlus className="w-3.5 h-3.5" /> {photo.sample ? 'Tải ảnh' : 'Đổi ảnh'}</button>
                      <button type="button" onClick={() => setPhoto({ zoom: 1, px: 0, py: 0 })} className="mv-btn mv-btn-ghost !py-1 !text-xs" title="Căn lại giữa"><RotateCcw className="w-3.5 h-3.5" /></button>
                      {!photo.sample && dpi > 0 && (
                        <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${tag.c}`} data-testid="pz-dpi" data-dpi={Math.round(dpi)}>
                          {tag.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {tag.t} · {Math.round(dpi)} dpi
                        </span>
                      )}
                      {photo.sample && <span className="text-[11px] text-slate-500">Ảnh mẫu: {photo.name}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                      <label className="space-y-0.5">Phóng to<input type="range" min={1} max={3} step={0.02} value={photo.zoom} onChange={(e) => setPhoto({ zoom: +e.target.value })} className="w-full" data-testid="pz-zoom" /></label>
                      <label className="space-y-0.5">Kéo ngang<input type="range" min={-1} max={1} step={0.02} value={photo.px} onChange={(e) => setPhoto({ px: +e.target.value })} className="w-full" data-testid="pz-px" /></label>
                      <label className="space-y-0.5">Kéo dọc<input type="range" min={-1} max={1} step={0.02} value={photo.py} onChange={(e) => setPhoto({ py: +e.target.value })} className="w-full" data-testid="pz-py" /></label>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="pz-photo" />
                </div>
                {lowDpi && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex gap-2" data-testid="pz-dpi-warn">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Ảnh hơi nhỏ so với khổ {dims.W / 10}×{dims.H / 10} cm — in ra sẽ mờ/vỡ hạt. Nên chọn ít mảnh hơn (khổ nhỏ hơn), bớt phóng to hoặc dùng ảnh gốc (không qua Zalo/Facebook).
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chữ">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className="space-y-1">
                    <span className="text-xs font-medium text-slate-400">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} maxLength={60} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pz-field-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Số mảnh, dáng & chất liệu">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Số mảnh</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pz-sizes">
                    {PZ_SIZES.map((s) => (
                      <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={`${chip(spec.size === s.id)} text-left`} data-size={s.id}>
                        <div>{s.name}</div><div className="text-[10px] font-normal text-slate-500 mt-0.5">{s.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Dáng</div>
                    <div className="flex gap-1.5" data-testid="pz-shapes">
                      <button type="button" onClick={() => set({ shape: 'rect' })} className={chip(spec.shape === 'rect')} data-shape="rect">Chữ nhật</button>
                      <button type="button" onClick={() => set({ shape: 'heart' })} className={chip(spec.shape === 'heart')} data-shape="heart">Trái tim</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Chất liệu</div>
                    <div className="flex gap-1.5" data-testid="pz-materials">
                      {PZ_MATERIALS.map((m) => <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={chip(spec.material === m.id)} title={m.hint}>{m.name}</button>)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Màu nền / dải chữ / hộp</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pz-palettes">
                    {PZ_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`${chip(spec.palette === p.id)} inline-flex items-center gap-1.5`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: p.bg }} />{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Kiểu chữ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pz-fonts">
                    {PZ_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `'${f.family}'` }}>{f.name}</button>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="pz-layouts">
                  <span className="text-xs font-medium text-slate-400 w-full">Bố cục</span>
                  {PZ_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.size}|${spec.shape}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-end gap-1.5 text-[11px]">
                <label className="inline-flex items-center gap-1 mr-auto text-slate-400"><input type="checkbox" checked={spec.lines} onChange={(e) => set({ lines: e.target.checked })} data-testid="pz-lines" /> Hiện đường cắt</label>
                <button type="button" onClick={() => setShowLid(false)} className={chip(!showLid)}>Tranh</button>
                <button type="button" onClick={() => setShowLid(true)} className={chip(showLid)} data-testid="pz-show-lid">Nắp hộp</button>
              </div>
              <div ref={refs.face} className={`rounded-lg bg-[#E9E2D6] p-4 ${showLid ? 'hidden' : ''}`} data-testid="pz-face">
                <PuzzleSvg spec={spec} data={data} photo={ph} style={{ width: '100%', display: 'block', filter: 'drop-shadow(2px 5px 8px rgba(0,0,0,0.3))' }} />
              </div>
              {showLid && <div className="rounded-lg bg-[#E9E2D6] p-4"><LidSvg spec={spec} data={data} photo={ph} style={{ width: '100%', display: 'block' }} /></div>}
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="pz-info">
              {grid.count} mảnh · {shapeName} {dims.W / 10}×{dims.H / 10} cm · {mat.name} · hộp {lid.bw / 10}×{lid.bh / 10}×{lid.bd / 10} cm
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadShot} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pz-shot">
                {busy === 'shot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pz-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadCut} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pz-cut">
                {busy === 'cut' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} File cắt (SVG)
              </button>
              <button type="button" onClick={downloadLid} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pz-lid">
                {busy === 'lid' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF nắp hộp
              </button>
            </div>
            {lowDpi && <p className="text-[11px] text-rose-600 text-center">Ảnh độ phân giải thấp so với khổ — xem cảnh báo ở mục Ảnh.</p>}
            <PrintRequest product="puzzle" title={orderTitle} defaultMaterial={defaultMaterial} design={{ spec, data, photo: { name: photo.name, sample: !!photo.sample, w: photo.w, h: photo.h }, pieces: grid.count }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Đường cắt jigsaw sinh tự động ({grid.cols}×{grid.rows}{spec.shape === 'heart' ? ', cắt theo viền tim' : ''}) — xưởng làm khuôn bế theo file cắt, in ảnh tràn lề {PZ_BLEED}mm. Hộp quà {size.box[0] / 10}×{size.box[1] / 10}×{size.box[2] / 10} cm bồi giấy in bìa.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D, rãnh cắt, nắp, file in, file cắt */}
      {ready && photo && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={refs.tex}><PuzzleSvg spec={spec} data={data} photo={ph} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.groove}><PuzzleSvg spec={spec} data={data} photo={ph} mode="groove" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.lidTop}><LidSvg spec={spec} data={data} photo={ph} mode="top" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.lidSide}><LidSvg spec={spec} data={data} photo={ph} mode="side" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.print} data-testid="pz-print"><PuzzleSvg spec={spec} data={data} photo={ph} mode="print" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.cut} data-testid="pz-cutfile"><PuzzleCutSvg spec={spec} /></div>
          <div ref={refs.lidPrint} data-testid="pz-lidprint"><LidSvg spec={spec} data={data} photo={ph} mode="print" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
