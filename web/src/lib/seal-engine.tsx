'use client';
// Tem bảo hành · tem vỡ · tem niêm phong: 1 engine SVG = BỐ CỤC × BẢNG MÀU × CHẤT LIỆU → nhiều mẫu, render code 100%.
// Đơn vị: 10 = 1mm. Mỗi con tem có SỐ SERI riêng (tiền tố + số chạy) → xuất tờ A4 xếp sẵn, mỗi con 1 số,
// 2 lớp như file in–cắt sticker: "In" (hình + seri) và "CutContour" (đường bế, spot 100% Magenta).
// Hoạ tiết bảo mật (guilloche, rosette) vẽ bằng toán sin — trông như giấy chống giả thật, không cần ảnh.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

const U = 10; // đơn vị / mm
export const SEAL_BLEED_MM = 1; // nền tràn ra ngoài đường bế 1mm
export const CUTCONTOUR = '#EC008C';

export type SealKind = 'warranty' | 'seal';
export type SealShape = 'round' | 'rect';
export type SealMaterial = 'void' | 'holo' | 'paper';

export interface SealSize { id: string; kind: SealKind; shape: SealShape; name: string; wMm: number; hMm: number }
export const SEAL_SIZES: SealSize[] = [
  { id: 'r20', kind: 'warranty', shape: 'round', name: 'Tròn Ø20', wMm: 20, hMm: 20 },
  { id: 'r25', kind: 'warranty', shape: 'round', name: 'Tròn Ø25', wMm: 25, hMm: 25 },
  { id: 'r30', kind: 'warranty', shape: 'round', name: 'Tròn Ø30', wMm: 30, hMm: 30 },
  { id: 'q30', kind: 'warranty', shape: 'rect', name: '30 × 15', wMm: 30, hMm: 15 },
  { id: 'q40', kind: 'warranty', shape: 'rect', name: '40 × 20', wMm: 40, hMm: 20 },
  { id: 's80', kind: 'seal', shape: 'rect', name: '80 × 20', wMm: 80, hMm: 20 },
  { id: 's100', kind: 'seal', shape: 'rect', name: '100 × 25', wMm: 100, hMm: 25 },
  { id: 's120', kind: 'seal', shape: 'rect', name: '120 × 30', wMm: 120, hMm: 30 },
  { id: 'sr30', kind: 'seal', shape: 'round', name: 'Tròn Ø30', wMm: 30, hMm: 30 },
  { id: 'sr35', kind: 'seal', shape: 'round', name: 'Tròn Ø35', wMm: 35, hMm: 35 },
];
export const sealSize = (id: string) => SEAL_SIZES.find((s) => s.id === id) || SEAL_SIZES[0];

export interface SealMaterialInfo { id: SealMaterial; name: string; note: string }
export const SEAL_MATERIALS: SealMaterialInfo[] = [
  { id: 'void', name: 'Decal vỡ trắng', note: 'Bóc là vỡ vụn — chống bóc ra dán lại' },
  { id: 'holo', name: 'Decal bạc 7 màu', note: 'Hologram óng ánh, khó làm giả' },
  { id: 'paper', name: 'Decal giấy', note: 'Rẻ, in đẹp — dán niêm phong thường' },
];

export interface SealFont { id: string; name: string; family: string; weight: number }
export const SEAL_FONTS: SealFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
];
export const sealFont = (id: string) => SEAL_FONTS.find((f) => f.id === id) || SEAL_FONTS[0];
const BODY = 'Be Vietnam Pro';
const NUM = 'Oswald';

export const SEAL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&display=swap');`;

export function useSealFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-seal-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-seal-fonts'; link.rel = 'stylesheet';
        link.href = SEAL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Oswald"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export interface SealPalette { id: string; name: string; ink: string; ink2: string }
export const SEAL_PALETTES: SealPalette[] = [
  { id: 'red', name: 'Đỏ', ink: '#D7262F', ink2: '#7A1116' },
  { id: 'navy', name: 'Navy', ink: '#1F3A68', ink2: '#0E1D38' },
  { id: 'black', name: 'Đen', ink: '#17191E', ink2: '#000000' },
  { id: 'blue', name: 'Xanh dương', ink: '#1663C7', ink2: '#0B3A7A' },
  { id: 'orange', name: 'Cam', ink: '#E2560B', ink2: '#8A2E04' },
  { id: 'purple', name: 'Tím', ink: '#6D28D9', ink2: '#3B1380' },
  { id: 'teal', name: 'Xanh ngọc', ink: '#0F766E', ink2: '#073F3A' },
];
export const sealPalette = (id: string) => SEAL_PALETTES.find((p) => p.id === id) || SEAL_PALETTES[0];

