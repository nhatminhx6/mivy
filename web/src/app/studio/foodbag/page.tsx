'use client';
// Túi giấy đựng đồ ăn: chọn loại túi (SOS đáy vuông / bánh mì chống dầu / cửa sổ / quai dẹt) → mẫu → tên quán, hotline, logo →
// giấy kraft nâu/trắng/đen/chống dầu + 1–2 màu mực flexo → xem túi 3D → tải khuôn trải phẳng đúng khổ / gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  FBG_FIELDS, FBG_FONTS, FBG_FONT_CSS, FBG_INKS, FBG_KINDS, FBG_LAYOUTS, FBG_MARGIN, FBG_PAPERS, FBG_TEMPLATES,
  FoodBagSvg, defaultFBGData, fbgDie, fbgInk, fbgLayout, fbgLowContrast, fbgPaper, fbgSize, fbgSizesOf, logoToMask, sampleFBGData, useFBGFonts,
  type FBGData, type FBGKind, type FBGLogo, type FBGSpec,
} from '@/lib/foodbag-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const DEF_SIZE: Record<FBGKind, string> = { sos: 's18', banhmi: 'b12', window: 'w15', handle: 'h22' };
const FIRST: FBGSpec = { ...FBG_TEMPLATES[0].spec, size: DEF_SIZE[FBG_TEMPLATES[0].spec.kind] };
const SCENE_BG = 'linear-gradient(135deg,#EEEAE3 0%,#DED7CC 100%)';

