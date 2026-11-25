'use client';
// Ly sứ in hình: chọn mẫu → điền tên/lời chúc, thêm ảnh (ảnh nằm trên máy, không gửi đi) → chọn kiểu in,
// loại ly, màu quai/lòng → xem 3D → tải file in đúng khổ dải in (300dpi, có thể lật gương cho in chuyển nhiệt) hoặc đặt in.

import { useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  MUG_COLORS, MUG_FIELDS, MUG_FONTS, MUG_FONT_CSS, MUG_KINDS, MUG_LAYOUTS, MUG_MODES, MUG_PALETTES, MUG_SAMPLES, MUG_SIZES, MUG_TEMPLATES,
  MugSvg, defaultMugData, mugColor, mugLayout, mugSize, switchMugData, useMugFonts, type MugData, type MugSpec,
} from '@/lib/mug-engine';
import { svgToPng, svgToSizedPdf, svgToJpeg } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// ảnh khách → dataURL thu nhỏ (chỉ nằm trên máy; dataURL để nhúng thẳng vào SVG/3D/file in)
async function toDataUrl(file: Blob, maxSide: number, png = false): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
}

const FIRST: MugSpec = { layout: 'birthday', palette: 'rose', font: 'baloo', size: '11oz', mode: 'two', kind: 'white', color: 'pink' };
const DPI = 300;