export interface SealLayout { id: string; kind: SealKind; name: string; sizes: string[] }
export const SEAL_LAYOUTS: SealLayout[] = [
  { id: 'ring', kind: 'warranty', name: 'Vòng chữ', sizes: ['r20', 'r25', 'r30'] },
  { id: 'punch', kind: 'warranty', name: 'Bấm tháng', sizes: ['r25', 'r30'] },
  { id: 'badge', kind: 'warranty', name: 'Khiên', sizes: ['q30', 'q40'] },
  { id: 'void', kind: 'warranty', name: 'VOID', sizes: ['q30', 'q40'] },
  { id: 'grid', kind: 'warranty', name: 'Ô ngày tháng', sizes: ['q40', 'q30'] },
  { id: 'guilloche', kind: 'seal', name: 'Hoa văn bảo mật', sizes: ['s100', 's80', 's120'] },
  { id: 'band', kind: 'seal', name: 'Dải chữ chìm', sizes: ['s100', 's80', 's120'] },
  { id: 'stripe', kind: 'seal', name: 'Sọc cảnh báo', sizes: ['s100', 's80', 's120'] },
  { id: 'rosette', kind: 'seal', name: 'Ấn tròn', sizes: ['sr35', 'sr30'] },
];
export const sealLayout = (id: string) => SEAL_LAYOUTS.find((l) => l.id === id) || SEAL_LAYOUTS[0];

export interface SealSpec { kind: SealKind; layout: string; palette: string; font: string; size: string; material: SealMaterial }
export interface SealTemplate { id: string; name: string; spec: Omit<SealSpec, 'size'> & { size: string } }
const T = (layout: string, palette: string, material: SealMaterial, font = 'montserrat'): SealTemplate => {
  const l = sealLayout(layout);
  return { id: `${layout}-${palette}`, name: `${l.name} · ${sealPalette(palette).name}`, spec: { kind: l.kind, layout, palette, font, material, size: l.sizes[0] } };
};
export const SEAL_TEMPLATES: SealTemplate[] = [
  T('ring', 'red', 'void'), T('ring', 'navy', 'holo'), T('punch', 'black', 'void', 'oswald'), T('punch', 'blue', 'holo'),
  T('badge', 'navy', 'void'), T('void', 'red', 'void', 'oswald'), T('grid', 'purple', 'paper', 'bvp'),
  T('guilloche', 'red', 'void'), T('guilloche', 'navy', 'holo'), T('band', 'black', 'paper', 'oswald'),
  T('stripe', 'orange', 'void'), T('rosette', 'purple', 'holo'), T('rosette', 'teal', 'void', 'bvp'),
];

export type SealData = Record<string, string>;
export interface SealField { key: string; label: string; ph?: string; kinds: SealKind[]; half?: boolean }
export const SEAL_FIELDS: SealField[] = [
  { key: 'shop', label: 'Tên cửa hàng', ph: 'AN KHANG MOBILE', kinds: ['warranty'] },
  { key: 'months', label: 'Số tháng bảo hành', ph: '12', kinds: ['warranty'], half: true },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', kinds: ['warranty'], half: true },
  { key: 'voidText', label: 'Dòng cảnh báo', ph: 'Bóc là rách · Mất bảo hành', kinds: ['warranty'] },
  { key: 'brand', label: 'Thương hiệu', ph: 'AN KHANG COSMETICS', kinds: ['seal'] },
  { key: 'warn', label: 'Dòng cảnh báo', ph: 'Vui lòng không nhận hàng nếu tem rách', kinds: ['seal'] },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', kinds: ['seal'] },
];
export const defaultSealData = (): SealData => ({
  shop: 'AN KHANG MOBILE', months: '12', hotline: '0909 123 456', voidText: 'Bóc là rách · Mất bảo hành',
  brand: 'AN KHANG COSMETICS', warn: 'Vui lòng không nhận hàng nếu tem rách', website: 'ankhang.vn',
  prefix: 'AK', start: '1', count: '500',
});

// ---- số seri ----
export const serialOf = (data: SealData, i: number) => {
  const start = Math.max(0, parseInt(data.start || '1', 10) || 0);
  return `${(data.prefix || '').toUpperCase().slice(0, 4)}${String(start + i).padStart(6, '0')}`;
};
export const sealCount = (data: SealData) => Math.min(5000, Math.max(1, parseInt(data.count || '1', 10) || 1));

// ---- đo chữ thật (canvas, font đã nạp) ----
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number {
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width; // ở cỡ 100
}
// cỡ chữ lớn nhất ≤ size mà text vừa maxW
const fitSize = (text: string, family: string, weight: number, maxW: number, size: number, ls = 0) => {
  if (!text) return size;
  const w = (measure(text, family, weight) * size) / 100 + ls * Math.max(0, text.length - 1);
  return w > maxW ? Math.max(1, (size * maxW) / w) : size;
};

