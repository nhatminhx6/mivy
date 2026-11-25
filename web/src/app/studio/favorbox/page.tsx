'use client';
// Hộp quà cưới mini (favor box): chọn kiểu hộp (gối, vuông nắp gài xỏ ruy băng, lục giác, tam giác, hình nhà, túi xách mini)
// + mẫu theo dịp (cưới, thôi nôi, sinh nhật, Tết) → điền tên, ngày, lời cảm ơn → xem cụm hộp 3D trên bàn (có hộp mở thấy kẹo)
// → tải khuôn bế đúng khổ + khuôn ép kim + tờ in bình nhiều con, hoặc gửi yêu cầu in. Render code 100%, không AI.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  FB_DATA, FB_FIELDS, FB_FOILS, FB_FONTS, FB_FONT_CSS, FB_KINDS, FB_LAYOUTS, FB_OCCS, FB_PALETTES, FB_TPLS,
  FaceSvg, FavorDieline, FavorSheet, FavorThumb, fbDieline, fbFaces, fbSize, fbSizesFor, fbSpecFor, fbTpl, sheetLayout, useFbFonts,
  type FbData, type FbKind, type FbSpec, type Occ,
} from '@/lib/favorbox-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas } from '@/lib/svg-export';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const build3d = (spec: FbSpec, data: FbData, logo: string) => () => import('@/lib/favorbox-3d').then((m) => m.favorboxBuilder(spec, data, logo || undefined));
const kindOf = (v: string | null): FbKind => (FB_KINDS.some((k) => k.id === v) ? (v as FbKind) : 'pillow');

async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 800 / Math.max(im.width, im.height));
    const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function FavorboxPage() {
  return <Suspense fallback={null}><FavorStudio /></Suspense>;
}

