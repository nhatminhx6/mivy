'use client';
// Bộ bàn ăn F&B: chọn phong cách quán → điền thông tin (1 lần) → ra đồng bộ 3 món: GIẤY LÓT KHAY · BAO ĐŨA · KHĂN GIẤY.
// Xem thành phẩm 3D (khay gỗ + tô món + khăn + đũa trong bao) → tải PDF in từng món (lề xén, vạch cắt / khuôn bế) hoặc gửi in.

import { useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  NAPKIN, SLEEVE, SLEEVE_FLAT, TW_BLEED_MM, TW_FIELDS, TW_FONTS, TW_FONT_CSS, TW_LINER_SIZES, TW_PALETTES, TW_SAMPLES, TW_STYLES, TW_TEMPLATES,
  LinerSvg, NapkinFaceSvg, NapkinPrintSvg, SleeveDielineSvg, SleeveFace, defaultTWData, twLinerSize, twPalette, twStyle, useTWFonts,
  type TWData, type TWSpec,
} from '@/lib/tableware-engine';
import { svgFileBlob, svgToPng, svgToPrintPdf, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: TWSpec = { ...TW_TEMPLATES[0].spec, liner: 'a3', napkinInks: 2 };
type Item = 'liner' | 'sleeve' | 'napkin';
const ITEMS: { id: Item; name: string }[] = [
  { id: 'liner', name: 'Giấy lót khay' },
  { id: 'sleeve', name: 'Bao đũa' },
  { id: 'napkin', name: 'Khăn giấy' },
];

// logo khách: thu nhỏ trên máy (giữ nền trong suốt), không gửi đi đâu
async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

// đổi phong cách khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu phong cách mới
function switchStyleData(d: TWData, from: string, to: string): TWData {
  const oldS = TW_SAMPLES[from] || {}, next: TWData = { ...defaultTWData(to) };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

export default function TablewarePage() {
  const ready = useTWFonts();
  const [spec, setSpec] = useState<TWSpec>(FIRST);
  const [data, setData] = useState<TWData>(defaultTWData(FIRST.style));
  const [dirty, setDirty] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [item, setItem] = useState<Item>('liner');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const refs = {
    liner: useRef<HTMLDivElement | null>(null), sf: useRef<HTMLDivElement | null>(null), sb: useRef<HTMLDivElement | null>(null), nf: useRef<HTMLDivElement | null>(null),
    linerBleed: useRef<HTMLDivElement | null>(null), die: useRef<HTMLDivElement | null>(null), napPrint: useRef<HTMLDivElement | null>(null),
  };
  const lgo = logo || undefined;
  const set = (p: Partial<TWSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof TW_TEMPLATES)[number]) => {
    const changed = t.spec.style !== spec.style;
    set(t.spec);
    if (!dirty) setData(defaultTWData(t.spec.style));
    else if (changed) setData((d) => switchStyleData(d, spec.style, t.spec.style));
  };
  const sz = twLinerSize(spec.liner);
  const pal = twPalette(spec.palette);
  const slug = slugify(`bo-ban-an-${data.brand || ''}`, 'bo-ban-an');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const need = (r: RefObject<HTMLDivElement | null>) => { const el = svgOf(r); if (!el) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.'); return el; };

  // file in từng món
  const linerPdf = () => svgToPrintPdf(need(refs.linerBleed), TW_FONT_CSS, sz, TW_BLEED_MM, 200);
  const sleevePdf = () => svgToSizedPdf(need(refs.die), TW_FONT_CSS, SLEEVE_FLAT.w + TW_BLEED_MM * 2, SLEEVE_FLAT.h + TW_BLEED_MM * 2, 300);
  const napkinPdf = () => svgToSizedPdf(need(refs.napPrint), TW_FONT_CSS, NAPKIN.full, NAPKIN.full, 200);
  const downloadPdf = (it: Item) => run(`pdf-${it}`, async () => {
    if (it === 'liner') downloadBlob(await linerPdf(), `${slug}-giay-lot-khay-${sz.id}.pdf`);
    if (it === 'sleeve') downloadBlob(await sleevePdf(), `${slug}-bao-dua-khuon-be.pdf`);
    if (it === 'napkin') downloadBlob(await napkinPdf(), `${slug}-khan-giay-${spec.napkinInks}mau.pdf`);
  });
  const downloadSvg = (it: Item) => run(`svg-${it}`, async () => {
    const el = need(it === 'liner' ? refs.linerBleed : it === 'sleeve' ? refs.die : refs.napPrint);
    downloadBlob(await svgFileBlob(el, TW_FONT_CSS), `${slug}-${it === 'liner' ? 'giay-lot-khay' : it === 'sleeve' ? 'bao-dua-khuon-be' : 'khan-giay'}.svg`);
  });
  const downloadPngSet = () => run('png', async () => {
    downloadBlob(await svgToPng(need(refs.liner), TW_FONT_CSS, 2400), `${slug}-giay-lot-khay.png`);
    downloadBlob(await svgToPng(need(refs.sf), TW_FONT_CSS, 2000), `${slug}-bao-dua-mat-truoc.png`);
    downloadBlob(await svgToPng(need(refs.nf), TW_FONT_CSS, 1200), `${slug}-khan-giay.png`);
  });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current!.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await toBlob(c, 'image/png'), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    // gộp 3 file in vào 1 PDF nhiều trang không gọn → gửi PDF giấy lót khay + khuôn bao đũa + khăn trong 1 zip đơn giản? giữ PDF giấy lót (chính) và kèm 2 món còn lại trong thiết kế
    const [file, preview] = await Promise.all([
      linerPdf(),
      view3d.current ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86)) : svgToPng(need(refs.liner), TW_FONT_CSS, 1200),
    ]);
    return { file, fileName: `${slug}-giay-lot-khay-${sz.id}.pdf`, preview };
  };

  const build3d = () => import('@/lib/tableware-3d').then((m) => m.tablewareBuilder({
    liner: svgOf(refs.liner), sleeveFront: svgOf(refs.sf), sleeveBack: svgOf(refs.sb), napkin: svgOf(refs.nf),
    linerW: sz.wMm, linerH: sz.hMm, style: spec.style, accent: pal.accent, accent2: pal.accent2, fontCss: TW_FONT_CSS,
  }));
  // hook cho QC (chụp ảnh 3D lớn ở góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __twSnap?: (w: number, h: number) => Promise<string> }).__twSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh logo này, thử file PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tplName = TW_TEMPLATES.find((t) => t.spec.style === spec.style && t.spec.palette === spec.palette)?.name || twStyle(spec.style).name;
  const btn = (key: string, label: string, onClick: () => void, primary = false, testid?: string, icon: ReactNode = <FileDown className="w-3.5 h-3.5" />) => (
    <button type="button" onClick={onClick} className={`mv-btn ${primary ? 'mv-btn-primary' : 'mv-btn-ghost'} !flex justify-center !py-2.5 !text-xs`} data-testid={testid}>
      {busy === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon} {label}
    </button>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bộ bàn ăn F&B" sub="Giấy lót khay, bao đũa, khăn giấy in logo quán — điền 1 lần ra đồng bộ cả bộ, xem thành phẩm 3D, tải file in chuẩn xưởng hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu theo kiểu quán (${TW_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TW_TEMPLATES.map((t) => {
                  const on = spec.style === t.spec.style && spec.palette === t.spec.palette;
                  const d = dirty ? switchStyleData(data, spec.style, t.spec.style) : TW_SAMPLES[t.spec.style];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="tw-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm bg-white" style={{ aspectRatio: '420 / 297' }}>
                        <LinerSvg spec={{ ...spec, ...t.spec, liner: 'a3' }} data={d} logo={lgo} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin quán">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="tw-logo-btn">
                  <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                </button>
                {logo && (
                  <>
                    <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded border border-mv-hair bg-white" />
                    <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>
                  </>
                )}
                <span className="text-[11px] text-slate-500">Không có logo → Mivy dựng logo chữ từ tên quán. Khăn giấy in logo 1–2 màu mực.</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="tw-logo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TW_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`tw-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} data-testid={`tw-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font, khổ & mực">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu quán</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tw-styles">
                    {TW_STYLES.map((s) => <button key={s.id} type="button" onClick={() => pickTemplate({ id: s.id, name: s.name, spec: { style: s.id, palette: spec.palette, font: spec.font, layout: spec.layout } })} className={chip(spec.style === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="tw-palettes">
                    {TW_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="tw-fonts">
                    {TW_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.brand || 'Quán ngon'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Bố cục giấy lót khay</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tw-layouts">
                      <button type="button" onClick={() => set({ layout: 'band' })} className={chip(spec.layout === 'band')}>Dải đầu</button>
                      <button type="button" onClick={() => set({ layout: 'frame' })} className={chip(spec.layout === 'frame')}>Khung hoạ tiết</button>
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Khăn giấy in</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tw-inks">
                      <button type="button" onClick={() => set({ napkinInks: 1 })} className={chip(spec.napkinInks === 1)}>1 màu mực</button>
                      <button type="button" onClick={() => set({ napkinInks: 2 })} className={chip(spec.napkinInks === 2)}>2 màu mực</button>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ giấy lót khay</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tw-sizes">
                    {TW_LINER_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ liner: s.id })} className={chip(spec.liner === s.id)} data-testid="tw-size">{s.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={spec.liner} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="flex gap-1.5" data-testid="tw-items">
                {ITEMS.map((it) => <button key={it.id} type="button" onClick={() => setItem(it.id)} className={chip(item === it.id)} data-testid={`tw-item-${it.id}`}>{it.name}</button>)}
              </div>
              <div className={item === 'liner' ? '' : 'hidden'}>
                <div ref={refs.liner} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] bg-white" data-testid="tw-liner">
                  <LinerSvg spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
              <div className={`space-y-2 ${item === 'sleeve' ? '' : 'hidden'}`}>
                <div className="text-[11px] text-slate-400">Mặt trước · 25×4cm (miệng mở bên trái)</div>
                <div ref={refs.sf} className="rounded overflow-hidden shadow" data-testid="tw-sleeve-front"><SleeveFace spec={spec} data={data} logo={lgo} side="front" style={{ width: '100%', display: 'block' }} /></div>
                <div className="text-[11px] text-slate-400">Mặt sau</div>
                <div ref={refs.sb} className="rounded overflow-hidden shadow" data-testid="tw-sleeve-back"><SleeveFace spec={spec} data={data} logo={lgo} side="back" style={{ width: '100%', display: 'block' }} /></div>
                <div className="text-[11px] text-slate-400">Khuôn bế trải phẳng (đỏ: cắt · xanh: gấp)</div>
                <div className="rounded overflow-hidden bg-white border border-mv-hair"><SleeveDielineSvg spec={spec} data={data} logo={lgo} labels style={{ width: '100%', display: 'block' }} /></div>
              </div>
              <div className={`grid grid-cols-2 gap-2 ${item === 'napkin' ? '' : 'hidden'}`}>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt khăn gấp 4</div>
                  <div ref={refs.nf} className="rounded overflow-hidden shadow bg-white" data-testid="tw-napkin"><NapkinFaceSvg spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} /></div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">File in 33×33cm</div>
                  <div className="rounded overflow-hidden bg-white border border-mv-hair"><NapkinPrintSvg spec={spec} data={data} logo={lgo} labels style={{ width: '100%', display: 'block' }} /></div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Lót khay {sz.name} · bao đũa {SLEEVE.L / 10}×{SLEEVE.W / 10}cm · khăn {NAPKIN.full / 10}cm in {spec.napkinInks} màu</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {btn('3d', 'Ảnh 3D', download3d, false, 'tw-3d', <Download className="w-3.5 h-3.5" />)}
              {btn('png', 'PNG cả bộ', downloadPngSet, false, 'tw-png', <Download className="w-3.5 h-3.5" />)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {btn('pdf-liner', 'PDF lót khay', () => downloadPdf('liner'), true, 'tw-pdf-liner')}
              {btn('pdf-sleeve', 'PDF bao đũa', () => downloadPdf('sleeve'), true, 'tw-pdf-sleeve')}
              {btn('pdf-napkin', 'PDF khăn', () => downloadPdf('napkin'), true, 'tw-pdf-napkin')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {btn('svg-liner', 'SVG lót khay', () => downloadSvg('liner'), false, 'tw-svg-liner')}
              {btn('svg-sleeve', 'SVG bao đũa', () => downloadSvg('sleeve'), false, 'tw-svg-sleeve')}
              {btn('svg-napkin', 'SVG khăn', () => downloadSvg('napkin'), false, 'tw-svg-napkin')}
            </div>
            <PrintRequest product="tableware" title={`Bộ bàn ăn · ${tplName} · lót khay ${sz.name}`} design={{ spec, data, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF lót khay: đúng khổ thật, lề xén {TW_BLEED_MM}mm + vạch cắt. Bao đũa: khuôn bế trải phẳng có đường cắt (CutContour) + đường gấp. Khăn giấy: file 33×33cm, hình nằm ở ô lộ ra khi gấp 4. Chữ đã outline, xưởng không cần font.</p>
          </div>
        </div>
      )}

      {/* bản in (ẩn): lót khay có lề xén, khuôn bao đũa, khăn 33cm */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={refs.linerBleed}><LinerSvg spec={spec} data={data} logo={lgo} bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.die}><SleeveDielineSvg spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={refs.napPrint}><NapkinPrintSvg spec={spec} data={data} logo={lgo} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
