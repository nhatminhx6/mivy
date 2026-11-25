'use client';
// Mũ lưỡi trai in / thêu logo: chọn mẫu → điền chữ / logo → chọn loại mũ (kaki, trucker, snapback), màu chóp/vành,
// thêu hay in, vị trí (trước, 2 hông, sau gáy) → xem mũ thật 3D → tải PDF (phiếu chỉ + mockup + file từng vị trí đúng
// kích thước thật) / SVG vector, hoặc gửi yêu cầu làm.

import { useRef, useState, type ChangeEvent } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  CAP_COLORS, CAP_FONTS, CAP_FONT_CSS, CAP_KINDS, CAP_LAYOUTS, CAP_POS, CAP_TEMPLATES, CAP_THREADS, CapArtSvg, CapMockSvg,
  CapSummarySvg, capColor, capLayout, capPositions, capThread, capThreadsUsed, capWarnings, defaultCapData, useCapFonts,
  type CapData, type CapPos, type CapSpec,
} from '@/lib/cap-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: CapSpec = { ...CAP_TEMPLATES[0].spec };

async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
function switchLayoutData(d: CapData, from: string, to: string): CapData {
  const oldS = defaultCapData(from), next = defaultCapData(to);
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
    const c = await svgToCanvas(await selfContainedSvg(p.el, CAP_FONT_CSS, { outline: true }), outW, outH, p.bg);
    const orientation = p.wMm >= p.hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [p.wMm, p.hMm], orientation, compress: true });
    else pdf.addPage([p.wMm, p.hMm], orientation);
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, p.wMm, p.hMm, undefined, 'FAST');
  }
  return pdf!.output('blob');
}

