'use client';
// Huy hiệu cài áo: chọn mẫu (sự kiện, CLB, chiến dịch, quán cà phê, ảnh cặp đôi, Tết, tốt nghiệp, bảng tên)
// → điền chữ (chữ chạy vòng tròn), ảnh riêng (xử lý trên máy), danh sách tên in hàng loạt → khổ Ø32/44/58/75, mặt sau
// kim cài / nam châm / khui bia / gương → xem 3D → tải PNG, PDF tờ A4, file in–cắt SVG (gấp mép + đường cắt) hoặc gửi in.

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  PIN_BACKS, PIN_FONTS, PIN_FONT_CSS, PIN_LAYOUTS, PIN_PALETTES, PIN_SAMPLES, PIN_SIZES, PIN_TEMPLATES, SAFE_INSET,
  PinSheetSvg, PinSvg, defaultPinSpec, parseNames, pinItems, pinLayout, pinPages, pinSheetFit, pinSize, usePinFonts,
  type PinData, type PinLayoutId, type PinSpec,
} from '@/lib/pin-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

// đổi bố cục: ô còn nguyên chữ mẫu bố cục cũ → chữ mẫu bố cục mới; ô khách tự viết thì giữ
function switchData(d: PinData, from: PinLayoutId, to: PinLayoutId): PinData {
  const oldS = PIN_SAMPLES[from], next: PinData = { ...PIN_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k] && k in next) next[k] = v;
  return next;
}

async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

