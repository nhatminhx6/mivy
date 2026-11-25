'use client';
// Hộp giấy & túi giấy: engine dựng DÀN KHUÔN BẾ (dieline) phẳng bằng code — nét CẮT (liền) + nét BẾ GẤP (đứt),
// keo dán, mặt trước gắn thương hiệu. Đơn vị: 2px = 1mm. Xuất PDF đúng khổ thật để xưởng bế.
// Đây là bản dựng sẵn để báo giá + duyệt bố cục; xưởng sẽ chốt khuôn bế cuối theo máy của họ.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

const U = 2; // px / mm
const CUT = '#1F2937';     // nét cắt (liền)
const FOLD = '#2563EB';    // nét bế gấp (đứt)

export type PkgKind = 'box' | 'bag' | 'carry';
export const PKG_KINDS: { id: PkgKind; name: string }[] = [
  { id: 'box', name: 'Hộp giấy' },
  { id: 'bag', name: 'Túi giấy' },
  { id: 'carry', name: 'Hộp quai xách' },
];

// kích thước: w = ngang mặt trước, d = hông (sâu), h = cao — mm
export interface PkgSize { id: string; kind: PkgKind; name: string; w: number; d: number; h: number }
export const PKG_SIZES: PkgSize[] = [
  { id: 'box-s', kind: 'box', name: 'Hộp nhỏ 80×80×80', w: 80, d: 80, h: 80 },
  { id: 'box-tall', kind: 'box', name: 'Hộp cao 60×60×150', w: 60, d: 60, h: 150 },
  { id: 'box-flat', kind: 'box', name: 'Hộp dẹp 150×100×40', w: 150, d: 100, h: 40 },
  { id: 'bag-s', kind: 'bag', name: 'Túi nhỏ 180×90×220', w: 180, d: 90, h: 220 },
  { id: 'bag-m', kind: 'bag', name: 'Túi vừa 250×100×320', w: 250, d: 100, h: 320 },
  { id: 'bag-wine', kind: 'bag', name: 'Túi chai 110×110×360', w: 110, d: 110, h: 360 },
  { id: 'carry-m', kind: 'carry', name: 'Hộp quai 200×120×150', w: 200, d: 120, h: 150 },
  { id: 'carry-l', kind: 'carry', name: 'Hộp quai 250×150×200', w: 250, d: 150, h: 200 },
  { id: 'carry-cake', kind: 'carry', name: 'Hộp bánh 300×200×100', w: 300, d: 200, h: 100 },
];
export const pkgSize = (id: string) => PKG_SIZES.find((s) => s.id === id) || PKG_SIZES[0];
export const sizesForKind = (k: PkgKind) => PKG_SIZES.filter((s) => s.kind === k);

export interface PkgFont { id: string; name: string; family: string; weight: number }
export const PKG_FONTS: PkgFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 700 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
];
export const pkgFont = (id: string) => PKG_FONTS.find((f) => f.id === id) || PKG_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const PKG_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;800&family=Montserrat:wght@600;800&family=Playfair+Display:wght@700&family=Cormorant+Garamond:wght@600;700&display=swap');`;

export function usePkgFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pkg-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-pkg-fonts'; link.rel = 'stylesheet'; link.href = PKG_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...PKG_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 32px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export interface PkgPalette { id: string; name: string; face: string; faceInk: string; side: string; accent: string }
export const PKG_PALETTES: PkgPalette[] = [
  { id: 'kraft', name: 'Kraft mộc', face: '#C9A67E', faceInk: '#3A2A18', side: '#D8BE9C', accent: '#5A3E22' },
  { id: 'navy', name: 'Navy', face: '#1F3A68', faceInk: '#FFFFFF', side: '#2B4A80', accent: '#C8A24A' },
  { id: 'black', name: 'Đen sang', face: '#1A1A1A', faceInk: '#F4EFE3', side: '#262626', accent: '#C8A24A' },
  { id: 'white', name: 'Trắng tối giản', face: '#FFFFFF', faceInk: '#1C1C1C', side: '#F1F1F1', accent: '#1C1C1C' },
  { id: 'teal', name: 'Xanh ngọc', face: '#0F766E', faceInk: '#FFFFFF', side: '#15897F', accent: '#F2C94C' },
  { id: 'blush', name: 'Hồng nude', face: '#E7C3B8', faceInk: '#5A2E28', side: '#F0D6CD', accent: '#A64B3A' },
  { id: 'forest', name: 'Rừng', face: '#1F4D3A', faceInk: '#F3FBF5', side: '#296148', accent: '#E4A32B' },
  { id: 'clay', name: 'Đất nung', face: '#B4553A', faceInk: '#FFF4EF', side: '#C2684E', accent: '#F2C94C' },
  { id: 'tetred', name: 'Đỏ Tết', face: '#B5121B', faceInk: '#FFF1D6', side: '#C21F27', accent: '#E9B949' },
  { id: 'cream', name: 'Kem cam', face: '#FFF6E8', faceInk: '#5B2A10', side: '#FBEBD3', accent: '#EF7A1A' },
];
export const pkgPalette = (id: string) => PKG_PALETTES.find((p) => p.id === id) || PKG_PALETTES[0];

export interface PkgSpec { kind: PkgKind; palette: string; font: string; size: string; look?: CarryLook }
export interface PkgTemplate { id: string; name: string; spec: Omit<PkgSpec, 'size'> }
const BOX_PICKS = ['kraft', 'navy', 'black', 'white', 'teal', 'blush'];
const BAG_PICKS = ['kraft', 'black', 'white', 'forest', 'clay', 'navy'];
export const pkgTemplates = (kind: PkgKind): PkgTemplate[] => kind === 'carry' ? CARRY_TEMPLATES :
  (kind === 'box' ? BOX_PICKS : BAG_PICKS).map((palette) => ({
    id: `${kind}-${palette}`, name: pkgPalette(palette).name,
    spec: { kind, palette, font: kind === 'box' ? 'bvp' : 'montserrat' },
  }));

export type PkgData = Record<string, string>;
export interface PkgField { key: string; label: string; ph?: string; half?: boolean }
export const PKG_FIELDS: PkgField[] = [
  { key: 'brand', label: 'Tên thương hiệu', ph: 'AN KHANG', half: true },
  { key: 'tagline', label: 'Dòng mô tả', ph: 'Mỹ phẩm thiên nhiên', half: true },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', half: true },
  { key: 'note', label: 'Ghi chú mặt sau', ph: 'Made in Vietnam', half: true },
];
export const defaultPkgData = (): PkgData => ({ brand: 'AN KHANG', tagline: 'Mỹ phẩm thiên nhiên', website: 'ankhang.vn', note: 'Made in Vietnam' });

