'use client';
// Bảng chào mừng tiệc: chọn mẫu (cưới, vu quy, sinh nhật, thôi nôi, khai trương, tất niên, hội nghị) → điền tên/ngày/địa điểm
// → (tuỳ chọn) ảnh cô dâu chú rể / ảnh bé → chọn khổ, chất liệu (formex · mica trong · canvas), bố cục, màu, cặp font
// → xem 3D trên giá vẽ → tải PNG, PDF in (mica: thêm trang lớp mực trắng), SVG in–cắt hoặc gửi yêu cầu in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  WS_BLEED_MM, WS_FIELDS, WS_FONT_CSS, WS_HEADS, WS_LAYOUTS, WS_MATERIALS, WS_OCCASIONS, WS_PALETTES, WS_SAMPLES, WS_SCRIPTS,
  WS_SIZES, WS_TEMPLATES, WelcomeSvg, defaultWsSpec, wsLayoutNeedsPhoto, wsPalette, wsPhotoDpi, wsSize, useWsFonts,
  type WsData, type WsOccasion, type WsPhoto, type WsSpec,
} from '@/lib/welcomesign-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi dịp: ô còn nguyên chữ mẫu dịp cũ → chữ mẫu dịp mới; ô khách tự viết thì giữ
function switchData(d: WsData, from: WsOccasion, to: WsOccasion): WsData {
  const oldS = WS_SAMPLES[from], next: WsData = { ...WS_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function readPhoto(file: File): Promise<WsPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 3200 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    // dpi tính theo ảnh gốc (trước khi thu nhỏ) → giữ w/h gốc, ảnh nhúng là bản thu nhỏ
    return { src: c.toDataURL('image/jpeg', 0.9), w: im.naturalWidth, h: im.naturalHeight, zoom: 1, px: 0, py: 0, name: file.name };
  } finally { URL.revokeObjectURL(url); }
}

