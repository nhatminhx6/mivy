'use client';
// Túi vải canvas: chọn mẫu → điền chữ / tải logo → chọn vải, cách in (lụa 1–3 màu hoặc DTF đủ màu), khổ, đáy →
// xem thành phẩm 3D → tải file in đúng kích thước vùng in (PDF: bản xem màu trên vải + file in + film tách màu) hoặc đặt in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  TT_FABRICS, TT_FONTS, TT_FONT_CSS, TT_GUSSETS, TT_INKS, TT_SAMPLES, TT_SIZES, TT_TEMPLATES, TT_LAYOUTS,
  ToteSvg, defaultTTData, lowContrast, mapInk, ttFabric, ttFields, ttLayout, ttSize, ttUsedInks, useTTFonts,
  type TTData, type TTSpec,
} from '@/lib/tote-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TTSpec = { layout: 'logo', fabric: 'moc', inks: 'espresso', font: 'playfair', size: '35x40', gusset: 0, method: 'screen', nInk: 2, back: false };

/** logo khách: thu nhỏ ≤1200px, giữ nền trong (PNG) — chỉ ở trên máy khách */
async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

// đổi bố cục khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu bố cục mới
function switchLayoutData(d: TTData, from: string, to: string): TTData {
  const oldS = TT_SAMPLES[from] || {}, next = defaultTTData(to);
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

interface PdfPage { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; bg?: string; label?: string }
async function pagesToPdf(pages: PdfPage[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const p of pages) {
    const outW = Math.round((p.wMm / 25.4) * p.dpi), outH = Math.round((p.hMm / 25.4) * p.dpi);
    const c = await svgToCanvas(await selfContainedSvg(p.el, TT_FONT_CSS, { outline: true }), outW, outH, p.bg);
    if (p.label) {
      const x = c.getContext('2d')!;
      const fs = Math.round(outW * 0.022);
      x.font = `600 ${fs}px "Be Vietnam Pro"`; x.fillStyle = 'rgba(255,255,255,0.85)';
      const tw = x.measureText(p.label).width;
      x.fillRect(outW / 2 - tw / 2 - fs * 0.6, outH - fs * 2.2, tw + fs * 1.2, fs * 1.6);
      x.fillStyle = '#333'; x.textAlign = 'center'; x.fillText(p.label, outW / 2, outH - fs * 0.95);
    }
    const orientation = p.wMm >= p.hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [p.wMm, p.hMm], orientation, compress: true });
    else pdf.addPage([p.wMm, p.hMm], orientation);
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, p.wMm, p.hMm, undefined, 'FAST');
  }
  return pdf!.output('blob');
}