// kích thước tấm dàn khuôn (mm) để xuất PDF đúng khổ
export function pkgNetMm(spec: PkgSpec): { wMm: number; hMm: number } {
  const s = pkgSize(spec.size);
  if (spec.kind === 'box') {
    const gf = Math.min(s.d * 0.6, 18);
    const flap = Math.min(s.d, s.w * 0.6);
    return { wMm: 2 * s.w + 2 * s.d + gf + 20, hMm: s.h + 2 * flap + 20 };
  }
  if (spec.kind === 'carry') {
    const c = carryDims(s);
    return { wMm: 2 * s.w + 2 * s.d + c.gf + 20, hMm: c.hH + c.L + s.h + c.bfF + 10 + 24 };
  }
  const gf = Math.min(s.d * 0.6, 18);
  const hem = 28, bottom = s.d;
  return { wMm: 2 * s.w + 2 * s.d + gf + 20, hMm: hem + s.h + bottom + 20 };
}

const brandInitial = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'M';
const fit = (text: string, maxPx: number, size: number, factor = 0.6) => {
  const w = (text || '').length * size * factor;
  return w > maxPx ? Math.max(size * 0.45, maxPx / ((text || '').length * factor)) : size;
};

// nét bế gấp (đứt)
const Fold = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) =>
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={FOLD} strokeWidth={1.4} strokeDasharray="7 6" />;

function BrandFace({ x, y, w, h, p, f, data, small }: { x: number; y: number; w: number; h: number; p: PkgPalette; f: PkgFont; data: PkgData; small?: boolean }) {
  const cx = x + w / 2;
  const disp = `"${f.family}"`;
  return (
    <g textAnchor="middle">
      <circle cx={cx} cy={y + h * 0.34} r={Math.min(w, h) * 0.12} fill="none" stroke={p.accent} strokeWidth={2.4} />
      <text x={cx} y={y + h * 0.34 + Math.min(w, h) * 0.05} fontFamily={disp} fontWeight={f.weight} fontSize={Math.min(w, h) * 0.13} fill={p.accent}>{brandInitial(data.brand)}</text>
      <text x={cx} y={y + h * 0.58} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, w * 0.84, Math.min(w * 0.16, 44))} fill={p.faceInk} letterSpacing={1}>{data.brand}</text>
      {!small && data.tagline && <text x={cx} y={y + h * 0.68} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(data.tagline, w * 0.8, 20)} fill={p.faceInk} opacity={0.82}>{data.tagline}</text>}
      {!small && data.website && <text x={cx} y={y + h * 0.84} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.accent} letterSpacing={1}>{data.website}</text>}
    </g>
  );
}

const Label = ({ x, y, t }: { x: number; y: number; t: string }) =>
  <text x={x} y={y} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={13} fill="#94A3B8" letterSpacing={1}>{t}</text>;


