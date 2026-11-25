'use client';
// Photobook · kỷ yếu: chọn mẫu → tải nhiều ảnh (chỉ xử lý trên máy) → TỰ DÀN ẢNH ra các trang đôi → đổi bố cục / đổi ảnh /
// sửa chú thích từng trang → xem sách 3D (cuốn mở lay-flat + cuốn gấp) → tải PDF in (bìa bồi có gáy theo số trang + ruột
// từng trang đôi, lề xén + vạch cắt) hoặc gửi yêu cầu in. Ảnh thiếu nét so với ô thì cảnh báo.

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, FileDown, ImagePlus, Loader2, RefreshCw, Shuffle, Star, Trash2, Users } from 'lucide-react';
import {
  CoverSvg, PB_COVERS, PB_FIELDS, PB_FONTS, PB_FONT_CSS, PB_LAYOUTS, PB_PAGES, PB_PALETTES, PB_SIZES, PB_TEMPLATES, SpreadSvg,
  autoSpreads, defaultPBData, parseStudents, pbCoverDims, pbLayout, pbPalette, pbPdf, pbSamples, pbSize, photoMinDpi, usePBFonts,
  type PBData, type PBLayout, type PBOverride, type PBPhoto, type PBSpec, type PBTemplate,
} from '@/lib/photobook-engine';
import { svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: PBSpec = { theme: 'wedding', palette: 'ivory', font: 'greatvibes', cover: 'window', size: '25x25', pages: 24, sample: 'wedding' };
const MAX_PX = 3200;

// ảnh khách: đọc trên máy, thu nhỏ ≤3200px, giữ dạng blob URL cho nhẹ trang
async function loadPhoto(file: File): Promise<PBPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, MAX_PX / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh lỗi'))), 'image/jpeg', 0.9));
    return { src: URL.createObjectURL(blob), w: c.width, h: c.height, name: file.name };
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, q));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 60)));