export default function WelcomeSignPage() {
  const ready = useWsFonts();
  const [spec, setSpec] = useState<WsSpec>(defaultWsSpec);
  const [data, setData] = useState<WsData>({ ...WS_SAMPLES.wedding });
  const [photo, setPhoto] = useState<WsPhoto | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const prevRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const whiteRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = wsSize(spec.size);
  const clear = spec.material === 'acrylic';
  const pal = wsPalette(spec.palette);
  const slug = slugify(`bang-chao-mung-${data.title || ''}`, 'bang-chao-mung');
  const set = (p: Partial<WsSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setOccasion = (oc: WsOccasion) => { if (oc === spec.occasion) return; setData((d) => switchData(d, spec.occasion, oc)); set({ occasion: oc }); };
  const pickTpl = (t: (typeof WS_TEMPLATES)[number]) => {
    if (t.spec.occasion !== spec.occasion) setData((d) => switchData(d, spec.occasion, t.spec.occasion));
    setSpec((s) => ({ ...s, ...t.spec, material: t.spec.material ?? (s.material === 'acrylic' && !t.spec.material ? 'formex' : s.material) }));
  };
  const dpi = wsPhotoDpi(spec, data, photo);
  const usesPhoto = wsLayoutNeedsPhoto(spec.layout);

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const outlined = async (el: SVGSVGElement): Promise<Blob> => {
    const clone = await selfContainedSvg(el, undefined, { outline: true });
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(WS_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  };
  // khổ lớn nhìn xa → 120–150dpi là đủ, giữ file nhẹ
  const pdfDpi = Math.max(100, Math.min(150, Math.floor((7000 / (Math.max(sz.wMm, sz.hMm) + WS_BLEED_MM * 2)) * 25.4)));
  const pdfFile = async (): Promise<Blob> => {
    const pr = svgOf(printRef); if (!pr) throw new Error('Chưa dựng xong file in');
    const pages = [pr];
    const wh = svgOf(whiteRef); if (clear && wh) pages.push(wh);
    return svgsToPrintPdf(pages, WS_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, WS_BLEED_MM, pdfDpi);
  };

  const downloadPng = () => run('png', async () => { const el = svgOf(prevRef); if (el) downloadBlob(await svgToPng(el, WS_FONT_CSS, 1800), `${slug}.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfFile(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => { const el = svgOf(printRef); if (el) downloadBlob(await outlined(el), `${slug}-${sz.id}-in-cat.svg`); });
  const downloadWhite = () => run('white', async () => { const el = svgOf(whiteRef); if (el) downloadBlob(await outlined(el), `${slug}-${sz.id}-lop-muc-trang.svg`); });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 2000, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(prevRef);
    if (!pv) throw new Error('Chưa dựng xong bảng, thử lại nhé.');
    const file = await pdfFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 1500).then(toBlob).catch(() => svgToJpeg(pv, WS_FONT_CSS, 900))
      : await svgToJpeg(pv, WS_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sz.id}-file-in.pdf`, preview };
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await readPhoto(f)); if (!usesPhoto) set({ layout: 'photo' }); } catch { alert('Không đọc được ảnh'); }
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __wsSnap?: (w: number, h: number) => Promise<string> }).__wsSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/welcomesign-3d').then((m) => m.welcomeBuilder({
    tex: svgOf(texRef), wMm: sz.wMm, hMm: sz.hMm, material: spec.material, flowers: pal.flowers, leaf: pal.leaf, edge: pal.bg2, fontCss: WS_FONT_CSS,
  }));
  const matName = WS_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const orderTitle = `Bảng chào mừng ${sz.name} · ${matName}`;
  const defaultMaterial = spec.material === 'acrylic' ? 'Mica trong in UV' : spec.material === 'formex' ? 'Formex 5mm + chân giá vẽ' : 'Chưa biết — tư vấn giúp';
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const stage = clear ? 'linear-gradient(160deg,#C9D8C5,#9DB59A)' : pal.dark ? '#E4E7EC' : '#D9DEE6';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng chào mừng tiệc" sub="Bảng Welcome đám cưới, lễ vu quy, sinh nhật, thôi nôi, khai trương, tất niên — formex, mica trong hoặc canvas, đặt trên giá vẽ đón khách." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${WS_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {WS_TEMPLATES.map((t) => {
                  const tSpec: WsSpec = { ...spec, ...t.spec, material: t.spec.material ?? (spec.material === 'acrylic' ? 'formex' : spec.material) };
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.occasion === t.spec.occasion && spec.head === t.spec.head && (!t.spec.material || t.spec.material === spec.material);
                  const td = t.spec.occasion === spec.occasion ? data : switchData(data, spec.occasion, t.spec.occasion);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="ws-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg grid place-items-center p-2.5 aspect-[3/4]" style={{ background: tSpec.material === 'acrylic' ? 'linear-gradient(160deg,#C9D8C5,#9DB59A)' : '#E6E9EE' }}>
                        <WelcomeSvg spec={{ ...tSpec, size: tSpec.size === '90x60' ? '50x70' : tSpec.size }} data={td} photo={photo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
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
                  <div className="flex flex-wrap gap-1.5" data-testid="ws-occasions">
                    {WS_OCCASIONS.map((p) => <button key={p.id} type="button" onClick={() => setOccasion(p.id)} className={chip(spec.occasion === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {WS_FIELDS.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`ws-in-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border border-mv-hair p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Tải ảnh cô dâu chú rể / ảnh bé'}
                      <input type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="ws-photo" />
                    </label>
                    {photo && <button type="button" onClick={() => setPhoto(null)} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    <span className="text-[11px] text-slate-500">{usesPhoto ? 'Ảnh xử lý ngay trên máy, không gửi đi đâu' : 'Tải ảnh sẽ chuyển sang bố cục "Có ảnh"'}</span>
                  </div>
                  {usesPhoto && photo && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                      {([['zoom', 'Phóng to', 1, 3, 0.05], ['px', 'Dời ngang', -1, 1, 0.02], ['py', 'Dời dọc', -1, 1, 0.02]] as const).map(([k, lb, mn, mx, st]) => (
                        <label key={k} className="block">{lb}
                          <input type="range" min={mn} max={mx} step={st} value={photo[k]} onChange={(e) => setPhoto({ ...photo, [k]: Number(e.target.value) })} className="w-full" data-testid={`ws-ph-${k}`} />
                        </label>
                      ))}
                    </div>
                  )}
                  {usesPhoto && dpi !== null && (
                    <div data-testid="ws-dpi" data-dpi={Math.round(dpi)} className={`flex items-center gap-1.5 text-[11px] ${dpi < 60 ? 'text-rose-400' : dpi < 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {dpi < 100 && <AlertTriangle className="w-3.5 h-3.5" />}
                      Ảnh đạt khoảng {Math.round(dpi)} dpi ở khổ {sz.name}{dpi < 60 ? ' — quá thấp, in sẽ mờ/vỡ hạt. Nên dùng ảnh gốc từ máy ảnh/điện thoại.' : dpi < 100 ? ' — tạm được khi nhìn xa, ảnh gốc nét hơn sẽ đẹp hơn.' : ' — đủ nét.'}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, chất liệu, bố cục & màu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid sm:grid-cols-3 gap-1.5" data-testid="ws-materials">
                    {WS_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} text-left`}>
                        <div>{m.name}</div><div className="text-[10px] text-slate-500 font-normal">{m.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ bảng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ws-sizes">
                    {WS_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ws-layouts">
                    {WS_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="ws-palettes">
                    {WS_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.gold} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="mv-label mb-1.5">Font tên / tiêu đề</div>
                    <div className="grid grid-cols-2 gap-1.5" data-testid="ws-heads">
                      {WS_HEADS.map((f) => <button key={f.id} type="button" onClick={() => set({ head: f.id })} className={`${chip(spec.head === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Chữ viết tay</div>
                    <div className="grid grid-cols-2 gap-1.5" data-testid="ws-scripts">
                      {WS_SCRIPTS.map((f) => <button key={f.id} type="button" onClick={() => set({ script: f.id })} className={`${chip(spec.script === f.id)} !py-2 !text-sm truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, photo?.src.length, photo?.zoom, photo?.px, photo?.py])} refitKey={`${spec.size}|${spec.material}`} debounce={450} className="rounded-lg aspect-[4/5] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div className="rounded-lg grid place-items-center p-5 aspect-[4/5]" style={{ background: stage }} data-testid="ws-preview">
                <div ref={prevRef} className="w-full h-full grid place-items-center">
                  <WelcomeSvg spec={spec} data={data} photo={photo} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
                </div>
              </div>
              {clear && <div className="text-[11px] text-slate-400 mt-1.5">Mica trong: phần xanh phía sau là nền tiệc nhìn xuyên qua tấm. Mảng trắng = lót mực trắng.</div>}
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {matName} · lề xén {WS_BLEED_MM}mm · PDF {pdfDpi}dpi{clear ? ' · có trang lớp mực trắng' : ''}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ws-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ws-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG thiết kế
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ws-pdf" title="Đúng khổ, lề xén 3mm + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ws-svg" title="Lớp In + CutContour, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG in–cắt
              </button>
              {clear && (
                <button type="button" onClick={downloadWhite} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs col-span-2" data-testid="ws-white" title="Lớp lót mực trắng cho mica trong — màu đen = in trắng">
                  {busy === 'white' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG lớp mực trắng (mica)
                </button>
              )}
            </div>
            <PrintRequest product="welcomesign" title={orderTitle} defaultMaterial={defaultMaterial} design={{ spec, data, hasPhoto: !!photo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in đúng khổ thật, lề xén 3mm, chữ đã outline. Mica trong: xưởng in UV mặt sau tấm, lót mực trắng theo lớp trắng để chữ và mảng lót không bị trong.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1000, pointerEvents: 'none' }}>
          <div ref={texRef}><WelcomeSvg spec={spec} data={data} photo={photo} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printRef} data-testid="ws-print"><WelcomeSvg spec={spec} data={data} photo={photo} mode="print" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          {clear && <div ref={whiteRef} data-testid="ws-white-layer"><WelcomeSvg spec={spec} data={data} photo={photo} mode="white" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>}
        </div>
      )}
    </div>
  );
}
