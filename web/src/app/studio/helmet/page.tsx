'use client';
// Mũ bảo hiểm in logo (quà tặng doanh nghiệp, đại lý, trường học): chọn mẫu → điền tên, slogan, hotline, logo → chọn kiểu mũ,
// màu vỏ, bóng/nhám, cách in (lụa 1–2 màu / UV), vị trí decal → xem mũ thật 3D → tải PDF (phiếu đơn + decal từng vị trí
// đúng kích thước thật) / SVG / PNG mockup, hoặc gửi yêu cầu làm.

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import {
  HM_FIELDS, HM_FONTS, HM_FONT_CSS, HM_INKS, HM_KINDS, HM_LAYOUTS, HM_POS, HM_SHELLS, HM_TEMPLATES, HmArtSvg, HmMockSvg, HmSummarySvg,
  defaultHmData, hmInk, hmInkColors, hmPositions, hmShell, hmWarnings, useHmFonts, type HmData, type HmPos, type HmSpec,
} from '@/lib/helmet-engine';
import { logoToMask } from '@/lib/tape-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: HmSpec = { ...HM_TEMPLATES[0].spec };

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
function switchLayoutData(d: HmData, from: string, to: string): HmData {
  const oldS = defaultHmData(from), next = defaultHmData(to);
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
    const c = await svgToCanvas(await selfContainedSvg(p.el, HM_FONT_CSS, { outline: true }), outW, outH, p.bg);
    const orientation = p.wMm >= p.hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [p.wMm, p.hMm], orientation, compress: true });
    else pdf.addPage([p.wMm, p.hMm], orientation);
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, p.wMm, p.hMm, undefined, 'FAST');
  }
  return pdf!.output('blob');
}

