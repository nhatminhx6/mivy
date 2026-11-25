'use client';
// Bình / ly giữ nhiệt khắc logo: chọn mẫu → điền thương hiệu, dán danh sách tên (mỗi bình khắc 1 tên) → chọn sản phẩm,
// màu thân (inox xước / sơn tĩnh điện), khắc laser hay in UV → xem 3D → tải file khắc đúng khổ (đen = laser bắn),
// PDF mỗi người 1 trang, hoặc gửi yêu cầu in. Logo khách chỉ nằm trên máy, khắc laser tự đổi logo sang 1 màu.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, FileArchive, ImagePlus, Loader2, AlertTriangle } from 'lucide-react';
import {
  MAX_NAMES, TB_FIELDS, TB_FINISHES, TB_FONTS, TB_FONT_CSS, TB_METHODS, TB_PALETTES, TB_PRODUCTS, TB_SAMPLES, TB_TEMPLATES,
  TumblerSheetSvg, TumblerSideSvg, defaultTBData, lowContrast, switchTBData, tbFinish, tbLayout, tbPeople, tbProduct, tbSheetDims, useTBFonts,
  type TBData, type TBLogo, type TBSpec,
} from '@/lib/tumbler-engine';
import { logoToMask } from '@/lib/tape-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TBSpec = TB_TEMPLATES[0].spec;

async function fileToPng(file: Blob, maxSide: number): Promise<{ src: string; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/png'), w: c.width, h: c.height };
}

