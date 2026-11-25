'use client';
// Tent card để bàn: chọn kiểu (chữ A gấp 2 mặt / tam giác 3 mặt / kệ mica chữ V) → chọn mẫu → mỗi mặt 1 công dụng
// (món mới, happy hour, wifi QR, đặt chỗ, số bàn + QR gọi món, đánh giá Google, menu mini, bảng tên) → điền → xem 3D trên bàn
// → tải PDF khuôn bế (cắt + gấp + lề xén) / thẻ rời, hoặc đặt Mivy in. Bảng tên: dán danh sách → mỗi người 1 thẻ.
// Ảnh / logo khách tải lên chỉ nằm trên máy.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Box, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  DielineSvg, FaceSvg, TT_CARD_BLEED_MM, TT_FIELDS, TT_FONTS, TT_FONT_CSS, TT_KINDS, TT_LAYOUTS, TT_PALETTES, TT_SIZES, TT_TEMPLATES, TT_USES,
  defaultTTData, dieInfo, personList, ttKind, ttSize, useName, useTTFonts, type TTData, type TTKind, type TTSpec, type TTTemplate, type TTUse,
} from '@/lib/tabletent-engine';
import { flPalette } from '@/lib/flyer-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng, svgsToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const T0 = TT_TEMPLATES[0];
const FIRST: TTSpec = { kind: 'a', size: '10x15', ...T0.spec, faces: [...T0.spec.faces] as TTSpec['faces'] };

async function loadImg(file: File, max: number, png: boolean): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

