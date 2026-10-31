'use client';
// Bảng hiệu cắt CNC/laser: chọn mẫu → điền chữ → chọn chất liệu → xem mockup trên tường → tải file cắt SVG (đúng mm) gửi xưởng.

import { useRef, useState } from 'react';
import { AlertTriangle, Download, FileCode2, Loader2 } from 'lucide-react';
import { ICON_CATS, LOGO_ICONS } from '@/lib/logo-icons';
import {
  CHALK_COLORS, FACE_COLORS, FONT_GROUPS, HALO_COLORS, INK_COLORS, MATERIALS, NEON_COLORS, PRINT_PALETTES, SIGN_FONTS, SIGN_KINDS, SIGN_TEMPLATES, SignSvg, WALLS,
  signFont, signFontCss, tplById, useSignFonts, type SignData, type SignField, type SignKind, type SignSpec,
} from '@/lib/signage-engine';
import { drawWatermark } from '@/lib/design-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';

const FIELD_LABEL: Record<Exclude<SignField, 'icon'>, { label: string; ph: string }> = {
  name: { label: 'Tên chính', ph: 'VD: Hoa Ngọc Lan' },
  sub: { label: 'Dòng phụ', ph: 'VD: Villa · C65 / www.shop.vn' },
  number: { label: 'Số nhà', ph: 'VD: 11' },
  street: { label: 'Tên đường', ph: 'VD: Nguyễn Biểu' },
};
const ICON_PICK_CATS = ['nature', 'home', 'shop', 'food', 'pet', 'symbol'];