export default function MugPage() {
  const ready = useMugFonts();
  const [spec, setSpec] = useState<MugSpec>(FIRST);
  const [data, setData] = useState<MugData>(defaultMugData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [logo, setLogo] = useState('');
  const [mirror, setMirror] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = mugSize(spec.size);
  const L = mugLayout(spec.layout);
  const art = { photos, logo };
  const set = (p: Partial<MugSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTemplate = (t: (typeof MUG_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => (dirty ? switchMugData(d, spec.layout, t.spec.layout) : defaultMugData(t.spec.layout)));
    set(t.spec);
  };
  const slug = slugify(`ly-su-${data.name || data.brand || data.title || ''}`, 'ly-su');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const pxW = Math.round((sz.wMm / 25.4) * DPI);
  const downloadPng = () => run('png', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgToPng(el, MUG_FONT_CSS, pxW, { watermark: false }), `${slug}-${sz.id}-dai-in${mirror ? '-lat' : ''}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgToSizedPdf(el, MUG_FONT_CSS, sz.wMm, sz.hMm, DPI), `${slug}-${sz.id}-file-in${mirror ? '-lat' : ''}.pdf`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) { setTab('3d'); throw new Error('Mở tab Thành phẩm 3D rồi bấm lại nhé.'); }
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const el = svgOf(printRef), pv = svgOf(wrapRef);
    if (!el || !pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const file = await svgToSizedPdf(el, MUG_FONT_CSS, sz.wMm, sz.hMm, DPI);
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86)).catch(() => svgToJpeg(pv, MUG_FONT_CSS, 1000))
      : await svgToJpeg(pv, MUG_FONT_CSS, 1000);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/mug-3d').then((m) => m.mugBuilder({
    wrap: svgOf(wrapRef), fontCss: MUG_FONT_CSS, size: spec.size, mode: spec.mode, kind: spec.kind, color: mugColor(spec.color).hex,
  }));
  // hook cho QC: chụp 3D góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __mugSnap?: (w: number, h: number) => Promise<string> }).__mugSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const addPhoto = async (i: number, file?: File | null) => {
    if (!file) return;
    const url = await toDataUrl(file, 1600);
    setPhotos((ps) => { const n = [...ps]; n[i] = url; return n; });
  };
  const addLogo = async (file?: File | null) => { if (file) setLogo(await toDataUrl(file, 900, true)); };

  const kind = MUG_KINDS.find((k) => k.id === spec.kind)!;
  const orderTitle = `Ly sứ ${sz.name} · ${kind.name}${spec.kind === 'color' ? ` ${mugColor(spec.color).name}` : ''} · ${MUG_TEMPLATES.find((t) => t.spec.layout === spec.layout)?.name || L.name}`;
  const material = spec.kind === 'magic' ? 'Ly sứ đổi màu (gặp nóng hiện hình)' : spec.kind === 'color' ? 'Ly sứ quai màu / lòng màu' : 'Ly sứ trắng 11oz in chuyển nhiệt';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = MUG_FIELDS[spec.layout] || [];
  const tplData = (layout: string) => (dirty ? switchMugData(data, spec.layout, layout) : MUG_SAMPLES[layout]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ly sứ in hình" sub="In ảnh, tên, lời chúc hay logo lên ly sứ — quà sinh nhật, ngày của mẹ, 20/11, Valentine, quà doanh nghiệp. Làm từ 1 ly, xem thành phẩm 3D trước khi đặt." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${MUG_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MUG_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.mode === t.spec.mode;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="mug-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-white shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <MugSvg spec={{ ...spec, ...t.spec }} data={tplData(t.spec.layout)} art={art} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung & ảnh">
              <div className="space-y-3">
                {L.photos > 0 && (
                  <div>
                    <div className="mv-label mb-1.5">Ảnh của bạn ({L.photos} ảnh) — ảnh chỉ nằm trên máy bạn</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: L.photos }, (_, i) => (
                        <label key={i} className="relative w-20 h-20 rounded-lg border border-dashed border-mv-hair-strong flex items-center justify-center cursor-pointer overflow-hidden bg-ink/[0.03]" data-testid="mug-photo-slot">
                          {photos[i] ? <img src={photos[i]} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                          <input type="file" accept="image/*" className="hidden" data-testid={`mug-photo-${i}`} onChange={(e) => addPhoto(i, e.target.files?.[0])} />
                          {photos[i] && (
                            <button type="button" className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5" onClick={(e) => { e.preventDefault(); setPhotos((ps) => { const n = [...ps]; n[i] = ''; return n; }); }}><X className="w-3 h-3 text-white" /></button>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {L.logo && (
                  <div className="flex items-center gap-3">
                    <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer !flex gap-1.5"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (PNG nền trong)'}
                      <input type="file" accept="image/*" className="hidden" data-testid="mug-logo" onChange={(e) => addLogo(e.target.files?.[0])} />
                    </label>
                    {logo && <><img src={logo} alt="" className="h-9 max-w-[90px] object-contain" /><button type="button" className="text-xs text-slate-400 underline" onClick={() => setLogo('')}>Bỏ logo</button></>}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.multiline ? 'sm:col-span-2' : ''}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[70px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`mug-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`mug-${f.key}`} />}
                    </label>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Kiểu in, loại ly & màu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu in</div>
                  <div className="grid grid-cols-2 gap-1.5" data-testid="mug-modes">
                    {MUG_MODES.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ mode: m.id })} className={`${chip(spec.mode === m.id)} text-left`} data-testid={`mug-mode-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] text-slate-400 font-normal">{m.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Loại ly</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mug-kinds">
                    {MUG_KINDS.map((k) => <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={chip(spec.kind === k.id)} data-testid={`mug-kind-${k.id}`}>{k.name}</button>)}
                  </div>
                  {spec.kind === 'color' && (
                    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="mug-colors">
                      {MUG_COLORS.map((c) => (
                        <button key={c.id} type="button" title={c.name} onClick={() => set({ color: c.id })}
                          className={`w-7 h-7 rounded-full border-2 ${spec.color === c.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-white/70'}`} style={{ background: c.hex }} />
                      ))}
                    </div>
                  )}
                  {spec.kind === 'magic' && <p className="text-[11px] text-slate-400 mt-1.5">Ly đen khi nguội, rót nước nóng vào thì hiện hình — xem 2 trạng thái ở bản 3D.</p>}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cỡ ly</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MUG_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="mug-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="mug-palettes">
                    {MUG_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.accent2} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="mug-fonts">
                    {MUG_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photos.map((p) => p.length), logo.length])} refitKey={`${spec.size}|${spec.mode}|${spec.kind}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-1.5'}>
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5"><span>← sát quai</span><span>giữa = đối diện quai</span><span>sát quai →</span></div>
              <div ref={wrapRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] bg-white" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="mug-wrap">
                <MugSvg spec={spec} data={data} art={art} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Dải in {sz.wMm}×{sz.hMm}mm · {DPI}dpi · {MUG_MODES.find((m) => m.id === spec.mode)?.name}</div>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} data-testid="mug-mirror" />
              Lật gương (giấy in chuyển nhiệt cần lật ngược)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mug-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mug-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG in
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="mug-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
            </div>
            <PrintRequest product="mug" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng khổ dải in của ly (in chuyển nhiệt). Muốn Mivy in luôn: bấm gửi yêu cầu, làm từ 1 ly, giao tận nơi (TP.HCM).</p>
          </div>
        </div>
      )}

      {/* bản in (ẩn): đúng khổ, có thể lật gương */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="mug-print"><MugSvg spec={spec} data={data} art={art} mirror={mirror} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
