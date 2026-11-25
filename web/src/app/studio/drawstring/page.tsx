'use client';
// Túi rút (balo dây rút): chọn mẫu → điền chữ / tải logo → chọn chất liệu, màu vải, cách in (lụa 1–3 màu hoặc chuyển nhiệt),
// khổ → xem túi 3D → tải file in đúng kích thước vùng in (PDF: bản xem màu + file in + film tách màu) hoặc đặt in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  DS_FABRICS, DS_FONTS, DS_FONT_CSS, DS_INKS, DS_LAYOUTS, DS_MATERIALS, DS_SAMPLES, DS_SIZES, DS_TEMPLATES,
  DrawstringSvg, defaultDSData, dsFabric, dsFields, dsLayout, dsLowContrast, dsMapInk, dsSize, dsUsedInks, useDSFonts,
  type DSData, type DSMaterial, type DSSpec,
} from '@/lib/drawstring-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: DSSpec = { layout: 'race', material: 'du', fabric: 'den', inks: 'neon', font: 'oswald', size: '35x45', method: 'screen', nInk: 3, back: false };
const MAT_ORDER: Record<DSMaterial, string> = { du: 'Túi rút vải dù in lụa', canvas: 'Túi rút canvas', nonwoven: 'Túi rút vải không dệt' };

