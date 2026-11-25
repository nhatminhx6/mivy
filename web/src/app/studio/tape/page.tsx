'use client';
// Băng keo in logo: chọn mẫu → điền tên shop/hotline → chọn khổ, nền băng keo, số màu mực (flexo 1–3 màu) →
// xem thùng hàng dán băng keo 3D → tải file in đoạn lặp (vạch lặp, đúng khổ) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  TP_BASES, TP_FIELDS, TP_FONTS, TP_FONT_CSS, TP_INKS, TP_LAYOUTS, TP_MARK_MM, TP_REPEATS, TP_TEMPLATES, TP_WIDTHS,
  TapeSvg, defaultTPData, logoToMask, lowContrast, tpBase, tpInk, tpLayout, useTPFonts,
  type TPData, type TPLogo, type TPSpec, type TPWidth,
} from '@/lib/tape-engine';
import { svgFileBlob, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TPSpec = { ...TP_TEMPLATES[0].spec, width: 48, rep: 300 };
const KRAFT_BG = 'linear-gradient(135deg,#C9A06F 0%,#B98C5C 55%,#AE8152 100%)';

export default function TapePage() {
  const ready = useTPFonts();
  const [spec, setSpec] = useState<TPSpec>(FIRST);
  const [data, setData] = useState<TPData>(defaultTPData());
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [invert, setInvert] = useState(false);
  const [logo, setLogo] = useState<TPLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const unitRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  // logo → bóng 1 màu (tính lại khi đổi ngưỡng)
  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    logoToMask(logoSrc, thr, invert).then((l) => { if (on) setLogo(l); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc, thr, invert]);

  const lay = tpLayout(spec.layout);
  const nInk = Math.min(spec.inks.length, lay.inks);
  const usedInks = spec.inks.slice(0, nInk);
  const base = tpBase(spec.base);
  const set = (p: Partial<TPSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const setInkCount = (n: number) => setSpec((s) => {
    const inks = s.inks.slice(0, n);
    for (const i of TP_INKS) { if (inks.length >= n) break; if (!inks.includes(i.id) && !lowContrast(i.id, s.base)) inks.push(i.id); }
    return { ...s, inks };
  });
  const setInk = (slot: number, id: string) => setSpec((s) => { const inks = [...s.inks]; inks[slot] = id; return { ...s, inks }; });
  const slug = slugify(`bang-keo-${data.brand || ''}`, 'bang-keo');
  const M = TP_MARK_MM;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(unitRef); if (!el) return;
    downloadBlob(await svgToPng(el, TP_FONT_CSS, 2400), `${slug}-${spec.width}mm-doan-lap.png`);
  });
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    return svgToSizedPdf(el, TP_FONT_CSS, spec.rep + M * 2, spec.width + M * 2, 400);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${spec.width}mm-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, TP_FONT_CSS), `${slug}-${spec.width}mm-file-in.svg`);
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
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(svgOf(unitRef)!, TP_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-${spec.width}mm-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/tape-3d').then((m) => m.tapeBuilder({
    el: svgOf(unitRef), fontCss: TP_FONT_CSS, wMm: spec.width, repMm: spec.rep, base: spec.base, baseHex: base.hex,
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn để soi) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __tapeSnap?: (w: number, h: number) => Promise<string> }).__tapeSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); }; // góc mặc định

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setLogoSrc(String(fr.result));
    fr.readAsDataURL(f);
  };

  const warn = usedInks.filter((i) => lowContrast(i, spec.base));
  const orderTitle = `Băng keo in logo ${spec.width}mm · nền ${base.name.toLowerCase()} · ${nInk} màu`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tapeBg = (b: string) => (tpBase(b).hex ? undefined : KRAFT_BG);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Băng keo in logo" sub="Băng keo đóng hàng in tên shop, hotline, lời cảm ơn — in flexo 1–3 màu trên nền trong, trắng, kraft, vàng, đen. Xem thùng hàng dán thử 3D, tải file in đoạn lặp chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TP_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {TP_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.base === t.spec.base && spec.font === t.spec.font && spec.inks.join() === t.spec.inks.join();
                  const ts: TPSpec = { ...spec, ...t.spec };
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="tp-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden px-2 py-3" style={{ background: 'linear-gradient(135deg,#CFA678,#B98C5C)' }}>
                        <div className="shadow-[0_2px_6px_rgba(0,0,0,0.25)]" style={{ aspectRatio: `${ts.rep} / ${ts.width}` }}>
                          <TapeSvg spec={ts} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
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
                {TP_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tp-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn) — tự chuyển thành hình 1 màu để in flexo</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-mv-hair grid place-items-center overflow-hidden bg-white">
                      {logo ? <img src={logo.href} alt="" className="max-w-full max-h-full" style={{ filter: 'invert(1)' }} /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2"><ImagePlus className="w-3.5 h-3.5" /> {logoSrc ? 'Đổi logo' : 'Tải logo lên'}</button>
                      {logoSrc && <button type="button" onClick={() => setLogoSrc('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="tp-logo" />
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

            <CollapsibleSection title="3 · Khổ, nền & màu mực">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ băng keo</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tp-widths">
                    {TP_WIDTHS.map((w) => <button key={w} type="button" onClick={() => set({ width: w as TPWidth })} className={chip(spec.width === w)}>{w}mm{w === 48 ? ' (phổ biến)' : ''}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Nền băng keo</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tp-bases">
                    {TP_BASES.map((b) => (
                      <button key={b.id} type="button" onClick={() => set({ base: b.id })} className={`flex items-center gap-2 ${chip(spec.base === b.id)}`}>
                        <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: b.hex ?? 'repeating-linear-gradient(45deg,#fff 0 3px,#e5e7eb 3px 6px)' }} />{b.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Số màu mực (in flexo — càng ít màu càng rẻ)</div>
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="tp-inkcount">
                    {[1, 2, 3].map((n) => <button key={n} type="button" disabled={n > lay.inks} onClick={() => setInkCount(n)} className={`${chip(nInk === n)} disabled:opacity-35 disabled:cursor-not-allowed`}>{n} màu</button>)}
                    {lay.inks < 3 && <span className="text-[11px] text-slate-500 self-center">Mẫu “{lay.name}” dùng tối đa {lay.inks} màu</span>}
                  </div>
                  <div className="space-y-2" data-testid="tp-inks">
                    {usedInks.map((id, slot) => (
                      <div key={slot} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 w-14">Màu {slot + 1}</span>
                        {TP_INKS.map((i) => (
                          <button key={i.id} type="button" title={i.name} onClick={() => setInk(slot, i.id)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${id === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  {warn.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> Mực {warn.map((i) => tpInk(i).name.toLowerCase()).join(', ')} gần màu nền {base.name.toLowerCase()} — in ra sẽ khó đọc.</div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Độ dài 1 đoạn lặp</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tp-repeats">
                      {TP_REPEATS.map((r) => <button key={r} type="button" onClick={() => set({ rep: r })} className={chip(spec.rep === r)}>{r / 10}cm</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên shop</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tp-fonts">
                      {TP_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length, thr, invert])} refitKey={`${spec.width}|${spec.rep}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="tp-flat">
              <div className="rounded-lg p-4 overflow-hidden" style={{ background: KRAFT_BG }}>
                <div className="relative overflow-hidden shadow-[0_3px_8px_rgba(0,0,0,0.28)]" style={{ aspectRatio: `${spec.rep * 1.6} / ${spec.width}` }}>
                  <TapeSvg spec={spec} data={data} logo={logo} mode="strip" repeats={2} style={{ width: '125%', height: 'auto', display: 'block' }} />
                  {!base.hex && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.06) 45%,rgba(255,255,255,0.18))' }} />}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">File in · 1 đoạn lặp {spec.rep / 10}cm (vạch đen = điểm lặp)</div>
                <div className="rounded-lg bg-white p-1 overflow-hidden" data-testid="tp-print-preview">
                  <TapeSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Khổ {spec.width}mm · nền {base.name.toLowerCase()} · {nInk} màu mực: {usedInks.map((i) => tpInk(i).name).join(', ')}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="tp-3d" title="Ảnh thùng hàng 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tp-png" title="Ảnh 1 đoạn lặp">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tp-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tp-svg" title="File vector, chữ đã outline — xưởng làm bản flexo">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="tape" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in là 1 đoạn lặp đúng khổ thật, chữ đã outline, đánh dấu điểm lặp — xưởng làm khuôn flexo in liên tục cả cuộn. Băng keo in logo thường đặt từ 20–50 cuộn.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: đoạn lặp (ảnh + texture 3D) và file in */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1200, pointerEvents: 'none' }}>
          <div ref={unitRef} data-testid="tp-unit"><TapeSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="tp-print"><TapeSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
