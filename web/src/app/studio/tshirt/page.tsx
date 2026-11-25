'use client';
// Áo thun đồng phục: chọn mẫu → điền chữ / logo / danh sách người → chọn áo (cổ tròn / polo), màu áo, cách in
// (lụa 1–4 màu, DTF, thêu logo) → bảng size → xem áo thật 3D (trước + sau) → tải PDF (phiếu đơn + mockup + file in
// từng vị trí đúng kích thước thật + film tách màu + mặt sau từng người) hoặc gửi yêu cầu in.

import { Suspense, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  OrderSummarySvg, TS_COLORS, TS_FONTS, TS_FONT_CSS, TS_INKS, TS_KINDS, TS_LAYOUTS, TS_POS, TS_SIZES, TS_TEMPLATES,
  TShirtMock, TShirtSvg, defaultTSData, inkSet, isStitched, lowContrast, needUnderbase, parsePeople, tsColor, tsLayout,
  tsPositions, tsUsedInks, useTSFonts, type TSData, type TSPerson, type TSPos, type TSSpec,
} from '@/lib/tshirt-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TSSpec = { kind: 'tee', layout: 'company', color: 'navy', inks: 'white', font: 'montserrat', method: 'screen', nInk: 2, embroider: false, sleeve: false };
const MAX_PEOPLE_PAGES = 60;

/** logo khách: thu nhỏ ≤1200px, giữ nền trong — chỉ ở trên máy khách */
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

// đổi bố cục khi khách đã sửa: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu bố cục mới
function switchLayoutData(d: TSData, from: string, to: string): TSData {
  const oldS = defaultTSData(from), next = defaultTSData(to);
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

interface PdfPage { el: SVGSVGElement; wMm: number; hMm: number; dpi: number; bg?: string }
async function pagesToPdf(pages: PdfPage[], onStep?: (i: number) => void): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    onStep?.(i);
    const outW = Math.round((p.wMm / 25.4) * p.dpi), outH = Math.round((p.hMm / 25.4) * p.dpi);
    const c = await svgToCanvas(await selfContainedSvg(p.el, TS_FONT_CSS, { outline: true }), outW, outH, p.bg);
    const orientation = p.wMm >= p.hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [p.wMm, p.hMm], orientation, compress: true });
    else pdf.addPage([p.wMm, p.hMm], orientation);
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, p.wMm, p.hMm, undefined, 'FAST');
  }
  return pdf!.output('blob');
}

export default function TShirtPage() {
  return <Suspense fallback={null}><TShirtStudio /></Suspense>;
}