export function PackagingSvg({ spec, data, style }: { spec: PkgSpec; data: PkgData; style?: CSSProperties }) {
  const s = pkgSize(spec.size);
  const p = pkgPalette(spec.palette);
  const f = pkgFont(spec.font);
  const net = pkgNetMm(spec);
  const W = net.wMm * U, H = net.hMm * U;
  const m = 10 * U; // lề quanh tấm

  const w = s.w * U, d = s.d * U, h = s.h * U;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  let body: ReactNode;

  if (spec.kind === 'box') {
    const gf = Math.min(s.d * 0.6, 18) * U;
    const flap = Math.min(s.d, s.w * 0.6) * U;
    const x0 = m;                 // Front
    const x1 = x0 + w;            // Side
    const x2 = x1 + d;            // Back
    const x3 = x2 + w;            // Side2
    const x4 = x3 + d;            // Glue
    const yT = m + flap;          // body top
    const yB = yT + h;            // body bottom
    const ins = flap * 0.32;
    const sideTop = flap * 0.82;

    const panelFills = (
      <g>
        <rect x={x0} y={yT} width={w} height={h} fill={p.face} />
        <rect x={x1} y={yT} width={d} height={h} fill={p.side} />
        <rect x={x2} y={yT} width={w} height={h} fill={p.side} />
        <rect x={x3} y={yT} width={d} height={h} fill={p.side} />
      </g>
    );
    // flaps (fill nhạt) — trên & dưới cho Front/Back (chữ nhật), hông (hình thang)
    const flapFill = '#ECEFF3';
    const flaps = (
      <g fill={flapFill}>
        <rect x={x0} y={yT - flap} width={w} height={flap} />
        <rect x={x0} y={yB} width={w} height={flap} />
        <rect x={x2} y={yT - flap} width={w} height={flap} />
        <rect x={x2} y={yB} width={w} height={flap} />
        <polygon points={`${x1},${yT} ${x1 + d},${yT} ${x1 + d - ins},${yT - sideTop} ${x1 + ins},${yT - sideTop}`} />
        <polygon points={`${x1},${yB} ${x1 + d},${yB} ${x1 + d - ins},${yB + sideTop} ${x1 + ins},${yB + sideTop}`} />
        <polygon points={`${x3},${yT} ${x3 + d},${yT} ${x3 + d - ins},${yT - sideTop} ${x3 + ins},${yT - sideTop}`} />
        <polygon points={`${x3},${yB} ${x3 + d},${yB} ${x3 + d - ins},${yB + sideTop} ${x3 + ins},${yB + sideTop}`} />
        <polygon points={`${x4},${yT} ${x4 + gf},${yT + ins} ${x4 + gf},${yB - ins} ${x4},${yB}`} />
      </g>
    );
    // nét cắt (liền): outline mỗi mảnh
    const cut = (
      <g stroke={CUT} strokeWidth={1.6} fill="none">
        <rect x={x0} y={yT - flap} width={w} height={flap} />
        <rect x={x0} y={yB} width={w} height={flap} />
        <rect x={x2} y={yT - flap} width={w} height={flap} />
        <rect x={x2} y={yB} width={w} height={flap} />
        <rect x={x0} y={yT} width={2 * w + 2 * d} height={h} />
        <polygon points={`${x1},${yT} ${x1 + d},${yT} ${x1 + d - ins},${yT - sideTop} ${x1 + ins},${yT - sideTop}`} />
        <polygon points={`${x1},${yB} ${x1 + d},${yB} ${x1 + d - ins},${yB + sideTop} ${x1 + ins},${yB + sideTop}`} />
        <polygon points={`${x3},${yT} ${x3 + d},${yT} ${x3 + d - ins},${yT - sideTop} ${x3 + ins},${yT - sideTop}`} />
        <polygon points={`${x3},${yB} ${x3 + d},${yB} ${x3 + d - ins},${yB + sideTop} ${x3 + ins},${yB + sideTop}`} />
        <polygon points={`${x4},${yT} ${x4 + gf},${yT + ins} ${x4 + gf},${yB - ins} ${x4},${yB}`} />
      </g>
    );
    const folds = (
      <g>
        <Fold x1={x1} y1={yT} x2={x1} y2={yB} /><Fold x1={x2} y1={yT} x2={x2} y2={yB} />
        <Fold x1={x3} y1={yT} x2={x3} y2={yB} /><Fold x1={x4} y1={yT} x2={x4} y2={yB} />
        <Fold x1={x0} y1={yT} x2={x4} y2={yT} /><Fold x1={x0} y1={yB} x2={x4} y2={yB} />
      </g>
    );
    body = (
      <>
        {panelFills}{flaps}
        <BrandFace x={x0} y={yT} w={w} h={h} p={p} f={f} data={data} />
        <g transform={`translate(${x2 + w / 2} ${yT + h / 2}) rotate(180)`}>
          <text textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(data.note || '', w * 0.8, 20)} fill={p.faceInk} opacity={0.85}>{data.note}</text>
        </g>
        {cut}{folds}
        <Label x={x0 + w / 2} y={yB + flap + 26} t="MẶT TRƯỚC" />
        <Label x={x1 + d / 2} y={yB + sideTop + 26} t="HÔNG" />
        <Label x={x2 + w / 2} y={yB + flap + 26} t="MẶT SAU" />
        <Label x={x4 + gf / 2} y={yB - ins + 22} t="KEO" />
      </>
    );
  } else if (spec.kind === 'carry') {
    body = <CarryDieline spec={spec} data={data} uid={uid} />;
  } else {
    // túi giấy: thân + đáy + miệng gấp (hem) + 2 lỗ xỏ quai
    const gf = Math.min(s.d * 0.6, 18) * U;
    const hem = 28 * U;
    const bottom = d; // đáy = sâu
    const x0 = m, x1 = x0 + w, x2 = x1 + d, x3 = x2 + w, x4 = x3 + d;
    const yTop = m;              // mép trên tấm
    const yBodyTop = yTop + hem; // sau khi gấp miệng
    const yBodyBot = yBodyTop + h;
    const yBot = yBodyBot + bottom;
    const totalW = 2 * w + 2 * d;

    const panelFills = (
      <g>
        <rect x={x0} y={yBodyTop} width={w} height={h} fill={p.face} />
        <rect x={x1} y={yBodyTop} width={d} height={h} fill={p.side} />
        <rect x={x2} y={yBodyTop} width={w} height={h} fill={p.side} />
        <rect x={x3} y={yBodyTop} width={d} height={h} fill={p.side} />
        {/* miệng gấp + đáy + keo: tông nhạt */}
        <rect x={x0} y={yTop} width={totalW} height={hem} fill={p.side} opacity={0.5} />
        <rect x={x0} y={yBodyBot} width={totalW} height={bottom} fill="#ECEFF3" />
        <rect x={x4} y={yBodyTop} width={gf} height={h} fill="#ECEFF3" />
      </g>
    );
    const cut = (
      <g stroke={CUT} strokeWidth={1.6} fill="none">
        <rect x={x0} y={yTop} width={totalW + gf} height={yBot - yTop} />
      </g>
    );
    const folds = (
      <g>
        <Fold x1={x1} y1={yTop} x2={x1} y2={yBot} /><Fold x1={x2} y1={yTop} x2={x2} y2={yBot} />
        <Fold x1={x3} y1={yTop} x2={x3} y2={yBot} /><Fold x1={x4} y1={yTop} x2={x4} y2={yBot} />
        <Fold x1={x0} y1={yBodyTop} x2={x4 + gf} y2={yBodyTop} />
        <Fold x1={x0} y1={yBodyBot} x2={x4 + gf} y2={yBodyBot} />
        {/* gấp đáy chéo */}
        <Fold x1={x0} y1={yBodyBot} x2={x1} y2={yBot} /><Fold x1={x1} y1={yBot} x2={x1} y2={yBodyBot} />
      </g>
    );
    // lỗ xỏ quai trên Front & Back
    const holeY = yBodyTop + hem * 0.1;
    const holes = (
      <g fill="none" stroke={CUT} strokeWidth={1.6}>
        <ellipse cx={x0 + w * 0.36} cy={holeY} rx={10 * U} ry={4 * U} />
        <ellipse cx={x0 + w * 0.64} cy={holeY} rx={10 * U} ry={4 * U} />
        <ellipse cx={x2 + w * 0.36} cy={holeY} rx={10 * U} ry={4 * U} />
        <ellipse cx={x2 + w * 0.64} cy={holeY} rx={10 * U} ry={4 * U} />
      </g>
    );
    body = (
      <>
        {panelFills}
        <BrandFace x={x0} y={yBodyTop + h * 0.08} w={w} h={h * 0.8} p={p} f={f} data={data} />
        <g transform={`translate(${x2 + w / 2} ${yBodyTop + h / 2})`}>
          <text textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(data.website || '', w * 0.8, 22)} fill={p.faceInk} opacity={0.85}>{data.website}</text>
        </g>
        {cut}{folds}{holes}
        <Label x={x0 + w / 2} y={yBot + 26} t="MẶT TRƯỚC" />
        <Label x={x1 + d / 2} y={yBot + 26} t="HÔNG" />
        <Label x={x2 + w / 2} y={yBot + 26} t="MẶT SAU" />
        <Label x={(x0 + x4) / 2} y={yTop + hem * 0.6} t="GẤP MIỆNG" />
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
      {body}
      {/* chú thích nét */}
      <g transform={`translate(${m} ${H - 14})`} fontFamily={`"${BODY}"`} fontSize={12} fill="#64748B">
        <line x1={0} y1={-4} x2={26} y2={-4} stroke={CUT} strokeWidth={1.6} /><text x={32} y={0}>Nét cắt</text>
        <line x1={110} y1={-4} x2={136} y2={-4} stroke={FOLD} strokeWidth={1.4} strokeDasharray="7 6" /><text x={142} y={0}>Nét bế gấp</text>
      </g>
    </svg>
  );
}


// ======================= HỘP QUAI XÁCH (gable box) =======================
// 4 vách + 2 mái dốc chụm lên thành QUAI có lỗ xỏ tay (2 tấm quai dán áp nhau), 2 đầu hồi tam giác, đáy khoá cài.
// Hình trang trí mỗi mặt là danh sách path + chữ theo mm → vẽ được cả SVG (khuôn bế) lẫn Canvas (texture 3D), y hệt nhau.

