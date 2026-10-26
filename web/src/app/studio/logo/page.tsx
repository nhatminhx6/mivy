'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Loader2, Package, Save, Shuffle } from 'lucide-react';
import { BrandKit } from '@/types';
import { DEFAULT_BRAND, contactLine, loadBrand, saveBrand } from '@/lib/brand-presets';
import { LogoMockups } from '@/components/LogoMockups';
import { ICON_CATS, LOGO_ICONS } from '@/lib/logo-icons';
import { LOGO_ART, LOGO_ART_CATS, artUrl, useLogoArt } from '@/lib/logo-art';
import {
  ACCENTS, Gu, LOGO_FONTS, LOGO_GUS, LOGO_INDUSTRIES, LOGO_KINDS, LOGO_PALETTES, LogoSpec, LogoSvg, SHAPES,
  ICON_BGS, LOGO_GROUPS, LogoIconSvg, fontById, type IconBg, generateIllusLogos, generateLogos, logoFontCss, useLogoFonts, usesIcon, usesShape,
} from '@/lib/logo-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { buildIconPack } from '@/lib/icon-pack';
import { slugify } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';

type Variant = 'color' | 'black' | 'white' | 'avatar' | 'icon-full' | 'icon-fg';
const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`;

export default function LogoMakerPage() {
  const ready = useLogoFonts();
  useLogoArt(); // nạp sẵn hình minh hoạ (data URL) để xuất PNG/SVG tự chứa ảnh
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [industry, setIndustry] = useState('retail');
  const [gus, setGus] = useState<Gu[]>([]);
  const [seed, setSeed] = useState(1);
  const [sel, setSel] = useState<LogoSpec | null>(null);
  const [previewBg, setPreviewBg] = useState<'light' | 'dark' | 'none'>('light');
  const [syncColors, setSyncColors] = useState(true);
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState(false);
  const [iconBg, setIconBg] = useState<IconBg>('brand');
  const [plats, setPlats] = useState({ web: true, android: true, ios: true });
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrand(b); setName(b.name || ''); setSlogan(b.slogan || ''); }
  }, []);

  const logos = useMemo(() => [...generateIllusLogos({ gus, industry, seed }), ...generateLogos({ gus, industry, seed })], [gus, industry, seed]);
  const cur = sel || logos[0];
  const groups = LOGO_GROUPS.map((g) => ({ ...g, items: logos.filter((l) => g.kinds.includes(l.kind)) })).filter((g) => g.items.length);
  const upd = (patch: Partial<LogoSpec>) => setSel({ ...cur, ...patch });
  const shopName = name.trim() || 'Tên shop';
  const hasBrandColors = brand.colorAccent !== DEFAULT_BRAND.colorAccent || brand.colorPrimary !== DEFAULT_BRAND.colorPrimary;
  const palettes = hasBrandColors
    ? [{ name: 'Thương hiệu', colorPrimary: brand.colorPrimary, colorSecondary: brand.colorSecondary, colorAccent: brand.colorAccent, colorInk: brand.colorInk, colorSurface: brand.colorSurface }, ...LOGO_PALETTES]
    : LOGO_PALETTES;
  const toggleGu = (g: Gu) => setGus((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]));

  // ---------- xuất ----------
  const node = (v: Variant) => exportRef.current?.querySelector(`[data-x="${v}"]`) as HTMLElement | null;
  const pngBlob = async (v: Variant, targetW: number): Promise<Blob> => {
    const el = node(v);
    const svg = el?.querySelector('svg');
    if (!el || !svg) throw new Error('Không tìm thấy logo');
    const w = svg.viewBox.baseVal.width, h = svg.viewBox.baseVal.height;
    const css = await embedFontCss(logoFontCss([cur.fontId]));
    const { toBlob } = await import('html-to-image');
    const b = await toBlob(el, { width: w, height: h, pixelRatio: targetW / w, fontEmbedCSS: css, cacheBust: false });
    if (!b) throw new Error('Xuất rỗng');
    return b;
  };
  const slug = slugify(shopName, 'logo');
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };
  const downloadPng = (v: Variant, w: number, suffix: string) => run(v, async () => downloadBlob(await pngBlob(v, w), `${slug}-${suffix}.png`));
  const downloadSvg = () => run('svg', async () => {
    const svg = node('color')?.querySelector('svg')?.cloneNode(true) as SVGSVGElement | undefined;
    if (!svg) return;
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = await embedFontCss(logoFontCss([cur.fontId]));
    svg.insertBefore(st, svg.firstChild);
    downloadBlob(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), `${slug}-logo.svg`);
  });
  // bộ icon app & web: rasterize 2 bản 1024 (nền đặc + lớp foreground trong suốt) rồi cắt đủ cỡ
  const iconCanvas = async (key: 'icon-full' | 'icon-fg') => {
    const el = node(key as Variant);
    if (!el) throw new Error('thiếu icon');
    const { toCanvas } = await import('html-to-image');
    return toCanvas(el, { width: 1024, height: 1024, pixelRatio: 1, fontEmbedCSS: await embedFontCss(logoFontCss([cur.fontId])), cacheBust: false });
  };
  const downloadIconPack = () => run('icons', async () => {
    const svgEl = node('icon-full' as Variant)?.querySelector('svg')?.cloneNode(true) as SVGSVGElement | undefined;
    if (svgEl) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = await embedFontCss(logoFontCss([cur.fontId])); svgEl.insertBefore(st, svgEl.firstChild); }
    const p = cur.palette; const isArt = cur.kind === 'illus';
    const bgColor = iconBg === 'brand' ? (isArt ? p.colorSurface : p.colorAccent) : iconBg === 'light' ? '#ffffff' : p.colorPrimary;
    const zip = await buildIconPack({
      full: await iconCanvas('icon-full'), fg: await iconCanvas('icon-fg'), bgColor,
      faviconSvg: svgEl ? new XMLSerializer().serializeToString(svgEl) : '', appName: shopName, platforms: plats,
    });
    downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${slug}-bo-icon-app.zip`);
  });
  const saveToBrand = () => run('save', async () => {
    const blob = await pngBlob('color', 1000);
    const dataUrl = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob); });
    const p = cur.palette;
    const latest = loadBrand() || brand;
    const next: BrandKit = {
      ...latest, name: name.trim() || latest.name, slogan: slogan.trim() || latest.slogan, logo: dataUrl,
      ...(syncColors ? { colorPrimary: p.colorPrimary, colorSecondary: p.colorSecondary, colorAccent: p.colorAccent, colorInk: p.colorInk, colorSurface: p.colorSurface } : {}),
    };
    if (saveBrand(next)) { setBrand(next); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  });

  const previewStyle = previewBg === 'light' ? { background: cur.palette.colorSurface }
    : previewBg === 'dark' ? { background: cur.palette.colorPrimary }
      : { background: 'repeating-conic-gradient(#ffffff14 0 25%, transparent 0 50%) 0 0/18px 18px' };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h1 className="mv-h1 !text-2xl">Tạo logo</h1>
        <p className="mv-sub !mt-0.5">Nhập tên shop → chọn 1 logo ưng ý trong bộ gợi ý → tinh chỉnh nhẹ → tải về hoặc lưu vào bộ nhận diện.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <CollapsibleSection title="1 · Thông tin shop">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className="mv-label block mb-1.5">Tên shop</span>
                <input className="mv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Bánh Mì Cô Ba" data-testid="logo-name" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Slogan (tuỳ chọn)</span>
                <input className="mv-input" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="VD: Ngon từ tâm" data-testid="logo-slogan" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Ngành (có ngành có logo hình minh hoạ)</span>
                <select className="mv-input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {LOGO_INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select></label>
              <div><span className="mv-label block mb-1.5">Gu (chọn nhiều, bỏ trống = tất cả)</span>
                <div className="flex flex-wrap gap-1.5">
                  {LOGO_GUS.map((g) => <button key={g.id} type="button" onClick={() => toggleGu(g.id)} className={chip(gus.includes(g.id))}>{g.name}</button>)}
                </div></div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2 · Chọn logo ưng ý"
            right={<button type="button" onClick={() => setSeed((s) => s + 1)} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Shuffle className="w-3.5 h-3.5" /> Xem bộ khác</button>}>
            {ready ? (
              <div className="space-y-4" data-testid="logo-grid">
                {groups.map((g) => (
                  <div key={g.id}>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs font-bold text-white">{g.name}</span>
                      <span className="text-[11px] text-slate-500">{g.items.length} mẫu</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {g.items.map((l) => (
                        <button key={l.id} type="button" onClick={() => setSel(l)} data-testid="logo-tile" title={`${LOGO_KINDS.find((k) => k.id === l.kind)?.name} · ${fontById(l.fontId).family}`}
                          className={`h-32 rounded-xl border p-3 transition-all ${cur.id === l.id ? 'border-indigo-400 ring-2 ring-indigo-400/50' : 'border-white/10 hover:border-white/40'}`}
                          style={{ background: l.palette.colorSurface }}>
                          <LogoSvg spec={l} name={shopName} slogan={slogan} style={{ width: '100%', height: '100%', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải font…</div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="4 · Xem trên đồ thật">
            {ready && (
              <LogoMockups palette={cur.palette} logoKey={JSON.stringify(cur)} fontCss={logoFontCss([cur.fontId])}
                renderLogo={({ tone, frame, style }) => <LogoSvg spec={cur} name={shopName} slogan={slogan} tone={tone} frame={frame} style={style} />}
                name={shopName} slogan={slogan} contact={contactLine(brand.contact)} fileSlug={slug}
                makeLogoPng={() => pngBlob('color', 800)} />
            )}
          </CollapsibleSection>
        </div>

        {/* CỘT PHẢI: tinh chỉnh + tải */}
        <div className="xl:sticky xl:top-4 self-start space-y-3">
          <div className="glass-card p-4 rounded-2xl hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06] flex flex-col xl:max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-white">3 · Tinh chỉnh & tải</span>
              <div className="flex gap-1">
                {(['light', 'dark', 'none'] as const).map((b) => (
                  <button key={b} type="button" onClick={() => setPreviewBg(b)} className={`text-[10px] px-2 py-1 rounded-full border ${previewBg === b ? 'border-white text-white' : 'border-white/15 text-slate-400'}`}>
                    {b === 'light' ? 'Nền sáng' : b === 'dark' ? 'Nền tối' : 'Trong suốt'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 rounded-xl p-5 border border-white/10 shrink-0 mt-4" style={previewStyle} data-testid="logo-preview">
              {ready && <LogoSvg spec={cur} name={shopName} slogan={slogan} tone={previewBg === 'dark' ? 'white' : 'color'} style={{ width: '100%', height: '100%', display: 'block' }} />}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 space-y-4 mt-4">
            <div>
              <div className="mv-label mb-1.5">Kiểu</div>
              <div className="flex flex-wrap gap-1.5">{LOGO_KINDS.map((k) => <button key={k.id} type="button" onClick={() => upd({ kind: k.id, art: cur.art || LOGO_ART[0].id })} className={chip(cur.kind === k.id)} data-testid={`logo-kind-${k.id}`}>{k.name}</button>)}</div>
            </div>
            <label className="block">
              <span className="mv-label block mb-1.5">Font</span>
              <select className="mv-input" value={cur.fontId} onChange={(e) => upd({ fontId: e.target.value })} data-testid="logo-font">
                {LOGO_GUS.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {LOGO_FONTS.filter((f) => f.gu[0] === g.id).map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <div>
              <div className="mv-label mb-1.5">Màu</div>
              <div className="flex flex-wrap gap-2">
                {palettes.map((p) => (
                  <button key={p.name} type="button" title={p.name} onClick={() => upd({ palette: p })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${cur.palette.name === p.name ? 'border-white scale-110' : 'border-white/10 hover:border-white/40'}`}
                    style={{ background: `linear-gradient(135deg, ${p.colorPrimary} 50%, ${p.colorAccent} 50%)` }} />
                ))}
              </div>
            </div>
            {cur.kind === 'word-dot' && (
              <div><div className="mv-label mb-1.5">Điểm nhấn</div>
                <div className="flex flex-wrap gap-1.5">{ACCENTS.map((a) => <button key={a.id} type="button" onClick={() => upd({ accent: a.id })} className={chip(cur.accent === a.id)}>{a.name}</button>)}</div></div>
            )}
            {cur.kind === 'badge' ? (
              <div><div className="mv-label mb-1.5">Tâm huy hiệu</div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => upd({ shape: 'circle' })} className={chip(cur.shape === 'circle' || cur.shape === 'ring')}>Icon</button>
                  <button type="button" onClick={() => upd({ shape: 'square' })} className={chip(cur.shape === 'square' || cur.shape === 'diamond')}>Chữ cái đầu</button>
                </div></div>
            ) : usesShape(cur.kind) && (
              <div><div className="mv-label mb-1.5">Khung</div>
                <div className="flex flex-wrap gap-1.5">{SHAPES.map((s) => <button key={s.id} type="button" onClick={() => upd({ shape: s.id })} className={chip(cur.shape === s.id)}>{s.name}</button>)}</div></div>
            )}
            {cur.kind === 'illus' && (
              <div>
                <div className="mv-label mb-1.5">Hình minh hoạ</div>
                <div className="space-y-2.5">
                  {LOGO_ART_CATS.map((cat) => (
                    <div key={cat.id}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{cat.name}</div>
                      <div className="grid grid-cols-5 gap-1.5" data-testid="logo-art-grid">
                        {LOGO_ART.filter((a) => a.cat === cat.id).map((a) => (
                          <button key={a.id} type="button" title={a.name} onClick={() => upd({ art: a.id })}
                            className={`aspect-square rounded-lg bg-white p-1 border-2 ${cur.art === a.id ? 'border-indigo-400' : 'border-transparent hover:border-white/40'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={artUrl(a.id)} alt={a.name} className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500">Đang thử 7 hình ngành thú cưng — các ngành khác sẽ thêm sau.</p>
                </div>
              </div>
            )}
            {usesIcon(cur.kind) && (
              <div>
                <div className="mv-label mb-1.5">Biểu tượng</div>
                <div className="space-y-2.5">
                  {ICON_CATS.map((cat) => {
                    const items = LOGO_ICONS.filter((ic) => ic.cat === cat.id);
                    if (!items.length) return null;
                    return (
                      <div key={cat.id}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{cat.name}</div>
                        <div className="grid grid-cols-10 gap-1">
                          {items.map(({ id, Comp }) => (
                            <button key={id} type="button" title={id} onClick={() => upd({ icon: id })}
                              className={`aspect-square rounded-md flex items-center justify-center border ${cur.icon === id ? 'border-indigo-400 bg-indigo-500/20' : 'border-transparent hover:border-white/20'}`}>
                              <Comp size={16} color="#e2e8f0" weight="fill" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => downloadPng('color', 2000, 'logo')} className="mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-xs">
                  {busy === 'color' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG nền trong
                </button>
                <button type="button" onClick={downloadSvg} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs">
                  {busy === 'svg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} SVG
                </button>
                <button type="button" onClick={() => downloadPng('avatar', 1000, 'avatar')} className="mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-xs">
                  {busy === 'avatar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Avatar tròn
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => downloadPng('black', 2000, 'logo-den')} className="mv-btn mv-btn-ghost !flex justify-center !px-1 !py-2.5 !text-xs">{busy === 'black' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Bản đen'}</button>
                  <button type="button" onClick={() => downloadPng('white', 2000, 'logo-trang')} className="mv-btn mv-btn-ghost !flex justify-center !px-1 !py-2.5 !text-xs">{busy === 'white' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Bản trắng'}</button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5" data-testid="icon-pack">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Bộ icon app & web</span>
                  <span className="text-[10px] text-slate-500">favicon · Android · iOS · store</span>
                </div>
                {ready && (
                  <div className="flex items-end gap-3">
                    <div className="text-center"><LogoIconSvg spec={cur} name={shopName} bg={iconBg} style={{ width: 52, height: 52, borderRadius: 12, display: 'block' }} /><div className="text-[9px] text-slate-500 mt-1">iOS</div></div>
                    <div className="text-center"><LogoIconSvg spec={cur} name={shopName} bg={iconBg} style={{ width: 52, height: 52, borderRadius: '50%', display: 'block' }} /><div className="text-[9px] text-slate-500 mt-1">Android</div></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-700/70 px-2 py-1.5 max-w-[150px]">
                        <LogoIconSvg spec={cur} name={shopName} bg={iconBg} style={{ width: 16, height: 16, borderRadius: 3, display: 'block', flexShrink: 0 }} />
                        <span className="text-[10px] text-slate-200 truncate">{shopName}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">Tab trình duyệt</div>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">{ICON_BGS.map((b) => <button key={b.id} type="button" onClick={() => setIconBg(b.id)} className={chip(iconBg === b.id)}>{b.name}</button>)}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {([['web', 'Web (favicon, PWA)'], ['android', 'Android'], ['ios', 'iOS']] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <input type="checkbox" checked={plats[k]} onChange={(e) => setPlats((x) => ({ ...x, [k]: e.target.checked }))} /> {label}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={downloadIconPack} disabled={!plats.web && !plats.android && !plats.ios} className="w-full mv-btn mv-btn-ghost !flex justify-center !py-2 !text-xs disabled:opacity-50" data-testid="icon-pack-download">
                  {busy === 'icons' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} Tải bộ icon (.zip)
                </button>
              </div>
              <button type="button" onClick={saveToBrand} className="w-full mv-btn mv-btn-ghost !flex justify-center !py-2.5 !text-sm !border-indigo-400/50">
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                {saved ? 'Đã lưu vào bộ nhận diện' : 'Lưu vào bộ nhận diện'}
              </button>
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={syncColors} onChange={(e) => setSyncColors(e.target.checked)} /> Đổi màu thương hiệu theo logo này
              </label>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bản dựng ẩn để xuất ảnh đúng kích thước */}
      {ready && (
        <div ref={exportRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          {(['color', 'black', 'white'] as const).map((v) => (
            <div key={v} data-x={v} style={{ display: 'inline-block' }}>
              <LogoSvg spec={cur} name={shopName} slogan={slogan} tone={v} style={{ display: 'block' }} />
            </div>
          ))}
          <div data-x="avatar" style={{ display: 'inline-block' }}>
            <LogoSvg spec={cur} name={shopName} slogan={slogan} frame="avatar" style={{ display: 'block' }} />
          </div>
          <div data-x="icon-full" style={{ display: 'inline-block' }}><LogoIconSvg spec={cur} name={shopName} bg={iconBg} style={{ display: 'block' }} /></div>
          {/* Android adaptive: dấu nằm trong vùng an toàn 66/108 */}
          <div data-x="icon-fg" style={{ display: 'inline-block' }}><LogoIconSvg spec={cur} name={shopName} bg={iconBg} transparent scale={0.4} style={{ display: 'block' }} /></div>
        </div>
      )}
    </div>
  );
}
