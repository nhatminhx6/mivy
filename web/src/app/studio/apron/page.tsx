'use client';
// Tạp dề in logo: chọn mẫu (theo ngành) → điền tên quán / tải logo → kiểu tạp dề (yếm / ngang hông / bistro), túi,
// chất liệu, màu vải, cách làm (in lụa 1–3 màu / thêu / chuyển nhiệt) → tên từng nhân viên (tuỳ chọn) → xem 3D →
// tải file in/thêu đúng kích thước vùng in (PDF: xem màu + file in + film / bảng màu chỉ + từng tên) hoặc đặt làm.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  AP_FABRICS, AP_FIELDS, AP_FONTS, AP_FONT_CSS, AP_INDUSTRIES, AP_INKS, AP_LAYOUTS, AP_MATERIALS, AP_POCKETS, AP_SAMPLES, AP_STYLES, AP_TEMPLATES,
  ApronMockup, ApronSvg, apFabric, apMapInk, apNames, apLowContrast, apStyle, apUsedInks, apronGeom, defaultAPData, useAPFonts,
  type APData, type APMaterial, type APMethod, type APSpec,
} from '@/lib/apron-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: APSpec = { style: 'bib', pocket: 'center', industry: 'cafe', layout: 'badge', material: 'kaki', fabric: 'den', inks: 'cream', font: 'montserrat', method: 'screen', nInk: 2 };
const METHODS: { id: APMethod; name: string; note: string }[] = [
  { id: 'screen', name: 'In lụa (1–3 màu)', note: 'Bền, rẻ khi làm nhiều (từ ~20 chiếc). Màu đặc.' },
  { id: 'embroider', name: 'Thêu logo', note: 'Sang, bền nhất — tối đa 6 màu chỉ (mẫu dùng ≤3).' },
  { id: 'sub', name: 'In chuyển nhiệt', note: 'Đủ màu, logo màu gốc — chỉ ăn trên vải dù polyester.' },
];
const orderMaterial = (spec: APSpec) => spec.method === 'embroider' ? 'Tạp dề vải bố thêu logo' : spec.material === 'du' ? 'Tạp dề vải dù (rẻ)' : 'Tạp dề kaki in lụa';

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