export type CarryLook = 'classic' | 'banh' | 'tet' | 'fruit' | 'beauty';
const CARRY_TEMPLATES: PkgTemplate[] = [
  { id: 'carry-banh-blush', name: 'Tiệm bánh · Hồng', spec: { kind: 'carry', palette: 'blush', font: 'playfair', look: 'banh' } },
  { id: 'carry-banh-kraft', name: 'Tiệm bánh · Kraft', spec: { kind: 'carry', palette: 'kraft', font: 'cormorant', look: 'banh' } },
  { id: 'carry-tet-red', name: 'Quà Tết · Đỏ kim', spec: { kind: 'carry', palette: 'tetred', font: 'playfair', look: 'tet' } },
  { id: 'carry-tet-black', name: 'Quà Tết · Đen vàng', spec: { kind: 'carry', palette: 'black', font: 'cormorant', look: 'tet' } },
  { id: 'carry-fruit', name: 'Trái cây tươi', spec: { kind: 'carry', palette: 'cream', font: 'montserrat', look: 'fruit' } },
  { id: 'carry-beauty', name: 'Mỹ phẩm tối giản', spec: { kind: 'carry', palette: 'white', font: 'cormorant', look: 'beauty' } },
  { id: 'carry-navy', name: 'Cổ điển · Navy', spec: { kind: 'carry', palette: 'navy', font: 'bvp', look: 'classic' } },
];
// nội dung mẫu theo kiểu hộp (chỉ dùng khi khách chưa sửa chữ)
export const carryLookData = (look: CarryLook | undefined): PkgData => ({
  banh: { brand: 'THU HÀ BAKERY', tagline: 'Bánh ngọt nướng mỗi ngày', website: 'thuhabakery.vn', note: 'Ngon nhất trong 2 ngày · Bảo quản mát' },
  tet: { brand: 'AN KHANG', tagline: 'Quà Tết an khang · Xuân 2027', website: 'ankhang.vn', note: 'Chúc mừng năm mới · Vạn sự như ý' },
  fruit: { brand: 'VƯỜN QUỐC BẢO', tagline: 'Trái cây tươi tuyển chọn', website: 'vuonquocbao.vn', note: 'Bảo quản nơi thoáng mát' },
  beauty: { brand: 'GIA KHÁNH', tagline: 'Mỹ phẩm thiên nhiên', website: 'giakhanh.vn', note: 'Made in Vietnam' },
  classic: defaultPkgData(),
}[look || 'classic']);

export interface CarryDims { w: number; d: number; h: number; rH: number; L: number; hH: number; rc: number; holeW: number; holeH: number; holeTop: number; gf: number; bfF: number; bfS: number }
export function carryDims(s: PkgSize): CarryDims {
  const rH = Math.round(s.d * 0.3);            // độ cao mái (đỉnh hồi tam giác)
  return {
    w: s.w, d: s.d, h: s.h, rH, L: Math.hypot(s.d / 2, rH), hH: 62, rc: 14,
    holeW: Math.min(100, s.w * 0.46), holeH: 24, holeTop: 12,
    gf: Math.min(s.d * 0.6, 18), bfF: s.d * 0.62, bfS: s.d * 0.42,
  };
}

// ---- hình vẽ dùng chung SVG + Canvas (đơn vị mm, gốc trên-trái, y xuống) ----
export type ArtItem =
  | { t: 'p'; d: string; fill?: string; stroke?: string; sw?: number; op?: number; eo?: boolean }
  | { t: 'x'; s: string; x: number; y: number; size: number; family: string; weight: number; color: string; op?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number; rot?: number };
export interface Art { w: number; h: number; bg: string; items: ArtItem[] }

const r2 = (n: number) => Math.round(n * 100) / 100;
const circP = (cx: number, cy: number, r: number) => `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
const rectP = (x: number, y: number, w: number, h: number) => `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;

let mctx: CanvasRenderingContext2D | null = null;
function textW(s: string, family: string, weight: number, size: number) {
  if (typeof document === 'undefined') return s.length * size * 0.6;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6;
  mctx.font = `${weight} ${size}px "${family}"`;
  return mctx.measureText(s).width;
}
// chữ tự co cho vừa max (mm)
function T(s: string | undefined, x: number, y: number, size: number, max: number, family: string, weight: number, color: string,
  o: { op?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number; rot?: number } = {}): ArtItem[] {
  if (!s) return [];
  const w = textW(s, family, weight, size) + (o.ls || 0) * s.length;
  return [{ t: 'x', s, x, y, size: w > max ? (size * max) / w : size, family, weight, color, ...o }];
}

