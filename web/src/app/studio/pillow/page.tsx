'use client';
// Gối in hình: chọn mẫu (sinh nhật, cặp đôi đếm ngày, gia đình, thú cưng, câu chữ, decor quán…) → tải ảnh (giữ trên máy,
// zoom + kéo khung) → điền chữ → chọn khổ/vải/mặt sau → xem gối 3D phồng thật → tải file in 2 mặt (chừa đường may 15mm)
// hoặc gửi yêu cầu in. Mẫu = bố cục × màu × font, render code 100%, ô ảnh chưa có ảnh thì hiện tranh vẽ bằng code.

import { useRef, useState, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  PW_FONTS, PW_FONT_CSS, PW_LAYOUTS, PW_MATERIALS, PW_PALETTES, PW_SA_MM, PW_SIZES, PW_TEMPLATES,
  PillowSvg, defaultPWData, pwLayout, pwPalette, pwSize, usePWFonts, type PWData, type PWPhotos, type PWSpec,
} from '@/lib/pillow-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PWSpec = { layout: 'bday', palette: 'rose', font: 'dancing', size: 'sq40', material: 'velvet', back: 'pattern' };

// ảnh khách: thu nhỏ còn ≤1800px (gối 45cm in 100dpi là dư nét), không gửi đi đâu
async function loadPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