// đổi ngành khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu ngành mới
function switchIndustryData(d: APData, from: string, to: string): APData {
  const oldS = AP_SAMPLES[from] || {}, next = defaultAPData(to);
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

interface PdfPage { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; bg?: string; label?: string }
async function pagesToPdf(pages: PdfPage[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const p of pages) {
    const outW = Math.round((p.wMm / 25.4) * p.dpi), outH = Math.round((p.hMm / 25.4) * p.dpi);
    const c = await svgToCanvas(await selfContainedSvg(p.el, AP_FONT_CSS, { outline: true }), outW, outH, p.bg);
    if (p.label) {
      const x = c.getContext('2d')!;
      const fs = Math.max(12, Math.round(outW * 0.022));
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

/** bảng màu chỉ thêu (đính kèm PDF cho xưởng thêu) */
function ThreadSheet({ colors, w, h, size }: { colors: string[]; w: number; h: number; size: string }) {
  return (
    <svg viewBox="0 0 210 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', display: 'block' }} data-thread-sheet="1">
      <rect width={210} height={120} fill="#ffffff" />
      <text x={12} y={18} fontFamily='"Be Vietnam Pro"' fontWeight={800} fontSize={7} fill="#1c1c1c">BẢNG MÀU CHỈ THÊU</text>
      <text x={12} y={28} fontFamily='"Be Vietnam Pro"' fontWeight={600} fontSize={4.2} fill="#444">{`Vùng thêu ${w}×${h}mm · ${size} · ${colors.length} màu chỉ — xưởng đối chiếu mã chỉ gần nhất`}</text>
      {colors.map((c, i) => (
        <g key={i}>
          <rect x={12 + i * 62} y={40} width={50} height={40} rx={4} fill={c} stroke="#999" strokeWidth={0.4} />
          <text x={12 + i * 62} y={90} fontFamily='"Be Vietnam Pro"' fontWeight={800} fontSize={5} fill="#1c1c1c">{`Chỉ ${i + 1}`}</text>
          <text x={12 + i * 62} y={98} fontFamily='"Be Vietnam Pro"' fontWeight={600} fontSize={4.4} fill="#444">{c.toUpperCase()}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ApronPage() {
  const ready = useAPFonts();
  const [spec, setSpec] = useState<APSpec>(FIRST);
  const [data, setData] = useState<APData>(defaultAPData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [pi, setPi] = useState(0);
  const [minText, setMinText] = useState(99);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const sepRef = useRef<HTMLDivElement | null>(null);
  const peopleRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const st = apStyle(spec.style);
  const geo = apronGeom(spec.style, spec.pocket);
  const fab = apFabric(spec.fabric);
  const used = apUsedInks(spec);
  const names = apNames(data);
  const person = names.length ? names[Math.min(pi, names.length - 1)] : undefined;
  const set = (p: Partial<APSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { if (key !== 'names') setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof AP_TEMPLATES)[number]) => {
    const changed = t.spec.industry !== spec.industry;
    set({ ...t.spec, method: t.spec.method || (spec.method === 'embroider' ? 'screen' : spec.method), ...(t.spec.method === 'embroider' && spec.material === 'du' ? { material: 'kaki' as APMaterial } : {}) });
    if (!dirty) setData((d) => ({ ...defaultAPData(t.spec.industry), names: d.names || '' }));
    else if (changed) setData((d) => ({ ...switchIndustryData(d, spec.industry, t.spec.industry), names: d.names || '' }));
  };
  const slug = slugify(`tap-de-${data.brand || ''}`, 'tap-de');
  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;

  // cỡ chữ nhỏ nhất trong vùng in (mm) → cảnh báo thêu chi tiết quá nhỏ
  useEffect(() => {
    const el = svgOf(printRef);
    if (!el) return;
    const sizes = [...el.querySelectorAll('text')].map((t) => parseFloat(t.getAttribute('font-size') || '99')).filter((v) => v > 0);
    setMinText(sizes.length ? Math.min(...sizes) : 99);
  });

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // PDF: xem màu trên vải → file in (nền trong) → film từng màu (in lụa) / bảng màu chỉ (thêu) → mỗi tên 1 trang (nếu có)
  const buildPdf = async () => {
    const el = svgOf(printRef);
    if (!el) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const P = geo.print;
    const pages: PdfPage[] = [];
    pages.push({ el, wMm: P.w, hMm: P.h, dpi: 150, bg: fab.color, label: `Bản xem màu trên vải ${fab.name.toLowerCase()} — không dùng để in` });
    pages.push({ el, wMm: P.w, hMm: P.h, dpi: 300 });
    if (spec.method === 'screen') {
      for (const u of used) {
        const s = svgOf(sepRef, `svg[data-sep="${u.k}"]`);
        if (s) pages.push({ el: s, wMm: P.w + 30, hMm: P.h + 30, dpi: 250, bg: '#ffffff' });
      }
    } else if (spec.method === 'embroider') {
      const t = svgOf(threadRef);
      if (t) pages.push({ el: t, wMm: 210, hMm: 120, dpi: 150, bg: '#ffffff' });
    }
    if (names.length > 1) {
      const all = peopleRef.current ? [...peopleRef.current.querySelectorAll('svg')] as SVGSVGElement[] : [];
      for (const s of all) pages.push({ el: s, wMm: P.w, hMm: P.h, dpi: 200 });
    }
    return pagesToPdf(pages);
  };
  const pdfPages = 2 + (spec.method === 'screen' ? used.length : spec.method === 'embroider' ? 1 : 0) + (names.length > 1 ? names.length : 0);
  const methodSlug = spec.method === 'screen' ? `in-lua-${spec.nInk}mau` : spec.method === 'embroider' ? 'theu' : 'chuyen-nhiet';
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${spec.style}-${methodSlug}-file-in.pdf`));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(printRef); if (!el) return;
    const w = Math.round((geo.print.w / 25.4) * 200), h = Math.round((geo.print.h / 25.4) * 200);
    const c = await svgToCanvas(await selfContainedSvg(el, AP_FONT_CSS), w, h);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-vung-in-nen-trong.png`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, AP_FONT_CSS), `${slug}-vung-in-${geo.print.w}x${geo.print.h}mm.svg`);
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
      const el = svgOf(printRef)!;
      preview = await toBlob(await svgToCanvas(await selfContainedSvg(el, AP_FONT_CSS), 900, Math.round((900 * geo.print.h) / geo.print.w), fab.color), 'image/jpeg', 0.86);
    }
    return { file, fileName: `${slug}-${spec.style}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/apron-3d').then((m) => m.apronBuilder({ tex: svgOf(texRef), spec, fontCss: AP_FONT_CSS }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __apSnap?: (w: number, h: number) => Promise<string> }).__apSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const methodName = spec.method === 'screen' ? `In lụa ${spec.nInk} màu` : spec.method === 'embroider' ? `Thêu ${spec.nInk} màu chỉ` : 'In chuyển nhiệt đủ màu';
  const matName = AP_MATERIALS.find((m) => m.id === spec.material)!.name;
  const orderTitle = `Tạp dề ${st.name} · ${matName.toLowerCase()} ${fab.name.toLowerCase()} · ${methodName}${names.length ? ` · ${names.length} tên` : ''}`;
  const subWarn = spec.method === 'sub' && spec.material !== 'du';
  const embWarn = spec.method === 'embroider' && minText < 4;
  const P = geo.print;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tạp dề in logo" sub="Tạp dề nhân viên quán cà phê, tiệm bánh, nhà hàng, spa, BBQ — chọn mẫu theo ngành, kiểu yếm / ngang hông / bistro, in lụa · thêu · chuyển nhiệt, thêm tên từng bạn, xem tạp dề thật 3D, tải file in đúng kích thước hoặc đặt Mivy làm + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${AP_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {AP_TEMPLATES.map((t) => {
                  const on = spec.industry === t.spec.industry && spec.layout === t.spec.layout && spec.fabric === t.spec.fabric && spec.inks === t.spec.inks;
                  const tspec: APSpec = { ...spec, ...t.spec, method: t.spec.method || (spec.method === 'embroider' ? 'screen' : spec.method) };
                  const tdata = dirty ? switchIndustryData(data, spec.industry, t.spec.industry) : AP_SAMPLES[t.spec.industry];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="ap-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#EEE9E0] aspect-square p-1">
                        <ApronMockup spec={tspec} data={tdata} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="ap-industries">
                  {AP_INDUSTRIES.map((ind) => (
                    <button key={ind.id} type="button" className={chip(spec.industry === ind.id)} data-testid={`ap-ind-${ind.id}`} onClick={() => {
                      if (ind.id === spec.industry) return;
                      set({ industry: ind.id });
                      setData((d) => ({ ...(dirty ? switchIndustryData(d, spec.industry, ind.id) : defaultAPData(ind.id)), names: d.names || '' }));
                    }}>{ind.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {AP_FIELDS.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`ap-${f.key}`} />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="mv-label block mb-1.5">Tên từng nhân viên (tuỳ chọn · mỗi dòng 1 tên → mỗi chiếc in 1 tên dưới logo)</span>
                  <textarea className="mv-input min-h-[80px]" value={data.names || ''} placeholder={'Thu Hà\nQuốc Bảo\nGia Khánh'} onChange={(e) => setField('names', e.target.value)} data-testid="ap-names" />
                </label>
                {names.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400" data-testid="ap-people">
                    <span>{names.length} tên · xem:</span>
                    {names.slice(0, 12).map((n, i) => <button key={i} type="button" onClick={() => setPi(i)} className={chip(i === Math.min(pi, names.length - 1))}>{n}</button>)}
                    {names.length > 12 && <span>…</span>}
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo (tuỳ chọn) — thay icon ngành</div>
                    <div className="text-[11px] text-slate-400 leading-snug">PNG nền trong là đẹp nhất. In lụa / thêu: logo tự chuyển 1 màu (phần tối in/thêu, phần sáng bỏ). Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="ap-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Kiểu tạp dề & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="ap-styles">
                    {AP_STYLES.map((s) => (
                      <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={`${chip(spec.style === s.id)} !text-left !py-2`} data-testid={`ap-style-${s.id}`}>
                        <div className="font-semibold">{s.name}</div><div className="text-[11px] text-slate-400 font-normal">{s.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5" data-testid="ap-pockets">
                  <span className="text-[11px] text-slate-400 mr-1">Túi trước:</span>
                  {AP_POCKETS.map((p) => <button key={p.id} type="button" onClick={() => set({ pocket: p.id })} className={chip(spec.pocket === p.id)} data-testid={`ap-pocket-${p.id}`}>{p.name}</button>)}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="ap-materials">
                    {AP_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id, ...(m.id !== 'du' && spec.method === 'sub' ? { method: 'screen' as const } : {}) })} className={`${chip(spec.material === m.id)} !text-left !py-2`} data-testid={`ap-mat-${m.id}`}>
                        <div className="font-semibold">{m.name}</div><div className="text-[11px] text-slate-400 font-normal">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu vải</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="ap-fabrics">
                    {AP_FABRICS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ fabric: f.id })} className={`flex items-center gap-2 ${chip(spec.fabric === f.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: f.color }} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Cách in / thêu, màu & font">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {METHODS.map((m) => (
                    <button key={m.id} type="button" onClick={() => set({ method: m.id })} className={`${chip(spec.method === m.id)} !text-left !py-2`} data-testid={`ap-method-${m.id}`}>
                      <div className="font-semibold">{m.name}</div><div className="text-[11px] text-slate-400 font-normal">{m.note}</div>
                    </button>
                  ))}
                </div>
                {spec.method !== 'sub' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">{spec.method === 'embroider' ? 'Số màu chỉ:' : 'Số màu mực:'}</span>
                    {([1, 2, 3] as const).map((n) => <button key={n} type="button" onClick={() => set({ nInk: n })} className={chip(spec.nInk === n)} data-testid={`ap-nink-${n}`}>{n} màu</button>)}
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ap-layouts">
                    {AP_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid={`ap-layout-${l.id}`}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">{spec.method === 'embroider' ? 'Bộ màu chỉ' : 'Bộ màu mực'}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="ap-inks">
                    {AP_INKS.map((ik) => (
                      <button key={ik.id} type="button" onClick={() => set({ inks: ik.id })} className={`flex items-center gap-2 ${chip(spec.inks === ik.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{ik.c.slice(0, spec.method === 'sub' ? 3 : spec.nInk).map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{ik.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="ap-fonts">
                    {AP_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.brand, data.tagline, data.since, person, logo.length])} refitKey={`${spec.style}|${spec.pocket}`} debounce={400} className="rounded-lg aspect-[4/5] w-full" />
            )}
            {tab === 'flat' && (
              <div className="space-y-2" data-testid="ap-flat">
                <div className="rounded-lg bg-[#EEE9E0] p-2" style={{ aspectRatio: '4 / 5' }}>
                  <ApronMockup spec={spec} data={data} logo={logo || undefined} person={person} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Vùng {spec.method === 'embroider' ? 'thêu' : 'in'} {P.w / 10}×{P.h / 10}cm (đúng tỉ lệ)</div>
                  <div className="rounded-lg p-[6%]" style={{ background: fab.color }}>
                    <div style={{ aspectRatio: `${P.w} / ${P.h}`, outline: '1px dashed rgba(127,127,127,0.45)', outlineOffset: 2 }}>
                      <ApronSvg spec={spec} data={data} logo={logo || undefined} person={person} stitch={spec.method === 'embroider'} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="ap-used">
              <span>{methodName}:</span>
              {used.map((u) => <span key={u.k} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: u.color }} />{u.color}</span>)}
              <span>· {st.name}</span>
            </div>
            {apLowContrast(spec) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="ap-contrast">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Màu {spec.method === 'embroider' ? 'chỉ' : 'mực'} chính gần màu vải — sẽ chìm. Thử bộ màu sáng cho vải tối (hoặc ngược lại).
              </div>
            )}
            {subWarn && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> In chuyển nhiệt chỉ ăn màu trên vải dù polyester.
              </div>
            )}
            {embWarn && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="ap-emb-warn">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Có chữ nhỏ ~{minText.toFixed(1)}mm — thêu dưới 4mm dễ nhoè nét. Rút gọn chữ, bỏ bớt dòng phụ hoặc chuyển in lụa.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="ap-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ap-pdf" data-pages={pdfPages}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF {spec.method === 'embroider' ? 'thêu' : 'in'}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ap-png" title="PNG nền trong, đúng tỉ lệ vùng in (200dpi)">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG nền trong
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ap-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="apron" title={orderTitle} defaultMaterial={orderMaterial(spec)} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: bản xem màu → file {spec.method === 'embroider' ? 'thêu' : 'in'} đúng {P.w / 10}×{P.h / 10}cm (nền trong){spec.method === 'screen' ? ` → ${used.length} film tách màu (đen trên trắng, có dấu chồng màu)` : spec.method === 'embroider' ? ' → bảng màu chỉ' : ''}{names.length > 1 ? ` → ${names.length} trang tên riêng từng chiếc` : ''}. Hoặc gửi yêu cầu, Mivy làm + giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản in đúng kích thước (ẩn): xuất file, texture 3D, film tách màu, tên từng người */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="ap-print"><ApronSvg spec={spec} data={data} logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texRef}><ApronSvg spec={spec} data={data} logo={logo || undefined} person={person} stitch={spec.method === 'embroider'} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sepRef} data-testid="ap-seps">
            {spec.method === 'screen' && Array.from(new Set([1, 2, 3].map((k) => apMapInk(spec, k)))).map((k) => (
              <ApronSvg key={k} spec={spec} data={data} logo={logo || undefined} person={person} sep={k as 1 | 2 | 3} style={{ width: '100%', display: 'block' }} />
            ))}
          </div>
          <div ref={threadRef}>{spec.method === 'embroider' && <ThreadSheet colors={used.map((u) => u.color)} w={P.w} h={P.h} size={st.name} />}</div>
          <div ref={peopleRef} data-testid="ap-people-print">
            {names.length > 1 && names.map((n, i) => <ApronSvg key={i} spec={spec} data={data} logo={logo || undefined} person={n} style={{ width: '100%', display: 'block' }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
