'use client';
// Decal dán kính cửa hàng: chọn loại decal (cắt chữ / in PP / 1 chiều) → mẫu → khổ kính thật → nội dung (giờ mở cửa,
// wifi QR, thanh toán, mở cửa, đẩy/kéo, dải cản va, khuyến mãi) đặt đúng chiều cao thật → xem mặt tiền 3D →
// tải file cắt (chỉ CutContour, chữ đã outline) / file in đúng khổ (có lật gương khi dán mặt trong) hoặc gửi yêu cầu in.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  WD_BLOCKS, WD_FIELDS, WD_FIRST, WD_FONTS, WD_FONT_CSS, WD_GLASS, WD_PALETTES, WD_TEMPLATES, WD_TYPES, WD_VINYLS,
  WindowDecalSvg, defaultWDData, wdGeom, wdHiddenNote, wdVinyl, useWDFonts, type WDBlock, type WDData, type WDSpec, type WDTemplate, type WDType,
} from '@/lib/windowdecal-engine';
import { selfContainedSvg, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

function fileToDataUrl(f: File, max = 1600): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

const MATERIAL: Record<WDType, string> = { cut: 'Decal cắt chữ (không nền)', print: 'Decal PP dán kính trong nhà', oneway: 'Decal 1 chiều (one-way vision)' };

export default function WindowDecalPage() {
  const ready = useWDFonts();
  const [spec, setSpec] = useState<WDSpec>(WD_FIRST);
  const [data, setData] = useState<WDData>(defaultWDData());
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const set = (p: Partial<WDSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const geom = wdGeom(spec);
  const slug = slugify(`decal-kinh-${data.brand || 'shop'}`, 'decal-kinh');
  const applyTpl = (t: WDTemplate) => setSpec((s) => ({ ...s, ...t.spec, inside: t.spec.type === 'oneway' ? false : s.inside }));
  const setType = (t: WDType) => { if (t !== spec.type) applyTpl(WD_TEMPLATES.find((x) => x.spec.type === t)!); };
  const toggleBlock = (b: WDBlock) => set({ blocks: spec.blocks.includes(b) ? spec.blocks.filter((x) => x !== b) : [...spec.blocks, b] });

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const { W, H } = geom;
  const dpi = Math.max(40, Math.min(150, Math.floor(6000 / (Math.max(W, H) / 25.4))));

  // file cắt / file in vector: outline chữ; decal cắt → mọi nét trong CutContour thành đường cắt (không tô)
  const vectorFile = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    const c = await selfContainedSvg(el, WD_FONT_CSS, { outline: true });
    if (spec.type === 'cut') {
      c.querySelector('#NenThamKhao')?.remove();
      c.querySelectorAll('defs').forEach((d) => d.remove()); // gradient/pattern xem trước — file cắt không cần
      for (const id of ['CutContour', 'CutContour-DecalMo']) {
        c.querySelector(`[id="${id}"]`)?.querySelectorAll('path, rect, circle, text, polygon').forEach((n) => {
          n.setAttribute('fill', 'none'); n.setAttribute('stroke', '#FF00FF'); n.setAttribute('stroke-width', '0.3');
          n.removeAttribute('opacity'); n.removeAttribute('mask'); n.removeAttribute('fill-rule');
        });
      }
      if (!c.querySelector('text')) c.querySelectorAll('style').forEach((s) => s.remove());
    }
    return new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' });
  };
  // PDF đúng khổ kính (ảnh JPEG nén, dpi tự hạ cho khổ lớn)
  const printPdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    const pw = Math.round((W / 25.4) * dpi), ph = Math.round((H / 25.4) * dpi);
    const cv = await svgToCanvas(await selfContainedSvg(el, WD_FONT_CSS, { outline: true }), pw, ph, '#ffffff');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [W, H], orientation: W >= H ? 'landscape' : 'portrait', compress: true });
    pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, H, undefined, 'FAST');
    return pdf.output('blob');
  };
  const shot = async (w: number, h: number) => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé');
    return view3d.current.snapshot(w, h);
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), type, q));
  const download3d = () => run('3d', async () => downloadBlob(await toBlob(await shot(1600, 1200)), `${slug}-3d.png`));
  const downloadPng = () => run('png', async () => { const el = svgOf(previewRef); if (el) downloadBlob(await svgToPng(el, WD_FONT_CSS, 1600), `${slug}-xem-truoc.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${Math.round(W / 10)}x${Math.round(H / 10)}cm-${spec.type === 'cut' ? 'ban-xem-mau' : 'file-in'}.pdf`));
  const downloadSvg = () => run('svg', async () => downloadBlob(await vectorFile(), `${slug}-${Math.round(W / 10)}x${Math.round(H / 10)}cm-${spec.type === 'cut' ? 'file-cat' : 'file-in-cat'}.svg`));
  const makeFiles = async () => {
    const file = spec.type === 'cut' ? await vectorFile() : await printPdf();
    let preview: Blob;
    try { preview = await toBlob(await shot(1200, 900), 'image/jpeg', 0.85); } catch { preview = await svgToPng(svgOf(previewRef)!, WD_FONT_CSS, 1000, { watermark: false }); }
    return { file, fileName: `${slug}-${spec.type === 'cut' ? 'file-cat.svg' : 'file-in.pdf'}`, preview };
  };

  const build3d = () => import('@/lib/windowdecal-3d').then((m) => m.windowDecalBuilder({
    tex: svgOf(texRef), type: spec.type, geom, gold: spec.type === 'cut' && !!wdVinyl(spec.vinyl).gold, inside: spec.inside, fontCss: WD_FONT_CSS,
  }));
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __wdSnap?: (w: number, h: number) => Promise<string> }).__wdSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  });

  const onLogo = async (f?: File | null) => { if (!f) return; try { setLogo(await fileToDataUrl(f)); } catch (e) { alert((e as Error).message); } };

  const oneway = spec.type === 'oneway', cut = spec.type === 'cut';
  const tpls = WD_TEMPLATES.filter((t) => t.spec.type === spec.type);
  const blocks = WD_BLOCKS.filter((b) => b.types.includes(spec.type) && (b.id !== 'door' || geom.door));
  const fields = WD_FIELDS.filter((f) => f.for.some((k) => (k === 'oneway' ? oneway : !oneway && spec.blocks.includes(k as WDBlock))));
  const hidden = oneway ? '' : wdHiddenNote(spec);
  const typeName = WD_TYPES.find((t) => t.id === spec.type)!.name;
  const orderTitle = `${typeName} · kính ${Math.round(W / 10)}×${Math.round(H / 10)} cm${cut ? ` · ${wdVinyl(spec.vinyl).name}` : ''}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = (s: WDSpec) => { const g = wdGeom(s); return `${g.W} / ${g.H}`; };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Decal dán kính" sub="Decal cắt chữ, decal in PP, decal 1 chiều cho cửa kính shop — giờ mở cửa, wifi QR, thanh toán, logo, dải cản va. Đặt đúng chiều cao thật, xem mặt tiền 3D, tải file cắt/in đúng khổ kính." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {WD_TYPES.map((t) => (
          <button key={t.id} type="button" className="mv-seg-btn" data-active={spec.type === t.id} onClick={() => setType(t.id)} data-testid={`wd-type-${t.id}`}>{t.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <p className="text-xs text-slate-400 -mt-1">{WD_TYPES.find((t) => t.id === spec.type)!.note}</p>
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {tpls.map((t) => {
                  const ts: WDSpec = { ...spec, ...t.spec };
                  const on = spec.vinyl === t.spec.vinyl && spec.palette === t.spec.palette && spec.font === t.spec.font && spec.arch === t.spec.arch && spec.oneStyle === t.spec.oneStyle && spec.blocks.join() === t.spec.blocks.join();
                  return (
                    <button key={t.id} type="button" onClick={() => applyTpl(t)} data-testid="wd-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9E4DB] flex items-center justify-center p-1.5" style={{ aspectRatio: '3 / 4' }}>
                        <div style={{ height: '100%', aspectRatio: ratio(ts), maxWidth: '100%' }}>
                          <WindowDecalSvg spec={ts} data={data} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Khổ kính">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" data-testid="wd-glass">
                  {WD_GLASS.map((g) => <button key={g.id} type="button" onClick={() => set({ glass: g.id })} className={chip(spec.glass === g.id)} data-testid={`wd-glass-${g.id}`}>{g.name}</button>)}
                </div>
                {spec.glass === 'custom' && (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block"><span className="mv-label block mb-1.5">Rộng (cm)</span><input type="number" min={50} max={300} className="mv-input !w-28" value={spec.wCm} onChange={(e) => set({ wCm: Number(e.target.value) || 0 })} data-testid="wd-w" /></label>
                    <label className="block"><span className="mv-label block mb-1.5">Cao (cm)</span><input type="number" min={80} max={300} className="mv-input !w-28" value={spec.hCm} onChange={(e) => set({ hCm: Number(e.target.value) || 0 })} data-testid="wd-h" /></label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 pb-2"><input type="checkbox" checked={spec.door} onChange={(e) => set({ door: e.target.checked })} data-testid="wd-door" /> Là cửa (có tay nắm)</label>
                  </div>
                )}
                {!oneway && (
                  <label className="flex items-start gap-2 text-xs text-slate-300">
                    <input type="checkbox" className="mt-0.5" checked={spec.inside} onChange={(e) => set({ inside: e.target.checked })} data-testid="wd-inside" />
                    <span>Dán <b>mặt trong</b> kính (nhìn từ ngoài vào) — file in tự <b>lật gương</b> để ngoài đọc xuôi, decal không bị trầy/mưa.</span>
                  </label>
                )}
                <p className="text-[11px] text-slate-500">Mép dưới kính cách sàn ~{geom.bottom / 10} cm. Nội dung đặt theo chiều cao thật: dải cản va ở tầm mắt 1m45–1m57, giờ mở cửa 1m–1m4, Đẩy/Kéo cạnh tay nắm ~1m05.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-3">
                {!oneway && (
                  <div>
                    <div className="mv-label mb-1.5">Khối trên kính</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="wd-blocks">
                      {blocks.map((b) => <button key={b.id} type="button" onClick={() => toggleBlock(b.id)} className={chip(spec.blocks.includes(b.id))} data-testid={`wd-block-${b.id}`}>{b.name}</button>)}
                    </div>
                  </div>
                )}
                {oneway && (
                  <div>
                    <div className="mv-label mb-1.5">Kiểu tranh</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => set({ oneStyle: 'sale' })} className={chip(spec.oneStyle === 'sale')} data-testid="wd-ow-sale">Khuyến mãi</button>
                      <button type="button" onClick={() => set({ oneStyle: 'brand' })} className={chip(spec.oneStyle === 'brand')} data-testid="wd-ow-brand">Hình ảnh thương hiệu</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[72px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`wd-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`wd-${f.key}`} />}
                    </label>
                  ))}
                  {!oneway && spec.blocks.includes('door') && geom.door && (
                    <div className="col-span-2">
                      <div className="mv-label mb-1.5">Nhãn cửa (mặt ngoài)</div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setField('doorLabel', 'push')} className={chip(data.doorLabel !== 'pull')} data-testid="wd-push">ĐẨY · PUSH</button>
                        <button type="button" onClick={() => setField('doorLabel', 'pull')} className={chip(data.doorLabel === 'pull')} data-testid="wd-pull">KÉO · PULL</button>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-2 flex-wrap">
                    <label className="mv-btn mv-btn-ghost !flex !py-2 !text-xs cursor-pointer" data-testid="wd-logo-btn">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi ảnh' : oneway ? 'Tải ảnh nền (tuỳ chọn)' : 'Tải logo (tuỳ chọn)'}
                      <input type="file" accept="image/*" className="hidden" data-testid="wd-logo" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !flex !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    <span className="text-[11px] text-slate-500">
                      {cut ? 'Decal cắt dùng logo chữ vẽ nét (cắt được). Logo ảnh sẽ được xưởng vector hoá khi gửi đơn.' : 'Ảnh chỉ nằm trên máy anh/chị.'}
                    </span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu & font">
              <div className="space-y-4">
                {cut ? (
                  <div>
                    <div className="mv-label mb-1.5">Màu decal (vinyl 1 màu)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="wd-vinyls">
                      {WD_VINYLS.map((v) => (
                        <button key={v.id} type="button" onClick={() => set({ vinyl: v.id })} className={`flex items-center gap-2 ${chip(spec.vinyl === v.id)}`} data-testid={`wd-vinyl-${v.id}`}>
                          <span className="w-4 h-4 rounded-full border border-mv-hair" style={{ background: v.gold ? 'linear-gradient(135deg,#F6E3A1,#C9A24A,#A8812F)' : v.hex }} />{v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mv-label mb-1.5">Bảng màu</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="wd-palettes">
                      {WD_PALETTES.map((p) => (
                        <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                          <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.acc} 50%)` }} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Font tên shop</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="wd-fonts">
                    {WD_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>
                    ))}
                  </div>
                </div>
                {!oneway && spec.blocks.includes('brand') && (
                  <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={spec.arch} onChange={(e) => set({ arch: e.target.checked })} data-testid="wd-arch" /> Tên shop uốn vòm</label>
                )}
              </div>
            </CollapsibleSection>
          </div>

          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${W}|${H}|${geom.door}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'rounded-lg bg-[#E9E4DB] p-3 flex items-center justify-center'} style={{ aspectRatio: '4 / 3' }}>
              <div ref={previewRef} style={{ height: '100%', aspectRatio: `${W + 2 * Math.max(30, W * 0.035)} / ${H + 2 * Math.max(30, W * 0.035)}`, maxWidth: '100%' }} data-testid="wd-preview">
                <WindowDecalSvg spec={spec} data={data} logo={logo} marks style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Kính {Math.round(W / 10)} × {Math.round(H / 10)} cm · {typeName}{cut ? ` · ${wdVinyl(spec.vinyl).name}` : ''}{!oneway && spec.inside ? ' · dán mặt trong (in lật gương)' : ''}
              {tab === 'flat' && <> · <span className="text-amber-300">vạch cam = tầm mắt 1m5</span></>}
            </div>
            {hidden && <div className="text-[11px] text-amber-300 text-center" data-testid="wd-hidden">{hidden}</div>}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wd-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wd-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mockup
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="wd-svg" title={cut ? 'Chỉ đường cắt CutContour, chữ đã outline — đưa thẳng máy cắt decal' : 'Vector: lớp In + đường bế CutContour'}>
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {cut ? 'SVG file cắt' : 'SVG in–cắt'}
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="wd-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {cut ? 'PDF xem mẫu' : 'PDF in đúng khổ'}
              </button>
            </div>
            <PrintRequest product="windowdecal" title={orderTitle} defaultMaterial={MATERIAL[spec.type]} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              {cut && <>File cắt chỉ có đường <b>CutContour</b> (chữ + logo chữ đã outline, dải mờ ở lớp riêng) — đưa thẳng máy cắt decal, bóc gỡ phần thừa rồi dán.</>}
              {spec.type === 'print' && <>File in đúng khổ kính: lớp <b>In</b> + đường bế <b>CutContour</b> quanh từng tấm.{spec.inside ? ' Đã lật gương để dán mặt trong.' : ''}</>}
              {oneway && <>Decal 1 chiều in tràn kính, lưới lỗ ~50%: ngoài nhìn thấy tranh, trong vẫn nhìn ra. Chữ chính đặt ở tầm mắt 1m5.</>}
              {' '}In {dpi} dpi (khổ lớn nhìn xa). Mivy gửi xưởng in + thợ dán tận nơi (TP.HCM).
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1000, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="wd-print"><WindowDecalSvg spec={spec} data={data} logo={logo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          <div ref={texRef}><WindowDecalSvg spec={spec} data={data} logo={logo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
