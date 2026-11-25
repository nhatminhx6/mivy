'use client';
// Catalogue nhiều trang (đóng ghim giữa): chọn mẫu theo ngành → chọn số trang (8–24) + loại từng trang (thêm/đổi/sắp xếp)
// → điền nội dung, ảnh từng sản phẩm (tuỳ chọn, chỉ trên máy) → xem thành phẩm 3D (cuốn mở + cuốn gập) → tải PDF in
// trang đơn hoặc BÌNH TRANG đóng ghim (lề xén 3mm, vạch cắt, vạch gấp) / PNG cặp trang, hoặc gửi yêu cầu in. 0 AI.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { ArrowDown, ArrowUp, Box, ChevronLeft, ChevronRight, Download, FileDown, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  BK_BLEED_MM, BK_COUNTS, BK_FIELD_GROUPS, BK_FONTS, BK_FONT_CSS, BK_INDUSTRIES, BK_PAGE_TYPES, BK_PALETTES, BK_SAMPLES, BK_SIZES, BK_STYLES, BK_TEMPLATES,
  BookletPage, BookletSpread, bkSize, bookletPdf, defaultBKData, defaultPages, imposition, pageTypeName, parseProducts, readerSpreads, resizePages, useBKFonts,
  type BKData, type BKPhotos, type BKSpec, type BKTemplate, type Industry, type PageType,
} from '@/lib/booklet-engine';
import { svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: BKSpec = { ...BK_TEMPLATES[0].spec, size: 'a4' };

// đổi ngành khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu ngành cũ → chữ mẫu ngành mới
function switchData(d: BKData, from: Industry, to: Industry): BKData {
  const oldS = BK_SAMPLES[from], next = defaultBKData(to);
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

async function loadPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  } finally { URL.revokeObjectURL(url); }
}

