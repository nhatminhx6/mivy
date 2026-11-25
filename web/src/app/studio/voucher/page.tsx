'use client';
// Voucher / phiếu quà tặng · Thẻ tích điểm · Coupon: chọn mẫu → điền nội dung → mã số chạy (mỗi tấm 1 số) →
// xem thành phẩm 3D → tải PDF in (2 mặt + trang đường cắt/răng cưa + khuôn ép kim) hoặc tờ in hàng loạt có số riêng.

import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Download, FileDown, Loader2, Sparkles } from 'lucide-react';
import {
  GOALS, VC_BLEED_MM, VC_FIELDS, VC_FONTS, VC_FONT_CSS, VC_KINDS, VC_PALETTES, VC_SHEET, VC_TEMPLATES,
  VoucherDieSvg, VoucherSheetSvg, VoucherSvg, sampleData, serialOf, serialSide, sizesOf, useVCFonts, vcCount, vcFont,
  vcPalette, vcSheetFit, vcSheetPages, vcSize, type VCData, type VCKind, type VCSpec, type VCTemplate,
} from '@/lib/voucher-engine';
import { selfContainedSvg, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { zipStore } from '@/lib/seal-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const specOf = (t: VCTemplate, prev?: VCSpec): VCSpec => {
  const sizes = sizesOf(t.spec.kind);
  const size = prev && sizes.some((s) => s.id === prev.size) ? prev.size : sizes[0].id;
  return { ...t.spec, size, goal: prev?.goal || 10 };
};
const FIRST = specOf(VC_TEMPLATES[0]);
const KIND_ONLY = ['title', 'value', 'valueNote'];
const MATERIAL: Record<VCKind, string> = { voucher: 'Couche 300 cán mờ', loyalty: 'Nhựa PVC (thẻ cứng)', coupon: 'Couche 300 cán mờ' };

