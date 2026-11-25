'use client';
// Ly giấy / ly nhựa in logo: chọn mẫu → điền tên quán, slogan, hotline (+ logo) → xem ly thành phẩm 3D
// → tải KHUÔN QUẠT in chuẩn (tính đúng từ Ø miệng, Ø đáy, chiều cao; lề xén + đường cắt + mép dán) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  CUP_BLEED_MM, CUP_FIELDS, CUP_FONTS, CUP_FONT_CSS, CUP_PALETTES, CUP_SAMPLES, CUP_TEMPLATES, CupArtSvg, CupDielineSvg,
  cupGeom, cupInks, cupPalette, cupSize, defaultCupData, dieLayout, sizesOfKind, useCupFonts, warpArtToSector,
  type CupData, type CupKind, type CupSpec, type CupTemplate,
} from '@/lib/cup-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { scaleImage, slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: CupSpec = { ...CUP_TEMPLATES[0].spec, size: 'p12', colors: 2, lid: 'dome' };
const PRINT_PPM = 300 / 25.4;
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.88) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

export default function CupPage() {
  const ready = useCupFonts();
  const [spec, setSpec] = useState<CupSpec>(FIRST);
  const [data, setData] = useState<CupData>(defaultCupData('cafe'));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [die, setDie] = useState<{ key: string; href: string }>({ key: '', href: '' });
  const artRef = useRef<HTMLDivElement | null>(null);
  const bleedRef = useRef<HTMLDivElement | null>(null);
  const dieRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sz = cupSize(spec.size);
  const kind = sz.kind;
  const geom = cupGeom(sz);
  const pal = cupPalette(spec.palette);
  const ik = cupInks(pal, kind, spec.colors);
  const set = (p: Partial<CupSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: CupTemplate) => { set(t.spec); if (!dirty) setData(defaultCupData(t.spec.industry)); };
  const setKind = (k: CupKind) => { if (k !== kind) set({ size: k === 'paper' ? 'p12' : 't500' }); };
  const slug = slugify(`ly-${data.brand || ''}`, 'ly-in-logo');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const designKey = JSON.stringify([spec, data, logo]);

  // ảnh thiết kế (có lề xén) → canvas → uốn thành hình quạt
  const warp = async (ppm: number) => {
    const el = svgOf(bleedRef); if (!el) throw new Error('Chưa dựng xong thiết kế');
    const vb = el.viewBox.baseVal;
    const art = await svgToCanvas(await selfContainedSvg(el, CUP_FONT_CSS), Math.round(vb.width * ppm), Math.round(vb.height * ppm));
    return warpArtToSector(art, geom, ppm);
  };
  useEffect(() => {
    if (!ready) return;
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const c = await warp(3.2);
        if (!dead) setDie({ key: designKey, href: c.toDataURL('image/jpeg', 0.9) });
      } catch { /* thử lại ở lần đổi sau */ }
    }, 300);
    return () => { dead = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designKey, ready]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // khuôn quạt bản in: thay ảnh xem trước bằng ảnh 300dpi rồi xuất
  const withPrintDie = async <T,>(fn: (el: SVGSVGElement) => Promise<T>): Promise<T> => {
    const src = svgOf(dieRef); if (!src) throw new Error('Chưa dựng xong khuôn');
    const hi = (await warp(PRINT_PPM)).toDataURL('image/jpeg', 0.95);
    const clone = src.cloneNode(true) as SVGSVGElement;
    clone.querySelector('#In image')?.setAttribute('href', hi);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', left: '-100000px', top: '0', width: '800px' });
    host.appendChild(clone); document.body.appendChild(host);
    try { return await fn(clone); } finally { host.remove(); }
  };
  const L = dieLayout(geom);
  const makePdf = () => withPrintDie((el) => svgToSizedPdf(el, CUP_FONT_CSS, L.wMm, L.hMm, 300));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(artRef); if (!el) return;
    downloadBlob(await svgToPng(el, CUP_FONT_CSS, 2400), `${slug}-${sz.id}-thiet-ke-trai-phang.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${sz.id}-khuon-quat-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => downloadBlob(await withPrintDie((el) => svgFileBlob(el, CUP_FONT_CSS)), `${slug}-${sz.id}-khuon-quat.svg`));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) { setTab('3d'); throw new Error('Mở tab Thành phẩm 3D rồi bấm lại nhé'); }
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-${sz.id}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await makePdf();
    const pv = svgOf(artRef);
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c))
      : await svgToCanvas(await selfContainedSvg(pv!, CUP_FONT_CSS), 1200, 480, '#FFFFFF').then((c) => toBlob(c));
    return { file, fileName: `${slug}-${sz.id}-khuon-quat-file-in.pdf`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setLogo(await scaleImage(f, 900));
  };

  // hook cho QC (Playwright / soi ảnh 3D lớn) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __cupSnap?: (w: number, h: number) => Promise<string> }).__cupSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); };
  const build3d = () => import('@/lib/cup-3d').then((m) => m.cupBuilder({
    art: svgOf(artRef), kind, size: sz, lid: spec.lid, bg: ik.bg, industry: spec.industry,
    straw: kind === 'pet' ? (spec.colors === 2 ? pal.pet2 : pal.pet1) : '#FFFFFF', fontCss: CUP_FONT_CSS, inks: ik.spots,
  }));
  const orderTitle = `${sz.name} · ${CUP_TEMPLATES.find((t) => t.spec.layout === spec.layout && t.spec.palette === spec.palette)?.name || 'thiết kế riêng'}${kind === 'pet' ? ` · in ${spec.colors} màu` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const thumbBg = kind === 'pet' ? 'repeating-conic-gradient(#EEF1F4 0% 25%, #F8F9FB 0% 50%) 50% / 12px 12px' : undefined;
  const dieReady = die.key === designKey && !!die.href;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Ly in logo" sub="Ly giấy cà phê, ly nhựa trà sữa in tên quán — xem ly thành phẩm 3D, tải khuôn quạt in chuẩn (tính đúng theo Ø miệng, Ø đáy, chiều cao), hoặc đặt Mivy in." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        <button type="button" className="mv-seg-btn" data-active={kind === 'paper'} onClick={() => setKind('paper')} data-testid="cup-kind-paper">Ly giấy (nóng)</button>
        <button type="button" className="mv-seg-btn" data-active={kind === 'pet'} onClick={() => setKind('pet')} data-testid="cup-kind-pet">Ly nhựa PET (lạnh)</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${CUP_TEMPLATES.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {CUP_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.motif === t.spec.motif;
                  const tSpec: CupSpec = { ...spec, ...t.spec };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="cup-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: `${geom.W} / ${geom.H}`, background: thumbBg }}>
                        <CupArtSvg spec={tSpec} data={dirty ? data : CUP_SAMPLES[t.spec.industry]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung & logo">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full border border-mv-hair overflow-hidden grid place-items-center bg-white shrink-0">
                    {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="mv-btn mv-btn-ghost !text-xs !py-2" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Thêm logo quán (tuỳ chọn)'}
                    </button>
                    {logo && <button type="button" className="mv-btn mv-btn-ghost !text-xs !py-2" onClick={() => setLogo('')}><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="cup-logo" />
                </div>
                <p className="text-[11px] text-slate-500 -mt-1">Không có logo thì Mivy tự làm huy hiệu chữ viết tắt từ tên quán. Ảnh xử lý ngay trên máy anh/chị, không gửi đi đâu.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CUP_FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`cup-${f.key}`} />
                    </label>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & quy cách ly">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="cup-palettes">
                    {CUP_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: kind === 'pet' ? `linear-gradient(135deg, ${pl.pet1} 50%, ${pl.pet2} 50%)` : `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="cup-fonts">
                    {CUP_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {(data.brand || 'An Khang').split(' ').slice(0, 2).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Dung tích</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cup-sizes">
                    {sizesOfKind(kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                {kind === 'pet' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="mv-label mb-1.5">Số màu in (màu pha)</div>
                      <div className="flex gap-1.5" data-testid="cup-colors">
                        {([1, 2] as const).map((n) => <button key={n} type="button" onClick={() => set({ colors: n })} className={chip(spec.colors === n)}>{n} màu{n === 1 ? ' (rẻ nhất)' : ''}</button>)}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Nắp</div>
                      <div className="flex gap-1.5" data-testid="cup-lids">
                        {(['dome', 'flat'] as const).map((l) => <button key={l} type="button" onClick={() => set({ lid: l })} className={chip(spec.lid === l)}>{l === 'dome' ? 'Nắp cầu' : 'Nắp bằng'}</button>)}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {kind === 'paper'
                    ? 'Ly giấy tráng PE in offset 4 màu, nền tràn quanh ly. Phần trên ~8mm bị cuộn miệng + nắp che, dưới ~10mm gấp đáy — chữ đã tự né.'
                    : 'Ly nhựa PET in lụa trực tiếp lên ly, không in nền (trong suốt). 1–2 màu pha là đẹp và kinh tế nhất cho đơn nhỏ.'}
                </p>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={designKey} refitKey={`${kind}|${spec.size}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Thiết kế trải phẳng (quanh thân ly)</div>
                <div ref={artRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${geom.W} / ${geom.H}`, background: thumbBg }} data-testid="cup-art">
                  <CupArtSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">File in · khuôn quạt (đường cắt, mép dán, lề xén {CUP_BLEED_MM}mm)</div>
                <div ref={dieRef} className="rounded-lg overflow-hidden border border-mv-hair bg-white" data-testid="cup-die" data-ready={dieReady ? '1' : '0'}>
                  <CupDielineSvg spec={spec} artHref={die.href} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="cup-info">
              Ø{sz.dt}/{sz.db} × {sz.h}mm · khuôn quạt R {geom.R.toFixed(1)} / r {geom.r.toFixed(1)}mm · {kind === 'paper' ? 'in 4 màu' : `in ${spec.colors} màu pha`}
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cup-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cup-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cup-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cup-svg" title="Khuôn quạt vector: đường cắt CutContour + ảnh in 300dpi, chữ chú thích đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="cup" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Khuôn quạt là hình thân ly trải phẳng — xưởng in xong bế theo đường cắt rồi cuốn thành ly. Chữ in thẳng hàng trên ly nhờ ảnh đã được uốn đúng độ côn.</p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) → nguồn để uốn khuôn quạt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={bleedRef}><CupArtSvg spec={spec} data={data} logo={logo} bleed style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
