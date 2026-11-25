'use client';
// Ốp lưng điện thoại in hình: chọn máy (theo kích thước, không theo hãng) → kiểu ốp → mẫu → ảnh/tên/câu chữ
// → xem 3D → tải file in (lề xén, lỗ camera không in, đường cắt; in tràn viền có phần quấn cạnh) hoặc đặt in.
// Ảnh khách chỉ nằm trên máy (dataURL), không gửi đi đâu khi chưa đặt in. Không AI.

import { useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Box, Download, FileDown, ImagePlus, Loader2, Scissors, X } from 'lucide-react';
import {
  PC_CASES, PC_FIELDS, PC_FONTS, PC_FONT_CSS, PC_LAYOUTS, PC_MODELS, PC_PALETTES, PC_SAMPLES, PC_TEMPLATES, PC_BLEED, PHONE_COLORS, RIM_COLORS,
  PhoneCaseSvg, defaultPCData, pcDims, pcLayout, pcModel, pcPalette, pcPhotoDpi, pcTrim, phoneColor, rimColor, switchPCData, usePCFonts,
  type PCData, type PCSpec,
} from '@/lib/phonecase-engine';
import type { CVPhoto } from '@/lib/canvas-engine';
import { svgFileBlob, svgsToPrintPdf, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PCSpec = { model: 'p61', caseType: 'hard', layout: 'photo', palette: 'blush', font: 'greatvibes', phone: 'black', rim: 'black' };
const DPI = 300;

async function loadPhoto(file: Blob): Promise<CVPhoto> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  // giữ kích thước GỐC để tính dpi thật (ảnh thu nhỏ chỉ để hiển thị/in)
  return { src: c.toDataURL('image/jpeg', 0.9), w: bmp.width, h: bmp.height, zoom: 1, px: 0, py: 0 };
}

