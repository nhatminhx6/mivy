'use client';
// Thiệp in (cưới, sinh nhật): chọn mẫu → điền nội dung → đổi màu/font/khổ → tải PNG hoặc file in PDF
// (300dpi, lề xén 3mm, vạch cắt) đưa thẳng cho xưởng. Mẫu = bố cục × màu × font, render code 100%.

import { useEffect, useRef, useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import {
  CARD_BLEED_MM, CARD_FIELDS, CARD_FONT_CSS, CARD_KINDS, CARD_LAYOUTS, CARD_SIZES, CARD_TEMPLATES, CardSvg, NAME_FONTS,
  cardSize, defaultCardData, palettesFor, useCardFonts, type CardData, type CardKind, type CardSpec,
} from '@/lib/card-engine';
import { lunarLine } from '@/lib/lunar';
import { svgToJpeg, svgToPng, svgToPrintPdf } from '@/lib/svg-export';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';

const FIRST: Record<CardKind, CardSpec> = {
  wedding: { kind: 'wedding', layout: 'frame', palette: 'ivory', font: 'greatvibes', size: '12x17' },
  birthday: { kind: 'birthday', layout: 'balloons', palette: 'pink', font: 'lobster', size: '10x15' },
};

export default function CardsPage() {
  const ready = useCardFonts();
  const [spec, setSpec] = useState<CardSpec>(FIRST.wedding);
  const [datas, setDatas] = useState<Record<CardKind, CardData>>({ wedding: defaultCardData('wedding'), birthday: defaultCardData('birthday') });
  const [busy, setBusy] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  // ?kind=birthday mở thẳng thiệp sinh nhật
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kind') as CardKind | null;
    if (k && FIRST[k]) setSpec(FIRST[k]);
  }, []);

  const kind = spec.kind;
  const data = datas[kind];
  const set = (p: Partial<CardSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => setDatas((ds) => {
    const d = { ...ds[kind], [key]: v };
    if (key === 'date' && kind === 'wedding') d.lunar = lunarLine(v);
    return { ...ds, [kind]: d };
  });
  const pickKind = (k: CardKind) => setSpec((s) => ({ ...FIRST[k], size: k === s.kind ? s.size : FIRST[k].size }));
  const templates = CARD_TEMPLATES.filter((t) => t.spec.kind === kind);
  const sz = cardSize(spec.size);
  const slug = slugify(kind === 'wedding' ? `thiep-cuoi-${data.groom || ''}-${data.bride || ''}` : `thiep-sinh-nhat-${data.name || ''}`, 'thiep');

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const downloadPng = () => run('png', async () => {
    const el = previewRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgToPng(el, CARD_FONT_CSS, 2000), `${slug}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    const el = printRef.current?.querySelector('svg'); if (!el) return;
    downloadBlob(await svgToPrintPdf(el, CARD_FONT_CSS, sz, CARD_BLEED_MM), `${slug}-${sz.id}cm-file-in.pdf`);
  });

  // file gửi kèm đơn in: PDF in (có lề xén) + ảnh xem trước
  const makeFiles = async () => {
    const pdfEl = printRef.current?.querySelector('svg'), pvEl = previewRef.current?.querySelector('svg');
    if (!pdfEl || !pvEl) throw new Error('Chưa dựng xong thiệp, thử lại nhé.');
    const [file, preview] = await Promise.all([svgToPrintPdf(pdfEl, CARD_FONT_CSS, sz, CARD_BLEED_MM), svgToJpeg(pvEl, CARD_FONT_CSS, 900)]);
    return { file, fileName: `${slug}-${sz.id}cm-file-in.pdf`, preview };
  };
  const orderTitle = `${CARD_KINDS.find((k) => k.id === kind)?.name} ${sz.name} · ${CARD_LAYOUTS.find((l) => l.id === spec.layout)?.name}`;

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thiệp" sub="Thiệp cưới, thiệp sinh nhật — chọn mẫu, điền thông tin, tải file in chuẩn (300dpi, lề xén, vạch cắt) gửi thẳng xưởng in." />

      <div className="mv-seg mb-5 max-w-sm" role="tablist">
        {CARD_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-active={kind === k.id} className="mv-seg-btn flex-1" data-testid="card-kind">{k.name}</button>
        ))}
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${templates.length})`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {templates.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette && spec.font === t.spec.font;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="card-tpl"
                      className={`rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden bg-ink/[0.04] shadow-sm" style={{ aspectRatio: `${sz.wMm} / ${sz.hMm}` }}>
                        <CardSvg spec={{ ...t.spec, size: spec.size }} data={data} style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Nội dung">
              <div className="grid grid-cols-2 gap-3">
                {CARD_FIELDS[kind].map((f) => (
                  <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                    <span className="mv-label block mb-1.5">{f.label}{f.hint && <span className="normal-case font-normal text-slate-500"> · {f.hint}</span>}</span>
                    {f.type === 'multiline' ? (
                      <textarea className="mv-input min-h-[68px]" rows={3} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`card-${f.key}`} />
                    ) : (
                      <input className="mv-input" type={f.type === 'date' || f.type === 'time' ? f.type : 'text'} value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`card-${f.key}`} />
                    )}
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Màu, font & khổ">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="card-palettes">
                    {palettesFor(kind).map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ palette: p.id })} className={`flex items-center gap-2 ${chip(spec.palette === p.id)}`}>
                        <span className="relative w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: p.bg }}>
                          <span className="absolute inset-[5px] rounded-full" style={{ background: p.accent }} />
                        </span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" data-testid="card-fonts">
                    {NAME_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`}
                        style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontSize: f.script ? 18 : 14 }}>
                        {kind === 'wedding' ? (data.bride || 'Thu Hà') : (data.name || 'Bảo Anh')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ thiệp</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_SIZES.map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)} data-testid="card-size">{s.name}</button>)}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <span className="text-sm font-bold text-mv-fg">Xem trước</span>
            <div ref={previewRef} className="mx-auto rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ maxWidth: Math.round(380 * Math.min(1, sz.wMm / sz.hMm) * 1.2) }} data-testid="card-preview">
              <CardSvg spec={spec} data={data} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · in 300dpi · lề xén {CARD_BLEED_MM}mm mỗi cạnh</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="card-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="card-pdf">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} File in PDF
              </button>
            </div>
            <PrintRequest product="card" title={orderTitle} design={{ spec, data }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">Tự in: tải file in đúng khổ thật, nền tràn ra lề xén và có vạch cắt 4 góc — xưởng in thẳng. Hoặc gửi yêu cầu, Mivy in + giao tận nơi (TP.HCM).</p>
          </div>
        </div>
      )}

      {/* bản có lề xén (ẩn) để xuất PDF */}
      {ready && (
        <div ref={printRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <CardSvg spec={spec} data={data} bleed style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