export default function VoucherPage() {
  const ready = useVCFonts();
  const [spec, setSpec] = useState<VCSpec>(FIRST);
  const [data, setData] = useState<VCData>(() => sampleData(FIRST.kind, FIRST.theme));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [sheet, setSheet] = useState<{ side: 'front' | 'back'; page: number }>({ side: 'front', page: 0 });
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const foilFrontRef = useRef<HTMLDivElement | null>(null);
  const foilBackRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const defFrontRef = useRef<HTMLDivElement | null>(null);
  const defBackRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const sz = vcSize(spec.size);
  const P = vcPalette(spec.palette);
  const fit = vcSheetFit(spec);
  const pages = vcSheetPages(spec, data);
  const count = vcCount(data);
  const kindName = VC_KINDS.find((k) => k.id === spec.kind)!.name;
  const slug = slugify(`${kindName}-${data.brand || ''}`, 'voucher');
  const set = (p: Partial<VCSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };

  // đổi mẫu: khách chưa sửa → nạp chữ mẫu đúng ngành; đã sửa → giữ chữ khách, chỉ thay ô còn nguyên chữ mẫu cũ
  const pickTpl = (t: VCTemplate) => {
    const next = specOf(t, spec);
    const oldS = sampleData(spec.kind, spec.theme), newS = sampleData(next.kind, next.theme);
    setSpec(next);
    if (!dirty) setData((d) => ({ ...newS, prefix: d.prefix === oldS.prefix ? newS.prefix : d.prefix, start: d.start, count: d.count }));
    else setData((d) => {
      const out: VCData = { ...newS };
      for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k] && !(KIND_ONLY.includes(k) && next.kind !== spec.kind)) out[k] = v;
      return out;
    });
  };
  const setKind = (k: VCKind) => { if (k !== spec.kind) pickTpl(VC_TEMPLATES.find((t) => t.spec.kind === k)!); };

  const svgOf = (r: RefObject<HTMLDivElement | null>, sel = 'svg') => r.current?.querySelector(sel) as SVGSVGElement | null;
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  // ---- PDF in: mặt trước, mặt sau, đường cắt/răng cưa, khuôn ép kim ----
  const printPdf = async () => {
    const box = printRef.current; if (!box) throw new Error('Chưa dựng xong file in');
    const els = Array.from(box.querySelectorAll(':scope > div > svg')) as SVGSVGElement[];
    return svgsToPrintPdf(els, VC_FONT_CSS, sz, VC_BLEED_MM);
  };

  // ---- tờ in hàng loạt: hình thẻ (defs) thay bằng bản đã outline + mã số từng tấm outline ----
  const sheetSvg = async (side: 'front' | 'back', page: number): Promise<SVGSVGElement> => {
    flushSync(() => setSheet({ side, page }));
    const el = svgOf(sheetRef), def = svgOf(side === 'front' ? defFrontRef : defBackRef);
    if (!el || !def) throw new Error('Chưa dựng xong tờ in');
    const [clone, card] = await Promise.all([selfContainedSvg(el, undefined, { outline: true }), selfContainedSvg(def, undefined, { outline: true })]);
    const vb = def.viewBox.baseVal;
    card.setAttribute('x', '0'); card.setAttribute('y', '0');
    card.setAttribute('width', String(vb.width)); card.setAttribute('height', String(vb.height)); card.setAttribute('overflow', 'hidden');
    clone.querySelector('[data-card-def] > svg')?.replaceWith(card);
    if (clone.querySelector('text')) { // chữ chưa outline được → nhúng font cho chắc
      const css = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      css.textContent = await embedFontCss(VC_FONT_CSS);
      clone.insertBefore(css, clone.firstChild);
    }
    return clone;
  };
  const sheetFiles = async () => {
    const enc = new TextEncoder(); const ser = (s: SVGSVGElement) => enc.encode(new XMLSerializer().serializeToString(s));
    const numbered = serialSide(spec.kind);
    const other = numbered === 'front' ? 'back' : 'front';
    const files: { name: string; data: Uint8Array }[] = [];
    try {
      for (let i = 0; i < pages; i++) {
        setBusy(`zip ${i + 1}/${pages + 1}`);
        files.push({ name: `${slug}-to-${String(i + 1).padStart(2, '0')}-${numbered === 'front' ? 'mat-truoc' : 'mat-sau'}-co-so.svg`, data: ser(await sheetSvg(numbered, i)) });
      }
      setBusy(`zip ${pages + 1}/${pages + 1}`);
      files.push({ name: `${slug}-${other === 'front' ? 'mat-truoc' : 'mat-sau'}-moi-to.svg`, data: ser(await sheetSvg(other, 0)) });
    } finally { flushSync(() => setSheet({ side: 'front', page: 0 })); }
    return files;
  };

  const downloadPng = (side: 'front' | 'back') => run(`png-${side}`, async () => {
    const el = svgOf(side === 'front' ? frontRef : backRef); if (!el) return;
    downloadBlob(await svgToPng(el, VC_FONT_CSS, 1800), `${slug}-${side === 'front' ? 'mat-truoc' : 'mat-sau'}.png`);
  });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await printPdf(), `${slug}-${sz.id}-file-in.pdf`));
  const downloadZip = () => run('zip', async () => {
    const files = await sheetFiles();
    downloadBlob(zipStore(files), `${slug}-${count}tam-${pages}to-in-so.zip`);
  });
  const download3d = () => run('3d', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/png')), `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(frontRef); if (!pv) throw new Error('Chưa dựng xong thiết kế, thử lại nhé.');
    const pdf = await printPdf();
    const files = await sheetFiles();
    files.unshift({ name: `${slug}-${sz.id}-file-in.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) });
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, VC_FONT_CSS, 900))
      : await svgToJpeg(pv, VC_FONT_CSS, 900);
    return { file: zipStore(files), fileName: `${slug}-${count}tam-file-in.zip`, preview };
  };

  const build3d = () => import('@/lib/voucher-3d').then((m) => m.voucherBuilder({
    kind: spec.kind, wMm: sz.wMm, hMm: sz.hMm, radiusMm: sz.radiusMm || 0,
    front: svgOf(frontRef), back: svgOf(backRef), frontFoil: svgOf(foilFrontRef), backFoil: svgOf(foilBackRef),
    pal: { bg: P.bg, bg2: P.bg2, gold: P.gold, onBg: P.onBg }, brand: data.brand || '', tagline: data.tagline || '',
    font: vcFont(spec.font), foil: spec.foil, fontCss: VC_FONT_CSS,
  }));

  // hook cho QC (Playwright chụp ảnh 3D góc mặc định, khổ lớn để soi) — chỉ bản dev
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __vcSnap?: (w: number, h: number) => Promise<string> }).__vcSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }
  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = VC_TEMPLATES.filter((t) => t.spec.kind === spec.kind);
  const fields = VC_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const radius = sz.radiusMm ? `${(sz.radiusMm / sz.wMm) * 100}% / ${(sz.radiusMm / sz.hMm) * 100}%` : '4px';
  const orderTitle = `${kindName} ${sz.name} · ${count} tấm${spec.foil ? ' · ép kim' : ''}`;
  const busyTxt = (k: string, txt: string) => (busy.startsWith(k) && busy.includes(' ') ? busy.split(' ')[1] : txt);
  const card = (side: 'front' | 'back', refEl: RefObject<HTMLDivElement | null>) => (
    <div ref={refEl as RefObject<HTMLDivElement>} className="overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, borderRadius: radius }} data-testid={`vc-${side}`}>
      <VoucherSvg spec={spec} data={data} side={side} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Voucher · thẻ tích điểm" sub="Phiếu quà tặng có cuống, thẻ tích điểm nhựa, coupon giảm giá — mỗi tấm 1 mã số riêng, file in chuẩn xưởng (tràn lề, vạch cắt, răng cưa, khuôn ép kim)." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {VC_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => setKind(k.id)} data-testid={`vc-kind-${k.id}`} title={k.note}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className={`grid gap-2.5 ${spec.kind === 'voucher' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'}`}>
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.theme === t.spec.theme && spec.font === t.spec.font;
                  const ts = specOf(t, spec);
                  const td = dirty ? data : { ...sampleData(t.spec.kind, t.spec.theme), prefix: data.prefix, start: data.start, count: data.count };
                  return (
                    <button key={t.id} type="button" onClick={() => pickTpl(t)} data-testid="vc-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="overflow-hidden shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}`, borderRadius: radius }}>
                        <VoucherSvg spec={ts} data={td} side="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}</span>
                    {f.multiline
                      ? <textarea className="mv-input min-h-[84px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`vc-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`vc-field-${f.key}`} />}
                  </label>
                ))}
                {spec.kind === 'loyalty' && (
                  <div className="col-span-2">
                    <span className="mv-label block mb-1.5">Số ô đóng dấu</span>
                    <div className="flex gap-1.5" data-testid="vc-goal">
                      {GOALS.map((g) => <button key={g} type="button" onClick={() => set({ goal: g })} className={chip(spec.goal === g)}>{g} ô · mua {g - 1} tặng 1</button>)}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Mã số từng tấm">
              <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className="mv-label block mb-1.5">Tiền tố</span>
                  <input className="mv-input" value={data.prefix || ''} maxLength={4} onChange={(e) => setField('prefix', e.target.value.toUpperCase())} data-testid="vc-field-prefix" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Số bắt đầu</span>
                  <input className="mv-input" inputMode="numeric" value={data.start || ''} onChange={(e) => setField('start', e.target.value.replace(/\D/g, ''))} data-testid="vc-field-start" /></label>
                <label className="block"><span className="mv-label block mb-1.5">Số lượng</span>
                  <input className="mv-input" inputMode="numeric" value={data.count || ''} onChange={(e) => setField('count', e.target.value.replace(/\D/g, ''))} data-testid="vc-field-count" /></label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2" data-testid="vc-serial-info">
                Mã chạy từ <b className="text-mv-fg">{serialOf(data, 0)}</b> đến <b className="text-mv-fg">{serialOf(data, count - 1)}</b> · {fit.per} tấm/tờ {VC_SHEET.wMm / 10}×{VC_SHEET.hMm / 10} cm · {pages} tờ · số in ở {serialSide(spec.kind) === 'front' ? 'mặt trước' : 'mặt sau'}
              </p>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu, font, khổ & ép kim">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="vc-palettes">
                    {VC_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair relative overflow-hidden" style={{ background: pl.bg }}><span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full" style={{ background: pl.gold }} /></span>
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên thương hiệu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="vc-fonts">
                    {VC_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
                        {data.brand || 'An Khang'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="vc-sizes">
                    {sizesOf(spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" checked={spec.foil} onChange={(e) => set({ foil: e.target.checked })} data-testid="vc-foil" />
                  <Sparkles className="w-4 h-4 text-amber-500" /> Ép kim vàng (các chi tiết màu vàng thành nhũ kim loại)
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data.brand, data.tagline, data.title, data.value, data.valueNote, data.reward, data.cond, data.expiry, data.hotline, data.address, data.website, data.prefix, data.start])} refitKey={`${spec.kind}|${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div><div className="text-[11px] text-slate-400 mb-1">Mặt trước{spec.kind === 'voucher' ? ' · bên trái là cuống lưu (xé theo răng cưa)' : ''}</div>{card('front', frontRef)}</div>
              <div><div className="text-[11px] text-slate-400 mb-1">Mặt sau</div>{card('back', backRef)}</div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {count} tấm · {pages} tờ in · tràn lề {VC_BLEED_MM}mm{spec.foil ? ' · ép kim' : ''}</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={() => downloadPng('front')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="vc-png-front">
                {busy === 'png-front' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG trước
              </button>
              <button type="button" onClick={() => downloadPng('back')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="vc-png-back">
                {busy === 'png-back' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG sau
              </button>
              <button type="button" onClick={download3d} disabled={tab !== '3d'} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs disabled:opacity-40" data-testid="vc-3d-png" title={tab !== '3d' ? 'Mở tab 3D để chụp' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary col-span-3 sm:col-span-1 !flex justify-center !py-2.5 !text-xs" data-testid="vc-pdf" title="Mặt trước + sau (tràn lề, vạch cắt) + trang đường cắt/răng cưa + khuôn ép kim">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
              <button type="button" onClick={downloadZip} className="mv-btn mv-btn-primary col-span-3 sm:col-span-2 !flex justify-center !py-2.5 !text-xs" data-testid="vc-zip" title="Tờ in 32,5×43 cm: mỗi tấm 1 mã số, lớp In + CutContour (+ răng cưa), chữ đã outline">
                {busy.startsWith('zip') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {busyTxt('zip', `Tờ in có số (.zip · ${pages + 1} tờ)`)}
              </button>
            </div>
            <PrintRequest product="voucher" title={orderTitle} defaultMaterial={MATERIAL[spec.kind]} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              PDF in: 2 mặt đúng khổ + trang <b>đường cắt / răng cưa</b>{spec.foil ? <> + <b>khuôn ép kim</b> (vùng đen = nhũ)</> : null}. Tờ in có số: mỗi tấm 1 mã riêng, mặt sau lật gương để in 2 mặt khớp nhau — xưởng in thẳng, không cần đánh số tay.
            </p>
          </div>
        </div>
      )}

      {/* bản ẩn: khuôn ép kim (3D), file in PDF, hình thẻ không số (tờ in), tờ in đang xuất */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={foilFrontRef}>{spec.foil && <VoucherSvg spec={spec} data={data} side="front" foilMask style={{ width: '100%', display: 'block' }} />}</div>
          <div ref={foilBackRef}>{spec.foil && <VoucherSvg spec={spec} data={data} side="back" foilMask style={{ width: '100%', display: 'block' }} />}</div>
          <div ref={printRef} data-testid="vc-print">
            <div><VoucherSvg spec={spec} data={data} side="front" bleed print style={{ width: '100%', display: 'block' }} /></div>
            <div><VoucherSvg spec={spec} data={data} side="back" bleed print style={{ width: '100%', display: 'block' }} /></div>
            <div><VoucherDieSvg spec={spec} /></div>
            {spec.foil && <div><VoucherSvg spec={spec} data={data} side="front" bleed print foilMask="print" style={{ width: '100%', display: 'block' }} /></div>}
            {spec.foil && <div><VoucherSvg spec={spec} data={data} side="back" bleed print foilMask="print" style={{ width: '100%', display: 'block' }} /></div>}
          </div>
          <div ref={defFrontRef}><VoucherSvg spec={spec} data={data} side="front" bleed print serial={null} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={defBackRef}><VoucherSvg spec={spec} data={data} side="back" bleed print serial={null} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={sheetRef} data-testid="vc-sheet"><VoucherSheetSvg spec={spec} data={data} side={sheet.side} page={sheet.page} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
