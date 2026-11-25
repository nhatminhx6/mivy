'use client';
// Nhãn tên học sinh: chọn chủ đề dễ thương (vẽ bằng code, không nhân vật bản quyền) → điền tên bé, lớp, trường, SĐT
// (tuỳ chọn ảnh bé) → 1 tờ A4 decal chống nước 54 nhãn: lớn (vở), vừa (bình nước), mini (bút chì), tròn (ảnh), giày L/R.
// Nhiều bé → mỗi bé 1 tờ. Xem 3D trên bàn học → tải PNG, PDF in, file in–cắt (In + CutContour).

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, X } from 'lucide-react';
import {
  NL_COUNT, NL_FONTS, NL_FONT_CSS, NL_SHEET, NL_TEMPLATES, NL_THEMES, NL_TYPE_NAME,
  NlLabelSvg, NlSheetSvg, defaultNlKid, defaultNlSpec, nlTheme, parseKids, useNlFonts,
  type NlKid, type NlSpec,
} from '@/lib/namelabel-engine';
import { zipStore } from '@/lib/seal-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, 600 / Math.min(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

const te = new TextEncoder();
const PEELED = ['big0', 'medium0', 'mini0'];

export default function NameLabelPage() {
  const ready = useNlFonts();
  const [spec, setSpec] = useState<NlSpec>(defaultNlSpec);
  const [kid, setKid] = useState<NlKid>(defaultNlKid);
  const [batch, setBatch] = useState('');
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [view, setView] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const bigRef = useRef<HTMLDivElement | null>(null);
  const medRef = useRef<HTMLDivElement | null>(null);
  const miniRef = useRef<HTMLDivElement | null>(null);
  const texRef = useRef<HTMLDivElement | null>(null);
  const prevRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);

  const kids = useMemo(() => {
    const list = batch.trim() ? parseKids(batch, kid) : [];
    return list.length ? list : [kid];
  }, [batch, kid]);
  const vi = Math.min(view, kids.length - 1);
  const cur = kids[vi];
  const photo = photos[vi];
  const th = nlTheme(spec.theme);
  const slug = slugify(`nhan-ten-${kids.length > 1 ? `${kids.length}-be` : cur.name}`, 'nhan-ten');
  const set = (p: Partial<NlSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setK = (p: Partial<NlKid>) => setKid((k) => ({ ...k, ...p }));

  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;
  const printSheets = () => Array.from(printRef.current?.querySelectorAll('svg[data-nl-sheet="print"]') || []) as SVGSVGElement[];
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };

  const sheetSvgText = async (el: SVGSVGElement) => new XMLSerializer().serializeToString(await selfContainedSvg(el, undefined, { outline: true }));
  const cutFile = async (): Promise<{ blob: Blob; name: string }> => {
    const els = printSheets();
    if (!els.length) throw new Error('Chưa dựng xong tờ nhãn');
    if (els.length === 1) return { blob: new Blob([await sheetSvgText(els[0])], { type: 'image/svg+xml' }), name: `${slug}-to-a4-in-cat.svg` };
    const files: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < els.length; i++) files.push({ name: `${String(i + 1).padStart(2, '0')}-${slugify(kids[i]?.name || '', 'be')}-in-cat.svg`, data: te.encode(await sheetSvgText(els[i])) });
    return { blob: zipStore(files), name: `${slug}-${els.length}-to-in-cat.zip` };
  };
  const pdfAll = async (): Promise<Blob> => {
    const els = printSheets();
    if (!els.length) throw new Error('Chưa dựng xong tờ nhãn');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [NL_SHEET.wMm, NL_SHEET.hMm], orientation: 'portrait', compress: true });
    const dpi = els.length > 10 ? 200 : 300;
    const W = Math.round((NL_SHEET.wMm / 25.4) * dpi), H = Math.round((NL_SHEET.hMm / 25.4) * dpi);
    for (let i = 0; i < els.length; i++) {
      if (i > 0) pdf.addPage([NL_SHEET.wMm, NL_SHEET.hMm], 'portrait');
      const c = await svgToCanvas(await selfContainedSvg(els[i], NL_FONT_CSS, { outline: true }), W, H, '#ffffff');
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, NL_SHEET.wMm, NL_SHEET.hMm, undefined, 'FAST');
    }
    return pdf.output('blob');
  };

  const downloadPng = () => run('png', async () => { const el = svgOf(prevRef); if (el) downloadBlob(await svgToPng(el, NL_FONT_CSS, 1600), `${slug}-to-nhan.png`); });
  const downloadPdf = () => run('pdf', async () => downloadBlob(await pdfAll(), `${slug}-${kids.length}-to-a4.pdf`));
  const downloadCut = () => run('svg', async () => { const f = await cutFile(); downloadBlob(f.blob, f.name); });
  const download3d = () => run('3d', async () => {
    const c = await view3d.current?.snapshot(1600, 1200, { watermark: true });
    if (!c) return;
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('ảnh'))), 'image/png'));
    downloadBlob(b, `${slug}-3d.png`);
  });

  const makeFiles = async () => {
    const pv = svgOf(prevRef);
    if (!pv) throw new Error('Chưa dựng xong tờ nhãn, thử lại nhé.');
    const f = await cutFile();
    const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ảnh'))), 'image/jpeg', 0.86));
    const preview = view3d.current && tab === '3d'
      ? await view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv, NL_FONT_CSS, 900))
      : await svgToJpeg(pv, NL_FONT_CSS, 900);
    return { file: f.blob, fileName: f.name, preview };
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const d = await readPhoto(f); setPhotos((p) => ({ ...p, [vi]: d })); } catch { alert('Không đọc được ảnh'); }
  };

  const build3d = () => import('@/lib/namelabel-3d').then((m) => m.nameLabelBuilder({
    big: svgOf(bigRef), medium: svgOf(medRef), mini: svgOf(miniRef), sheet: svgOf(texRef), fontCss: NL_FONT_CSS,
    accent: th.accent, soft: th.soft, accent2: th.accent2,
    // bình nước tương phản với nhãn: nhãn nền nhạt → bình màu đậm, nhãn nền đậm → bình màu nhạt
    bottle: spec.style === 'light' ? th.accent : th.soft, capColor: spec.style === 'light' ? th.accent2 : th.accent,
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __nlSnap?: (w: number, h: number) => Promise<string> }).__nlSnap = async (w, h) => {
    const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]);
    return (await core.snapshot(b, w, h)).toDataURL('image/png');
  };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const orderTitle = `Nhãn tên học sinh · ${kids.length} bé × ${NL_COUNT} nhãn · chủ đề ${th.name}`;
  const input = (k: keyof NlKid, label: string, ph?: string, half?: boolean) => (
    <label className={`block ${half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
      <span className="mv-label block mb-1.5">{label}</span>
      <input className="mv-input" value={kid[k]} onChange={(e) => setK({ [k]: e.target.value } as Partial<NlKid>)} placeholder={ph} data-testid={`nl-in-${k}`} />
    </label>
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Nhãn tên học sinh" sub="1 tờ A4 decal chống nước 54 nhãn: nhãn lớn dán vở, nhãn vừa dán bình nước, mini dán bút chì, nhãn tròn có ảnh bé, cặp nhãn giày Trái/Phải. Nhiều bé → mỗi bé 1 tờ." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn chủ đề (${NL_TEMPLATES.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {NL_TEMPLATES.map((t) => {
                  const on = spec.theme === t.spec.theme && spec.style === t.spec.style && spec.font === t.spec.font;
                  const tt = nlTheme(t.spec.theme);
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="nl-tpl"
                      className={`rounded-xl border p-2 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg grid place-items-center px-2 py-4" style={{ background: tt.soft }}>
                        <NlLabelSvg type="big" spec={{ ...spec, ...t.spec }} kid={cur} photo={photo} style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 2px 4px rgba(15,23,42,0.22))' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin bé">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {input('name', 'Tên bé (to nhất)', 'Gia Khánh')}
                  {input('cls', 'Lớp', 'Lớp 2A', true)}
                  {input('school', 'Trường', 'TH An Khang', true)}
                  {input('phone', 'SĐT phụ huynh (tuỳ chọn)', '0909 123 456')}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={spec.showSchool} onChange={(e) => set({ showSchool: e.target.checked })} data-testid="nl-show-school" /> In tên trường</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={spec.showPhone} onChange={(e) => set({ showPhone: e.target.checked })} data-testid="nl-show-phone" /> In SĐT trên nhãn lớn</label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mv-btn mv-btn-ghost !py-2 !text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {photo ? 'Đổi ảnh bé' : 'Tải ảnh bé (tuỳ chọn)'}
                    <input type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="nl-photo" />
                  </label>
                  {photo && <button type="button" onClick={() => setPhotos((p) => { const n = { ...p }; delete n[vi]; return n; })} className="mv-btn mv-btn-ghost !py-2 !text-xs"><X className="w-3.5 h-3.5" /> Bỏ ảnh</button>}
                  <span className="text-[11px] text-slate-500">Ảnh hiện trên nhãn tròn + nhãn lớn · xử lý ngay trên máy, không tải lên đâu</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nhiều bé (anh chị em, cả lớp)" defaultOpen={false}>
              <div className="space-y-2">
                <textarea className="mv-input min-h-[110px] font-mono text-xs" value={batch} onChange={(e) => { setBatch(e.target.value); setView(0); }} data-testid="nl-batch"
                  placeholder={'Mỗi dòng 1 bé: Tên | Lớp | Trường | SĐT\nGia Khánh | Lớp 2A\nBảo Ngọc | Lớp 4B | TH Hoà Bình\nAn Nhiên | Mầm non Lá'} />
                <div className="text-[11px] text-slate-400">Ô bỏ trống lấy theo thông tin ở mục 2. Mỗi bé 1 tờ A4 ({NL_COUNT} nhãn). Tối đa 40 bé.</div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Kiểu, màu & font">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Chủ đề</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nl-themes">
                    {NL_THEMES.map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ theme: t.id })} className={`flex items-center gap-1.5 ${chip(spec.theme === t.id)}`}>
                        <span className="w-3.5 h-3.5 rounded-full" style={{ background: `linear-gradient(135deg, ${t.accent} 55%, ${t.accent2} 55%)` }} />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Nền nhãn</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="nl-styles">
                    <button type="button" onClick={() => set({ style: 'solid' })} className={chip(spec.style === 'solid')}>Nền màu đậm · chữ trắng</button>
                    <button type="button" onClick={() => set({ style: 'light' })} className={chip(spec.style === 'light')}>Nền nhạt · chữ màu</button>
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên bé</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="nl-fonts">
                    {NL_FONTS.map((f) => <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{f.name}</button>)}
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
            {kids.length > 1 && (
              <select className="mv-input !py-1.5 !text-xs" value={vi} onChange={(e) => setView(Number(e.target.value))} data-testid="nl-kid-pick">
                {kids.map((k, i) => <option key={i} value={i}>{`Tờ ${i + 1}: ${k.name}`}</option>)}
              </select>
            )}
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, cur, (photo || '').length])} refitKey="nl" debounce={400} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={tab === '3d' ? 'hidden' : ''}>
              <div className="rounded-lg overflow-hidden border border-mv-hair bg-white mx-auto max-w-[360px]" data-testid="nl-preview" ref={prevRef}>
                <NlSheetSvg spec={spec} kid={cur} photo={photo} mode="preview" kidIndex={vi} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">A4 decal nhựa chống nước · {NL_COUNT} nhãn/tờ · {kids.length} tờ · nét bế kiss-cut từng nhãn</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={download3d} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nl-3d" disabled={tab !== '3d'} title={tab !== '3d' ? 'Mở tab 3D để tải ảnh 3D' : ''}>
                {busy === '3d' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh 3D
              </button>
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nl-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG tờ nhãn
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="nl-pdf" title="Mỗi bé 1 trang A4, chữ đã outline">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF in ({kids.length} tờ)
              </button>
              <button type="button" onClick={downloadCut} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="nl-svg" title="Lớp In (tràn 1mm) + CutContour từng nhãn, chữ đã outline">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in–cắt {kids.length > 1 ? '(.zip)' : '(SVG)'}
              </button>
            </div>
            <PrintRequest product="namelabel" title={orderTitle} defaultMaterial="Tờ nhãn tên decal chống nước" design={{ spec, kids }} makeFiles={makeFiles} />
            <div className="text-[11px] leading-relaxed text-slate-500 space-y-1">
              <p>Mỗi tờ gồm: {Object.values(NL_TYPE_NAME).join(' · ')}.</p>
              <p>File in–cắt: lớp <b>In</b> (nền tràn 1mm) + <b>CutContour</b> (đường bế kiss-cut, spot Magenta) — in decal nhựa sữa cán màng bóng để chống nước, bế nửa lớp giữ nguyên tờ đế.</p>
            </div>
          </div>
        </div>
      )}

      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 900, pointerEvents: 'none' }}>
          <div ref={bigRef}><NlLabelSvg type="big" spec={spec} kid={cur} photo={photo} /></div>
          <div ref={medRef}><NlLabelSvg type="medium" spec={spec} kid={cur} photo={photo} /></div>
          <div ref={miniRef}><NlLabelSvg type="mini" spec={spec} kid={cur} photo={photo} /></div>
          <div ref={texRef}><NlSheetSvg spec={spec} kid={cur} photo={photo} mode="tex" peeled={PEELED} kidIndex={vi} /></div>
          <div ref={printRef} data-testid="nl-print">
            {kids.map((k, i) => <NlSheetSvg key={i} spec={spec} kid={k} photo={photos[i]} mode="print" kidIndex={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
