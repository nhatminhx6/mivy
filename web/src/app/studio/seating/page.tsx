'use client';
// Sơ đồ chỗ ngồi tiệc: dán danh sách khách ("## Bàn 1 – Họ hàng nhà trai" + tên, hoặc "Tên | Bàn") → bảng sơ đồ khổ lớn
// tự chia lưới bàn + co chữ, thẻ tên khách gấp đôi 9×5cm (6 thẻ/tờ A4, nét cắt + gấp), thẻ số bàn 10×15cm.
// Xem 3D: bảng trên giá vẽ cạnh bàn tiệc tròn. Tải PDF từng loại hoặc đặt Mivy in. Danh sách khách chỉ nằm trên máy.

import { useMemo, useRef, useState } from 'react';
import { Box, Download, FileDown, Loader2 } from 'lucide-react';
import {
  NUMBER, PER_SHEET, PLACE, SC_BLEED_MM, SC_FIELDS, SC_FONTS, SC_FONT_CSS, SC_KINDS, SC_LAYOUTS, SC_PALETTES, SC_SIZES, SC_TEMPLATES,
  PlaceFaceSvg, PlaceFlatSvg, PlaceSheetSvg, SeatingBoardSvg, TableNumberSvg,
  allGuests, defaultSCData, foilAllowed, parseGuests, sampleGuests, scPalette, scSize, useSCFonts,
  type SCData, type SCKind, type SCSpec, type SCTemplate,
} from '@/lib/seating-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { zipStore } from '@/lib/seal-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const T0 = SC_TEMPLATES[0];
const FIRST: SCSpec = { ...T0.spec, size: 'a2', foil: false, sortBy: 'given' };
const MM_PER_IN = 25.4;
const dpiFor = (wMm: number, hMm: number, max: number, px = 24e6) => Math.max(60, Math.min(max, Math.floor(Math.sqrt(px / ((wMm / MM_PER_IN) * (hMm / MM_PER_IN))))));

