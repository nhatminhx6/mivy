'use client';
// Thẻ hành lý: chọn loại (PVC in 2 mặt / da simili ép logo / cao su đúc nổi) → mẫu → nội dung (+ danh sách tên in sẵn)
// → xem thành phẩm 3D (thẻ treo quai vali + thẻ lật mặt sau dưới sàn) → tải file in (PDF có lề xén + vạch cắt, SVG đường bế) hoặc đặt in.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  LT_BLEED_MM, LT_FIELDS, LT_FOILS, LT_FONTS, LT_FONT_CSS, LT_KINDS, LT_LEATHERS, LT_PALETTES, LT_RUBBERS, LT_TEMPLATES,
  LuggageInsertSvg, LuggageTagSvg, defaultLTData, ltKind, ltPeople, useLTFonts, type LTData, type LTKind, type LTSpec,
} from '@/lib/luggagetag-engine';
import { selfContainedSvg, svgFileBlob, svgToCanvas, svgToPng } from '@/lib/svg-export';
import { drawPrintPage, printPageDims } from '@/lib/print-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: LTSpec = { kind: 'pvc', ...LT_TEMPLATES[0].spec, strap: 'cable', leather: 'tan', foil: 'gold', rubber: 'navy' };
const MAX_PDF = 200;

async function loadLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));

interface PdfPage { el: SVGSVGElement; wMm: number; hMm: number; bleed: number }
/** PDF nhiều trang, mỗi trang khổ riêng (thẻ / khuôn ép / thẻ kẹp), có lề xén + vạch cắt, chữ đã outline */
async function mixedPdf(pages: PdfPage[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const p of pages) {
    const size = { wMm: p.wMm, hMm: p.hMm };
    const { pageW, pageH } = printPageDims(size, p.bleed);
    const ori = pageW >= pageH ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: ori, compress: true });
    else pdf.addPage([pageW, pageH], ori);
    const wMm = p.wMm + p.bleed * 2, hMm = p.hMm + p.bleed * 2;
    const outW = Math.round((wMm / 25.4) * 300), outH = Math.round((hMm / 25.4) * 300);
    const c = await svgToCanvas(await selfContainedSvg(p.el, LT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/png'), outW, outH, size, p.bleed);
  }
  return pdf!.output('blob');
}

