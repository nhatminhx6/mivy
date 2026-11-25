'use client';
// Ruy băng in logo: chọn mẫu → điền tên shop/lời nhắn → chọn khổ, chất liệu (satin/grosgrain/organza/vải bố), màu ruy băng,
// in nhũ hoặc 1–2 màu mực → xem hộp quà buộc nơ + cuộn ruy băng 3D → tải file in đoạn lặp (đúng khổ, vạch lặp) / gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  RB_COLORS, RB_FIELDS, RB_FOILS, RB_FONTS, RB_FONT_CSS, RB_INKS, RB_LAYOUTS, RB_MARK_MM, RB_SPACINGS, RB_TEMPLATES, RB_TYPES, RB_USES, RB_WIDTHS,
  RibbonSvg, defaultRBData, rbColor, rbFoil, rbInk, rbLowContrast, rbPrintColors, rbType, rbUnitLength, useRBFonts,
  type RBData, type RBSpec, type RBWidth,
} from '@/lib/ribbon-engine';
import { logoToMask, type TPLogo } from '@/lib/tape-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: RBSpec = { ...RB_TEMPLATES[0].spec, width: 25, spacing: 'normal' };
const TABLE_BG = 'linear-gradient(135deg,#F3EEE7 0%,#E6DED3 100%)';