export default function PhotobookPage() {
  const ready = usePBFonts();
  const [spec, setSpec] = useState<PBSpec>(FIRST);
  const [data, setData] = useState<PBData>(defaultPBData(FIRST.sample));
  const [dirty, setDirty] = useState(false);
  const [pool, setPool] = useState<PBPhoto[]>([]);
  const [portraits, setPortraits] = useState<PBPhoto[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [ov, setOv] = useState<Record<number, PBOverride>>({});
  const [sel, setSel] = useState(0); // -1 = bìa
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const [printAll, setPrintAll] = useState(false);
  const texRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const portRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setPool(pbSamples(FIRST.sample)); }, []);

  const students = useMemo(() => parseStudents(spec.theme === 'yearbook' ? data.students || '' : ''), [spec.theme, data.students]);
  const spreads = useMemo(() => autoSpreads(spec, data, pool.length, students.length, ov), [spec, data, pool.length, students.length, ov]);
  const cur = sel >= 0 ? Math.min(sel, spreads.length - 1) : -1;
  const sp = cur >= 0 ? spreads[cur] : null;
  const dims = pbCoverDims(spec);
  const sz = pbSize(spec.size);
  const pal = pbPalette(spec.palette);
  const tpl = PB_TEMPLATES.find((t) => t.spec.theme === spec.theme && t.spec.palette === spec.palette && t.spec.font === spec.font && t.spec.cover === spec.cover);
  const usingSamples = pool.length > 0 && pool.every((p) => p.sample);
  const dpis = useMemo(() => photoMinDpi(spec, spreads, pool, coverIdx), [spec, spreads, pool, coverIdx]);
  const low = !usingSamples && dpis.some((d, i) => !pool[i].sample && d > 0 && d < 100);
  const slug = slugify(`photobook-${data.title || ''}`, 'photobook');

  const set = (p: Partial<PBSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const pickTemplate = (t: PBTemplate) => {
    set(t.spec);
    if (!dirty) setData(defaultPBData(t.spec.sample));
    else if (t.spec.theme === 'yearbook' && !data.students) setData((d) => ({ ...d, students: defaultPBData('yearbook').students, school: d.school || defaultPBData('yearbook').school }));
    if (usingSamples || !pool.length) { setPool(pbSamples(t.spec.sample)); setCoverIdx(0); }
    setOv({}); setSel(0);
  };
  const setOverride = (i: number, p: PBOverride) => setOv((o) => ({ ...o, [i]: { ...o[i], ...p } }));

  const onPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    setBusy('up');
    try {
      const got: PBPhoto[] = [];
      for (const f of files.slice(0, 120)) { try { got.push(await loadPhoto(f)); } catch { /* bỏ ảnh lỗi */ } }
      if (!got.length) { alert('Không đọc được ảnh, thử JPG/PNG khác nhé.'); return; }
      setPool((p) => (p.every((x) => x.sample) ? got : [...p, ...got]));
      if (usingSamples) setCoverIdx(0);
    } finally { setBusy(''); }
  };
  const onPortraits = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true })); e.target.value = '';
    if (!files.length) return;
    setBusy('port');
    try { const got: PBPhoto[] = []; for (const f of files.slice(0, 120)) { try { got.push(await loadPhoto(f)); } catch { /* */ } } setPortraits(got); } finally { setBusy(''); }
  };
  const removePhoto = (i: number) => {
    setPool((p) => { const n = p.filter((_, k) => k !== i); return n.length ? n : pbSamples(spec.sample); });
    setCoverIdx((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };
  const shufflePool = () => {
    const coverSrc = pool[coverIdx]?.src;
    const n = [...pool];
    for (let i = n.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [n[i], n[j]] = [n[j], n[i]]; }
    setPool(n); setCoverIdx(Math.max(0, n.findIndex((p) => p.src === coverSrc)));
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const svgsOf = (r: RefObject<HTMLDivElement | null>) => Array.from(r.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
  const withPrint = async <T,>(fn: (els: SVGSVGElement[]) => Promise<T>): Promise<T> => {
    setPrintAll(true);
    try {
      for (let k = 0; k < 40; k++) { await nextFrame(); if (svgsOf(printRef).length === spreads.length + 1) break; }
      const els = svgsOf(printRef);
      if (els.length !== spreads.length + 1) throw new Error('Chưa dựng xong các trang, thử lại nhé.');
      return await fn(els);
    } finally { setPrintAll(false); }
  };
  const [prog, setProg] = useState('');
  const makePdf = () => withPrint((els) => pbPdf(els[0], els.slice(1), spec, (i, n) => setProg(`${i}/${n}`)));
  const pdfName = `${slug}-${sz.id}-${spec.pages}trang-file-in.pdf`;
  const downloadPdf = () => run('pdf', async () => { downloadBlob(await makePdf(), pdfName); setProg(''); });
  const downloadPng = () => run('png', async () => {
    const el = svgsOf(faceRef)[0]; if (!el) return;
    downloadBlob(await svgToPng(el, PB_FONT_CSS, 2400), `${slug}-${cur < 0 ? 'bia' : `trang-doi-${cur + 1}`}.png`);
  });
  const downloadShot = () => run('shot', async () => {
    if (!view3d.current) return;
    const c = await view3d.current.snapshot(1600, 1200, { watermark: true });
    downloadBlob(await toBlob(c, 'image/png'), `${slug}-anh-3d.png`);
  });
  const makeFiles = async () => {
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c, 'image/jpeg', 0.86))
      : svgToPng(svgsOf(faceRef)[0], PB_FONT_CSS, 900);
    const [file, pre] = await Promise.all([makePdf(), preview]);
    setProg('');
    return { file, fileName: pdfName, preview: pre };
  };

  const build3d = () => import('@/lib/photobook-3d').then((m) => {
    const [coverEl, spreadEl] = svgsOf(texRef);
    return m.photobookBuilder({ spreadEl, coverEl, W: dims.W, H: dims.H, bw: dims.bw, bh: dims.bh, spine: dims.spine, pages: spec.pages, coverColor: pal.cover, pageColor: pal.page, fontCss: PB_FONT_CSS });
  });
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as unknown as { __pbSnap?: (w: number, h: number) => Promise<string> }).__pbSnap = async (w, h) => {
      const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
      return (await core.snapshot(b, w, h)).toDataURL('image/png');
    };
  }

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fields = PB_FIELDS.filter((f) => !f.themes || f.themes.includes(spec.theme));
  const texSpread = spreads[Math.max(0, cur)];
  const rebuildKey = JSON.stringify([spec, data, cur, texSpread, coverIdx, pool.map((p) => p.src.slice(-24)), portraits.length]);
  const matDefault = spec.theme === 'yearbook' ? 'Kỷ yếu bìa cứng' : spec.size === 'a4' ? 'Photobook bìa cứng A4 ngang' : 'Photobook bìa cứng 20×20';
  const orderTitle = `Photobook ${sz.name} · ${spec.pages} trang · bìa cứng lay-flat${tpl ? ` · ${tpl.name}` : ''}`;
  const dpiTag = (d: number) => (d >= 150 ? { t: 'Nét', c: 'text-emerald-600' } : d >= 100 ? { t: 'Tạm được', c: 'text-amber-600' } : { t: 'Mờ', c: 'text-rose-600' });
  const layouts = PB_LAYOUTS.filter((l) => l.id !== 'portraits' || spec.theme === 'yearbook');
  const ratio = `${sz.wMm * 2} / ${sz.hMm}`;
  const coverRatio = `${dims.bw * 2 + dims.spine} / ${dims.bh}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Photobook · kỷ yếu" sub="Sách ảnh bìa cứng lay-flat: ảnh cưới, gia đình, em bé, du lịch, kỷ yếu lớp, kỷ niệm công ty. Tải ảnh lên là tự dàn trang — đổi bố cục từng trang đôi, xem sách 3D, tải file in. Ảnh chỉ xử lý trên máy anh chị." />

      {!ready || !pool.length ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${PB_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {PB_TEMPLATES.map((t) => {
                  const on = tpl?.id === t.id;
                  const ts: PBSpec = { ...spec, ...t.spec };
                  const ph = usingSamples ? pbSamples(t.spec.sample)[0] : pool[coverIdx];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="pb-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg bg-[#ECE7DF] aspect-square grid place-items-center p-3">
                        <div className="shadow-[3px_5px_12px_-3px_rgba(0,0,0,0.45)] rounded-[2px] overflow-hidden" style={{ aspectRatio: `${pbCoverDims(ts).bw} / ${pbCoverDims(ts).bh}`, [sz.wMm > sz.hMm ? 'width' : 'height']: '100%' }}>
                          <CoverSvg spec={ts} data={dirty ? data : defaultPBData(t.spec.sample)} photo={ph} mode="front" style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Ảnh (${usingSamples ? 'đang dùng ảnh minh hoạ' : `${pool.length} ảnh`})`}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-primary !py-1.5 !text-xs" data-testid="pb-upload">
                    {busy === 'up' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} {usingSamples ? 'Tải ảnh lên (chọn nhiều)' : 'Thêm ảnh'}
                  </button>
                  <button type="button" onClick={shufflePool} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="pb-shuffle"><Shuffle className="w-3.5 h-3.5" /> Xáo thứ tự ảnh</button>
                  <button type="button" onClick={() => { setOv({}); }} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="pb-auto"><RefreshCw className="w-3.5 h-3.5" /> Tự dàn lại</button>
                  {!usingSamples && <button type="button" onClick={() => { setPool(pbSamples(spec.sample)); setCoverIdx(0); }} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Xoá hết ảnh</button>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} data-testid="pb-files" />
                <p className="text-[11px] text-slate-500">Ảnh tự dàn lần lượt vào các trang đôi (thiếu ảnh thì quay vòng). Bấm ★ để chọn ảnh bìa. Ảnh chỉ xử lý trên máy — chỉ gửi đi khi anh chị đặt in.</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 gap-2" data-testid="pb-pool">
                  {pool.map((p, i) => {
                    const d = dpis[i] || 0, tg = dpiTag(d);
                    return (
                      <div key={`${p.src.slice(-30)}${i}`} className={`relative rounded-lg overflow-hidden border ${i === coverIdx ? 'border-amber-400 ring-2 ring-amber-300/50' : 'border-mv-hair'}`} data-testid="pb-photo">
                        <img src={p.src} alt="" className="w-full aspect-square object-cover" />
                        <button type="button" onClick={() => setCoverIdx(i)} title="Dùng làm ảnh bìa" className={`absolute top-1 left-1 rounded-full p-0.5 ${i === coverIdx ? 'bg-amber-400 text-white' : 'bg-black/40 text-white/80'}`}><Star className="w-3 h-3" /></button>
                        {!p.sample && <button type="button" onClick={() => removePhoto(i)} title="Bỏ ảnh" className="absolute top-1 right-1 rounded-full p-0.5 bg-black/45 text-white"><Trash2 className="w-3 h-3" /></button>}
                        {!p.sample && d > 0 && <span className={`absolute bottom-0 inset-x-0 bg-white/85 text-[9px] font-semibold text-center ${tg.c}`} data-testid="pb-dpi" data-dpi={Math.round(d)}>{tg.t} · {Math.round(d)}dpi</span>}
                      </div>
                    );
                  })}
                </div>
                {low && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex gap-2" data-testid="pb-dpi-warn">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Có ảnh độ phân giải thấp so với ô ảnh (dưới 100 dpi) — in ra dễ mờ. Nên dùng ảnh gốc (không qua Zalo/Facebook), hoặc đổi trang đó sang bố cục nhiều ảnh nhỏ hơn.
                  </div>
                )}
                {spec.theme === 'yearbook' && (
                  <div className="rounded-xl border border-mv-hair p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-300">Ảnh chân dung ({portraits.length}/{students.length})</span>
                      <button type="button" onClick={() => portRef.current?.click()} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="pb-portraits">
                        {busy === 'port' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Tải ảnh chân dung
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">Chọn nhiều ảnh, đặt tên file theo số thứ tự (01.jpg, 02.jpg…) — ảnh gắn lần lượt với danh sách lớp. Chưa có ảnh thì hiện khung chân dung mẫu.</p>
                    <input ref={portRef} type="file" accept="image/*" multiple className="hidden" onChange={onPortraits} data-testid="pb-portrait-files" />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chữ trên sách">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <label key={f.key} className={`space-y-1 ${f.multiline ? 'sm:col-span-2' : ''}`}>
                    <span className="text-xs font-medium text-slate-400">{f.label}</span>
                    {f.multiline
                      ? <textarea className={`mv-input ${f.key === 'students' ? 'min-h-[160px]' : 'min-h-[72px]'}`} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pb-field-${f.key}`} />
                      : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`pb-field-${f.key}`} />}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Khổ, số trang & màu">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Khổ sách (cm)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-sizes">{PB_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Số trang (gáy tự tính: {dims.spine} mm)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-pages">{PB_PAGES.map((n) => <button key={n} type="button" onClick={() => { set({ pages: n }); setOv({}); }} className={chip(spec.pages === n)}>{n} trang</button>)}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Kiểu bìa</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-covers">{PB_COVERS.map((c) => <button key={c.id} type="button" onClick={() => set({ cover: c.id })} className={chip(spec.cover === c.id)}>{c.name}</button>)}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Màu</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-palettes">
                    {PB_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`${chip(spec.palette === p.id)} inline-flex items-center gap-1.5`}>
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: p.cover }} />{p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">Kiểu chữ tiêu đề</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="pb-fonts">{PB_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={chip(spec.font === f.id)} style={{ fontFamily: `"${f.family}"` }}>{f.name}</button>)}</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`5 · Các trang (${spreads.length} trang đôi)`}>
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2" data-testid="pb-strip">
                  <button type="button" onClick={() => setSel(-1)} className={`shrink-0 rounded-lg border p-1 ${cur < 0 ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair'}`} data-testid="pb-sel-cover">
                    <div className="h-16 overflow-hidden" style={{ aspectRatio: coverRatio }}><CoverSvg spec={spec} data={data} photo={pool[coverIdx]} mode="tex" style={{ width: '100%', height: '100%', display: 'block' }} /></div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Bìa</div>
                  </button>
                  {spreads.map((s, i) => (
                    <button key={i} type="button" onClick={() => setSel(i)} className={`shrink-0 rounded-lg border p-1 ${cur === i ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair'}`} data-testid="pb-sel">
                      <div className="h-16 overflow-hidden" style={{ aspectRatio: ratio }}><SpreadSvg spec={spec} data={data} spread={s} pool={pool} portraits={portraits} style={{ width: '100%', height: '100%', display: 'block' }} /></div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Trang {i * 2 + 1}–{i * 2 + 2}</div>
                    </button>
                  ))}
                </div>
                {sp ? (
                  <div className="rounded-xl border border-mv-hair p-3 space-y-2.5" data-testid="pb-spread-editor">
                    <div className="text-xs font-semibold text-slate-300">Trang đôi {cur + 1} · trang {cur * 2 + 1}–{cur * 2 + 2}</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="pb-layouts">
                      {layouts.map((l) => <button key={l.id} type="button" onClick={() => setOverride(cur, { layout: l.id as PBLayout })} className={chip(sp.layout === l.id)}>{l.name}{l.photos ? ` (${l.photos})` : ''}</button>)}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {pbLayout(sp.layout).photos > 0 && (
                        <button type="button" onClick={() => setOverride(cur, { shift: (ov[cur]?.shift || 0) + pbLayout(sp.layout).photos })} className="mv-btn mv-btn-ghost !py-1 !text-xs" data-testid="pb-swap"><Shuffle className="w-3.5 h-3.5" /> Đổi ảnh khác</button>
                      )}
                      {!['quote', 'portraits'].includes(sp.layout) && (
                        <input className="mv-input !py-1.5 flex-1 min-w-[180px]" value={sp.caption} placeholder="Chú thích trang này" onChange={(e) => setOverride(cur, { caption: e.target.value })} data-testid="pb-caption" />
                      )}
                    </div>
                  </div>
                ) : <p className="text-[11px] text-slate-500">Đang xem bìa — chọn ảnh bìa bằng ★ ở mục Ảnh, đổi kiểu bìa ở mục 4.</p>}
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
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={rebuildKey} refitKey={`${spec.size}|${spec.pages}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div ref={faceRef} className={`rounded-lg bg-[#ECE7DF] p-3 ${tab === '3d' ? 'hidden' : ''}`} data-testid="pb-face">
              <div className="shadow-[3px_6px_16px_-4px_rgba(0,0,0,0.4)]" style={{ aspectRatio: cur < 0 ? coverRatio : ratio }}>
                {cur < 0
                  ? <CoverSvg spec={spec} data={data} photo={pool[coverIdx]} mode="tex" style={{ width: '100%', height: '100%', display: 'block' }} />
                  : <SpreadSvg spec={spec} data={data} spread={spreads[cur]} pool={pool} portraits={portraits} style={{ width: '100%', height: '100%', display: 'block' }} />}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setSel((s) => Math.max(-1, (s < 0 ? -1 : Math.min(s, spreads.length - 1)) - 1))} className="mv-btn mv-btn-ghost !py-1 !px-2" data-testid="pb-prev"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-[11px] text-slate-400" data-testid="pb-where">{cur < 0 ? 'Bìa (lưng · gáy · mặt)' : `Trang đôi ${cur + 1}/${spreads.length} · ${pbLayout(spreads[cur].layout).name}`}</span>
              <button type="button" onClick={() => setSel((s) => Math.min(spreads.length - 1, (s < 0 ? -1 : s) + 1))} className="mv-btn mv-btn-ghost !py-1 !px-2" data-testid="pb-next"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} cm · {spec.pages} trang ({spreads.length} trang đôi lay-flat) · gáy {dims.spine} mm · bìa in {Math.round(dims.CW)}×{Math.round(dims.CH)} mm</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadShot} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pb-shot">
                {busy === 'shot' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="pb-pdf">
                {busy === 'pdf' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {prog}</> : <><FileDown className="w-3.5 h-3.5" /> PDF in</>}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="pb-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG trang
              </button>
            </div>
            {low && <p className="text-[11px] text-rose-600 text-center">Có ảnh độ phân giải thấp — xem cảnh báo ở mục Ảnh.</p>}
            {usingSamples && <p className="text-[11px] text-amber-600 text-center">Đang dùng ảnh minh hoạ — tải ảnh của anh chị lên trước khi đặt in.</p>}
            <PrintRequest product="photobook" title={orderTitle} defaultMaterial={matDefault} design={{ spec, data: { ...data, students: students.length ? `${students.length} học sinh` : '' }, photos: pool.length, sample: usingSamples, layouts: spreads.map((s) => s.layout) }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">File in: trang 1 = bìa bồi trải phẳng (lưng · gáy {dims.spine} mm · mặt, chừa {15} mm gấp mép, vạch hồng = mép bìa cứng nằm trong phần gấp); các trang sau = từng trang đôi lay-flat in liền, lề xén 3 mm + vạch cắt.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (bìa + trang đôi đang chọn) và file in (khi xuất) */}
      {ready && pool.length > 0 && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texRef}>
            <div><CoverSvg spec={spec} data={data} photo={pool[coverIdx]} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
            <div><SpreadSvg spec={spec} data={data} spread={texSpread} pool={pool} portraits={portraits} mode="tex" style={{ width: '100%', display: 'block' }} /></div>
          </div>
          {printAll && (
            <div ref={printRef} data-testid="pb-print">
              <div><CoverSvg spec={spec} data={data} photo={pool[coverIdx]} mode="print" style={{ width: '100%', display: 'block' }} /></div>
              {spreads.map((s, i) => <div key={i}><SpreadSvg spec={spec} data={data} spread={s} pool={pool} portraits={portraits} mode="print" style={{ width: '100%', display: 'block' }} /></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