export default function LuggageTagPage() {
  const ready = useLTFonts();
  const [spec, setSpec] = useState<LTSpec>(FIRST);
  const [data, setData] = useState<LTData>(defaultLTData());
  const [logo, setLogo] = useState('');
  const [who, setWho] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const texFront = useRef<HTMLDivElement | null>(null);
  const texBack = useRef<HTMLDivElement | null>(null);
  const texBack2 = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const printFront = useRef<HTMLDivElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);
  const printBacks = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const k = ltKind(spec.kind);
  const lgo = logo || undefined;
  const people = ltPeople(data);
  const cur = people[Math.min(who, people.length - 1)];
  const pdfPeople = people.slice(0, MAX_PDF);
  const set = (p: Partial<LTSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setData((d) => ({ ...d, [key]: v }));
  const setKind = (kd: LTKind) => set({ kind: kd });
  const slug = slugify(`the-hanh-ly-${data.brand || ''}`, 'the-hanh-ly');
  const hasNames = (data.names || '').trim().length > 0;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    try { setLogo(await loadLogo(f)); } catch { alert('Không đọc được ảnh logo này, thử file PNG/JPG khác nhé.'); }
  };
  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, LT_FONT_CSS, 1600), `${slug}-mat-${side === 'front' ? 'truoc' : 'sau'}.png`);
  });
  const pdfPages = (): PdfPage[] => {
    const f = svgOf(printFront);
    const backs = Array.from(printBacks.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
    if (!f || !backs.length) throw new Error('Chưa dựng xong file in, thử lại nhé.');
    if (spec.kind === 'pvc') return [{ el: f, wMm: k.wMm, hMm: k.hMm, bleed: LT_BLEED_MM }, ...backs.map((el) => ({ el, wMm: k.wMm, hMm: k.hMm, bleed: LT_BLEED_MM }))];
    const card = k.card!;
    return [{ el: f, wMm: k.wMm, hMm: k.hMm, bleed: 0 }, ...backs.map((el) => ({ el, wMm: card.wMm, hMm: card.hMm, bleed: LT_BLEED_MM }))];
  };
  const makePdf = () => mixedPdf(pdfPages());
  const pdfName = () => `${slug}-${spec.kind}-${pdfPeople.length}the-file-in.pdf`;
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName()));
  const downloadSvg = () => run('svg', async () => {
    const el = svgOf(cutRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, LT_FONT_CSS), `${slug}-${spec.kind}-${k.wMm}x${k.hMm}-file-cat.svg`);
  });

  const build3d = () => import('@/lib/luggagetag-3d').then((m) => m.luggageTagBuilder({
    spec, front: svgOf(texFront), back: svgOf(texBack), back2: svgOf(texBack2), mask: svgOf(maskRef), fontCss: LT_FONT_CSS,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __ltSnap?: (w: number, h: number) => Promise<string> }).__ltSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const makeFiles = async () => {
    const file = await makePdf();
    const preview = view3d.current
      ? await view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : await svgToPng(svgOf(frontRef)!, LT_FONT_CSS, 900);
    return { file, fileName: pdfName(), preview };
  };
  const material = spec.kind === 'pvc' ? 'Thẻ PVC + dây nhựa' : spec.kind === 'leather' ? 'Thẻ da simili ép logo' : undefined;
  const orderTitle = `Thẻ hành lý ${k.name.toLowerCase()} ${k.wMm}×${k.hMm}mm${hasNames ? ` · in sẵn ${people.length} tên` : ''}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const field = (f: (typeof LT_FIELDS)[number]) => (
    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{f.label}</span>
      {f.multiline
        ? <textarea className="mv-input min-h-[84px]" value={data[f.key] || ''} onChange={(e) => { setField(f.key, e.target.value); setWho(0); }} data-testid={`lt-${f.key}`} />
        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`lt-${f.key}`} />}
    </label>
  );
  const sv = { width: '100%', height: '100%', display: 'block' } as const;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thẻ hành lý" sub="Thẻ treo vali in logo — quà cho khách đoàn của công ty du lịch, hãng, khách sạn, trường. Mặt sau là thẻ thông tin Họ tên / SĐT / Chuyến bay / Tour + QR liên hệ." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        {LT_KINDS.map((kd) => <button key={kd.id} type="button" className="mv-seg-btn" data-active={spec.kind === kd.id} onClick={() => setKind(kd.id)} data-testid={`lt-kind-${kd.id}`}>{kd.name}</button>)}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${LT_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {LT_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="lt-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-ink/[0.04] p-2 grid place-items-center" style={{ aspectRatio: '3 / 4' }}>
                        <div style={{ aspectRatio: `${k.wMm} / ${k.hMm}`, height: '100%', filter: 'drop-shadow(0 4px 8px rgba(15,23,42,0.18))' }}>
                          <LuggageTagSvg spec={{ ...spec, ...t.spec }} data={data} side="front" logo={lgo} style={sv} uid={`ltt-${t.id}`} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Chất liệu & dây">
              <div className="space-y-4">
                <p className="text-xs text-slate-400">{k.name} · {k.wMm}×{k.hMm}mm — {k.note}.</p>
                {spec.kind === 'pvc' && (
                  <div>
                    <div className="mv-label mb-1.5">Dây treo</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="lt-straps">
                      <button type="button" onClick={() => set({ strap: 'cable' })} className={chip(spec.strap === 'cable')}>Cáp thép xoắn ốc vít</button>
                      <button type="button" onClick={() => set({ strap: 'strap' })} className={chip(spec.strap === 'strap')}>Quai nhựa trong</button>
                    </div>
                  </div>
                )}
                {spec.kind === 'leather' && (
                  <>
                    <div>
                      <div className="mv-label mb-1.5">Màu da</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="lt-leathers">
                        {LT_LEATHERS.map((l) => (
                          <button key={l.id} type="button" onClick={() => set({ leather: l.id })} className={`flex items-center gap-2 ${chip(spec.leather === l.id)}`}>
                            <span className="w-4 h-4 rounded-full border border-mv-hair" style={{ background: l.color }} />{l.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mv-label mb-1.5">Logo mặt trước</div>
                      <div className="flex flex-wrap gap-1.5" data-testid="lt-foils">
                        {LT_FOILS.map((f) => <button key={f.id} type="button" onClick={() => set({ foil: f.id })} className={chip(spec.foil === f.id)}>{f.name}</button>)}
                      </div>
                    </div>
                  </>
                )}
                {spec.kind === 'rubber' && (
                  <div>
                    <div className="mv-label mb-1.5">Màu cao su · màu nổi</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="lt-rubbers">
                      {LT_RUBBERS.map((r) => (
                        <button key={r.id} type="button" onClick={() => set({ rubber: r.id })} className={`flex items-center gap-2 ${chip(spec.rubber === r.id)}`}>
                          <span className="w-5 h-5 rounded-full border border-mv-hair shrink-0" style={{ background: `linear-gradient(135deg, ${r.base} 55%, ${r.ink} 55%)` }} />
                          <span className="truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {spec.kind !== 'pvc' && <p className="text-[11px] text-slate-500">Mặt trước {spec.kind === 'leather' ? 'ép logo' : 'đúc nổi'} 1 màu (hình + tên + slogan). Bảng màu bên dưới áp cho thẻ thông tin kẹp trong ô nhựa mặt sau.</p>}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} data-testid="lt-logo-input" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs !py-2" data-testid="lt-logo-btn">
                    <ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (tuỳ chọn)'}
                  </button>
                  {logo && (
                    <>
                      <img src={logo} alt="logo" className="h-9 w-9 object-contain rounded border border-mv-hair bg-white" />
                      <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !text-xs !py-2"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-500">Logo chỉ xử lý trên máy anh/chị. Da / cao su: logo tự chuyển 1 màu.</span>
                </div>
                <div className="mv-label">Mặt trước</div>
                <div className="grid grid-cols-2 gap-3">{LT_FIELDS.filter((f) => f.side === 'front').map(field)}</div>
                <div className="mv-label pt-1">Mặt sau (thẻ thông tin)</div>
                <div className="grid grid-cols-2 gap-3">{LT_FIELDS.filter((f) => f.side === 'back').map(field)}</div>
                <p className="text-[11px] text-slate-500">{hasNames ? `${people.length} thẻ in sẵn tên — mỗi người 1 mặt sau riêng.` : 'Không in sẵn tên: thẻ để trống dòng kẻ cho khách tự ghi.'}{people.length > MAX_PDF ? ` File in xuất ${MAX_PDF} thẻ đầu, phần còn lại gửi kèm danh sách khi đặt in.` : ''}</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="lt-palettes">
                    {LT_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.bg} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục mặt trước</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="lt-layouts">
                    {['jet', 'map', 'wave', 'suitcase', 'stamp', 'minimal'].map((id, i) => (
                      <button key={id} type="button" onClick={() => set({ layout: id })} className={chip(spec.layout === id)}>{['Máy bay', 'Bản đồ chấm', 'Biển & nắng', 'Vali retro', 'Con dấu', 'Tối giản'][i]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="lt-fonts">
                    {LT_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.brand || 'An Khang'}
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
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, logo.length])} refitKey={spec.kind} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`grid grid-cols-2 gap-3 rounded-lg bg-ink/[0.04] p-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="lt-flat">
              {(['front', 'back'] as const).map((side) => (
                <div key={side}>
                  <div className="text-[11px] text-slate-400 mb-1">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</div>
                  <div ref={side === 'front' ? frontRef : backRef} style={{ aspectRatio: `${k.wMm} / ${k.hMm}`, filter: 'drop-shadow(0 8px 14px rgba(15,23,42,0.22))' }} data-testid={`lt-${side}`}>
                    <LuggageTagSvg spec={spec} data={data} side={side} person={cur} logo={lgo} style={sv} uid={`ltv-${side}`} />
                  </div>
                </div>
              ))}
            </div>
            {people.length > 1 && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span>Xem thẻ của:</span>
                <select className="mv-input !py-1 !text-xs !w-auto" value={who} onChange={(e) => setWho(Number(e.target.value))} data-testid="lt-who">
                  {people.map((p, i) => <option key={i} value={i}>{i + 1}. {p.name || '(trống)'}</option>)}
                </select>
              </div>
            )}
            <div className="text-[11px] text-slate-400 text-center">{k.name} · {k.wMm}×{k.hMm}mm{spec.kind === 'pvc' ? ` · lề xén ${LT_BLEED_MM}mm` : ` · thẻ kẹp ${k.card!.wMm}×${k.card!.hMm}mm`} · {pdfPeople.length} thẻ</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lt-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lt-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt sau
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="lt-pdf"
                title={spec.kind === 'pvc' ? 'Trang 1 mặt trước, rồi mỗi người 1 trang mặt sau — có lề xén + vạch cắt' : 'Trang 1 khuôn ép / bản đúc (đen = phần ép, nổi), rồi thẻ thông tin kẹp trong của từng người'}>
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({pdfPeople.length + 1} trang)
              </button>
              <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="lt-svg" title="File vector: lớp In + lớp CutContour (viền + khe xỏ dây), chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG đường bế
              </button>
            </div>
            <PrintRequest product="luggagetag" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              {spec.kind === 'pvc' ? 'PVC in 2 mặt, nền tràn lề, khe xỏ dây bế sẵn (lớp CutContour màu hồng). Cáp / quai do xưởng gắn.' : 'Trang 1 là bản khuôn (đen = phần ép kim / đúc nổi). Thẻ thông tin in giấy C300, kẹp vào ô nhựa mặt sau.'}
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D, mặt nạ ép/nổi, file in */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texFront}><LuggageTagSvg spec={spec} data={data} side="front" person={people[0]} logo={lgo} layer="tex" uid="ltx-f" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBack}><LuggageTagSvg spec={spec} data={data} side="back" person={people[0]} logo={lgo} layer="tex" uid="ltx-b" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBack2}><LuggageTagSvg spec={spec} data={data} side="back" person={people[1] || people[0]} logo={lgo} layer="tex" uid="ltx-b2" style={{ width: '100%', display: 'block' }} /></div>
          {spec.kind !== 'pvc' && <div ref={maskRef}><LuggageTagSvg spec={spec} data={data} side="front" logo={lgo} layer="mask" uid="ltx-m" style={{ width: '100%', display: 'block' }} /></div>}
          <div ref={printFront} data-testid="lt-print-front"><LuggageTagSvg spec={spec} data={data} side="front" logo={lgo} layer="print" bleed={spec.kind === 'pvc'} uid="ltp-f" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={cutRef} data-testid="lt-cut"><LuggageTagSvg spec={spec} data={data} side="front" logo={lgo} layer="print" bleed cut uid="ltc-f" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printBacks} data-testid="lt-print-backs">
            {pdfPeople.map((p, i) => (
              <div key={i}>
                {spec.kind === 'pvc'
                  ? <LuggageTagSvg spec={spec} data={data} side="back" person={p} logo={lgo} layer="print" bleed uid={`ltp-b${i}`} style={{ width: '100%', display: 'block' }} />
                  : <LuggageInsertSvg spec={spec} data={data} person={p} bleed uid={`lti-${i}`} style={{ width: '100%', display: 'block' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