// nhiều khuôn bế (mỗi đại biểu 1 trang) → 1 PDF đúng khổ tờ, không thêm vạch cắt (khuôn đã có nét cắt + gấp)
async function dielinesPdf(els: SVGSVGElement[], wMm: number, hMm: number): Promise<Blob> {
  const MM_PER_IN = 25.4;
  let dpi = 300;
  while (((wMm / MM_PER_IN) * dpi) * ((hMm / MM_PER_IN) * dpi) > 28e6 && dpi > 150) dpi -= 25;
  const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
  const { jsPDF } = await import('jspdf');
  const orientation = wMm >= hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], orientation, compress: true });
  for (let i = 0; i < els.length; i++) {
    if (i) pdf.addPage([wMm, hMm], orientation);
    const c = await svgToCanvas(await selfContainedSvg(els[i], TT_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export default function TableTentPage() {
  const ready = useTTFonts();
  const [spec, setSpec] = useState<TTSpec>(FIRST);
  const [data, setData] = useState<TTData>(defaultTTData());
  const [dirty, setDirty] = useState(false);
  const [photo, setPhoto] = useState('');
  const [logo, setLogo] = useState('');
  const [who, setWho] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const facesRef = useRef<HTMLDivElement | null>(null);
  const faces2Ref = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const photoIn = useRef<HTMLInputElement | null>(null);
  const logoIn = useRef<HTMLInputElement | null>(null);

  const kind = ttKind(spec.kind);
  const nFaces = kind.faces;
  const faces = spec.faces.slice(0, nFaces) as TTUse[];
  const hasName = faces.includes('name');
  const people = useMemo(() => (hasName ? personList(data) : []), [hasName, data]);
  const persons = people.length ? people : [null];
  const person = persons[Math.min(who, persons.length - 1)];
  const sz = ttSize(spec.size);
  const ratio = `${sz.wMm} / ${sz.hMm}`;
  const info = dieInfo(spec);
  const p = flPalette(spec.palette);
  const slug = slugify(`tent-card-${data.brand || ''}`, 'tent-card');

  const set = (q: Partial<TTSpec>) => setSpec((s) => ({ ...s, ...q }));
  const setField = (k: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [k]: v })); };
  const setFace = (i: number, u: TTUse) => setSpec((s) => { const f = [...s.faces] as TTSpec['faces']; f[i] = u; return { ...s, faces: f }; });
  const pickTemplate = (t: TTTemplate) => {
    setSpec((s) => ({ ...s, ...t.spec, faces: [...t.spec.faces] as TTSpec['faces'], size: t.size || (s.size === '20x10' ? '10x15' : s.size) }));
    if (!dirty) setData({ ...defaultTTData(), ...(t.sample || {}) });
    setWho(0);
  };
  const tplOn = (t: TTTemplate) => spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font && t.spec.faces.slice(0, nFaces).every((u, i) => spec.faces[i] === u);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const faceEl = (i: number) => facesRef.current?.querySelector(`[data-testid="tt-face-${i}"] svg`) as SVGSVGElement | null;
  const printEls = () => {
    const list = Array.from(printRef.current?.querySelectorAll(':scope > svg') || []) as SVGSVGElement[];
    if (!list.length) throw new Error('Chưa dựng xong file in, thử lại nhé.');
    return list;
  };
  const nCards = persons.length;
  const pdfName = `${slug}-${spec.kind}-${sz.id}${nCards > 1 ? `-${nCards}-the` : ''}-file-in.pdf`;
  const makePdf = () => (spec.kind === 'v'
    ? svgsToPrintPdf(printEls(), TT_FONT_CSS, sz, TT_CARD_BLEED_MM)
    : dielinesPdf(printEls(), info.sheetW, info.sheetH));
  const downloadPdf = () => run('pdf', async () => downloadBlob(await makePdf(), pdfName));
  const downloadPng = () => run('png', async () => { const el = faceEl(0); if (el) downloadBlob(await svgToPng(el, TT_FONT_CSS, 1600), `${slug}-mat-truoc.png`); });
  const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg') => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));
  const download3d = () => run('3d', async () => { if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.'); downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-3d.png`); });
  const makeFiles = async () => {
    const pv = faceEl(0);
    if (!pv) throw new Error('Chưa dựng xong thẻ, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c)).catch(() => svgToJpeg(pv, TT_FONT_CSS, 900))
      : svgToJpeg(pv, TT_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    return { file, fileName: pdfName, preview: pre };
  };
  const capColor = spec.layout === 'bold' ? p.accent : spec.layout === 'frame' ? p.deep : p.paper;
  const build3d = () => import('@/lib/tabletent-3d').then((m) => m.tabletentBuilder({
    faces: Array.from({ length: nFaces }, (_, i) => faceEl(i)),
    faces2: Array.from(faces2Ref.current?.querySelectorAll('svg') || []) as SVGSVGElement[], wMm: sz.wMm, hMm: sz.hMm, kind: spec.kind, fontCss: TT_FONT_CSS, capColor,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __ttSnap?: (w: number, h: number) => Promise<string> }).__ttSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); };

  const onImg = (kindImg: 'photo' | 'logo') => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      if (kindImg === 'photo') setPhoto(await loadImg(f, 1600, false));
      else setLogo(await loadImg(f, 600, true));
    } catch { alert('Không đọc được ảnh này, thử ảnh PNG/JPG khác nhé.'); }
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const seen = new Set<string>();
  const fields = TT_FIELDS.filter((f) => (!f.for || faces.includes(f.for)) && !seen.has(f.key) && (seen.add(f.key), true));
  const orderTitle = `Tent card ${kind.name} · ${sz.name} · ${faces.map(useName).join(' / ')}${nCards > 1 ? ` · ${nCards} thẻ` : ''}`;
  const faceLabel = (i: number) => (spec.kind === 'tri' ? `Mặt ${i + 1}` : i === 0 ? 'Mặt trước' : 'Mặt sau');

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tent card để bàn" sub="Thẻ chữ A, tam giác 3 mặt, kệ mica chữ V — món mới, happy hour, wifi QR, đặt chỗ, số bàn, đánh giá Google, menu mini, bảng tên hội nghị. Có khuôn bế cắt + gấp chuẩn xưởng." />

      <div className="mv-seg mb-5 inline-flex flex-wrap" role="tablist">
        {TT_KINDS.map((k) => (
          <button key={k.id} type="button" className="mv-seg-btn" data-active={spec.kind === k.id} onClick={() => set({ kind: k.id as TTKind })} data-testid={`tt-kind-${k.id}`}>{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${TT_TEMPLATES.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {TT_TEMPLATES.map((t) => {
                  const tsz = ttSize(t.size || (spec.size === '20x10' ? '10x15' : spec.size));
                  const ts: TTSpec = { ...spec, ...t.spec, faces: [...t.spec.faces] as TTSpec['faces'], size: tsz.id };
                  const td = dirty ? data : { ...defaultTTData(), ...(t.sample || {}) };
                  const tp = t.spec.faces[0] === 'name' ? personList(td)[0] || null : null;
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="tt-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${tplOn(t) ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
                        <div className="shadow-sm" style={{ aspectRatio: `${tsz.wMm} / ${tsz.hMm}`, width: tsz.wMm > tsz.hMm ? '100%' : undefined, height: tsz.wMm > tsz.hMm ? undefined : '100%' }}>
                          <FaceSvg spec={ts} data={td} use={t.spec.faces[0]} person={tp} photo={photo} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Mỗi mặt dùng để làm gì?">
              <div className="space-y-3">
                {Array.from({ length: nFaces }, (_, i) => (
                  <div key={i}>
                    <div className="mv-label mb-1.5">{faceLabel(i)}</div>
                    <div className="flex flex-wrap gap-1.5" data-testid={`tt-use-${i}`}>
                      {TT_USES.map((u) => <button key={u.id} type="button" onClick={() => setFace(i, u.id)} className={chip(spec.faces[i] === u.id)}>{u.name}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => logoIn.current?.click()} className="mv-btn mv-btn-ghost !py-2 !text-xs" data-testid="tt-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Thêm logo'}</button>
                  {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  {spec.layout === 'photo' && <button type="button" onClick={() => photoIn.current?.click()} className="mv-btn mv-btn-ghost !py-2 !text-xs" data-testid="tt-photo-btn"><ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh món' : 'Thêm ảnh món'}</button>}
                  {spec.layout === 'photo' && photo && <button type="button" onClick={() => setPhoto('')} className="mv-btn mv-btn-ghost !py-2 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                  <input ref={logoIn} type="file" accept="image/*" className="hidden" onChange={onImg('logo')} data-testid="tt-logo" />
                  <input ref={photoIn} type="file" accept="image/*" className="hidden" onChange={onImg('photo')} data-testid="tt-photo" />
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">Ảnh, logo chỉ nằm trên máy anh chị, không gửi đi đâu. Mẫu “Ảnh lớn” chưa có ảnh sẽ dùng hình minh hoạ vẽ sẵn.</p>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[96px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tt-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`tt-${f.key}`} />}
                    </label>
                  ))}
                </div>
                {hasName && <div className="text-[11px] text-slate-400" data-testid="tt-count">→ {people.length} đại biểu = {people.length} thẻ (2 mặt cùng tên)</div>}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, màu, bố cục & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ mỗi mặt</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TT_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="tt-size">{s.name}</button>)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{kind.note}</p>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="tt-palettes">
                    {TT_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mv-label mb-1.5">Bố cục</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tt-layouts">
                      {TT_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => set({ layout: l.id })} className={chip(spec.layout === l.id)}>{l.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Font tiêu đề</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="tt-fonts">
                      {TT_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
            {persons.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                Xem thẻ của
                <select className="mv-input !py-1 !text-xs flex-1" value={Math.min(who, persons.length - 1)} onChange={(e) => setWho(Number(e.target.value))} data-testid="tt-who">
                  {persons.map((ps, i) => <option key={i} value={i}>{i + 1}. {ps?.name}</option>)}
                </select>
              </label>
            )}
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, who, photo.length, logo.length])} refitKey={`${spec.kind}|${spec.size}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : 'space-y-3'}>
              <div ref={facesRef} className={`grid gap-2 ${nFaces === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} data-testid="tt-faces">
                {Array.from({ length: nFaces }, (_, i) => (
                  <div key={i}>
                    <div className="rounded-md overflow-hidden shadow-[0_8px_24px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid={`tt-face-${i}`} data-face-mm={sz.wMm / 1000}>
                      <FaceSvg spec={spec} data={data} use={faces[i]} person={person} photo={photo} logo={logo} faceIdx={i} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                    <div className="text-[10px] text-slate-400 text-center mt-1">{faceLabel(i)}</div>
                  </div>
                ))}
              </div>
              {persons.length > 1 && (
                <div ref={faces2Ref} className="hidden" aria-hidden>
                  {[0, 1].map((i) => <FaceSvg key={i} spec={spec} data={data} use={faces[i]} person={persons[(Math.min(who, persons.length - 1) + 1) % persons.length]} photo={photo} logo={logo} faceIdx={i + 5} />)}
                </div>
              )}
              <div className="rounded-lg bg-white p-2 overflow-auto max-h-[420px]" data-testid="tt-dieline">
                <DielineSvg spec={spec} data={data} person={person} photo={photo} logo={logo} screen style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 400 }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              {kind.name} · {sz.wMm}×{sz.hMm}mm/mặt · {spec.kind === 'v' ? `2 thẻ rời · lề xén ${TT_CARD_BLEED_MM}mm` : `khuôn ${Math.round(info.wMm)}×${Math.round(info.hMm)}mm · cắt + gấp`}{nCards > 1 ? ` · ${nCards} thẻ` : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tt-3d">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="tt-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="tt-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in
              </button>
            </div>
            <PrintRequest product="tabletent" title={orderTitle} defaultMaterial={spec.kind === 'v' ? 'Tent card mica chữ V' : 'Tent card couche 300 cán mờ'}
              design={{ spec, data, hasPhoto: !!photo, hasLogo: !!logo }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              {spec.kind === 'v'
                ? 'File PDF: mỗi bộ 2 thẻ rời (mặt trước, mặt sau) đúng khổ, nền tràn lề xén + vạch cắt — cài vào 2 mặt kệ mica.'
                : 'File PDF là khuôn bế đúng khổ thật: nét hồng = cắt, nét xanh đứt = gấp, nền tràn lề xén 3mm. Xưởng in + bế + dán sẵn.'}
              {nCards > 1 ? ` Mỗi đại biểu 1 trang (${nCards} trang).` : ''}
            </p>
          </div>
        </div>
      )}

      {/* file in (ẩn): khuôn bế mỗi người 1 trang, hoặc thẻ rời kệ chữ V (2 mặt/bộ) */}
      {ready && (
        <div aria-hidden ref={printRef} style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }} data-testid="tt-print">
          {spec.kind === 'v'
            ? persons.flatMap((ps, i) => [0, 1].map((f) => <FaceSvg key={`${i}-${f}`} spec={spec} data={data} use={faces[f]} person={ps} photo={photo} logo={logo} faceIdx={f} bleedMm={TT_CARD_BLEED_MM} style={{ width: '100%', display: 'block' }} />))
            : persons.map((ps, i) => <DielineSvg key={i} spec={spec} data={data} person={ps} photo={photo} logo={logo} style={{ width: '100%', display: 'block' }} />)}
        </div>
      )}
    </div>
  );
}