/** logo khách: thu nhỏ ≤1200px, giữ nền trong — chỉ nằm trên máy khách */
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
function switchLayoutData(d: DSData, from: string, to: string): DSData {
  const oldS = DS_SAMPLES[from] || {}, next = defaultDSData(to);
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

interface PdfPage { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; bg?: string; label?: string }
async function pagesToPdf(pages: PdfPage[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const p of pages) {
    const outW = Math.round((p.wMm / 25.4) * p.dpi), outH = Math.round((p.hMm / 25.4) * p.dpi);
    const c = await svgToCanvas(await selfContainedSvg(p.el, DS_FONT_CSS, { outline: true }), outW, outH, p.bg);
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

export default function DrawstringPage() {
  const ready = useDSFonts();
  const [spec, setSpec] = useState<DSSpec>(FIRST);
  const [data, setData] = useState<DSData>(defaultDSData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const sepRef = useRef<HTMLDivElement | null>(null);

  const sz = dsSize(spec.size);
  const fab = dsFabric(spec.fabric);
  const used = dsUsedInks(spec);
  const set = (p: Partial<DSSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof DS_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    if (!dirty) setData(defaultDSData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`tui-rut-${data.brand || ''}`, 'tui-rut');
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
  const methodSlug = spec.method === 'screen' ? `in-lua-${spec.nInk}mau` : 'chuyen-nhiet';
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${sz.id}-${methodSlug}-file-in.pdf`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    const w = Math.round((sz.pw / 25.4) * 200), h = Math.round((sz.ph / 25.4) * 200);
    const c = await svgToCanvas(await selfContainedSvg(el, DS_FONT_CSS), w, h);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-mat-truoc-nen-trong.png`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, DS_FONT_CSS), `${slug}-mat-truoc-${sz.pw}x${sz.ph}mm.svg`);
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
      preview = await toBlob(await svgToCanvas(await selfContainedSvg(el, DS_FONT_CSS), 900, Math.round((900 * sz.ph) / sz.pw), fab.color), 'image/jpeg', 0.86);
    }
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/drawstring-3d').then((m) => m.drawstringBuilder({
    front: svgOf(frontRef), back: spec.back ? svgOf(backRef) : null, size: sz, fabric: fab, material: spec.material, method: spec.method, fontCss: DS_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __dsSnap?: (w: number, h: number) => Promise<string> }).__dsSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const methodName = spec.method === 'screen' ? `In lụa ${spec.nInk} màu` : 'In chuyển nhiệt đủ màu';
  const matName = DS_MATERIALS.find((m) => m.id === spec.material)!.name;
  const orderTitle = `Túi rút ${sz.name} · ${matName} ${fab.name.toLowerCase()} · ${methodName}${spec.back ? ' · 2 mặt' : ''}`;
  const fields = dsFields(spec.layout);
  const ratio = `${sz.pw} / ${sz.ph}`;
  const subWarn = spec.method === 'sub' && spec.material !== 'du';
  const designBox = (side: 'front' | 'back') => (
    <div className="rounded-lg p-[7%] shadow-inner" style={{ background: fab.color }}>
      <div style={{ aspectRatio: ratio, outline: '1px dashed rgba(127,127,127,0.45)', outlineOffset: 2 }}>
        <DrawstringSvg spec={spec} data={data} side={side} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Túi rút in logo" sub="Balo dây rút cho giải chạy, sự kiện, CLB, trường lớp, quà thương hiệu — chọn mẫu, chất liệu & cách in (lụa 1–3 màu hoặc chuyển nhiệt), xem túi thật 3D, tải file in đúng kích thước hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${DS_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {DS_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.fabric === t.spec.fabric && spec.inks === t.spec.inks && spec.font === t.spec.font;
                  const tspec = { ...spec, ...t.spec };
                  const tdata = dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : DS_SAMPLES[t.spec.layout];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="ds-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg p-[9%]" style={{ background: dsFabric(t.spec.fabric).color }}>
                        <div style={{ aspectRatio: ratio }}>
                          <DrawstringSvg spec={tspec} data={tdata} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
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
                <div className="flex flex-wrap gap-1.5" data-testid="ds-layouts">
                  {DS_LAYOUTS.map((l) => (
                    <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => {
                      const t = DS_TEMPLATES.find((x) => x.spec.layout === l.id)!;
                      pickTemplate({ ...t, spec: { ...t.spec, fabric: spec.fabric, inks: spec.inks, font: spec.font, nInk: spec.nInk } });
                    }}>{l.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`ds-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo (tuỳ chọn)</div>
                    <div className="text-[11px] text-slate-400 leading-snug">PNG nền trong là đẹp nhất. In lụa: logo tự chuyển 1 màu mực (phần tối in, phần sáng bỏ). Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="ds-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chất liệu & cách in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="ds-materials">
                    {DS_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id, ...(m.id !== 'du' && spec.method === 'sub' ? { method: 'screen' as const } : {}) })} className={`${chip(spec.material === m.id)} !text-left !py-2`} data-testid={`ds-mat-${m.id}`}>
                        <div className="font-semibold">{m.name}</div><div className="text-[11px] text-slate-400 font-normal">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu vải</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="ds-fabrics">
                    {DS_FABRICS.map((f) => (
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
                    <button type="button" onClick={() => set({ method: 'screen' })} className={`${chip(spec.method === 'screen')} !text-left !py-2`} data-testid="ds-method-screen">
                      <div className="font-semibold">In lụa (1–3 màu)</div><div className="text-[11px] text-slate-400 font-normal">Bền, rẻ khi in nhiều (từ ~50 túi). Màu đặc.</div>
                    </button>
                    <button type="button" onClick={() => set({ method: 'sub' })} className={`${chip(spec.method === 'sub')} !text-left !py-2`} data-testid="ds-method-sub">
                      <div className="font-semibold">In chuyển nhiệt</div><div className="text-[11px] text-slate-400 font-normal">Đủ màu, logo màu — hợp vải dù polyester.</div>
                    </button>
                  </div>
                  {spec.method === 'screen' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-slate-400 mr-1">Số màu mực:</span>
                      {([1, 2, 3] as const).map((n) => <button key={n} type="button" onClick={() => set({ nInk: n })} className={chip(spec.nInk === n)} data-testid={`ds-nink-${n}`}>{n} màu</button>)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bộ màu mực</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="ds-inks">
                    {DS_INKS.map((ik) => (
                      <button key={ik.id} type="button" onClick={() => set({ inks: ik.id })} className={`flex items-center gap-2 ${chip(spec.inks === ik.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{ik.c.slice(0, spec.method === 'screen' ? spec.nInk : 3).map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{ik.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ds-fonts">
                    {DS_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ túi">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="ds-sizes">
                  {DS_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="ds-size">{s.name} <span className="text-slate-400 font-normal">· in tối đa {s.pw / 10}×{s.ph / 10}cm</span></button>)}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={spec.back} onChange={(e) => set({ back: e.target.checked })} data-testid="ds-back" />
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={spec.size} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2" data-testid="ds-flat">
                <div><div className="text-[11px] text-slate-400 mb-1">Mặt trước · vùng in {sz.pw / 10}×{sz.ph / 10}cm</div>{designBox('front')}</div>
                {spec.back && <div><div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>{designBox('back')}</div>}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="ds-used">
              <span>{methodName}:</span>
              {used.map((u) => <span key={u.k} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: u.color }} />{u.color}</span>)}
              <span>· {sz.name}</span>
            </div>
            {dsLowContrast(spec) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="ds-contrast">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Màu mực chính gần màu vải — in ra sẽ chìm. Thử bộ mực sáng cho vải tối (hoặc ngược lại).
              </div>
            )}
            {subWarn && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> In chuyển nhiệt chỉ ăn màu trên vải dù polyester.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="ds-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ds-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in{spec.method === 'screen' ? ' + film' : ''}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ds-png" title="PNG nền trong, đúng tỉ lệ vùng in (200dpi)">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG nền trong
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ds-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="drawstring" title={orderTitle} defaultMaterial={MAT_ORDER[spec.material]} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: bản xem màu trên vải → file in đúng {sz.pw / 10}×{sz.ph / 10}cm (nền trong){spec.method === 'screen' ? ` → ${used.length} film tách màu (đen trên trắng, có dấu chồng màu) để xưởng ra khuôn lụa` : ''}. Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản in đúng kích thước (ẩn): dùng cho xuất file, ảnh 3D, film tách màu */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={frontRef} data-testid="ds-print-front"><DrawstringSvg spec={spec} data={data} side="front" logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backRef} data-testid="ds-print-back"><DrawstringSvg spec={spec} data={data} side="back" logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sepRef} data-testid="ds-seps">
            {spec.method === 'screen' && (['front', ...(spec.back ? ['back'] : [])] as ('front' | 'back')[]).flatMap((side) =>
              Array.from(new Set([1, 2, 3].map((k) => dsMapInk(spec, k)))).map((k) => (
                <DrawstringSvg key={`${side}-${k}`} spec={spec} data={data} side={side} logo={logo || undefined} sep={k as 1 | 2 | 3} style={{ width: '100%', display: 'block' }} />
              )))}
          </div>
        </div>
      )}
      <span className="sr-only">{dsLayout(spec.layout).name}</span>
    </div>
  );
}
