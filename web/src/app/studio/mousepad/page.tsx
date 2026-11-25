'use client';
// Lót chuột in hình / desk mat: chọn mẫu (ảnh, polaroid, logo công ty, gaming, lịch 2027, phím tắt, pastel, câu nói) →
// tải ảnh / logo (chỉ xử lý trên máy) → khổ, độ dày, viền khâu → xem 3D trên bàn làm việc → tải file in đúng khổ
// (lề xén 3mm + vạch cắt, SVG có nét CutContour) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileDown, ImagePlus, Loader2, RotateCcw, Scissors, X } from 'lucide-react';
import {
  MP_BLEED, MP_FIELDS, MP_FONTS, MP_FONT_CSS, MP_LAYOUTS, MP_PALETTES, MP_SAMPLES, MP_SETS, MP_SIZES, MP_STITCHES, MP_TEMPLATES, MP_THICK,
  MousepadSvg, defaultMPData, mpLayout, mpOrderTitle, mpPalette, mpPhotoDpi, mpSize, sizeOk, useMPFonts,
  type MPData, type MPLogo, type MPSpec, type MPTemplate,
} from '@/lib/mousepad-engine';
import { samplePhotos, type CVPhoto } from '@/lib/canvas-engine';
import { isDark } from '@/lib/mockup3d';
import { svgFileBlob, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: MPSpec = { layout: 'photo', palette: 'white', font: 'montserrat', size: '24x20', thick: 3, stitch: 'none', set: 'excel' };

// ảnh khách: chỉ đọc trên máy, thu nhỏ ≤ maxPx
async function loadImage(file: File, maxPx: number, type = 'image/jpeg'): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, maxPx / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return { src: c.toDataURL(type, 0.92), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type = 'image/png', q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function MousepadPage() {
  const ready = useMPFonts();
  const [spec, setSpec] = useState<MPSpec>(FIRST);
  const [data, setData] = useState<MPData>(defaultMPData());
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState<CVPhoto | null>(null);
  const [logo, setLogo] = useState<MPLogo | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [props, setProps] = useState(true);
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const photoIn = useRef<HTMLInputElement | null>(null);
  const logoIn = useRef<HTMLInputElement | null>(null);

  // ảnh minh hoạ vẽ bằng code (chỉ chạy trên trình duyệt) — đổi theo mẫu cho tới khi khách tải ảnh
  useEffect(() => { setPhoto(samplePhotos()[1]); }, []);

  const sz = mpSize(spec.size);
  const L = mpLayout(spec.layout);
  const pal = mpPalette(spec.palette);
  const set = (p: Partial<MPSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: MPTemplate) => {
    set({ ...t.spec, set: t.spec.set || spec.set, stitch: t.spec.stitch || 'none', size: t.spec.size });
    if (!dirty) setData((d) => ({ ...d, ...MP_SAMPLES[t.spec.layout] }));
    if ((!photo || photo.sample) && t.sample !== undefined) setPhoto(samplePhotos()[t.sample]);
  };
  const pickLayout = (id: MPSpec['layout']) => set({ layout: id, size: sizeOk(id, spec.size) ? spec.size : '24x20' });

  const dpi = L.photo ? mpPhotoDpi(spec, photo) : 0;
  const lowDpi = L.photo && photo && !photo.sample && dpi > 0 && dpi < 100;
  const slug = slugify(`${sz.desk ? 'desk-mat' : 'lot-chuot'}-${data.title || data.brand || spec.layout}`, 'lot-chuot');
  const fileName = `${slug}-${sz.id}`;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const need = (r: RefObject<HTMLDivElement | null>) => { const el = svgOf(r); if (!el) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.'); return el; };
  const dpiPrint = sz.desk ? 150 : 300;

  const makePdf = () => svgToPrintPdf(need(printRef), MP_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, MP_BLEED, dpiPrint);
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${fileName}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => downloadBlob(await svgFileBlob(need(cutRef), MP_FONT_CSS), `${fileName}-file-in-cat.svg`));
  const downloadPng = () => run('png', async () => downloadBlob(await svgToPng(need(faceRef), MP_FONT_CSS, 2000, { watermark: false }), `${fileName}-mat-in.png`));
  const downloadShot = () => run('shot', async () => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.');
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await toBlob(c), `${fileName}-anh-3d.png`);
  });
  const makeFiles = async () => {
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : svgToPng(need(faceRef), MP_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: `${fileName}-file-in.pdf`, preview: pre };
  };

  const stitchColor = spec.stitch === 'none' ? null : spec.stitch === 'black' ? '#1F1F1F' : spec.stitch === 'white' ? '#F2F2EF' : pal.accent;
  const build3d = () => import('@/lib/mousepad-3d').then((m) => m.mousepadBuilder({
    tex: svgOf(texRef), fontCss: MP_FONT_CSS, wMm: sz.wMm, hMm: sz.hMm, r: sz.r, round: !!sz.round, desk: !!sz.desk,
    thick: spec.thick, stitch: stitchColor, dark: isDark(pal.bg), props,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __mpSnap?: (w: number, h: number) => Promise<string> }).__mpSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const im = await loadImage(f, 5000); setPhoto({ ...im, zoom: 1, px: 0, py: 0, name: f.name }); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadImage(f, 900, 'image/png')); } catch { alert('Không đọc được logo này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean, dis = false) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${dis ? 'opacity-40 cursor-not-allowed border-mv-hair text-slate-400' : on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = MP_FIELDS.filter((f) => f.layouts.includes(spec.layout));
  const usesLogo = ['logo', 'calendar'].includes(spec.layout);
  const rebuildKey = JSON.stringify([spec, props, data, photo ? [photo.src.length, photo.zoom, photo.px, photo.py] : 0, logo?.src.length || 0]);
  const tag = dpi >= 150 ? { t: 'Nét', c: 'text-emerald-600', ok: true } : dpi >= 100 ? { t: 'Tạm được', c: 'text-amber-600', ok: true } : { t: 'Ảnh mờ — dễ vỡ hạt', c: 'text-rose-600', ok: false };
  const ratio = `${sz.wMm} / ${sz.hMm}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Lót chuột in hình" sub="Lót chuột, desk mat in ảnh, logo công ty, lịch 2027, bảng phím tắt Excel/Photoshop — đế cao su, mặt vải in sắc nét, có viền khâu. Ảnh chỉ xử lý trên máy anh chị." />

      {!ready || !photo ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${MP_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {MP_TEMPLATES.map((t) => {
                  const ts: MPSpec = { ...spec, ...t.spec, set: t.spec.set || spec.set, stitch: t.spec.stitch || 'none' };
                  const tsz = mpSize(ts.size);
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.size === t.spec.size && spec.font === t.spec.font;
                  const ph = photo.sample && t.sample !== undefined ? samplePhotos()[t.sample] : photo;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="mp-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9E4DB] aspect-square grid place-items-center p-2.5">
                        <div className="w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]" style={{ aspectRatio: `${tsz.wMm} / ${tsz.hMm}` }}>
                          <MousepadSvg spec={ts} data={dirty ? data : { ...data, ...MP_SAMPLES[ts.layout] }} photo={ph} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {(L.photo || usesLogo) && (
              <CollapsibleSection title={L.photo ? '2 · Ảnh' : '2 · Logo'}>
                {L.photo ? (
                  <div className="flex gap-3 items-start rounded-xl border border-mv-hair p-2.5" data-testid="mp-photo-slot">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-ink/[0.04]"><img src={photo.src} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => photoIn.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="mp-upload"><ImagePlus className="w-3.5 h-3.5" /> {photo.sample ? 'Tải ảnh' : 'Đổi ảnh'}</button>
                        <button type="button" onClick={() => setPhoto({ ...photo, zoom: 1, px: 0, py: 0 })} className="mv-btn mv-btn-ghost !py-1 !text-xs" title="Căn lại giữa"><RotateCcw className="w-3.5 h-3.5" /></button>
                        {!photo.sample && dpi > 0 && (
                          <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${tag.c}`} data-testid="mp-dpi" data-dpi={Math.round(dpi)}>
                            {tag.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {tag.t} · {Math.round(dpi)} dpi
                          </span>
                        )}
                        {photo.sample && <span className="text-[11px] text-slate-500">Ảnh minh hoạ: {photo.name}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <label className="space-y-0.5">Phóng to<input type="range" min={1} max={3} step={0.02} value={photo.zoom} onChange={(e) => setPhoto({ ...photo, zoom: +e.target.value })} className="w-full" data-testid="mp-zoom" /></label>
                        <label className="space-y-0.5">Kéo ngang<input type="range" min={-1} max={1} step={0.02} value={photo.px} onChange={(e) => setPhoto({ ...photo, px: +e.target.value })} className="w-full" /></label>
                        <label className="space-y-0.5">Kéo dọc<input type="range" min={-1} max={1} step={0.02} value={photo.py} onChange={(e) => setPhoto({ ...photo, py: +e.target.value })} className="w-full" /></label>
                      </div>
                      {lowDpi && <p className="text-[11px] text-rose-600" data-testid="mp-dpi-warn">Ảnh hơi nhỏ so với khổ {sz.name} — in ra dễ mờ. Dùng ảnh gốc (không qua Zalo/Facebook) hoặc bớt phóng to.</p>}
                    </div>
                    <input ref={photoIn} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="mp-photo-input" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-2.5">
                    <div className="w-14 h-14 rounded-lg bg-ink/[0.04] grid place-items-center overflow-hidden">{logo ? <img src={logo.src} alt="" className="max-w-full max-h-full" /> : <span className="text-[10px] text-slate-500">Chữ viết tắt</span>}</div>
                    <button type="button" onClick={() => logoIn.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="mp-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo'}</button>
                    {logo && <button type="button" onClick={() => setLogo(null)} className="mv-btn mv-btn-ghost !py-1 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    <span className="text-[11px] text-slate-500">Chưa có logo → tự vẽ chữ viết tắt từ tên công ty.</span>
                    <input ref={logoIn} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="mp-logo-input" />
                  </div>
                )}
              </CollapsibleSection>
            )}

            <CollapsibleSection title={`${L.photo || usesLogo ? 3 : 2} · Nội dung`}>
              {spec.layout === 'shortcuts' && (
                <div className="flex flex-wrap gap-1.5 mb-3" data-testid="mp-sets">
                  <span className="text-xs font-medium text-slate-400 w-full">Bộ phím tắt</span>
                  {MP_SETS.map((s) => <button key={s.id} type="button" onClick={() => set({ set: s.id })} className={chip(spec.set === s.id)}>{s.name}</button>)}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`space-y-1 ${f.multiline ? 'sm:col-span-2' : ''}`}>
                    <span className="text-xs font-medium text-slate-400">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`mp-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`mp-field-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`${L.photo || usesLogo ? 4 : 3} · Khổ, độ dày & kiểu dáng`}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mp-sizes">
                    {MP_SIZES.map((s) => { const ok = sizeOk(spec.layout, s.id); return <button key={s.id} type="button" disabled={!ok} title={ok ? '' : 'Bố cục này không hợp lót tròn'} onClick={() => set({ size: s.id })} className={chip(spec.size === s.id, !ok)}>{s.name}</button>; })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Độ dày</div>
                    <div className="flex gap-1.5" data-testid="mp-thick">{MP_THICK.map((t) => <button key={t} type="button" onClick={() => set({ thick: t })} className={chip(spec.thick === t)}>{t} mm</button>)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Viền</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="mp-stitch">{MP_STITCHES.map((t) => <button key={t.id} type="button" onClick={() => set({ stitch: t.id })} className={chip(spec.stitch === t.id)}>{t.name}</button>)}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Bảng màu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mp-palettes">
                    {MP_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`${chip(spec.palette === p.id)} inline-flex items-center gap-1.5`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} />{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Kiểu chữ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mp-fonts">
                    {MP_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"` }}>{f.name}</button>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="mp-layouts">
                  <span className="text-xs font-medium text-slate-400 w-full">Bố cục</span>
                  {MP_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => pickLayout(l.id)} className={chip(spec.layout === l.id)}>{l.name}</button>)}
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
              <>
                <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={spec.size} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
                <label className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={props} onChange={(e) => setProps(e.target.checked)} data-testid="mp-props" /> Đặt kèm chuột{sz.desk ? ' & bàn phím' : ''} cho dễ hình dung
                </label>
              </>
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div ref={faceRef} className="rounded-lg bg-[#E9E4DB] p-4 grid place-items-center" data-testid="mp-face">
                <div className="w-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.3)]" style={{ aspectRatio: ratio, maxWidth: sz.wMm >= sz.hMm ? '100%' : `${(sz.wMm / sz.hMm) * 100}%` }}>
                  <MousepadSvg spec={spec} data={data} photo={photo} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div className="rounded-md overflow-hidden border border-mv-hair bg-white" data-testid="mp-print-preview">
                <MousepadSvg spec={spec} data={data} photo={photo} logo={logo} mode="print" cut style={{ width: '100%', display: 'block' }} />
              </div>
              <p className="text-[11px] text-slate-500 text-center"><Scissors className="w-3 h-3 inline -mt-0.5" /> Nét hồng = đường cắt; phần ngoài nét là lề xén {MP_BLEED}mm.</p>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{mpOrderTitle(spec)}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadShot} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mp-shot">
                {busy === 'shot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mp-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt in
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="mp-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mp-svg" title="SVG đúng khổ: lớp in + nét CutContour (chữ đã chuyển nét)">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt
              </button>
            </div>
            <PrintRequest product="mousepad" title={mpOrderTitle(spec)} defaultMaterial={sz.desk ? 'Lót chuột cỡ lớn (desk mat)' : 'Lót chuột cao su 3mm'} design={{ spec, data, photo: photo ? { name: photo.name, sample: !!photo.sample, w: photo.w, h: photo.h } : null, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng khổ {sz.wMm / 10}×{sz.hMm / 10} cm + lề xén {MP_BLEED}mm mỗi cạnh, chữ đã chuyển nét. In chuyển nhiệt lên vải, ép đế cao su {spec.thick}mm{spec.stitch !== 'none' ? ', khâu viền chống bong mép' : ''}.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D + file in (không nét cắt) + file in–cắt (có CutContour) */}
      {ready && photo && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texRef}><MousepadSvg spec={spec} data={data} photo={photo} logo={logo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef}><MousepadSvg spec={spec} data={data} photo={photo} logo={logo} mode="print" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={cutRef} data-testid="mp-cut-file"><MousepadSvg spec={spec} data={data} photo={photo} logo={logo} mode="print" cut style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
