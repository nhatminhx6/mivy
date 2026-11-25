'use client';
// Khung check-in cầm tay: chọn mẫu (cưới, khai trương, sinh nhật, YEP, tốt nghiệp, thôi nôi) → điền tên/ngày/hashtag
// → chọn khổ, viền ngoài (chữ nhật / hoa sò / mây / bóng bay), ô cửa sổ (chữ nhật / vòm / tròn / tim), bố cục, màu, font
// → xem 3D tấm formex 5mm có ô khoét → tải PNG, PDF in (lề xén + vạch cắt), SVG in–cắt (In + CutContour) hoặc gửi yêu cầu in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  SF_BLEED_MM, SF_DECOS, SF_FIELDS, SF_FONTS, SF_FONT_CSS, SF_LAYOUTS, SF_OUTLINES, SF_PALETTES, SF_PURPOSES, SF_SAMPLES, SF_SCRIPTS,
  SF_SIZES, SF_TEMPLATES, SF_WINDOWS, SelfieFrameSvg, defaultSfSpec, sfGeom, sfPalette, sfSize, useSfFonts,
  type SfData, type SfPurpose, type SfSpec,
} from '@/lib/selfieframe-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi dịp: ô còn nguyên chữ mẫu dịp cũ → chữ mẫu dịp mới; ô khách tự viết thì giữ
function switchData(d: SfData, from: SfPurpose, to: SfPurpose): SfData {
  const oldS = SF_SAMPLES[from], next: SfData = { ...SF_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function SelfieFramePage() {
  const ready = useSfFonts();
  const [spec, setSpec] = useState<SfSpec>(defaultSfSpec);
  const [data, setData] = useState<SfData>({ ...SF_SAMPLES.wedding });
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const prevRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = sfSize(spec.size);
  const slug = slugify(`khung-check-in-${data.title || ''}`, 'khung-check-in');
  const set = (p: Partial<SfSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setPurpose = (pp: SfPurpose) => { if (pp === spec.purpose) return; setData((d) => switchData(d, spec.purpose, pp)); set({ purpose: pp }); };
  const pickTpl = (t: (typeof SF_TEMPLATES)[number]) => {
    if (t.spec.purpose !== spec.purpose) setData((d) => switchData(d, spec.purpose, t.spec.purpose));
    setSpec((s) => ({ ...s, ...t.spec }));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // SVG in–cắt: chữ đã outline (còn sót chữ thì nhúng font cho chắc)
  const cutFile = async (): Promise<Blob> => {
    const el = svgOf(printRef);
    if (!el) throw new Error('Chưa dựng xong file in');
    const clone = await selfContainedSvg(el, undefined, { outline: true });
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(SF_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  };
  // khổ lớn (tới 1m) → dpi tự hạ để file không quá nặng (khổ lớn nhìn xa, 120–150dpi là đủ)
  const pdfDpi = Math.max(90, Math.min(150, Math.floor((6000 / (sz.wMm + SF_BLEED_MM * 2)) * 25.4)));

  const downloadPng = () => run('png', async () => {
    const el = svgOf(prevRef); if (!el) return;
    downloadBlob(await svgToPng(el, SF_FONT_CSS, 1800), `${slug}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgToPrintPdf(el, SF_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, SF_BLEED_MM, pdfDpi), `${slug}-${sz.id}-file-in.pdf`);
  });
  const downloadSvg = () => run('svg', async () => downloadBlob(await cutFile(), `${slug}-${sz.id}-in-cat.svg`));
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(prevRef);
    if (!pv) throw new Error('Chưa dựng xong khung, thử lại nhé.');
    const file = await cutFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, SF_FONT_CSS, 900))
      : await svgToJpeg(pv, SF_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sz.id}-in-cat.svg`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo'); }
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __sfSnap?: (w: number, h: number) => Promise<string> }).__sfSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => {
    const g = sfGeom(spec);
    return import('@/lib/selfieframe-3d').then((m) => m.selfieBuilder({
      print: svgOf(prevRef), outline: g.outline, windowD: g.windowD, wMm: g.W, hMm: g.H, win: g.win, fontCss: SF_FONT_CSS,
    }));
  };
  const orderTitle = `Khung check-in ${sz.name} · formex 5mm`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const pal = sfPalette(spec.palette);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Khung check-in cầm tay" sub="Khung ảnh selfie formex có ô khoét giữa cho tiệc cưới, khai trương, sinh nhật, tất niên, tốt nghiệp — file in–cắt chuẩn xưởng (viền + ô cửa sổ)." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SF_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {SF_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.window === t.spec.window && spec.outline === t.spec.outline && spec.purpose === t.spec.purpose;
                  const td = t.spec.purpose === spec.purpose ? data : switchData(data, spec.purpose, t.spec.purpose);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="sf-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-2.5 aspect-[4/3]">
                        <SelfieFrameSvg spec={{ ...spec, ...t.spec }} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Dịp (đổi chữ mẫu)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-purposes">
                    {SF_PURPOSES.map((p) => <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={chip(spec.purpose === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {SF_FIELDS.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`sf-field-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo / ảnh đại diện' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="sf-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Logo in ở dải chữ (bố cục MXH: thành ảnh đại diện) · ảnh xử lý ngay trên máy</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, viền, ô cửa sổ & màu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ khung</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-sizes">
                    {SF_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-layouts">
                    {SF_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ô cửa sổ (khoét thủng)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-windows">
                    {SF_WINDOWS.map((w) => <button key={w.id} type="button" onClick={() => set({ window: w.id })} className={chip(spec.window === w.id)}>{w.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Viền ngoài (cắt theo hình)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-outlines">
                    {SF_OUTLINES.map((w) => <button key={w.id} type="button" onClick={() => set({ outline: w.id })} className={chip(spec.outline === w.id)}>{w.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Trang trí</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sf-decos">
                    {SF_DECOS.map((w) => <button key={w.id} type="button" onClick={() => set({ deco: w.id })} className={chip(spec.deco === w.id)}>{w.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="sf-palettes">
                    {SF_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="mv-label mb-1.5">Font tiêu đề</div>
                    <div className="grid grid-cols-2 gap-1.5" data-testid="sf-fonts">
                      {SF_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Chữ viết tay</div>
                    <div className="grid grid-cols-1 gap-1.5" data-testid="sf-scripts">
                      {SF_SCRIPTS.map((f) => <button key={f.id} type="button" onClick={() => set({ script: f.id })} className={`${chip(spec.script === f.id)} !py-2 !text-sm truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.size}|${spec.outline}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div className="rounded-lg grid place-items-center p-5 aspect-[4/3]" style={{ background: pal.dark ? '#E9ECF1' : '#D9DEE6' }} data-testid="sf-preview">
                <SelfieFrameSvg spec={spec} data={data} logo={logo} cut style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">Nét đứt hồng = đường cắt (viền ngoài + ô cửa sổ khoét thủng)</div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · formex 5mm in UV · lề xén {SF_BLEED_MM}mm · PDF {pdfDpi}dpi</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sf-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sf-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG thiết kế
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sf-pdf" title="Đúng khổ, lề xén 3mm + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sf-svg" title="Lớp In + CutContour (viền + ô cửa sổ), chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt SVG
              </button>
            </div>
            <PrintRequest product="selfieframe" title={orderTitle} defaultMaterial="Formex 5mm cắt CNC" design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in–cắt đúng khổ thật: lớp <b>In</b> (nền tràn lề 3mm ra ngoài viền và lấn vào ô cửa sổ) + <b>CutContour</b> (viền ngoài và ô cửa sổ, spot Magenta) — chữ đã outline, xưởng in UV lên formex rồi cắt CNC/dao rung theo đường cắt.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1000, pointerEvents: 'none' }}>
          <div ref={prevRef}><SelfieFrameSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="sf-print"><SelfieFrameSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