function FavorStudio() {
  const ready = useFbFonts();
  const qKind = kindOf(useSearchParams().get('kind'));
  const [spec, setSpec] = useState<FbSpec>(() => fbSpecFor(qKind));
  const [data, setData] = useState<FbData>(() => ({ ...FB_DATA.cuoi }));
  const [logo, setLogo] = useState('');
  const [touched, setTouched] = useState(false);
  const [occ, setOcc] = useState<Occ | 'all'>('all');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const view3d = useRef<Mockup3DHandle | null>(null);
  const hidden = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<FbSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setTouched(true); setData((d) => ({ ...d, [key]: v })); };
  const pickKind = (k: FbKind) => { if (k !== spec.kind) set({ kind: k, size: fbSizesFor(k)[0].id }); };
  const pickTpl = (id: string) => {
    const t = fbTpl(id);
    set({ tpl: t.id, palette: t.palette, font: t.font, foil: t.palette === 'kraft' ? 'none' : t.foil, layout: t.layout });
    if (!touched) setData({ ...FB_DATA[t.occ] });
  };
  useEffect(() => { pickKind(qKind); }, [qKind]); // eslint-disable-line react-hooks/exhaustive-deps

  const sz = fbSize(spec.size);
  const kind = FB_KINDS.find((k) => k.id === spec.kind)!;
  const die = ready ? fbDieline(spec) : null;
  const sheet = die ? sheetLayout(die) : null;
  const pal = FB_PALETTES.find((p) => p.id === spec.palette)!;
  const foilOn = spec.foil !== 'none' && !pal.kraft;
  const slug = slugify(`hop-qua-${spec.kind}-${data.names || ''}`, 'hop-qua');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (sel: string) => hidden.current?.querySelector(`[data-testid="${sel}"]`) as SVGSVGElement | null;
  const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const shot = async (px: number, watermark = false) => {
    if (!view3d.current) throw new Error('Mở tab "Thành phẩm 3D" rồi thử lại nhé.');
    return view3d.current.snapshot(px, Math.round(px * 0.75), { watermark });
  };
  // PDF in: trang 1 khuôn 1 con (đúng khổ) · trang 2 khuôn ép kim (nếu có) · trang cuối tờ in bình nhiều con
  const pdfOf = async () => {
    if (!die) throw new Error('Chưa dựng xong khuôn, thử lại nhé.');
    const { jsPDF } = await import('jspdf');
    const pages: { sel: string; w: number; h: number; dpi: number; png?: boolean }[] = [{ sel: 'fb-die', w: die.W, h: die.H, dpi: 300 }];
    if (foilOn) pages.push({ sel: 'fb-mask', w: die.W, h: die.H, dpi: 300, png: true });
    pages.push({ sel: 'fb-sheet', w: 325, h: 430, dpi: 150 });
    let pdf: InstanceType<typeof jsPDF> | null = null;
    for (const p of pages) {
      const el = svgOf(p.sel); if (!el) throw new Error('Thiếu bản in, thử lại nhé.');
      const pw = Math.round((p.w / 25.4) * p.dpi), ph = Math.round((p.h / 25.4) * p.dpi);
      const cv = await svgToCanvas(await selfContainedSvg(el, FB_FONT_CSS, { outline: true }), pw, ph, '#ffffff');
      const orient = p.w >= p.h ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [p.w, p.h], orientation: orient, compress: true });
      else pdf.addPage([p.w, p.h], orient);
      pdf.addImage(p.png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92), p.png ? 'PNG' : 'JPEG', 0, 0, p.w, p.h, undefined, 'FAST');
    }
    return pdf!.output('blob');
  };
  const downloadPng = () => run('png', async () => downloadBlob(await toBlob(await shot(1600, true), 'image/png'), `${slug}-3d.png`));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfOf(), `${slug}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => { const el = svgOf('fb-die'); if (el) downloadBlob(await svgFileBlob(el, FB_FONT_CSS), `${slug}-khuon-be.svg`); });
  const downloadSheet = () => run('sheet', async () => { const el = svgOf('fb-sheet'); if (el) downloadBlob(await svgFileBlob(el, FB_FONT_CSS), `${slug}-to-in-${sheet?.n || 0}con.svg`); });
  const makeFiles = async () => {
    const [file, preview] = await Promise.all([pdfOf(), shot(1200).then((c) => toBlob(c, 'image/jpeg', 0.86))]);
    return { file, fileName: `${slug}-file-in.pdf`, preview };
  };

  // hook QC: chụp 3D lớn ở góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __fvSnap?: (w: number, h: number, solo?: boolean) => Promise<string> }).__fvSnap = async (w, h, solo) => {
      const core = await import('@/lib/mockup3d');
      const m = await import('@/lib/favorbox-3d');
      return (await core.snapshot(m.favorboxBuilder(spec, data, logo || undefined, !!solo), w, h)).toDataURL('image/png');
    };
  }, [spec, data, logo]);

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo.'); } };
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = FB_TPLS.filter((t) => occ === 'all' || t.occ === occ);
  const orderTitle = `${kind.name} ${sz.name}${foilOn ? ` · ép ${FB_FOILS.find((f) => f.id === spec.foil)!.name.toLowerCase()}` : ''}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hộp quà cưới mini" sub="Hộp quà cảm ơn khách dự tiệc cưới, thôi nôi, sinh nhật, Tết — chọn kiểu hộp, điền tên & ngày, xem cụm hộp 3D có kẹo bên trong, tải khuôn bế + khuôn ép kim + tờ in bình sẵn gửi xưởng." />

      <div className="mv-seg mb-5 max-w-3xl flex-wrap" role="tablist">
        {FB_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={spec.kind === k.id} className="mv-seg-btn flex-1 !text-xs" data-testid="fb-kind" title={k.hint}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${FB_TPLS.length})`}>
              <div className="flex flex-wrap gap-1.5 mb-3" data-testid="fb-occs">
                <button type="button" onClick={() => setOcc('all')} className={chip(occ === 'all')}>Tất cả</button>
                {FB_OCCS.map((o) => <button key={o.id} type="button" onClick={() => setOcc(o.id)} className={chip(occ === o.id)}>{o.name}</button>)}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.tpl === t.id;
                  const tSpec: FbSpec = { ...spec, tpl: t.id, palette: t.palette, font: t.font, foil: t.palette === 'kraft' ? 'none' : t.foil, layout: t.layout };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t.id)} data-testid="fb-tpl" data-id={t.id} data-active={on}
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-[#EFEBE4] aspect-square grid place-items-center p-1.5">
                        <FavorThumb spec={tSpec} data={touched ? data : FB_DATA[t.occ]} logo={logo || undefined} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.18))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {FB_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fb-${f.key}`} />
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Logo / chữ lồng riêng (tuỳ chọn)</span>
                  <div className="flex items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi ảnh' : 'Tải ảnh lên'}
                      <input type="file" accept="image/*" className="hidden" data-testid="fb-logo" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {logo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="w-9 h-9 rounded-full object-cover border border-mv-hair bg-white" />
                        <button type="button" onClick={() => setLogo('')} className="text-xs text-slate-400 hover:text-mv-fg inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>
                      </>
                    )}
                    {!logo && <span className="text-[11px] text-slate-500">Không có thì tự tạo chữ lồng từ tên (vd B &amp; H). Ảnh xử lý ngay trên máy.</span>}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Kích thước, bố cục, màu, ép kim">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kích thước ({kind.hint.toLowerCase()})</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fb-sizes">
                    {fbSizesFor(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="fb-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục mặt chính</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fb-layouts">
                    {FB_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid="fb-layout">{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="fb-palettes">
                    {FB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id, foil: p.kraft ? 'none' : spec.foil })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair grid place-items-center" style={{ background: p.paper }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.accent }} /></span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="fb-fonts">
                    {FB_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.script}'`, fontSize: 15 }}>{f.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ép kim {pal.kraft && <span className="text-slate-500 normal-case">(giấy kraft không ép kim)</span>}</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fb-foils">
                    {FB_FOILS.map((f) => (
                      <button key={f.id} type="button" disabled={pal.kraft && f.id !== 'none'} onClick={() => set({ foil: f.id })} className={`${chip(spec.foil === f.id)} disabled:opacity-40 inline-flex items-center gap-1.5`} data-testid="fb-foil">
                        {f.color && <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${f.color}, #fff8, ${f.color})` }} />}{f.name}
                      </button>
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
            {tab === '3d' ? (
              <Mockup3DView ref={view3d} build={build3d(spec, data, logo)} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={350} className="rounded-lg aspect-[4/3] w-full" />
            ) : die && (
              <div className="space-y-2" data-testid="fb-flat">
                <div className="rounded-lg bg-[#EFEBE4] p-3 grid place-items-center">
                  <FavorThumb spec={spec} data={data} logo={logo || undefined} style={{ maxWidth: '62%', maxHeight: 260, display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.2))' }} />
                </div>
                <div className="rounded-lg overflow-auto bg-white border border-mv-hair max-h-[52vh]">
                  <FavorDieline spec={spec} data={data} logo={logo || undefined} mode="preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center" data-testid="fb-info" data-per-sheet={sheet?.n || 0}>
              {kind.name} {sz.name}{die ? ` · khuôn ${Math.round(die.W)}×${Math.round(die.H)}mm · ${sheet?.n || 0} hộp/tờ 32,5×43cm` : ''}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh' : undefined} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="fb-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="fb-pdf" data-pages={1 + (foilOn ? 1 : 0) + 1}>{busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in</button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fb-svg" title="Khuôn 1 con, chữ đã outline, lớp CutContour + Fold">{busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn</button>
              <button type="button" onClick={downloadSheet} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fb-sheet-svg" title="Tờ in 32,5×43cm bình nhiều con">{busy === 'sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG tờ in</button>
            </div>
            <PrintRequest product="favorbox" title={orderTitle} defaultMaterial={pal.kraft ? 'Hộp kraft + ruy băng' : 'Hộp quà cưới giấy mỹ thuật'} design={{ spec, data, logo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm: khuôn 1 con đúng khổ (nét hồng = cắt, nét xanh đứt = gấp{spec.kind === 'pillow' ? ', gấp cong 2 đầu' : ''}{spec.kind === 'square' ? ', 2 lỗ xỏ ruy băng' : ''}{spec.kind === 'bag' ? ', lỗ quai' : ''}), {foilOn ? 'khuôn ép kim (đen = nhũ), ' : ''}tờ in bình {sheet?.n || 0} con. Mivy chốt giấy + khuôn với xưởng rồi in, bế, dán + giao (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div ref={hidden} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1000, pointerEvents: 'none' }}>
          <FavorDieline spec={spec} data={data} logo={logo || undefined} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} />
          {foilOn && <FavorDieline spec={spec} data={data} logo={logo || undefined} mode="mask" style={{ width: '100%', height: 'auto', display: 'block' }} />}
          <FavorSheet spec={spec} data={data} logo={logo || undefined} style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div data-testid="fb-faces">
            {fbFaces(spec).map((f) => <FaceSvg key={f.id} spec={spec} data={data} logo={logo || undefined} face={f} style={{ width: 300, height: 'auto', display: 'block' }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
