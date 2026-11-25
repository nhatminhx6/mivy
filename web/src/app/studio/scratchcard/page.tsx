'use client';
// Thẻ cào trúng thưởng: chọn mẫu → nội dung → bảng giải "Tên | số lượng" (xáo theo seed, mỗi tấm 1 giải + 1 mã cào riêng)
// → xem 3D → tải PDF in (mặt trước/sau + khuôn mực cào), tờ in hàng loạt (.zip: In · Variable · Scratch · CutContour)
// + bảng đối chiếu CSV (chỉ chủ cửa hàng giữ).

import { useMemo, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Dices, Download, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  MAX_CARDS, SC_BLEED_MM, SC_FIELDS, SC_FONTS, SC_FONT_CSS, SC_PALETTES, SC_SHEET, SC_SIZES, SC_TEMPLATES, SC_THEMES, SC_ZONES,
  ScratchSheetSvg, ScratchSvg, allocate, frontLayout, manifestCsv, newSeed, parsePrizes, prizeTotal, sampleData, scPalette,
  scSheetFit, scSheetPages, scSize, useSCFonts, zonePath, type SCData, type SCSpec, type SCTemplate,
} from '@/lib/scratchcard-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { zipStore } from '@/lib/seal-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const specOf = (t: SCTemplate, prev?: SCSpec): SCSpec => ({ ...t.spec, size: prev?.size || SC_SIZES[0].id });
const FIRST = specOf(SC_TEMPLATES[0]);
const KEEP = ['prizes', 'seed', 'prefix', 'start'];

