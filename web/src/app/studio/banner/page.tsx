'use client';
// Banner hiflex & Backdrop: chọn loại → chọn mẫu → điền nội dung (+ 1 ảnh tuỳ chọn) → đổi màu/font/khổ →
// xem thành phẩm 3D treo thật → tải file in đúng khổ (bleed 20mm, vạch cắt, dấu khoen) hoặc gửi yêu cầu in.

import { useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  BN_BLEED_MM, BN_FIELDS, BN_FONTS, BN_FONT_CSS, BN_KINDS, BN_LAYOUTS, BN_PALETTES, BN_TEMPLATES, BN_DEFAULTS,
  BannerSvg, bnDpi, bnSize, bnSizesFor, dataForLayout, grommetPoints, useBNFonts, type BNData, type BNKind, type BNSpec,
} from '@/lib/banner-engine';
import { svgFileBlob, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: BNSpec = { kind: 'banner', layout: 'grand', palette: 'red', font: 'montserrat', size: 'b300x80', pattern: false, grommets: true };

// ảnh khách tải lên: thu về tối đa 2000px (JPEG) cho nhẹ, dùng ngay trong SVG
function readPhoto(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export default function BannerPage() {
  const ready = useBNFonts();
  const [spec, setSpec] = useState<BNSpec>(FIRST);
  const [data, setData] = useState<BNData>({ ...BN_DEFAULTS.grand });
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<BNSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const pickKind = (k: BNKind) => setSpec((s) => (s.kind === k ? s : { ...s, kind: k, size: bnSizesFor(k)[0].id }));
  const pickTpl = (t: (typeof BN_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => dataForLayout(t.spec.layout, spec.layout, d));
    set(t.spec);
  };
  const sz = bnSize(spec.size);
  const ratio = sz.wMm / sz.hMm;
  const dpi = bnDpi(sz);
  const nGrom = grommetPoints(sz.wMm, sz.hMm).length;
  const slug = slugify(`${spec.kind}-${data.brand || data.title || ''}`, spec.kind);
  const sizeTag = `${sz.wMm / 10}x${sz.hMm / 10}cm`;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const build3d = () => import('@/lib/banner-3d').then((m) => m.bannerBuilder({ el: svgOf(previewRef), kind: spec.kind, wMm: sz.wMm, hMm: sz.hMm, fontCss: BN_FONT_CSS }));
  const shot3d = async (w: number, h: number, watermark: boolean) => {
    if (view3d.current && tab === '3d') return view3d.current.snapshot(w, h, { watermark });
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return core.snapshot(b, w, h, { watermark });
  };
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

  const downloadPng = () => run('png', async () => { const el = svgOf(previewRef); if (!el) return; downloadBlob(await svgToPng(el, BN_FONT_CSS, 2400), `${slug}-${sizeTag}.png`); });
  const download3d = () => run('3d', async () => { downloadBlob(await toBlob(await shot3d(1600, 1200, true), 'image/png'), `${slug}-${sizeTag}-3d.png`); });
  const downloadPdf = () => run('pdf', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgToPrintPdf(el, BN_FONT_CSS, sz, BN_BLEED_MM, dpi), `${slug}-${sizeTag}-file-in.pdf`); });
  const downloadSvg = () => run('svg', async () => { const el = svgOf(printRef); if (!el) return; downloadBlob(await svgFileBlob(el, BN_FONT_CSS), `${slug}-${sizeTag}-file-in.svg`); });

  const makeFiles = async () => {
    const pr = svgOf(printRef);
    if (!pr) throw new Error('Chưa dựng xong banner, thử lại nhé.');
    const [file, preview] = await Promise.all([svgToPrintPdf(pr, BN_FONT_CSS, sz, BN_BLEED_MM, dpi), shot3d(900, 675, false).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-${sizeTag}-file-in.pdf`, preview };
  };
  const layoutName = BN_LAYOUTS.find((l) => l.id === spec.layout)?.name;
  const orderTitle = `${spec.kind === 'backdrop' ? 'Backdrop' : 'Banner hiflex'} ${sz.name} · ${layoutName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tplCols = ratio >= 2.4 ? 'grid-cols-2 xl:grid-cols-3' : ratio <= 0.8 ? 'grid-cols-4 sm:grid-cols-5 xl:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4';
  const box3d = ratio <= 0.8 ? 'aspect-[3/4] max-h-[62vh]' : 'aspect-[4/3]';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Banner & backdrop" sub="Băng rôn hiflex, backdrop sự kiện khổ lớn — chọn mẫu, điền nội dung, xem treo thật bằng 3D, tải file in đúng khổ (bleed, vạch cắt, dấu khoen) hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        {BN_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => pickKind(k.id)} data-testid="bn-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${BN_TEMPLATES.length})`}>
              <div className={`grid ${tplCols} gap-2.5`}>
                {BN_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const d = t.spec.layout === spec.layout ? data : dataForLayout(t.spec.layout, spec.layout, data);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="bn-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <BannerSvg spec={{ ...t.spec, size: spec.size }} data={d} photo={t.spec.layout === spec.layout ? photo : undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {BN_FIELDS[spec.layout].map((f) => (
                  <label key={f.key} className="block col-span-2 sm:col-span-1">
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`bn-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Ảnh (tuỳ chọn) — ảnh cửa hàng, sản phẩm, ảnh cưới…</span>
                  <div className="flex items-center gap-3">
                    <label className="mv-btn mv-btn-ghost !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Tải ảnh lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="bn-photo"
                        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setPhoto(await readPhoto(f)); } catch (err) { alert((err as Error).message); } } }} />
                    </label>
                    {photo && (
                      <>
                        <img src={photo} alt="" className="h-10 w-10 rounded-md object-cover border border-mv-hair" />
                        <button type="button" onClick={() => setPhoto('')} className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1" data-testid="bn-photo-clear"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="bn-palettes">
                    {BN_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="bn-fonts">
                    {BN_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5">
                    {bnSizesFor(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="bn-size">{s.name}</button>)}
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={spec.pattern} onChange={(e) => set({ pattern: e.target.checked })} data-testid="bn-pattern" />
                    Lặp logo / chữ lồng mờ trên nền (kiểu step &amp; repeat chụp ảnh)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={spec.grommets} onChange={(e) => set({ grommets: e.target.checked })} data-testid="bn-grommets" />
                    Đánh dấu vị trí đóng khoen trong file in ({nGrom} khoen, mỗi ~50cm)
                  </label>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec.layout, spec.palette, spec.font, spec.pattern, data, photo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={450} className={`rounded-lg w-full ${box3d}`} />
            )}
            <div ref={previewRef} className={`mx-auto rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${tab === '3d' ? 'hidden' : ''}`} style={{ maxHeight: '58vh', aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid="bn-preview">
              <BannerSvg spec={spec} data={data} photo={photo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · bleed {BN_BLEED_MM / 10}cm · in {dpi}dpi{spec.grommets ? ` · ${nGrom} khoen` : ''}</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bn-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG</button>
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bn-3dpng" title="Ảnh thành phẩm 3D để đăng/khoe khách">{busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="bn-pdf">{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bn-svg" title="File vector, chữ đã outline">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG</button>
            </div>
            <PrintRequest product="banner" title={orderTitle} design={{ spec, data, hasPhoto: !!photo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: file PDF đúng khổ thật, có lề xén {BN_BLEED_MM / 10}cm + vạch cắt{spec.grommets ? ' + dấu đóng khoen' : ''} — xưởng in thẳng. Hoặc gửi yêu cầu, Mivy in + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <BannerSvg spec={spec} data={data} photo={photo || undefined} bleed marks={spec.grommets} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
