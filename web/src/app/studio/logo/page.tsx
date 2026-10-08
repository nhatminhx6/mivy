'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Check } from 'lucide-react';
import { BrandKit } from '@/types';
import { DEFAULT_BRAND, fontFamilyById, loadBrand, saveBrand } from '@/lib/brand-presets';
import { LOGO_ICONS, iconById, ICON_STYLES, AI_CONCEPTS, aiIconPath } from '@/lib/logo-icons';

type Layout = 'emblem' | 'icon-top' | 'icon-left' | 'wordmark';
type BgStyle = 'trong' | 'sang' | 'dam';
type Container = 'squircle' | 'circle' | 'badge' | 'plain';

const LAYOUTS: { id: Layout; name: string }[] = [
  { id: 'emblem', name: 'Huy hiệu' }, { id: 'icon-top', name: 'Icon trên' },
  { id: 'icon-left', name: 'Icon trái' }, { id: 'wordmark', name: 'Chữ không' },
];
const CONTAINERS: { id: Container; name: string }[] = [
  { id: 'squircle', name: 'Khối bo' }, { id: 'circle', name: 'Tròn' },
  { id: 'badge', name: 'Huy hiệu' }, { id: 'plain', name: 'Trơn' },
];

export default function LogoMakerPage() {
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [iconStyle, setIconStyle] = useState('3d');       // '3d' | 'phang' | 'line'
  const [iconId, setIconId] = useState('store');          // phosphor id
  const [aiConcept, setAiConcept] = useState('coffee');   // concept AI
  const [iconDataUrl, setIconDataUrl] = useState('');     // dataURL icon AI (để export)
  const [layout, setLayout] = useState<Layout>('emblem');
  const [container, setContainer] = useState<Container>('squircle');
  const [bg, setBg] = useState<BgStyle>('trong');
  const [savedLogo, setSavedLogo] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => { const b = loadBrand(); if (b) setBrand(b); }, []);

  // Gói đơn sắc → nhuộm theo màu thương hiệu; gói màu (emoji) giữ nguyên.
  const MONO = ['carbon', 'tabler', 'fluentf', 'iconoir', 'phfill', 'majestic', 'solarbold'];
  useEffect(() => {
    if (iconStyle === 'line') { setIconDataUrl(''); return; }
    let active = true;
    (async () => {
      try {
        const res = await fetch(aiIconPath(iconStyle, aiConcept));
        if (!res.ok) throw new Error();
        let txt = await res.text();
        if (MONO.includes(iconStyle)) txt = txt.replace(/#1f2937/gi, brand.colorPrimary);
        if (active) setIconDataUrl('data:image/svg+xml;utf8,' + encodeURIComponent(txt));
      } catch { if (active) setIconDataUrl(''); }
    })();
    return () => { active = false; };
  }, [iconStyle, aiConcept, brand.colorPrimary]);

  const head = fontFamilyById(brand.fontHeadingId);
  const body = fontFamilyById(brand.fontBodyId);
  const name = (brand.name || 'Thương Hiệu');
  const Icon = iconById(iconId);
  const bgColor = bg === 'trong' ? 'transparent' : bg === 'sang' ? brand.colorSurface : brand.colorPrimary;
  const textColor = bg === 'dam' ? '#ffffff' : brand.colorPrimary;
  const W = 480, H = 480;

  const IconMark = ({ cx, cy, s }: { cx: number; cy: number; s: number }) => {
    // Icon AI (ảnh màu): nền trắng bo + ảnh.
    if (iconStyle !== 'line') {
      if (!iconDataUrl) return null;
      const pad = container === 'plain' ? 0 : s * 0.12;
      return (
        <g filter="url(#logoShadow)">
          {container !== 'plain' && (container === 'circle' || container === 'badge'
            ? <circle cx={cx} cy={cy} r={s / 2} fill="#ffffff" />
            : <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={s * 0.28} fill="#ffffff" />)}
          {container === 'badge' && <circle cx={cx} cy={cy} r={s / 2 - 7} fill="none" stroke={brand.colorAccent} strokeWidth={3} />}
          <image href={iconDataUrl} x={cx - (s / 2 - pad)} y={cy - (s / 2 - pad)} width={s - 2 * pad} height={s - 2 * pad} preserveAspectRatio="xMidYMid meet" />
        </g>
      );
    }
    // Icon nét (Phosphor): khối gradient + icon trắng.
    const inner = s * 0.52;
    if (container === 'plain') {
      return <g transform={`translate(${cx - inner / 2},${cy - inner / 2})`}><Icon size={inner} color={brand.colorAccent} weight="duotone" /></g>;
    }
    return (
      <g filter="url(#logoShadow)">
        {container === 'circle' && <circle cx={cx} cy={cy} r={s / 2} fill="url(#logoGrad)" />}
        {container === 'squircle' && <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={s * 0.28} fill="url(#logoGrad)" />}
        {container === 'badge' && <>
          <circle cx={cx} cy={cy} r={s / 2} fill="url(#logoGrad)" />
          <circle cx={cx} cy={cy} r={s / 2 - 7} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={3} />
        </>}
        <g transform={`translate(${cx - inner / 2},${cy - inner / 2})`}><Icon size={inner} color="#ffffff" weight="fill" /></g>
      </g>
    );
  };

  const serialize = (): string => {
    if (!svgRef.current) return '';
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  };
  const rasterize = async (): Promise<Blob | null> => {
    await document.fonts.ready;
    const xml = serialize(); if (!xml) return null;
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image(); img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = url; });
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      c.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024);
      return await new Promise((r) => c.toBlob(r, 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  };
  const download = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(brand.name || 'logo').replace(/\s+/g, '-').toLowerCase()}-logo.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const handlePng = async () => { const b = await rasterize(); if (b) download(b, 'png'); };
  const handleSvg = () => { const xml = serialize(); if (xml) download(new Blob([xml], { type: 'image/svg+xml' }), 'svg'); };
  const handleUseAsLogo = async () => {
    const b = await rasterize(); if (!b) return;
    const reader = new FileReader();
    reader.onload = () => { saveBrand({ ...brand, logo: reader.result as string }); setSavedLogo(true); setTimeout(() => setSavedLogo(false), 2500); };
    reader.readAsDataURL(b);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="glass-panel p-6 rounded-2xl">
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LOGO MAKER</span>
        <h1 className="text-2xl font-black text-white mt-2">Tạo logo từ thương hiệu</h1>
        <p className="text-slate-400 text-xs mt-1">Chọn gói icon + bố cục — logo tự dùng màu và font thương hiệu. Tải PNG/SVG hoặc đặt làm logo chính.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Gói icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_STYLES.map((st) => (
                <button key={st.id} type="button" onClick={() => setIconStyle(st.id)}
                  className={`px-3 py-1.5 rounded-lg border-2 ${iconStyle === st.id ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>{st.name}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">Biểu tượng</label>
            {iconStyle === 'line' ? (
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1">
                {LOGO_ICONS.map(({ id, Comp }) => (
                  <button key={id} type="button" onClick={() => setIconId(id)}
                    className={`aspect-square rounded-lg flex items-center justify-center border-2 ${iconId === id ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <Comp size={22} weight="duotone" className="text-slate-200" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {AI_CONCEPTS.map((c) => (
                  <button key={c.id} type="button" onClick={() => setAiConcept(c.id)} title={c.label}
                    className={`aspect-square rounded-lg overflow-hidden flex items-center justify-center border-2 bg-white/90 ${aiConcept === c.id ? 'border-emerald-500' : 'border-white/10 hover:border-white/30'}`}>
                    <img src={aiIconPath(iconStyle, c.id)} alt={c.label} className="w-full h-full object-contain"
                      onError={(e) => { const b = e.currentTarget.closest('button'); if (b) b.style.display = 'none'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">Bố cục</label>
            <div className="grid grid-cols-4 gap-2">
              {LAYOUTS.map((l) => (
                <button key={l.id} type="button" onClick={() => setLayout(l.id)}
                  className={`px-2 py-2 rounded-lg border-2 ${layout === l.id ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>{l.name}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Kiểu khối</label>
              <div className="grid grid-cols-2 gap-2">
                {CONTAINERS.map((c) => (
                  <button key={c.id} type="button" onClick={() => setContainer(c.id)} disabled={layout === 'wordmark'}
                    className={`px-2 py-2 rounded-lg border-2 disabled:opacity-40 ${container === c.id ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Nền logo</label>
              <div className="grid grid-cols-3 gap-2">
                {([['trong', 'Trong'], ['sang', 'Sáng'], ['dam', 'Đậm']] as const).map(([id, lbl]) => (
                  <button key={id} type="button" onClick={() => setBg(id)}
                    className={`px-1 py-2 rounded-lg border-2 ${bg === id ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={handlePng} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"><Download className="w-3.5 h-3.5" />Tải PNG</button>
            <button type="button" onClick={handleSvg} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-white font-semibold hover:bg-white/10"><Download className="w-3.5 h-3.5 text-emerald-400" />Tải SVG</button>
            <button type="button" onClick={handleUseAsLogo} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-400 font-semibold hover:bg-emerald-500/10">
              {savedLogo ? <><Check className="w-3.5 h-3.5" />Đã đặt làm logo</> : 'Đặt làm logo chính'}</button>
          </div>
          <p className="text-[11px] text-slate-500">Màu & font lấy từ mục Thương hiệu. Icon màu (gói AI) để lên khối nền trắng cho rõ.</p>
        </div>

        <div className="space-y-3 lg:sticky lg:top-4">
          <p className="text-xs text-slate-400 font-semibold">Xem trước</p>
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[repeating-conic-gradient(#1a1d26_0_90deg,#13161e_0_180deg)] bg-[length:28px_28px] flex items-center justify-center p-6">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="360" height="360" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={brand.colorPrimary} />
                  <stop offset="100%" stopColor={brand.colorSecondary} />
                </linearGradient>
                <filter id="logoShadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.28" />
                </filter>
              </defs>
              {bg !== 'trong' && <rect x="0" y="0" width={W} height={H} rx="48" fill={bgColor} />}
              {layout === 'emblem' && (<>
                <IconMark cx={W / 2} cy={185} s={175} />
                <text x={W / 2} y={360} textAnchor="middle" fontFamily={head} fontWeight="800" fontSize="46" fill={textColor}>{name}</text>
                {brand.slogan && <text x={W / 2} y={398} textAnchor="middle" fontFamily={body} fontSize="20" fill={brand.colorAccent}>{brand.slogan}</text>}
              </>)}
              {layout === 'icon-top' && (<>
                <IconMark cx={W / 2} cy={160} s={190} />
                <text x={W / 2} y={330} textAnchor="middle" fontFamily={head} fontWeight="800" fontSize="52" fill={textColor}>{name}</text>
                {brand.slogan && <text x={W / 2} y={372} textAnchor="middle" fontFamily={body} fontSize="20" fill={brand.colorAccent}>{brand.slogan}</text>}
              </>)}
              {layout === 'icon-left' && (<>
                <IconMark cx={135} cy={H / 2} s={150} />
                <text x={235} y={H / 2 - 6} textAnchor="start" dominantBaseline="middle" fontFamily={head} fontWeight="800" fontSize="44" fill={textColor}>{name}</text>
                {brand.slogan && <text x={235} y={H / 2 + 34} textAnchor="start" dominantBaseline="middle" fontFamily={body} fontSize="19" fill={brand.colorAccent}>{brand.slogan}</text>}
              </>)}
              {layout === 'wordmark' && (<>
                <text x={W / 2} y={H / 2 - 8} textAnchor="middle" dominantBaseline="middle" fontFamily={head} fontWeight="800" fontSize="64" fill={textColor}>{name}</text>
                {brand.slogan && <text x={W / 2} y={H / 2 + 56} textAnchor="middle" fontFamily={body} fontSize="24" fill={brand.colorAccent}>{brand.slogan}</text>}
              </>)}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500">Logo xuất 1024×1024 PNG (nền trong suốt nếu chọn) hoặc SVG vector.</p>
        </div>
      </div>
    </div>
  );
}
