'use client';
// Vé sự kiện · vé mời: chọn mẫu → điền sự kiện → hạng vé, số vé chạy + QR riêng từng vé (+ ghế theo hàng) →
// xem thành phẩm 3D (vé xé cuống, dải nhũ) → tải PDF in (2 mặt + khuôn cắt/răng cưa + khuôn nhũ) hoặc tờ in có số/QR từng vé.

import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Download, FileDown, Loader2, Sparkles } from 'lucide-react';
import {
  TK_FIELDS, TK_FONTS, TK_FONT_CSS, TK_PALETTES, TK_SHEET, TK_SIZES, TK_TEMPLATES, TK_THEMES, TK_TIERS, TK_BLEED_MM,
  TicketDieSvg, TicketSheetSvg, TicketSvg, dynSide, perRowOf, qrPayload, sampleData, seatOn, seatRows, serialOf,
  tkCount, tkSheetFit, tkSheetPages, tkSize, useTKFonts, type TKData, type TKSpec, type TKTemplate,
} from '@/lib/ticket-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { zipStore } from '@/lib/seal-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const specOf = (t: TKTemplate, prev?: TKSpec): TKSpec => ({ ...t.spec, size: prev?.size || 't200', stubSide: prev?.stubSide || 'right', foil: t.spec.foil });
const FIRST = specOf(TK_TEMPLATES[0]);