function PhotoPick({ label, value, onChange, testid }: { label: string; value?: string; onChange: (v: string) => void; testid: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { onChange(await loadPhoto(f)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-10 h-10 rounded-lg border border-mv-hair overflow-hidden shrink-0 grid place-items-center bg-ink/[0.04]">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-4 h-4 text-slate-400" />}
      </div>
      <span className="text-xs text-slate-300 truncate flex-1 min-w-0">{label}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid={testid} />
      <button type="button" onClick={() => ref.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !px-2.5 !text-[11px] shrink-0">{value ? 'Đổi' : 'Tải ảnh'}</button>
      {value && <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-rose-400 shrink-0" aria-label="Xoá ảnh"><Trash2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

export default function BookletStudio() {
  const ready = useBKFonts();
  const [spec, setSpec] = useState<BKSpec>(FIRST);
  const [data, setData] = useState<BKData>(defaultBKData(FIRST.industry));
  const [dirty, setDirty] = useState(false);
  const [pages, setPages] = useState<PageType[]>(defaultPages(12));
  const [photos, setPhotos] = useState<BKPhotos>({});
  const [spreadIdx, setSpreadIdx] = useState(1);
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const [busy, setBusy] = useState('');
  const [prog, setProg] = useState('');
  const spreadRef = useRef<HTMLDivElement | null>(null);
  const spread3dRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const n = pages.length;
  const sz = bkSize(spec.size);
  const spreads = useMemo(() => readerSpreads(n), [n]);
  const sIdx = Math.min(spreadIdx, spreads.length - 1);
  const pair = spreads[sIdx];
  const pair3d: [number, number] = pair[0] && pair[1] ? pair : [2, 3];
  const products = parseProducts(data.products);
  const set = (p: Partial<BKSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const setPhoto = (key: string, v: string) => setPhotos((ph) => { const nx = { ...ph }; if (v) nx[key] = v; else delete nx[key]; return nx; });
  const pickTemplate = (t: BKTemplate) => {
    if (t.spec.industry !== spec.industry) setData((d) => (dirty ? switchData(d, spec.industry, t.spec.industry) : defaultBKData(t.spec.industry)));
    set(t.spec);
  };
  const setCount = (c: number) => { setPages((p) => resizePages(p, c)); };
  const setType = (i: number, t: PageType) => setPages((p) => p.map((x, j) => (j === i ? t : x)));
  const move = (i: number, dir: -1 | 1) => setPages((p) => {
    const j = i + dir; if (j < 1 || j > p.length - 2) return p;
    const q = [...p]; [q[i], q[j]] = [q[j], q[i]]; return q;
  });
  const used = new Set(pages);
  const slug = slugify(`catalogue-${data.brand || ''}`, 'catalogue');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key); setProg('');
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); setProg(''); }
  };
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSvgs = () => {
    const els = Array.from(printRef.current?.querySelectorAll('svg[data-page]') || []) as SVGSVGElement[];
    if (els.length !== n) throw new Error('Chưa dựng xong catalogue, thử lại nhé.');
    return els;
  };
  const pdfName = (mode: 'reader' | 'imposed') => `${slug}-${sz.id}-${n}trang-${mode === 'reader' ? 'trang-don' : 'binh-trang'}.pdf`;
  const makePdf = (mode: 'reader' | 'imposed') => bookletPdf(printSvgs(), spec, BK_FONT_CSS, mode, 220, (d, t) => setProg(`${d}/${t}`));
  const downloadPdf = (mode: 'reader' | 'imposed') => run(`pdf-${mode}`, async () => downloadBlob(await makePdf(mode), pdfName(mode)));
  const downloadPng = () => run('png', async () => {
    const el = svgOf(spreadRef); if (!el) return;
    downloadBlob(await svgToPng(el, BK_FONT_CSS, 2400), `${slug}-trang-${pair.filter(Boolean).join('-')}.png`);
  });
  const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg') => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), type, 0.88));
  const download3d = () => run('3d', async () => {
    if (!view3d.current) throw new Error('Mở tab Thành phẩm 3D trước nhé.');
    downloadBlob(await toBlob(await view3d.current.snapshot(1600, 1200, { watermark: true }), 'image/png'), `${slug}-3d.png`);
  });
  const makeFiles = async () => {
    const cv = svgOf(coverRef);
    if (!cv) throw new Error('Chưa dựng xong catalogue, thử lại nhé.');
    const preview = view3d.current
      ? view3d.current.snapshot(1200, 900).then((c) => toBlob(c)).catch(() => svgToJpeg(cv, BK_FONT_CSS, 1000))
      : svgToJpeg(cv, BK_FONT_CSS, 1000);
    const [file, pre] = await Promise.all([makePdf('reader'), preview]);
    return { file, fileName: pdfName('reader'), preview: pre };
  };
  const build3d = () => import('@/lib/booklet-3d').then((m) => m.bookletBuilder({ spread: svgOf(spread3dRef), cover: svgOf(coverRef), wMm: sz.wMm, hMm: sz.hMm, pages: n, fontCss: BK_FONT_CSS }));
  // hook QC (dev): chụp 3D đúng góc mặc định
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __bkSnap?: (w: number, h: number) => Promise<string> }).__bkSnap = async (w, h) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return (await core.snapshot(b, w, h)).toDataURL('image/png');
  };
  const orderTitle = `Catalogue ${sz.name.split(' · ')[0]} · ${n} trang · đóng ghim`;
  const imp = imposition(n).map(([a, b]) => `${a}|${b}`).join(' ');

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const ratio = `${sz.wMm} / ${sz.hMm}`;
  const spreadRatio = `${sz.wMm * 2} / ${sz.hMm}`;
  const pairLabel = (pr: [number, number]) => (pr[0] && pr[1] ? `Trang ${pr[0]}–${pr[1]}` : pr[1] === 1 ? 'Bìa trước' : 'Bìa sau');

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Catalogue nhiều trang" sub="Catalogue sản phẩm, hồ sơ năng lực 8–24 trang đóng ghim — chọn mẫu theo ngành, sắp xếp trang, điền sản phẩm + ảnh, xem cuốn 3D, tải PDF in (trang đơn hoặc bình trang) hoặc đặt Mivy in + đóng cuốn." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${BK_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {BK_TEMPLATES.map((t) => {
                  const on = spec.industry === t.spec.industry && spec.style === t.spec.style && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  const tSpec = { ...t.spec, size: spec.size };
                  const tData = t.spec.industry === spec.industry ? data : dirty ? switchData(data, spec.industry, t.spec.industry) : BK_SAMPLES[t.spec.industry];
                  return (
                    <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid="bk-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-md overflow-hidden shadow-sm" style={{ aspectRatio: ratio }}>
                        <BookletPage spec={tSpec} data={tData} pages={pages} index={0} photos={t.spec.industry === spec.industry ? photos : {}} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`2 · Số trang & thứ tự trang (${n} trang)`}>
              <div className="space-y-3">
                <div>
                  <div className="mv-label mb-1.5">Số trang (đóng ghim giữa → luôn là bội số của 4)</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bk-counts">
                    {BK_COUNTS.map((c) => <button key={c} type="button" onClick={() => setCount(c)} className={chip(n === c)} data-testid={`bk-count-${c}`}>{c} trang</button>)}
                  </div>
                </div>
                <div className="space-y-1.5" data-testid="bk-pages">
                  {pages.map((t, i) => {
                    const fixed = i === 0 || i === n - 1;
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-mv-hair px-2.5 py-1.5" data-testid="bk-page-row">
                        <span className="w-7 text-xs font-bold text-slate-400 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        {fixed ? <span className="flex-1 text-xs font-semibold text-mv-fg">{pageTypeName(t)}</span> : (
                          <select className="mv-input !py-1 !text-xs flex-1 min-w-0" value={t} onChange={(e) => setType(i, e.target.value as PageType)} data-testid="bk-page-type">
                            {BK_PAGE_TYPES.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                          </select>
                        )}
                        {!fixed && (
                          <>
                            <button type="button" onClick={() => move(i, -1)} disabled={i <= 1} className="text-slate-400 hover:text-mv-fg disabled:opacity-25" aria-label="Lên"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => move(i, 1)} disabled={i >= n - 2} className="text-slate-400 hover:text-mv-fg disabled:opacity-25" aria-label="Xuống"><ArrowDown className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <button type="button" onClick={() => { const si = spreads.findIndex((s) => s.includes(i + 1)); setSpreadIdx(si); }} className="text-[11px] text-indigo-300 hover:underline shrink-0">Xem</button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">Các trang lưới sản phẩm lấy sản phẩm nối tiếp nhau theo danh sách ở mục 3. Bìa trước và bìa sau cố định.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="space-y-5">
                {BK_FIELD_GROUPS.filter((g) => g.types.some((t) => used.has(t))).map((g) => (
                  <div key={g.title} className="space-y-2.5">
                    <div className="text-sm font-bold text-mv-fg">{g.title}</div>
                    <div className="grid grid-cols-2 gap-3">
                      {g.fields.map((f) => (
                        <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                          <span className="mv-label block mb-1.5">{f.label}</span>
                          {f.multiline
                            ? <textarea className="mv-input min-h-[110px] !text-xs" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`bk-${f.key}`} />
                            : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`bk-${f.key}`} />}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Ảnh (tuỳ chọn — không có thì tự vẽ hình minh hoạ)">
              <div className="space-y-2">
                <PhotoPick label="Ảnh bìa trước" value={photos.cover} onChange={(v) => setPhoto('cover', v)} testid="bk-photo-cover" />
                {used.has('about') && <PhotoPick label="Ảnh trang giới thiệu" value={photos.about} onChange={(v) => setPhoto('about', v)} testid="bk-photo-about" />}
                {used.has('featured') && <PhotoPick label="Ảnh sản phẩm nổi bật" value={photos.feat} onChange={(v) => setPhoto('feat', v)} testid="bk-photo-feat" />}
                {(used.has('grid2') || used.has('grid4') || used.has('grid6')) && products.map((pr) => (
                  <PhotoPick key={pr.idx} label={`${pr.code ? pr.code + ' · ' : ''}${pr.name || 'Sản phẩm ' + (pr.idx + 1)}`} value={photos[`p${pr.idx}`]} onChange={(v) => setPhoto(`p${pr.idx}`, v)} testid={`bk-photo-p${pr.idx}`} />
                ))}
                <p className="text-[11px] text-slate-500">Ảnh chỉ nằm trên máy anh chị, tự thu nhỏ ≤1800px.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="5 · Khổ, phong cách, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Khổ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bk-sizes">
                    {BK_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid={`bk-size-${s.id}`}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Ngành (hình minh hoạ)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {BK_INDUSTRIES.map((ind) => <button key={ind.id} type="button" onClick={() => { if (ind.id !== spec.industry) { setData((d) => (dirty ? switchData(d, spec.industry, ind.id) : defaultBKData(ind.id))); set({ industry: ind.id }); } }} className={chip(spec.industry === ind.id)}>{ind.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Phong cách</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bk-styles">
                    {BK_STYLES.map((s) => <button key={s.id} type="button" onClick={() => set({ style: s.id })} className={chip(spec.style === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="bk-palettes">
                    {BK_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-5 h-5 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tiêu đề</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {BK_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg">Xem trước</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, pages, pair3d, Object.keys(photos), Object.values(photos).map((v) => v.length)])} refitKey={`${spec.size}`} debounce={500} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div ref={spreadRef} className="rounded-md overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)] bg-white/40" style={{ aspectRatio: spreadRatio }} data-testid="bk-spread">
                <BookletSpread spec={spec} data={data} pages={pages} pair={pair} photos={photos} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setSpreadIdx(Math.max(0, sIdx - 1))} disabled={sIdx === 0} className="mv-btn mv-btn-ghost !py-1.5 !px-2 disabled:opacity-30" data-testid="bk-prev"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-semibold text-slate-300" data-testid="bk-spread-label">{tab === '3d' && !(pair[0] && pair[1]) ? `${pairLabel(pair)} (3D hiện trang 2–3)` : pairLabel(pair)} · {sIdx + 1}/{spreads.length}</span>
              <button type="button" onClick={() => setSpreadIdx(Math.min(spreads.length - 1, sIdx + 1))} disabled={sIdx >= spreads.length - 1} className="mv-btn mv-btn-ghost !py-1.5 !px-2 disabled:opacity-30" data-testid="bk-next"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {n} trang · lề xén {BK_BLEED_MM}mm · vạch cắt · chữ outline</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => downloadPdf('reader')} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="bk-pdf-reader">
                {busy === 'pdf-reader' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {prog}</> : <><FileDown className="w-3.5 h-3.5" /> PDF trang đơn</>}
              </button>
              <button type="button" onClick={() => downloadPdf('imposed')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bk-pdf-imposed">
                {busy === 'pdf-imposed' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {prog}</> : <><FileDown className="w-3.5 h-3.5" /> PDF bình trang</>}
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bk-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG cặp trang
              </button>
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bk-3d-png">
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
            </div>
            <PrintRequest product="booklet" title={orderTitle} defaultMaterial={spec.size === 'a5' ? 'Catalogue A5 đóng ghim' : 'Catalogue A4 đóng ghim 8–24 trang'} design={{ spec, data, pages, photos: Object.keys(photos) }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              <b>PDF trang đơn</b>: mỗi trang 1 trang PDF theo thứ tự đọc — gửi xưởng là chuẩn. <b>PDF bình trang</b>: mỗi trang PDF là 1 mặt tờ in 2 trang đúng thứ tự đóng ghim (<span data-testid="bk-imposition">{imp}</span>), in 2 mặt lật cạnh dài, gấp đôi rồi lồng các tờ vào nhau.
            </p>
          </div>
        </div>
      )}

      {/* bản in ẩn: mọi trang có lề xén + cặp trang cho 3D + bìa */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={printRef} data-testid="bk-print">
            {pages.map((_, i) => <BookletPage key={i} spec={spec} data={data} pages={pages} index={i} photos={photos} bleed style={{ width: '100%', display: 'block' }} />)}
          </div>
          <div ref={spread3dRef}><BookletSpread spec={spec} data={data} pages={pages} pair={pair3d} photos={photos} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={coverRef}><BookletPage spec={spec} data={data} pages={pages} index={0} photos={photos} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