// ---- hoạ tiết bảo mật ----
const f1 = (n: number) => Math.round(n * 10) / 10;
// guilloche dải ngang: các sóng sin lệch pha đan nhau
function guillocheLines(x0: number, x1: number, cy: number, amp: number, lambda: number, n: number, mod = 0.35): string[] {
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const ph = (k / n) * Math.PI * 2;
    let d = '';
    for (let x = x0; x <= x1 + 0.1; x += lambda / 24) {
      const env = 1 - mod + mod * Math.cos((2 * Math.PI * (x - x0)) / (lambda * 5.3) + ph * 0.5);
      const y = cy + amp * env * Math.sin((2 * Math.PI * x) / lambda + ph);
      d += `${d ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    out.push(d);
  }
  return out;
}
// rosette tròn: bán kính dao động theo góc, nhiều lớp xoay pha
function rosettePaths(cx: number, cy: number, r0: number, a: number, k: number, n: number): string[] {
  const out: string[] = [];
  for (let j = 0; j < n; j++) {
    const ph = (j / n) * ((Math.PI * 2) / k);
    let d = '';
    const steps = 360;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const r = r0 + a * Math.sin(k * t + ph) * (0.88 + 0.12 * Math.cos(4 * t));
      d += `${s ? 'L' : 'M'}${f1(cx + r * Math.cos(t))} ${f1(cy + r * Math.sin(t))}`;
    }
    out.push(d + 'Z');
  }
  return out;
}

// chữ chạy vòng tròn: mỗi ký tự 1 <text> xoay quanh tâm (outline được, không cần textPath)
function RingText({ cx, cy, rt, segs, size, family, weight, fill }: { cx: number; cy: number; rt: number; segs: string[]; size: number; family: string; weight: number; fill: string }) {
  const circ = 2 * Math.PI * rt;
  const dot = size * 0.9; // chỗ cho chấm tròn ngăn cách
  let fs = size;
  const total = (s: number) => segs.reduce((a, t) => a + (measure(t, family, weight) * s) / 100 + s * 0.12 * t.length, 0) + segs.length * (dot * s) / size;
  if (total(fs) > circ * 0.96) fs = Math.max(size * 0.55, (fs * circ * 0.96) / total(fs));
  const used = total(fs);
  const extra = (circ - used) / Math.max(1, segs.reduce((a, t) => a + t.length, 0) + segs.length); // giãn đều cho đủ vòng
  const items: ReactNode[] = [];
  let pos = 0;
  segs.forEach((t, si) => {
    for (const ch of Array.from(t)) {
      const w = (measure(ch, family, weight) * fs) / 100 + fs * 0.12 + extra;
      const ang = ((pos + w / 2) / rt) * (180 / Math.PI);
      if (ch.trim()) items.push(<text key={`${si}-${pos}`} x={f1(cx)} y={f1(cy - rt + fs * 0.36)} textAnchor="middle" transform={`rotate(${f1(ang)} ${f1(cx)} ${f1(cy)})`} fontFamily={`"${family}"`} fontWeight={weight} fontSize={f1(fs)} fill={fill}>{ch}</text>);
      pos += w;
    }
    const dw = (dot * fs) / size + extra;
    const ang = ((pos + dw / 2) / rt);
    items.push(<circle key={`d${si}`} cx={f1(cx + rt * Math.sin(ang))} cy={f1(cy - rt * Math.cos(ang))} r={f1(fs * 0.13)} fill={fill} />);
    pos += dw;
  });
  return <g>{items}</g>;
}

const annulus = (cx: number, cy: number, ro: number, ri: number) =>
  `M${f1(cx - ro)} ${f1(cy)}a${f1(ro)} ${f1(ro)} 0 1 0 ${f1(ro * 2)} 0a${f1(ro)} ${f1(ro)} 0 1 0 ${f1(-ro * 2)} 0Z M${f1(cx - ri)} ${f1(cy)}a${f1(ri)} ${f1(ri)} 0 1 0 ${f1(ri * 2)} 0a${f1(ri)} ${f1(ri)} 0 1 0 ${f1(-ri * 2)} 0Z`;

const shieldPath = (x: number, y: number, s: number) =>
  `M${f1(x)} ${f1(y - s * 0.5)} L${f1(x + s * 0.42)} ${f1(y - s * 0.34)} L${f1(x + s * 0.42)} ${f1(y + s * 0.02)} C${f1(x + s * 0.42)} ${f1(y + s * 0.28)} ${f1(x + s * 0.2)} ${f1(y + s * 0.44)} ${f1(x)} ${f1(y + s * 0.52)} C${f1(x - s * 0.2)} ${f1(y + s * 0.44)} ${f1(x - s * 0.42)} ${f1(y + s * 0.28)} ${f1(x - s * 0.42)} ${f1(y + s * 0.02)} L${f1(x - s * 0.42)} ${f1(y - s * 0.34)} Z`;

export interface SerialSlot { x: number; y: number; size: number; anchor: 'start' | 'middle' | 'end'; fill: string; rotate?: number; maxW: number }

// Bố cục: trả về nội dung (đã trừ số seri) + vị trí số seri → tờ in vẽ seri riêng từng con
function compose(spec: SealSpec, data: SealData, W: number, H: number, b: number, ids: { clip: string; holo: string }, print: boolean): { body: ReactNode; slot: SerialSlot | null } {
  const p = sealPalette(spec.palette);
  const f = sealFont(spec.font);
  const TF = f.family, TW = f.weight;
  const round = sealSize(spec.size).shape === 'round';
  const holo = spec.material === 'holo';
  const base = holo ? (print ? 'none' : `url(#${ids.holo})`) : '#FFFFFF';
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) / 2;
  const months = (data.months || '').trim();
  const shop = (data.shop || '').trim().toUpperCase();
  const brand = (data.brand || '').trim().toUpperCase();
  const bleedShape = round
    ? <circle cx={cx} cy={cy} r={r + b} />
    : <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} rx={Math.min(12, H * 0.12) + b} />;
  const bg = <g fill={base}>{bleedShape}</g>;
  const clip = (n: ReactNode) => <g clipPath={`url(#${ids.clip})`}>{n}</g>;
  const ser = (x: number, y: number, size: number, anchor: SerialSlot['anchor'], fill: string, rotate?: number, maxW = W * 0.8): SerialSlot => ({ x, y, size, anchor, fill, rotate, maxW });
  const T = (x: number, y: number, text: string, o: { family?: string; weight?: number; size: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; maxW?: number; op?: number }) => {
    if (!text) return null;
    const fam = o.family || BODY, wt = o.weight || 600;
    const size = o.maxW ? fitSize(text, fam, wt, o.maxW, o.size, o.ls || 0) : o.size;
    return <text x={f1(x)} y={f1(y)} textAnchor={o.anchor || 'middle'} fontFamily={`"${fam}"`} fontWeight={wt} fontSize={f1(size)} fill={o.fill} letterSpacing={o.ls ? f1(o.ls) : undefined} opacity={o.op}>{text}</text>;
  };
  const chord = (dy: number, rr: number) => 2 * Math.sqrt(Math.max(0, rr * rr - dy * dy));

  switch (spec.layout) {
    case 'ring': {
      const bw = r * 0.25, ri = r - bw;
      const segs = ['BẢO HÀNH', shop || 'WARRANTY'];
      return {
        body: <>
          <circle cx={cx} cy={cy} r={ri} fill={base} />
          <path d={annulus(cx, cy, r + b, ri)} fill={p.ink} fillRule="evenodd" />
          <circle cx={cx} cy={cy} r={ri - r * 0.05} fill="none" stroke={p.ink} strokeWidth={f1(r * 0.018)} />
          <RingText cx={cx} cy={cy} rt={r - bw / 2} segs={segs} size={bw * 0.52} family={TF} weight={TW} fill="#FFFFFF" />
          {r * 2 >= 240 && T(cx, cy - r * 0.38, data.hotline || '', { size: r * 0.1, fill: p.ink2, maxW: chord(r * 0.42, ri) * 0.86 })}
          {months
            ? <>{T(cx, cy + r * 0.2, months, { family: NUM, weight: 700, size: r * 0.62, fill: p.ink, maxW: ri * 1.3 })}{T(cx, cy + r * 0.37, 'THÁNG', { weight: 800, size: r * 0.15, fill: p.ink2, ls: r * 0.02 })}</>
            : T(cx, cy + r * 0.1, 'BẢO HÀNH', { family: TF, weight: TW, size: r * 0.2, fill: p.ink, maxW: ri * 1.5 })}
        </>,
        slot: ser(cx, cy + r * 0.57, r * 0.125, 'middle', p.ink2, undefined, chord(r * 0.6, ri) * 0.86),
      };
    }
    case 'punch': {
      const bw = r * 0.27, ri = r - bw;
      const yy = new Date().getFullYear() % 100;
      return {
        body: <>
          <circle cx={cx} cy={cy} r={ri} fill={base} />
          <path d={annulus(cx, cy, r + b, ri)} fill={p.ink} fillRule="evenodd" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i + 1) / 12) * Math.PI * 2;
            const x = cx + (r - bw / 2) * Math.sin(a), y = cy - (r - bw / 2) * Math.cos(a);
            return <g key={i}>
              <circle cx={f1(x)} cy={f1(y)} r={f1(bw * 0.36)} fill="none" stroke="#FFFFFF" strokeWidth={f1(r * 0.014)} />
              <text x={f1(x)} y={f1(y + bw * 0.16)} textAnchor="middle" fontFamily={`"${NUM}"`} fontWeight={700} fontSize={f1(bw * 0.44)} fill="#FFFFFF">{i + 1}</text>
            </g>;
          })}
          {T(cx, cy - r * 0.2, 'BẢO HÀNH', { family: TF, weight: TW, size: r * 0.2, fill: p.ink, maxW: chord(r * 0.36, ri) * 0.92 })}
          {T(cx, cy - r * 0.03, months ? `${months} THÁNG · ${shop}` : shop, { weight: 800, size: r * 0.1, fill: p.ink2, maxW: chord(r * 0.1, ri) * 0.9 })}
          {[0, 1, 2].map((k) => {
            const bwid = r * 0.3, gap = r * 0.06, x = cx - (bwid * 3 + gap * 2) / 2 + k * (bwid + gap), y = cy + r * 0.07;
            return <g key={k}>
              <rect x={f1(x)} y={f1(y)} width={f1(bwid)} height={f1(r * 0.2)} rx={f1(r * 0.04)} fill="none" stroke={p.ink} strokeWidth={f1(r * 0.016)} />
              <text x={f1(x + bwid / 2)} y={f1(y + r * 0.155)} textAnchor="middle" fontFamily={`"${NUM}"`} fontWeight={700} fontSize={f1(r * 0.13)} fill={p.ink}>{`20${String((yy + k) % 100).padStart(2, '0')}`}</text>
            </g>;
          })}
        </>,
        slot: ser(cx, cy + r * 0.53, r * 0.11, 'middle', p.ink2, undefined, chord(r * 0.56, ri) * 0.86),
      };
    }
    case 'badge': {
      const bwid = H * 0.82, pad = H * 0.09, x0 = bwid + pad, mw = W - x0 - pad;
      return {
        body: <>
          {bg}
          {clip(<rect x={-b} y={-b} width={bwid + b} height={H + b * 2} fill={p.ink} />)}
          <path d={shieldPath(bwid / 2, H * 0.34, H * 0.42)} fill="#FFFFFF" />
          <path d={`M${f1(bwid / 2 - H * 0.09)} ${f1(H * 0.35)} l${f1(H * 0.065)} ${f1(H * 0.07)} l${f1(H * 0.12)} ${f1(-H * 0.13)}`} fill="none" stroke={p.ink} strokeWidth={f1(H * 0.045)} strokeLinecap="round" strokeLinejoin="round" />
          {T(bwid / 2, H * 0.82, months ? `${months} THÁNG` : 'BẢO HÀNH', { family: TF, weight: TW, size: H * 0.15, fill: '#FFFFFF', maxW: bwid - pad * 1.4 })}
          {T(x0, H * 0.3, 'TEM BẢO HÀNH', { family: TF, weight: TW, size: H * 0.17, fill: p.ink, anchor: 'start', maxW: mw })}
          {T(x0, H * 0.5, shop, { weight: 800, size: H * 0.12, fill: p.ink2, anchor: 'start', maxW: mw })}
          {T(x0, H * 0.67, data.hotline ? `Hotline ${data.hotline}` : '', { size: H * 0.095, fill: p.ink2, anchor: 'start', maxW: mw })}
          <line x1={f1(x0)} y1={f1(H * 0.74)} x2={f1(W - pad)} y2={f1(H * 0.74)} stroke={p.ink} strokeWidth={f1(H * 0.012)} opacity={0.5} />
        </>,
        slot: ser(x0, H * 0.9, H * 0.12, 'start', p.ink, undefined, mw),
      };
    }
    case 'void': {
      const band = H * 0.3, pad = H * 0.09;
      const word = 'VOID', ws = H * 0.11, step = ws * 2.9;
      const pat: ReactNode[] = [];
      let n = 0;
      for (let y = band + ws * 1.1; y < H + b; y += ws * 1.45) {
        const off = (n % 2) * step * 0.5;
        for (let x = -b - off; x < W + b; x += step) pat.push(<text key={`${n}-${f1(x)}`} x={f1(x)} y={f1(y)} fontFamily={`"${NUM}"`} fontWeight={700} fontSize={f1(ws)} fill={p.ink} opacity={0.09}>{word}</text>);
        n++;
      }
      return {
        body: <>
          {bg}
          {clip(<>{pat}<rect x={-b} y={-b} width={W + b * 2} height={band + b} fill={p.ink} /></>)}
          {T(cx, band * 0.68, months ? `BẢO HÀNH ${months} THÁNG` : 'BẢO HÀNH · WARRANTY', { family: TF, weight: TW, size: band * 0.5, fill: '#FFFFFF', maxW: W - pad * 2, ls: H * 0.006 })}
          {T(cx, H * 0.53, shop, { weight: 800, size: H * 0.15, fill: p.ink2, maxW: W - pad * 2 })}
          {T(cx, H * 0.7, data.voidText || '', { size: H * 0.1, fill: p.ink, maxW: W - pad * 2 })}
          {T(pad, H * 0.9, data.hotline || '', { size: H * 0.095, fill: p.ink2, anchor: 'start', maxW: W * 0.45 })}
        </>,
        slot: ser(W - pad, H * 0.9, H * 0.1, 'end', p.ink, undefined, W * 0.42),
      };
    }
    case 'grid': {
      const band = H * 0.27, pad = H * 0.08, lab = H * 0.13;
      const yy = new Date().getFullYear() % 100;
      const row = (y: number, label: string, vals: string[], h: number) => {
        const x0 = pad + lab, cw = (W - pad - x0) / vals.length;
        return <g>
          {T(pad + lab * 0.45, y + h * 0.72, label, { weight: 800, size: h * 0.62, fill: p.ink2 })}
          {vals.map((v, i) => <g key={i}>
            <rect x={f1(x0 + i * cw + cw * 0.06)} y={f1(y)} width={f1(cw * 0.88)} height={f1(h)} rx={f1(h * 0.14)} fill="none" stroke={p.ink} strokeWidth={f1(H * 0.011)} />
            <text x={f1(x0 + i * cw + cw / 2)} y={f1(y + h * 0.72)} textAnchor="middle" fontFamily={`"${NUM}"`} fontWeight={700} fontSize={f1(Math.min(h * 0.62, fitSize(v, NUM, 700, cw * 0.78, h * 0.62)))} fill={p.ink}>{v}</text>
          </g>)}
        </g>;
      };
      return {
        body: <>
          {bg}
          {clip(<rect x={-b} y={-b} width={W + b * 2} height={band + b} fill={p.ink} />)}
          {T(cx, band * 0.7, months ? `BẢO HÀNH ${months} THÁNG` : 'TEM BẢO HÀNH', { family: TF, weight: TW, size: band * 0.52, fill: '#FFFFFF', maxW: W - pad * 2 })}
          {row(H * 0.33, 'T', Array.from({ length: 12 }, (_, i) => String(i + 1)), H * 0.17)}
          {row(H * 0.55, 'N', Array.from({ length: 4 }, (_, i) => String((yy + i) % 100).padStart(2, '0')), H * 0.17)}
          {T(pad, H * 0.92, shop, { weight: 800, size: H * 0.1, fill: p.ink2, anchor: 'start', maxW: W * 0.5 })}
        </>,
        slot: ser(W - pad, H * 0.92, H * 0.1, 'end', p.ink, undefined, W * 0.4),
      };
    }
    case 'guilloche': {
      const pw = W * 0.58, ph = H * 0.7, px = cx - pw / 2, py = cy - ph / 2, end = (W - pw) / 2;
      const lines = [...guillocheLines(-b, W + b, cy, H * 0.42, H * 1.1, 9), ...guillocheLines(-b, W + b, cy, H * 0.3, H * 0.62, 7, 0.5)];
      return {
        body: <>
          {bg}
          {clip(<g fill="none" stroke={p.ink} strokeWidth={f1(H * 0.008)} opacity={0.55}>{lines.map((d, i) => <path key={i} d={d} />)}</g>)}
          <rect x={f1(-b)} y={f1(-b)} width={f1(W + b * 2)} height={f1(H * 0.06 + b)} fill={p.ink} clipPath={`url(#${ids.clip})`} />
          <rect x={f1(-b)} y={f1(H * 0.94)} width={f1(W + b * 2)} height={f1(H * 0.06 + b)} fill={p.ink} clipPath={`url(#${ids.clip})`} />
          <rect x={f1(px)} y={f1(py)} width={f1(pw)} height={f1(ph)} rx={f1(H * 0.08)} fill={holo && print ? 'none' : holo ? `url(#${ids.holo})` : '#FFFFFF'} stroke={p.ink} strokeWidth={f1(H * 0.018)} />
          {T(cx, py + ph * 0.4, 'NIÊM PHONG', { family: TF, weight: TW, size: ph * 0.33, fill: p.ink, maxW: pw * 0.9, ls: H * 0.008 })}
          {T(cx, py + ph * 0.63, brand, { weight: 800, size: ph * 0.16, fill: p.ink2, maxW: pw * 0.9 })}
          {T(cx, py + ph * 0.84, data.warn || '', { size: ph * 0.12, fill: p.ink2, maxW: pw * 0.92 })}
          <g transform={`rotate(-90 ${f1(end / 2)} ${f1(cy)})`}>{T(end / 2, cy + H * 0.04, 'SEALED', { family: NUM, weight: 700, size: end * 0.36, fill: p.ink, maxW: H * 0.78, ls: H * 0.01 })}</g>
        </>,
        slot: ser(W - end / 2, cy + end * 0.1, end * 0.3, 'middle', p.ink, 90, H * 0.8),
      };
    }
    case 'band': {
      const ms = H * 0.075;
      const micro = (y: number, w0: number, w1: number) => {
        let s = ''; const unit = 'NIÊM PHONG • SEALED • ';
        while ((measure(s, BODY, 800) * ms) / 100 < (w1 - w0) + ms * 10) s += unit;
        return <text x={f1(w0)} y={f1(y)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(ms)} fill="#FFFFFF" opacity={0.6}>{s}</text>;
      };
      const pad = H * 0.12;
      return {
        body: <>
          {clip(<rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.ink} />)}
          <g clipPath={`url(#${ids.clip})`}>{micro(H * 0.14, -b - ms * 3, W + b)}{micro(H * 0.93, -b - ms * 7, W * 0.74)}</g>
          <line x1={0} y1={f1(H * 0.2)} x2={f1(W)} y2={f1(H * 0.2)} stroke="#FFFFFF" strokeWidth={f1(H * 0.01)} opacity={0.5} />
          <line x1={0} y1={f1(H * 0.84)} x2={f1(W)} y2={f1(H * 0.84)} stroke="#FFFFFF" strokeWidth={f1(H * 0.01)} opacity={0.5} />
          {T(cx, H * 0.47, 'NIÊM PHONG', { family: TF, weight: TW, size: H * 0.25, fill: '#FFFFFF', maxW: W - pad * 2, ls: H * 0.01 })}
          {T(cx, H * 0.63, brand, { weight: 800, size: H * 0.115, fill: '#FFFFFF', maxW: W - pad * 2 })}
          {T(cx, H * 0.77, data.warn || '', { size: H * 0.085, fill: '#FFFFFF', maxW: W - pad * 2, op: 0.92 })}
          <rect x={f1(W * 0.77)} y={f1(H * 0.86)} width={f1(W * 0.23 + b)} height={f1(H * 0.14 + b)} fill={p.ink} />
        </>,
        slot: ser(W - pad * 0.6, H * 0.955, H * 0.095, 'end', '#FFFFFF', undefined, W * 0.21),
      };
    }
    case 'stripe': {
      const E = H * 0.9;
      const stripes = (x0: number) => {
        const out: ReactNode[] = [];
        for (let k = -3; k < (E + H) / (H * 0.22) + 3; k++) {
          const x = x0 + k * H * 0.22;
          out.push(<path key={`${x0}-${k}`} d={`M${f1(x)} ${f1(-b)} l${f1(H * 0.11)} 0 l${f1(-H - b * 2)} ${f1(H + b * 2)} l${f1(-H * 0.11)} 0 Z`} fill={p.ink2} />);
        }
        return out;
      };
      const mw = W - E * 2 - H * 0.2;
      return {
        body: <>
          {bg}
          {clip(<>
            <rect x={-b} y={-b} width={E + b} height={H + b * 2} fill={p.ink} />
            <rect x={W - E} y={-b} width={E + b} height={H + b * 2} fill={p.ink} />
            <clipPath id={`${ids.clip}-l`}><rect x={-b} y={-b} width={E + b} height={H + b * 2} /></clipPath>
            <clipPath id={`${ids.clip}-r`}><rect x={W - E} y={-b} width={E + b} height={H + b * 2} /></clipPath>
            <g clipPath={`url(#${ids.clip}-l)`}>{stripes(-b)}</g>
            <g clipPath={`url(#${ids.clip}-r)`}>{stripes(W - E)}</g>
          </>)}
          {T(cx, H * 0.42, 'NIÊM PHONG', { family: TF, weight: TW, size: H * 0.27, fill: p.ink, maxW: mw, ls: H * 0.01 })}
          {T(cx, H * 0.61, brand, { weight: 800, size: H * 0.125, fill: p.ink2, maxW: mw })}
          {T(cx, H * 0.77, data.warn || '', { size: H * 0.085, fill: p.ink2, maxW: mw })}
        </>,
        slot: ser(cx, H * 0.92, H * 0.09, 'middle', p.ink, undefined, W - H * 2),
      };
    }
    default: { // rosette — ấn tròn niêm phong
      const bw = r * 0.22, ri = r - bw, rc = r * 0.4;
      const ros = [...rosettePaths(cx, cy, (ri + rc) / 2, (ri - rc) * 0.4, 22, 14), ...rosettePaths(cx, cy, (ri + rc) / 2, (ri - rc) * 0.22, 11, 9)];
      return {
        body: <>
          <circle cx={cx} cy={cy} r={ri} fill={base} />
          <path d={annulus(cx, cy, r + b, ri)} fill={p.ink} fillRule="evenodd" />
          <g fill="none" stroke={p.ink} strokeWidth={f1(r * 0.0055)} opacity={0.6}>{ros.map((d, i) => <path key={i} d={d} />)}</g>
          <circle cx={cx} cy={cy} r={rc} fill={holo && print ? 'none' : holo ? `url(#${ids.holo})` : '#FFFFFF'} stroke={p.ink} strokeWidth={f1(r * 0.02)} />
          <RingText cx={cx} cy={cy} rt={r - bw / 2} segs={['NIÊM PHONG', brand || 'SEALED']} size={bw * 0.5} family={TF} weight={TW} fill="#FFFFFF" />
          {T(cx, cy - rc * 0.1, 'SEALED', { family: NUM, weight: 700, size: rc * 0.36, fill: p.ink, maxW: rc * 1.5, ls: r * 0.01 })}
        </>,
        slot: ser(cx, cy + rc * 0.45, rc * 0.24, 'middle', p.ink2, undefined, rc * 1.5),
      };
    }
  }
}