// hoa 5 cánh (mai/đào)
function flower(cx: number, cy: number, r: number, petal: string, center: string, op = 1): ArtItem[] {
  let d = '';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; d += circP(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.47); }
  let st = '';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5; st += circP(cx + Math.cos(a) * r * 0.34, cy + Math.sin(a) * r * 0.34, r * 0.06); }
  return [{ t: 'p', d, fill: petal, op }, { t: 'p', d: circP(cx, cy, r * 0.2), fill: center, op }, { t: 'p', d: st, fill: center, op }];
}
function leafP(x: number, y: number, len: number, a: number) {
  const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
  const mx = (x + tx) / 2, my = (y + ty) / 2, k = len * 0.32;
  return `M${r2(x)} ${r2(y)}Q${r2(mx + nx * k)} ${r2(my + ny * k)} ${r2(tx)} ${r2(ty)}Q${r2(mx - nx * k)} ${r2(my - ny * k)} ${r2(x)} ${r2(y)}Z`;
}
function leaf(x: number, y: number, len: number, a: number, color: string, vein?: string): ArtItem[] {
  const out: ArtItem[] = [{ t: 'p', d: leafP(x, y, len, a), fill: color }];
  if (vein) out.push({ t: 'p', d: `M${r2(x)} ${r2(y)}L${r2(x + Math.cos(a) * len * 0.9)} ${r2(y + Math.sin(a) * len * 0.9)}`, stroke: vein, sw: len * 0.035, op: 0.6 });
  return out;
}
// lát cam/chanh
function citrus(cx: number, cy: number, r: number, rind: string, flesh: string): ArtItem[] {
  let seg = '';
  for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5; seg += `M${r2(cx)} ${r2(cy)}L${r2(cx + Math.cos(a) * r * 0.79)} ${r2(cy + Math.sin(a) * r * 0.79)}`; }
  return [
    { t: 'p', d: circP(cx, cy, r), fill: rind },
    { t: 'p', d: circP(cx, cy, r * 0.88), fill: '#FFF3DC' },
    { t: 'p', d: circP(cx, cy, r * 0.8), fill: flesh },
    { t: 'p', d: seg, stroke: '#FFF3DC', sw: r * 0.055 },
    { t: 'p', d: circP(cx, cy, r * 0.09), fill: '#FFF3DC' },
  ];
}
// cành mai: nhánh cong + hoa + nụ
function maiBranch(x0: number, y0: number, x1: number, y1: number, bend: number, size: number, petal: string, center: string, wood: string): ArtItem[] {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2 + bend * 0.6;
  const at = (t: number) => ({ x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1 });
  const out: ArtItem[] = [{ t: 'p', d: `M${r2(x0)} ${r2(y0)}Q${r2(mx)} ${r2(my)} ${r2(x1)} ${r2(y1)}`, stroke: wood, sw: size * 0.12 }];
  const tw = at(0.45), tw2 = { x: tw.x + bend * 0.5, y: tw.y - Math.abs(bend) * 0.45 };
  out.push({ t: 'p', d: `M${r2(tw.x)} ${r2(tw.y)}L${r2(tw2.x)} ${r2(tw2.y)}`, stroke: wood, sw: size * 0.07 });
  for (const [t, sc] of [[0.25, 1], [0.55, 0.85], [0.8, 1.05], [1, 0.7]] as const) { const p = at(t); out.push(...flower(p.x, p.y, size * sc, petal, center)); }
  out.push(...flower(tw2.x, tw2.y, size * 0.7, petal, center));
  for (const t of [0.38, 0.68, 0.92]) { const p = at(t); out.push({ t: 'p', d: circP(p.x + size * 0.5, p.y - size * 0.35, size * 0.2), fill: petal }); }
  return out;
}
// đồng xu lỗ vuông (hoạ tiết Tết)
function coin(cx: number, cy: number, r: number, color: string, op: number): ArtItem {
  return { t: 'p', d: circP(cx, cy, r) + rectP(cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.6), fill: color, op, eo: true };
}
// vân thực vật mảnh (mỹ phẩm)
function botanical(x: number, y: number, len: number, a: number, color: string, sw: number): ArtItem[] {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
  const c1x = x + Math.cos(a) * len * 0.35 + nx * len * 0.12, c1y = y + Math.sin(a) * len * 0.35 + ny * len * 0.12;
  const out: ArtItem[] = [{ t: 'p', d: `M${r2(x)} ${r2(y)}Q${r2(c1x)} ${r2(c1y)} ${r2(ex)} ${r2(ey)}`, stroke: color, sw }];
  for (let i = 1; i <= 6; i++) {
    const t = i / 7, px = x + (ex - x) * t + nx * len * 0.06 * Math.sin(t * Math.PI), py = y + (ey - y) * t + ny * len * 0.06 * Math.sin(t * Math.PI);
    const side = i % 2 ? 1 : -1, la = a + side * 0.75, ll = len * 0.16 * (1 - t * 0.4);
    out.push({ t: 'p', d: leafP(px, py, ll, la), stroke: color, sw: sw * 0.85 });
  }
  return out;
}
function scallops(y: number, w: number, r: number, color: string): ArtItem {
  const n = Math.ceil(w / (2 * r)) + 1;
  let d = `M0 0V${r2(y)}`;
  for (let i = 0; i < n; i++) d += `a${r2(r)} ${r2(r)} 0 0 0 ${r2(2 * r)} 0`;
  d += `V0Z`;
  return { t: 'p', d, fill: color };
}
function barcodeArt(x: number, y: number, w: number, h: number): ArtItem[] {
  const pad = w * 0.08, bw = w - pad * 2, unit = bw / 95;
  let d = '', cx = x + pad, seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (cx < x + pad + bw - unit * 2) {
    const bar = 1 + Math.floor(rnd() * 3), gap = 1 + Math.floor(rnd() * 2);
    d += rectP(cx, y + h * 0.1, bar * unit, h * 0.66); cx += (bar + gap) * unit;
  }
  return [{ t: 'p', d: rectP(x, y, w, h), fill: '#FFFFFF' }, { t: 'p', d, fill: '#111111' }, ...T('8 935000 123456', x + w / 2, y + h * 0.94, h * 0.16, w * 0.9, BODY, 600, '#111111')];
}

// mảng thương hiệu: vòng logo + tên + gạch + mô tả + web
function heroArt(x: number, y: number, w: number, h: number, p: PkgPalette, f: PkgFont, d: PkgData, o: { brandColor?: string; ring?: boolean } = {}): ArtItem[] {
  const cx = x + w / 2, bc = o.brandColor || p.faceInk;
  if (w / h > 2) { // dải ngang thấp (hộp bánh dẹp): tên to + mô tả + web
    return [
      ...T(d.brand, cx, y + h * 0.5, h * 0.3, w * 0.8, f.family, f.weight, bc, { ls: 0.5 }),
      { t: 'p', d: rectP(cx - w * 0.04, y + h * 0.6, w * 0.08, 0.6), fill: p.accent },
      ...T(d.tagline, cx, y + h * 0.75, h * 0.1, w * 0.7, BODY, 600, p.faceInk, { op: 0.85 }),
      ...T(d.website, cx, y + h * 0.9, h * 0.075, w * 0.5, BODY, 600, p.accent, { ls: 0.3 }),
    ];
  }
  const m = Math.min(w, h), r = m * 0.13, cy = y + h * 0.3;
  return [
    ...(o.ring === false ? [] : [
      { t: 'p', d: circP(cx, cy, r), stroke: p.accent, sw: Math.max(0.5, r * 0.075) } as ArtItem,
      ...T(brandInitial(d.brand), cx, cy + r * 0.36, r * 0.98, r * 1.55, f.family, f.weight, p.accent),
    ]),
    ...T(d.brand, cx, y + h * 0.57, Math.min(w * 0.13, h * 0.1), w * 0.84, f.family, f.weight, bc, { ls: 0.3 }),
    { t: 'p', d: rectP(cx - w * 0.07, y + h * 0.615, w * 0.14, Math.max(0.5, h * 0.004)), fill: p.accent },
    ...T(d.tagline, cx, y + h * 0.69, Math.min(w * 0.055, h * 0.045), w * 0.8, BODY, 600, p.faceInk, { op: 0.85 }),
    ...T(d.website, cx, y + h * 0.88, Math.min(w * 0.045, h * 0.035), w * 0.6, BODY, 600, p.accent, { ls: 0.3 }),
  ];
}

export type CarryPanel = 'front' | 'back' | 'side' | 'roof' | 'handle' | 'gable' | 'bottom';
export function carryPanelSize(c: CarryDims, panel: CarryPanel): { w: number; h: number } {
  return { front: { w: c.w, h: c.h }, back: { w: c.w, h: c.h }, side: { w: c.d, h: c.h }, roof: { w: c.w, h: c.L }, handle: { w: c.w, h: c.hH }, gable: { w: c.d, h: c.rH }, bottom: { w: c.w, h: c.d } }[panel];
}