export default function CapPage() {
  const ready = useCapFonts();
  const [spec, setSpec] = useState<CapSpec>(FIRST);
  const [data, setData] = useState<CapData>(defaultCapData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [qty, setQty] = useState(50);
  const [dlPos, setDlPos] = useState<CapPos | ''>('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidRef = useRef<HTMLDivElement | null>(null);

  const L = capLayout(spec.layout);
  const positions = capPositions(spec);
  const twoTone = spec.visor !== spec.crown;
  const used = ready ? capThreadsUsed(spec, data, logo || undefined) : [];
  const warns = ready ? capWarnings(spec, data, logo || undefined) : [];
  const th = capThread(spec.threads);
  const curDl: CapPos = dlPos && positions.includes(dlPos) ? dlPos : positions[0];

  const set = (p: Partial<CapSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof CAP_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    if (!dirty) setData(defaultCapData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`mu-${data.brand || ''}`, 'mu-luoi-trai');
  const q$ = (sel: string) => hidRef.current?.querySelector(sel) as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const nPages = 2 + positions.length;
  const buildPdf = async () => {
    const pages: PdfPage[] = [];
    const sum = q$('[data-role="summary"] svg'); if (!sum) throw new Error('Chưa dựng xong, thử lại nhé.');
    pages.push({ el: sum, wMm: 210, hMm: 297, dpi: 150, bg: '#ffffff' });
    const mk = q$('[data-role="mocks"] svg'); if (mk) pages.push({ el: mk, wMm: 297, hMm: 130, dpi: 130, bg: '#ffffff' });
    for (const p of positions) {
      const el = q$(`[data-role="print-${p}"] svg`); if (!el) continue;
      pages.push({ el, wMm: CAP_POS[p].w, hMm: CAP_POS[p].h, dpi: 400 });
    }
    return pagesToPdf(pages, (i) => setBusy(`pdf ${i + 1}/${pages.length}`));
  };
  const methodSlug = spec.method === 'embroider' ? 'theu' : 'in';
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${spec.kind}-${methodSlug}-file.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = q$(`[data-role="print-${curDl}"] svg`); if (!el) return;
    const P = CAP_POS[curDl];
    downloadBlob(await svgFileBlob(el, CAP_FONT_CSS), `${slug}-${curDl}-${P.w}x${P.h}mm.svg`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', qq?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, qq));
  const downloadMock = () => run('png', async () => {
    const el = q$('[data-role="mocks"] svg'); if (!el) return;
    downloadBlob(await toBlob(await svgToCanvas(await selfContainedSvg(el, CAP_FONT_CSS), 2000, 875, '#F4F2EE')), `${slug}-mockup.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-thanh-pham-3d.png`);
  });
  const makeFiles = async () => {
    const file = await buildPdf();
    let preview: Blob;
    if (view3d.current) preview = await toBlob(await view3d.current.snapshot(1200, 900), 'image/jpeg', 0.86);
    else preview = await toBlob(await svgToCanvas(await selfContainedSvg(q$('[data-role="mocks"] svg')!, CAP_FONT_CSS), 1200, 525, '#ffffff'), 'image/jpeg', 0.86);
    return { file, fileName: `${slug}-file.pdf`, preview };
  };

  const build3d = () => import('@/lib/cap-3d').then((m) => m.capBuilder({
    kind: spec.kind, crown: capColor(spec.crown).hex, visor: capColor(spec.visor).hex, method: spec.method, fontCss: CAP_FONT_CSS,
    arts: Object.fromEntries(positions.map((p) => [p, q$(`[data-role="a3d-${p}"] svg`)])),
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __capSnap?: (w: number, h: number) => Promise<string> }).__capSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const kindName = CAP_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${capColor(spec.crown).name.toLowerCase()}${twoTone ? ` / vành ${capColor(spec.visor).name.toLowerCase()}` : ''} · ${spec.method === 'embroider' ? 'thêu' : 'in'} ${positions.length} vị trí · ${qty} mũ`;
  const material = spec.method === 'embroider' ? (spec.kind === 'trucker' ? 'Mũ lưới (trucker) in logo' : 'Mũ kaki thêu logo') : spec.kind === 'trucker' ? 'Mũ lưới (trucker) in logo' : 'Mũ kaki in chuyển nhiệt';
  const colorPick = (key: 'crown' | 'visor', label: string) => (
    <div>
      <div className="mv-label mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5" data-testid={`cap-${key}`}>
        {CAP_COLORS.map((c) => (
          <button key={c.id} type="button" title={c.name} onClick={() => set(key === 'crown' && !twoTone ? { crown: c.id, visor: c.id } : { [key]: c.id })}
            className={`w-8 h-8 rounded-full border-2 transition-all ${spec[key] === c.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair'}`} style={{ background: c.hex }} aria-label={c.name} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Mũ lưỡi trai in / thêu logo" sub="Mũ đồng phục, mũ sự kiện, chạy bộ, đội nhóm, quán cà phê — chọn mẫu, điền chữ / logo, chọn kiểu mũ & màu, thêu hay in, xem mũ thật 3D, tải file thêu đúng kích thước hoặc đặt Mivy làm + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CAP_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {CAP_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.crown === t.spec.crown && spec.kind === t.spec.kind && spec.threads === t.spec.threads;
                  const tdata = dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : defaultCapData(t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="cap-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#EEEBE5] aspect-[32/26] overflow-hidden">
                        <CapMockSvg spec={t.spec} data={tdata} logo={logo || undefined} idp={`t${t.id}`} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="cap-layouts">
                  {CAP_LAYOUTS.map((l) => (
                    <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => {
                      const t = CAP_TEMPLATES.find((x) => x.spec.layout === l.id)!;
                      pickTemplate({ ...t, spec: { ...spec, layout: l.id } });
                    }}>{l.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L.fields.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} placeholder={f.ph} onChange={(e) => setField(f.key, e.target.value)} data-testid={`cap-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo (tuỳ chọn — mẫu &quot;Logo + tên&quot;)</div>
                    <div className="text-[11px] text-slate-400 leading-snug">PNG nền trong là đẹp nhất. Thêu: logo tự chuyển 1 màu chỉ. Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="cap-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mũ, màu & cách làm">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="cap-kinds">
                  {CAP_KINDS.map((k) => (
                    <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={`${chip(spec.kind === k.id)} !text-left !py-2`} data-testid={`cap-kind-${k.id}`}>
                      <div className="font-semibold">{k.name}</div><div className="text-[11px] text-slate-400 font-normal">{k.note}</div>
                    </button>
                  ))}
                </div>
                {colorPick('crown', spec.kind === 'trucker' ? 'Màu mặt trước (mút)' : 'Màu chóp mũ')}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={twoTone} onChange={(e) => set({ visor: e.target.checked ? (spec.crown === 'black' ? 'white' : 'black') : spec.crown })} data-testid="cap-twotone" />
                  {spec.kind === 'trucker' ? 'Lưới + vành khác màu mặt trước' : 'Vành khác màu chóp (mũ 2 màu)'}
                </label>
                {twoTone && colorPick('visor', spec.kind === 'trucker' ? 'Màu lưới + vành' : 'Màu vành')}
                <div>
                  <div className="mv-label mb-1.5">Cách làm</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => set({ method: 'embroider' })} className={`${chip(spec.method === 'embroider')} !text-left !py-2`} data-testid="cap-method-embroider">
                      <div className="font-semibold">Thêu vi tính</div><div className="text-[11px] text-slate-400 font-normal">Sang, bền; tối đa 6 màu chỉ, chữ cao ≥ 4mm.</div>
                    </button>
                    <button type="button" onClick={() => set({ method: 'print' })} className={`${chip(spec.method === 'print')} !text-left !py-2`} data-testid="cap-method-print">
                      <div className="font-semibold">In chuyển nhiệt / decal</div><div className="text-[11px] text-slate-400 font-normal">Đủ màu, chi tiết nhỏ; hợp mũ trucker mặt mút.</div>
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Vị trí thêu / in</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2" data-testid="cap-positions">
                    <span className="text-xs text-slate-400">✓ Mặt trước {CAP_POS.front.w}×{CAP_POS.front.h}mm</span>
                    {(['left', 'right', 'back'] as const).map((p) => (
                      <label key={p} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={spec[p]} onChange={(e) => set({ [p]: e.target.checked })} data-testid={`cap-pos-${p}`} />
                        {CAP_POS[p].name} {CAP_POS[p].w}×{CAP_POS[p].h}mm
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">{spec.method === 'embroider' ? 'Bộ màu chỉ' : 'Bộ màu in'}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="cap-threads">
                    {CAP_THREADS.map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ threads: t.id })} className={`flex items-center gap-2 ${chip(spec.threads === t.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{t.c.map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="cap-fonts">
                    {CAP_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <label className="block max-w-[200px]">
                  <span className="mv-label block mb-1.5">Số lượng mũ</span>
                  <input type="number" min={1} className="mv-input" value={qty} onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))} data-testid="cap-qty" />
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.back}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="grid grid-cols-2 gap-2" data-testid="cap-flat">
                <div className="rounded-lg bg-[#EEEBE5]"><CapMockSvg spec={spec} data={data} side="front" logo={logo || undefined} idp="flat" style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Mặt trước</div></div>
                <div className="rounded-lg bg-[#EEEBE5]"><CapMockSvg spec={spec} data={data} side="back" logo={logo || undefined} idp="flat" style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Mặt sau</div></div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="cap-used" data-count={used.length}>
              <span>{spec.method === 'embroider' ? `Thêu ${used.length} màu chỉ:` : `In ${used.length} màu chính:`}</span>
              {used.map((k) => <span key={k} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: th.c[k - 1] }} />{th.n[k - 1]}</span>)}
            </div>
            {warns.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="cap-warn">
                {warns.map((w, i) => <div key={i} className="flex items-start gap-2"><TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>)}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5" data-testid="cap-dlpos">
              <span className="text-[11px] text-slate-400">File SVG vị trí:</span>
              {positions.map((p) => <button key={p} type="button" onClick={() => setDlPos(p)} className={`${chip(curDl === p)} !px-2 !py-1 !text-[11px]`}>{CAP_POS[p].name}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="cap-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cap-pdf" data-pages={nPages}>
                {busy.startsWith('pdf') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy.slice(4)}</> : <><FileDown className="w-3.5 h-3.5" /> PDF {spec.method === 'embroider' ? 'thêu' : 'in'} ({nPages} trang)</>}
              </button>
              <button type="button" onClick={downloadMock} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cap-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mockup
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cap-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="cap" title={orderTitle} defaultMaterial={material} design={{ spec, data, qty, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: phiếu đơn + bảng {spec.method === 'embroider' ? 'màu chỉ' : 'màu in'} → mockup trước/sau → file từng vị trí đúng kích thước thật (nền trong, chữ đã outline). Hoặc gửi yêu cầu, Mivy làm + giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản đúng kích thước (ẩn): xuất file, texture 3D, phiếu đơn */}
      {ready && (
        <div ref={hidRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          {positions.map((p) => (
            <div key={p}>
              <div data-role={`print-${p}`} data-testid={`cap-print-${p}`}><CapArtSvg spec={spec} data={data} pos={p} logo={logo || undefined} uid="print" style={{ width: '100%', display: 'block' }} /></div>
              <div data-role={`a3d-${p}`}><CapArtSvg spec={spec} data={data} pos={p} logo={logo || undefined} stitch uid="tex" style={{ width: '100%', display: 'block' }} /></div>
            </div>
          ))}
          <div data-role="mocks">
            <svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', display: 'block' }}>
              <rect width={640} height={280} fill="#F4F2EE" />
              <CapMockSvg spec={spec} data={data} side="front" logo={logo || undefined} idp="pdf" box={{ x: 0, y: 10, w: 320, h: 260 }} />
              <CapMockSvg spec={spec} data={data} side="back" logo={logo || undefined} idp="pdf" box={{ x: 320, y: 10, w: 320, h: 260 }} />
            </svg>
          </div>
          <div data-role="summary"><CapSummarySvg spec={spec} data={data} qty={qty} logo={logo || undefined} /></div>
        </div>
      )}
    </div>
  );
}
