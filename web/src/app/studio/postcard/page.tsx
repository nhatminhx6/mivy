'use client';
// Postcard · bưu thiếp · thiệp cảm ơn kèm đơn: chọn mẫu → cảnh vẽ sẵn (Hội An, ruộng bậc thang, biển, Đà Lạt, Sài Gòn,
// đầm sen) hoặc ảnh của khách → mặt sau bưu thiếp cổ điển (tem + dấu bưu điện) hoặc cảm ơn shop (mã giảm giá + QR)
// → bộ 4–6 tấm cùng phong cách → tải PDF in (lề xén 2mm, vạch cắt, mỗi tấm 2 trang trước/sau) hoặc đặt Mivy in.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X, Box as BoxIcon } from 'lucide-react';
import {
  PC_BACKS, PC_BLEED_MM, PC_FIELDS, PC_FONTS, PC_FONT_CSS, PC_FRONTS, PC_PALETTES, PC_SAMPLES, PC_SCENES, PC_SIZES, PC_TEMPLATES,
  PostcardSvg, defaultPCData, pcDims, pcScene, usePCFonts, type PCData, type PCSpec, type PCTemplate, type SceneId,
} from '@/lib/postcard-engine';
import { svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PCSpec = { ...PC_TEMPLATES[0].spec, size: '10x15', orient: 'land', printMsg: false };

async function loadImg(file: File, max = 1800): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function PostcardPage() {
  const ready = usePCFonts();
  const [spec, setSpec] = useState<PCSpec>(FIRST);
  const [data, setData] = useState<PCData>(defaultPCData('classic'));
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState('');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<HTMLDivElement | null>(null);
  const setFrontsRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const photoIn = useRef<HTMLInputElement | null>(null);
  const logoIn = useRef<HTMLInputElement | null>(null);

  const d = pcDims(spec.size, spec.orient);
  const scenes: SceneId[] = spec.set ? spec.setScenes : [spec.scene];
  const set = (p: Partial<PCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((x) => ({ ...x, [key]: v })); };

  // đổi cảnh: tiêu đề/dòng phụ còn là chữ mặc định của cảnh cũ → đổi theo cảnh mới
  const retitle = (from: SceneId, to: SceneId, x: PCData): PCData => {
    const a = pcScene(from), b = pcScene(to);
    return { ...x, title: !x.title || x.title === a.title ? b.title : x.title, caption: !x.caption || x.caption === a.caption ? b.caption : x.caption };
  };
  const pickScene = (sc: SceneId) => { setData((x) => retitle(spec.scene, sc, x)); set({ scene: sc }); };
  const pickTemplate = (t: PCTemplate) => {
    const next = { ...spec, ...t.spec };
    setSpec(next);
    const sc = pcScene(t.spec.scene);
    setData((x) => (dirty ? retitle(spec.scene, t.spec.scene, x) : { ...defaultPCData(t.spec.back), title: sc.title, caption: sc.caption }));
  };
  const toggleSetScene = (sc: SceneId) => set({
    setScenes: spec.setScenes.includes(sc)
      ? (spec.setScenes.length > 2 ? spec.setScenes.filter((x) => x !== sc) : spec.setScenes)
      : [...spec.setScenes, sc].slice(0, 6),
  });

  const slug = slugify(`buu-thiep-${data.brand || data.title || ''}`, 'buu-thiep');
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => {
    const all = [...(printRef.current?.querySelectorAll('svg[data-side]') || [])] as SVGSVGElement[];
    if (!all.length) throw new Error('Chưa dựng xong bưu thiếp, thử lại nhé.');
    return all; // đã xếp sẵn: trước 1, sau, trước 2, sau…
  };
  const pages = scenes.length * 2;
  const pdfName = `${slug}-${d.id}-${scenes.length > 1 ? `bo-${scenes.length}-tam` : '1-tam'}-file-in.pdf`;

  const downloadPng = (which: 'front' | 'back') => run(`png-${which}`, async () => {
    const el = svgOf(which === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, PC_FONT_CSS, 1800), `${slug}-mat-${which === 'front' ? 'truoc' : 'sau'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await svgsToPrintPdf(printSvgs(), PC_FONT_CSS, d, PC_BLEED_MM), pdfName));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    if (!pv) throw new Error('Chưa dựng xong bưu thiếp, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, PC_FONT_CSS, 900))
      : svgToJpeg(pv, PC_FONT_CSS, 900);
    const [file, pre] = await Promise.all([svgsToPrintPdf(printSvgs(), PC_FONT_CSS, d, PC_BLEED_MM), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const build3d = () => import('@/lib/postcard-3d').then((m) => {
    const fronts = spec.set
      ? ([...(setFrontsRef.current?.querySelectorAll('svg') || [])] as SVGSVGElement[]).slice(0, 4)
      : [svgOf(frontRef)];
    return m.postcardBuilder({ fronts, back: svgOf(demoRef), wMm: d.wMm, hMm: d.hMm, fontCss: PC_FONT_CSS, matte: spec.palette === 'kraft' });
  });
  // hook cho QC (chụp 3D lớn ở góc mặc định) — chỉ bản dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __pcSnap?: (w: number, h: number) => Promise<string> }).__pcSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  }, []);

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await loadImg(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await loadImg(f, 600)); } catch { alert('Không đọc được logo này.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = `${d.wMm} / ${d.hMm}`;
  const fieldsOf = (side: 'front' | 'back') => PC_FIELDS.filter((f) => f.side === side && (!f.when || f.when(spec)));
  const shop = spec.back === 'shop';
  const orderTitle = `${shop ? 'Thiệp cảm ơn' : 'Bưu thiếp'} ${d.name} · ${scenes.length > 1 ? `bộ ${scenes.length} tấm` : '1 mẫu'} · in 2 mặt`;
  const usePhoto = !spec.set && spec.front !== 'thanks' ? photo : '';
  const tplOn = (t: PCTemplate) => spec.front === t.spec.front && spec.back === t.spec.back && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.set === t.spec.set && (t.spec.set || spec.scene === t.spec.scene);

  const field = (k: (typeof PC_FIELDS)[number]) => (
    <label key={k.key} className={`block ${k.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{k.label}</span>
      {k.multiline
        ? <textarea className="mv-input min-h-[84px]" value={data[k.key] || ''} onChange={(e) => setField(k.key, e.target.value)} placeholder={k.ph} data-testid={`pc-${k.key}`} />
        : <input className="mv-input" value={data[k.key] || ''} onChange={(e) => setField(k.key, e.target.value)} placeholder={k.ph} data-testid={`pc-${k.key}`} />}
    </label>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Postcard · bưu thiếp" sub="Bưu thiếp du lịch, bộ bưu thiếp quà tặng, thiệp cảm ơn kèm đơn hàng — cảnh vẽ sẵn hoặc ảnh của bạn, mặt sau có tem + dấu bưu điện hoặc mã giảm giá + QR. Tải PDF in 2 mặt chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PC_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {PC_TEMPLATES.map((t) => {
                  const ts: PCSpec = { ...spec, ...t.spec };
                  const sample = dirty ? data : { ...PC_SAMPLES[t.spec.back], title: pcScene(t.spec.scene).title, caption: pcScene(t.spec.scene).caption };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${tplOn(t) ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="relative rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: ratio }}>
                        <PostcardSvg spec={ts} data={sample} side="front" scene={t.spec.set ? t.spec.setScenes[0] : undefined} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        {t.spec.set && <span className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">Bộ {t.spec.setScenes.length}</span>}
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Mặt trước">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu mặt trước</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pc-fronts">
                    {PC_FRONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ front: f.id })} className={chip(spec.front === f.id)}>{f.name}</button>)}
                  </div>
                </div>
                {spec.front !== 'thanks' && !spec.set && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Cảnh vẽ sẵn</div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" data-testid="pc-scenes">
                        {PC_SCENES.map((s) => (
                          <button key={s.id} type="button" onClick={() => pickScene(s.id)} data-testid="pc-scene"
                            className={`rounded-lg border p-1 text-left ${spec.scene === s.id && !photo ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                            <div className="rounded overflow-hidden" style={{ aspectRatio: '3 / 2' }}>
                              <PostcardSvg spec={{ ...spec, front: 'full', size: '10x15', orient: 'land' }} data={{ ...data, title: '', caption: '' }} side="front" scene={s.id} style={{ width: '100%', height: '100%', display: 'block' }} />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 truncate">{s.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
                        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button type="button" onClick={() => photoIn.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="pc-photo-btn">{photo ? 'Đổi ảnh' : 'Dùng ảnh của bạn'}</button>
                        {photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                        <span className="text-[11px] text-slate-500">Ảnh chỉ xử lý trên máy bạn, không tải lên đâu cả.</span>
                      </div>
                      <input ref={photoIn} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="pc-photo" />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">{fieldsOf('front').map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mặt sau">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="pc-backs">
                  {PC_BACKS.map((b) => <button key={b.id} type="button" onClick={() => set({ back: b.id })} className={chip(spec.back === b.id)} data-testid={`pc-back-${b.id}`}>{b.name}</button>)}
                </div>
                {spec.back === 'classic' && (
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.printMsg} onChange={(e) => set({ printMsg: e.target.checked })} data-testid="pc-printmsg" />
                    In sẵn lời nhắn (bỏ chọn = để dòng kẻ trống cho khách tự viết)
                  </label>
                )}
                {shop && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
                      {logo ? <img src={logo} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-4 h-4 text-slate-400" />}
                    </div>
                    <button type="button" onClick={() => logoIn.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="pc-logo-btn">{logo ? 'Đổi logo' : 'Tải logo shop'}</button>
                    {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ</button>}
                    <input ref={logoIn} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="pc-logo" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">{fieldsOf('back').map(field)}</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Bộ bưu thiếp">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={spec.set} onChange={(e) => set({ set: e.target.checked, front: spec.front === 'thanks' ? 'full' : spec.front })} data-testid="pc-set" />
                  Làm bộ nhiều tấm cùng phong cách (mỗi tấm 1 cảnh, chung mặt sau)
                </label>
                {spec.set && (
                  <div className="flex flex-wrap gap-1.5" data-testid="pc-set-scenes">
                    {PC_SCENES.map((s) => <button key={s.id} type="button" onClick={() => toggleSetScene(s.id)} className={chip(spec.setScenes.includes(s.id))}>{s.name}</button>)}
                    <span className="text-[11px] text-slate-500 self-center">{spec.setScenes.length} tấm · chọn 2–6 cảnh</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Màu, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pc-palettes">
                    {PC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.paper} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="pc-fonts">
                    {PC_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: 15 }}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PC_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="pc-size">{s.name}</button>)}
                    </div>
                  </div>
                  {d.w !== d.h && (
                    <div>
                      <div className="mv-label mb-1.5">Hướng</div>
                      <div className="flex gap-1.5">
                        {(['land', 'port'] as const).map((o) => <button key={o} type="button" onClick={() => set({ orient: o })} className={chip(spec.orient === o)} data-testid={`pc-orient-${o}`}>{o === 'land' ? 'Ngang' : 'Dọc'}</button>)}
                      </div>
                    </div>
                  )}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo.length, logo.length])} refitKey={`${spec.size}|${spec.orient}|${spec.set}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt trước{spec.set ? ` · tấm 1/${scenes.length}` : ''}</div>
                <div ref={frontRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="pc-front">
                  <PostcardSvg spec={spec} data={data} side="front" photo={usePhoto} logo={logo} scene={spec.set ? scenes[0] : undefined} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              {spec.set && (
                <div ref={setFrontsRef} className="grid grid-cols-3 gap-1.5" data-testid="pc-set-fronts">
                  {scenes.map((sc) => (
                    <div key={sc} className="rounded overflow-hidden shadow-sm" style={{ aspectRatio: ratio }} data-testid="pc-set-front">
                      <PostcardSvg spec={spec} data={data} side="front" scene={sc} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>
                <div ref={backRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="pc-back">
                  <PostcardSvg spec={spec} data={data} side="back" logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{d.name} · {spec.orient === 'port' && d.w !== d.h ? 'dọc' : 'ngang'} · in 2 mặt 300dpi · lề xén {PC_BLEED_MM}mm · {scenes.length > 1 ? `bộ ${scenes.length} tấm (${pages} trang PDF)` : '2 trang PDF'}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab Thành phẩm 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BoxIcon className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pc-pdf" data-pages={pages}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
            </div>
            <PrintRequest product="postcard" title={orderTitle} defaultMaterial="Couche 300 cán mờ 2 mặt" design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF đúng khổ thật, mỗi tấm 2 trang (trước + sau), nền tràn lề xén + vạch cắt, chữ đã chuyển nét — xưởng in thẳng. Mặt sau 3D có chữ viết tay mẫu cho dễ hình dung, file in để trống.</p>
          </div>
        </div>
      )}

      {/* ẩn: mặt sau có chữ viết tay mẫu (chỉ cho 3D) + bản có lề xén để xuất PDF */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={demoRef}><PostcardSvg spec={spec} data={data} side="back" logo={logo} demoHand style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef}>
            {scenes.map((sc) => (
              <div key={sc}>
                <PostcardSvg spec={spec} data={data} side="front" bleed photo={usePhoto} logo={logo} scene={spec.set ? sc : undefined} style={{ width: '100%', display: 'block' }} />
                <PostcardSvg spec={spec} data={data} side="back" bleed logo={logo} style={{ width: '100%', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
