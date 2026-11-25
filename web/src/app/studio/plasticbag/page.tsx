'use client';
// Túi xốp / túi nilon in logo: chọn loại túi (quai đục lỗ / quai xách áo thun) → mẫu → tên shop, hotline, logo →
// màu màng + 1–2 màu mực flexo, in 1 hay 2 mặt → xem túi 3D → tải file in đúng khổ (lỗ quai, đường hàn, nếp hông) / gửi yêu cầu in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Leaf, Loader2, Trash2 } from 'lucide-react';
import {
  PB_FIELDS, PB_FILMS, PB_FONTS, PB_FONT_CSS, PB_INKS, PB_KINDS, PB_LAYOUTS, PB_MARGIN, PB_TEMPLATES,
  PlasticBagSvg, defaultPBData, logoToMask, pbFilm, pbInk, pbLayout, pbLowContrast, pbSize, sizesOf, usePBFonts,
  type PBData, type PBKind, type PBLogo, type PBSpec,
} from '@/lib/plasticbag-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { zipStore } from '@/lib/seal-engine';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PBSpec = { ...PB_TEMPLATES[0].spec, size: 'd30', faces: 2, back: 'same', bio: false };
const SCENE_BG = 'linear-gradient(135deg,#E9ECEF 0%,#DADFE4 100%)';