function SerialText({ slot, text }: { slot: SerialSlot; text: string }) {
  const size = fitSize(text, NUM, 700, slot.maxW, slot.size, slot.size * 0.06);
  return (
    <text x={f1(slot.x)} y={f1(slot.y)} textAnchor={slot.anchor} fontFamily={`"${NUM}"`} fontWeight={700} fontSize={f1(size)} fill={slot.fill} letterSpacing={f1(size * 0.06)}
      transform={slot.rotate ? `rotate(${slot.rotate} ${f1(slot.x)} ${f1(slot.y - size * 0.35)})` : undefined} data-serial="1">{text}</text>
  );
}

const HOLO_STOPS = ['#D9DCE6', '#F3C4E4', '#C3E3F7', '#CFF3D2', '#F6EDB9', '#DCCCF6', '#C9EEF0', '#D9DCE6'];

function useIds() { const u = useId().replace(/:/g, ''); return { clip: `${u}c`, holo: `${u}h` }; }

/** 1 con tem. print = bản in (tem bạc: không vẽ nền bạc — đó là chất liệu). serial = null → không vẽ seri. */
export function SealSvg({ spec, data, bleed = false, print = false, serial, cut = false, style, nested }: {
  spec: SealSpec; data: SealData; bleed?: boolean; print?: boolean; serial?: string | null; cut?: boolean; style?: CSSProperties;
  /** lồng trong tờ in (đơn vị 0.1mm): width/height theo đơn vị người dùng thay vì mm */
  nested?: boolean;
}) {
  const ids = useIds();
  const sz = sealSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U, b = bleed ? SEAL_BLEED_MM * U : 0;
  const { body, slot } = compose(spec, data, W, H, SEAL_BLEED_MM * U, ids, print);
  const sn = serial === undefined ? serialOf(data, 0) : serial;
  const r = Math.min(W, H) / 2;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} width={nested ? W + b * 2 : `${sz.wMm + (b * 2) / U}mm`} height={nested ? H + b * 2 : `${sz.hMm + (b * 2) / U}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-shape={sz.shape} data-stamp={nested ? '1' : undefined}>
      <defs>
        <linearGradient id={ids.holo} x1="0" y1="0" x2="1" y2="1">
          {HOLO_STOPS.map((c, i) => <stop key={i} offset={i / (HOLO_STOPS.length - 1)} stopColor={c} />)}
        </linearGradient>
        <clipPath id={ids.clip}>{sz.shape === 'round' ? <circle cx={W / 2} cy={H / 2} r={r + SEAL_BLEED_MM * U} /> : <rect x={-SEAL_BLEED_MM * U} y={-SEAL_BLEED_MM * U} width={W + SEAL_BLEED_MM * U * 2} height={H + SEAL_BLEED_MM * U * 2} rx={Math.min(12, H * 0.12) + SEAL_BLEED_MM * U} />}</clipPath>
        <clipPath id={`${ids.clip}t`}>{sz.shape === 'round' ? <circle cx={W / 2} cy={H / 2} r={r} /> : <rect x={0} y={0} width={W} height={H} rx={Math.min(12, H * 0.12)} />}</clipPath>
      </defs>
      <g id="In" clipPath={bleed ? undefined : `url(#${ids.clip}t)`}>
        {body}
        {slot && sn ? <SerialText slot={slot} text={sn} /> : null}
      </g>
      {cut && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
          <title>CutContour</title>
          {sz.shape === 'round' ? <circle cx={W / 2} cy={H / 2} r={r} /> : <rect x={0} y={0} width={W} height={H} rx={Math.min(12, H * 0.12)} />}
        </g>
      )}
    </svg>
  );
}

