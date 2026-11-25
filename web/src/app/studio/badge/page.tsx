'use client';
// Thẻ đeo nhân viên / thẻ sự kiện + dây đeo: chọn mẫu → điền thông tin chung → dán danh sách người (in hàng loạt,
// mỗi người 1 thẻ, ảnh riêng tuỳ chọn) → tải PDF in tất cả thẻ (lề xén + vạch cắt), PDF dây đeo, hoặc gửi yêu cầu in.

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Download, FileDown, ImagePlus, Loader2, Trash2, Users } from 'lucide-react';
import {
  BD_BLEED_MM, BD_FIELDS, BD_FONTS, BD_FONT_CSS, BD_PALETTES, BD_SIZES, BD_TEMPLATES, BadgeSvg, LANYARD_LEN_MM, LanyardSvg,
  bdSize, defaultBDData, lanyardPeriodMm, parsePeople, roleOf, slotOf, useBDFonts, type BDData, type BDKind, type BDSpec, type Person,
} from '@/lib/badge-engine';
import { selfContainedSvg, svgToCanvas, svgToJpeg, svgToSizedPdf, svgsToPrintPdf } from '@/lib/svg-export';
import { drawWatermark } from '@/lib/design-engine';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import { PrintRequest } from '@/components/PrintRequest';
import { Mockup3DView, PreviewTabs, type Mockup3DHandle } from '@/components/Mockup3D';

const FIRST: Record<BDKind, BDSpec> = {
  staff: { kind: 'staff', layout: 'header', palette: 'navy', font: 'bvp', size: 'v54', holder: false, lanyardW: 15 },
  event: { kind: 'event', layout: 'hero', palette: 'navy', font: 'montserrat', size: 'e90', holder: true, lanyardW: 20 },
};
const PLACEHOLDER: Person = { name: 'Họ và tên', title: 'Chức vụ', code: 'NV-0001', role: '' };