// SVG đúng khổ thật → PDF nhiều trang (mỗi người 1 trang, không vạch cắt — file khắc/in UV)
async function sheetsToPdf(els: SVGSVGElement[], wMm: number, hMm: number, dpi: number, onProgress?: (i: number) => void): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const orientation = wMm >= hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  for (let i = 0; i < els.length; i++) {
    onProgress?.(i);
    if (i > 0) pdf.addPage([wMm, hMm], orientation);
    const c = await svgToCanvas(await selfContainedSvg(els[i], TB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function TumblerPage() {
  const ready = useTBFonts();
  const [spec, setSpec] = useState<TBSpec>(FIRST);
  const [data, setData] = useState<TBData>(defaultTBData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [logoRaw, setLogoRaw] = useState<{ src: string; w: number; h: number } | null>(null);
  const [invert, setInvert] = useState(false);
  const [logo, setLogo] = useState<TBLogo | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [who, setWho] = useState(0);
  const [batchOn, setBatchOn] = useState(false);
  const batchWait = useRef<(() => void) | null>(null);
  const flatRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const batchRef = useRef<HTMLDivElement | null>(null);
  const f3d = useRef<HTMLDivElement | null>(null);
  const bA = useRef<HTMLDivElement | null>(null);
  const bB = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const pr = tbProduct(spec.product);
  const fin = tbFinish(spec.finish);
  const people = tbPeople(data);
  const person = people[Math.min(who, people.length - 1)];
  const sheet = tbSheetDims(spec);
  const set = (p: Partial<TBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTemplate = (t: (typeof TB_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => (dirty ? switchTBData(d, spec.layout, t.spec.layout) : defaultTBData(t.spec.layout)));
    setSpec(t.spec); setWho(0);
  };
  const slug = slugify(`binh-giu-nhiet-${data.brand || data.team || people[0].name || ''}`, 'binh-giu-nhiet');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  // logo khắc laser → bóng 1 màu (tính lại khi đổi "logo sáng")
  useEffect(() => {
    let on = true;
    if (!logoRaw) { setLogo(null); return; }
    logoToMask(logoRaw.src, 150, invert).then((mask) => { if (on) setLogo({ ...logoRaw, mask }); }).catch(() => { if (on) setLogo({ ...logoRaw, mask: null }); });
    return () => { on = false; };
  }, [logoRaw, invert]);
  useEffect(() => { if (batchOn) batchWait.current?.(); }, [batchOn]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  // dựng tạm tờ file của TẤT CẢ người nhận (chỉ lúc xuất file, đỡ nặng khi gõ)
  const allSheets = async (): Promise<SVGSVGElement[]> => {
    if (people.length <= 1) { const el = svgOf(sheetRef); return el ? [el] : []; }
    await new Promise<void>((res) => { batchWait.current = res; setBatchOn(true); });
    await new Promise((r) => setTimeout(r, 60));
    return [...(batchRef.current?.querySelectorAll('svg[data-sheet]') || [])] as SVGSVGElement[];
  };
  const dpi = spec.method === 'laser' ? (people.length > 20 ? 400 : 600) : 300;
  const buildPdf = async () => {
    const els = await allSheets();
    try { return await sheetsToPdf(els, sheet.w, sheet.h, dpi, (i) => setBusy(`pdf ${i + 1}/${els.length}`)); } finally { setBatchOn(false); }
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await buildPdf(), `${slug}-${pr.id}-${spec.method === 'laser' ? 'file-khac' : 'file-in-uv'}-${people.length}binh.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = await allSheets();
    try {
      const ser = async (el: SVGSVGElement) => {
        const s = await selfContainedSvg(el, TB_FONT_CSS, { outline: true });
        s.setAttribute('width', `${sheet.w}mm`); s.setAttribute('height', `${sheet.h}mm`);
        return new XMLSerializer().serializeToString(s);
      };
      if (els.length === 1) {
        downloadBlob(new Blob([await ser(els[0])], { type: 'image/svg+xml' }), `${slug}-${pr.id}-${spec.method === 'laser' ? 'file-khac' : 'file-in'}.svg`);
        return;
      }
      const enc = new TextEncoder();
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < els.length; i++) {
        setBusy(`svg ${i + 1}/${els.length}`);
        files.push({ name: `${String(i + 1).padStart(3, '0')}-${slugify(people[i]?.name || '', 'binh')}.svg`, data: enc.encode(await ser(els[i])) });
      }
      downloadBlob(zipStore(files), `${slug}-${pr.id}-${els.length}binh-${spec.method === 'laser' ? 'file-khac' : 'file-in'}.zip`);
    } finally { setBatchOn(false); }
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(sheetRef); if (!el) return;
    downloadBlob(await svgToPng(el, TB_FONT_CSS, Math.round((sheet.w / 25.4) * 300), { watermark: false }), `${slug}-${pr.id}-${spec.method === 'uv' ? 'in-uv' : 'khac'}.png`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) { setTab('3d'); throw new Error('Mở tab Thành phẩm 3D rồi bấm lại nhé.'); }
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await buildPdf();
    const pv = svgOf(sheetRef);
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : pv ? await svgToPng(pv, TB_FONT_CSS, 1000, { watermark: false }) : new Blob();
    return { file, fileName: `${slug}-${pr.id}-${people.length}binh.pdf`, preview };
  };

  const build3d = () => import('@/lib/tumbler-3d').then((m) => m.tumblerBuilder({
    product: spec.product, finishHex: fin.hex, method: spec.method, fontCss: TB_FONT_CSS,
    front: svgOf(f3d), backA: svgOf(bA), backB: people.length > 1 ? svgOf(bB) : null,
  }));
  // hook cho QC: chụp 3D góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __tbSnap?: (w: number, h: number) => Promise<string> }).__tbSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const addLogo = async (file?: File | null) => { if (file) { setLogoRaw(await fileToPng(file, 1000)); setDirty(true); } };

  const material = pr.kind === 'tumbler' ? 'Ly giữ nhiệt 600ml có ống hút' : spec.method === 'uv' ? 'Bình inox sơn tĩnh điện in UV' : 'Bình inox 500ml khắc laser';
  const orderTitle = `${pr.short} ${fin.name} · ${spec.method === 'laser' ? 'khắc laser' : 'in UV'} · ${tbLayout(spec.layout).name} · ${people.length} bình`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = TB_FIELDS[spec.layout] || [];
  const tplData = (layout: string) => (dirty ? switchTBData(data, spec.layout, layout) : TB_SAMPLES[layout]);
  const warn = lowContrast(spec);
  const swatch = (hex: string | null) => (hex ? hex : 'linear-gradient(135deg,#EEF0F2 0%,#A9AFB6 45%,#E3E6E9 60%,#8E959D 100%)');
  const busyLbl = (k: string) => (busy.startsWith(k) && busy.includes(' ') ? busy.split(' ')[1] : '');

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bình giữ nhiệt khắc logo" sub="Bình inox, ly giữ nhiệt khắc laser hoặc in UV logo công ty + tên từng người — quà tặng nhân viên, khách VIP, sự kiện, gym. Dán danh sách tên là mỗi bình khắc 1 tên riêng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TB_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {TB_TEMPLATES.map((t) => {
                  const on = JSON.stringify(t.spec) === JSON.stringify(spec);
                  const tp = tbProduct(t.spec.product);
                  const td = tplData(t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="tb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm mx-auto" style={{ aspectRatio: `${tp.area.w} / ${tp.area.h}` }}>
                        <TumblerSideSvg spec={t.spec} data={td} side="front" person={tbPeople(td)[0]} logo={logo} render="preview" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 leading-tight line-clamp-2">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung & tên người nhận">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer !flex gap-1.5"><ImagePlus className="w-3.5 h-3.5" /> {logoRaw ? 'Đổi logo' : 'Tải logo (PNG/JPG)'}
                    <input type="file" accept="image/*" className="hidden" data-testid="tb-logo" onChange={(e) => addLogo(e.target.files?.[0])} />
                  </label>
                  {logoRaw && (
                    <>
                      <img src={logoRaw.src} alt="" className="h-9 max-w-[90px] object-contain" />
                      <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} /> Logo màu sáng (trên nền tối)</label>
                      <button type="button" className="text-xs text-slate-400 underline" onClick={() => setLogoRaw(null)}>Bỏ logo</button>
                    </>
                  )}
                  {!logoRaw && <span className="text-[11px] text-slate-400">Chưa có logo → tự vẽ chữ lồng từ tên thương hiệu. Khắc laser tự đổi logo sang 1 màu.</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.multiline ? 'sm:col-span-2' : ''}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[78px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tb-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tb-${f.key}`} />}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400" data-testid="tb-count">
                  {people[0].name ? <><b className="text-mv-fg">{people.length}</b> tên → {people.length} bình, mỗi bình khắc 1 tên riêng ở mặt sau (tối đa {MAX_NAMES}).</> : 'Chưa có tên → mặt sau khắc chung, không tên riêng.'}
                </p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Sản phẩm, màu thân & cách làm">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Sản phẩm</div>
                  <div className="grid grid-cols-2 gap-1.5" data-testid="tb-products">
                    {TB_PRODUCTS.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ product: p.id })} className={`${chip(spec.product === p.id)} text-left`} data-testid={`tb-product-${p.id}`}>
                        <div>{p.name}</div><div className="text-[10px] text-slate-400 font-normal">Vùng khắc mỗi mặt {p.area.w}×{p.area.h}mm</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu thân</div>
                  <div className="flex flex-wrap gap-2" data-testid="tb-finishes">
                    {TB_FINISHES.map((f) => (
                      <button key={f.id} type="button" title={f.name} onClick={() => set({ finish: f.id })} data-testid={`tb-finish-${f.id}`}
                        className={`flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-[11px] ${spec.finish === f.id ? 'border-indigo-400 ring-2 ring-indigo-400/40 text-mv-fg' : 'border-mv-hair text-slate-300'}`}>
                        <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: swatch(f.hex) }} />{f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Cách làm</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TB_METHODS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ method: m.id })} className={`${chip(spec.method === m.id)} text-left`} data-testid={`tb-method-${m.id}`}>
                        <div>{m.name}</div><div className="text-[10px] text-slate-400 font-normal">{m.hint}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {spec.method === 'laser'
                      ? (fin.hex ? 'Laser bóc lớp sơn → chữ/logo hiện màu inox sáng.' : 'Laser trên inox trần → vết khắc màu xám sẫm.')
                      : 'In UV đủ màu, phủ bóng — hợp logo nhiều màu, ảnh.'}
                  </p>
                </div>
                {spec.method === 'uv' && (
                  <div>
                    <div className="mv-label mb-1.5">Màu mực in</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="tb-palettes">
                      {TB_PALETTES.map((pl) => (
                        <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                          <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.main} 50%, ${pl.accent} 50%)` }} />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {warn && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-700" data-testid="tb-warn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {spec.method === 'laser' ? 'Khắc laser trên thân màu sáng sẽ khó đọc (lộ inox gần cùng màu). Nên chọn thân màu đậm.' : 'Màu mực gần màu thân bình — chữ sẽ chìm. Đổi màu mực hoặc màu thân nhé.'}
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="tb-fonts">
                    {TB_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.src.length || 0, logo?.mask?.href.length || 0, invert])} refitKey={spec.product} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-2'}>
              {people.length > 1 && (
                <select className="mv-input !py-1.5 !text-xs" value={who} onChange={(e) => setWho(Number(e.target.value))} data-testid="tb-who">
                  {people.slice(0, 60).map((p, i) => <option key={i} value={i}>#{i + 1} {p.name}{p.num ? ` (${p.num})` : ''}</option>)}
                </select>
              )}
              <div ref={flatRef} className="grid grid-cols-2 gap-3" data-testid="tb-flat">
                {(['front', 'back'] as const).map((sd) => (
                  <div key={sd} className="space-y-1">
                    <div className="text-[10px] text-slate-400 text-center">{sd === 'front' ? 'Mặt trước' : `Mặt sau${person.name ? ` · ${person.name}` : ''}`}</div>
                    <div className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${pr.area.w} / ${pr.area.h}` }} data-testid={`tb-${sd}`}>
                      <TumblerSideSvg spec={spec} data={data} side={sd} person={person} logo={logo} render="preview" guides style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{pr.short} · vùng {spec.method === 'laser' ? 'khắc' : 'in'} {pr.area.w}×{pr.area.h}mm mỗi mặt · {people.length} bình</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG {spec.method === 'uv' ? 'in UV' : 'khắc'}
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tb-svg">
                {busy.startsWith('svg') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{busyLbl('svg')}</> : <FileArchive className="w-3.5 h-3.5" />} {people.length > 1 ? `SVG (${people.length} file .zip)` : 'SVG khắc'}
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tb-pdf">
                {busy.startsWith('pdf') ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{busyLbl('pdf')}</> : <FileDown className="w-3.5 h-3.5" />} PDF ({people.length} trang)
              </button>
            </div>
            <PrintRequest product="tumbler" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File đúng khổ thật: {spec.method === 'laser' ? 'màu ĐEN = chỗ laser bắn, nhãn xám chỉ để đọc' : 'nền trong suốt, máy in UV tự lót trắng'}. Mỗi người 1 trang (mặt trước + mặt sau có tên). Đặt từ 10 bình, giao tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: file in (người #1), texture 3D (mặt trước + mặt sau người #1, #2), tờ file mọi người khi xuất */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 700, pointerEvents: 'none' }}>
          <div ref={sheetRef} data-testid="tb-sheet"><TumblerSheetSvg spec={spec} data={data} person={people[0]} idx={0} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={f3d}><TumblerSideSvg spec={spec} data={data} side="front" person={people[0]} logo={logo} render={spec.method === 'laser' ? 'mask' : 'decal'} style={{ width: 300, display: 'block' }} /></div>
          <div ref={bA}><TumblerSideSvg spec={spec} data={data} side="back" person={people[0]} logo={logo} render={spec.method === 'laser' ? 'mask' : 'decal'} style={{ width: 300, display: 'block' }} /></div>
          <div ref={bB}><TumblerSideSvg spec={spec} data={data} side="back" person={people[1] || people[0]} logo={logo} render={spec.method === 'laser' ? 'mask' : 'decal'} style={{ width: 300, display: 'block' }} /></div>
          {batchOn && (
            <div ref={batchRef} data-testid="tb-batch">
              {people.map((p, i) => <div key={i}><TumblerSheetSvg spec={spec} data={data} person={p} idx={i} logo={logo} style={{ width: 500, display: 'block' }} /></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