export default function ScratchcardPage() {
  const ready = useSCFonts();
  const [spec, setSpec] = useState<SCSpec>(FIRST);
  const [data, setData] = useState<SCData>(() => sampleData(FIRST.theme));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [pick, setPick] = useState(0);
  const [sheet, setSheet] = useState<{ side: 'front' | 'back'; page: number }>({ side: 'front', page: 0 });
  const coverRef = useRef<HTMLDivElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const defFrontRef = useRef<HTMLDivElement | null>(null);
  const defBackRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const a3dRef = useRef<HTMLDivElement | null>(null);
  const b3dRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = scSize(spec.size);
  const P = scPalette(spec.palette);
  const prizes = useMemo(() => parsePrizes(data.prizes || ''), [data.prizes]);
  const cards = useMemo(() => allocate(data), [data.prizes, data.seed, data.prefix, data.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = cards.length;
  const fit = scSheetFit(spec);
  const pages = scSheetPages(spec, count);
  const cur = cards[Math.min(pick, count - 1)] || null;
  const hero = cards.find((c) => c.prizeIdx === 0) || cards[0] || null; // thẻ cào dở trong 3D: lộ giải cao nhất
  const other = cards.find((c) => c !== hero) || hero;
  const slug = slugify(`the-cao-${data.brand || ''}`, 'the-cao');
  const set = (p: Partial<SCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { if (!KEEP.includes(key)) setDirty(true); setData((d) => ({ ...d, [key]: v })); };

  // đổi mẫu: chưa sửa chữ → nạp chữ mẫu ngành mới (giữ bảng giải/seed nếu khách đã đổi); đã sửa → giữ chữ khách
  const pickTpl = (t: SCTemplate) => {
    const next = specOf(t, spec);
    const oldS = sampleData(spec.theme), newS = sampleData(next.theme);
    setSpec(next);
    setData((d) => {
      const out: SCData = { ...newS };
      for (const [k, v] of Object.entries(d)) {
        if (KEEP.includes(k)) { if (k !== 'prizes' || v !== oldS.prizes) out[k] = v; continue; }
        if (dirty && v.trim() && v !== oldS[k]) out[k] = v;
      }
      return out;
    });
  };

  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // ---- PDF in: mặt trước (nền chung), mặt sau, khuôn mực cào ----
  const printPdf = async () => {
    const box = printRef.current; if (!box) throw new Error('Chưa dựng xong file in');
    const els = Array.from(box.querySelectorAll(':scope > div > svg')) as SVGSVGElement[];
    return svgsToPrintPdf(els, SC_FONT_CSS, sz, SC_BLEED_MM);
  };
  // ---- tờ in: thay hình thẻ (defs) bằng bản đã outline; lớp Variable outline trực tiếp ----
  const sheetSvg = async (side: 'front' | 'back', page: number): Promise<SVGSVGElement> => {
    flushSync(() => setSheet({ side, page }));
    const el = svgOf(sheetRef), def = svgOf(side === 'front' ? defFrontRef : defBackRef);
    if (!el || !def) throw new Error('Chưa dựng xong tờ in');
    const [clone, card] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(def, undefined, { outline: true })]);
    const vb = def.viewBox.baseVal;
    card.setAttribute('x', '0'); card.setAttribute('y', '0');
    card.setAttribute('width', String(vb.width)); card.setAttribute('height', String(vb.height)); card.setAttribute('overflow', 'hidden');
    clone.querySelector('[data-card-def] > svg')?.replaceWith(card);
    if (clone.querySelector('text')) {
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(SC_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return clone;
  };
  const sheetFiles = async () => {
    const enc = new TextEncoder(); const ser = (s: SVGSVGElement) => enc.encode(new XMLSerializer().serializeToString(s));
    const files: { name: string; data: Uint8Array }[] = [];
    try {
      for (let i = 0; i < pages; i++) {
        setBusy(`zip ${i + 1}/${pages + 1}`);
        files.push({ name: `${slug}-to-${String(i + 1).padStart(3, '0')}-mat-truoc.svg`, data: ser(await sheetSvg('front', i)) });
      }
      setBusy(`zip ${pages + 1}/${pages + 1}`);
      files.push({ name: `${slug}-mat-sau-moi-to.svg`, data: ser(await sheetSvg('back', 0)) });
    } finally { flushSync(() => setSheet({ side: 'front', page: 0 })); }
    return files;
  };
  const csvBytes = () => new TextEncoder().encode(manifestCsv(cards));

  const downloadPng = (which: 'cover' | 'reveal' | 'back') => run(`png-${which}`, async () => {
    const el = svgOf(which === 'cover' ? coverRef : which === 'reveal' ? revealRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, SC_FONT_CSS, 1600), `${slug}-${which === 'cover' ? 'chua-cao' : which === 'reveal' ? 'da-cao' : 'mat-sau'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadZip = () => run('zip', async () => {
    const files = await sheetFiles();
    files.push({ name: `${slug}-doi-chieu-giai.csv`, data: csvBytes() });
    downloadBlob(zipStore(files), `${slug}-${count}the-${pages}to.zip`);
  });
  const downloadCsv = () => run('csv', async () => downloadBlob(new Blob([manifestCsv(cards)], { type: 'text/csv;charset=utf-8' }), `${slug}-doi-chieu-giai.csv`));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/png')), `${slug}-3d.png`);
  });

  // gửi xưởng: PDF + tờ in có giải (KHÔNG kèm bảng đối chiếu — chủ cửa hàng tự giữ)
  const makeFiles = async () => {
    const pv = svgOf(coverRef); if (!pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const pdf = await printPdf();
    const files = await sheetFiles();
    files.unshift({ name: `${slug}-${sz.id}-file-in.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) });
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, SC_FONT_CSS, 900))
      : await svgToJpeg(pv, SC_FONT_CSS, 900);
    return { file: zipStore(files), fileName: `${slug}-${count}the-file-in.zip`, preview };
  };

  const build3d = () => import('@/lib/scratchcard-3d').then((m) => {
    const L = frontLayout(spec);
    return m.scratchBuilder({
      wMm: sz.wMm, hMm: sz.hMm, rMm: sz.rMm,
      frontA: svgOf(a3dRef), frontB: svgOf(b3dRef), back: svgOf(backRef),
      zone: { x: L.zone.x / 10, y: L.zone.y / 10, w: L.zone.w / 10, h: L.zone.h / 10 }, zonePath: zonePath(spec.zone, L.zone),
      ink: spec.ink, fontCss: SC_FONT_CSS,
    });
  });
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __scSnap?: (w: number, h: number) => Promise<string> }).__scSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const radius = `${(sz.rMm / sz.wMm) * 100}% / ${(sz.rMm / sz.hMm) * 100}%`;
  const total = prizeTotal(prizes);
  const orderTitle = `Thẻ cào ${sz.name} · ${count} thẻ · mực ${spec.ink === 'gold' ? 'vàng' : 'bạc'}`;
  const busyTxt = (k: string, txt: string) => (busy.startsWith(k) && busy.includes(' ') ? busy.split(' ')[1] : txt);
  const cardBox = (refEl: RefObject<HTMLDivElement | null> | null, node: React.ReactNode, testid?: string) => (
    <div ref={refEl as RefObject<HTMLDivElement>} className="overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, borderRadius: radius }} data-testid={testid}>{node}</div>
  );
  const full = { width: '100%', height: '100%', display: 'block' } as const;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thẻ cào trúng thưởng" sub="Thẻ cào khai trương, bốc thăm, lì xì cào — chia giải theo số lượng, mỗi thẻ 1 giải + 1 mã cào riêng, file in đủ lớp mực cào cho xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${SC_TEMPLATES.length})`}>
              <div className={`grid gap-2.5 ${sz.hMm > sz.wMm ? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'}`}>
                {SC_TEMPLATES.map((t) => {
                  const ts = specOf(t, spec);
                  const on = spec.theme === t.spec.theme && spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.zone === t.spec.zone;
                  const td = dirty ? data : { ...sampleData(t.spec.theme), prizes: data.prizes, seed: data.seed, prefix: data.prefix, start: data.start };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="sc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, borderRadius: radius }}>
                        <ScratchSvg spec={ts} data={td} side="front" card={cards[0] || null} mode="cover" style={full} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {SC_FIELDS.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}{f.side === 'back' ? ' · mặt sau' : ''}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`sc-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`sc-field-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Giải thưởng & mã số">
              <div className="space-y-3">
                <label className="block">
                  <span className="mv-label block mb-1.5">Bảng giải — mỗi dòng: Tên giải | số lượng (tổng = số thẻ, tối đa {MAX_CARDS})</span>
                  <textarea className="mv-input min-h-[110px] font-mono text-xs" value={data.prizes || ''} onChange={(e) => setField('prizes', e.target.value)} data-testid="sc-field-prizes" />
                </label>
                <div className="flex flex-wrap gap-1.5 text-[11px]" data-testid="sc-prize-summary">
                  {prizes.map((p, i) => <span key={i} className="rounded-md border border-mv-hair px-2 py-1 text-slate-300"><b className="text-mv-fg">{p.qty}</b> × {p.name}</span>)}
                  <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-mv-fg font-semibold" data-testid="sc-total">= {total} thẻ</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block"><span className="mv-label block mb-1.5">Tiền tố số seri</span>
                    <input className="mv-input" value={data.prefix || ''} maxLength={4} onChange={(e) => setField('prefix', e.target.value.toUpperCase())} data-testid="sc-field-prefix" /></label>
                  <label className="block"><span className="mv-label block mb-1.5">Số bắt đầu</span>
                    <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, ''))} data-testid="sc-field-start" /></label>
                  <label className="block"><span className="mv-label block mb-1.5">Mã xáo (seed)</span>
                    <div className="flex gap-1.5">
                      <input className="mv-input min-w-0" value={data.seed || ''} onChange={(e) => setField('seed', e.target.value)} data-testid="sc-field-seed" />
                      <button type="button" className="mv-btn mv-btn-ghost !px-2" title="Tạo mã xáo ngẫu nhiên mới" onClick={() => setField('seed', newSeed())} data-testid="sc-reseed"><Dices className="w-4 h-4" /></button>
                    </div></label>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Giải được xáo ngẫu nhiên theo mã xáo — giữ nguyên mã thì in lại ra đúng y hệt. Mỗi thẻ có <b className="text-mv-fg">mã cào 8 ký tự riêng</b> (không trùng) để quầy đối chiếu khi đổi thưởng.
                  Bảng đối chiếu (CSV) chỉ tải về cho chủ cửa hàng, <b className="text-mv-fg">không gửi kèm xưởng</b>.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Xem thẻ số</span>
                  <input type="number" min={1} max={count} value={pick + 1} onChange={(e) => setPick(Math.max(0, Math.min(count - 1, (parseInt(e.target.value, 10) || 1) - 1)))} className="mv-input !w-20 !py-1" data-testid="sc-pick" />
                  <span>/ {count} · <b className="text-mv-fg">{cur?.serial}</b> → {cur?.prize}</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu, font, khổ & vùng cào">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chủ đề hình vẽ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="sc-themes">
                    {SC_THEMES.map((th) => <button key={th.id} type="button" onClick={() => set({ theme: th.id })} className={chip(spec.theme === th.id)}>{th.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="sc-palettes">
                    {SC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair relative overflow-hidden" style={{ background: pl.bg }}><span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full" style={{ background: pl.accent }} /></span>
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề & giải</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="sc-fonts">
                    {SC_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{data.title || 'Cào là trúng'}</button>)}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Khổ thẻ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="sc-sizes">
                      {SC_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="sc-layouts">
                      {(['banner', 'side', 'center'] as const).map((l) => <button key={l} type="button" onClick={() => set({ layout: l })} className={chip(spec.layout === l)}>{l === 'banner' ? 'Tiêu đề trên' : l === 'side' ? 'Chữ trái · ô phải' : 'Ô cào giữa'}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Hình vùng cào</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="sc-zones">
                      {SC_ZONES.map((z) => <button key={z.id} type="button" onClick={() => set({ zone: z.id })} className={chip(spec.zone === z.id)}>{z.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Mực cào</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="sc-inks">
                      {(['silver', 'gold'] as const).map((k) => <button key={k} type="button" onClick={() => set({ ink: k })} className={chip(spec.ink === k)}>{k === 'silver' ? 'Bạc' : 'Vàng'}</button>)}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.brand, data.title, data.sub, data.hint, data.rules, data.redeem, data.expiry, data.hotline, data.address, data.website, hero?.serial, hero?.prize, hero?.code])} refitKey={spec.size} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-[11px] text-slate-400 mb-1">Chưa cào</div>{cardBox(coverRef, <ScratchSvg spec={spec} data={data} side="front" card={cur} mode="cover" style={full} />, 'sc-cover')}</div>
                <div><div className="text-[11px] text-slate-400 mb-1">Đã cào · thẻ {cur?.serial}</div>{cardBox(revealRef, <ScratchSvg spec={spec} data={data} side="front" card={cur} mode="reveal" style={full} />, 'sc-reveal')}</div>
              </div>
              <div><div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>{cardBox(backRef, <ScratchSvg spec={spec} data={data} side="back" card={cur} mode="reveal" style={full} />, 'sc-back')}</div>
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="sc-info">{sz.name} · {count} thẻ · {fit.per} thẻ/tờ {SC_SHEET.wMm / 10}×{SC_SHEET.hMm / 10} cm · {pages} tờ · tràn lề {SC_BLEED_MM}mm</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('cover')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sc-png-cover">
                {busy === 'png-cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG chưa cào
              </button>
              <button type="button" onClick={() => downloadPng('reveal')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="sc-png-reveal">
                {busy === 'png-reveal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG đã cào
              </button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="sc-3d-png" title={tab !== '3d' ? 'Mở tab 3D để chụp' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sc-pdf" title="Mặt trước (nền chung) + mặt sau + khuôn mực cào, tràn lề + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadZip} className="mv-btn mv-btn-primary col-span-2 !flex justify-center !py-2.5 !text-xs" data-testid="sc-zip" title="Tờ in 32,5×43 cm: lớp In + Variable (giải, mã, số riêng) + Scratch + CutContour · kèm CSV đối chiếu">
                {busy.startsWith('zip') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyTxt('zip', `Tờ in có giải (.zip · ${pages + 1} tờ)`)}
              </button>
              <button type="button" onClick={downloadCsv} className="mv-btn mv-btn-ghost col-span-3 !flex justify-center !py-2.5 !text-xs" data-testid="sc-csv">
                {busy === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Bảng đối chiếu giải (CSV · chỉ chủ cửa hàng giữ)
              </button>
            </div>
            <PrintRequest product="scratchcard" title={orderTitle} defaultMaterial="Thẻ cào giấy C300 + lớp cào bạc" design={{ spec, data: { ...data, seed: undefined } }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Tờ in: lớp <b>In</b> (nền chung) · <b>Variable</b> (giải + mã + số riêng từng thẻ, in dữ liệu biến đổi) · <b>Scratch</b> (vùng phủ mực cào {spec.ink === 'gold' ? 'vàng' : 'bạc'}) · <b>CutContour</b>. Mặt sau in chung, lật gương để in 2 mặt khớp.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: file in PDF, hình thẻ không giải (tờ in), tờ in đang xuất, 2 thẻ cho 3D */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="sc-print">
            <div><ScratchSvg spec={spec} data={data} side="front" card={null} mode="print" bleed style={{ width: '100%', display: 'block' }} /></div>
            <div><ScratchSvg spec={spec} data={data} side="back" card={null} mode="print" bleed style={{ width: '100%', display: 'block' }} /></div>
            <div><ScratchSvg spec={spec} data={data} side="front" card={null} mode="scratchMask" bleed style={{ width: '100%', display: 'block' }} /></div>
          </div>
          <div ref={defFrontRef}><ScratchSvg spec={spec} data={data} side="front" card={null} mode="print" bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={defBackRef}><ScratchSvg spec={spec} data={data} side="back" card={null} mode="print" bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="sc-sheet"><ScratchSheetSvg spec={spec} data={data} cards={cards} side={sheet.side} page={sheet.page} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={a3dRef}><ScratchSvg spec={spec} data={data} side="front" card={other} mode="reveal" style={{ width: '100%', display: 'block' }} /></div>
          <div ref={b3dRef}><ScratchSvg spec={spec} data={data} side="front" card={hero} mode="reveal" style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