export default function PhoneCasePage() {
  const ready = usePCFonts();
  const [spec, setSpec] = useState<PCSpec>(FIRST);
  const [data, setData] = useState<PCData>(defaultPCData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState<CVPhoto | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const prevA = useRef<HTMLDivElement | null>(null);
  const prevB = useRef<HTMLDivElement | null>(null);
  const texA = useRef<HTMLDivElement | null>(null);
  const texB = useRef<HTMLDivElement | null>(null);
  const printA = useRef<HTMLDivElement | null>(null);
  const printB = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const d = pcDims(spec.model);
  const model = pcModel(spec.model);
  const L = pcLayout(spec.layout);
  const couple = spec.layout === 'couple';
  const art = { photo };
  const set = (p: Partial<PCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((x) => ({ ...x, [k]: v })); };
  const pickTemplate = (t: (typeof PC_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((x) => (dirty ? switchPCData(x, spec.layout, t.spec.layout) : defaultPCData(t.spec.layout)));
    set(t.spec);
  };
  const tplData = (layout: PCSpec['layout']) => (dirty ? switchPCData(data, spec.layout, layout) : PC_SAMPLES[layout]);
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const slug = slugify(`op-lung-${data.name || data.quote || ''}`, 'op-lung');
  const trim = pcTrim(spec);
  const dpi = L.photo && photo ? pcPhotoDpi(spec, photo) : 0;
  const lowDpi = L.photo && photo && dpi < 150;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const prints = () => [svgOf(printA), ...(couple ? [svgOf(printB)] : [])].filter(Boolean) as SVGSVGElement[];
  const makePdf = () => svgsToPrintPdf(prints(), PC_FONT_CSS, trim, PC_BLEED, DPI);
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${model.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = prints();
    for (let i = 0; i < els.length; i++) downloadBlob(await svgFileBlob(els[i], PC_FONT_CSS), `${slug}-${model.id}${couple ? (i ? '-op-B' : '-op-A') : ''}-in-cat.svg`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(prevA); if (!el) return;
    downloadBlob(await svgToPng(el, PC_FONT_CSS, 1200, { watermark: true }), `${slug}-mockup.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) { setTab('3d'); throw new Error('Mở tab Thành phẩm 3D rồi bấm lại nhé.'); }
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(prevA);
    if (!pv || !prints().length) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const file = await makePdf();
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86)).catch(() => svgToJpeg(pv, PC_FONT_CSS, 900))
      : await svgToJpeg(pv, PC_FONT_CSS, 900);
    return { file, fileName: `${slug}-${model.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/phonecase-3d').then((m) => m.phoneCaseBuilder({
    texA: svgOf(texA), texB: couple ? svgOf(texB) : null, fontCss: PC_FONT_CSS, model: spec.model, caseType: spec.caseType,
    phoneHex: phoneColor(spec.phone).hex, rimHex: rimColor(spec.rim).hex, bgHex: pcPalette(spec.palette).bg,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __pcSnap?: (w: number, h: number) => Promise<string> }).__pcSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const addPhoto = async (file?: File | null) => { if (file) setPhoto(await loadPhoto(file)); };
  const setPh = (p: Partial<CVPhoto>) => setPhoto((x) => (x ? { ...x, ...p } : x));
  const caseInfo = PC_CASES.find((c) => c.id === spec.caseType)!;
  const orderTitle = `Ốp lưng ${model.name} (${model.hint}) · ${caseInfo.name} · ${PC_TEMPLATES.find((t) => t.spec.layout === spec.layout)?.name || L.name}${couple ? ' · bộ 2 ốp' : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = PC_FIELDS[spec.layout] || [];
  const aspect = `${d.W + 6} / ${d.H + 6}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ốp lưng điện thoại in hình" sub="In ảnh, tên chữ ký, hoạ tiết, chòm sao hay câu nói lên ốp lưng — làm từ 1 cái, có bộ ốp đôi. Chọn máy theo kích thước, xem thành phẩm 3D trước khi đặt." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title="1 · Máy & kiểu ốp">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Máy (chọn theo kích thước màn hình & vị trí camera)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="pc-models">
                    {PC_MODELS.map((mo) => (
                      <button key={mo.id} type="button" onClick={() => set({ model: mo.id })} className={`${chip(spec.model === mo.id)} text-left`} data-testid={`pc-model-${mo.id}`}>
                        <div>{mo.name}</div><div className="text-[10px] text-slate-400 font-normal">{mo.hint} · {mo.pW}×{mo.pH}mm</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">Không thấy máy của bạn? Cứ chọn máy gần nhất rồi ghi tên máy khi gửi yêu cầu in — xưởng sẽ dùng phôi đúng máy.</p>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu ốp</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="pc-cases">
                    {PC_CASES.map((c) => (
                      <button key={c.id} type="button" onClick={() => set({ caseType: c.id })} className={`${chip(spec.caseType === c.id)} text-left`} data-testid={`pc-case-${c.id}`}>
                        <div>{c.name}</div><div className="text-[10px] text-slate-400 font-normal">{c.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {spec.caseType === 'clear' && (
                  <div>
                    <div className="mv-label mb-1.5">Màu máy của bạn (nhìn xuyên qua ốp)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pc-phones">
                      {PHONE_COLORS.map((c) => <button key={c.id} type="button" title={c.name} onClick={() => set({ phone: c.id })} className={`w-7 h-7 rounded-full border-2 ${spec.phone === c.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-white/70'}`} style={{ background: c.hex }} />)}
                    </div>
                  </div>
                )}
                {spec.caseType === 'rim' && (
                  <div>
                    <div className="mv-label mb-1.5">Màu viền ốp</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pc-rims">
                      {RIM_COLORS.map((c) => <button key={c.id} type="button" title={c.name} onClick={() => set({ rim: c.id })} className={`w-7 h-7 rounded-full border-2 ${spec.rim === c.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-white/70'}`} style={{ background: c.hex }} />)}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Chọn mẫu (${PC_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {PC_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div style={{ aspectRatio: aspect }}>
                        <PhoneCaseSvg spec={{ ...spec, ...t.spec }} data={tplData(t.spec.layout)} art={art} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung & ảnh">
              <div className="space-y-3">
                {L.photo && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <label className="relative w-20 h-24 rounded-lg border border-dashed border-mv-hair-strong flex items-center justify-center cursor-pointer overflow-hidden bg-ink/[0.03]">
                        {photo ? <img src={photo.src} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                        <input type="file" accept="image/*" className="hidden" data-testid="pc-photo" onChange={(e) => addPhoto(e.target.files?.[0])} />
                      </label>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>{photo ? 'Ảnh của bạn (chỉ nằm trên máy bạn)' : 'Chưa có ảnh — đang hiện ảnh minh hoạ'}</div>
                        {photo && <div data-testid="pc-dpi">Độ nét khi in: <b className={lowDpi ? 'text-amber-500' : 'text-emerald-500'}>{Math.round(dpi)} dpi</b></div>}
                        {photo && <button type="button" className="underline" onClick={() => setPhoto(null)}><X className="w-3 h-3 inline" /> Bỏ ảnh</button>}
                      </div>
                    </div>
                    {lowDpi && <div className="flex items-start gap-1.5 text-[11px] text-amber-500" data-testid="pc-dpi-warn"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Ảnh hơi nhỏ, in ra có thể bị mờ. Nên dùng ảnh gốc từ điện thoại (không qua Zalo/Messenger).</div>}
                    {photo && (
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <label>Phóng to<input type="range" min={1} max={3} step={0.05} value={photo.zoom} onChange={(e) => setPh({ zoom: +e.target.value })} className="w-full" data-testid="pc-zoom" /></label>
                        <label>Ngang<input type="range" min={-1} max={1} step={0.02} value={photo.px} onChange={(e) => setPh({ px: +e.target.value })} className="w-full" /></label>
                        <label>Dọc<input type="range" min={-1} max={1} step={0.02} value={photo.py} onChange={(e) => setPh({ py: +e.target.value })} className="w-full" /></label>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.multiline ? 'sm:col-span-2' : ''}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.select
                        ? <select className="mv-input" value={data[f.key] || '0'} onChange={(e) => setField(f.key, e.target.value)} data-testid={`pc-${f.key}`}>{f.select.map((o, i) => <option key={o} value={String(i)}>{o}</option>)}</select>
                        : f.multiline
                          ? <textarea className="mv-input min-h-[70px]" maxLength={120} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pc-${f.key}`} />
                          : <input className="mv-input" maxLength={40} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pc-${f.key}`} />}
                    </label>
                  ))}
                </div>
                {couple && <p className="text-[11px] text-slate-400">Bộ 2 ốp: ốp A mang tên người 1, ốp B tên người 2 — đặt 2 máy cạnh nhau thành trái tim. Giá tính theo 2 ốp.</p>}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pc-palettes">
                    {PC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="pc-fonts">
                    {PC_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PC_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => { const t = PC_TEMPLATES.find((x) => x.spec.layout === l.id)!; pickTemplate({ ...t, spec: { ...t.spec, palette: spec.palette, font: spec.font } }); }} className={chip(spec.layout === l.id)}>{l.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo && [photo.src.length, photo.zoom, photo.px, photo.py]])} refitKey={`${spec.model}|${spec.caseType}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'flex justify-center gap-3'}>
              <div ref={prevA} className="w-[46%] max-w-[200px]" style={{ aspectRatio: aspect }} data-testid="pc-preview-a">
                <PhoneCaseSvg spec={spec} data={data} art={art} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
              {couple && (
                <div ref={prevB} className="w-[46%] max-w-[200px]" style={{ aspectRatio: aspect }} data-testid="pc-preview-b">
                  <PhoneCaseSvg spec={spec} data={data} art={art} side="B" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {model.name} ({model.hint}) · file in {trim.wMm.toFixed(1)}×{trim.hMm.toFixed(1)}mm + lề {PC_BLEED}mm{spec.caseType === 'hard' ? ' (đã gồm phần quấn cạnh)' : ''} · lỗ camera không in
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mockup
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-svg">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} SVG in–cắt
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pc-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in{couple ? ' (2 ốp)' : ''}
              </button>
            </div>
            <PrintRequest product="phonecase" title={orderTitle} defaultMaterial={caseInfo.material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Làm từ 1 cái. Ghi rõ tên máy khi gửi yêu cầu để xưởng chọn đúng phôi ốp. Giao tận nơi (TP.HCM).</p>
          </div>
        </div>
      )}

      {/* texture 3D + file in (ẩn) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texA}><PhoneCaseSvg spec={spec} data={data} art={art} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texB}>{couple && <PhoneCaseSvg spec={spec} data={data} art={art} mode="tex" side="B" style={{ width: '100%', display: 'block' }} />}</div>
          <div ref={printA} data-testid="pc-print-a"><PhoneCaseSvg spec={spec} data={data} art={art} mode="print" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printB} data-testid="pc-print-b">{couple && <PhoneCaseSvg spec={spec} data={data} art={art} mode="print" side="B" style={{ width: '100%', display: 'block' }} />}</div>
        </div>
      )}
    </div>
  );
}
