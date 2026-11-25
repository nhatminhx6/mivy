'use client';
// Ô dù in logo: ô cầm tay 8 nan · ô gấp 3 · dù che quán 2m4 (có diềm). Chọn mẫu → điền tên/slogan/hotline,
// tải logo (tô 1 màu mực in lụa) → chọn in mấy múi, màu vải xen kẽ → xem thành phẩm 3D → tải file in từng múi
// (múi cong thật theo bán kính vòm, đường may + lề cắt) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  GoreSvg, TopViewSvg, UMB_FIELDS, UMB_FONTS, UMB_FONT_CSS, UMB_KINDS, UMB_LAYOUTS, UMB_MATERIAL, UMB_PALETTES, UMB_PANEL_OPTS, UMB_TEMPLATES,
  ValanceSvg, goreWMax, loadLogo, printedPanels, tintLogo, umbGeo, umbPalette, valW, variantColors,
  defaultUmbData, useUmbFonts, type UmbData, type UmbKind, type UmbLogo, type UmbSpec,
} from '@/lib/umbrella-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToPng, svgToJpeg } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = UMB_TEMPLATES[0];
const MM_PER_IN = 25.4;

async function readImage(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// nhiều SVG (khổ khác nhau) → 1 PDF, mỗi SVG 1 trang đúng khổ thật (mm)
async function svgsToSizedPdf(els: SVGSVGElement[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const el of els) {
    const vb = el.viewBox.baseVal;
    const wMm = vb.width, hMm = vb.height;
    const dpi = Math.min(150, Math.floor((MM_PER_IN * 6000) / Math.max(wMm, hMm)));
    const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
    const c = await svgToCanvas(await selfContainedSvg(el, UMB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    const orientation = wMm >= hMm ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
    else pdf.addPage([wMm, hMm], orientation);
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf!.output('blob');
}

export default function UmbrellaPage() {
  const ready = useUmbFonts();
  const [spec, setSpec] = useState<UmbSpec>({ ...FIRST.spec });
  const [data, setData] = useState<UmbData>(defaultUmbData());
  const [dirty, setDirty] = useState(false);
  const [logoSrc, setLogoSrc] = useState<{ src: string; ar: number } | null>(null);
  const [fullColor, setFullColor] = useState(false);
  const [logo, setLogo] = useState<UmbLogo | null>(null);
  const [logoAlt, setLogoAlt] = useState<UmbLogo | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const goreRef = useRef<HTMLDivElement | null>(null);
  const goreAltRef = useRef<HTMLDivElement | null>(null);
  const valRef = useRef<HTMLDivElement | null>(null);
  const valAltRef = useRef<HTMLDivElement | null>(null);
  const pGoreRef = useRef<HTMLDivElement | null>(null);
  const pGoreAltRef = useRef<HTMLDivElement | null>(null);
  const pValRef = useRef<HTMLDivElement | null>(null);
  const pValAltRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  const g = umbGeo(spec.kind);
  const pal = umbPalette(spec.palette);
  const patio = spec.kind === 'patio';
  const printed = printedPanels(spec.panels, g.N);
  const needAltGore = spec.alternate && printed.some((i) => i % 2 === 1);
  const slug = slugify(`o-du-${data.brand || ''}`, 'o-du');
  const set = (p: Partial<UmbSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTpl = (t: (typeof UMB_TEMPLATES)[number]) => {
    setSpec({ ...t.spec });
    if (!dirty) setData({ ...t.data });
  };

  // logo khách → tô đúng màu mực từng loại múi (in lụa) hoặc giữ màu gốc (in kỹ thuật số)
  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); setLogoAlt(null); return; }
    if (fullColor) { setLogo({ href: logoSrc.src, ar: logoSrc.ar }); setLogoAlt({ href: logoSrc.src, ar: logoSrc.ar }); return; }
    const a = variantColors(pal, 'base', spec.inks).ink, b = variantColors(pal, 'alt', spec.inks).ink;
    Promise.all([tintLogo(logoSrc.src, a), tintLogo(logoSrc.src, b)]).then(([x, y]) => {
      if (!on) return;
      setLogo({ href: x, ar: logoSrc.ar }); setLogoAlt({ href: y, ar: logoSrc.ar });
    }).catch(() => null);
    return () => { on = false; };
  }, [logoSrc, fullColor, pal, spec.inks]);

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogoSrc(await loadLogo(await readImage(f))); } catch { alert('Không đọc được ảnh'); }
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const build3d = () => import('@/lib/umbrella-3d').then((m) => m.umbrellaBuilder({
    spec, gore: svgOf(goreRef), goreAlt: svgOf(goreAltRef), val: svgOf(valRef), valAlt: svgOf(valAltRef), fontCss: UMB_FONT_CSS,
  }));
  const snap3d = async (w: number, h: number, watermark = false): Promise<HTMLCanvasElement> => {
    if (view3d.current) return view3d.current.snapshot(w, h, { watermark });
    const core = await import('@/lib/mockup3d');
    return core.snapshot(await build3d(), w, h, { watermark });
  };
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __umbSnap?: (w: number, h: number) => Promise<string> }).__umbSnap = async (w, h) => {
    const core = await import('@/lib/mockup3d');
    return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png');
  };

  const printEls = (): SVGSVGElement[] => {
    const list = [svgOf(pGoreRef)];
    if (needAltGore) list.push(svgOf(pGoreAltRef));
    if (patio) { list.push(svgOf(pValRef)); if (spec.alternate) list.push(svgOf(pValAltRef)); }
    return list.filter(Boolean) as SVGSVGElement[];
  };
  const pdfFile = async () => {
    const els = printEls();
    if (!els.length) throw new Error('Chưa dựng xong file in');
    return svgsToSizedPdf(els);
  };
  const svgString = async (el: SVGSVGElement) => new XMLSerializer().serializeToString(await selfContainedSvg(el, UMB_FONT_CSS, { outline: true }));

  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfFile(), `${slug}-${spec.kind}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = printEls();
    if (els.length === 1) { downloadBlob(new Blob([await svgString(els[0])], { type: 'image/svg+xml' }), `${slug}-mui-o-file-in.svg`); return; }
    const enc = new TextEncoder();
    const names = ['mui-mau-chinh', ...(needAltGore ? ['mui-mau-phu'] : []), ...(patio ? ['diem-mau-chinh', ...(spec.alternate ? ['diem-mau-phu'] : [])] : [])];
    const files = await Promise.all(els.map(async (el, i) => ({ name: `${slug}-${names[i] || `trang-${i + 1}`}.svg`, data: enc.encode(await svgString(el)) })));
    downloadBlob(zipStore(files), `${slug}-${spec.kind}-file-in.zip`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(goreRef); if (!el) return;
    downloadBlob(await svgToPng(el, UMB_FONT_CSS, 1600), `${slug}-mui-o.png`);
  });
  const download3d = () => run('3d', async () => {
    const c = await snap3d(1600, 1200, true);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await pdfFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const top = svgOf(topRef);
    const preview = await snap3d(1200, 900).then(toBlob).catch(() => (top ? svgToJpeg(top, UMB_FONT_CSS, 900) : Promise.reject(new Error('Chưa có ảnh xem trước'))));
    return { file, fileName: `${slug}-${spec.kind}-file-in.pdf`, preview };
  };

  const inkList = Array.from(new Set([variantColors(pal, 'base', spec.inks).ink, variantColors(pal, 'base', spec.inks).ink2, ...(needAltGore || (patio && spec.alternate) ? [variantColors(pal, 'alt', spec.inks).ink] : [])]));
  const orderTitle = `${g.short} · ${UMB_PANEL_OPTS.find((o) => o.n === spec.panels)?.name.toLowerCase()} · ${fullColor && logoSrc ? 'logo màu (in kỹ thuật số)' : `in lụa ${inkList.length} màu`}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = UMB_FIELDS.filter((f) => !f.patioOnly || patio);
  const kindsFirst = [...UMB_TEMPLATES].sort((a, b) => Number(b.spec.kind === spec.kind) - Number(a.spec.kind === spec.kind));

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ô dù in logo" sub="Ô cầm tay, ô gấp, dù che quán in logo — chọn in mấy múi, màu vải xen kẽ, xem thành phẩm 3D, tải file in từng múi (cong đúng vòm, có đường may) hoặc đặt Mivy in." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {UMB_KINDS.map((k) => (
          <button key={k.kind} type="button" className="mv-seg-btn" data-active={spec.kind === k.kind} onClick={() => set({ kind: k.kind as UmbKind })} data-testid={`umb-kind-${k.kind}`}>{k.short}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${UMB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {kindsFirst.map((t) => {
                  const on = JSON.stringify(t.spec) === JSON.stringify(spec);
                  const tSpec = { ...t.spec };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="umb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-[#EEF1F5] aspect-square">
                        <TopViewSvg spec={tSpec} data={dirty ? data : t.data} logo={null} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 px-0.5 truncate">{umbGeo(t.spec.kind).short}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung in">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.key === 'brand' || f.key === 'valance' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`umb-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !text-xs !py-2 cursor-pointer" data-testid="umb-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="umb-logo" />
                  </label>
                  {logoSrc && (
                    <>
                      <button type="button" onClick={() => setLogoSrc(null)} className="mv-btn mv-btn-ghost !text-xs !py-2"><X className="w-3.5 h-3.5" /> Bỏ logo</button>
                      <label className="flex items-center gap-1.5 text-xs text-slate-300">
                        <input type="checkbox" checked={fullColor} onChange={(e) => setFullColor(e.target.checked)} data-testid="umb-fullcolor" />
                        Giữ màu gốc logo (in kỹ thuật số)
                      </label>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">Logo xử lý ngay trên máy anh/chị, không gửi đi đâu. In lụa: phần đậm của logo thành 1 màu mực, phần nền trắng bỏ đi (lộ màu vải). Chưa có logo → dùng logo chữ tròn từ tên.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Múi in, màu vải & chữ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">In logo lên</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="umb-panels">
                    {UMB_PANEL_OPTS.map((o) => <button key={o.n} type="button" onClick={() => set({ panels: o.n })} className={chip(spec.panels === o.n)}>{o.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục logo trên múi</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="umb-layouts">
                    {UMB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu vải</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="umb-palettes">
                    {UMB_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: spec.alternate ? `conic-gradient(${pl.base} 0 25%, ${pl.alt} 0 50%, ${pl.base} 0 75%, ${pl.alt} 0)` : pl.base }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.alternate} onChange={(e) => set({ alternate: e.target.checked })} data-testid="umb-alternate" />
                    Múi xen kẽ 2 màu ({pal.name.toLowerCase()} + {pal.alt.toUpperCase() === '#FFFFFF' || pal.alt.toUpperCase().startsWith('#F') ? 'trắng/kem' : 'màu phụ'})
                  </label>
                  <div className="flex items-center gap-1.5" data-testid="umb-inks">
                    <span className="text-xs text-slate-400">Mực in lụa:</span>
                    {([1, 2] as const).map((n) => <button key={n} type="button" onClick={() => set({ inks: n })} className={chip(spec.inks === n)}>{n} màu</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="umb-fonts">
                    {UMB_FONTS.map((f) => (
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length, logoAlt?.href.length, fullColor])} refitKey={spec.kind} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="umb-flat">
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Nhìn từ trên xuống · múi in: {printed.map((i) => i + 1).join(', ')}</div>
                <div ref={topRef} className="rounded-lg overflow-hidden bg-[#EEF1F5] aspect-square">
                  <TopViewSvg spec={spec} data={data} logo={logo} logoAlt={logoAlt} style={{ width: '100%', height: '100%', display: 'block' }} testid="umb-top" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">1 múi (trải phẳng)</div>
                  <div ref={goreRef} className="rounded-lg bg-white/60 p-1">
                    <GoreSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} testid="umb-gore" />
                  </div>
                </div>
                <div className="space-y-2">
                  {needAltGore && (
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">Múi màu phụ</div>
                      <div ref={goreAltRef} className="rounded-lg bg-white/60 p-1">
                        <GoreSvg spec={spec} data={data} variant="alt" logo={logoAlt} style={{ width: '100%', display: 'block' }} testid="umb-gore-alt" />
                      </div>
                    </div>
                  )}
                  {patio && (
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">Diềm dù ({Math.round(valW(g) / 10)}×{g.valH / 10}cm)</div>
                      <div ref={valRef} className="rounded-lg bg-white/60 p-1">
                        <ValanceSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} testid="umb-val" />
                      </div>
                      {spec.alternate && (
                        <div ref={valAltRef} className="rounded-lg bg-white/60 p-1 mt-1.5">
                          <ValanceSvg spec={spec} data={data} variant="alt" style={{ width: '100%', display: 'block' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {g.name} · múi {Math.round(g.L / 10)}×{Math.round((2 * goreWMax(g)) / 10)}cm · in {printed.length}/{g.N} múi · {fullColor && logoSrc ? 'logo màu' : `in lụa ${inkList.length} màu`}
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="umb-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="umb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="umb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="umb-svg" title="File vector, chữ đã outline — xưởng mở bằng AI/Corel">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="umbrella" title={orderTitle} defaultMaterial={UMB_MATERIAL[spec.kind]} design={{ spec, data, hasLogo: !!logoSrc, fullColor }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in: mỗi trang 1 loại múi đúng khổ thật — múi cong theo vòm ô, nét đứt là đường may, nét hồng là đường cắt (chừa {g.allow}mm){patio ? ', kèm tấm diềm' : ''}. Nền là màu vải nhuộm sẵn, chỉ in logo/chữ.
            </p>
          </div>
        </div>
      )}

      {/* bản in (ẩn): múi + diềm có đường may/lề cắt + chú thích */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={pGoreRef}><GoreSvg spec={spec} data={data} logo={logo} print style={{ width: '100%', display: 'block' }} testid="umb-print-gore" /></div>
          {needAltGore && <div ref={pGoreAltRef}><GoreSvg spec={spec} data={data} variant="alt" logo={logoAlt} print style={{ width: '100%', display: 'block' }} /></div>}
          {patio && <div ref={pValRef}><ValanceSvg spec={spec} data={data} print style={{ width: '100%', display: 'block' }} testid="umb-print-val" /></div>}
          {patio && spec.alternate && <div ref={pValAltRef}><ValanceSvg spec={spec} data={data} variant="alt" print style={{ width: '100%', display: 'block' }} /></div>}
        </div>
      )}
    </div>
  );
}
