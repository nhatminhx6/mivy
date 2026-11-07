'use client';
// Hashtag cầm tay chụp ảnh (20/11, sinh nhật, cưới…): chọn mẫu theo dịp → sửa chữ → màu / kiểu chữ / hình → khổ
// → tải file cắt SVG (lớp In + CutContour) hoặc gửi yêu cầu in formex bế viền.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileCode2, Loader2 } from 'lucide-react';
import { useCardFonts } from '@/lib/card-engine';
import { CutoutSvg, loadImage, type CutResult, type CutSpec } from '@/lib/cutout-engine';
import {
  HT_DECOS, HT_FONTSETS, HT_OCCASIONS, HT_PALETTES, HT_ROLE_LABEL, HT_SIZES, HT_TEMPLATES, buildHashtag, htBorderMm, htDecoUrl, htSpecFrom, htTpl,
  type HtSpec,
} from '@/lib/hashtag-engine';
import { nameFont } from '@/lib/card-engine';
import { svgFileBlob, svgToJpeg, svgToPng } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const BOARD = { kind: 'sticker', material: 'white' } as CutSpec; // CutoutSvg chỉ đọc kind/material
const BG = '#454b54'; // nền đá xám cho bảng trắng nổi lên như ảnh thật

export default function HashtagPage() {
  const ready = useCardFonts();
  const [occ, setOcc] = useState(HT_OCCASIONS[0].id);
  const [spec, setSpec] = useState<HtSpec>(() => htSpecFrom(HT_TEMPLATES[0]));
  const [decos, setDecos] = useState<Record<string, HTMLImageElement>>({});
  const [res, setRes] = useState<CutResult | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, CutResult>>({});
  const [busy, setBusy] = useState('');
  const mockRef = useRef<HTMLDivElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let on = true;
    Promise.all(HT_DECOS.map(async (id) => [id, await loadImage(htDecoUrl(id))] as const)).then((all) => { if (on) setDecos(Object.fromEntries(all)); }).catch(() => null);
    return () => { on = false; };
  }, []);
  const decoReady = Object.keys(decos).length === HT_DECOS.length;
  const tpl = htTpl(spec.tpl);
  const templates = HT_TEMPLATES.filter((t) => t.occasion === occ);

  // bản lớn (file in) — dựng sau 1 nhịp để gõ chữ không giật
  const key = JSON.stringify(spec);
  useEffect(() => {
    if (!ready || !decoReady) return;
    const id = setTimeout(() => setRes(buildHashtag(spec, spec.deco ? decos[spec.deco] : null)), 180);
    return () => clearTimeout(id);
  }, [key, ready, decoReady]); // eslint-disable-line react-hooks/exhaustive-deps
  // ảnh nhỏ các mẫu của dịp đang chọn
  useEffect(() => {
    if (!ready || !decoReady) return;
    const out: Record<string, CutResult> = {};
    for (const t of HT_TEMPLATES.filter((x) => x.occasion === occ)) out[t.id] = buildHashtag(htSpecFrom(t, 300), t.deco ? decos[t.deco] : null, 'thumb');
    setThumbs(out);
  }, [occ, ready, decoReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p: Partial<HtSpec>) => setSpec((s) => ({ ...s, ...p }));
  const pickTpl = (id: string) => setSpec((s) => htSpecFrom(htTpl(id), s.widthMm));
  const setText = (i: number, v: string) => setSpec((s) => ({ ...s, texts: s.texts.map((x, k) => (k === i ? v : x)) }));
  const slug = slugify(`hashtag-${spec.texts.join(' ')}`, 'hashtag').slice(0, 60);
  const sizeTag = res ? `${res.trimW}x${res.trimH}mm` : '';
  const fresh = !!res;

  const run = async (k: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(k);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const downloadPng = () => run('png', async () => {
    const el = mockRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgToPng(el, undefined, 1600), `${slug}.png`);
  });
  const downloadCut = () => run('cut', async () => {
    const el = cutRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgFileBlob(el), `${slug}-${sizeTag}-file-cat.svg`);
  });
  const makeFiles = async () => {
    const cutEl = cutRef.current?.querySelector('svg'), pvEl = mockRef.current?.querySelector('svg');
    if (!cutEl || !pvEl) throw new Error('Chưa dựng xong, thử lại nhé.');
    const [file, preview] = await Promise.all([svgFileBlob(cutEl), svgToJpeg(pvEl, undefined, 900)]);
    return { file, fileName: `${slug}-${sizeTag}-file-cat.svg`, preview };
  };
  const orderTitle = `Hashtag cầm tay ${res ? `${Math.round(res.trimW / 10)}×${Math.round(res.trimH / 10)}cm` : ''} · ${tpl.name}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const fs = HT_FONTSETS.find((f) => f.id === spec.fontSet) || HT_FONTSETS[0];
  const loading = useMemo(() => <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>, []);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Hashtag cầm tay" sub="Bảng chữ bế viền cầm chụp ảnh cho 20/11, sinh nhật, đám cưới, khai trương… Chọn mẫu, sửa chữ, tải file cắt hoặc gửi Mivy in formex giao tận nơi." />

      <div className="mv-seg mb-5 max-w-2xl overflow-x-auto" role="tablist">
        {HT_OCCASIONS.map((o) => (
          <button key={o.id} type="button" onClick={() => { setOcc(o.id); pickTpl(HT_TEMPLATES.find((t) => t.occasion === o.id)!.id); }} data-active={occ === o.id} className="mv-seg-btn flex-1 whitespace-nowrap" data-testid="ht-occ">{o.name}</button>
        ))}
      </div>

      {!ready ? loading : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${templates.length})`}>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
                {templates.map((t) => (
                  <button key={t.id} type="button" onClick={() => pickTpl(t.id)} data-testid="ht-tpl"
                    className={`rounded-xl border p-1.5 text-left transition-all ${spec.tpl === t.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                    <div className="rounded-lg aspect-[4/3] grid place-items-center overflow-hidden" style={{ background: BG }}>
                      {thumbs[t.id] ? <CutoutSvg res={thumbs[t.id]} spec={BOARD} mode="mockup" style={{ width: '90%', height: '90%' }} /> : <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="space-y-3">
                {tpl.lines.map((l, i) => (
                  <label key={`${tpl.id}-${i}`} className="block">
                    <span className="mv-label block mb-1.5">Dòng {i + 1} <span className="normal-case font-normal text-slate-500">· {HT_ROLE_LABEL[l.role]}{l.role === 'bold' ? ', tự viết hoa' : ''}</span></span>
                    <input className="mv-input" value={spec.texts[i] ?? ''} onChange={(e) => setText(i, e.target.value)} placeholder={l.t} maxLength={40} data-testid="ht-text" />
                  </label>
                ))}
                <p className="text-[11px] text-slate-500">Để trống dòng nào thì bỏ dòng đó.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, kiểu chữ & hình">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Màu chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="ht-palettes">
                    {HT_PALETTES.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="flex shrink-0"><span className="w-4 h-4 rounded-full" style={{ background: p.a }} /><span className="w-4 h-4 rounded-full -ml-1.5 ring-2 ring-white" style={{ background: p.b }} /></span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Kiểu chữ</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="ht-fonts">
                    {HT_FONTSETS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ fontSet: f.id })} className={`${chip(spec.fontSet === f.id)} !py-2 flex flex-col items-center gap-0.5`}>
                        <span style={{ fontFamily: `"${nameFont(f.script).family}"`, fontWeight: nameFont(f.script).weight, fontSize: 18, lineHeight: 1.1 }}>Tri ân</span>
                        <span style={{ fontFamily: `"${nameFont(f.bold).family}"`, fontWeight: nameFont(f.bold).weight, fontSize: 11 }}>20/11</span>
                        <span className="text-[10px] text-slate-500">{f.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Đang dùng: {nameFont(fs.script).family} + {nameFont(fs.bold).family}</div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Hình trang trí</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="ht-decos">
                    <button type="button" onClick={() => set({ deco: null })} className={`${chip(spec.deco === null)} !h-11`}>Không</button>
                    {HT_DECOS.map((d) => (
                      <button key={d} type="button" onClick={() => set({ deco: d })} className={`${chip(spec.deco === d)} !p-1.5 !h-11 !w-11 grid place-items-center`} title={d}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={htDecoUrl(d)} alt="" className="w-7 h-7 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Kích thước">
              <div className="flex flex-wrap gap-1.5" data-testid="ht-sizes">
                {HT_SIZES.map((w) => <button key={w} type="button" onClick={() => set({ widthMm: w })} className={chip(spec.widthMm === w)}>{w / 10} cm</button>)}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Tính theo cạnh dài nhất. Cầm tay chụp ảnh thường dùng 40–60 cm; viền trắng tự tính ≈ {Math.round(htBorderMm(spec.widthMm))} mm.</p>
            </CollapsibleSection>
          </div>

          {/* Mockup ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <span className="text-sm font-bold text-mv-fg">Xem trước</span>
            <div ref={mockRef} className="rounded-xl aspect-[4/3] grid place-items-center overflow-hidden" style={{ background: BG }} data-testid="ht-preview" data-ready={fresh ? 1 : 0}>
              {res ? <CutoutSvg res={res} spec={BOARD} mode="mockup" style={{ width: '92%', height: '92%' }} /> : <Loader2 className="w-5 h-5 animate-spin text-slate-300" />}
            </div>
            <div className="text-[11px] text-slate-400 text-center" data-testid="ht-dims">
              {res && <>Thành phẩm ≈ {(res.trimW / 10).toFixed(0)} × {(res.trimH / 10).toFixed(0)} cm · viền trắng {Math.round(htBorderMm(spec.widthMm))} mm</>}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} disabled={!res} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="ht-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh PNG
              </button>
              <button type="button" onClick={downloadCut} disabled={!res} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="ht-svg">
                {busy === 'cut' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />} File cắt (SVG)
              </button>
            </div>
            {res && <PrintRequest product="hashtag" title={orderTitle} design={{ spec }} makeFiles={makeFiles} />}
            <p className="text-[11px] leading-relaxed text-slate-500">File cắt đúng kích thước, 2 lớp: <b>In</b> (chữ + nền trắng tràn lề) và <b>CutContour</b> (đường bế, spot Magenta). Xưởng in UV lên formex rồi cắt CNC theo đường bế.</p>
          </div>
        </div>
      )}

      {res && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          <div ref={cutRef} data-testid="ht-cut-file"><CutoutSvg res={res} spec={BOARD} mode="cut" /></div>
        </div>
      )}
    </div>
  );
}