export default function PlasticBagPage() {
  const ready = usePBFonts();
  const [spec, setSpec] = useState<PBSpec>(FIRST);
  const [data, setData] = useState<PBData>(defaultPBData());
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [logoSrc, setLogoSrc] = useState('');
  const [thr, setThr] = useState(150);
  const [invert, setInvert] = useState(false);
  const [logo, setLogo] = useState<PBLogo | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inkFRef = useRef<HTMLDivElement | null>(null);
  const inkBRef = useRef<HTMLDivElement | null>(null);
  const prFRef = useRef<HTMLDivElement | null>(null);
  const prBRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  useEffect(() => {
    let on = true;
    if (!logoSrc) { setLogo(null); return; }
    logoToMask(logoSrc, thr, invert).then((l) => { if (on) setLogo(l); }).catch(() => { if (on) setLogo(null); });
    return () => { on = false; };
  }, [logoSrc, thr, invert]);

  const lay = pbLayout(spec.layout);
  const nInk = Math.min(spec.inks.length, lay.inks);
  const usedInks = spec.inks.slice(0, nInk);
  const sz = pbSize(spec.size);
  const film = pbFilm(spec.film);
  const set = (p: Partial<PBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setEdited(true); setData((d) => ({ ...d, [key]: v })); };
  const setKind = (k: PBKind) => setSpec((s) => (s.kind === k ? s : { ...s, kind: k, size: sizesOf(k)[1].id }));
  const pickTemplate = (t: (typeof PB_TEMPLATES)[number]) => {
    setSpec((s) => ({ ...s, ...t.spec, size: s.kind === t.spec.kind ? s.size : sizesOf(t.spec.kind)[1].id }));
    if (!edited) setData({ ...defaultPBData(), ...(t.data || {}) }); // khách chưa sửa chữ → nạp chữ mẫu đúng ngành
  };
  const setInkCount = (n: number) => setSpec((s) => {
    const inks = s.inks.slice(0, n);
    for (const i of PB_INKS) { if (inks.length >= n) break; if (!inks.includes(i.id) && !pbLowContrast(i.id, s.film)) inks.push(i.id); }
    return { ...s, inks };
  });
  const setInk = (slot: number, id: string) => setSpec((s) => { const inks = [...s.inks]; inks[slot] = id; return { ...s, inks }; });
  const slug = slugify(`tui-xop-${data.brand || ''}`, 'tui-xop');
  const M = PB_MARGIN;
  const pageW = sz.w + M * 2, pageH = sz.h + M * 2;
  const two = spec.faces === 2;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printEls = () => [svgOf(prFRef), two ? svgOf(prBRef) : null].filter(Boolean) as SVGSVGElement[];

  // PDF in: mỗi mặt 1 trang đúng khổ thật (túi + lề ghi chú), 200dpi, chữ outline
  const printPdf = async () => {
    const els = printEls(); if (!els.length) throw new Error('Chưa dựng xong file in');
    const dpi = 200, outW = Math.round((pageW / 25.4) * dpi), outH = Math.round((pageH / 25.4) * dpi);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait', compress: true });
    for (let i = 0; i < els.length; i++) {
      const c = await svgToCanvas(await selfContainedSvg(els[i], PB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
      if (i) pdf.addPage([pageW, pageH], 'portrait');
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
    return pdf.output('blob');
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const els = printEls(); if (!els.length) return;
    if (els.length === 1) { downloadBlob(await svgFileBlob(els[0], PB_FONT_CSS), `${slug}-${sz.id}-mat-truoc.svg`); return; }
    const files = await Promise.all(els.map(async (el, i) => ({ name: `${slug}-${sz.id}-${i ? 'mat-sau' : 'mat-truoc'}.svg`, data: new Uint8Array(await (await svgFileBlob(el, PB_FONT_CSS)).arrayBuffer()) })));
    downloadBlob(zipStore(files), `${slug}-${sz.id}-file-in-2-mat.zip`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(faceRef); if (!el) return;
    downloadBlob(await svgToPng(el, PB_FONT_CSS, 1600), `${slug}-mat-truoc.png`);
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
    const [file, preview] = await Promise.all([printPdf(), view3d.current ? snapJpeg() : svgToPng(svgOf(faceRef)!, PB_FONT_CSS, 1200)]);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const build3d = () => import('@/lib/plasticbag-3d').then((m) => m.plasticBagBuilder({
    spec, front: svgOf(inkFRef), back: two ? svgOf(inkBRef) : null, fontCss: PB_FONT_CSS,
  }));
  // hook cho QC (Playwright chụp ảnh 3D lớn ở góc mặc định) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __pbSnap?: (w: number, h: number) => Promise<string> }).__pbSnap = async (w, h) => { const core = await import('@/lib/mockup3d'); return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png'); };

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setLogoSrc(String(fr.result));
    fr.readAsDataURL(f);
  };

  const warn = usedInks.filter((i) => pbLowContrast(i, spec.film));
  const kindName = PB_KINDS.find((k) => k.id === spec.kind)!.name;
  const orderTitle = `${kindName} ${sz.name} · màng ${film.name.toLowerCase()} · ${nInk} màu · in ${spec.faces} mặt${spec.bio ? ' · tự huỷ sinh học' : ''}`;
  const material = spec.bio ? 'Túi tự huỷ sinh học' : spec.kind === 'die' ? 'Túi xốp HD quai đục lỗ' : 'Túi PE quai xách (túi xốp quai)';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = PB_TEMPLATES; // thứ tự cố định (không nhảy chỗ khi đổi loại túi) — mẫu tự đổi loại túi theo mẫu

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Túi xốp · túi nilon in logo" sub="Túi HD quai đục lỗ, túi xốp quai xách in tên shop, hotline, lời cảm ơn — in flexo 1–2 màu trên màng trắng sữa, trong, đen, vàng, hồng, xanh. Xem túi 3D, tải file in đúng khổ (lỗ quai, đường hàn, nếp hông)." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        {PB_KINDS.map((k) => <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`pb-kind-${k.id}`}>{k.name}</button>)}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.film === t.spec.film && spec.font === t.spec.font && spec.inks.join() === t.spec.inks.join() && spec.kind === t.spec.kind;
                  const ts: PBSpec = { ...spec, ...t.spec, size: t.spec.kind === 'die' ? 'd30' : 't30' };
                  const td = edited ? data : { ...defaultPBData(), ...(t.data || {}) };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden p-3" style={{ background: SCENE_BG }}>
                        <div className="mx-auto" style={{ aspectRatio: `${pbSize(ts.size).w} / ${pbSize(ts.size).h}`, maxHeight: 190, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>
                          <PlasticBagSvg spec={ts} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
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
                {PB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pb-${f.key}`} />
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
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="pb-logo" />
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

            <CollapsibleSection title="3 · Khổ túi, màu màng & mực">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ túi ({PB_KINDS.find((k) => k.id === spec.kind)!.sub})</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-sizes">
                    {sizesOf(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Màu màng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-films">
                    {PB_FILMS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ film: f.id })} className={`flex items-center gap-2 ${chip(spec.film === f.id)}`}>
                        <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: f.opacity < 0.6 ? 'repeating-linear-gradient(45deg,#fff 0 3px,#e5e7eb 3px 6px)' : f.hex }} />{f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Số màu mực (in flexo — túi xốp thường in 1–2 màu)</div>
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="pb-inkcount">
                    {[1, 2].map((n) => <button key={n} type="button" disabled={n > lay.inks} onClick={() => setInkCount(n)} className={`${chip(nInk === n)} disabled:opacity-35 disabled:cursor-not-allowed`}>{n} màu</button>)}
                  </div>
                  <div className="space-y-2" data-testid="pb-inks">
                    {usedInks.map((id, slot) => (
                      <div key={slot} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 w-14">Màu {slot + 1}</span>
                        {PB_INKS.map((i) => (
                          <button key={i.id} type="button" title={i.name} onClick={() => setInk(slot, i.id)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${id === i.id ? 'border-indigo-400 scale-110' : 'border-mv-hair'}`} style={{ background: i.hex }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  {warn.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> Mực {warn.map((i) => pbInk(i).name.toLowerCase()).join(', ')} gần màu màng {film.name.toLowerCase()} — in ra sẽ khó đọc.</div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Số mặt in</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pb-faces">
                      {([1, 2] as const).map((n) => <button key={n} type="button" onClick={() => set({ faces: n })} className={chip(spec.faces === n)}>{n} mặt</button>)}
                    </div>
                    {two && (
                      <div className="flex flex-wrap gap-1.5 mt-2" data-testid="pb-back">
                        <button type="button" onClick={() => set({ back: 'same' })} className={chip(spec.back === 'same')}>Mặt sau giống mặt trước</button>
                        <button type="button" onClick={() => set({ back: 'thanks' })} className={chip(spec.back === 'thanks')}>Mặt sau: Cảm ơn quý khách</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tên shop</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pb-fonts">
                      {PB_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-layouts">
                    {PB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer" data-testid="pb-bio">
                  <input type="checkbox" checked={spec.bio} onChange={(e) => set({ bio: e.target.checked })} />
                  <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Túi tự huỷ sinh học (in thêm dòng “thân thiện môi trường”)
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
            <div className={`${tab === '3d' ? 'hidden' : ''}`} data-testid="pb-flat">
              <div className={`grid ${two ? 'grid-cols-2' : 'grid-cols-1'} gap-3 rounded-lg p-4`} style={{ background: SCENE_BG }}>
                <div>
                  <div className="text-[11px] text-slate-600 mb-1 text-center">Mặt trước</div>
                  <div ref={faceRef} className="mx-auto" style={{ maxWidth: two ? '100%' : '62%', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} data-testid="pb-face-front">
                    <PlasticBagSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                </div>
                {two && (
                  <div>
                    <div className="text-[11px] text-slate-600 mb-1 text-center">Mặt sau</div>
                    <div style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} data-testid="pb-face-back">
                      <PlasticBagSvg spec={spec} data={data} logo={logo} side="back" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="text-[11px] text-slate-400 mb-1">File in mặt trước · đúng khổ {sz.w / 10}×{sz.h / 10}cm (hồng = cắt/lỗ quai, xanh = đường hàn{sz.g ? ', chấm xanh lá = nếp hông' : ''})</div>
                <div className="rounded-lg bg-white p-1 overflow-hidden max-h-[420px]" data-testid="pb-print-preview">
                  <PlasticBagSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 410 }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{kindName} {sz.name} · màng {film.name.toLowerCase()} · {nInk} màu mực: {usedInks.map((i) => pbInk(i).name).join(', ')} · in {spec.faces} mặt</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="pb-3d" title="Ảnh túi 3D">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pb-png" title="Ảnh mặt trước">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pb-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pb-svg" title="File vector, chữ đã outline — xưởng làm bản flexo">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="plasticbag" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng khổ túi thật, chữ đã outline, có đường cắt quai, đường hàn{sz.g ? ', nếp xếp hông' : ''} và vùng in an toàn — xưởng làm khuôn flexo in trên màng. Túi xốp in logo thường đặt từ 1.000–2.000 cái (khoảng 10–20kg).</p>
          </div>
        </div>
      )}

      {/* bản ẩn: lớp mực (texture 3D) + file in 2 mặt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1200, pointerEvents: 'none' }}>
          <div ref={inkFRef} data-testid="pb-ink-front"><PlasticBagSvg spec={spec} data={data} logo={logo} mode="ink" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={inkBRef} data-testid="pb-ink-back"><PlasticBagSvg spec={spec} data={data} logo={logo} side="back" mode="ink" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={prFRef} data-testid="pb-print-front"><PlasticBagSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          <div ref={prBRef} data-testid="pb-print-back"><PlasticBagSvg spec={spec} data={data} logo={logo} side="back" mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
