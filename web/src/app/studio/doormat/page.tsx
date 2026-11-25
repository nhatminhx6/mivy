'use client';
// Thảm chùi chân in logo: chọn mẫu (cửa hàng, văn phòng, khách sạn, nhà hàng, spa, nhà riêng) → điền lời chào, tên,
// giờ mở cửa, wifi, lời nhắn → chọn khổ (40×60, 60×90, 90×150, tuỳ chỉnh) + chất liệu (nỉ in đủ màu / cao su đúc 1 màu /
// xơ dừa in 1 màu tối) → xem 3D trước cửa kính → tải PNG, PDF in đúng khổ vùng in (lấn viền 5mm), SVG đã outline.

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  DM_BLEED_MM, DM_COIR_INKS, DM_FIELDS, DM_FONTS, DM_FONT_CSS, DM_LAYOUTS, DM_MATERIALS, DM_PALETTES, DM_PURPOSES, DM_RUBBER_BASES, DM_RUBBER_INKS,
  DM_SAMPLES, DM_SIZES, DM_TEMPLATES, DoormatSvg, applyTpl, defaultDmSpec, dmDims, dmMaterial, dmRubberBase, useDmFonts,
  type DmData, type DmPattern, type DmPurpose, type DmSpec,
} from '@/lib/doormat-engine';
import { logoToMask, type TPLogo } from '@/lib/tape-engine';
import { svgFileBlob, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

function switchData(d: DmData, from: DmPurpose, to: DmPurpose): DmData {
  const oldS = DM_SAMPLES[from], next: DmData = { ...DM_SAMPLES[to] };
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
const PATTERNS: { id: DmPattern; name: string }[] = [
  { id: 'dots', name: 'Chấm bi' }, { id: 'diag', name: 'Sọc chéo' }, { id: 'check', name: 'Ca rô' }, { id: 'leaf', name: 'Lá' },
];

export default function DoormatPage() {
  const ready = useDmFonts();
  const [spec, setSpec] = useState<DmSpec>(defaultDmSpec);
  const [data, setData] = useState<DmData>({ ...DM_SAMPLES.shop });
  const [logo, setLogo] = useState('');
  const [logoMask, setLogoMask] = useState<TPLogo | null>(null);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const texRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  useEffect(() => {
    let on = true;
    if (!logo) { setLogoMask(null); return; }
    logoToMask(logo, 150).then((m) => { if (on) setLogoMask(m); }).catch(() => { if (on) setLogoMask(null); });
    return () => { on = false; };
  }, [logo]);

  const dims = dmDims(spec);
  const mat = dmMaterial(spec.material);
  const one = spec.material !== 'felt';
  const slug = slugify(`tham-${data.brand || ''}`, 'tham-chui-chan');
  const set = (p: Partial<DmSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setPurpose = (pp: DmPurpose) => { if (pp === spec.purpose) return; setData((d) => switchData(d, spec.purpose, pp)); set({ purpose: pp }); };
  const pickTpl = (t: (typeof DM_TEMPLATES)[number]) => {
    if (t.spec.purpose !== spec.purpose) setData((d) => switchData(d, spec.purpose, t.spec.purpose));
    setSpec((s) => applyTpl(s, t));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const pdfDpi = () => Math.max(60, Math.min(150, Math.floor(9000 / ((dims.pW + DM_BLEED_MM * 2) / 25.4))));
  const makePdf = async () => {
    const el = svgOf(printRef); if (!el) throw new Error('Chưa dựng xong file in');
    return svgsToPrintPdf([el], DM_FONT_CSS, { wMm: dims.pW, hMm: dims.pH }, DM_BLEED_MM, pdfDpi());
  };
  const downloadPng = () => run('png', async () => {
    const el = svgOf(previewRef); if (!el) return;
    downloadBlob(await svgToPng(el, DM_FONT_CSS, 2000), `${slug}-mockup.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), `${slug}-${dims.W / 10}x${dims.H / 10}cm-file-in.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, DM_FONT_CSS), `${slug}-${dims.W / 10}x${dims.H / 10}cm-vung-in.svg`);
  });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const pv = svgOf(previewRef);
    if (!pv) throw new Error('Chưa dựng xong thảm, thử lại nhé.');
    const file = await makePdf();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, DM_FONT_CSS, 900))
      : await svgToJpeg(pv, DM_FONT_CSS, 900);
    return { file, fileName: `${slug}-${dims.W / 10}x${dims.H / 10}cm-file-in.pdf`, preview };
  };
  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo'); }
  };

  const border = spec.material === 'rubber' ? dmRubberBase(spec) : spec.material === 'coir' ? '#2A2622' : '#1F1F21';
  const build3d = () => import('@/lib/doormat-3d').then((m) => m.doormatBuilder({
    tex: svgOf(texRef), mask: one ? svgOf(maskRef) : null, material: spec.material, ...dims, border, fontCss: DM_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __dmSnap?: (w: number, h: number) => Promise<string> }).__dmSnap = async (w, h) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return (await core.snapshot(b, w, h)).toDataURL('image/png');
  };

  const orderTitle = `Thảm chùi chân ${dims.W / 10}×${dims.H / 10}cm · ${mat.name}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const swatch = (hex: string, on: boolean, name: string, onClick: () => void, tid: string) => (
    <button key={tid} type="button" onClick={onClick} className={`flex items-center gap-2 ${chip(on)}`} data-testid={tid}>
      <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: hex }} /> {name}
    </button>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thảm chùi chân in logo" sub="Thảm cửa cho shop, văn phòng, khách sạn, nhà hàng, spa, nhà riêng — nỉ đế cao su in đủ màu, cao su đúc logo nổi, hoặc xơ dừa in 1 màu. Xem 3D trước cửa, tải file in đúng khổ." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${DM_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {DM_TEMPLATES.map((t) => {
                  const ts = applyTpl(spec, t);
                  const on = spec.layout === ts.layout && spec.palette === ts.palette && spec.material === ts.material && spec.purpose === ts.purpose && spec.font === ts.font;
                  const td = t.spec.purpose === spec.purpose ? data : switchData(data, spec.purpose, t.spec.purpose);
                  const d2 = dmDims(ts);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="dm-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg grid place-items-center p-3 aspect-[4/3] bg-[#E4E1DA]">
                        <div style={{ width: '100%', aspectRatio: `${d2.W} / ${d2.H}` }}>
                          <DoormatSvg spec={ts} data={td} logo={logo} logoMask={logoMask} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.3))' }} />
                        </div>
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
                  <div className="mv-label mb-1.5">Dùng cho (đổi chữ mẫu + biểu tượng)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="dm-purposes">
                    {DM_PURPOSES.map((p) => <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={chip(spec.purpose === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {DM_FIELDS.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`dm-field-${f.key}`} />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="dm-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Logo hiện ở bố cục “Logo + chữ” · cao su / xơ dừa tự đổi thành 1 màu · ảnh xử lý ngay trên máy</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ thảm</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="dm-sizes">
                    {DM_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid={`dm-size-${s.id}`}>{s.name}</button>)}
                  </div>
                  {spec.size === 'custom' && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
                      <input type="number" min={30} max={200} className="mv-input !w-24" value={spec.wCm} onChange={(e) => set({ wCm: Number(e.target.value) || 30 })} data-testid="dm-wcm" /> ×
                      <input type="number" min={30} max={150} className="mv-input !w-24" value={spec.hCm} onChange={(e) => set({ hCm: Number(e.target.value) || 30 })} data-testid="dm-hcm" /> cm
                      <span className="text-slate-500">(30–200 × 30–150)</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="dm-materials">
                    {DM_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} !py-2 text-left`} data-testid={`dm-mat-${m.id}`}>
                        <span className="font-semibold">{m.name}</span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{m.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {spec.material === 'rubber' && (
                  <div className="space-y-2">
                    <div className="mv-label">Màu cao su nền</div>
                    <div className="flex flex-wrap gap-1.5">{DM_RUBBER_BASES.map((b) => swatch(b.hex, spec.rubberBase === b.id, b.name, () => set({ rubberBase: b.id }), `dm-base-${b.id}`))}</div>
                    <div className="mv-label">Màu phần đúc nổi</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="dm-rubber-inks">{DM_RUBBER_INKS.map((b) => swatch(b.hex, spec.rubberInk === b.id, b.name, () => set({ rubberInk: b.id }), `dm-rink-${b.id}`))}</div>
                  </div>
                )}
                {spec.material === 'coir' && (
                  <div className="space-y-2">
                    <div className="mv-label">Màu mực (xơ dừa chỉ in được mực tối)</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="dm-coir-inks">{DM_COIR_INKS.map((b) => swatch(b.hex, spec.coirInk === b.id, b.name, () => set({ coirInk: b.id }), `dm-cink-${b.id}`))}</div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Bố cục, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="dm-layouts">
                    {DM_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)} data-testid="dm-layout">{l.name}</button>)}
                  </div>
                </div>
                {spec.layout === 'pattern' && (
                  <div>
                    <div className="mv-label mb-1.5">Hoạ tiết</div>
                    <div className="flex flex-wrap gap-1.5">{PATTERNS.map((p) => <button key={p.id} type="button" onClick={() => set({ pattern: p.id })} className={chip(spec.pattern === p.id)}>{p.name}</button>)}</div>
                  </div>
                )}
                {!one && (
                  <div>
                    <div className="mv-label mb-1.5">Bảng màu (in đủ màu)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="dm-palettes">
                      {DM_PALETTES.map((pl) => (
                        <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                          <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="dm-fonts">
                    {DM_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `'${f.family}'`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length, !!logoMask])} refitKey={`${dims.W}x${dims.H}|${spec.material}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div className="rounded-lg p-4 bg-[#E4E1DA]">
                <div ref={previewRef} data-testid="dm-preview" style={{ width: '100%', aspectRatio: `${dims.W} / ${dims.H}` }}>
                  <DoormatSvg spec={spec} data={data} logo={logo} logoMask={logoMask} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(15,23,42,0.3))' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {dims.W / 10}×{dims.H / 10}cm · {mat.name} · vùng in {dims.pW / 10}×{dims.pH / 10}cm (viền {dims.B / 10}cm không in){one ? ' · 1 màu' : ''}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="dm-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="dm-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mẫu thảm
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="dm-pdf" title={`Vùng in đúng khổ + lấn viền ${DM_BLEED_MM}mm + vạch cắt`}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="dm-svg" title="Vùng in vector, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG vùng in
              </button>
            </div>
            <PrintRequest product="doormat" title={orderTitle} defaultMaterial={mat.order} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              File in là <b>vùng in</b> (thảm trừ viền cao su {dims.B / 10}cm) đúng khổ thật, lấn thêm {DM_BLEED_MM}mm dưới viền. {spec.material === 'rubber' ? 'Cao su đúc: file là khuôn — phần đen = đúc nổi.' : spec.material === 'coir' ? 'Xơ dừa: chỉ 1 màu mực tối, nền xơ dừa không in.' : 'Nỉ in kỹ thuật số đủ màu.'}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={texRef}><DoormatSvg spec={spec} data={data} logo={logo} logoMask={logoMask} mode="tex" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
          {one && <div ref={maskRef}><DoormatSvg spec={spec} data={data} logo={logo} logoMask={logoMask} mode="mask" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>}
          <div ref={printRef} data-testid="dm-print"><DoormatSvg spec={spec} data={data} logo={logo} logoMask={logoMask} mode="print" bleed style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