export default function FoodBagPage() {
  const ready = useFBGFonts();
  const [spec, setSpec] = useState<FBGSpec>(FIRST);
  const [data, setData] = useState<FBGData>(defaultFBGData());
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [invert, setInvert] = useState(false);
  const [logo, setLogo] = useState<FBGLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const texFRef = useRef<HTMLDivElement | null>(null);
  const texBRef = useRef<HTMLDivElement | null>(null);
  const texGRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    logoToMask(logoSrc, thr, invert).then((l) => { if (on) setLogo(l); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc, thr, invert]);

  const lay = fbgLayout(spec.layout);
  const nInk = Math.min(spec.inks.length, lay.inks);
  const usedInks = spec.inks.slice(0, nInk);
  const sz = fbgSize(spec.size);
  const paper = fbgPaper(spec.paper);
  const die = fbgDie(sz);
  const set = (p: Partial<FBGSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setEdited(true); setData((d) => ({ ...d, [key]: v })); };
  const setKind = (k: FBGKind) => setSpec((s) => (s.kind === k ? s : { ...s, kind: k, size: DEF_SIZE[k], paper: k === 'banhmi' && s.paper === 'black' ? 'grease' : s.paper }));
  const pickTemplate = (t: (typeof FBG_TEMPLATES)[number]) => {
    setSpec((s) => ({ ...s, ...t.spec, size: s.kind === t.spec.kind ? s.size : DEF_SIZE[t.spec.kind] }));
    if (!edited) setData(sampleFBGData(t.spec.layout, t.data)); // khách chưa sửa chữ → nạp chữ mẫu đúng món
  };
  const setInkCount = (n: number) => setSpec((s) => {
    const inks = s.inks.slice(0, n);
    for (const i of FBG_INKS) { if (inks.length >= n) break; if (!inks.includes(i.id) && !fbgLowContrast(i.id, s.paper)) inks.push(i.id); }
    return { ...s, inks };
  });
  const setInk = (slot: number, id: string) => setSpec((s) => { const inks = [...s.inks]; inks[slot] = id; return { ...s, inks }; });
  const slug = slugify(`tui-giay-${data.brand || ''}`, 'tui-giay');
  const M = FBG_MARGIN;
  const pageW = die.SW + M * 2, pageH = die.SH + M * 2;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  // PDF khuôn trải phẳng đúng khổ thật, chữ outline; tờ lớn thì hạ dpi cho nhẹ
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    const dpi = Math.max(120, Math.min(200, Math.floor((9000 / Math.max(pageW, pageH)) * 25.4)));
    const outW = Math.round((pageW / 25.4) * dpi), outH = Math.round((pageH / 25.4) * dpi);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: pageW > pageH ? 'landscape' : 'portrait', compress: true });
    const c = await svgToCanvas(await selfContainedSvg(el, FBG_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    return pdf.output('blob');
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-khuon-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, FBG_FONT_CSS), `${slug}-${sz.id}-khuon-in.svg`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(faceRef); if (!el) return;
    downloadBlob(await svgToPng(el, FBG_FONT_CSS, 1600), `${slug}-mat-truoc.png`);
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
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(svgOf(faceRef)!, FBG_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-${sz.id}-khuon-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/foodbag-3d').then((m) => m.foodBagBuilder({
    spec, data, fontCss: FBG_FONT_CSS, front: svgOf(texFRef), back: svgOf(texBRef), gusset: svgOf(texGRef),
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn ở góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __fbgSnap?: (w: number, h: number, view?: { az: number; el: number }) => Promise<string> }).__fbgSnap = async (w, h, view) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h, { view })).toDataURL('image/png'); };

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setLogoSrc(String(fr.result));
    fr.readAsDataURL(f);
  };

  const warn = usedInks.filter((i) => fbgLowContrast(i, spec.paper));
  const kindName = FBG_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${sz.name} · giấy ${paper.name.toLowerCase()} · ${nInk} màu mực`;
  const material = spec.kind === 'banhmi' ? 'Túi giấy bánh mì chống dầu' : spec.kind === 'window' ? 'Túi giấy có cửa sổ' : 'Túi giấy kraft đáy vuông (SOS)';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Túi giấy đựng đồ ăn" sub="Túi kraft đáy vuông mang đi, túi bánh mì chống dầu, túi có cửa sổ cho tiệm bánh – hạt, túi quai dẹt — in flexo 1–2 màu tên quán, hotline. Xem túi 3D, tải khuôn trải phẳng đúng khổ (răng cưa miệng, nếp hông, nếp đáy, mép dán)." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {FBG_KINDS.map((k) => <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`fbg-kind-${k.id}`}>{k.name}</button>)}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${FBG_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {FBG_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.paper === t.spec.paper && spec.font === t.spec.font && spec.inks.join() === t.spec.inks.join() && spec.kind === t.spec.kind && spec.pattern === t.spec.pattern;
                  const ts: FBGSpec = { ...spec, ...t.spec, size: DEF_SIZE[t.spec.kind] };
                  const td = edited ? data : sampleFBGData(t.spec.layout, t.data);
                  const s = fbgSize(ts.size);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="fbg-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden p-3" style={{ background: SCENE_BG }}>
                        <div className="mx-auto" style={{ aspectRatio: `${s.w} / ${s.h * (s.kind === 'handle' ? 1.3 : 1)}`, maxHeight: 190, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>
                          <FoodBagSvg spec={ts} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
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
                {FBG_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fbg-${f.key}`} />
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
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="fbg-logo" />
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

            <CollapsibleSection title="3 · Khổ túi, giấy & mực">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ túi ({FBG_KINDS.find((k) => k.id === spec.kind)!.sub})</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fbg-sizes">
                    {fbgSizesOf(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Giấy</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fbg-papers">
                    {FBG_PAPERS.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ paper: p.id })} className={`flex items-center gap-2 ${chip(spec.paper === p.id)}`}>
                        <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: p.hex }} />{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Số màu mực (in flexo — túi giấy thường in 1–2 màu)</div>
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="fbg-inkcount">
                    {[1, 2].map((n) => <button key={n} type="button" disabled={n > lay.inks} onClick={() => setInkCount(n)} className={`${chip(nInk === n)} disabled:opacity-35 disabled:cursor-not-allowed`}>{n} màu</button>)}
                  </div>
                  <div className="space-y-2" data-testid="fbg-inks">
                    {usedInks.map((id, slot) => (
                      <div key={slot} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 w-14">Màu {slot + 1}</span>
                        {FBG_INKS.map((i) => (
                          <button key={i.id} type="button" title={i.name} onClick={() => setInk(slot, i.id)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${id === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  {warn.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> Mực {warn.map((i) => fbgInk(i).name.toLowerCase()).join(', ')} gần màu giấy {paper.name.toLowerCase()} — in ra sẽ khó đọc.</div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="fbg-layouts">
                      {FBG_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên quán</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="fbg-fonts">
                      {FBG_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer" data-testid="fbg-pattern">
                  <input type="checkbox" checked={spec.pattern} onChange={(e) => set({ pattern: e.target.checked })} />
                  Hoạ tiết món ăn lặp ở mặt sau &amp; hông túi
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo?.href.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`${tab === '3d' ? 'hidden' : ''}`} data-testid="fbg-flat">
              <div className="grid grid-cols-2 gap-3 rounded-lg p-4" style={{ background: SCENE_BG }}>
                <div>
                  <div className="text-[11px] text-slate-600 mb-1 text-center">Mặt trước</div>
                  <div ref={faceRef} style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} data-testid="fbg-face">
                    <FoodBagSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-600 mb-1 text-center">Mặt sau</div>
                  <div style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} data-testid="fbg-face-back">
                    <FoodBagSvg spec={spec} data={data} logo={logo} mode="tex" part="back" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[11px] text-slate-400 mb-1">Khuôn trải phẳng · {Math.round(die.SW)}×{Math.round(die.SH)}mm (hồng = cắt, xanh lá = gấp, xám chấm = mép dán)</div>
                <div className="rounded-lg bg-white p-1 overflow-hidden" data-testid="fbg-print-preview">
                  <FoodBagSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kindName} {sz.name} · giấy {paper.name.toLowerCase()} · {nInk} màu mực: {usedInks.map((i) => fbgInk(i).name).join(', ')}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="fbg-3d" title="Ảnh túi 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fbg-png" title="Ảnh mặt trước">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="fbg-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fbg-svg" title="Khuôn vector, chữ đã outline — xưởng làm bản flexo + khuôn">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="foodbag" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Khuôn trải phẳng đúng khổ, chữ đã outline, lề xén 3mm: mặt trước – sau – hông – mép dán, nếp đáy{sz.kind === 'window' ? ', cửa sổ dán màng PLA' : ''}{sz.kind === 'handle' ? ', vị trí dán quai' : ''}. Giấy không in (chỉ in mực). Túi giấy in logo thường đặt từ 500–1.000 cái.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D + khuôn in */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1200, pointerEvents: 'none' }}>
          <div ref={texFRef} data-testid="fbg-tex-front"><FoodBagSvg spec={spec} data={data} logo={logo} mode="tex" part="front" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBRef} data-testid="fbg-tex-back"><FoodBagSvg spec={spec} data={data} logo={logo} mode="tex" part="back" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texGRef} data-testid="fbg-tex-gusset" style={{ width: 400 }}><FoodBagSvg spec={spec} data={data} logo={logo} mode="tex" part="gusset" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="fbg-print"><FoodBagSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