export default function PinPage() {
  const ready = usePinFonts();
  const [spec, setSpec] = useState<PinSpec>(defaultPinSpec);
  const [data, setData] = useState<PinData>({ ...PIN_SAMPLES.event });
  const [names, setNames] = useState('');
  const [qty, setQty] = useState(String(pinSheetFit(defaultPinSpec.size).per));
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [allPages, setAllPages] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const print2Ref = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const sheetsRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const L = pinLayout(spec.layout);
  const sz = pinSize(spec.size);
  const fit = pinSheetFit(spec.size);
  const nameList = L.nameKey ? parseNames(names) : [];
  const items = pinItems(spec, data, nameList, Math.max(1, parseInt(qty || '1', 10) || 1));
  const pages = pinPages(spec, items.length);
  const batch = nameList.length > 0;
  const slug = slugify(`huy-hieu-${data.top || data.title || ''}`, 'huy-hieu');
  const set = (p: Partial<PinSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const pickTpl = (t: (typeof PIN_TEMPLATES)[number]) => {
    if (t.spec.layout !== spec.layout) setData((d) => switchData(d, spec.layout, t.spec.layout));
    setSpec((s) => ({ ...s, ...t.spec }));
  };
  const setSize = (id: string) => { set({ size: id }); if (!batch) setQty(String(pinSheetFit(id).per)); };

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); setAllPages(false); }
  };
  // hàng loạt theo tên → mọi tờ khác nhau; lặp 1 mẫu → chỉ cần 1 tờ, xưởng in N tờ
  const sheetEls = async (): Promise<SVGSVGElement[]> => {
    if (batch && pages > 1) { setAllPages(true); await tick(120); }
    const els = Array.from(sheetsRef.current?.querySelectorAll('svg[data-pin-sheet]') || []) as SVGSVGElement[];
    if (!els.length) throw new Error('Chưa dựng xong tờ in');
    return batch ? els : els.slice(0, 1);
  };
  const sheetSvgs = async () => {
    const els = await sheetEls();
    return Promise.all(els.map(async (el) => new XMLSerializer().serializeToString(await selfContainedSvg(el, PIN_FONT_CSS, { outline: true }))));
  };
  const sheetPdf = async (): Promise<Blob> => {
    const els = await sheetEls();
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    for (let i = 0; i < els.length; i++) {
      if (i) pdf.addPage('a4', 'portrait');
      const c = await svgToCanvas(await selfContainedSvg(els[i], PIN_FONT_CSS, { outline: true }), 2480, 3508, '#ffffff');
      pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf.output('blob');
  };
  const sheetNote = batch ? `${items.length} con · ${pages} tờ` : `${fit.per} con/tờ · cần ${pages} tờ cho ${items.length} con`;

  const downloadPng = () => run('png', async () => {
    const el = svgOf(faceRef); if (!el) return;
    downloadBlob(await svgToPng(el, PIN_FONT_CSS, 1600), `${slug}-${sz.id}mm.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await sheetPdf(), `${slug}-${sz.id}mm-to-A4${batch ? `-${items.length}con` : ''}.pdf`));
  const downloadSvg = () => run('svg', async () => {
    const svgs = await sheetSvgs();
    if (svgs.length === 1) { downloadBlob(new Blob([svgs[0]], { type: 'image/svg+xml' }), `${slug}-${sz.id}mm-file-in-cat.svg`); return; }
    const enc = new TextEncoder();
    downloadBlob(zipStore(svgs.map((s, i) => ({ name: `${slug}-${sz.id}mm-to-${String(i + 1).padStart(2, '0')}.svg`, data: enc.encode(s) }))), `${slug}-${sz.id}mm-${items.length}con-file-in-cat.zip`);
  });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(faceRef);
    if (!pv) throw new Error('Chưa dựng xong huy hiệu, thử lại nhé.');
    const file = await sheetPdf();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, PIN_FONT_CSS, 900))
      : await svgToJpeg(pv, PIN_FONT_CSS, 900);
    return { file, fileName: `${slug}-${sz.id}mm-to-A4.pdf`, preview };
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await readPhoto(f)); } catch { alert('Không đọc được ảnh'); }
  };

  const d2 = L.nameKey && nameList[1] ? { ...data, [L.nameKey]: nameList[1] } : data;
  const d1 = L.nameKey && nameList[0] ? { ...data, [L.nameKey]: nameList[0] } : data;
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __pinSnap?: (w: number, h: number) => Promise<string> }).__pinSnap = async (w, h) => (await view3d.current!.snapshot(w, h)).toDataURL('image/png');
  const build3d = () => import('@/lib/pin-3d').then((m) => m.pinBuilder({
    prints: [svgOf(printRef), svgOf(print2Ref)], d: sz.d, dc: sz.dc, back: spec.back, fontCss: PIN_FONT_CSS,
  }));
  const backName = PIN_BACKS.find((b) => b.id === spec.back)?.name || '';
  const orderTitle = `Huy hiệu ${sz.name} · ${backName} · ${items.length} con`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Huy hiệu cài áo" sub="Huy hiệu tròn Ø32–75mm cho sự kiện, CLB, chiến dịch, quán cà phê, quà cặp đôi… Chữ chạy vòng, in hàng loạt theo tên, file in có sẵn vòng gấp mép + đường cắt." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PIN_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {PIN_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  const td = t.spec.layout === spec.layout ? d1 : switchData(data, spec.layout, t.spec.layout);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="pin-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-3 aspect-square">
                        <PinSvg spec={{ ...spec, ...t.spec }} data={td} photo={photo} style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 3px 5px rgba(15,23,42,0.3))' }} />
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
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pin-layouts">
                    {PIN_LAYOUTS.map((l) => (
                      <button key={l.id} type="button" onClick={() => { const t = PIN_TEMPLATES.find((x) => x.spec.layout === l.id)!; pickTpl({ ...t, spec: { ...t.spec, palette: spec.palette, font: spec.font } }); }} className={chip(spec.layout === l.id)}>{l.name}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {L.fields.map((f) => (
                    <label key={f.key} className="block">
                      <span className="mv-label block mb-1.5">{f.label}{batch && f.key === L.nameKey ? ' — đang lấy theo danh sách' : ''}</span>
                      <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pin-field-${f.key}`} disabled={batch && f.key === L.nameKey} />
                    </label>
                  ))}
                </div>
                {L.photo && (
                  <div className="flex items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh' : 'Tải ảnh lên'}
                      <input type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="pin-photo" />
                    </label>
                    {photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                    <span className="text-[11px] text-slate-500">Ảnh xử lý ngay trên máy, không gửi đi đâu</span>
                  </div>
                )}
                {L.nameKey ? (
                  <label className="block">
                    <span className="mv-label block mb-1.5">In hàng loạt theo tên (mỗi dòng 1 người — bỏ trống nếu in giống nhau)</span>
                    <textarea className="mv-input min-h-[84px]" value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Quốc Bảo\nThu Hà\nGia Khánh'} data-testid="pin-names" />
                    {batch && <span className="text-[11px] text-slate-400">{nameList.length} người → {nameList.length} huy hiệu, {pages} tờ A4</span>}
                  </label>
                ) : null}
                {!batch && (
                  <label className="block max-w-[220px]">
                    <span className="mv-label block mb-1.5">Số lượng (con)</span>
                    <input className="mv-input" type="number" min={1} max={2000} value={qty} onChange={(e) => setQty(e.target.value)} data-testid="pin-qty" />
                  </label>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Khổ, mặt sau, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ huy hiệu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pin-sizes">
                    {PIN_SIZES.map((s) => <button key={s.id} type="button" onClick={() => setSize(s.id)} className={chip(spec.size === s.id)} data-testid="pin-size">{s.name}<span className="text-slate-500 font-normal"> · in Ø{s.dc}</span></button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Mặt sau</div>
                  <div className="grid grid-cols-2 gap-1.5" data-testid="pin-backs">
                    {PIN_BACKS.map((b) => (
                      <button key={b.id} type="button" onClick={() => set({ back: b.id })} className={`${chip(spec.back === b.id)} !py-2 text-left`} data-testid="pin-back">
                        <span className="font-semibold">{b.name}</span>
                        <span className="block text-[10.5px] text-slate-400 mt-0.5 font-normal">{b.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pin-palettes">
                    {PIN_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 50%, ${pl.bg} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font chữ chính</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="pin-fonts">
                    {PIN_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, d1, d2, photo.length])} refitKey={`${spec.size}|${spec.back}`} debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="rounded-lg bg-[#E9ECF1] grid place-items-center p-5 aspect-[4/3]" data-testid="pin-preview">
                <PinSvg spec={spec} data={d1} photo={photo} mode="guide" style={{ height: '100%', aspectRatio: '1 / 1', display: 'block' }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
                <span><span className="inline-block w-3 border-t-2 border-[#EC008C] align-middle mr-1" />Đường cắt Ø{sz.dc}</span>
                <span><span className="inline-block w-3 border-t-2 border-dashed border-slate-700 align-middle mr-1" />Mép mặt Ø{sz.d} (phần ngoài gấp ra sau)</span>
                <span><span className="inline-block w-3 border-t-2 border-dashed border-green-500 align-middle mr-1" />Vùng an toàn (lùi {SAFE_INSET}mm)</span>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Tờ in A4 · {sheetNote}</div>
                <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[240px]" data-testid="pin-sheet">
                  <PinSheetSvg spec={spec} items={items} photo={photo} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · in Ø{sz.dc}mm · {backName} · {sheetNote}</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pin-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pin-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt huy hiệu
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pin-pdf" title="Tờ A4 300dpi có vòng cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF tờ A4
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pin-svg" title="Lớp In + CutContour, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt {batch && pages > 1 ? '(.zip)' : 'SVG'}
              </button>
            </div>
            <PrintRequest product="pin" title={orderTitle} defaultMaterial={`Huy hiệu ${sz.name}`} design={{ spec, data, names: nameList, qty: items.length }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Bản in mỗi con Ø{sz.dc}mm: phần ngoài vòng Ø{sz.d}mm được máy bấm <b>gấp ra sau</b> nên nền phải tràn hết — chữ, mặt người để trong vùng an toàn. File in–cắt có lớp <b>In</b> + <b>CutContour</b> (vòng cắt, spot Magenta), chữ đã outline.</p>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printRef}><PinSvg spec={spec} data={d1} photo={photo} mode="print" style={{ width: 600, display: 'block' }} /></div>
          <div ref={print2Ref}><PinSvg spec={spec} data={d2} photo={photo} mode="print" style={{ width: 600, display: 'block' }} /></div>
          <div ref={faceRef}><PinSvg spec={spec} data={d1} photo={photo} mode="face" style={{ width: 600, display: 'block' }} /></div>
          <div ref={sheetsRef}>
            {Array.from({ length: allPages ? pages : 1 }).map((_, i) => (
              <PinSheetSvg key={i} spec={spec} items={items} photo={photo} page={i} style={{ width: 840, display: 'block' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
