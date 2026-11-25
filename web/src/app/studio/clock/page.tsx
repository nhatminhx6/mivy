'use client';
// Đồng hồ in logo: chọn mẫu (doanh nghiệp, La Mã, tối giản, 12·3·6·9, ảnh kỷ niệm, quà Tết, 12 con giáp, logo lớn)
// → điền tên công ty / slogan / logo hoặc ảnh (xử lý trên máy) → khổ treo tường Ø25–35 / vuông 30 / để bàn 15
// → viền nhựa · kim loại · gỗ, kiểu kim → xem 3D → tải PNG, PDF mặt số (lề xén + vạch cắt), SVG in–cắt hoặc gửi in.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  BLEED, CLOCK_FONTS, CLOCK_FONT_CSS, CLOCK_FRAMES, CLOCK_HANDS, CLOCK_LAYOUTS, CLOCK_PALETTES, CLOCK_SAMPLES, CLOCK_SIZES, CLOCK_TEMPLATES,
  ClockSvg, clockFrame, clockLayout, clockPalette, clockSize, defaultClockSpec, dialOf, useClockFonts,
  type ClockData, type ClockLayoutId, type ClockPhoto, type ClockSpec,
} from '@/lib/clock-engine';
import { photoDpi, samplePhotos } from '@/lib/canvas-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi bố cục: ô còn nguyên chữ mẫu cũ → chữ mẫu bố cục mới; ô khách tự viết thì giữ
function switchData(d: ClockData, from: ClockLayoutId, to: ClockLayoutId): ClockData {
  const oldS = CLOCK_SAMPLES[from], next: ClockData = { ...CLOCK_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k] && k in next) next[k] = v;
  return next;
}

async function readImage(file: File, max: number): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    const png = file.type === 'image/png';
    return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), w: im.naturalWidth, h: im.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