export default function TotePage() {
  const ready = useTTFonts();
  const [spec, setSpec] = useState<TTSpec>(FIRST);
  const [data, setData] = useState<TTData>(defaultTTData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const sepRef = useRef<HTMLDivElement | null>(null);

  const sz = ttSize(spec.size);
  const fab = ttFabric(spec.fabric);
  const used = ttUsedInks(spec);
  const set = (p: Partial<TTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof TT_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    if (!dirty) setData(defaultTTData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`tui-vai-${data.brand || ''}`, 'tui-vai');
  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // PDF: bản xem màu trên vải → file in (nền trong) → film từng màu (in lụa); mặt sau tương tự
  const buildPdf = async () => {
    const pages: PdfPage[] = [];
    const sides: ('front' | 'back')[] = spec.back ? ['front', 'back'] : ['front'];
    for (const side of sides) {
      const el = svgOf(side === 'front' ? frontRef : backRef);
      if (!el) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
      const name = side === 'front' ? 'mặt trước' : 'mặt sau';
      pages.push({ el, wMm: sz.pw, hMm: sz.ph, dpi: 120, bg: fab.color, label: `Bản xem màu trên vải ${fab.name.toLowerCase()} (${name}) — không dùng để in` });
      pages.push({ el, wMm: sz.pw, hMm: sz.ph, dpi: 300 });
      if (spec.method === 'screen') {
        for (const u of used) {
          const s = svgOf(sepRef, `svg[data-side="${side}"][data-sep="${u.k}"]`);
          if (s) pages.push({ el: s, wMm: sz.pw + 30, hMm: sz.ph + 30, dpi: 250, bg: '#ffffff' });
        }
      }
    }
    return pagesToPdf(pages);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${sz.id}-${spec.method === 'screen' ? `in-lua-${spec.nInk}mau` : 'dtf'}-file-in.pdf`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    const w = Math.round((sz.pw / 25.4) * 200), h = Math.round((sz.ph / 25.4) * 200);
    const c = await svgToCanvas(await selfContainedSvg(el, TT_FONT_CSS), w, h);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-mat-truoc-nen-trong.png`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, TT_FONT_CSS), `${slug}-mat-truoc-${sz.pw}x${sz.ph}mm.svg`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-thanh-pham-3d.png`);
  });
  const makeFiles = async () => {
    const file = await buildPdf();
    let preview: Blob;
    if (view3d.current) preview = await toBlob(await view3d.current.snapshot(1200, 900), 'image/jpeg', 0.86);
    else {
      const el = svgOf(frontRef)!;
      preview = await toBlob(await svgToCanvas(await selfContainedSvg(el, TT_FONT_CSS), 900, Math.round((900 * sz.ph) / sz.pw), fab.color), 'image/jpeg', 0.86);
    }
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/tote-3d').then((m) => m.toteBuilder({
    front: svgOf(frontRef), back: spec.back ? svgOf(backRef) : null, size: sz, gusset: spec.gusset, fabric: fab, method: spec.method, fontCss: TT_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __toteSnap?: (w: number, h: number) => Promise<string> }).__toteSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const methodName = spec.method === 'screen' ? `In lụa ${spec.nInk} màu` : 'In DTF đủ màu';
  const orderTitle = `Túi vải ${sz.name}${spec.gusset ? ` · đáy ${spec.gusset / 10}cm` : ''} · ${fab.name} · ${methodName}${spec.back ? ' · 2 mặt' : ''}`;
  const fields = ttFields(spec.layout);
  const ratio = `${sz.pw} / ${sz.ph}`;
  const designBox = (side: 'front' | 'back') => (
    <div className="rounded-lg p-[7%] shadow-inner" style={{ background: fab.color }}>
      <div style={{ aspectRatio: ratio, outline: '1px dashed rgba(127,127,127,0.45)', outlineOffset: 2 }}>
        <ToteSvg spec={spec} data={data} side={side} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Túi vải canvas" sub="Túi tote in logo, câu chữ, hình vẽ — chọn mẫu, chọn vải & cách in (lụa 1–3 màu hoặc DTF đủ màu), xem túi thật 3D, tải file in đúng kích thước vùng in hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TT_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {TT_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.fabric === t.spec.fabric && spec.inks === t.spec.inks && spec.font === t.spec.font;
                  const tspec = { ...spec, ...t.spec };
                  const tdata = dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : TT_SAMPLES[t.spec.layout];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="tt-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg p-[9%]" style={{ background: ttFabric(t.spec.fabric).color }}>
                        <div style={{ aspectRatio: ratio }}>
                          <ToteSvg spec={tspec} data={tdata} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="tt-layouts">
                  {TT_LAYOUTS.map((l) => (
                    <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => {
                      const t = TT_TEMPLATES.find((x) => x.spec.layout === l.id)!;
                      pickTemplate({ ...t, spec: { ...t.spec, fabric: spec.fabric, inks: spec.inks, font: spec.font, nInk: spec.nInk } });
                    }}>{l.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`tt-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo của shop (tuỳ chọn)</div>
                    <div className="text-[11px] text-slate-400 leading-snug">PNG nền trong là đẹp nhất. In lụa: logo tự chuyển 1 màu mực (phần tối in, phần sáng bỏ). Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="tt-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Vải & cách in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Màu vải</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="tt-fabrics">
                    {TT_FABRICS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ fabric: f.id })} className={`flex items-center gap-2 ${chip(spec.fabric === f.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: f.color }} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cách in</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => set({ method: 'screen' })} className={`${chip(spec.method === 'screen')} !text-left !py-2`} data-testid="tt-method-screen">
                      <div className="font-semibold">In lụa (1–3 màu)</div><div className="text-[11px] text-slate-400 font-normal">Bền, rẻ khi in nhiều (từ ~50 túi). Màu đặc, không in ảnh.</div>
                    </button>
                    <button type="button" onClick={() => set({ method: 'dtf' })} className={`${chip(spec.method === 'dtf')} !text-left !py-2`} data-testid="tt-method-dtf">
                      <div className="font-semibold">In DTF / chuyển nhiệt</div><div className="text-[11px] text-slate-400 font-normal">Đủ màu, in được logo màu, hợp đơn ít.</div>
                    </button>
                  </div>
                  {spec.method === 'screen' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-slate-400 mr-1">Số màu mực:</span>
                      {([1, 2, 3] as const).map((n) => <button key={n} type="button" onClick={() => set({ nInk: n })} className={chip(spec.nInk === n)} data-testid={`tt-nink-${n}`}>{n} màu</button>)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bộ màu mực</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="tt-inks">
                    {TT_INKS.map((ik) => (
                      <button key={ik.id} type="button" onClick={() => set({ inks: ik.id })} className={`flex items-center gap-2 ${chip(spec.inks === ik.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{ik.c.slice(0, spec.method === 'screen' ? spec.nInk : 3).map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{ik.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="tt-fonts">
                    {TT_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ túi">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="tt-sizes">
                  {TT_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="tt-size">{s.name} <span className="text-slate-400 font-normal">· in tối đa {s.pw / 10}×{s.ph / 10}cm</span></button>)}
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="tt-gussets">
                  {TT_GUSSETS.map((g) => <button key={g.id} type="button" onClick={() => set({ gusset: g.id })} className={chip(spec.gusset === g.id)} data-testid="tt-gusset">{g.name}</button>)}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={spec.back} onChange={(e) => set({ back: e.target.checked })} data-testid="tt-back" />
                  In thêm mặt sau (logo nhỏ + dòng nhỏ)
                </label>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.size}|${spec.gusset}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2" data-testid="tt-flat">
                <div><div className="text-[11px] text-slate-400 mb-1">Mặt trước · vùng in {sz.pw / 10}×{sz.ph / 10}cm</div>{designBox('front')}</div>
                {spec.back && <div><div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>{designBox('back')}</div>}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="tt-used">
              <span>{methodName}:</span>
              {used.map((u) => <span key={u.k} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: u.color }} />{u.color}</span>)}
              <span>· {sz.name}{spec.gusset ? ` · đáy ${spec.gusset / 10}cm` : ''}</span>
            </div>
            {lowContrast(spec) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="tt-contrast">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Màu mực chính gần màu vải — in ra sẽ chìm. Thử bộ mực sáng cho vải tối (hoặc ngược lại).
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="tt-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tt-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in{spec.method === 'screen' ? ' + film' : ''}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tt-png" title="PNG nền trong, đúng tỉ lệ vùng in (200dpi) — dùng cho in DTF">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG nền trong
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tt-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="tote" title={orderTitle} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: bản xem màu trên vải → file in đúng {sz.pw / 10}×{sz.ph / 10}cm (nền trong){spec.method === 'screen' ? ` → ${used.length} film tách màu (đen trên trắng, có dấu chồng màu) để xưởng ra khuôn lụa` : ''}. Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản in đúng kích thước (ẩn ngoài màn hình): dùng cho xuất file, ảnh 3D, film tách màu */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={frontRef} data-testid="tt-print-front"><ToteSvg spec={spec} data={data} side="front" logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backRef} data-testid="tt-print-back"><ToteSvg spec={spec} data={data} side="back" logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sepRef} data-testid="tt-seps">
            {spec.method === 'screen' && (['front', ...(spec.back ? ['back'] : [])] as ('front' | 'back')[]).flatMap((side) =>
              Array.from(new Set([1, 2, 3].map((k) => mapInk(spec, k)))).map((k) => (
                <ToteSvg key={`${side}-${k}`} spec={spec} data={data} side={side} logo={logo || undefined} sep={k as 1 | 2 | 3} style={{ width: '100%', display: 'block' }} />
              )))}
          </div>
        </div>
      )}
      {/* tên bố cục cho trình đọc màn hình */}
      <span className="sr-only">{ttLayout(spec.layout).name}</span>
    </div>
  );
}