// nhiều tờ đúng khổ (tờ A4 thẻ tên đã có nét cắt + gấp) → 1 PDF, không thêm vạch cắt
async function sheetsPdf(els: SVGSVGElement[], wMm: number, hMm: number, dpi: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation: 'portrait', compress: true });
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], 'portrait');
    const c = await svgToCanvas(await selfContainedSvg(els[i], SC_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function SeatingPage() {
  const ready = useSCFonts();
  const [spec, setSpec] = useState<SCSpec>(FIRST);
  const [data, setData] = useState<SCData>(() => defaultSCData('wedding'));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [flat, setFlat] = useState<'board' | 'place' | 'number'>('board');
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const p = scPalette(spec.palette);
  const sz = scSize(spec.size);
  const canFoil = foilAllowed(spec);
  const useFoil = spec.foil && canFoil;
  const tables = useMemo(() => parseGuests(data.guests || '', spec.sortBy), [data.guests, spec.sortBy]);
  const guests = useMemo(() => allGuests(tables), [tables]);
  const sheets = useMemo(() => Array.from({ length: Math.ceil(guests.length / PER_SHEET) }, (_, i) => guests.slice(i * PER_SHEET, i * PER_SHEET + PER_SHEET)), [guests]);
  const sample3 = guests.length ? (tables[0]?.guests.slice(0, 3).map((name) => ({ name, table: tables[0] })) || []) : [];
  const slug = slugify(`so-do-cho-ngoi-${data.names || ''}`, 'so-do-cho-ngoi');

  const set = (q: Partial<SCSpec>) => setSpec((s) => ({ ...s, ...q }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const pickTemplate = (t: SCTemplate) => {
    setSpec((s) => ({ ...s, ...t.spec }));
    if (!dirty) setData(defaultSCData(t.spec.kind));
  };
  const pickKind = (k: SCKind) => {
    const t = SC_TEMPLATES.find((x) => x.spec.kind === k)!;
    setSpec((s) => ({ ...s, ...t.spec }));
    if (!dirty) setData(defaultSCData(k));
  };
  const tplOn = (t: SCTemplate) => spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const q = (sel: string) => Array.from(printRef.current?.querySelectorAll(sel) || []) as SVGSVGElement[];
  const boardEl = () => printRef.current?.querySelector('[data-print="board"] svg') as SVGSVGElement | null;
  const makeBoardPdf = async () => {
    const el = boardEl(); if (!el) throw new Error('Chưa dựng xong sơ đồ, thử lại nhé.');
    const els = [el, ...q('[data-print="board-foil"] svg')];
    return svgsToPrintPdf(els, SC_FONT_CSS, { wMm: sz.wMm, hMm: sz.hMm }, SC_BLEED_MM, dpiFor(sz.wMm + 6, sz.hMm + 6, 150));
  };
  const makePlacePdf = async () => {
    const art = q('[data-print="sheet"] > svg'), foil = q('[data-print="sheet-foil"] > svg');
    if (!art.length) throw new Error('Danh sách khách đang trống.');
    const els = useFoil ? art.flatMap((e, i) => (foil[i] ? [e, foil[i]] : [e])) : art;
    return sheetsPdf(els, 210, 297, 220);
  };
  const makeNumberPdf = async () => {
    const art = q('[data-print="number"] > svg'), foil = q('[data-print="number-foil"] > svg');
    if (!art.length) throw new Error('Chưa có bàn nào.');
    const els = useFoil ? art.flatMap((e, i) => (foil[i] ? [e, foil[i]] : [e])) : art;
    return svgsToPrintPdf(els, SC_FONT_CSS, { wMm: NUMBER.w, hMm: NUMBER.h }, SC_BLEED_MM, 300);
  };
  const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg') => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));
  const dl = (key: string, make: () => Promise<Blob>, name: string) => () => run(key, async () => downloadBlob(await make(), name));
  const downloadPng = () => run('png', async () => { const el = boardRef.current?.querySelector('svg') as SVGSVGElement | null; if (el) downloadBlob(await svgToPng(el, SC_FONT_CSS, 2400), `${slug}.png`); });
  const download3d = () => run('3d', async () => { if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.'); downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-3d.png`); });
  const makeFiles = async () => {
    const pv = boardRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!pv) throw new Error('Chưa dựng xong sơ đồ, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c)).catch(() => svgToJpeg(pv, SC_FONT_CSS, 900))
      : svgToJpeg(pv, SC_FONT_CSS, 900);
    const [b1, b2, b3, pre] = await Promise.all([makeBoardPdf(), makePlacePdf(), makeNumberPdf(), preview]);
    const u8 = async (b: Blob) => new Uint8Array(await b.arrayBuffer());
    const file = zipStore([
      { name: `${slug}-so-do-${sz.id}.pdf`, data: await u8(b1) },
      { name: `${slug}-the-ten-${guests.length}-khach.pdf`, data: await u8(b2) },
      { name: `${slug}-so-ban-${tables.length}-ban.pdf`, data: await u8(b3) },
    ]);
    return { file, fileName: `${slug}-file-in.zip`, preview: pre };
  };

  const texEl = (sel: string) => texRef.current?.querySelector(sel) as SVGSVGElement | null;
  const build3d = () => import('@/lib/seating-3d').then((m) => m.seatingBuilder({
    board: texEl('[data-tex="board"] svg'), boardFoil: useFoil ? texEl('[data-tex="board-foil"] svg') : null, wMm: sz.wMm, hMm: sz.hMm,
    places: Array.from(texRef.current?.querySelectorAll('[data-tex="place"] svg') || []) as SVGSVGElement[], number: texEl('[data-tex="number"] svg'),
    fontCss: SC_FONT_CSS, accent: p.accent, accent2: p.accent2, gold: !!p.gold, cardColor: p.dark ? p.paper : p.card,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __scSnap?: (w: number, h: number) => Promise<string> }).__scSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `Sơ đồ chỗ ngồi ${sz.name} · ${guests.length} thẻ tên · ${tables.length} số bàn${useFoil ? ' · ép kim' : ''}`;
  const t0 = tables[0];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Sơ đồ chỗ ngồi · thẻ tên bàn" sub="Dán danh sách khách là có ngay bảng sơ đồ khổ lớn tự chia bàn, thẻ tên từng khách gấp đôi và thẻ số bàn — cho tiệc cưới, thôi nôi, tất niên. File in chuẩn xưởng." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {SC_KINDS.map((k) => <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => pickKind(k.id)} data-testid={`sc-kind-${k.id}`}>{k.name}</button>)}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SC_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {SC_TEMPLATES.map((t) => {
                  const ts: SCSpec = { ...spec, ...t.spec, foil: false };
                  const td = dirty ? data : defaultSCData(t.spec.kind);
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="sc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${tplOn(t) ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <SeatingBoardSvg spec={ts} data={td} maxTables={9} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin tiệc">
              <div className="grid grid-cols-2 gap-3">
                {SC_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`sc-${f.key}`} />
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Danh sách khách">
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mỗi bàn 1 dòng tiêu đề <b className="text-slate-300">## Bàn 1 – Họ hàng nhà trai</b> rồi tên khách mỗi dòng 1 người — hoặc ghi <b className="text-slate-300">Tên khách | Bàn 3</b>. Tên trong mỗi bàn tự xếp A→Z. Danh sách chỉ nằm trên máy anh chị.
                </p>
                <textarea className="mv-input min-h-[240px] font-mono !text-xs" value={data.guests || ''} onChange={(e) => setField('guests', e.target.value)} data-testid="sc-guests" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-300" data-testid="sc-count">{guests.length} khách · {tables.length} bàn → {guests.length} thẻ tên ({sheets.length} tờ A4) · {tables.length} thẻ số bàn</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="mv-label self-center mr-1">Xếp tên theo</span>
                  <button type="button" onClick={() => set({ sortBy: 'given' })} className={chip(spec.sortBy === 'given')}>Tên (chữ cuối)</button>
                  <button type="button" onClick={() => set({ sortBy: 'full' })} className={chip(spec.sortBy === 'full')}>Họ tên đầy đủ</button>
                  <button type="button" onClick={() => { setDirty(true); setData((d) => ({ ...d, guests: sampleGuests(spec.kind, 20, 10) })); }} className="mv-btn mv-btn-ghost !py-1.5 !text-xs ml-auto" data-testid="sc-sample200">Thử 200 khách / 20 bàn</button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, màu, bố cục & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ bảng sơ đồ</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SC_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="sc-size">{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="sc-palettes">
                    {SC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.paper} 50%, ${pl.accent} 50%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bố cục</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sc-layouts">
                    {SC_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bộ font</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sc-fonts">
                    {SC_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `'${f.script.fam}'` }}>{f.name}</button>)}
                  </div>
                </div>
                <label className={`flex items-center gap-2 text-xs ${canFoil ? 'text-slate-300' : 'text-slate-500'}`}>
                  <input type="checkbox" checked={useFoil} disabled={!canFoil} onChange={(e) => set({ foil: e.target.checked })} data-testid="sc-foil" />
                  Ép kim vàng (tên, hoạ tiết, viền) {canFoil ? '' : '— chọn bảng màu có vàng (Ngà, Đỏ son, Navy, Đen) để bật'}
                </label>
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.size}`} debounce={600} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-2'}>
              <div className="flex flex-wrap gap-1.5">
                {([['board', 'Sơ đồ'], ['place', 'Thẻ tên'], ['number', 'Số bàn']] as const).map(([k, n]) => <button key={k} type="button" onClick={() => setFlat(k)} className={chip(flat === k)} data-testid={`sc-flat-${k}`}>{n}</button>)}
              </div>
              <div className={flat === 'board' ? 'rounded-lg overflow-hidden shadow-[0_8px_24px_-10px_rgba(15,23,42,0.35)]' : 'hidden'} ref={boardRef} data-testid="sc-board">
                <SeatingBoardSvg spec={spec} data={data} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              {flat === 'place' && guests[0] && (
                <div className="grid grid-cols-2 gap-2" data-testid="sc-place-preview">
                  {guests.slice(0, 4).map((g, i) => <div key={i} className="rounded bg-white p-1"><PlaceFlatSvg spec={spec} data={data} guest={g} style={{ width: '100%', display: 'block' }} /></div>)}
                </div>
              )}
              {flat === 'number' && t0 && (
                <div className="grid grid-cols-3 gap-2" data-testid="sc-number-preview">
                  {tables.slice(0, 3).map((t) => <div key={t.key} className="rounded overflow-hidden shadow-sm"><TableNumberSvg spec={spec} data={data} table={t} style={{ width: '100%', display: 'block' }} /></div>)}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Sơ đồ {sz.wMm / 10}×{sz.hMm / 10}cm · {tables.length} bàn · {guests.length} khách · thẻ tên {PLACE.w / 10}×{PLACE.h / 10}cm gấp đôi · số bàn {NUMBER.w / 10}×{NUMBER.h / 10}cm
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sc-3d">{busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D</button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sc-png">{busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG sơ đồ</button>
              <button type="button" onClick={dl('pdf-board', makeBoardPdf, `${slug}-so-do-${sz.id}.pdf`)} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sc-pdf-board">{busy === 'pdf-board' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF sơ đồ</button>
              <button type="button" onClick={dl('pdf-place', makePlacePdf, `${slug}-the-ten-${guests.length}-khach.pdf`)} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sc-pdf-place">{busy === 'pdf-place' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF thẻ tên</button>
              <button type="button" onClick={dl('pdf-number', makeNumberPdf, `${slug}-so-ban-${tables.length}-ban.pdf`)} className="mv-btn mv-btn-primary col-span-2 !flex justify-center !py-2.5 !text-xs" data-testid="sc-pdf-number">{busy === 'pdf-number' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF số bàn ({tables.length} thẻ)</button>
            </div>
            <PrintRequest product="seating" title={orderTitle} defaultMaterial="Sơ đồ formex + thẻ tên giấy mỹ thuật" design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF sơ đồ đúng khổ thật, lề xén {SC_BLEED_MM}mm + vạch cắt (in decal/giấy dán formex 5mm). PDF thẻ tên: {PER_SHEET} thẻ/tờ A4, nét hồng = cắt, nét xanh đứt = gấp. PDF số bàn: mỗi bàn 1 trang 10×15cm.
              {useFoil ? ' Có thêm trang khuôn ép kim (đen = ép nhũ) sau mỗi trang in.' : ''}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <>
          {/* texture 3D (ẩn) */}
          <div aria-hidden ref={texRef} style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
            <div data-tex="board"><SeatingBoardSvg spec={spec} data={data} /></div>
            {useFoil && <div data-tex="board-foil"><SeatingBoardSvg spec={spec} data={data} fm="foil3d" /></div>}
            {sample3.map((g, i) => <div key={i} data-tex="place"><PlaceFaceSvg spec={spec} data={data} guest={g} /></div>)}
            {t0 && <div data-tex="number"><TableNumberSvg spec={spec} data={data} table={t0} /></div>}
          </div>
          {/* file in (ẩn) */}
          <div aria-hidden ref={printRef} style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }} data-testid="sc-print">
            <div data-print="board"><SeatingBoardSvg spec={spec} data={data} bleed /></div>
            {useFoil && <div data-print="board-foil"><SeatingBoardSvg spec={spec} data={data} bleed fm="foilPrint" /></div>}
            <div data-print="sheet">{sheets.map((gs, i) => <PlaceSheetSvg key={i} spec={spec} data={data} guests={gs} />)}</div>
            {useFoil && <div data-print="sheet-foil">{sheets.map((gs, i) => <PlaceSheetSvg key={i} spec={spec} data={data} guests={gs} fm="foilPrint" />)}</div>}
            <div data-print="number">{tables.map((t) => <TableNumberSvg key={t.key} spec={spec} data={data} table={t} bleed />)}</div>
            {useFoil && <div data-print="number-foil">{tables.map((t) => <TableNumberSvg key={t.key} spec={spec} data={data} table={t} bleed fm="foilPrint" />)}</div>}
          </div>
        </>
      )}
    </div>
  );
}