export default function TicketPage() {
  const ready = useTKFonts();
  const [spec, setSpec] = useState<TKSpec>(FIRST);
  const [data, setData] = useState<TKData>(() => sampleData(FIRST.theme));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [sheet, setSheet] = useState<{ side: 'front' | 'back'; page: number }>({ side: 'front', page: 0 });
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const front1Ref = useRef<HTMLDivElement | null>(null);
  const foilRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const defFrontRef = useRef<HTMLDivElement | null>(null);
  const defBackRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = tkSize(spec.size);
  const fit = tkSheetFit(spec);
  const pages = tkSheetPages(spec, data);
  const count = tkCount(data);
  const slug = slugify(`ve-${data.event || ''}`, 've-su-kien');
  const set = (p: Partial<TKSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };

  // đổi mẫu: chưa sửa chữ → nạp nội dung mẫu đúng loại sự kiện; đã sửa → giữ chữ khách, thay ô còn nguyên chữ mẫu cũ
  const pickTpl = (t: TKTemplate) => {
    const next = specOf(t, spec);
    const oldS = sampleData(spec.theme), newS = sampleData(next.theme);
    setSpec(next);
    setData((d) => {
      if (!dirty) return { ...newS, start: d.start || newS.start, count: d.count || newS.count };
      const out: TKData = { ...newS };
      for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) out[k] = v;
      return out;
    });
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const printPdf = async () => {
    const box = printRef.current; if (!box) throw new Error('Chưa dựng xong file in');
    const els = Array.from(box.querySelectorAll(':scope > div > svg')) as SVGSVGElement[];
    return svgsToPrintPdf(els, TK_FONT_CSS, sz, TK_BLEED_MM);
  };

  // tờ in: hình vé (defs) thay bằng bản đã outline; số/QR/ghế từng vé outline trực tiếp
  const sheetSvg = async (side: 'front' | 'back', page: number, outline = true): Promise<SVGSVGElement> => {
    flushSync(() => setSheet({ side, page }));
    const el = svgOf(sheetRef), def = svgOf(side === 'front' ? defFrontRef : defBackRef);
    if (!el || !def) throw new Error('Chưa dựng xong tờ in');
    if (!outline) return selfContainedSvg(el, TK_FONT_CSS);
    const [clone, card] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(def, undefined, { outline: true })]);
    const vb = def.viewBox.baseVal;
    card.setAttribute('x', '0'); card.setAttribute('y', '0');
    card.setAttribute('width', String(vb.width)); card.setAttribute('height', String(vb.height)); card.setAttribute('overflow', 'hidden');
    clone.querySelector('[data-card-def] > svg')?.replaceWith(card);
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(TK_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return clone;
  };
  const sideName = (s: 'front' | 'back') => (s === 'front' ? 'mat-truoc' : 'mat-sau');
  const sheetFiles = async () => {
    const enc = new TextEncoder(); const ser = (s: SVGSVGElement) => enc.encode(new XMLSerializer().serializeToString(s));
    const numbered = dynSide(spec), other = numbered === 'front' ? 'back' : 'front';
    const files: { name: string; data: Uint8Array }[] = [];
    try {
      for (let i = 0; i < pages; i++) {
        setBusy(`zip ${i + 1}/${pages + 1}`);
        files.push({ name: `${slug}-to-${String(i + 1).padStart(3, '0')}-${sideName(numbered)}-co-so.svg`, data: ser(await sheetSvg(numbered, i)) });
      }
      setBusy(`zip ${pages + 1}/${pages + 1}`);
      files.push({ name: `${slug}-${sideName(other)}-moi-to.svg`, data: ser(await sheetSvg(other, 0)) });
    } finally { flushSync(() => setSheet({ side: 'front', page: 0 })); }
    return files;
  };
  // PDF tờ in (ảnh 150dpi): mỗi tờ có số 1 trang + 1 trang mặt còn lại
  const sheetPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const W = TK_SHEET.wMm, H = TK_SHEET.hMm, dpi = 150;
    const ow = Math.round((W / 25.4) * dpi), oh = Math.round((H / 25.4) * dpi);
    const pdf = new jsPDF({ unit: 'mm', format: [W, H], orientation: 'portrait', compress: true });
    const numbered = dynSide(spec), other = numbered === 'front' ? 'back' : 'front';
    const list: { side: 'front' | 'back'; page: number }[] = [...Array.from({ length: pages }, (_, i) => ({ side: numbered, page: i })), { side: other, page: 0 }];
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(`spdf ${i + 1}/${list.length}`);
        const c = await svgToCanvas(await sheetSvg(list[i].side, list[i].page, false), ow, oh, '#FFFFFF');
        if (i > 0) pdf.addPage([W, H], 'portrait');
        pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, H, undefined, 'FAST');
      }
    } finally { flushSync(() => setSheet({ side: 'front', page: 0 })); }
    return pdf.output('blob');
  };

  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, TK_FONT_CSS, 2000), `${slug}-${sideName(side)}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadZip = () => run('zip', async () => downloadBlob(zipStore(await sheetFiles()), `${slug}-${count}ve-${pages}to-in-so.zip`));
  const downloadSheetPdf = () => run('spdf', async () => downloadBlob(await sheetPdf(), `${slug}-${count}ve-to-in.pdf`));
  const toPng = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/png'));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    downloadBlob(await toPng(await view3d.current.snapshot(1600, 1200, { watermark: true })), `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(frontRef); if (!pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const pdf = await printPdf();
    const files = await sheetFiles();
    files.unshift({ name: `${slug}-${sz.id}-file-in.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) });
    const toJpg = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toJpg).catch(() => svgToJpeg(pv, TK_FONT_CSS, 900))
      : await svgToJpeg(pv, TK_FONT_CSS, 900);
    return { file: zipStore(files), fileName: `${slug}-${count}ve-file-in.zip`, preview };
  };

  const build3d = () => import('@/lib/ticket-3d').then((m) => m.ticketBuilder({
    wMm: sz.wMm, hMm: sz.hMm, stubMm: sz.stubMm, radiusMm: sz.radiusMm, card: !!sz.card, stubRight: spec.stubSide === 'right', foil: spec.foil,
    front0: svgOf(frontRef), front1: svgOf(front1Ref), back: svgOf(backRef), foilMask: svgOf(foilRef), fontCss: TK_FONT_CSS,
  }));

  // hook QC (Playwright chụp 3D góc mặc định, khổ lớn) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __tkSnap?: (w: number, h: number) => Promise<string> }).__tkSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tier = TK_TIERS.find((t) => t.id === spec.tier) || TK_TIERS[0];
  const material = sz.card ? 'Vé nhựa PVC' : spec.foil ? 'Giấy mỹ thuật ép kim' : 'Couche 250 + răng cưa + số nhảy';
  const orderTitle = `Vé ${data.event || 'sự kiện'} · ${sz.name} · ${count} vé · ${tier.name}${spec.foil ? ' · nhũ' : ''}`;
  const busyTxt = (k: string, txt: string) => (busy.startsWith(k) && busy.includes(' ') ? busy.split(' ')[1] : txt);
  const rows = seatRows(data);
  const card = (side: 'front' | 'back', refEl: RefObject<HTMLDivElement | null>) => (
    <div ref={refEl as RefObject<HTMLDivElement>} className="drop-shadow-[0_10px_18px_rgba(15,23,42,0.3)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }} data-testid={`tk-${side}`}>
      <TicketSvg spec={spec} data={data} side={side} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Vé sự kiện · vé mời" sub="Vé ca nhạc, hội chợ, gala bốc thăm, hội thảo, chiếu phim, vé cổng — mỗi vé 1 số + 1 mã QR riêng, cuống xé răng cưa, file in chuẩn xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TK_TEMPLATES.length})`}>
              <div className={`grid gap-2.5 ${sz.card ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {TK_TEMPLATES.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.theme === t.spec.theme && spec.font === t.spec.font;
                  const ts = { ...specOf(t, spec), tier: t.spec.tier, foil: t.spec.foil || spec.foil };
                  const td = dirty ? data : { ...sampleData(t.spec.theme), prefix: data.prefix || sampleData(t.spec.theme).prefix };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="tk-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <TicketSvg spec={ts} data={td} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name} · {TK_THEMES.find((x) => x.id === t.spec.theme)?.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung sự kiện">
              <div className="grid grid-cols-2 gap-3">
                {TK_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[84px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tk-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tk-field-${f.key}`} />}
                  </label>
                ))}
                <div className="col-span-2">
                  <span className="mv-label block mb-1.5">Hạng vé (màu phân biệt)</span>
                  <div className="flex flex-wrap gap-1.5" data-testid="tk-tiers">
                    {TK_TIERS.map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ tier: t.id })} className={`flex items-center gap-1.5 ${chip(spec.tier === t.id)}`}>
                        <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Số vé, mã QR & ghế">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block"><span className="mv-label block mb-1.5">Mã sự kiện (QR)</span>
                  <input className="mv-input" value={data.code || ''} maxLength={8} onChange={(e) => setField('code', e.target.value.toUpperCase())} data-testid="tk-field-code" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Tiền tố số vé</span>
                  <input className="mv-input" value={data.prefix || ''} maxLength={4} onChange={(e) => setField('prefix', e.target.value.toUpperCase())} data-testid="tk-field-prefix" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Số bắt đầu</span>
                  <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, ''))} data-testid="tk-field-start" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Số lượng vé</span>
                  <input className="mv-input disabled:opacity-50" inputMode="numeric" disabled={seatOn(data)} value={seatOn(data) ? String(count) : data.count || ''} onChange={(e) => setField('count', e.target.value.replace(/\D/g, ''))} data-testid="tk-field-count" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none mt-3">
                <input type="checkbox" checked={seatOn(data)} onChange={(e) => setField('seat', e.target.checked ? '1' : '')} data-testid="tk-seat" />
                Đánh số ghế theo hàng (mỗi vé 1 ghế, số lượng = số hàng × ghế/hàng)
              </label>
              {seatOn(data) && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <label className="block"><span className="mv-label block mb-1.5">Từ hàng</span>
                    <input className="mv-input" maxLength={1} value={data.rowFrom || ''} onChange={(e) => setField('rowFrom', e.target.value.toUpperCase())} data-testid="tk-field-rowFrom" /></label>
                  <label className="block"><span className="mv-label block mb-1.5">Đến hàng</span>
                    <input className="mv-input" maxLength={1} value={data.rowTo || ''} onChange={(e) => setField('rowTo', e.target.value.toUpperCase())} data-testid="tk-field-rowTo" /></label>
                  <label className="block"><span className="mv-label block mb-1.5">Ghế / hàng</span>
                    <input className="mv-input" inputMode="numeric" value={data.perRow || ''} onChange={(e) => setField('perRow', e.target.value.replace(/\D/g, ''))} data-testid="tk-field-perRow" /></label>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2" data-testid="tk-serial-info">
                Số vé <b className="text-mv-fg">{serialOf(data, 0)}</b> → <b className="text-mv-fg">{serialOf(data, count - 1)}</b>
                {seatOn(data) ? <> · ghế {rows[0]}01 → {rows[rows.length - 1]}{String(perRowOf(data)).padStart(2, '0')}</> : null}
                {' '}· QR vé đầu: <code className="text-mv-fg">{qrPayload(data, 0)}</code> · {fit.per} vé/tờ {TK_SHEET.wMm / 10}×{TK_SHEET.hMm / 10} cm{fit.rot ? ' (xoay 90°)' : ''} · {pages} tờ
                {spec.theme === 'gala' ? ' · cuống in SỐ MAY MẮN để bốc thăm' : ''}
              </p>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, màu, font & nhũ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ vé</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="tk-sizes">
                    {TK_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                {!sz.card && (
                  <div>
                    <div className="mv-label mb-1.5">Cuống xé</div>
                    <div className="flex gap-1.5" data-testid="tk-stub">
                      {(['right', 'left'] as const).map((sd) => <button key={sd} type="button" onClick={() => set({ stubSide: sd })} className={chip(spec.stubSide === sd)}>Cuống bên {sd === 'right' ? 'phải' : 'trái'}</button>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="tk-palettes">
                    {TK_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair relative overflow-hidden" style={{ background: pl.bg }}><span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full" style={{ background: pl.accent }} /></span>
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên sự kiện</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="tk-fonts">
                    {TK_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {(data.event || 'Đêm nhạc').slice(0, 16)}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="tk-foil" />
                  <Sparkles className="w-4 h-4 text-amber-500" /> Dải nhũ hologram chống giả (ép nhũ 7 màu)
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data])} refitKey={`${spec.size}|${spec.stubSide}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div><div className="text-[11px] text-slate-400 mb-1">Mặt trước{sz.card ? '' : ` · cuống bên ${spec.stubSide === 'right' ? 'phải' : 'trái'} (xé theo răng cưa)`}</div>{card('front', frontRef)}</div>
              <div><div className="text-[11px] text-slate-400 mb-1">Mặt sau{sz.card ? ' · số thẻ + QR' : ''}</div>{card('back', backRef)}</div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {count} vé · {pages} tờ in · tràn lề {TK_BLEED_MM}mm{spec.foil ? ' · nhũ hologram' : ''}</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tk-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tk-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG sau
              </button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="tk-3d-png" title={tab !== '3d' ? 'Mở tab 3D để chụp' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tk-pdf" title="Vé mẫu 2 mặt (tràn lề, vạch cắt) + trang khuôn cắt/răng cưa + khuôn nhũ">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadSheetPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tk-sheet-pdf" title="Tờ in 32,5×43 cm có số + QR từng vé (ảnh 150dpi)">
                {busy.startsWith('spdf') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyTxt('spdf', 'PDF tờ in')}
              </button>
              <button type="button" onClick={downloadZip} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tk-zip" title="Tờ in SVG: lớp In + CutContour + Perf, chữ đã outline, số + QR riêng từng vé">
                {busy.startsWith('zip') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyTxt('zip', 'SVG tờ in .zip')}
              </button>
            </div>
            <PrintRequest product="ticket" title={orderTitle} defaultMaterial={material} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Tờ in có số: mỗi vé 1 số + 1 QR riêng (quét ra <b>mã sự kiện-số vé</b> để soát vé), mặt sau lật gương để in 2 mặt khớp, đã vẽ sẵn đường cắt và răng cưa — xưởng in thẳng, không cần đóng số tay.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: vé #2 (3D), khuôn nhũ (3D), file in PDF, hình vé không số (tờ in), tờ in đang xuất */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={front1Ref}><TicketSvg spec={spec} data={data} side="front" idx={Math.min(1, count - 1)} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={foilRef}>{spec.foil && <TicketSvg spec={spec} data={data} side="front" foilMask style={{ width: '100%', display: 'block' }} />}</div>
          <div ref={printRef} data-testid="tk-print">
            <div><TicketSvg spec={spec} data={data} side="front" bleed print style={{ width: '100%', display: 'block' }} /></div>
            <div><TicketSvg spec={spec} data={data} side="back" bleed print style={{ width: '100%', display: 'block' }} /></div>
            <div><TicketDieSvg spec={spec} data={data} /></div>
            {spec.foil && <div><TicketSvg spec={spec} data={data} side="front" bleed print foilMask="print" style={{ width: '100%', display: 'block' }} /></div>}
          </div>
          <div ref={defFrontRef}><TicketSvg spec={spec} data={data} side="front" bleed print idx={null} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={defBackRef}><TicketSvg spec={spec} data={data} side="back" bleed print idx={null} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="tk-sheet"><TicketSheetSvg spec={spec} data={data} side={sheet.side} page={sheet.page} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