export default function SignagePage() {
  const ready = useSignFonts();
  const [data, setData] = useState<SignData>({ name: 'Hoa Ngọc Lan', sub: 'Villa · C65', number: '11', street: 'Nguyễn Biểu', icon: 'flower' });
  const [spec, setSpec] = useState<SignSpec>({ tpl: 'villa', w: 900, h: 400, fontId: 'greatvibes', material: 'corten', style: 'cut', letter: 'gold', wall: 'concrete', kind: 'cnc', halo: true });
  const [busy, setBusy] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);

  const t = tplById(spec.tpl);
  const font = signFont(spec.fontId);
  const set = (p: Partial<SignSpec>) => setSpec((s) => ({ ...s, ...p }));
  const pickTpl = (id: string) => { const n = tplById(id); set({ tpl: id, w: n.w, h: n.h, fontId: n.font }); };
  const kind = spec.kind || 'cnc';
  const KIND_DEFAULTS: Record<SignKind, Partial<SignSpec>> = {
    cnc: { wall: 'concrete' },
    neon: { color: NEON_COLORS[0], wall: 'dark' },
    lightbox: { color: FACE_COLORS[0], ink: INK_COLORS[0], wall: 'concrete' },
    channel: { color: HALO_COLORS[0], material: 'black', letter: 'gold', halo: true, wall: 'concrete' },
    engrave: { material: 'wood', wall: 'white' },
    chalk: { color: CHALK_COLORS[0], wall: 'brick' },
    print: { color: PRINT_PALETTES[0].face, ink: PRINT_PALETTES[0].ink, accent: PRINT_PALETTES[0].accent, wall: 'concrete' },
  };
  const pickKind = (k: SignKind) => set({ kind: k, ...KIND_DEFAULTS[k] });
  const dots = (list: string[], cur: string | undefined, key: 'color' | 'ink') => (
    <div className="flex flex-wrap gap-2">
      {list.map((c) => <button key={c} type="button" onClick={() => set({ [key]: c })} aria-label={c}
        className={`w-8 h-8 rounded-full border-2 transition-transform ${cur === c ? 'border-white scale-110' : 'border-white/15 hover:border-white/40'}`} style={{ background: c }} />)}
    </div>
  );
  const slug = slugify(data.name || data.street || 'bang-hieu', 'bang-hieu');
  // chữ có lòng kín (O, A, Đ…) cắt thủng sẽ rơi lõi nếu không dùng font stencil
  const counterWarn = kind === 'cnc' && spec.style === 'cut' && font.group !== 'stencil' && font.group !== 'script';

  const svgWithFonts = async (el: SVGSVGElement | null | undefined) => {
    if (!el) throw new Error('chưa có bảng');
    const svg = el.cloneNode(true) as SVGSVGElement;
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = await embedFontCss(signFontCss([spec.fontId]));
    svg.insertBefore(st, svg.firstChild);
    return svg;
  };
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };
  const downloadPng = () => run('png', async () => {
    const svg = await svgWithFonts(previewRef.current?.querySelector('svg'));
    const vb = svg.viewBox.baseVal; const outW = 2000, outH = Math.round((outW * vb.height) / vb.width);
    svg.setAttribute('width', String(outW)); svg.setAttribute('height', String(outH));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    try {
      const im = new Image(); im.src = url; await im.decode();
      const c = document.createElement('canvas'); c.width = outW; c.height = outH;
      c.getContext('2d')!.drawImage(im, 0, 0, outW, outH);
      drawWatermark(c);
      const b = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
      if (b) downloadBlob(b, `${slug}-mockup.png`);
    } finally { URL.revokeObjectURL(url); }
  });
  const downloadCut = () => run('svg', async () => {
    const svg = await svgWithFonts(cutRef.current?.querySelector('svg'));
    downloadBlob(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), `${slug}-file-cat-${spec.w / 10}x${spec.h / 10}cm.svg`);
  });

  const swatch = (on: boolean) => `flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-white/10 text-slate-300 hover:border-white/30'}`;
  const matChip = (m: (typeof MATERIALS)[number]) => (
    <span className="w-5 h-5 rounded-md shrink-0 border border-black/20" style={{ background: m.grad ? `linear-gradient(135deg, ${m.grad.join(',')})` : m.base }} />
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng hiệu" sub="Cắt CNC, đèn neon, hộp đèn, chữ nổi LED, khắc laser, bảng phấn, in màu. Xem mockup trên tường → tải file vector đúng kích thước gửi xưởng." />

      {!ready ? (
        <div className="h-60 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title="1 · Loại bảng hiệu">
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
                {SIGN_KINDS.map((k) => (
                  <button key={k.id} type="button" onClick={() => pickKind(k.id)} data-testid="sign-kind"
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${kind === k.id ? 'border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <div className="text-xs font-bold text-white">{k.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{k.desc}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="2 · Chọn mẫu">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {SIGN_TEMPLATES.map((x) => (
                  <button key={x.id} type="button" onClick={() => pickTpl(x.id)} data-testid="sign-tpl"
                    className={`rounded-xl border p-1.5 text-left transition-all ${spec.tpl === x.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-white/10 hover:border-white/30'}`}>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/20 flex items-center justify-center">
                      <SignSvg spec={{ ...spec, tpl: x.id, w: x.w, h: x.h, fontId: x.font }} data={data} aspect={4 / 3} style={{ width: '100%', height: '100%', display: 'block' }} />
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1.5 px-0.5">{x.name}</div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="3 · Nội dung">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {t.fields.filter((f): f is Exclude<SignField, 'icon'> => f !== 'icon').map((f) => (
                  <label key={f} className="block"><span className="mv-label block mb-1.5">{FIELD_LABEL[f].label}</span>
                    <input className="mv-input" value={data[f]} onChange={(e) => setData((d) => ({ ...d, [f]: e.target.value }))} placeholder={FIELD_LABEL[f].ph} data-testid={`sign-${f}`} /></label>
                ))}
              </div>
              {t.fields.includes('icon') && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="mv-label">Hoạ tiết cắt</span>
                    <button type="button" onClick={() => setData((d) => ({ ...d, icon: 'none' }))} className={`text-[11px] px-2 py-0.5 rounded-full border ${data.icon === 'none' ? 'border-white text-white' : 'border-white/15 text-slate-400'}`}>Không hoạ tiết</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
                    {ICON_CATS.filter((c) => ICON_PICK_CATS.includes(c.id)).map((cat) => (
                      <div key={cat.id}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{cat.name}</div>
                        <div className="grid grid-cols-10 sm:grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                          {LOGO_ICONS.filter((ic) => ic.cat === cat.id).map(({ id, Comp }) => (
                            <button key={id} type="button" title={id} onClick={() => setData((d) => ({ ...d, icon: id }))}
                              className={`aspect-square rounded-md flex items-center justify-center border ${data.icon === id ? 'border-indigo-400 bg-indigo-500/20' : 'border-transparent hover:border-white/20'}`}>
                              <Comp size={16} color="#e2e8f0" weight="fill" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="4 · Màu & chất liệu">
              <div className="space-y-4">
                {kind === 'neon' && <div><div className="mv-label mb-1.5">Màu neon</div>{dots(NEON_COLORS, spec.color, 'color')}</div>}
                {kind === 'print' && (
                  <div><div className="mv-label mb-1.5">Phối màu</div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" data-testid="sign-palettes">
                      {PRINT_PALETTES.map((p) => (
                        <button key={p.id} type="button" onClick={() => set({ color: p.face, ink: p.ink, accent: p.accent })} title={p.name}
                          className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-[10px] text-slate-300 ${spec.color === p.face && spec.accent === p.accent ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'}`}>
                          <span className="relative w-6 h-6 rounded shrink-0 border border-white/20 grid place-items-center text-[11px] font-black" style={{ background: p.face, color: p.ink }}>A<span className="absolute bottom-0.5 inset-x-1 h-0.5 rounded" style={{ background: p.accent }} /></span>
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {kind === 'lightbox' && (
                  <>
                    <div><div className="mv-label mb-1.5">Màu mặt hộp đèn</div>{dots(FACE_COLORS, spec.color, 'color')}</div>
                    <div><div className="mv-label mb-1.5">Màu chữ</div>{dots(INK_COLORS, spec.ink, 'ink')}</div>
                  </>
                )}
                {kind === 'chalk' && <div><div className="mv-label mb-1.5">Màu phấn</div>{dots(CHALK_COLORS, spec.color, 'color')}</div>}
                {kind === 'channel' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="mv-label">Đèn hắt sau chữ</span>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={spec.halo !== false} onChange={(e) => set({ halo: e.target.checked })} /> Bật đèn</label>
                    </div>
                    {spec.halo !== false && dots(HALO_COLORS, spec.color, 'color')}
                  </div>
                )}
                {kind === 'cnc' && <div>
                  <div className="mv-label mb-1.5">Kiểu</div>
                  <div className="mv-seg !flex w-full">
                    <button type="button" onClick={() => set({ style: 'cut' })} data-active={spec.style === 'cut'} className="mv-seg-btn flex-1 text-center">Cắt thủng chữ</button>
                    <button type="button" onClick={() => set({ style: 'raised' })} data-active={spec.style === 'raised'} className="mv-seg-btn flex-1 text-center">Chữ nổi gắn lên tấm</button>
                  </div>
                </div>}
                {(kind === 'cnc' || kind === 'channel' || kind === 'engrave') && <div>
                  <div className="mv-label mb-1.5">Tấm nền</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MATERIALS.map((m) => <button key={m.id} type="button" onClick={() => set({ material: m.id })} className={swatch(spec.material === m.id)}>{matChip(m)}{m.name}</button>)}
                  </div>
                </div>}
                {((kind === 'cnc' && spec.style === 'raised') || kind === 'channel') && (
                  <div>
                    <div className="mv-label mb-1.5">Chất liệu chữ</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {MATERIALS.filter((m) => m.id !== 'wood').map((m) => <button key={m.id} type="button" onClick={() => set({ letter: m.id })} className={swatch(spec.letter === m.id)}>{matChip(m)}{m.name}</button>)}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block"><span className="mv-label block mb-1.5">Font chữ</span>
                    <select className="mv-input" value={spec.fontId} onChange={(e) => set({ fontId: e.target.value })} data-testid="sign-font">
                      {FONT_GROUPS.map((g) => (
                        <optgroup key={g.id} label={g.name}>
                          {SIGN_FONTS.filter((f) => f.group === g.id).map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}
                        </optgroup>
                      ))}
                    </select></label>
                  <div><span className="mv-label block mb-1.5">Kích thước thật (cm)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" min={10} max={300} className="mv-input" value={spec.w / 10} onChange={(e) => set({ w: Math.max(100, Math.min(3000, Number(e.target.value) * 10 || 100)) })} aria-label="Rộng (cm)" />
                      <span className="text-slate-500">×</span>
                      <input type="number" min={10} max={300} className="mv-input" value={spec.h / 10} onChange={(e) => set({ h: Math.max(100, Math.min(3000, Number(e.target.value) * 10 || 100)) })} aria-label="Cao (cm)" disabled={t.shape === 'circle'} />
                    </div></div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Mockup ghim + tải */}
          <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white">Xem trước</span>
              <div className="flex gap-1">
                {WALLS.map((w) => (
                  <button key={w.id} type="button" onClick={() => set({ wall: w.id })} title={w.name}
                    className={`text-[10px] px-2 py-1 rounded-full border ${spec.wall === w.id ? 'border-white text-white' : 'border-white/15 text-slate-400'}`}>{w.name}</button>
                ))}
              </div>
            </div>
            <div ref={previewRef} className="rounded-xl overflow-hidden border border-white/10" data-testid="sign-preview">
              <SignSvg spec={t.shape === 'circle' ? { ...spec, h: spec.w } : spec} data={data} aspect={4 / 3} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="text-[11px] text-slate-400">
              {spec.w / 10} × {(t.shape === 'circle' ? spec.w : spec.h) / 10} cm · {MATERIALS.find((m) => m.id === spec.material)?.name} · {kind === 'cnc' ? (spec.style === 'cut' ? 'cắt thủng' : 'chữ nổi') : SIGN_KINDS.find((k) => k.id === kind)?.name} · {font.family}
            </div>
            {counterWarn && (
              <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2 text-[11px] text-amber-100">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Chữ có lòng kín (O, A, D, Đ…) khi cắt thủng sẽ <b>rơi lõi</b>. Nên chọn font nhóm <b>Stencil</b>, hoặc đổi sang kiểu <b>Chữ nổi</b>.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={downloadPng} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs">
                {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Ảnh mockup
              </button>
              <button type="button" onClick={downloadCut} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs" data-testid="sign-cut">
                {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />} {kind === 'cnc' ? 'File cắt CNC (SVG)' : 'File vector (SVG)'}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">File cắt đúng kích thước thật (mm): viền đỏ = đường cắt tấm, phần đen = chữ/hoạ tiết cắt. Gửi file cho xưởng laser/CNC — xưởng chuyển chữ sang outline trước khi cắt.</p>
          </div>
        </div>
      )}

      {/* bản file cắt ẩn (đúng mm) để xuất SVG */}
      {ready && (
        <div ref={cutRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          <SignSvg spec={t.shape === 'circle' ? { ...spec, h: spec.w } : spec} data={data} mode="cut" />
        </div>
      )}
    </div>
  );
}
