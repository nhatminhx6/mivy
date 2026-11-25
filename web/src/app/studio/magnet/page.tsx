'use client';
// Nam châm tủ lạnh quảng cáo: chọn mẫu (giao đồ ăn, điện nước, taxi, spa, mầm non, nhà đất) → điền tên/hotline/QR Zalo
// → chọn hình (chữ nhật, tròn, die-cut ly trà sữa / pizza / ngôi nhà / giọt nước / bong bóng) → xem 3D dán trên tủ lạnh
// → tải PNG, PDF in 1 con (lề xén + vạch cắt), tờ A4 in–cắt (lớp In + CutContour) hoặc gửi yêu cầu in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  MG_BLEED_MM, MG_FIELDS, MG_FONTS, MG_FONT_CSS, MG_MATERIALS, MG_PALETTES, MG_PURPOSES, MG_SAMPLES, MG_SHAPES, MG_TEMPLATES,
  MagnetSheetSvg, MagnetSvg, defaultMgSpec, fieldsShown, mgPalette, mgShape, mgSheetFit, qrAllowed, useMgFonts,
  type MgData, type MgPurpose, type MgSpec,
} from '@/lib/magnet-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi ngành: ô còn nguyên chữ mẫu ngành cũ → chữ mẫu ngành mới; ô khách tự viết thì giữ
function switchData(d: MgData, from: MgPurpose, to: MgPurpose): MgData {
  const oldS = MG_SAMPLES[from], next: MgData = { ...MG_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function MagnetPage() {
  const ready = useMgFonts();
  const [spec, setSpec] = useState<MgSpec>(defaultMgSpec);
  const [data, setData] = useState<MgData>({ ...MG_SAMPLES.food });
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const printRef = useRef<HTMLDivElement | null>(null);
  const bleedRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sh = mgShape(spec.shape);
  const pal = mgPalette(spec.palette);
  const fit = mgSheetFit(spec.shape);
  const shown = fieldsShown(spec.shape);
  const slug = slugify(`nam-cham-${data.brand || ''}`, 'nam-cham');
  const set = (p: Partial<MgSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const setPurpose = (pp: MgPurpose) => { if (pp === spec.purpose) return; setData((d) => switchData(d, spec.purpose, pp)); set({ purpose: pp }); };
  const pickTpl = (t: (typeof MG_TEMPLATES)[number]) => {
    if (t.spec.purpose !== spec.purpose) setData((d) => switchData(d, spec.purpose, t.spec.purpose));
    setSpec((s) => ({ ...s, ...t.spec }));
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // tờ A4 in–cắt: hình nam châm (defs) thay bằng bản đã outline → file vector độc lập font
  const sheetFile = async (): Promise<Blob> => {
    const el = svgOf(sheetRef), one = svgOf(bleedRef);
    if (!el || !one) throw new Error('Chưa dựng xong tờ in');
    const [clone, mg] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(one, undefined, { outline: true })]);
    const vb = one.viewBox.baseVal;
    mg.setAttribute('width', String(vb.width)); mg.setAttribute('height', String(vb.height));
    clone.querySelector('[data-magnet-def] > svg')?.replaceWith(mg);
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(MG_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  };

  const downloadPng = () => run('png', async () => {
    const el = svgOf(printRef); if (!el) return;
    downloadBlob(await svgToPng(el, MG_FONT_CSS, 1600), `${slug}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const el = svgOf(bleedRef); if (!el) return;
    downloadBlob(await svgToPrintPdf(el, MG_FONT_CSS, { wMm: sh.wMm, hMm: sh.hMm }, MG_BLEED_MM), `${slug}-${sh.id}-file-in.pdf`);
  });
  const downloadSvg = () => run('svg', async () => downloadBlob(await sheetFile(), `${slug}-${sh.id}-${fit.per}con-to-A4-in-cat.svg`));
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(printRef);
    if (!pv) throw new Error('Chưa dựng xong nam châm, thử lại nhé.');
    const file = await sheetFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, MG_FONT_CSS, 900))
      : await svgToJpeg(pv, MG_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sh.id}-to-A4-in-cat.svg`, preview };
  };

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setLogo(await readLogo(f)); } catch { alert('Không đọc được ảnh logo'); }
  };

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __mgSnap?: (w: number, h: number) => Promise<string> }).__mgSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/magnet-3d').then((m) => m.magnetBuilder({
    print: svgOf(printRef), d: sh.d, wMm: sh.wMm, hMm: sh.hMm, material: spec.material, fridge: spec.fridge, fontCss: MG_FONT_CSS,
    accent: pal.accent === '#141414' ? '#E53935' : pal.accent,
    note: ['Đi chợ:', '- trứng gà, sữa tươi', '- rau muống, cà chua', `Tối nay gọi ${(data.hotline || '').trim()}`],
  }));
  const matName = MG_MATERIALS.find((m) => m.id === spec.material)?.name || '';
  const orderTitle = `Nam châm ${sh.name} · ${matName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const aspect = `${sh.wMm} / ${sh.hMm}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Nam châm tủ lạnh" sub="Nam châm quảng cáo hotline dán tủ lạnh khách — giao đồ ăn, điện nước, taxi, spa… Cắt theo hình ly trà sữa, pizza, ngôi nhà; file in–cắt chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${MG_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {MG_TEMPLATES.map((t) => {
                  const on = spec.shape === t.spec.shape && spec.palette === t.spec.palette && spec.purpose === t.spec.purpose;
                  const ts = mgShape(t.spec.shape);
                  const td = t.spec.purpose === spec.purpose ? data : switchData(data, spec.purpose, t.spec.purpose);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="mg-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-3 aspect-square">
                        <div style={{ width: ts.wMm >= ts.hMm ? '100%' : `${(ts.wMm / ts.hMm) * 100}%`, aspectRatio: `${ts.wMm} / ${ts.hMm}` }}>
                          <MagnetSvg spec={{ ...spec, ...t.spec }} data={td} logo={logo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' }} />
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
                  <div className="mv-label mb-1.5">Ngành (đổi hình minh hoạ + chữ mẫu)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mg-purposes">
                    {MG_PURPOSES.map((p) => <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={chip(spec.purpose === p.id)}>{p.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MG_FIELDS.filter((f) => shown.includes(f.key)).map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`mg-field-${f.key}`} />
                    </label>
                  ))}
                </div>
                {qrAllowed(spec.shape) ? (
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={spec.qr} onChange={(e) => set({ qr: e.target.checked })} data-testid="mg-qr" /> In mã QR Zalo (quét là nhắn tin / gọi)
                  </label>
                ) : (
                  <div className="text-[11px] text-slate-400">Khổ {sh.name.toLowerCase()} nhỏ — chỉ in tên, hotline, câu chào{spec.shape === 'house' ? ', dịch vụ' : ''} cho dễ đọc. Muốn in QR Zalo, chọn khổ chữ nhật.</div>
                )}
                <div className="flex items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="mg-logo" />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  <span className="text-[11px] text-slate-500">Logo thay hình minh hoạ · ảnh xử lý ngay trên máy</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Hình cắt, màu & chất liệu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Hình / khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="mg-shapes">
                    {MG_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)} data-testid="mg-shape">{s.name}{s.kind === 'die' ? ` ${s.wMm / 10}×${s.hMm / 10}cm` : ''}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="mg-palettes">
                    {MG_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên quán</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="mg-fonts">
                    {MG_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Chất liệu</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="mg-materials">
                    {MG_MATERIALS.map((m) => (
                      <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={`${chip(spec.material === m.id)} !py-2 text-left`}>
                        <span className="font-semibold">{m.name}</span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{m.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Tủ lạnh trong ảnh 3D</div>
                  <div className="flex gap-1.5" data-testid="mg-fridge">
                    <button type="button" onClick={() => set({ fridge: 'steel' })} className={chip(spec.fridge === 'steel')}>Inox xước</button>
                    <button type="button" onClick={() => set({ fridge: 'white' })} className={chip(spec.fridge === 'white')}>Trắng bóng</button>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={`${spec.shape}|${spec.material}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-6 aspect-[4/3]">
                <div data-testid="mg-preview" style={sh.wMm / sh.hMm >= 4 / 3 ? { width: '100%', aspectRatio: aspect } : { height: '100%', aspectRatio: aspect }}>
                  <MagnetSvg spec={spec} data={data} logo={logo} cut style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.28))' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in A4 · {fit.per} con · nét hồng = đường bế (CutContour)</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[240px]" data-testid="mg-sheet">
                  <MagnetSheetSvg spec={spec} data={data} logo={logo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sh.name}{sh.kind === 'die' ? ` (${sh.wMm}×${sh.hMm}mm)` : ''} · {matName} · lề xén {MG_BLEED_MM}mm · {fit.per} con/tờ A4</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mg-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mg-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG thiết kế
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="mg-pdf" title="1 con, lề xén 1.5mm + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="mg-svg" title="Tờ A4 xếp sẵn: lớp In + CutContour, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt A4
              </button>
            </div>
            <PrintRequest product="magnet" title={orderTitle} defaultMaterial={matName} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in–cắt: tờ A4 có lớp <b>In</b> (hình đã tràn lề 1.5mm) và <b>CutContour</b> (đường bế, spot Magenta) — chữ đã outline, xưởng nạp thẳng máy in–cắt / bế khuôn. Nam châm dẻo dày 0.7mm cán bóng; mica 3mm in UV dán đế nam châm.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 800, pointerEvents: 'none' }}>
          <div ref={printRef}><MagnetSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={bleedRef}><MagnetSvg spec={spec} data={data} logo={logo} bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef}><MagnetSheetSvg spec={spec} data={data} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