// ảnh tải lên: thu nhỏ trên máy (không gửi đi đâu). Logo giữ PNG (nền trong).
async function loadImage(file: File, maxSide: number, png = false): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
    return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export default function BadgePage() {
  const ready = useBDFonts();
  const [spec, setSpec] = useState<BDSpec>(FIRST.staff);
  const [data, setData] = useState<BDData>(defaultBDData('staff'));
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [logo, setLogo] = useState('');
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'3d' | 'flat'>('3d');
  const frontRef = useRef<HTMLDivElement | null>(null);
  const texFrontRef = useRef<HTMLDivElement | null>(null);
  const texBackRef = useRef<HTMLDivElement | null>(null);
  const texLanyardRef = useRef<HTMLDivElement | null>(null);
  const printCardsRef = useRef<HTMLDivElement | null>(null);
  const printBackRef = useRef<HTMLDivElement | null>(null);
  const printLanyardRef = useRef<HTMLDivElement | null>(null);
  const view3d = useRef<Mockup3DHandle | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const photoFor = useRef(0);

  const sz = bdSize(spec.size);
  const parsed = useMemo(() => parsePeople(data.people || ''), [data.people]);
  const people = parsed.length ? parsed : [PLACEHOLDER];
  const cur = Math.min(sel, people.length - 1);
  const person = people[cur];
  const set = (p: Partial<BDSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setField = (key: string, v: string) => { setDirty(true); setData((d) => ({ ...d, [key]: v })); };
  const setKind = (k: BDKind) => {
    if (k === spec.kind) return;
    setSpec(FIRST[k]);
    setPhotos({}); setSel(0);
    // đổi loại: giữ thông tin doanh nghiệp khách đã nhập, nạp danh sách + nội dung mẫu đúng loại
    setData((d) => (dirty ? { ...defaultBDData(k), company: d.company, phone: d.phone, website: d.website, address: d.address } : defaultBDData(k)));
  };
  const slug = slugify(`the-${spec.kind === 'event' ? 'su-kien' : 'nhan-vien'}-${data.company || ''}`, 'the-deo');
  const svgOf = (r: RefObject<HTMLDivElement | null>) => r.current?.querySelector('svg') as SVGSVGElement | null;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { alert('Lỗi tạo file: ' + ((e as Error)?.message || e)); } finally { setBusy(''); }
  };
  const cardsPdf = async () => {
    const fronts = Array.from(printCardsRef.current?.querySelectorAll(':scope > div > svg') || []) as SVGSVGElement[];
    const back = svgOf(printBackRef);
    if (!fronts.length || !back) throw new Error('Chưa dựng xong thẻ, thử lại nhé.');
    return svgsToPrintPdf([...fronts, back], BD_FONT_CSS, sz, BD_BLEED_MM);
  };
  // PNG: chữ outline trước khi vẽ (SVG-qua-ảnh hay vỡ dấu kép tiếng Việt) + watermark bản free
  const downloadPng = () => run('png', async () => {
    const el = svgOf(texFrontRef); if (!el) return;
    const vb = el.viewBox.baseVal, w = 1600, h = Math.round((w * vb.height) / vb.width);
    const c = await svgToCanvas(await selfContainedSvg(el, BD_FONT_CSS, { outline: true }), w, h, '#FFFFFF');
    drawWatermark(c);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
    downloadBlob(blob, `${slug}-${slugify(person.name, 'the')}.png`);
  });
  const downloadPdf = () => run('pdf', async () => {
    downloadBlob(await cardsPdf(), `${slug}-${sz.id}-${people.length}the-file-in.pdf`);
  });
  const downloadLanyard = () => run('lanyard', async () => {
    const el = svgOf(printLanyardRef); if (!el) return;
    downloadBlob(await svgToSizedPdf(el, BD_FONT_CSS, LANYARD_LEN_MM, spec.lanyardW, 200), `${slug}-day-deo-${spec.lanyardW}mm.pdf`);
  });
  const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/jpeg', 0.86));
  const makeFiles = async () => {
    const pv = svgOf(frontRef);
    const [file, preview] = await Promise.all([
      cardsPdf(),
      view3d.current && tab === '3d'
        ? view3d.current.snapshot(1200, 900).then(toBlob).catch(() => svgToJpeg(pv!, BD_FONT_CSS, 900))
        : svgToJpeg(pv!, BD_FONT_CSS, 900),
    ]);
    return { file, fileName: `${slug}-${sz.id}-${people.length}the-file-in.pdf`, preview };
  };

  const slot = slotOf(sz);
  const period = lanyardPeriodMm(spec, data);
  const build3d = () => import('@/lib/badge-3d').then((m) => m.badgeBuilder({
    front: svgOf(texFrontRef), back: svgOf(texBackRef), lanyard: svgOf(texLanyardRef),
    wMm: sz.wMm, hMm: sz.hMm, event: sz.kind === 'event', holder: spec.holder, lanyardW: spec.lanyardW, periodMm: period, fontCss: BD_FONT_CSS,
    slot: { x: slot.x / 10, y: slot.y / 10, w: slot.w / 10, h: slot.h / 10 },
    ribbon: BD_PALETTES.find((x) => x.id === spec.palette)?.id === 'dark' ? '#121418' : (BD_PALETTES.find((x) => x.id === spec.palette)?.accent || '#1F3A68'),
  }));
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as { __badgeSnap?: (w: number, h: number) => Promise<string> }).__badgeSnap = async (w, h) => { const [core, b] = await Promise.all([import('@/lib/mockup3d'), build3d()]); return (await core.snapshot(b, w, h)).toDataURL('image/png'); }; // QC: chụp đúng góc mặc định

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { setLogo(await loadImage(f, 900, true)); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const i = photoFor.current;
    try { const u = await loadImage(f, 900); setPhotos((p) => ({ ...p, [i]: u })); setSel(i); } catch { alert('Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé.'); }
  };
  const pickPhoto = (i: number) => { photoFor.current = i; photoInput.current?.click(); };

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:border-mv-hair-strong'}`;
  const tpls = BD_TEMPLATES.filter((t) => t.kind === spec.kind);
  const fields = BD_FIELDS.filter((f) => f.kinds.includes(spec.kind));
  const ratio = `${sz.wMm} / ${sz.hMm}`;
  const kindName = spec.kind === 'event' ? 'Thẻ sự kiện' : 'Thẻ nhân viên';
  const orderTitle = `${kindName} ${sz.name} · ${people.length} thẻ${spec.holder ? ' + bao đựng' : ''} + dây đeo ${spec.lanyardW}mm`;
  const listHelp = spec.kind === 'event' ? 'Mỗi dòng: Họ tên | Đơn vị / chức danh | Vai trò (Khách mời, BTC, Diễn giả, VIP, TNV, Báo chí)' : 'Mỗi dòng: Họ tên | Chức vụ | Mã nhân viên';
  const thumbW = sz.wMm > sz.hMm ? 'col-span-2' : '';

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Thẻ đeo nhân viên · sự kiện" sub="Thẻ nhựa PVC, thẻ sự kiện kèm dây đeo in logo — dán danh sách là ra đủ thẻ cho cả công ty. Tải file in chuẩn (lề xén, vạch cắt) hoặc đặt Mivy in + giao." />

      <div className="mv-seg mb-5 inline-flex" role="tablist">
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'staff'} onClick={() => setKind('staff')} data-testid="bd-kind-staff">Thẻ nhân viên</button>
        <button type="button" className="mv-seg-btn" data-active={spec.kind === 'event'} onClick={() => setKind('event')} data-testid="bd-kind-event">Thẻ sự kiện</button>
      </div>

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title={`1 · Chọn mẫu (${tpls.length})`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {tpls.map((t) => {
                  const on = spec.layout === t.spec.layout && spec.palette === t.spec.palette;
                  return (
                    <button key={t.id} type="button" onClick={() => set(t.spec)} data-testid="bd-tpl"
                      className={`${thumbW} rounded-xl border p-1.5 text-left transition-all ${on ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-mv-hair hover:border-mv-hair-strong'}`}>
                      <div className="rounded-lg overflow-hidden shadow-sm" style={{ aspectRatio: ratio }}>
                        <BadgeSvg spec={{ ...spec, ...t.spec }} data={data} person={person} photo={photos[cur]} logo={logo} showSlot style={{ width: '100%', height: '100%', display: 'block' }} />
                      </div>
                      <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5 truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Thông tin chung">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-mv-hair flex items-center justify-center overflow-hidden bg-white shrink-0">
                    {logo ? <img src={logo} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => logoInput.current?.click()} className="mv-btn mv-btn-ghost !py-1.5 !text-xs" data-testid="bd-logo-btn"><ImagePlus className="w-3.5 h-3.5" /> {logo ? 'Đổi logo' : 'Tải logo (PNG nền trong)'}</button>
                    {logo && <button type="button" onClick={() => setLogo('')} className="mv-btn mv-btn-ghost !py-1.5 !text-xs"><Trash2 className="w-3.5 h-3.5" /> Bỏ logo</button>}
                  </div>
                  <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="bd-logo" />
                </div>
                <p className="text-[11px] text-slate-500 -mt-1">Chưa có logo thì Mivy dựng chữ cái đầu tên công ty làm logo.</p>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <label key={f.key} className={`block ${f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <span className="mv-label block mb-1.5">{f.label}</span>
                      {f.multiline
                        ? <textarea className="mv-input min-h-[78px]" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`bd-${f.key}`} />
                        : <input className="mv-input" value={data[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.ph} data-testid={`bd-${f.key}`} />}
                    </label>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`3 · Danh sách in (${parsed.length} người)`}>
              <div className="space-y-3">
                <label className="block">
                  <span className="mv-label block mb-1.5">{listHelp}</span>
                  <textarea className="mv-input min-h-[120px] font-mono !text-xs" value={data.people || ''} onChange={(e) => setField('people', e.target.value)} data-testid="bd-people" />
                </label>
                <p className="text-[11px] text-slate-500">Dán thẳng từ Excel/Google Sheet (đổi cột sang dấu |). Mỗi người ra 1 thẻ; ảnh thẻ tuỳ chọn — chưa có ảnh thì dùng chữ cái đầu.</p>
                <div className="max-h-72 overflow-auto rounded-lg border border-mv-hair divide-y divide-mv-hair">
                  {parsed.map((pp, i) => {
                    const r = roleOf(pp.role);
                    return (
                      <div key={i} className={`flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer ${i === cur ? 'bg-indigo-500/10' : 'hover:bg-ink/[0.03]'}`} onClick={() => setSel(i)} data-testid="bd-person">
                        <button type="button" onClick={(e) => { e.stopPropagation(); pickPhoto(i); }} title="Thêm ảnh thẻ"
                          className="w-8 h-8 rounded-full overflow-hidden border border-mv-hair flex items-center justify-center bg-white shrink-0" data-testid="bd-person-photo">
                          {photos[i] ? <img src={photos[i]} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-mv-fg truncate">{pp.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{pp.title}{spec.kind === 'staff' && pp.code ? ` · ${pp.code}` : ''}</div>
                        </div>
                        {spec.kind === 'event' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: r.color, color: r.ink }}>{r.label}</span>}
                        {photos[i] && <button type="button" onClick={(e) => { e.stopPropagation(); setPhotos((p) => { const n = { ...p }; delete n[i]; return n; }); }} className="text-slate-400 hover:text-red-500" title="Bỏ ảnh"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    );
                  })}
                  {!parsed.length && <div className="px-3 py-4 text-xs text-slate-400">Chưa có ai trong danh sách.</div>}
                </div>
                <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="bd-photo" />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu, font, khổ & dây đeo">
              <div className="space-y-4">
                <div>
                  <div className="mv-label mb-1.5">Bảng màu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="bd-palettes">
                    {BD_PALETTES.map((pl) => (
                      <button key={pl.id} type="button" onClick={() => set({ palette: pl.id })} className={`flex items-center gap-2 ${chip(spec.palette === pl.id)}`}>
                        <span className="w-6 h-6 rounded-full shrink-0 border border-mv-hair" style={{ background: `linear-gradient(135deg, ${pl.accent} 55%, ${pl.accent2} 55%)` }} />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Font tên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="bd-fonts">
                    {BD_FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => set({ font: f.id })} className={`${chip(spec.font === f.id)} !py-2 truncate`} style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>{person.name.split(' ').slice(-2).join(' ')}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mv-label mb-1.5">Khổ thẻ</div>
                  <div className="flex flex-wrap gap-1.5" data-testid="bd-sizes">
                    {BD_SIZES.filter((s) => s.kind === spec.kind).map((s) => <button key={s.id} type="button" onClick={() => set({ size: s.id })} className={chip(spec.size === s.id)}>{s.name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mv-label mb-1.5">Bao đựng thẻ</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="bd-holder">
                      <button type="button" onClick={() => set({ holder: true })} className={chip(spec.holder)}>Bao nhựa trong</button>
                      <button type="button" onClick={() => set({ holder: false })} className={chip(!spec.holder)}>Không bao</button>
                    </div>
                  </div>
                  <div>
                    <div className="mv-label mb-1.5">Bản dây đeo</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="bd-lanyard-w">
                      {([15, 20] as const).map((w) => <button key={w} type="button" onClick={() => set({ lanyardW: w })} className={chip(spec.lanyardW === w)}>{w} mm</button>)}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Xem trước ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-mv-fg truncate">Xem trước · {person.name}</span>
              <PreviewTabs value={tab} onChange={setTab} />
            </div>
            {tab === '3d' && (
              <Mockup3DView ref={view3d} build={build3d} rebuildKey={JSON.stringify([spec, data, cur, photos[cur]?.length || 0, logo.length])} refitKey={`${spec.size}|${spec.holder}|${spec.lanyardW}`} debounce={450} className="rounded-lg aspect-[4/3] w-full" />
            )}
            <div className={`space-y-2 ${tab === '3d' ? 'hidden' : ''}`}>
              <div className={`grid ${sz.wMm > sz.hMm ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt trước</div>
                  <div ref={frontRef} className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="bd-front">
                    <BadgeSvg spec={spec} data={data} person={person} photo={photos[cur]} logo={logo} showSlot style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Mặt sau (chung)</div>
                  <div className="rounded-lg overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" style={{ aspectRatio: ratio }} data-testid="bd-back">
                    <BadgeSvg spec={spec} data={data} person={person} side="back" logo={logo} showSlot style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Dây đeo {spec.lanyardW}mm (đoạn 300mm, in lặp suốt {LANYARD_LEN_MM}mm)</div>
                <div className="rounded overflow-hidden" data-testid="bd-lanyard">
                  <LanyardSvg spec={spec} data={data} logo={logo} lenMm={300} style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Tất cả {people.length} thẻ</div>
                <div className={`grid ${sz.wMm > sz.hMm ? 'grid-cols-3' : 'grid-cols-5'} gap-1.5 max-h-64 overflow-auto pr-1`} data-testid="bd-all">
                  {people.map((pp, i) => (
                    <button key={i} type="button" onClick={() => setSel(i)} className={`rounded overflow-hidden ${i === cur ? 'ring-2 ring-indigo-400' : ''}`} style={{ aspectRatio: ratio }} data-testid="bd-card">
                      <BadgeSvg spec={spec} data={data} person={pp} photo={photos[i]} logo={logo} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">{sz.name} · {people.length} thẻ · lề xén {BD_BLEED_MM}mm · vạch cắt · mặt sau dùng chung</div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bd-png">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG
              </button>
              <button type="button" onClick={downloadPdf} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="bd-pdf" title="Mỗi người 1 trang + 1 trang mặt sau, lề xén + vạch cắt">
                {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF thẻ
              </button>
              <button type="button" onClick={downloadLanyard} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs" data-testid="bd-lanyard-pdf" title={`Dải in dây đeo ${LANYARD_LEN_MM}×${spec.lanyardW}mm`}>
                {busy === 'lanyard' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF dây
              </button>
            </div>
            <PrintRequest product="badge" title={orderTitle} defaultMaterial={spec.kind === 'event' ? 'Thẻ sự kiện giấy C300 + dây' : 'Thẻ nhựa PVC + dây đeo in logo'} design={{ spec, data, hasLogo: !!logo, photos: Object.keys(photos).length }} makeFiles={makeFiles} />
            <p className="text-[11px] leading-relaxed text-slate-500">PDF thẻ: mỗi người 1 trang đúng khổ + lề xén, trang cuối là mặt sau dùng chung. PDF dây: dải {LANYARD_LEN_MM}mm in lặp logo, gửi xưởng in dây.</p>
          </div>
        </div>
      )}

      {/* bản ẩn: texture 3D (không lề, không lỗ) + file in (lề xén) */}
      {ready && (
        <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 600, pointerEvents: 'none' }}>
          <div ref={texFrontRef}><BadgeSvg spec={spec} data={data} person={person} photo={photos[cur]} logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texBackRef}><BadgeSvg spec={spec} data={data} person={person} side="back" logo={logo} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={texLanyardRef}><LanyardSvg spec={spec} data={data} logo={logo} lenMm={period * 2} style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printCardsRef} data-testid="bd-print-cards">
            {people.map((pp, i) => <div key={i}><BadgeSvg spec={spec} data={data} person={pp} photo={photos[i]} logo={logo} bleed style={{ width: '100%', display: 'block' }} /></div>)}
          </div>
          <div ref={printBackRef}><BadgeSvg spec={spec} data={data} person={person} side="back" logo={logo} bleed style={{ width: '100%', display: 'block' }} /></div>
          <div ref={printLanyardRef}><LanyardSvg spec={spec} data={data} logo={logo} lenMm={LANYARD_LEN_MM} style={{ width: '100%', display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