// Đổi bố cục khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu bố cục mới
function switchData(d: PWData, from: string, to: string): PWData {
  const oldS = pwLayout(from).sample, next: PWData = { ...defaultPWData(to) };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

const MM_PER_IN = 25.4;
/** PDF in vải: mỗi mặt 1 trang đúng khổ thật (thành phẩm + 2 × chừa may), chữ outline, có nét may + nét cắt */
async function pillowPdf(els: SVGSVGElement[], wMm: number, hMm: number, dpi = 150): Promise<Blob> {
  const pw = wMm + PW_SA_MM * 2, ph = hMm + PW_SA_MM * 2;
  const outW = Math.round((pw / MM_PER_IN) * dpi), outH = Math.round((ph / MM_PER_IN) * dpi);
  const { jsPDF } = await import('jspdf');
  const orientation = pw >= ph ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [pw, ph], orientation, compress: true });
  for (let i = 0; i < els.length; i++) {
    if (i > 0) pdf.addPage([pw, ph], orientation);
    const c = await svgToCanvas(await selfContainedSvg(els[i], PW_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function PillowPage() {
  const ready = usePWFonts();
  const [spec, setSpec] = useState<PWSpec>(FIRST);
  const [data, setData] = useState<PWData>(defaultPWData(FIRST.layout));
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<PWPhotos>({});
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const printFrontRef = useRef<HTMLDivElement | null>(null);
  const printBackRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = pwSize(spec.size), L = pwLayout(spec.layout), pal = pwPalette(spec.palette);
  const set = (p: Partial<PWSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: (typeof PW_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => (dirty ? switchData(d, spec.layout, t.spec.layout) : defaultPWData(t.spec.layout)));
    set(t.spec);
  };
  const setPhoto = (slot: string, p: Partial<NonNullable<PWPhotos[string]>> | null) =>
    setPhotos((ph) => ({ ...ph, [slot]: p === null ? undefined : { src: '', zoom: 1, x: 0, y: 0, ...ph[slot], ...p } }));
  const onFile = async (slot: string, f?: File | null) => {
    if (!f) return;
    try { setPhoto(slot, { src: await loadPhoto(f), zoom: 1, x: 0, y: 0 }); } catch { alert('Không đọc được ảnh này, thử ảnh khác nhé.'); }
  };

  const slug = slugify(`goi-${data.name || data.title || ''}`, 'goi-in-hinh');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const toJpeg = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const toPng = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));

  const downloadPng = () => run('png', async () => {
    const el = svgOf(frontRef); if (!el) return;
    downloadBlob(await svgToPng(el, PW_FONT_CSS, 1600), `${slug}-mat-truoc.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    downloadBlob(await toPng(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });
  const makePdf = async () => {
    const fr = svgOf(printFrontRef), bk = svgOf(printBackRef);
    if (!fr || !bk) throw new Error('Chưa dựng xong gối, thử lại nhé.');
    return pillowPdf([fr, bk], sz.wMm, sz.hMm);
  };
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${sz.id}-file-in-2-mat.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printFrontRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, PW_FONT_CSS), `${slug}-mat-truoc-file-in.svg`);
  });
  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    if (!pv) throw new Error('Chưa dựng xong gối, thử lại nhé.');
    const [file, preview] = await Promise.all([
      makePdf(),
      view3d.current ? view3d.current.snapshot(1200, 900).then(toJpeg).catch(() => svgToJpeg(pv, PW_FONT_CSS, 900)) : svgToJpeg(pv, PW_FONT_CSS, 900),
    ]);
    return { file, fileName: `${slug}-${sz.id}-file-in-2-mat.pdf`, preview };
  };

  const build3d = () => import('@/lib/pillow-3d').then((m) => m.pillowBuilder({
    front: svgOf(frontRef), back: svgOf(backRef), wMm: sz.wMm, hMm: sz.hMm, round: sz.shape === 'round',
    material: spec.material, piping: pal.piping, fontCss: PW_FONT_CSS,
  }));
  // hook QC (dev): chụp 3D ở góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __pwSnap?: (w: number, h: number) => Promise<string> }).__pwSnap = async (w, h) => {
      const core = await import('@/lib/mockup3d');
      return (await core.snapshot(await build3d(), w, h)).toDataURL('image/png');
    };
  }

  const matName = PW_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const orderTitle = `Gối in hình ${sz.name} · ${matName} · ${L.name}`;
  const defaultMaterial = spec.material === 'velvet' ? 'Gối vuông vải nhung in 2 mặt' : 'Gối vải canvas';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tplData = (layout: string) => (dirty ? switchData(data, spec.layout, layout) : defaultPWData(layout));
  const aspect = `${sz.wMm} / ${sz.hMm}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Gối in hình" sub="In ảnh, tên, câu chữ lên gối nhung/canvas — quà sinh nhật, cặp đôi, gia đình, thú cưng, decor quán. Xem gối 3D, tải file in 2 mặt hoặc đặt Mivy in + giao." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PW_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {PW_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pw-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className={`overflow-hidden bg-ink/[0.04] shadow-sm ${sz.shape === 'round' ? 'rounded-full' : 'rounded-lg'}`} style={{ aspectRatio: aspect }}>
                        <PillowSvg spec={{ ...spec, ...t.spec }} data={tplData(t.spec.layout)} photos={t.spec.layout === spec.layout ? photos : {}} face="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {L.photos.length > 0 && (
              <CollapsibleSection title="2 · Ảnh của bạn">
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500">Ảnh chỉ nằm trên máy bạn để dựng thiết kế, không tải lên đâu. Chưa có ảnh thì gối hiện tranh minh hoạ.</p>
                  {L.photos.map((s) => {
                    const ph = photos[s.id];
                    return (
                      <div key={s.id} className="rounded-xl border border-mv-hair p-3 space-y-2.5" data-testid={`pw-slot-${s.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-mv-fg flex-1">{s.label}</span>
                          <label className="mv-btn mv-btn-ghost !py-1.5 !text-xs cursor-pointer">
                            <ImagePlus className="w-3.5 h-3.5" /> {ph?.src ? 'Đổi ảnh' : 'Tải ảnh'}
                            <input type="file" accept="image/*" className="hidden" data-testid={`pw-photo-${s.id}`} onChange={(e) => { void onFile(s.id, e.target.files?.[0]); e.target.value = ''; }} />
                          </label>
                          {ph?.src && <button type="button" onClick={() => setPhoto(s.id, null)} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" aria-label="Bỏ ảnh"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                        {ph?.src && (
                          <div className="grid grid-cols-3 gap-3">
                            {([['zoom', 'Phóng to', 1, 3], ['x', 'Trái ↔ phải', -1, 1], ['y', 'Lên ↕ xuống', -1, 1]] as const).map(([k, lb, mn, mx]) => (
                              <label key={k} className="block">
                                <span className="text-[11px] text-slate-400">{lb}</span>
                                <input type="range" min={mn} max={mx} step={0.01} value={ph[k]} onChange={(e) => setPhoto(s.id, { [k]: Number(e.target.value) })} className="w-full" data-testid={`pw-${k}-${s.id}`} />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title={`${L.photos.length ? 3 : 2} · Chữ trên gối`}>
              <div className="grid grid-cols-2 gap-3">
                {L.fields.map((f) => (
                  <label key={f.key} className={`block ${f.type === 'area' || f.key === 'title' || f.key === 'sub' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.type === 'area'
                      ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pw-${f.key}`} />
                      : <input className="mv-input" type={f.type === 'date' ? 'date' : 'text'} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pw-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`${L.photos.length ? 4 : 3} · Khổ, vải, màu & mặt sau`}>
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ gối</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pw-sizes">
                    {PW_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu vải</div>
                  <div className="grid grid-cols-2 gap-1.5" data-testid="pw-materials">
                    {PW_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`}>
                        <div>{m.name}</div><div className="text-[10px] text-slate-500 font-normal">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Mặt sau</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pw-back">
                    {([['pattern', 'Hoạ tiết + chữ'], ['same', 'Giống mặt trước'], ['plain', 'Trơn màu + chữ']] as const).map(([id, nm]) => <button key={id} type="button" onClick={() => set({ back: id })} className={chip(spec.back === id)}>{nm}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pw-palettes">
                    {PW_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ lớn</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="pw-fonts">
                    {PW_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: 15 }}>
                        {data.name || 'Thu Hà'}
                      </button>
                    ))}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, Object.values(photos).map((p) => p ? `${p.src.length}:${p.zoom}:${p.x}:${p.y}` : '')])}
                refitKey={spec.size} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`grid grid-cols-2 gap-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="pw-flat">
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt trước</div>
                <div ref={frontRef} className={`overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${sz.shape === 'round' ? 'rounded-full' : 'rounded-lg'}`} style={{ aspectRatio: aspect }} data-testid="pw-front">
                  <PillowSvg spec={spec} data={data} photos={photos} face="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>
                <div ref={backRef} className={`overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] ${sz.shape === 'round' ? 'rounded-full' : 'rounded-lg'}`} style={{ aspectRatio: aspect }} data-testid="pw-back-face">
                  <PillowSvg spec={spec} data={data} photos={photos} face="back" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} cm · {matName} · in chuyển nhiệt 2 mặt · chừa may {PW_SA_MM / 10}cm mỗi cạnh</div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pw-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pw-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pw-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pw-svg" title="Mặt trước dạng vector, chữ đã outline, có nét may + nét cắt">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG
              </button>
            </div>
            <PrintRequest product="pillow" title={orderTitle} defaultMaterial={defaultMaterial} design={{ spec, data, photos: Object.keys(photos).filter((k) => photos[k]?.src) }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in: 2 trang (mặt trước, mặt sau) đúng khổ vải thật — nét đỏ đứt là đường may (mép gối), nét đen là đường cắt vải. Gối phồng sẽ ăn mất khoảng 3cm sát mép, nên chữ đã được đặt lùi vào trong.</p>
          </div>
        </div>
      )}

      {/* bản in (ẩn): nới chừa may + nét may/cắt */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={printFrontRef} data-testid="pw-print-front"><PillowSvg spec={spec} data={data} photos={photos} face="front" print style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printBackRef} data-testid="pw-print-back"><PillowSvg spec={spec} data={data} photos={photos} face="back" print style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
