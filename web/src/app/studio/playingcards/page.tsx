'use client';
// Bộ bài in logo: chọn mẫu mặt lưng (đối xứng xoay 180°) + kiểu mặt bài (cổ điển / hiện đại / áo dài Việt) →
// điền thương hiệu, logo → xem 3D (tay bài xoè, xấp bài, hộp mở nắp) → tải PDF in 55 trang (mặt lưng + 54 lá,
// lề xén 2mm, vạch cắt), khuôn hộp đựng (PDF/SVG có CutContour + Fold), hoặc gửi yêu cầu in.

import { useRef, useState, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  ALL_CARDS, BOX, BoxPanelSvg, CardBackSvg, CardFaceSvg, PC_BACKS, PC_BLEED, PC_FACES, PC_FONT_CSS, PC_H, PC_PALETTES, PC_R,
  PC_TEMPLATES, PC_W, TuckBoxSvg, boxGeom, cardKey, cardLabel, defaultPCData, pcPalette, svgElementOf, usePCFonts,
  type CardId, type PCData, type PCSpec,
} from '@/lib/playingcards-engine';
import { svgFileBlob, svgToCanvas, svgToPng, svgToSizedPdf } from '@/lib/svg-export';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST = PC_TEMPLATES[0];
const SAMPLE: CardId[] = [{ suit: 'S', rank: 'A' }, { suit: 'H', rank: 'K' }, { suit: 'C', rank: 'Q' }, { suit: 'D', rank: 'J' }, { suit: 'H', rank: '7' }, { joker: 'color' }];
// 13 lá xoè trong 3D (trái → phải)
const FAN: CardId[] = [
  { suit: 'C', rank: '3' }, { suit: 'D', rank: '5' }, { suit: 'S', rank: '7' }, { suit: 'H', rank: '9' }, { suit: 'C', rank: '10' },
  { joker: 'color' }, { suit: 'D', rank: 'J' }, { suit: 'C', rank: 'Q' }, { suit: 'H', rank: 'A' },
  { suit: 'S', rank: 'Q' }, { suit: 'D', rank: 'K' }, { suit: 'H', rank: 'K' }, { suit: 'S', rank: 'A' },
];
const MM_PER_IN = 25.4, MARK_ROOM = 5, MARK_LEN = 4;