export function carryArt(panel: CarryPanel, spec: PkgSpec, data: PkgData): Art {
  const c = carryDims(pkgSize(spec.size));
  const p = pkgPalette(spec.palette), f = pkgFont(spec.font), look = spec.look || 'classic';
  const { w: W, h: H } = carryPanelSize(c, panel);
  const it: ArtItem[] = [];
  const add = (...a: ArtItem[]) => { it.push(...a); };
  const gold = p.accent;
  const darkWood = spec.palette === 'black' ? '#8A6A2E' : '#D6A445'; // cành mai nét vàng đồng — nổi trên nền đỏ/đen
  const petal = look === 'tet' && spec.palette === 'black' ? '#E9B949' : '#F6C443';
  const fresh = { rind: '#F08A1C', flesh: '#F9A63A', leaf: '#3E8E41', vein: '#2C6A30' };

  // ---- trang trí nền theo kiểu (dùng cho mặt trước/sau/hông) ----
  const decoWall = (strong: boolean) => {
    if (look === 'classic') {
      const ins = Math.min(5, W * 0.04);
      add({ t: 'p', d: rectP(ins, ins, W - ins * 2, H - ins * 2), stroke: p.accent, sw: 0.45, op: 0.5 });
    } else if (look === 'banh') {
      const r = W / (2 * Math.max(4, Math.round(W / 18)));
      for (let y = H * 0.2; y < H; y += 9) for (let x = (Math.round(y / 9) % 2) * 4.5 + 3; x < W; x += 9) add({ t: 'p', d: circP(x, y, 0.9), fill: p.accent, op: 0.13 });
      add(scallops(Math.max(6, H * 0.07), W, r, p.accent));
      add({ t: 'p', d: rectP(0, H - 3, W, 3), fill: p.accent, op: 0.85 });
    } else if (look === 'tet') {
      add({ t: 'p', d: rectP(5, 5, W - 10, H - 10), stroke: gold, sw: 0.9 });
      add({ t: 'p', d: rectP(7, 7, W - 14, H - 14), stroke: gold, sw: 0.35 });
      for (let y = 14; y < H - 10; y += 14) for (let x = (Math.round(y / 14) % 2) * 7 + 14; x < W - 10; x += 14) add(coin(x, y, 2.4, gold, 0.16));
      if (strong) {
        const s = Math.min(W, H);
        add(...maiBranch(7, H * 0.3, W * 0.36, 7, -s * 0.06, s * 0.055, petal, '#9A3412', darkWood));
        add(...maiBranch(W - 7, H * 0.72, W * 0.66, H - 7, s * 0.06, s * 0.05, petal, '#9A3412', darkWood));
      } else add(...flower(W / 2, 16, 6, petal, '#9A3412'));
    } else if (look === 'fruit') {
      const s = Math.min(W, H);
      if (strong) {
        add(...leaf(W * 0.8, s * 0.12, s * 0.26, Math.PI * 0.95, fresh.leaf, fresh.vein), ...leaf(W * 0.84, s * 0.16, s * 0.22, Math.PI * 0.6, '#58A65B', fresh.vein));
        add(...citrus(W * 0.95, s * 0.05, s * 0.26, fresh.rind, fresh.flesh));
        add(...leaf(W * 0.1, H - s * 0.1, s * 0.2, -Math.PI * 0.2, fresh.leaf, fresh.vein));
        add(...citrus(W * 0.02, H - s * 0.02, s * 0.18, '#E5B02A', '#F7D154'));
      } else {
        add(...leaf(W * 0.5 - 4, 14, 13, Math.PI * 1.1, fresh.leaf, fresh.vein), ...citrus(W * 0.5 + 5, 14, 8, fresh.rind, fresh.flesh));
      }
      add({ t: 'p', d: rectP(0, H - 4, W, 4), fill: fresh.rind });
    } else if (look === 'beauty') {
      const s = Math.min(W, H);
      add({ t: 'p', d: rectP(4, 4, W - 8, H - 8), stroke: p.accent, sw: 0.25, op: 0.35 });
      if (strong) {
        add(...botanical(8, H - 6, s * 0.62, -Math.PI * 0.32, '#9C7353', 0.7));
        add(...botanical(W - 8, H - 6, s * 0.48, -Math.PI * 0.7, '#9C7353', 0.6));
      } else add(...botanical(W / 2, H - 8, s * 0.5, -Math.PI / 2, '#9C7353', 0.6));
    }
  };
  const brandColor = look === 'tet' ? gold : undefined;

  if (panel === 'front') {
    decoWall(true);
    const top = look === 'banh' ? H * 0.1 : look === 'fruit' ? H * 0.06 : 0;
    add(...heroArt(W * 0.1, top + H * 0.02, W * 0.8, H - top - H * 0.06, p, f, data, { brandColor }));
  } else if (panel === 'back') {
    decoWall(false);
    const bw = Math.min(W * 0.36, 38), bh = Math.min(H * 0.2, 20);
    const by = H - bh - Math.max(8, H * 0.08);
    add(...T(data.brand, W / 2, by * 0.38, Math.min(W * 0.08, by * 0.14), W * 0.7, f.family, f.weight, brandColor || p.faceInk));
    add(...T(data.note, W / 2, by * 0.56, Math.min(W * 0.045, by * 0.08), W * 0.78, BODY, 600, p.faceInk, { op: 0.85 }));
    add(...T(data.website, W / 2, by * 0.72, Math.min(W * 0.04, by * 0.07), W * 0.6, BODY, 600, p.accent, { ls: 0.3 }));
    add(...barcodeArt((W - bw) / 2, by, bw, bh));
  } else if (panel === 'side') {
    decoWall(false);
    const top = look === 'banh' ? H * 0.12 : 0;
    add(...heroArt(W * 0.08, top + H * 0.08, W * 0.84, (H - top) * 0.86, p, f, { ...data, website: data.website }, { brandColor }));
  } else if (panel === 'roof') {
    if (look === 'banh') {
      const n = Math.max(6, Math.round(W / 16)), sw = W / n;
      let d = ''; for (let i = 0; i < n; i += 2) d += rectP(i * sw, 0, sw, H);
      add({ t: 'p', d, fill: p.accent, op: spec.palette === 'kraft' ? 0.9 : 0.75 });
      const r = Math.min(H * 0.34, 22);
      add({ t: 'p', d: circP(W / 2, H * 0.52, r), fill: p.face }, { t: 'p', d: circP(W / 2, H * 0.52, r * 0.86), stroke: p.accent, sw: 0.6 });
      add(...T(brandInitial(data.brand), W / 2, H * 0.52 + r * 0.3, r * 0.8, r * 1.4, f.family, f.weight, p.accent));
    } else if (look === 'tet') {
      for (let y = 8; y < H - 4; y += 11) for (let x = (Math.round(y / 11) % 2) * 5.5 + 6; x < W - 4; x += 11) add(coin(x, y, 2.6, gold, 0.28));
      add({ t: 'p', d: rectP(0, H * 0.36, W, H * 0.32), fill: p.face });
      add({ t: 'p', d: rectP(0, H * 0.36, W, 0.5) + rectP(0, H * 0.68 - 0.5, W, 0.5), fill: gold });
      add(...T(data.tagline, W / 2, H * 0.56, H * 0.13, W * 0.8, f.family, f.weight, gold, { ls: 0.4 }));
    } else if (look === 'fruit') {
      for (let i = 0; i < Math.round(W / 34); i++) {
        const x = 14 + i * 34, y = i % 2 ? H * 0.25 : H * 0.78;
        add(...(i % 3 === 1 ? citrus(x, y, 6.5, fresh.rind, fresh.flesh) : leaf(x - 6, y + 3, 14, -0.5 - (i % 2) * 0.6, fresh.leaf, fresh.vein)));
      }
      add(...T(data.tagline, W / 2, H * 0.57, H * 0.14, W * 0.62, f.family, f.weight, p.faceInk));
    } else if (look === 'beauty') {
      add({ t: 'p', d: rectP(W * 0.2, H * 0.72, W * 0.6, 0.3), fill: p.accent, op: 0.5 });
      add(...T((data.tagline || '').toUpperCase(), W / 2, H * 0.6, H * 0.1, W * 0.7, BODY, 600, p.faceInk, { ls: 1.2, op: 0.85 }));
    } else {
      add({ t: 'p', d: rectP(0, H - 5, W, 1.2), fill: p.accent, op: 0.8 });
      add(...T(data.tagline, W / 2, H * 0.58, H * 0.14, W * 0.75, BODY, 600, p.faceInk, { op: 0.9 }));
    }
  } else if (panel === 'handle') {
    const below = c.holeTop + c.holeH, room = H - below;
    add(...T(data.brand, W / 2, below + room * 0.68, Math.min(room * 0.42, 11), W * 0.6, f.family, f.weight, look === 'tet' ? gold : p.faceInk, { ls: 0.4 }));
    const hx = (W - c.holeW) / 2;
    if (look === 'tet') { add(...flower(hx / 2 + 4, c.holeTop + c.holeH / 2, 7, petal, '#9A3412'), ...flower(W - hx / 2 - 4, c.holeTop + c.holeH / 2, 7, petal, '#9A3412')); }
    else if (look === 'fruit') { add(...citrus(hx / 2 + 4, c.holeTop + c.holeH / 2, 8, fresh.rind, fresh.flesh), ...leaf(W - hx / 2 - 10, c.holeTop + c.holeH / 2 + 4, 16, -0.4, fresh.leaf, fresh.vein)); }
    else if (look === 'banh') add({ t: 'p', d: rectP(0, H - 2.5, W, 2.5), fill: p.accent, op: 0.85 });
    else add({ t: 'p', d: rectP(W * 0.35, H - 4, W * 0.3, 0.5), fill: p.accent, op: 0.7 });
  } else if (panel === 'gable') {
    const r = Math.min(H * 0.2, 9), cy = H * 0.66;
    if (look === 'tet') add(...flower(W / 2, cy, r * 1.2, petal, '#9A3412'));
    else if (look === 'fruit') add(...citrus(W / 2, cy, r, fresh.rind, fresh.flesh));
    else {
      add({ t: 'p', d: circP(W / 2, cy, r), stroke: p.accent, sw: 0.5 });
      add(...T(brandInitial(data.brand), W / 2, cy + r * 0.34, r * 0.95, r * 1.5, f.family, f.weight, p.accent));
    }
  }
  return { w: W, h: H, bg: p.face, items: it };
}