export default function HelmetPage() {
  const ready = useHmFonts();
  const [spec, setSpec] = useState<HmSpec>(FIRST);
  const [data, setData] = useState<HmData>(defaultHmData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [logoMask, setLogoMask] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [qty, setQty] = useState(100);
  const [dlPos, setDlPos] = useState<HmPos | ''>('');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidRef = useRef<HTMLDivElement | null>(null);

  // lụa: logo → bóng 1 màu (vùng tối = mực)
  useEffect(() => {
    let on = true;
    if (!logo) { setLogoMask(''); return; }
    logoToMask(logo, 160).then((m) => { if (on) setLogoMask(m?.href || ''); }).catch(() => { if (on) setLogoMask(''); });
    return () => { on = false; };
  }, [logo]);

  const positions = hmPositions(spec);
  const cols = hmInkColors(spec);
  const warns = ready ? hmWarnings(spec) : [];
  const curDl: HmPos = dlPos && positions.includes(dlPos) ? dlPos : positions[0];
  const lg = logo || undefined, lm = logoMask || undefined;

  const set = (p: Partial<HmSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof HM_TEMPLATES)[number]) => {
    const changed = t.spec.layout !== spec.layout;
    set(t.spec);
    if (!dirty) setData(defaultHmData(t.spec.layout));
    else if (changed) setData((d) => switchLayoutData(d, spec.layout, t.spec.layout));
  };
  const slug = slugify(`mu-bao-hiem-${data.brand || ''}`, 'mu-bao-hiem');
  const q$ = (sel: string) => hidRef.current?.querySelector(sel) as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const nPages = 1 + positions.length;
  const buildPdf = async () => {
    const pages: PdfPage[] = [];
    const sum = q$('[data-role="summary"] svg'); if (!sum) throw new Error('Chưa dựng xong, thử lại nhé.');
    pages.push({ el: sum, wMm: 210, hMm: 297, dpi: 150, bg: '#ffffff' });
    for (const p of positions) {
      const el = q$(`[data-role="print-${p}"] svg`); if (!el) continue;
      pages.push({ el, wMm: HM_POS[p].w, hMm: HM_POS[p].h, dpi: 300 });
    }
    return pagesToPdf(pages, (i) => setBusy(`pdf ${i + 1}/${pages.length}`));
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-decal.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = q$(`[data-role="print-${curDl}"] svg`); if (!el) return;
    const P = HM_POS[curDl];
    downloadBlob(await svgFileBlob(el, HM_FONT_CSS), `${slug}-${curDl}-${P.w}x${P.h}mm.svg`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', qq?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, qq));
  const downloadMock = () => run('png', async () => {
    const el = q$('[data-role="mock"] svg'); if (!el) return;
    downloadBlob(await toBlob(await svgToCanvas(await selfContainedSvg(el, HM_FONT_CSS), 2000, 1000, '#F4F2EE')), `${slug}-mockup.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-thanh-pham-3d.png`);
  });
  const makeFiles = async () => {
    const file = await buildPdf();
    let preview: Blob;
    if (view3d.current) preview = await toBlob(await view3d.current.snapshot(1200, 900), 'image/jpeg', 0.86);
    else preview = await toBlob(await svgToCanvas(await selfContainedSvg(q$('[data-role="mock"] svg')!, HM_FONT_CSS), 1200, 600, '#ffffff'), 'image/jpeg', 0.86);
    return { file, fileName: `${slug}-decal.pdf`, preview };
  };

  const sh = hmShell(spec.shell);
  const build3d = () => import('@/lib/helmet-3d').then((m) => m.helmetBuilder({
    kind: spec.kind, visor: spec.visor, shellHex: sh.hex, metal: !!sh.metal, finish: spec.finish, fontCss: HM_FONT_CSS,
    arts: Object.fromEntries(positions.map((p) => [p, q$(`[data-role="print-${p}"] svg`)])),
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __hmSnap?: (w: number, h: number) => Promise<string> }).__hmSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh này, thử PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const kindName = HM_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `Mũ bảo hiểm ${kindName.toLowerCase()} ${sh.name.toLowerCase()} · ${spec.method === 'uv' ? 'decal UV' : `in lụa ${cols.length} màu`} ${positions.length} vị trí · ${qty} mũ`;
  const material = spec.kind === 'three4' ? 'Mũ 3/4 in decal' : 'Mũ bảo hiểm nửa đầu in decal logo';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Mũ bảo hiểm in logo" sub="Quà tặng khách hàng, đại lý, ngân hàng, bảo hiểm, trường học — chọn mẫu, điền tên & logo, chọn kiểu mũ & màu vỏ, xem mũ thật 3D, tải decal đúng kích thước hoặc đặt Mivy làm + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${HM_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {HM_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.shell === t.spec.shell && spec.ink === t.spec.ink;
                  const tdata = dirty ? switchLayoutData(data, spec.layout, t.spec.layout) : defaultHmData(t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="hm-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#EEEBE5] aspect-[34/26] overflow-hidden">
                        <HmMockSvg spec={t.spec} data={tdata} logo={lg} logoMask={lm} idp={`t${t.id}`} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="hm-layouts">
                  {HM_LAYOUTS.map((l) => (
                    <button key={l.id} type="button" className={chip(spec.layout === l.id)} onClick={() => {
                      const t = HM_TEMPLATES.find((x) => x.spec.layout === l.id)!;
                      pickTemplate({ ...t, spec: { ...spec, layout: l.id } });
                    }}>{l.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {HM_FIELDS.map((f) => (
                    <label key={f.key} className="block col-span-2 sm:col-span-1">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} placeholder={f.ph} maxLength={60} onChange={(e) => setField(f.key, e.target.value)} data-testid={`hm-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-mv-hair p-3">
                  {logo
                    ? <img src={logo} alt="" className="w-12 h-12 object-contain rounded bg-white/60" />
                    : <div className="w-12 h-12 rounded grid place-items-center bg-ink/[0.05]"><ImagePlus className="w-5 h-5 text-slate-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-mv-fg">Logo (tuỳ chọn — thay biểu tượng ngành)</div>
                    <div className="text-[11px] text-slate-400 leading-snug">In lụa: logo tự chuyển 1 màu mực. In UV: giữ màu gốc. Ảnh chỉ nằm trên máy anh/chị.</div>
                  </div>
                  <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                    {logo ? 'Đổi' : 'Tải lên'}<input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="hm-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="p-1.5 text-slate-400 hover:text-mv-fg" aria-label="Bỏ logo"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mũ, màu & cách in">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="hm-kinds">
                  {HM_KINDS.map((k) => (
                    <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={`${chip(spec.kind === k.id)} !text-left !py-2`} data-testid={`hm-kind-${k.id}`}>
                      <div className="font-semibold">{k.name}</div><div className="text-[11px] text-slate-400 font-normal">{k.note}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={spec.visor} onChange={(e) => set({ visor: e.target.checked })} data-testid="hm-visor" /> Lưỡi trai nhựa
                  </label>
                  <div className="flex gap-1.5" data-testid="hm-finish">
                    <button type="button" className={chip(spec.finish === 'gloss')} onClick={() => set({ finish: 'gloss' })}>Vỏ bóng</button>
                    <button type="button" className={chip(spec.finish === 'matte')} onClick={() => set({ finish: 'matte' })}>Vỏ nhám</button>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu vỏ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="hm-shells">
                    {HM_SHELLS.map((c) => (
                      <button key={c.id} type="button" title={c.name} onClick={() => set({ shell: c.id })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${spec.shell === c.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair'}`} style={{ background: c.hex }} aria-label={c.name} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cách in decal</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => set({ method: 'screen' })} className={`${chip(spec.method === 'screen')} !text-left !py-2`} data-testid="hm-method-screen">
                      <div className="font-semibold">In lụa 1–2 màu</div><div className="text-[11px] text-slate-400 font-normal">Rẻ khi số lượng lớn, màu đặc, bền.</div>
                    </button>
                    <button type="button" onClick={() => set({ method: 'uv' })} className={`${chip(spec.method === 'uv')} !text-left !py-2`} data-testid="hm-method-uv">
                      <div className="font-semibold">Decal in UV</div><div className="text-[11px] text-slate-400 font-normal">Đủ màu, giữ logo gốc, hợp đơn ít.</div>
                    </button>
                  </div>
                  {spec.method === 'screen' && (
                    <div className="flex gap-1.5 mt-2" data-testid="hm-inkcount">
                      <button type="button" className={chip(spec.inks === 1)} onClick={() => set({ inks: 1 })} data-testid="hm-inks-1">1 màu</button>
                      <button type="button" className={chip(spec.inks === 2)} onClick={() => set({ inks: 2 })} data-testid="hm-inks-2">2 màu</button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bộ màu mực</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="hm-inks">
                    {HM_INKS.map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ ink: t.id })} className={`flex items-center gap-2 ${chip(spec.ink === t.id)}`}>
                        <span className="flex -space-x-1.5 shrink-0">{t.c.map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-slate-400/60" style={{ background: c }} />)}</span>
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Vị trí decal</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2" data-testid="hm-positions">
                    <span className="text-xs text-slate-400">✓ Mặt trước {HM_POS.front.w}×{HM_POS.front.h}mm</span>
                    {(['left', 'right', 'back'] as const).map((p) => (
                      <label key={p} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={spec[p]} onChange={(e) => set({ [p]: e.target.checked })} data-testid={`hm-pos-${p}`} />
                        {HM_POS[p].name} {HM_POS[p].w}×{HM_POS[p].h}mm
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="hm-fonts">
                    {HM_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <label className="block max-w-[200px]">
                  <span className="mv-label block mb-1.5">Số lượng mũ</span>
                  <input type="number" min={1} className="mv-input" value={qty} onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))} data-testid="hm-qty" />
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, logoMask.length])} refitKey={`${spec.kind}|${spec.visor}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            {tab === 'flat' && (
              <div className="grid grid-cols-2 gap-2" data-testid="hm-flat">
                <div className="rounded-lg bg-[#EEEBE5]"><HmMockSvg spec={spec} data={data} logo={lg} logoMask={lm} idp="flat1" view="side" style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Nhìn hông</div></div>
                <div className="rounded-lg bg-[#EEEBE5]"><HmMockSvg spec={spec} data={data} logo={lg} logoMask={lm} idp="flat2" view="front" style={{ width: '100%', display: 'block' }} /><div className="text-[11px] text-slate-500 text-center pb-1">Nhìn trước</div></div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400" data-testid="hm-used" data-count={cols.length}>
              <span>{spec.method === 'uv' ? 'Decal UV · màu chính:' : `In lụa ${cols.length} màu:`}</span>
              {cols.map((c, i) => <span key={i} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-mv-hair" style={{ background: c }} />{hmInk(spec.ink).n[i]}</span>)}
            </div>
            {warns.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-[11px] text-amber-700" data-testid="hm-warn">
                {warns.map((w, i) => <div key={i} className="flex items-start gap-2"><TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>)}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5" data-testid="hm-dlpos">
              <span className="text-[11px] text-slate-400">File SVG vị trí:</span>
              {positions.map((p) => <button key={p} type="button" onClick={() => setDlPos(p)} className={`${chip(curDl === p)} !px-2 !py-1 !text-[11px]`}>{HM_POS[p].name}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="hm-3d" title={tab !== '3d' ? 'Mở tab Thành phẩm 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="hm-pdf" data-pages={nPages}>
                {busy.startsWith('pdf') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy.slice(4)}</> : <><FileDown className="w-3.5 h-3.5" /> PDF decal ({nPages} trang)</>}
              </button>
              <button type="button" onClick={downloadMock} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="hm-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mockup
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="hm-svg" title="File vector đúng kích thước thật, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="helmet" title={orderTitle} defaultMaterial={material} design={{ spec, data, qty, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF gồm: phiếu đơn (màu vỏ, cách in, màu mực, lưu ý dán mặt cong) → decal từng vị trí đúng kích thước thật, nền trong, chữ đã outline. Decal hông/gáy dán mặt cong — xưởng sẽ xẻ khía mép cho khỏi nhăn.
            </p>
          </div>
        </div>
      )}

      {/* bản đúng kích thước (ẩn): xuất file, texture 3D, phiếu đơn */}
      {ready && (
        <div ref={hidRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          {positions.map((p) => (
            <div key={p} data-role={`print-${p}`} data-testid={`hm-print-${p}`}>
              <HmArtSvg spec={spec} data={data} pos={p} logo={lg} logoMask={lm} uid={`pr${p}`} style={{ width: '100%', display: 'block' }} />
            </div>
          ))}
          <div data-role="mock">
            <svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', display: 'block' }}>
              <rect width={640} height={260} fill="#F4F2EE" />
              <svg x={0} y={0} width={340} height={260} viewBox="0 0 340 260"><HmMockSvg spec={spec} data={data} logo={lg} logoMask={lm} idp="pm1" view="side" /></svg>
              <svg x={330} y={10} width={300} height={240} viewBox="0 0 300 240"><HmMockSvg spec={spec} data={data} logo={lg} logoMask={lm} idp="pm2" view="front" /></svg>
            </svg>
          </div>
          <div data-role="summary"><HmSummarySvg spec={spec} data={data} qty={qty} logo={lg} logoMask={lm} /></div>
        </div>
      )}
    </div>
  );
}