// logo khách: thu nhỏ ≤ 900px, giữ nền trong, chỉ nằm trên máy
async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export default function PlayingCardsPage() {
  const ready = usePCFonts();
  const [spec, setSpec] = useState<PCSpec>(FIRST.spec);
  const [data, setData] = useState<PCData>(defaultPCData());
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [showAll, setShowAll] = useState(false);
  const backRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const pal = pcPalette(spec.palette);
  const set = (p: Partial<PCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (k: keyof PCData, v: string) => setData((d) => ({ ...d, [k]: v }));
  const slug = slugify(`bo-bai-${data.brand || ''}`, 'bo-bai');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // PDF in bài: trang 1 = mặt lưng (dùng chung 54 lá), trang 2–55 = 54 mặt bài; lề xén 2mm + vạch cắt, 300dpi
  const cardsPdf = async (onStep?: (i: number) => void): Promise<Blob> => {
    const [{ jsPDF }, css] = await Promise.all([import('jspdf'), embedFontCss(PC_FONT_CSS)]);
    const wB = PC_W + PC_BLEED * 2, hB = PC_H + PC_BLEED * 2;
    const pageW = wB + MARK_ROOM * 2, pageH = hB + MARK_ROOM * 2;
    const outW = Math.round((wB / MM_PER_IN) * 300), outH = Math.round((hB / MM_PER_IN) * 300);
    const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait', compress: true });
    const nodes = [<CardBackSvg key="b" spec={spec} data={data} bleed uid="pdfb" />, ...ALL_CARDS.map((c) => <CardFaceSvg key={cardKey(c)} card={c} spec={spec} data={data} bleed />)];
    for (let i = 0; i < nodes.length; i++) {
      onStep?.(i);
      const el = await svgElementOf(nodes[i]);
      const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = css; el.insertBefore(st, el.firstChild);
      const c = await svgToCanvas(el, outW, outH, '#FFFFFF');
      if (i > 0) pdf.addPage([pageW, pageH], 'portrait');
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', MARK_ROOM, MARK_ROOM, wB, hB, undefined, 'FAST');
      // vạch cắt 4 góc vùng thành phẩm
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
      const x0 = MARK_ROOM + PC_BLEED, y0 = MARK_ROOM + PC_BLEED, x1 = x0 + PC_W, y1 = y0 + PC_H, g = PC_BLEED;
      for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
        pdf.line(cx - sx * g, cy, cx - sx * (g + MARK_LEN), cy);
        pdf.line(cx, cy - sy * g, cx, cy - sy * (g + MARK_LEN));
      }
    }
    return pdf.output('blob');
  };
  const [step, setStep] = useState(0);
  const downloadCards = () => run('cards', async () => downloadBlob(await cardsPdf(setStep), `${slug}-55-trang-file-in.pdf`));
  const boxPdf = async () => {
    const el = svgOf(boxRef); if (!el) throw new Error('Chưa dựng xong khuôn hộp');
    const vb = el.viewBox.baseVal;
    return svgToSizedPdf(el, PC_FONT_CSS, vb.width, vb.height, 300);
  };
  const downloadBoxPdf = () => run('boxpdf', async () => downloadBlob(await boxPdf(), `${slug}-khuon-hop.pdf`));
  const downloadBoxSvg = () => run('boxsvg', async () => {
    const el = svgOf(boxRef); if (!el) return;
    downloadBlob(await svgFileBlob(el, PC_FONT_CSS), `${slug}-khuon-hop.svg`);
  });
  const downloadPng = () => run('png', async () => {
    const el = svgOf(backRef); if (!el) return;
    downloadBlob(await svgToPng(el, PC_FONT_CSS, 1200), `${slug}-mat-lung.png`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const [pdf, boxEl] = await Promise.all([cardsPdf(), Promise.resolve(svgOf(boxRef))]);
    if (!boxEl) throw new Error('Chưa dựng xong khuôn hộp, thử lại nhé.');
    const boxSvg = await svgFileBlob(boxEl, PC_FONT_CSS);
    const file = zipStore([
      { name: `${slug}-55-trang-file-in.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) },
      { name: `${slug}-khuon-hop.svg`, data: new Uint8Array(await boxSvg.arrayBuffer()) },
    ]);
    let preview: Blob;
    try {
      const c = await view3d.current!.snapshot(1200, 900);
      preview = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/jpeg', 0.85));
    } catch {
      preview = await svgToPng(svgOf(backRef)!, PC_FONT_CSS, 900, { watermark: false });
    }
    return { file, fileName: `${slug}-bo-bai.zip`, preview };
  };

  const build3d = async () => {
    const [m, faces, back, bf, bb, bs, bl] = await Promise.all([
      import('@/lib/playingcards-3d'),
      Promise.all(FAN.map((c) => svgElementOf(<CardFaceSvg card={c} spec={spec} data={data} uid={`f3-${cardKey(c)}`} />))),
      svgElementOf(<CardBackSvg spec={spec} data={data} uid="b3" />),
      svgElementOf(<BoxPanelSvg panel="front" spec={spec} data={data} />),
      svgElementOf(<BoxPanelSvg panel="back" spec={spec} data={data} />),
      svgElementOf(<BoxPanelSvg panel="side" spec={spec} data={data} />),
      svgElementOf(<BoxPanelSvg panel="lid" spec={spec} data={data} />),
    ]);
    return m.playingCardsBuilder({ faces, back, boxFront: bf, boxBack: bb, boxSide: bs, boxLid: bl, boxColor: pal.bg, fontCss: PC_FONT_CSS, wMm: PC_W, hMm: PC_H, rMm: PC_R, box: BOX });
  };
  // hook cho QC (chụp 3D góc mặc định)
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __pcSnap?: (w: number, h: number) => Promise<string> }).__pcSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const backName = PC_BACKS.find((b) => b.id === spec.back)?.name || '';
  const faceName = PC_FACES.find((x) => x.id === spec.face)?.name || '';
  const orderTitle = `Bộ bài in logo 54 lá + hộp · ${backName} · mặt bài ${faceName}`;
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const g = boxGeom();

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bộ bài in logo" sub="Bộ bài tây 54 lá in logo mặt lưng + hộp đựng — quà Tết doanh nghiệp, quán cà phê board game, sự kiện. Mặt lưng đối xứng, lật ngược vẫn y hệt." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu mặt lưng (${PC_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {PC_TEMPLATES.map((t) => {
                  const on = spec.back === t.spec.back && spec.palette === t.spec.palette && spec.face === t.spec.face;
                  return (
                    <button key={t.id} type="button" onClick={() => setSpec(t.spec)} data-testid="pc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: `${PC_W} / ${PC_H}` }}>
                        <CardBackSvg spec={t.spec} data={data} uid={`tpl-${t.id}`} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thương hiệu">
              <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Tên thương hiệu</span>
                  <input className="mv-input" value={data.brand} maxLength={40} onChange={(e) => setField('brand', e.target.value)} placeholder="AN KHANG" data-testid="pc-brand" />
                </label>
                <label className="block col-span-2 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Dòng phụ / lời chúc</span>
                  <input className="mv-input" value={data.slogan} maxLength={48} onChange={(e) => setField('slogan', e.target.value)} placeholder="Xuân Đinh Mùi 2027" data-testid="pc-slogan" />
                </label>
                <label className="block col-span-2 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Website / hotline (in trên hộp)</span>
                  <input className="mv-input" value={data.web} maxLength={40} onChange={(e) => setField('web', e.target.value)} placeholder="ankhang.vn" data-testid="pc-web" />
                </label>
                <div className="col-span-2 sm:col-span-1">
                  <span className="mv-label block mb-1.5">Logo (tuỳ chọn)</span>
                  <div className="flex items-center gap-2">
                    <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" /> {data.logo ? 'Đổi logo' : 'Tải logo'}
                      <input type="file" accept="image/*" className="hidden" data-testid="pc-logo"
                        onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) setField('logo', await readLogo(fl)); e.target.value = ''; }} />
                    </label>
                    {data.logo && <button type="button" onClick={() => setField('logo', '')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ</button>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Không có logo → tự vẽ chữ cái đầu. Logo chỉ xử lý trên máy anh/chị.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mặt bài, hoạ tiết & màu">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Kiểu mặt bài (J · Q · K, chữ số)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" data-testid="pc-faces">
                    {PC_FACES.map((fc) => (
                      <button key={fc.id} type="button" onClick={() => set({ face: fc.id })} className={`${chip(spec.face === fc.id)} text-left`}>
                        <div className="font-semibold">{fc.name}</div>
                        <div className="text-[10.5px] opacity-70 font-normal">{fc.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Hoạ tiết mặt lưng</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pc-backs">
                    {PC_BACKS.map((b) => <button key={b.id} type="button" onClick={() => set({ back: b.id })} className={chip(spec.back === b.id)}>{b.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="pc-palettes">
                    {PC_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${p.bg} 55%, ${p.accent} 55%)` }} />
                        <span className="truncate">{p.name}</span>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.brand, data.slogan, data.web, data.logo?.length])} refitKey="deck" debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="pc-flat">
              <div className="grid grid-cols-[1fr_2fr] gap-3 items-start">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt lưng</div>
                  <div ref={backRef} data-testid="pc-back"><CardBackSvg spec={spec} data={data} uid="main" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt bài mẫu</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SAMPLE.map((c) => <div key={cardKey(c)} title={cardLabel(c)}><CardFaceSvg card={c} spec={spec} data={data} uid={`s-${cardKey(c)}`} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>)}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowAll((v) => !v)} className="mv-btn mv-btn-ghost w-full !flex justify-center !py-2 !text-xs" data-testid="pc-show-all">
                {showAll ? 'Thu gọn' : 'Xem cả bộ 54 lá'}
              </button>
              {showAll && (
                <div className="grid grid-cols-6 gap-1 max-h-[420px] overflow-auto pr-1" data-testid="pc-all">
                  {ALL_CARDS.map((c) => <div key={cardKey(c)} data-testid="pc-card" data-card={cardKey(c)} title={cardLabel(c)}><CardFaceSvg card={c} spec={spec} data={data} uid={`a-${cardKey(c)}`} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>)}
                </div>
              )}
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Khuôn hộp đựng {BOX.W}×{BOX.H}×{BOX.D}mm (gài 2 đầu)</div>
                <div className="rounded-lg overflow-hidden bg-white border border-mv-hair"><TuckBoxSvg spec={spec} data={data} labels style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">Lá {PC_W}×{PC_H}mm bo góc {PC_R}mm · in 300dpi · lề xén {PC_BLEED}mm · vạch cắt</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadCards} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pc-pdf">
                {busy === 'cards' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {step + 1}/55</> : <><FileDown className="w-3.5 h-3.5" /> PDF in 55 trang</>}
              </button>
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-3d" disabled={tab !== '3d'}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadBoxPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-box-pdf">
                {busy === 'boxpdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF khuôn hộp
              </button>
              <button type="button" onClick={downloadBoxSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pc-box-svg" title="File vector, chữ đã outline, có lớp CutContour + Fold">
                {busy === 'boxsvg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} SVG khuôn hộp
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost col-span-2 !flex justify-center !py-2.5 !text-xs" data-testid="pc-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG mặt lưng
              </button>
            </div>
            <PrintRequest product="playingcards" title={orderTitle} defaultMaterial="Bộ bài giấy 310gsm + hộp in" design={{ spec, data: { ...data, logo: data.logo ? '(logo đính kèm trong file)' : '' } }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in gồm mặt lưng (1 trang, in chung cho cả bộ) + 54 mặt bài, kèm khuôn hộp {g.w.toFixed(0)}×{g.h.toFixed(0)}mm. Xưởng in bài giấy 310gsm phủ bóng, bế bo góc {PC_R}mm.</p>
          </div>
        </div>
      )}

      {/* khuôn hộp (ẩn, ngoài màn hình) để xuất PDF/SVG có outline chữ */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={boxRef}><TuckBoxSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