// vẽ Art vào SVG (đơn vị mm, cha tự scale)
export function ArtSvg({ art }: { art: Art }) {
  return (
    <>
      {art.items.map((a, i) => a.t === 'p'
        ? <path key={i} d={a.d} fill={a.fill ?? 'none'} stroke={a.stroke} strokeWidth={a.sw} opacity={a.op} fillRule={a.eo ? 'evenodd' : undefined} strokeLinecap="round" strokeLinejoin="round" />
        : <text key={i} x={a.x} y={a.y} fontFamily={`"${a.family}"`} fontWeight={a.weight} fontSize={a.size} fill={a.color} opacity={a.op} textAnchor={a.anchor ?? 'middle'} letterSpacing={a.ls} transform={a.rot ? `rotate(${a.rot} ${a.x} ${a.y})` : undefined}>{a.s}</text>)}
    </>
  );
}

// vẽ Art lên Canvas (k = px/mm) — dùng cho texture 3D
export function drawArt(ctx: CanvasRenderingContext2D, art: Art, k: number) {
  ctx.save(); ctx.scale(k, k);
  for (const a of art.items) {
    ctx.save(); ctx.globalAlpha = a.op ?? 1;
    if (a.t === 'p') {
      const path = new Path2D(a.d);
      if (a.fill) { ctx.fillStyle = a.fill; ctx.fill(path, a.eo ? 'evenodd' : 'nonzero'); }
      if (a.stroke) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.sw ?? 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
    } else {
      ctx.font = `${a.weight} ${a.size}px "${a.family}"`;
      ctx.fillStyle = a.color; ctx.textAlign = a.anchor === 'start' ? 'left' : a.anchor === 'end' ? 'right' : 'center'; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${a.ls || 0}px`;
      if (a.rot) { ctx.translate(a.x, a.y); ctx.rotate((a.rot * Math.PI) / 180); ctx.fillText(a.s, 0, 0); }
      else ctx.fillText(a.s, a.x, a.y);
    }
    ctx.restore();
  }
  ctx.restore();
}

// đường tay cầm (bo 2 góc trên) + lỗ xỏ tay hình viên thuốc — toạ độ mm, y xuống, gốc trên-trái của tấm quai
export function carryHandleOutline(c: CarryDims, x: number, y: number): string {
  const { w, hH, rc } = c;
  return `M${r2(x)} ${r2(y + hH)}V${r2(y + rc)}A${rc} ${rc} 0 0 1 ${r2(x + rc)} ${r2(y)}H${r2(x + w - rc)}A${rc} ${rc} 0 0 1 ${r2(x + w)} ${r2(y + rc)}V${r2(y + hH)}Z`;
}
export function carryHoleOutline(c: CarryDims, x: number, y: number): string {
  const r = c.holeH / 2, cx = x + c.w / 2, cy = y + c.holeTop + r, hw = c.holeW / 2 - r;
  return `M${r2(cx - hw)} ${r2(cy - r)}H${r2(cx + hw)}A${r} ${r} 0 0 1 ${r2(cx + hw)} ${r2(cy + r)}H${r2(cx - hw)}A${r} ${r} 0 0 1 ${r2(cx - hw)} ${r2(cy - r)}Z`;
}

const CARRY_BLEED = 3; // mm — nền tràn ra ngoài nét cắt

function CarryDieline({ spec, data, uid }: { spec: PkgSpec; data: PkgData; uid: string }) {
  const c = carryDims(pkgSize(spec.size));
  const p = pkgPalette(spec.palette);
  const { w, d, h, rH, L, hH, gf, bfF, bfS } = c;
  // cột (mm): Trước | Hông | Sau | Hông | Keo ; hàng: quai | mái | vách | đáy
  const m = 10;
  const x0 = m, x1 = x0 + w, x2 = x1 + d, x3 = x2 + w, x4 = x3 + d, x5 = x4 + gf;
  const yH = m, yR = yH + hH, yW = yR + L, yB = yW + h;
  const ins = gf * 0.3, insB = bfS * 0.45, tab = bfF * 0.2, bfMain = bfF - tab;
  const rc = c.rc;
  // đường cắt bao ngoài (1 nét liền)
  const outline = [
    `M${x0} ${yH + rc}A${rc} ${rc} 0 0 1 ${x0 + rc} ${yH}H${x1 - rc}A${rc} ${rc} 0 0 1 ${x1} ${yH + rc}`,
    `V${yW}L${x1 + d / 2} ${yW - rH}L${x2} ${yW}`,
    `V${yH + rc}A${rc} ${rc} 0 0 1 ${x2 + rc} ${yH}H${x3 - rc}A${rc} ${rc} 0 0 1 ${x3} ${yH + rc}`,
    `V${yW}L${x3 + d / 2} ${yW - rH}L${x4} ${yW}`,
    `L${x5} ${yW + ins}V${yB - ins}L${x4} ${yB}`,
    `L${x4 - insB} ${yB + bfS}H${x3 + insB}L${x3} ${yB}`,
    `V${yB + bfMain}H${x2 + w * 0.68}L${x2 + w * 0.64} ${yB + bfF}H${x2 + w * 0.36}L${x2 + w * 0.32} ${yB + bfMain}H${x2}`,
    `L${x2 - insB} ${yB + bfS}H${x1 + insB}L${x1} ${yB}`,
    `V${yB + bfMain}H${x0}Z`,
  ].join('');
  // khe khoá đáy trên tấm đáy trước (nhận lưỡi gài của tấm đáy sau)
  const slot = rectP(x0 + w * 0.34, yB + bfMain * 0.55, w * 0.32, 2);
  const holes = carryHoleOutline(c, x0, yH) + carryHoleOutline(c, x2, yH);

  const panels: { key: string; panel: CarryPanel; x: number; y: number; clip: string }[] = [
    { key: 'hf', panel: 'handle', x: x0, y: yH, clip: carryHandleOutline(c, x0, yH) },
    { key: 'hb', panel: 'handle', x: x2, y: yH, clip: carryHandleOutline(c, x2, yH) },
    { key: 'rf', panel: 'roof', x: x0, y: yR, clip: rectP(x0, yR, w, L) },
    { key: 'rb', panel: 'roof', x: x2, y: yR, clip: rectP(x2, yR, w, L) },
    { key: 'gl', panel: 'gable', x: x1, y: yW - rH, clip: `M${x1} ${yW}L${x1 + d / 2} ${yW - rH}L${x2} ${yW}Z` },
    { key: 'gr', panel: 'gable', x: x3, y: yW - rH, clip: `M${x3} ${yW}L${x3 + d / 2} ${yW - rH}L${x4} ${yW}Z` },
    { key: 'wf', panel: 'front', x: x0, y: yW, clip: rectP(x0, yW, w, h) },
    { key: 'ws', panel: 'side', x: x1, y: yW, clip: rectP(x1, yW, d, h) },
    { key: 'wb', panel: 'back', x: x2, y: yW, clip: rectP(x2, yW, w, h) },
    { key: 'ws2', panel: 'side', x: x3, y: yW, clip: rectP(x3, yW, d, h) },
  ];
  const id = (k: string) => `cc${uid}${k}`;
  const lbl = (x: number, y: number, t: string) => <text x={x} y={y} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={6.5} fill="#94A3B8" letterSpacing={0.5}>{t}</text>;
  const fold = (x1_: number, y1_: number, x2_: number, y2_: number) => <line x1={x1_} y1={y1_} x2={x2_} y2={y2_} stroke={FOLD} strokeWidth={0.7} strokeDasharray="3.5 3" />;

  return (
    <g transform={`scale(${U})`}>
      <defs>{panels.map((q) => <clipPath key={q.key} id={id(q.key)}><path d={q.clip} /></clipPath>)}</defs>
      {/* nền màu giấy tràn lề 3mm quanh toàn bộ nét cắt */}
      <path d={outline} fill={p.face} stroke={p.face} strokeWidth={CARRY_BLEED * 2} strokeLinejoin="round" />
      <path d={rectP(x4, yW, gf, h)} fill="#FFFFFF" opacity={0.55} />
      {panels.map((q) => (
        <g key={q.key} clipPath={`url(#${id(q.key)})`}>
          <g transform={`translate(${q.x} ${q.y})`}><ArtSvg art={carryArt(q.panel, spec, data)} /></g>
        </g>
      ))}
      {/* nét cắt */}
      <g stroke={CUT} strokeWidth={0.8} fill="none" strokeLinejoin="round">
        <path d={outline} /><path d={holes} /><path d={slot} />
      </g>
      {/* nét bế gấp */}
      {fold(x0, yR, x1, yR)}{fold(x2, yR, x3, yR)}
      {fold(x0, yW, x4, yW)}{fold(x0, yB, x4, yB)}
      {[x1, x2, x3, x4].map((x) => <g key={x}>{fold(x, yW, x, yB)}</g>)}
      {fold(x1, yB, x1 + insB * 1.6, yB + bfS * 0.95)}{fold(x3, yB, x3 + insB * 1.6, yB + bfS * 0.95)}
      {lbl(x0 + w / 2, yB + bfF + 7, 'MẶT TRƯỚC · ĐÁY CÓ KHE')}
      {lbl(x1 + d / 2, yB + bfS + 7, 'HÔNG')}
      {lbl(x2 + w / 2, yB + bfF + 7, 'MẶT SAU · LƯỠI GÀI ĐÁY')}
      {lbl(x3 + d / 2, yB + bfS + 7, 'HÔNG')}
      {lbl(x4 + gf / 2, yB + 7, 'KEO')}
      {lbl(x1 + d / 2, yR + 6, '2 QUAI DÁN ÁP NHAU')}
    </g>
  );
}