export default function ClockPage() {
  const ready = useClockFonts();
  const [spec, setSpec] = useState<ClockSpec>(defaultClockSpec);
  const [data, setData] = useState<ClockData>({ ...CLOCK_SAMPLES.classic });
  const [logo, setLogo] = useState('');
  const sample = useMemo(() => (typeof window === 'undefined' ? null : samplePhotos()[2]), []);
  const [photo, setPhoto] = useState<ClockPhoto | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const L = clockLayout(spec.layout);
  const sz = clockSize(spec.size);
  const dial = dialOf(sz);
  const ph: ClockPhoto | null = L.photo ? (photo || sample) : null;
  const dpi = ph && !ph.sample ? Math.round(photoDpi({ x: 0, y: 0, w: dial, h: dial }, ph)) : null;
  const slug = slugify(`dong-ho-${data.brand || data.names || ''}`, 'dong-ho');
  const set = (p: Partial<ClockSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const pickTpl = (t: (typeof CLOCK_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => switchData(d, spec.layout, t.spec.layout));
    setSpec((s) => ({ ...s, ...t.spec }));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const pdfBlob = async () => {
    const el = svgOf(pdfRef); if (!el) throw new Error('Chưa dựng xong mặt số');
    return svgToPrintPdf(el, CLOCK_FONT_CSS, { wMm: dial, hMm: dial }, BLEED, 300);
  };
  const downloadPng = () => run('png', async () => {
    const el = svgOf(faceRef); if (!el) return;
    downloadBlob(await svgToPng(el, CLOCK_FONT_CSS, 1600), `${slug}-mat-so.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfBlob(), `${slug}-${sz.id}-mat-so-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    const out = await selfContainedSvg(el, CLOCK_FONT_CSS, { outline: true });
    out.setAttribute('width', `${dial + BLEED * 2}mm`); out.setAttribute('height', `${dial + BLEED * 2}mm`);
    downloadBlob(new Blob([new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' }), `${slug}-${sz.id}-file-in-cat.svg`);
  });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(faceRef);
    if (!pv) throw new Error('Chưa dựng xong mặt số, thử lại nhé.');
    const file = await pdfBlob();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, CLOCK_FONT_CSS, 900))
      : await svgToJpeg(pv, CLOCK_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sz.id}-mat-so-in.pdf`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo((await readImage(f, 900)).src); } catch { alert('Không đọc được ảnh'); }
  };
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const im = await readImage(f, 2400); setPhoto({ src: im.src, w: im.w, h: im.h, zoom: 1, px: 0, py: 0, name: f.name }); } catch { alert('Không đọc được ảnh'); }
  };
  const setPh = (p: Partial<ClockPhoto>) => setPhoto((cur) => (cur ? { ...cur, ...p } : cur));

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __ckSnap?: (w: number, h: number) => Promise<string> }).__ckSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/clock-3d').then((m) => m.clockBuilder({
    dial: svgOf(texRef), size: sz, frame: spec.frame, hands: spec.hands, palette: clockPalette(spec.palette), fontCss: CLOCK_FONT_CSS,
  }));
  const frameName = clockFrame(spec.frame).name;
  const orderTitle = `Đồng hồ ${sz.name} · viền ${frameName.toLowerCase()}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Đồng hồ in logo" sub="Đồng hồ treo tường Ø25–35, vuông 30×30 hoặc để bàn — mặt số in logo công ty, ảnh kỷ niệm, quà Tết, 12 con giáp. Xem 3D, file in mặt số đúng khổ có lề xén + đường cắt + lỗ trục kim." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CLOCK_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {CLOCK_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  const td = t.spec.layout === spec.layout ? data : switchData(data, spec.layout, t.spec.layout);
                  const tl = clockLayout(t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="ck-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#ECE7DF] grid place-items-center p-2.5 aspect-square">
                        <ClockSvg spec={{ ...spec, ...t.spec }} data={td} photo={tl.photo ? (photo || sample) : null} logo={logo} mode="preview" style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 5px rgba(15,23,42,0.28))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Bố cục mặt số</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ck-layouts">
                    {CLOCK_LAYOUTS.map((l) => (
                      <button key={l.id} type="button" onClick={() => { const t = CLOCK_TEMPLATES.find((x) => x.spec.layout === l.id)!; pickTpl({ ...t, spec: { ...t.spec, palette: spec.palette, font: spec.font, frame: spec.frame, hands: spec.hands } }); }} className={chip(spec.layout === l.id)}>{l.name}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {L.fields.map((f) => (
                    <label key={f.key} className="block">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ck-in-${f.key}`} maxLength={64} />
                    </label>
                  ))}
                </div>
                {L.logo && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo lên'}
                      <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="ck-logo" />
                    </label>
                    {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    <span className="text-[11px] text-slate-500">Không có logo → tự vẽ chữ viết tắt. Ảnh xử lý ngay trên máy.</span>
                  </div>
                )}
                {L.photo && (
                  <div className="space-y-2 rounded-lg border border-mv-hair p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Tải ảnh của bạn'}
                        <input type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="ck-photo" />
                      </label>
                      {photo && <button type="button" onClick={() => setPhoto(null)} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Dùng ảnh mẫu</button>}
                      {!photo && <span className="text-[11px] text-slate-500">Đang dùng ảnh mẫu — tải ảnh cưới / gia đình của bạn lên (chỉ xử lý trên máy).</span>}
                    </div>
                    {photo && (
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <label>Phóng to<input type="range" min={1} max={3} step={0.02} value={photo.zoom} onChange={(e) => setPh({ zoom: +e.target.value })} className="w-full" data-testid="ck-zoom" /></label>
                        <label>Ngang<input type="range" min={-1} max={1} step={0.02} value={photo.px} onChange={(e) => setPh({ px: +e.target.value })} className="w-full" /></label>
                        <label>Dọc<input type="range" min={-1} max={1} step={0.02} value={photo.py} onChange={(e) => setPh({ py: +e.target.value })} className="w-full" /></label>
                      </div>
                    )}
                    {dpi !== null && (
                      <div className={`text-[11px] ${dpi < 150 ? 'text-red-400' : 'text-emerald-400'}`} data-testid="ck-dpi">
                        Độ nét khi in: ~{dpi} dpi {dpi < 150 ? '— ảnh hơi nhỏ cho khổ này, in ra có thể mờ. Nên dùng ảnh gốc lớn hơn.' : '— đủ nét.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, viền, kim, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ đồng hồ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ck-sizes">
                    {CLOCK_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="ck-size">{s.name}<span className="text-slate-500 font-normal"> · mặt số {dialOf(s) / 10}cm</span></button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Viền</div>
                  <div className="grid grid-cols-3 gap-1.5" data-testid="ck-frames">
                    {CLOCK_FRAMES.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ frame: f.id })} className={`flex items-center gap-2 ${chip(spec.frame === f.id)}`} data-testid="ck-frame">
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: f.color }} />{f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu kim</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ck-hands">
                    {CLOCK_HANDS.map((h) => <button key={h.id} type="button" onClick={() => set({ hands: h.id })} className={chip(spec.hands === h.id)}>{h.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ck-palettes">
                    {CLOCK_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ck-fonts">
                    {CLOCK_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, ph?.src.length, ph?.zoom, ph?.px, ph?.py])} refitKey={`${spec.size}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#ECE7DF] grid place-items-center p-5 aspect-[4/3]" data-testid="ck-preview">
                <ClockSvg spec={spec} data={data} photo={ph} logo={logo} mode="preview" style={{ height: '100%', aspectRatio: '1 / 1', display: 'block', filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.3))' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · mặt số {sz.shape === 'round' ? 'Ø' : ''}{dial}mm · viền {frameName.toLowerCase()} · lề xén {BLEED}mm</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ck-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ck-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt số
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ck-pdf" title="Mặt số đúng khổ, 300dpi, lề xén + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF mặt số
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ck-svg" title="Lớp In + CutContour + Khoan, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt SVG
              </button>
            </div>
            <PrintRequest product="clock" title={orderTitle} defaultMaterial={sz.desk ? 'Đồng hồ để bàn' : 'Đồng hồ treo tường mặt in logo Ø30'} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in mặt số khổ {dial}mm + lề xén {BLEED}mm: lớp <b>In</b>, <b>CutContour</b> (đường cắt, spot Magenta) và <b>Khoan</b> (lỗ trục kim Ø8 ở tâm). Kim, máy và viền do xưởng lắp — mặt số in UV hoặc decal dán đế nhôm.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={texRef}><ClockSvg spec={spec} data={data} photo={ph} logo={logo} mode="tex" style={{ width: 800, display: 'block' }} /></div>
          <div ref={printRef} data-testid="ck-print"><ClockSvg spec={spec} data={data} photo={ph} logo={logo} mode="print" style={{ width: 800, display: 'block' }} /></div>
          <div ref={pdfRef}><ClockSvg spec={spec} data={data} photo={ph} logo={logo} mode="pdf" style={{ width: 800, display: 'block' }} /></div>
          <div ref={faceRef}><ClockSvg spec={spec} data={data} photo={ph} logo={logo} mode="face" style={{ width: 800, display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
