'use client';
// Quạt cầm tay quảng cáo (nhựa PP): chọn mẫu (tuyển sinh, khai trương, chiến dịch, âm nhạc, phòng khám, nhà đất, cổ vũ)
// → điền mặt trước (chiến dịch) + mặt sau (thông tin + QR) → chọn hình (tròn, vuông, tim, xoè) + tay cầm (liền / que rời)
// → xem 3D → tải PNG 2 mặt, PDF in 2 trang (lề xén + vạch cắt), file in–cắt tờ 65×100 (In + CutContour, .zip 2 mặt) hoặc gửi in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  FAN_BLEED_MM, FAN_FIELDS, FAN_FONTS, FAN_FONT_CSS, FAN_HANDLES, FAN_PALETTES, FAN_PURPOSES, FAN_SAMPLES, FAN_SHAPES, FAN_TEMPLATES,
  FanSheetSvg, FanSvg, defaultFanSpec, fanGeom, fanPalette, fanSheetFit, useFanFonts,
  type FanData, type FanPurpose, type FanSpec,
} from '@/lib/fan-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi ngành: ô còn nguyên chữ mẫu ngành cũ → chữ mẫu ngành mới; ô khách tự viết thì giữ
function switchData(d: FanData, from: FanPurpose, to: FanPurpose): FanData {
  const oldS = FAN_SAMPLES[from], next: FanData = { ...FAN_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function readImage(file: File, max: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL(max > 1000 ? 'image/jpeg' : 'image/png', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function FanPage() {
  const ready = useFanFonts();
  const [spec, setSpec] = useState<FanSpec>(defaultFanSpec);
  const [data, setData] = useState<FanData>({ ...FAN_SAMPLES.school });
  const [logo, setLogo] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const frontBleedRef = useRef<HTMLDivElement | null>(null);
  const backBleedRef = useRef<HTMLDivElement | null>(null);
  const sheetFRef = useRef<HTMLDivElement | null>(null);
  const sheetBRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const g = fanGeom(spec.shape, spec.handle);
  const pal = fanPalette(spec.palette);
  const fit = fanSheetFit(spec.shape, spec.handle);
  const shapeName = FAN_SHAPES.find((s) => s.id === spec.shape)!.name;
  const handleName = FAN_HANDLES.find((h) => h.id === spec.handle)!.name;
  const slug = slugify(`quat-${data.brand || ''}`, 'quat');
  const set = (p: Partial<FanSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setPurpose = (pp: FanPurpose) => { if (pp === spec.purpose) return; setData((d) => switchData(d, spec.purpose, pp)); set({ purpose: pp }); };
  const pickTpl = (t: (typeof FAN_TEMPLATES)[number]) => {
    if (t.spec.purpose !== spec.purpose) setData((d) => switchData(d, spec.purpose, t.spec.purpose));
    setSpec({ ...t.spec });
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // tờ in–cắt: hình quạt (defs) thay bằng bản đã outline → file vector độc lập font
  const sheetFile = async (sheetR: RefObject<HTMLDivElement | null>, oneR: RefObject<HTMLDivElement | null>): Promise<string> => {
    const el = svgOf(sheetR), one = svgOf(oneR);
    if (!el || !one) throw new Error('Chưa dựng xong tờ in');
    const [clone, fan] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(one, undefined, { outline: true })]);
    const vb = one.viewBox.baseVal;
    fan.setAttribute('width', String(vb.width)); fan.setAttribute('height', String(vb.height));
    clone.querySelector('[data-fan-def] > svg')?.replaceWith(fan);
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(FAN_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return new XMLSerializer().serializeToString(clone);
  };
  const zipFile = async (): Promise<Blob> => {
    const enc = new TextEncoder();
    const [f, b] = await Promise.all([sheetFile(sheetFRef, frontBleedRef), sheetFile(sheetBRef, backBleedRef)]);
    return zipStore([
      { name: `${slug}-mat-truoc-${fit.per}cai-to-65x100.svg`, data: enc.encode(f) },
      { name: `${slug}-mat-sau-${fit.per}cai-to-65x100.svg`, data: enc.encode(b) },
    ]);
  };

  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, FAN_FONT_CSS, 1600), `${slug}-${side === 'front' ? 'mat-truoc' : 'mat-sau'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const a = svgOf(frontBleedRef), b = svgOf(backBleedRef); if (!a || !b) return;
    downloadBlob(await svgsToPrintPdf([a, b], FAN_FONT_CSS, { wMm: g.W, hMm: g.H }, FAN_BLEED_MM, 240), `${slug}-${spec.shape}-file-in-2-mat.pdf`);
  });
  const downloadZip = () => run('zip', async () => downloadBlob(await zipFile(), `${slug}-${spec.shape}-file-in-cat.zip`));
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    if (!pv) throw new Error('Chưa dựng xong quạt, thử lại nhé.');
    const file = await zipFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, FAN_FONT_CSS, 900))
      : await svgToJpeg(pv, FAN_FONT_CSS, 900);
    return { file, fileName: `${slug}-${spec.shape}-file-in-cat.zip`, preview };
  };

  const onImage = (setter: (s: string) => void, max: number) => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setter(await readImage(f, max)); } catch { alert('Không đọc được ảnh'); }
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __fanSnap?: (w: number, h: number) => Promise<string> }).__fanSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/fan-3d').then((m) => m.fanBuilder({
    front: svgOf(frontRef), back: svgOf(backRef), d: g.d, W: g.W, H: g.H, cx: g.cx, handle: spec.handle, stickY0: g.stickY0 ?? 0,
    fontCss: FAN_FONT_CSS, cup: pal.dark ? '#F4F1EA' : pal.accent,
  }));
  const orderTitle = `Quạt nhựa ${shapeName} · ${handleName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const aspect = `${g.W} / ${g.H}`;
  const field = (side: 'front' | 'back') => FAN_FIELDS.filter((f) => f.side === side).map((f) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[80px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fan-field-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`fan-field-${f.key}`} />}
    </label>
  ));

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Quạt cầm tay quảng cáo" sub="Quạt nhựa PP in 2 mặt phát sự kiện, hội chợ, tuyển sinh, khai trương — tròn, vuông, trái tim, quạt xoè; tay cầm liền hoặc que tre. File in–cắt chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${FAN_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {FAN_TEMPLATES.map((t) => {
                  const on = spec.shape === t.spec.shape && spec.palette === t.spec.palette && spec.purpose === t.spec.purpose && spec.handle === t.spec.handle;
                  const tg = fanGeom(t.spec.shape, t.spec.handle);
                  const td = t.spec.purpose === spec.purpose ? data : switchData(data, spec.purpose, t.spec.purpose);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="fan-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-3 aspect-square">
                        <div style={tg.W >= tg.H ? { width: '100%', aspectRatio: `${tg.W} / ${tg.H}` } : { height: '100%', aspectRatio: `${tg.W} / ${tg.H}` }}>
                          <FanSvg spec={t.spec} data={td} side="front" photo={photo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung 2 mặt">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Mục đích (đổi hình minh hoạ + chữ mẫu)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fan-purposes">
                    {FAN_PURPOSES.map((p) => <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={chip(spec.purpose === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-mv-fg mb-2">Mặt trước — hình chiến dịch</div>
                  <div className="grid grid-cols-2 gap-3">{field('front')}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh nền' : 'Ảnh nền mặt trước (tuỳ chọn)'}
                      <input type="file" accept="image/*" className="hidden" onChange={onImage(setPhoto, 1600)} data-testid="fan-photo" />
                    </label>
                    {photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    <span className="text-[11px] text-slate-500">Ảnh phủ kín mặt trước, chữ vẫn nổi rõ · xử lý ngay trên máy</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-mv-fg mb-2">Mặt sau — thông tin + mã QR</div>
                  <div className="grid grid-cols-2 gap-3">{field('back')}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                      <input type="file" accept="image/*" className="hidden" onChange={onImage(setLogo, 800)} data-testid="fan-logo" />
                    </label>
                    {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                    <span className="text-[11px] text-slate-500">Logo in phía trên tên đơn vị ở mặt sau</span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Hình quạt, tay cầm, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Hình quạt</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="fan-shapes">
                    {FAN_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)} data-testid="fan-shape">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Tay cầm</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="fan-handles">
                    {FAN_HANDLES.map((h) => (
                      <button key={h.id} type="button" onClick={() => set({ handle: h.id })} className={`${chip(spec.handle === h.id)} !py-2 text-left`} data-testid="fan-handle">
                        <span className="font-semibold">{h.name}</span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{h.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="fan-palettes">
                    {FAN_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="fan-fonts">
                    {FAN_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, photo.length])} refitKey={`${spec.shape}|${spec.handle}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#E9ECF1] grid grid-cols-2 gap-3 p-4 items-center">
                {(['front', 'back'] as const).map((side) => (
                  <div key={side} className="min-w-0">
                    <div data-testid={`fan-${side}`} style={{ width: '100%', aspectRatio: aspect }}>
                      <FanSvg spec={spec} data={data} side={side} logo={logo} photo={photo} cut style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center mt-1.5">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in 65×100cm · {fit.per} cái · nét hồng = đường bế (CutContour)</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[220px]" data-testid="fan-sheet">
                  <FanSheetSvg spec={spec} data={data} side="front" logo={logo} photo={photo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{shapeName} · {handleName.toLowerCase()} · khổ {g.W / 10}×{(g.H / 10).toFixed(1)}cm · lề xén {FAN_BLEED_MM}mm · {fit.per} cái/tờ</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fan-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fan-pdf" title="2 trang: mặt trước + mặt sau, lề xén 2mm + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in 2 mặt
              </button>
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fan-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="fan-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadZip} className="mv-btn mv-btn-primary col-span-2 !flex justify-center !py-2.5 !text-xs" data-testid="fan-zip" title="2 tờ 65×100cm (mặt trước, mặt sau): lớp In + CutContour, chữ đã outline">
                {busy === 'zip' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt 2 mặt (.zip)
              </button>
            </div>
            <PrintRequest product="fan" title={orderTitle} defaultMaterial="Quạt nhựa PP cầm tay" design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in–cắt: 2 tờ 65×100cm (mặt trước + mặt sau, xếp khớp nhau khi in 2 mặt) có lớp <b>In</b> (tràn lề 2mm) và <b>CutContour</b> (đường bế, spot Magenta) — chữ đã outline. {spec.handle === 'stick' ? 'Tay cầm rời: xưởng tán que tre/nhựa bằng 2 đinh ở giữa lưng quạt (nét đứt ở mặt sau).' : 'Tay cầm liền: cắt cùng tấm nhựa PP, có lỗ treo Ø6mm.'}</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={frontRef}><FanSvg spec={spec} data={data} side="front" logo={logo} photo={photo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backRef}><FanSvg spec={spec} data={data} side="back" logo={logo} photo={photo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={frontBleedRef}><FanSvg spec={spec} data={data} side="front" logo={logo} photo={photo} bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={backBleedRef}><FanSvg spec={spec} data={data} side="back" logo={logo} photo={photo} bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetFRef}><FanSheetSvg spec={spec} data={data} side="front" logo={logo} photo={photo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetBRef}><FanSheetSvg spec={spec} data={data} side="back" logo={logo} photo={photo} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