export default function RibbonPage() {
  const ready = useRBFonts();
  const [spec, setSpec] = useState<RBSpec>(FIRST);
  const [data, setData] = useState<RBData>(defaultRBData());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [invert, setInvert] = useState(false);
  const [logo, setLogo] = useState<TPLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const unitRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    logoToMask(logoSrc, thr, invert).then((l) => { if (on) setLogo(l); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc, thr, invert]);

  const set = (p: Partial<RBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof RB_TEMPLATES)[number]) => {
    set(t.spec);
    if (!dirty) setData({ ...defaultRBData(), ...t.data });
  };
  const setInkCount = (n: number) => setSpec((s) => {
    const inks = s.inks.slice(0, n);
    for (const i of RB_INKS) { if (inks.length >= n) break; if (!inks.includes(i.id) && !rbLowContrast(i.hex, rbColor(s.color).hex)) inks.push(i.id); }
    return { ...s, inks };
  });
  const setInk = (slot: number, id: string) => setSpec((s) => { const inks = [...s.inks]; inks[slot] = id; return { ...s, inks }; });

  const col = rbColor(spec.color), type = rbType(spec.type);
  const pc = rbPrintColors(spec);
  const L = ready ? rbUnitLength(spec, data, logo) : 100;
  const slug = slugify(`ruy-bang-${data.brand || data.names || ''}`, 'ruy-bang');
  const M = RB_MARK_MM;
  const printW = Math.max(L + M * 2, 150);
  const nInk = spec.print === 'foil' ? 1 : Math.min(2, Math.max(1, spec.inks.length));
  const usedInks = spec.inks.slice(0, nInk);
  const warn = spec.print === 'foil'
    ? (rbLowContrast(rbFoil(spec.foil).hex, col.hex) ? [rbFoil(spec.foil).name] : [])
    : usedInks.filter((i) => rbLowContrast(rbInk(i).hex, col.hex)).map((i) => `mực ${rbInk(i).name.toLowerCase()}`);
  const uses = RB_USES[spec.layout] || ['brand'];

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(stripRef); if (!el) return;
    downloadBlob(await svgToPng(el, RB_FONT_CSS, 2400), `${slug}-${spec.width}mm-xem-truoc.png`);
  });
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    return svgToSizedPdf(el, RB_FONT_CSS, printW, spec.width + M * 2, 600);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${spec.width}mm-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, RB_FONT_CSS), `${slug}-${spec.width}mm-file-in.svg`);
  });
  const snapJpeg = async () => {
    const c = await view3d.current!.snapshot(1200, 900);
    return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  };
  const download3d = () => run('3d', async () => {
    const c = await view3d.current!.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('lỗi ảnh'))), 'image/png')), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(svgOf(stripRef)!, RB_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-${spec.width}mm-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/ribbon-3d').then((m) => m.ribbonBuilder({
    inkEl: svgOf(inkRef), maskEl: svgOf(maskRef), fontCss: RB_FONT_CSS, wMm: spec.width, lMm: L,
    type: spec.type, baseHex: col.hex, foilHex: spec.print === 'foil' ? rbFoil(spec.foil).hex : null,
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn ở góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __rbSnap?: (w: number, h: number) => Promise<string> }).__rbSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setLogoSrc(String(fr.result));
    fr.readAsDataURL(f);
  };

  const printName = spec.print === 'foil' ? rbFoil(spec.foil).name.toLowerCase() : `${nInk} màu mực`;
  const orderTitle = `Ruy băng ${type.name.toLowerCase()} ${spec.width}mm · ${col.name.toLowerCase()} · in ${printName}`;
  const material = spec.type === 'grosgrain' ? 'Ruy băng grosgrain in màu' : 'Ruy băng satin in nhũ (cuộn 50m)';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ruy băng in logo" sub="Ruy băng satin, grosgrain, organza, vải bố in tên shop, lời cảm ơn, tên cô dâu chú rể — ép nhũ vàng/bạc/hồng hoặc in 1–2 màu. Xem hộp quà buộc nơ 3D, tải file in đoạn lặp đúng khổ cho xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${RB_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {RB_TEMPLATES.map((t) => {
                  const ts: RBSpec = { ...spec, ...t.spec };
                  const on = (['layout', 'type', 'color', 'print', 'foil', 'font'] as const).every((k) => spec[k] === t.spec[k]) && spec.inks.join() === t.spec.inks.join();
                  const td = dirty ? data : { ...defaultRBData(), ...t.data };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="rb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden px-2 py-4" style={{ background: TABLE_BG }}>
                        <div className="shadow-[0_2px_5px_rgba(0,0,0,0.18)]">
                          <RibbonSvg spec={{ ...ts, width: 20 }} data={td} logo={logo} mode="strip" repeats={2} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung in">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-layouts">
                    {RB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                {RB_FIELDS.filter((f) => uses.includes(f.key)).map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} maxLength={48} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`rb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn) — tự chuyển thành hình 1 màu để in nhũ / in mực</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-mv-hair grid place-items-center overflow-hidden bg-white">
                      {logo ? <img src={logo.href} alt="" className="max-w-full max-h-full" style={{ filter: 'invert(1)' }} /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo lên'}</button>
                      {logoSrc && <button type="button" onClick={() => setLogoSrc('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="rb-logo" />
                  </div>
                  {logoSrc && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <label className="flex items-center gap-2">Độ đậm <input type="range" min={40} max={235} value={thr} onChange={(e) => setThr(+e.target.value)} /></label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} /> Logo sáng trên nền tối</label>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, chất liệu, màu & kiểu in">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bản rộng ruy băng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-widths">
                    {RB_WIDTHS.map((w) => <button key={w} type="button" onClick={() => set({ width: w as RBWidth })} className={chip(spec.width === w)}>{w}mm{w === 25 ? ' (phổ biến)' : ''}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-types">
                    {RB_TYPES.map((t) => <button key={t.id} type="button" onClick={() => set({ type: t.id })} className={chip(spec.type === t.id)} title={t.note}>{t.name}</button>)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{type.note}</div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu ruy băng · {col.name}</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="rb-colors">
                    {RB_COLORS.map((c) => (
                      <button key={c.id} type="button" title={c.name} onClick={() => set({ color: c.id })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${spec.color === c.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: c.hex }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu in</div>
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="rb-print">
                    {RB_FOILS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ print: 'foil', foil: f.id })} className={`flex items-center gap-1.5 ${chip(spec.print === 'foil' && spec.foil === f.id)}`}>
                        <span className="w-4 h-4 rounded-full border border-mv-hair" style={{ background: `linear-gradient(135deg,${f.hex},#fff8,${f.hex})` }} />{f.name}
                      </button>
                    ))}
                    {[1, 2].map((n) => <button key={n} type="button" onClick={() => { set({ print: 'ink' }); setInkCount(n); }} className={chip(spec.print === 'ink' && nInk === n)} data-testid={`rb-ink${n}`}>{n} màu mực</button>)}
                  </div>
                  {spec.print === 'ink' && (
                    <div className="space-y-2" data-testid="rb-inks">
                      {usedInks.map((id, slot) => (
                        <div key={slot} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 w-14">Màu {slot + 1}</span>
                          {RB_INKS.map((i) => (
                            <button key={i.id} type="button" title={i.name} onClick={() => setInk(slot, i.id)}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${id === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {warn.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500" data-testid="rb-warn"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {warn.join(', ')} gần màu ruy băng {col.name.toLowerCase()} — in ra sẽ khó đọc.</div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khoảng cách lặp</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="rb-spacings">
                      {RB_SPACINGS.map((s) => <button key={s.id} type="button" onClick={() => set({ spacing: s.id })} className={chip(spec.spacing === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên shop</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="rb-fonts">
                      {RB_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length, thr, invert])} refitKey={`${spec.width}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="rb-flat">
              <div className="rounded-lg p-4 overflow-hidden" style={{ background: TABLE_BG }}>
                <div className="shadow-[0_3px_8px_rgba(0,0,0,0.2)]">
                  <RibbonSvg spec={spec} data={data} logo={logo} mode="strip" repeats={3} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">File in · 1 đoạn lặp {L}mm (vạch đen = điểm lặp)</div>
                <div className="rounded-lg bg-white p-1 overflow-hidden" data-testid="rb-print-preview">
                  <RibbonSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="rb-summary">{type.name} {spec.width}mm · {col.name.toLowerCase()} · in {printName} · lặp mỗi {L}mm</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="rb-3d" title="Ảnh hộp quà + cuộn ruy băng 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-png" title="Ảnh dải ruy băng dài">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="rb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="rb-svg" title="File vector, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="ribbon" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in là 1 đoạn lặp đúng bản rộng thật, chữ đã outline, đánh dấu điểm lặp — xưởng in nhũ/in lụa liên tục cả cuộn. Ruy băng in logo thường đặt theo cuộn 50m (khoảng {Math.round(50000 / L)} lần lặp/cuộn).</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1600, pointerEvents: 'none' }}>
          <div ref={unitRef} data-testid="rb-unit"><RibbonSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={inkRef}><RibbonSvg spec={spec} data={data} logo={logo} mode="ink" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={maskRef}><RibbonSvg spec={spec} data={data} logo={logo} mode="mask" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={stripRef}><RibbonSvg spec={spec} data={data} logo={logo} mode="strip" repeats={4} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="rb-print"><RibbonSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
