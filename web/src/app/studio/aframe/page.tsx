'use client';
// Bảng chữ A vỉa hè: chọn mẫu (bảng đen phấn / hiện đại / gỗ) → điền menu, khuyến mãi, giờ mở cửa + QR → chọn mặt sau,
// khổ, khung → xem thành phẩm 3D đứng trước quán → tải file in 2 mặt đúng khổ (bleed + vạch cắt) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  AF_ARTS, AF_BLEED_MM, AF_DPI, AF_FONTS, AF_FONT_CSS, AF_GROUPS, AF_LAYOUTS, AF_PALETTES, AF_SAMPLES, AF_SIZES, AF_STYLE_NAME, AF_TEMPLATES,
  AFrameSvg, afPalette, afSize, defaultAFData, faceLayout, layoutsOf, useAFFonts,
  type AFData, type AFLayoutId, type AFSpec, type AFStyle, type AFTemplate,
} from '@/lib/aframe-engine';
import type { AFFrame } from '@/lib/aframe-3d';
import { svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: AFTemplate = AF_TEMPLATES[0];
const FRAME_OF: Record<AFStyle, AFFrame> = { chalk: 'oak', modern: 'black', wood: 'black' };
const FRAMES: { id: AFFrame; name: string }[] = [{ id: 'oak', name: 'Khung gỗ sồi' }, { id: 'walnut', name: 'Khung gỗ óc chó' }, { id: 'black', name: 'Khung sắt đen' }];

// ảnh khách: thu nhỏ ngay trên máy (không gửi đi đâu) → dataURL
async function fileToDataUrl(file: File, maxSide: number, type: 'image/jpeg' | 'image/png'): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL(type, 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function AFramePage() {
  const ready = useAFFonts();
  const [spec, setSpec] = useState<AFSpec>({ ...FIRST.spec, size: '60x90' });
  const [data, setData] = useState<AFData>(defaultAFData(FIRST.shop));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState('');
  const [logo, setLogo] = useState('');
  const [frame, setFrame] = useState<AFFrame>(FRAME_OF[afPalette(FIRST.spec.palette).style]);
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const srcFront = useRef<HTMLDivElement | null>(null);
  const srcBack = useRef<HTMLDivElement | null>(null);
  const prFront = useRef<HTMLDivElement | null>(null);
  const prBack = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = afSize(spec.size);
  const pal = afPalette(spec.palette);
  const set = (p: Partial<AFSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTemplate = (t: AFTemplate) => {
    setSpec((s) => ({ ...t.spec, size: s.size }));
    setFrame(FRAME_OF[afPalette(t.spec.palette).style]);
    if (!dirty) setData(defaultAFData(t.shop));
  };
  const slug = slugify(`bang-chu-a-${data.brand || ''}`, 'bang-chu-a');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const pngOf = (face: 'front' | 'back') => run(`png-${face}`, async () => {
    const el = svgOf(face === 'front' ? srcFront : srcBack); if (!el) return;
    downloadBlob(await svgToPng(el, AF_FONT_CSS, 1400), `${slug}-${face === 'front' ? 'mat-truoc' : 'mat-sau'}.png`);
  });
  const makePdf = async () => {
    const a = svgOf(prFront), b = svgOf(prBack);
    if (!a || !b) throw new Error('Chưa dựng xong bảng, thử lại nhé.');
    return svgsToPrintPdf([a, b], AF_FONT_CSS, sz, AF_BLEED_MM, AF_DPI);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${sz.id}-file-in-2-mat.pdf`));
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 2000, { watermark: true })), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const file = await makePdf();
    const preview = view3d.current
      ? await toBlob(await view3d.current.snapshot(900, 1125), 'image/jpeg', 0.86)
      : await svgToPng(svgOf(srcFront)!, AF_FONT_CSS, 700, { watermark: false });
    return { file, fileName: `${slug}-${sz.id}-file-in-2-mat.pdf`, preview };
  };

  const build3d = () => import('@/lib/aframe-3d').then((m) => m.aframeBuilder({
    front: svgOf(srcFront), back: svgOf(srcBack), wMm: sz.wMm, hMm: sz.hMm, fontCss: AF_FONT_CSS, frame, gloss: pal.style === 'modern',
  }));
  // hook QC (chỉ bản dev): chụp 3D đúng góc mặc định
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __afSnap?: (w: number, h: number) => Promise<string> }).__afSnap = async (w, h) => {
      const core = await import('@/lib/mockup3d');
      const c = await core.snapshot(await build3d(), w, h);
      return c.toDataURL('image/png');
    };
  });

  const onPhoto = async (f?: File | null, kind: 'photo' | 'logo' = 'photo') => {
    if (!f) return;
    const url = await fileToDataUrl(f, kind === 'photo' ? 1800 : 700, kind === 'photo' ? 'image/jpeg' : 'image/png');
    if (kind === 'photo') setPhoto(url); else setLogo(url);
  };

  const used = layoutsOf(spec);
  const groups = AF_GROUPS.filter((g) => g.layouts === 'all' || g.layouts.some((l) => used.includes(l)));
  const usesArt = used.some((l) => ['promo', 'hours', 'food', 'service', 'welcome'].includes(l));
  const layoutName = (id: AFLayoutId) => AF_LAYOUTS.find((l) => l.id === id)?.name || id;
  const orderTitle = `Bảng chữ A ${sz.name} · ${layoutName(spec.front)} / ${spec.back === 'same' ? 'giống mặt trước' : layoutName(spec.back)}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const spin = (k: string) => busy === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null;
  const rebuild = JSON.stringify([spec, data, frame, photo.length, logo.length]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng chữ A vỉa hè" sub="Bảng menu đặt trước quán — 2 mặt in, khung gỗ hoặc sắt. Chọn mẫu bảng đen phấn, hiện đại hay gỗ, điền menu / khuyến mãi / giờ mở cửa + QR, xem thành phẩm 3D rồi tải file in đúng khổ hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${AF_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {AF_TEMPLATES.map((t) => {
                  const on = spec.front === t.spec.front && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.art === t.spec.art;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="af-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <AFrameSvg spec={{ ...t.spec, size: spec.size }} data={dirty ? data : AF_SAMPLES[t.shop]} face="front" photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Hai mặt bảng">
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Mặt trước</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="af-front">
                    {AF_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ front: l.id })} className={chip(spec.front === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Mặt sau</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="af-back">
                    <button type="button" onClick={() => set({ back: 'same' })} className={chip(spec.back === 'same')}>Giống mặt trước</button>
                    {AF_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ back: l.id })} className={chip(spec.back === l.id)}>{l.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.id}>
                    <div className="text-xs font-bold text-mv-fg mb-2">{g.title}</div>
                    <div className="grid grid-cols-2 gap-3">
                      {g.fields.map((f) => (
                        <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                          <span className="mv-label block mb-1.5">{f.label}</span>
                          {f.multiline
                            ? <textarea className="mv-input min-h-[96px]" rows={4} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`af-${f.key}`} />
                            : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`af-${f.key}`} />}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  {([['photo', 'Ảnh món / không gian quán', photo], ['logo', 'Logo quán', logo]] as const).map(([k, label, val]) => (
                    <div key={k} className="col-span-2 sm:col-span-1">
                      <div className="mv-label mb-1.5">{label} <span className="text-slate-500 font-normal">(tuỳ chọn, ảnh ở lại máy anh/chị)</span></div>
                      <div className="flex items-center gap-2">
                        <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5" /> {val ? 'Đổi ảnh' : 'Tải ảnh lên'}
                          <input type="file" accept="image/*" className="hidden" data-testid={`af-${k}`} onChange={(e) => { void onPhoto(e.target.files?.[0], k); e.target.value = ''; }} />
                        </label>
                        {val && (
                          <>
                            <img src={val} alt="" className="w-9 h-9 rounded-md object-cover border border-mv-hair" />
                            <button type="button" onClick={() => (k === 'photo' ? setPhoto('') : setLogo(''))} className="text-slate-400 hover:text-mv-fg" aria-label="Bỏ ảnh"><X className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu, font, khổ & khung">
              <div className="space-y-4">
                {(['chalk', 'modern', 'wood'] as AFStyle[]).map((st) => (
                  <div key={st}>
                    <div className="mv-label mb-1.5">{AF_STYLE_NAME[st]}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid={`af-palettes-${st}`}>
                      {AF_PALETTES.filter((p) => p.style === st).map((p) => (
                        <button key={p.id} type="button" onClick={() => { set({ palette: p.id }); if (afPalette(spec.palette).style !== st) setFrame(FRAME_OF[st]); }} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                          <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 55%, ${p.accent} 55%)` }} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="af-fonts">
                    {AF_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                {usesArt && (
                  <div>
                    <div className="mv-label mb-1.5">Hình minh hoạ (khi chưa có ảnh)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="af-arts">
                      {AF_ARTS.map((a) => <button key={a.id} type="button" onClick={() => set({ art: a.id })} className={chip(spec.art === a.id)}>{a.name}</button>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Khổ mặt in</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="af-sizes">
                    {AF_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khung bảng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="af-frames">
                    {FRAMES.map((f) => <button key={f.id} type="button" onClick={() => setFrame(f.id)} className={chip(frame === f.id)}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuild} refitKey={spec.size} debounce={450} className="rounded-lg aspect-[4/5] w-full max-h-[64vh]" />
            ) : (
              <div className="grid grid-cols-2 gap-2" data-testid="af-flat">
                {(['front', 'back'] as const).map((face) => (
                  <div key={face}>
                    <div className="rounded-md overflow-hidden shadow-[0_8px_24px_-10px_rgba(15,23,42,0.4)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid={`af-flat-${face}`}>
                      <AFrameSvg spec={spec} data={data} face={face} photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                    <div className="text-[11px] text-slate-400 text-center mt-1">{face === 'front' ? 'Mặt trước' : 'Mặt sau'} · {layoutName(faceLayout(spec, face))}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">Mặt in {sz.name} · 2 mặt · bleed {AF_BLEED_MM}mm · vạch cắt · {FRAMES.find((f) => f.id === frame)?.name.toLowerCase()}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => pngOf('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="af-png-front">{spin('png-front') || <Download className="w-3.5 h-3.5" />} PNG mặt trước</button>
              <button type="button" onClick={() => pngOf('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="af-png-back">{spin('png-back') || <Download className="w-3.5 h-3.5" />} PNG mặt sau</button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-50" data-testid="af-3d">{spin('3d') || <Download className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="af-pdf">{spin('pdf') || <FileDown className="w-3.5 h-3.5" />} PDF in 2 mặt</button>
            </div>
            <PrintRequest product="aframe" title={orderTitle} defaultMaterial={frame === 'black' ? 'Bảng chữ A sắt + alu in UV' : 'Bảng chữ A khung gỗ + bạt in'} design={{ spec, data, frame }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng khổ mặt bảng (2 trang: trước + sau), chữ đã outline. Mivy lo khung + in + giao tận quán (TP.HCM).</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 420, pointerEvents: 'none' }}>
          <div ref={srcFront} data-testid="af-src-front"><AFrameSvg spec={spec} data={data} face="front" photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={srcBack} data-testid="af-src-back"><AFrameSvg spec={spec} data={data} face="back" photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={prFront}><AFrameSvg spec={spec} data={data} face="front" bleed photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={prBack}><AFrameSvg spec={spec} data={data} face="back" bleed photo={photo || undefined} logo={logo || undefined} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
