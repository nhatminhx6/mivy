'use client';
// Studio Sticker / Móc khoá mica: chọn mẫu → hình (3D có sẵn / ảnh của anh, tách nền) → chữ → kiểu cắt + cỡ
// → xem mockup → tải PNG, file cắt SVG (lớp In + CutContour), tờ A4/A5 xếp sẵn nhiều con cho xưởng.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileCode2, Loader2, Scissors, Upload, LayoutGrid } from 'lucide-react';
import {
  CUT_PRESETS, CUT_SHAPES, CutoutSvg, EDGE_COLORS, ICONS_3D, KEYCHAIN_SIZES, SHEETS, STICKER_SIZES, STROKE_COLORS, SheetSvg, TEXT_COLORS, TEXT_POS,
  buildCut, defaultCutSpec, icon3d, loadImage, sheetFit, type CutKind, type CutResult, type CutSpec,
} from '@/lib/cutout-engine';
import { NAME_FONTS, useCardFonts } from '@/lib/card-engine';
import { svgFileBlob, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { cutoutImage, scaleImage, slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

type Source = 'icon' | 'upload' | 'none';
const COPY: Record<CutKind, { title: string; sub: string; file: string }> = {
  sticker: { title: 'Sticker', sub: 'Sticker cắt theo hình, tem tròn, tem cảm ơn dán hộp — tải file có sẵn đường cắt, xưởng decal in + cắt bế thẳng.', file: 'sticker' },
  keychain: { title: 'Móc khoá', sub: 'Móc khoá mica in hình + tên, tự chừa tai và lỗ xỏ khoen — tải file cắt laser đúng mm gửi xưởng.', file: 'moc-khoa' },
};

export function CutoutStudio({ kind }: { kind: CutKind }) {
  const ready = useCardFonts();
  const presets = CUT_PRESETS.filter((p) => p.kind === kind);
  const first = presets[0];
  const [spec, setSpec] = useState<CutSpec>({ ...defaultCutSpec(kind), ...first.spec });
  const [presetId, setPresetId] = useState(first.id);
  const [source, setSource] = useState<Source>(first.icon ? 'icon' : 'none');
  const [iconId, setIconId] = useState<string>(first.icon || 'red_heart');
  const [upload, setUpload] = useState<string | null>(null);
  const [artPx, setArtPx] = useState<{ w: number; h: number } | null>(null);
  const [res, setRes] = useState<CutResult | null>(null);
  const [resKey, setResKey] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, CutResult>>({});
  const [sheetId, setSheetId] = useState('a4');
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mockRef = useRef<HTMLDivElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const set = (p: Partial<CutSpec>) => setSpec((s) => ({ ...s, ...p }));
  const artSrc = source === 'upload' ? upload : source === 'icon' ? icon3d(iconId) : null;
  const key = JSON.stringify([spec, artSrc]);

  // dựng lại khi đổi gì đó (trễ nhẹ cho gõ chữ mượt)
  useEffect(() => {
    if (!ready) return;
    let on = true;
    const t = setTimeout(async () => {
      const img = artSrc ? await loadImage(artSrc).catch(() => null) : null;
      if (on) { setRes(buildCut(spec, img)); setResKey(key); }
    }, 90);
    return () => { on = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // ảnh mẫu cho lưới "Chọn mẫu"
  useEffect(() => {
    if (!ready) return;
    let on = true;
    (async () => {
      const out: Record<string, CutResult> = {};
      for (const p of presets) {
        const img = p.icon ? await loadImage(icon3d(p.icon)).catch(() => null) : null;
        out[p.id] = buildCut({ ...defaultCutSpec(kind), ...p.spec, sizeMm: 40 }, img);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (on) setThumbs(out);
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, kind]);

  const pickPreset = (id: string) => {
    const p = presets.find((x) => x.id === id)!;
    setPresetId(id);
    setSpec((s) => ({ ...defaultCutSpec(kind), sizeMm: s.sizeMm, ...p.spec }));
    if (p.icon) { setIconId(p.icon); if (source !== 'upload') setSource('icon'); } else if (source !== 'upload') setSource('none');
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  // Đo px thật của ảnh (sau khi scale) để cảnh báo DPI thấp so với khổ in.
  const measureArt = async (url: string) => { try { const im = await loadImage(url); setArtPx({ w: im.naturalWidth, h: im.naturalHeight }); } catch { setArtPx(null); } };
  const onUpload = (f?: File | null) => f && run('up', async () => { const url = await scaleImage(f, 1400); setUpload(url); setSource('upload'); await measureArt(url); });
  const removeBg = () => upload && run('bg', async () => { const url = await cutoutImage(upload); setUpload(url); await measureArt(url); });

  const slug = slugify(`${COPY[kind].file}-${spec.text.split('\n')[0] || presetId}`, COPY[kind].file);
  const sizeTag = res ? `${res.trimW}x${res.trimH}mm` : '';
  const sheet = SHEETS.find((s) => s.id === sheetId) || SHEETS[0];
  const fit = res ? sheetFit(res, sheet) : null;
  // Cảnh báo DPI: px cạnh dài của ảnh / khổ thành phẩm. < 200dpi → in dễ mờ.
  const longMm = res ? Math.max(res.trimW, res.trimH) : spec.sizeMm;
  const effDpi = source === 'upload' && artPx ? Math.round(Math.max(artPx.w, artPx.h) / (longMm / 25.4)) : null;
  const lowRes = effDpi != null && effDpi < 200;
  const needPx = Math.ceil((longMm / 25.4) * 300);
  const downloadPng = () => run('png', async () => {
    const el = mockRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgToPng(el, undefined, 1400), `${slug}.png`);
  });
  const downloadCut = () => run('cut', async () => {
    const el = cutRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgFileBlob(el), `${slug}-${sizeTag}-file-cat.svg`);
  });
  const downloadSheet = () => run('sheet', async () => {
    const el = sheetRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgFileBlob(el), `${slug}-${sheet.id}-${fit?.n || 0}con.svg`);
  });

  const makeFiles = async () => {
    const cutEl = cutRef.current?.querySelector('svg'), pvEl = mockRef.current?.querySelector('svg');
    if (!cutEl || !pvEl) throw new Error('Chưa dựng xong, thử lại nhé.');
    const [file, preview] = await Promise.all([svgFileBlob(cutEl), svgToJpeg(pvEl, undefined, 900)]);
    return { file, fileName: `${slug}-${sizeTag}-file-cat.svg`, preview };
  };
  const orderTitle = `${COPY[kind].title} ${res ? `${res.trimW}×${res.trimH}mm` : ''} · ${CUT_SHAPES.find((s) => s.id === spec.shape)?.name}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const dots = (list: string[], cur: string, onPick: (c: string) => void, testId?: string) => (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {list.map((c) => (
        <button key={c || 'none'} type="button" onClick={() => onPick(c)} aria-label={c || 'không'} title={c || 'Không viền'}
          className={`w-8 h-8 rounded-full border-2 transition-transform grid place-items-center text-[10px] text-slate-400 ${cur === c ? 'border-mv-accent scale-110' : 'border-mv-hair hover:border-mv-hair-strong'}`}
          style={{ background: c || 'transparent' }}>{c ? '' : '✕'}</button>
      ))}
    </div>
  );
  const sizes = kind === 'keychain' ? KEYCHAIN_SIZES : STICKER_SIZES;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={COPY[kind].title} sub={COPY[kind].sub} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ''; }} data-testid="cut-file" />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${presets.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {presets.map((p) => (
                  <button key={p.id} type="button" onClick={() => pickPreset(p.id)} data-testid="cut-preset"
                    className={`rounded-xl border p-1.5 text-left transition-all ${presetId === p.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                    <div className="aspect-square rounded-lg bg-[#EEF1F6] grid place-items-center overflow-hidden">
                      {thumbs[p.id] ? <CutoutSvg res={thumbs[p.id]} spec={{ ...defaultCutSpec(kind), ...p.spec }} mode="mockup" style={{ width: '92%', height: '92%' }} /> : <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{p.name}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Hình">
              <div className="mv-seg mb-3" role="tablist">
                {([['icon', 'Hình 3D có sẵn'], ['upload', 'Ảnh của anh'], ['none', 'Không hình']] as const).map(([id, name]) => (
                  <button key={id} type="button" onClick={() => (id === 'upload' && !upload ? fileRef.current?.click() : setSource(id))} data-active={source === id} className="mv-seg-btn" data-testid={`cut-src-${id}`}>{name}</button>
                ))}
              </div>
              {source === 'icon' && (
                <div className="grid grid-cols-8 sm:grid-cols-10 xl:grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5" data-testid="cut-icons">
                  {ICONS_3D.map((id) => (
                    <button key={id} type="button" onClick={() => setIconId(id)} title={id}
                      className={`aspect-square rounded-lg border p-1 ${iconId === id ? 'border-mv-accent bg-mv-accent-soft' : 'border-transparent hover:border-mv-hair-strong'}`}>
                      <img src={icon3d(id)} alt="" className="w-full h-full object-contain" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {source === 'upload' && (
                <div className="flex flex-wrap items-center gap-3">
                  {upload && <img src={upload} alt="" className="w-20 h-20 object-contain rounded-lg bg-[#EEF1F6]" />}
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !text-xs">{busy === 'up' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Đổi ảnh</button>
                  {upload && <button type="button" onClick={removeBg} className="mv-btn mv-btn-ghost !text-xs" data-testid="cut-removebg">{busy === 'bg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} Tách nền</button>}
                  <p className="w-full text-[11px] text-slate-500">Ảnh có nền thì bấm <b>Tách nền</b> để sticker cắt sát theo người/vật. Không tách thì cắt theo khung ảnh bo góc.</p>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="3 · Chữ">
              <div className="space-y-3">
                <textarea className="mv-input min-h-[60px]" rows={2} value={spec.text} onChange={(e) => set({ text: e.target.value })} placeholder="Tối đa 3 dòng — để trống nếu chỉ cần hình" data-testid="cut-text" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {NAME_FONTS.map((f) => (
                    <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`}
                      style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: f.script ? 18 : 14 }}>{(spec.text.split('\n')[0] || 'Mivy').slice(0, 12)}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><div className="mv-label mb-1.5">Màu chữ</div>{dots(TEXT_COLORS, spec.textColor, (c) => set({ textColor: c }))}</div>
                  <div><div className="mv-label mb-1.5">Viền chữ</div>{dots(STROKE_COLORS, spec.textStroke, (c) => set({ textStroke: c }))}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_POS.map((p) => <button key={p.id} type="button" onClick={() => set({ textPos: p.id })} className={chip(spec.textPos === p.id)}>{p.name}</button>)}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Kiểu cắt & kích thước">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5" data-testid="cut-shapes">
                  {CUT_SHAPES.map((s) => <button key={s.id} type="button" onClick={() => set({ shape: s.id })} className={chip(spec.shape === s.id)}>{s.name}</button>)}
                </div>
                <div>
                  <div className="mv-label mb-1.5">{kind === 'keychain' ? 'Cạnh dài (kèm tai móc)' : 'Cạnh dài'}</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="cut-sizes">
                    {sizes.map((n) => <button key={n} type="button" onClick={() => set({ sizeMm: n })} className={chip(spec.sizeMm === n)}>{n / 10} cm</button>)}
                  </div>
                </div>
                {spec.shape === 'diecut' && (
                  <label className="block">
                    <span className="mv-label block mb-1.5">Độ dày viền quanh hình · {spec.borderMm} mm</span>
                    <input type="range" min={1.5} max={5} step={0.5} value={spec.borderMm} onChange={(e) => set({ borderMm: Number(e.target.value) })} className="w-full" data-testid="cut-border" />
                  </label>
                )}
                {kind === 'keychain' && (
                  <div>
                    <div className="mv-label mb-1.5">Chất liệu</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => set({ material: 'clear' })} className={chip(spec.material === 'clear')}>Mica trong</button>
                      <button type="button" onClick={() => set({ material: 'white' })} className={chip(spec.material === 'white')}>Mica in nền màu</button>
                    </div>
                  </div>
                )}
                {!(kind === 'keychain' && spec.material === 'clear') && (
                  <div><div className="mv-label mb-1.5">{spec.shape === 'diecut' ? 'Màu viền' : 'Màu nền'}</div>{dots(EDGE_COLORS, spec.edge, (c) => set({ edge: c }), 'cut-edges')}</div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Mockup ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <span className="text-sm font-bold text-mv-fg">Xem trước</span>
            <div ref={mockRef} className="rounded-xl bg-[#EEF1F6] aspect-square grid place-items-center overflow-hidden" data-testid="cut-preview" data-ready={res && resKey === key ? 1 : 0}>
              {res ? <CutoutSvg res={res} spec={spec} mode="mockup" style={{ width: '86%', height: '86%' }} /> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="cut-dims">
              {res && <>Thành phẩm ≈ {res.trimW} × {res.trimH} mm{kind === 'keychain' && ' · lỗ khoen Ø4.4mm'}{spec.shape === 'diecut' && ` · viền ${spec.borderMm}mm`}</>}
            </div>
            {lowRes && (
              <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-2" data-testid="cut-lowres">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Ảnh ~{effDpi}dpi ở khổ này — in ra dễ mờ/rỗ. Nên dùng ảnh cạnh dài ≥ {needPx}px.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={!res} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="cut-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh PNG
              </button>
              <button type="button" onClick={downloadCut} disabled={!res} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="cut-svg">
                {busy === 'cut' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />} File cắt (SVG)
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select className="mv-input !py-2 !text-xs !w-auto" value={sheetId} onChange={(e) => setSheetId(e.target.value)} aria-label="Khổ tờ">
                {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={downloadSheet} disabled={!fit?.n} className="mv-btn mv-btn-ghost flex-1 !flex justify-center !py-2.5 !text-xs" data-testid="cut-sheet">
                {busy === 'sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutGrid className="w-3.5 h-3.5" />} Xếp tờ · {fit?.n || 0} con
              </button>
            </div>
            {res && <PrintRequest product={kind} title={orderTitle} defaultMaterial={kind === 'keychain' ? (spec.material === 'clear' ? 'Mica trong 3mm' : 'Mica trắng 3mm') : undefined}
              design={{ spec, icon: source === 'icon' ? iconId : null, upload: source === 'upload' }} makeFiles={makeFiles} />}
            <p className="text-[11px] leading-relaxed text-slate-500">File cắt đúng mm, 2 lớp: <b>In</b> (hình + nền) và <b>CutContour</b> (đường cắt, spot Magenta chuẩn RIP){kind === 'keychain' ? ' kèm lỗ khoen' : ''}. Xưởng nạp thẳng vào máy in–cắt{kind === 'keychain' ? ' laser mica' : ' decal'}.</p>
          </div>
        </div>
      )}

      {/* bản file cắt + tờ xếp (ẩn) để xuất */}
      {res && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          <div ref={cutRef} data-testid="cut-file-svg"><CutoutSvg res={res} spec={spec} mode="cut" /></div>
          <div ref={sheetRef}><SheetSvg res={res} spec={spec} sheet={sheet} /></div>
        </div>
      )}
    </div>
  );
}