function TShirtStudio() {
  const ready = useTSFonts();
  const q = useSearchParams();
  const [spec, setSpec] = useState<TSSpec>(() => (q.get('kind') === 'polo' ? { ...FIRST, ...TS_TEMPLATES.find((t) => t.spec.kind === 'polo')!.spec } : FIRST));
  const [data, setData] = useState<TSData>(() => defaultTSData(q.get('kind') === 'polo' ? 'crest' : FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [qtyManual, setQtyManual] = useState<Record<string, number>>({ S: 5, M: 10, L: 10, XL: 5, XXL: 0, '3XL': 0 });
  const [pIdx, setPIdx] = useState(0);
  const [dlPos, setDlPos] = useState<TSPos | ''>('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidRef = useRef<HTMLDivElement | null>(null);

  const L = tsLayout(spec.layout);
  const col = tsColor(spec.color);
  const positions = tsPositions(spec);
  const people = useMemo(() => parsePeople(data.people || ''), [data.people]);
  const perPerson = !!L.perPerson && people.length > 0;
  const person: TSPerson | undefined = L.perPerson ? (people[Math.min(pIdx, people.length - 1)] || undefined) : undefined;
  const hasBack = positions.includes('back');
  const sizedFromList = !!L.people && people.length > 0 && people.some((p) => p.size);
  const qty: Record<string, number> = sizedFromList
    ? Object.fromEntries(TS_SIZES.map((s) => [s, people.filter((p) => p.size === s).length]))
    : qtyManual;
  const total = TS_SIZES.reduce((a, s) => a + (qty[s] || 0), 0);
  const used = tsUsedInks(spec);
  const curDl: TSPos = dlPos && positions.includes(dlPos) ? dlPos : positions[0];

  const set = (p: Partial<TSSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof TS_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    setPIdx(0);
    if (!dirty) setData(defaultTSData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`ao-thun-${data.brand || data.cls || data.dest || ''}`, 'ao-thun');
  const q$ = (sel: string) => hidRef.current?.querySelector(sel) as SVGSVGElement | null;

  // film: mỗi vị trí in lụa (không thêu, không phải mặt sau in riêng từng người) × mỗi màu có mặt (+ lót trắng)
  const films = useMemo(() => {
    if (spec.method !== 'screen' || !ready) return [] as { pos: TSPos; sep: 1 | 2 | 3 | 4 | 'u' }[];
    const out: { pos: TSPos; sep: 1 | 2 | 3 | 4 | 'u' }[] = [];
    for (const ps of positions) {
      if (isStitched(spec, ps) || (ps === 'back' && perPerson)) continue;
      const ks = inkSet(spec, data, ps, !!logo, person);
      if (needUnderbase(spec) && ks.length) out.push({ pos: ps, sep: 'u' });
      for (const k of ks) out.push({ pos: ps, sep: k as 1 | 2 | 3 | 4 });
    }
    return out;
  }, [spec, data, logo, person, positions, perPerson, ready]);
  const peoplePages = perPerson ? people.slice(0, MAX_PEOPLE_PAGES) : [];
  const nPages = 1 + (hasBack ? 2 : 1) + positions.filter((ps) => !(ps === 'back' && perPerson)).length + films.length + peoplePages.length;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const buildPdf = async () => {
    const pages: PdfPage[] = [];
    const sum = q$('[data-role="summary"] svg'); if (!sum) throw new Error('Chưa dựng xong, thử lại nhé.');
    pages.push({ el: sum, wMm: 210, hMm: 297, dpi: 150, bg: '#ffffff' });
    const mf = q$('[data-role="mf"] svg'), mb = q$('[data-role="mb"] svg');
    if (mf) pages.push({ el: mf, wMm: 280, hMm: 273, dpi: 110, bg: '#ffffff' });
    if (hasBack && mb) pages.push({ el: mb, wMm: 280, hMm: 273, dpi: 110, bg: '#ffffff' });
    for (const ps of positions) {
      if (ps === 'back' && perPerson) continue;
      const el = q$(`[data-role="print-${ps}"] svg`); if (!el) continue;
      const P = TS_POS[ps];
      pages.push({ el, wMm: P.w, hMm: P.h, dpi: P.w <= 100 ? 300 : 200 });
    }
    for (const f of films) {
      const el = q$(`[data-role="seps"] svg[data-pos="${f.pos}"][data-sep="${f.sep}"]`); if (!el) continue;
      const P = TS_POS[f.pos];
      pages.push({ el, wMm: P.w + 30, hMm: P.h + 30, dpi: 200, bg: '#ffffff' });
    }
    peoplePages.forEach((_, i) => {
      const el = q$(`[data-role="people"] svg[data-person="${i}"]`);
      if (el) pages.push({ el, wMm: TS_POS.back.w, hMm: TS_POS.back.h, dpi: 150 });
    });
    return pagesToPdf(pages, (i) => setBusy(`pdf ${i + 1}/${pages.length}`));
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${spec.kind}-${col.id}-${spec.method === 'screen' ? `in-lua-${spec.nInk}mau` : 'dtf'}-file-in.pdf`));
  const downloadPng = () => run('png', async () => {
    const el = q$(`[data-role="print-${curDl}"] svg`); if (!el) return;
    const P = TS_POS[curDl];
    const c = await svgToCanvas(await selfContainedSvg(el, TS_FONT_CSS), Math.round((P.w / 25.4) * 200), Math.round((P.h / 25.4) * 200));
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-${curDl}-nen-trong.png`);
  });
  const downloadSvg = () => run('svg', async () => {
    const el = q$(`[data-role="print-${curDl}"] svg`); if (!el) return;
    const P = TS_POS[curDl];
    downloadBlob(await svgFileBlob(el, TS_FONT_CSS), `${slug}-${curDl}-${P.w}x${P.h}mm.svg`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', qq?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, qq));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-thanh-pham-3d.png`);
  });
  const makeFiles = async () => {
    const file = await buildPdf();
    let preview: Blob;
    if (view3d.current) preview = await toBlob(await view3d.current.snapshot(1200, 900), 'image/jpeg', 0.86);
    else {
      const el = q$('[data-role="mf"] svg')!;
      preview = await toBlob(await svgToCanvas(await selfContainedSvg(el, TS_FONT_CSS), 900, 877, '#ffffff'), 'image/jpeg', 0.86);
    }
    return { file, fileName: `${slug}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/tshirt-3d').then((m) => m.tshirtBuilder({
    kind: spec.kind, color: col, method: spec.method, embroider: spec.embroider, fontCss: TS_FONT_CSS,
    front: q$('[data-role="f3d"] svg'), back: q$('[data-role="b3d"] svg'), frontMask: q$('[data-role="fm"] svg'), backMask: q$('[data-role="bm"] svg'),
    showBack: hasBack, label: data.brand || data.cls || 'Mivy',
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __tsSnap?: (w: number, h: number) => Promise<string> }).__tsSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const methodName = spec.method === 'screen' ? `In lụa ${spec.nInk} màu${needUnderbase(spec) ? ' + lót trắng' : ''}` : 'In DTF đủ màu';
  const kindName = TS_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${col.name.toLowerCase()} · ${methodName}${spec.embroider ? ' · thêu logo' : ''} · ${total} áo`;
  const material = spec.kind === 'polo' && spec.embroider ? 'Áo thun cá sấu (polo) thêu logo' : spec.method === 'dtf' ? 'Áo thun cotton in DTF đủ màu' : 'Áo thun cotton 100% in lụa';
  const hasChest = positions.includes('chest') || positions.includes('sleeve');

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Áo thun đồng phục" sub="Áo công ty, áo lớp, áo đội, team building, chạy bộ, gia đình — chọn mẫu, điền tên / danh sách, chọn áo & cách in (lụa, DTF, thêu), xem áo thật 3D, tải file in đúng kích thước từng vị trí hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TS_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {TS_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.color === t.spec.color && spec.inks === t.spec.inks && spec.kind === t.spec.kind;
                  const tspec = { ...spec, ...t.spec, sleeve: false };
                  const tdata = dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : defaultTSData(t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="ts-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#EEEBE5] aspect-square overflow-hidden">
                        <TShirtMock spec={tspec} data={tdata} side="front" logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="ts-layouts">
                  {TS_LAYOUTS.map((l) => (
                    <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => {
                      const t = TS_TEMPLATES.find((x) => x.spec.layout === l.id)!;
                      pickTemplate({ ...t, spec: { ...t.spec, color: spec.color, inks: spec.inks, kind: l.id === 'crest' ? 'polo' : spec.kind } });
                    }}>{l.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L.fields.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} placeholder={f.ph} onChange={(e) => setField(f.key, e.target.value)} data-testid={`ts-${f.key}`} />
                    </label>
                  ))}
                </div>
                {L.people && (
                  <label className="block">
                    <span className="mv-label block mb-1.5">{L.people === 'names' ? 'Danh sách tên in sau lưng (mỗi dòng 1 bạn)' : 'Danh sách người (mỗi dòng: Tên | Số | Size)'}</span>
                    <textarea className="mv-input min-h-[120px] font-mono !text-xs" value={data.people || ''} onChange={(e) => setField('people', e.target.value)}
                      placeholder={L.people === 'names' ? 'Quốc Bảo\nThu Hà\n…' : 'Quốc Bảo | 10 | L\nThu Hà | 7 | S'} data-testid="ts-people" />
                    <span className="text-[11px] text-slate-400">{people.length} người{L.perPerson ? ' · mỗi người 1 mặt sau riêng (in decal tên số)' : ''}{sizedFromList ? ' · bảng size tự đếm theo danh sách' : ''}</span>
                  </label>
                )}
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo (tuỳ chọn)</div>
                    <div className="text-[11px] text-slate-400 leading-snug">PNG nền trong là đẹp nhất. In lụa / thêu: logo tự chuyển 1 màu. Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="ts-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Áo & cách in">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="ts-kinds">
                  {TS_KINDS.map((k) => <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={chip(spec.kind === k.id)} data-testid={`ts-kind-${k.id}`}>{k.name}</button>)}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu áo</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" data-testid="ts-colors">
                    {TS_COLORS.map((c) => (
                      <button key={c.id} type="button" onClick={() => set({ color: c.id })} className={`flex items-center gap-2 ${chip(spec.color === c.id)}`} data-testid="ts-color">
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cách in</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => set({ method: 'screen' })} className={`${chip(spec.method === 'screen')} !text-left !py-2`} data-testid="ts-method-screen">
                      <div className="font-semibold">In lụa (1–4 màu)</div><div className="text-[11px] text-slate-400 font-normal">Bền, rẻ khi in nhiều (từ ~30 áo). Màu đặc; áo tối có thêm lớp lót trắng.</div>
                    </button>
                    <button type="button" onClick={() => set({ method: 'dtf' })} className={`${chip(spec.method === 'dtf')} !text-left !py-2`} data-testid="ts-method-dtf">
                      <div className="font-semibold">In DTF đủ màu</div><div className="text-[11px] text-slate-400 font-normal">In được logo màu, ảnh; hợp đơn ít, áo lớp, áo nhóm.</div>
                    </button>
                  </div>
                  {spec.method === 'screen' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-slate-400 mr-1">Số màu mực:</span>
                      {([1, 2, 3, 4] as const).map((n) => <button key={n} type="button" onClick={() => set({ nInk: n })} className={chip(spec.nInk === n)} data-testid={`ts-nink-${n}`}>{n} màu</button>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                    <label className={`flex items-center gap-2 text-xs text-slate-300 ${hasChest ? 'cursor-pointer' : 'opacity-50'}`}>
                      <input type="checkbox" disabled={!hasChest} checked={spec.embroider} onChange={(e) => set({ embroider: e.target.checked })} data-testid="ts-embroider" />
                      Thêu logo ngực / tay (thay vì in)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={spec.sleeve} onChange={(e) => set({ sleeve: e.target.checked })} data-testid="ts-sleeve" />
                      In thêm tay áo trái (8×8cm)
                    </label>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bộ màu mực{spec.embroider ? ' / chỉ thêu' : ''}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="ts-inks">
                    {TS_INKS.map((ik) => (
                      <button key={ik.id} type="button" onClick={() => set({ inks: ik.id })} className={`flex items-center gap-2 ${chip(spec.inks === ik.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{ik.c.slice(0, spec.method === 'screen' ? spec.nInk : 4).map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{ik.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ts-fonts">
                    {TS_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`4 · Số lượng & size (${total} áo)`}>
              <div className="space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="ts-qty">
                  {TS_SIZES.map((s) => (
                    <label key={s} className="block">
                      <span className="mv-label block mb-1 text-center">{s}</span>
                      <input type="number" min={0} className="mv-input text-center" value={qty[s] || 0} disabled={sizedFromList}
                        onChange={(e) => setQtyManual((m) => ({ ...m, [s]: Math.max(0, Math.round(Number(e.target.value) || 0)) }))} data-testid={`ts-qty-${s}`} />
                    </label>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400" data-testid="ts-total">Tổng: <b className="text-mv-fg">{total}</b> áo{sizedFromList ? ' (đếm theo danh sách — sửa size trong danh sách)' : ''}. Size áo thun form Việt: S ~45–52kg · M ~53–60kg · L ~61–68kg · XL ~69–76kg · XXL ~77–85kg.</div>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, pIdx])} refitKey={`${spec.kind}|${hasBack}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className={`grid gap-2 ${hasBack ? 'grid-cols-2' : 'grid-cols-1'}`} data-testid="ts-flat">
                <div className="rounded-lg bg-[#EEEBE5]"><TShirtMock spec={spec} data={data} side="front" logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Mặt trước</div></div>
                {hasBack && <div className="rounded-lg bg-[#EEEBE5]"><TShirtMock spec={spec} data={data} side="back" logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Mặt sau</div></div>}
              </div>
            )}
            {perPerson && people.length > 1 && (
              <div className="flex flex-wrap gap-1" data-testid="ts-persons">
                {people.slice(0, 16).map((p, i) => <button key={i} type="button" onClick={() => setPIdx(i)} className={`${chip(i === Math.min(pIdx, people.length - 1))} !px-2 !py-1 !text-[11px]`}>{p.name || '…'}{p.num ? ` #${p.num}` : ''}</button>)}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="ts-used">
              <span>{methodName}:</span>
              {used.map((u) => <span key={u.k} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: u.color }} />{u.color}</span>)}
            </div>
            {lowContrast(spec) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="ts-contrast">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Màu mực chính gần màu áo — in ra sẽ chìm. Áo tối nên chọn bộ mực sáng (và ngược lại).
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5" data-testid="ts-dlpos">
              <span className="text-[11px] text-slate-400">File PNG/SVG vị trí:</span>
              {positions.map((ps) => <button key={ps} type="button" onClick={() => setDlPos(ps)} className={`${chip(curDl === ps)} !px-2 !py-1 !text-[11px]`}>{TS_POS[ps].name}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="ts-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ts-pdf" data-pages={nPages}>
                {busy.startsWith('pdf') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy.slice(4)}</> : <><FileDown className="w-3.5 h-3.5" /> PDF in ({nPages} trang)</>}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ts-png" title="PNG nền trong, đúng kích thước vị trí in (200dpi) — dùng cho DTF">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG nền trong
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ts-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="tshirt" title={orderTitle} defaultMaterial={material} design={{ spec, data, qty, total, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: phiếu đơn + bảng size → mockup trước/sau → file in từng vị trí đúng kích thước thật (nền trong){films.length ? ` → ${films.length} film tách màu` : ''}{peoplePages.length ? ` → ${peoplePages.length} mặt sau tên/số từng người` : ''}. Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản in đúng kích thước (ẩn ngoài màn hình): xuất file, texture 3D, film, mặt sau từng người */}
      {ready && (
        <div ref={hidRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          {positions.map((ps) => (
            <div key={ps} data-role={`print-${ps}`} data-testid={`ts-print-${ps}`}>
              <TShirtSvg spec={spec} data={data} pos={ps} logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} />
            </div>
          ))}
          <div data-role="f3d"><TShirtMock spec={spec} data={data} side="front" logo={logo || undefined} person={person} for3d style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="b3d"><TShirtMock spec={spec} data={data} side="back" logo={logo || undefined} person={person} for3d style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="fm"><TShirtMock spec={spec} data={data} side="front" logo={logo || undefined} person={person} mask style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="bm"><TShirtMock spec={spec} data={data} side="back" logo={logo || undefined} person={person} mask style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="mf"><TShirtMock spec={spec} data={data} side="front" logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="mb"><TShirtMock spec={spec} data={data} side="back" logo={logo || undefined} person={person} style={{ width: '100%', display: 'block' }} /></div>
          <div data-role="seps" data-testid="ts-seps">
            {films.map((f) => <TShirtSvg key={`${f.pos}-${f.sep}`} spec={spec} data={data} pos={f.pos} logo={logo || undefined} person={person} sep={f.sep} style={{ width: '100%', display: 'block' }} />)}
          </div>
          <div data-role="people" data-testid="ts-people-backs">
            {peoplePages.map((p, i) => (
              <TShirtSvg key={i} spec={spec} data={data} pos="back" logo={logo || undefined} person={p} personIdx={i} style={{ width: '100%', display: 'block' }} />
            ))}
          </div>
          <div data-role="summary"><OrderSummarySvg spec={spec} data={data} qty={qty} people={L.people ? people : []} positions={positions} /></div>
        </div>
      )}
    </div>
  );
}