/** chỉ để lấy vị trí số seri (tờ in vẽ seri từng con) */
export function serialSlot(spec: SealSpec, data: SealData): SerialSlot | null {
  const sz = sealSize(spec.size);
  return compose(spec, data, sz.wMm * U, sz.hMm * U, SEAL_BLEED_MM * U, { clip: 'x', holo: 'y' }, true).slot;
}

// ---- tờ in A4: xếp lưới, mỗi con 1 số seri ----
export const SHEET = { wMm: 210, hMm: 297, marginMm: 7, gapMm: 3 };
export function sheetFit(spec: SealSpec) {
  const sz = sealSize(spec.size);
  const cols = Math.max(1, Math.floor((SHEET.wMm - SHEET.marginMm * 2 + SHEET.gapMm) / (sz.wMm + SHEET.gapMm)));
  const rows = Math.max(1, Math.floor((SHEET.hMm - SHEET.marginMm * 2 + SHEET.gapMm) / (sz.hMm + SHEET.gapMm)));
  const per = cols * rows;
  const x0 = (SHEET.wMm - (cols * sz.wMm + (cols - 1) * SHEET.gapMm)) / 2;
  const y0 = (SHEET.hMm - (rows * sz.hMm + (rows - 1) * SHEET.gapMm)) / 2;
  return { cols, rows, per, x0, y0, sz };
}
export const sheetPages = (spec: SealSpec, data: SealData) => Math.ceil(sealCount(data) / sheetFit(spec).per);

/**
 * Tờ in số `page` (0-based). Lớp In: hình tem (defs, dùng chung) + số seri RIÊNG từng con. Lớp CutContour: đường bế.
 * stampDefId: id nhóm defs chứa hình tem (để xuất file: thay bằng bản đã outline).
 */
export function SealSheetSvg({ spec, data, page = 0, withCut = true, style }: { spec: SealSpec; data: SealData; page?: number; withCut?: boolean; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = sheetFit(spec);
  const { sz } = fit;
  const W = SHEET.wMm * U, H = SHEET.hMm * U;
  const count = sealCount(data);
  const first = page * fit.per;
  const n = Math.max(0, Math.min(fit.per, count - first));
  const slot = serialSlot(spec, data);
  const r = (Math.min(sz.wMm, sz.hMm) * U) / 2;
  const cells = Array.from({ length: n }, (_, i) => ({
    x: (fit.x0 + (i % fit.cols) * (sz.wMm + SHEET.gapMm)) * U,
    y: (fit.y0 + Math.floor(i / fit.cols) * (sz.hMm + SHEET.gapMm)) * U,
    sn: serialOf(data, first + i),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${SHEET.wMm}mm`} height={`${SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={style} data-sheet-page={page} data-count={n}>
      <defs>
        <g id={`${u}-stamp`} data-stamp-def="1"><SealSvg spec={spec} data={data} bleed print serial={null} nested /></g>
        <g id={`${u}-cut`}>{sz.shape === 'round' ? <circle cx={r} cy={r} r={r} /> : <rect x={0} y={0} width={sz.wMm * U} height={sz.hMm * U} rx={Math.min(12, sz.hMm * U * 0.12)} />}</g>
      </defs>
      <g id="In">
        {cells.map((c, i) => <use key={i} href={`#${u}-stamp`} x={f1(c.x - SEAL_BLEED_MM * U)} y={f1(c.y - SEAL_BLEED_MM * U)}/>)}
        {slot && cells.map((c, i) => <g key={`s${i}`} transform={`translate(${f1(c.x)} ${f1(c.y)})`}><SerialText slot={slot} text={c.sn} /></g>)}
      </g>
      {withCut && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
          <title>CutContour</title>
          {cells.map((c, i) => <use key={i} href={`#${u}-cut`} x={f1(c.x)} y={f1(c.y)} />)}
        </g>
      )}
      <text x={f1(SHEET.marginMm * U)} y={f1(H - 25)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={22} fill="#9CA3AF">{`Mivy · tờ ${page + 1} · seri ${cells[0]?.sn || ''} đến ${cells[cells.length - 1]?.sn || ''} · ${n} con · ${sz.name}`}</text>
    </svg>
  );
}

// ---- ZIP (không nén) để gói nhiều tờ SVG ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (d: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = []; const central: Uint8Array[] = [];
  let off = 0;
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(lh.buffer), nm, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + sz;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}
