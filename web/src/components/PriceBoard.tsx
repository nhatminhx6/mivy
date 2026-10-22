'use client';
// Bảng giá / menu: nhiều nhóm món, 2 cột giá (size M/L, lẻ/sỉ), nhãn HOT/MỚI, giá cũ gạch ngang.
// 4 bố cục khác hẳn nhau, vẽ bằng HTML ở đúng kích thước thật; tự co chữ / chia cột cho vừa khổ. Không AI.

import type { CSSProperties, ReactNode } from 'react';
import type { PosterColors } from '@/lib/infographic-engine';

export interface PLItem { name: string; price: string; price2?: string; desc?: string; badge?: '' | 'hot' | 'new'; old?: string }
export interface PLSection { title: string; cols?: [string, string]; items: PLItem[] }
export interface PriceData { title: string; subtitle?: string; note?: string; sections: PLSection[] }
export type PLLayout = 'menu' | 'chalk' | 'cards' | 'elegant';
export const PL_LAYOUTS: { id: PLLayout; name: string }[] = [
  { id: 'menu', name: 'Menu quán' }, { id: 'chalk', name: 'Bảng đen' }, { id: 'cards', name: 'Thẻ' }, { id: 'elegant', name: 'Tối giản sang' },
];
export type PLAspect = '4:5' | '9:16' | '1:1' | 'A4';
export const PL_ASPECTS: { id: PLAspect; name: string; w: number; h: number }[] = [
  { id: '4:5', name: 'Dọc 4:5', w: 1080, h: 1350 }, { id: '9:16', name: 'Story 9:16', w: 1080, h: 1920 },
  { id: '1:1', name: 'Vuông 1:1', w: 1080, h: 1080 }, { id: 'A4', name: 'A4 in', w: 1240, h: 1754 },
];
export const PL_FONT_CSS = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&family=Dancing+Script:wght@700&family=Playfair+Display:wght@700;800&display=swap');";

// Thứ tự thử (số cột, cỡ chữ) — chọn mức ĐẦU TIÊN vừa khổ. Menu ngắn được chữ to, menu dài tự chia cột + co chữ.
export const FIT_STEPS: [number, number][] = [
  [1, 1.15], [1, 1.07], [1, 1], [1, 0.92], [2, 1], [2, 0.92], [2, 0.85], [2, 0.78], [2, 0.72], [2, 0.66], [3, 0.7], [3, 0.64], [3, 0.58],
];
export const fitStart = (l: PLLayout) => (l === 'cards' ? FIT_STEPS.findIndex(([c]) => c === 2) : 0);

// ---------- dán nhanh: Excel (tab) / "Tên | Giá | Mô tả" / "Tên - 25k" ----------
export function normPrice(p: string): string {
  const s = p.trim();
  if (/^\d{4,}$/.test(s)) return Number(s).toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';
  return s;
}
export function parsePriceText(text: string): PLSection[] {
  const out: PLSection[] = [];
  let cur: PLSection | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const [t, a, b] = line.replace(/^#+/, '').split(/\t|\|/).map((x) => x.trim());
      cur = { title: t || 'Nhóm', items: [], ...(a && b ? { cols: [a, b] as [string, string] } : {}) };
      out.push(cur);
      continue;
    }
    if (!cur) { cur = { title: '', items: [] }; out.push(cur); }
    const parts = line.split(/\t|\|/).map((x) => x.trim());
    let it: PLItem;
    if (parts.length > 1) {
      it = cur.cols
        ? { name: parts[0], price: normPrice(parts[1] || ''), price2: normPrice(parts[2] || ''), desc: parts[3] || '' }
        : { name: parts[0], price: normPrice(parts[1] || ''), desc: parts[2] || '' };
    } else {
      const m = line.match(/^(.*?)[\s\-–:.…]+(\d[\d.,]*\s*(?:k|K|đ|₫|vnđ|VNĐ|VND|tr|triệu)?)\s*$/);
      it = m ? { name: m[1].trim(), price: normPrice(m[2]) } : { name: line, price: '' };
    }
    if (/\b(hot|best ?seller)\b|🔥/i.test(it.name)) { it.badge = 'hot'; it.name = it.name.replace(/\(?\b(hot|best ?seller)\b\)?|🔥/gi, '').trim(); }
    else if (/\(mới\)|\bnew\b/i.test(it.name)) { it.badge = 'new'; it.name = it.name.replace(/\(mới\)|\bnew\b/gi, '').trim(); }
    cur.items.push(it);
  }
  return out.filter((s) => s.items.length || s.title);
}
export function serializePriceText(sections: PLSection[]): string {
  return sections.map((s) => [
    `# ${s.title}${s.cols ? ` | ${s.cols[0]} | ${s.cols[1]}` : ''}`,
    ...s.items.map((i) => {
      const nm = i.name + (i.badge === 'hot' ? ' (hot)' : i.badge === 'new' ? ' (mới)' : '');
      return s.cols ? [nm, i.price, i.price2 || '', i.desc || ''].join(' | ').replace(/( \| )+$/, '') : [nm, i.price, i.desc || ''].join(' | ').replace(/( \| )+$/, '');
    }),
  ].join('\n')).join('\n\n');
}

// ---------- vẽ ----------
export interface BoardBrand { name: string; logo?: string; contact?: string }
interface Tok { name: string; desc: string; leader: string; price: string; head: string; headFont: string; headSize: number; headWeight: number; badgeBg: string; badgeFg: string; nameFont?: string; pricePill?: string; sectionCard?: CSSProperties }

const B = "'Be Vietnam Pro', sans-serif";
const SCRIPT = "'Dancing Script', cursive";
const SERIF = "'Playfair Display', serif";

function Section({ s, sec, t }: { s: (n: number) => number; sec: PLSection; t: Tok }) {
  const pw = s(t.pricePill ? 118 : 104);
  return (
    <div style={{ breakInside: 'avoid', marginBottom: s(30), ...t.sectionCard }}>
      {(sec.title || sec.cols) && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: s(10), marginBottom: s(10) }}>
          <div style={{ flex: 1, minWidth: 0, fontFamily: t.headFont, fontWeight: t.headWeight, fontSize: s(t.headSize), lineHeight: 1.1, color: t.head }}>{sec.title}</div>
          {sec.cols?.map((c) => <div key={c} style={{ width: pw, flex: 'none', textAlign: 'right', fontWeight: 800, fontSize: s(18), letterSpacing: '0.08em', color: t.desc, textTransform: 'uppercase' }}>{c}</div>)}
        </div>
      )}
      {sec.items.filter((i) => i.name).map((it, k) => (
        <div key={k} style={{ padding: `${s(7)}px 0` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: s(10) }}>
            <span style={{ minWidth: 0, fontFamily: t.nameFont || B, fontWeight: 700, fontSize: s(26), lineHeight: 1.25, color: t.name }}>
              {it.name}
              {it.badge && <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: s(8), fontFamily: B, fontWeight: 800, fontSize: s(13), letterSpacing: '0.06em', padding: `${s(3)}px ${s(8)}px`, borderRadius: 99, background: t.badgeBg, color: t.badgeFg }}>{it.badge === 'hot' ? 'HOT' : 'MỚI'}</span>}
            </span>
            <span style={{ flex: '1 1 auto', minWidth: s(18), borderBottom: `${Math.max(2, s(3))}px dotted ${t.leader}`, transform: `translateY(-${s(7)}px)` }} />
            {it.old && <span style={{ flex: 'none', fontWeight: 500, fontSize: s(19), color: t.desc, textDecoration: 'line-through' }}>{it.old}</span>}
            {[it.price, ...(sec.cols ? [it.price2 || ''] : [])].map((p, j) => (
              <span key={j} style={{ width: sec.cols ? pw : undefined, flex: 'none', textAlign: 'right', fontWeight: 800, fontSize: s(25), color: t.price, whiteSpace: 'nowrap' }}>
                {t.pricePill && p ? <span style={{ background: t.pricePill, borderRadius: 99, padding: `${s(3)}px ${s(12)}px` }}>{p}</span> : p}
              </span>
            ))}
          </div>
          {it.desc && <div style={{ fontWeight: 500, fontSize: s(18), lineHeight: 1.35, color: t.desc, marginTop: s(2) }}>{it.desc}</div>}
        </div>
      ))}
    </div>
  );
}

const Illus = ({ id, size, style }: { id?: string; size: number; style: CSSProperties }) =>
  // eslint-disable-next-line @next/next/no-img-element
  id ? <img src={`/illustrations/fluent3d/${encodeURIComponent(id)}.png`} alt="" style={{ position: 'absolute', width: size, height: size, filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.18))', ...style }} /> : null;

export function PriceBoard({ data, layout, aspect, T, brand, illus = [], fit, bodyRef }: {
  data: PriceData; layout: PLLayout; aspect: PLAspect; T: PosterColors; brand: BoardBrand; illus?: string[];
  fit: [number, number]; bodyRef?: (el: HTMLDivElement | null) => void;
}) {
  const A = PL_ASPECTS.find((a) => a.id === aspect)!;
  const k = A.w / 1080;
  const [cols, d] = fit;
  const s = (n: number) => Math.round(n * d * k);
  const u = (n: number) => Math.round(n * k); // khung (không co theo mật độ)
  const dark = layout === 'chalk';
  const ink = dark ? '#ffffff' : T.deep;
  const sub = dark ? 'rgba(255,255,255,.72)' : T.deep + 'a6';

  const tok: Tok = layout === 'chalk'
    ? { name: '#ffffff', desc: 'rgba(255,255,255,.66)', leader: 'rgba(255,255,255,.3)', price: T.soft, head: T.soft, headFont: SCRIPT, headSize: 54, headWeight: 700, badgeBg: T.main, badgeFg: '#ffffff' }
    : layout === 'cards'
      ? { name: T.deep, desc: T.deep + '99', leader: T.soft, price: T.main, head: T.main, headFont: B, headSize: 32, headWeight: 900, badgeBg: T.main, badgeFg: '#ffffff', pricePill: T.tint2,
        sectionCard: { background: '#ffffff', borderRadius: u(28), padding: `${s(22)}px ${s(26)}px ${s(12)}px`, boxShadow: `0 ${u(14)}px ${u(30)}px ${T.main}1f`, border: `2px solid ${T.soft}` } }
      : layout === 'elegant'
        ? { name: T.deep, desc: T.deep + '8c', leader: T.deep + '40', price: T.deep, head: T.main, headFont: SERIF, headSize: 34, headWeight: 700, badgeBg: T.deep, badgeFg: '#ffffff' }
        : { name: T.deep, desc: T.deep + '99', leader: T.soft, price: T.main, head: T.deep, headFont: B, headSize: 34, headWeight: 900, badgeBg: '#ef4444', badgeFg: '#ffffff' };

  const bg = layout === 'chalk'
    ? `radial-gradient(circle at 18% 8%, #ffffff12 0%, transparent 38%), radial-gradient(circle at 85% 92%, #ffffff0d 0%, transparent 40%), ${T.deep}`
    : layout === 'cards' ? T.tint2
      : layout === 'elegant' ? `linear-gradient(180deg, #fffdf9 0%, ${T.tint} 100%)`
        : `radial-gradient(${T.soft} ${u(1.6)}px, transparent ${u(1.8)}px) 0 0/${u(28)}px ${u(28)}px, linear-gradient(180deg, ${T.tint} 0%, ${T.tint2} 100%)`;

  const logo = brand.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={brand.logo} alt="" style={{ height: u(56), maxWidth: u(180), objectFit: 'contain', background: '#ffffff', borderRadius: u(12), padding: u(6), boxSizing: 'border-box' }} />
    : null;
  const brandRow = (color: string) => (brand.name || logo) && (
    <div style={{ display: 'flex', alignItems: 'center', gap: u(12), justifyContent: layout === 'elegant' ? 'center' : 'flex-start' }}>
      {logo}
      {brand.name && <span style={{ fontWeight: 800, fontSize: u(28), color, letterSpacing: layout === 'elegant' ? '0.2em' : undefined, textTransform: layout === 'elegant' ? 'uppercase' : undefined }}>{brand.name}</span>}
    </div>
  );

  let header: ReactNode;
  if (layout === 'chalk') {
    header = (
      <div style={{ position: 'relative', textAlign: 'center' }}>
        {brandRow('#ffffff')}
        <div style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: u(118), lineHeight: 1.05, color: '#ffffff', marginTop: u(10) }}>{data.title}</div>
        {data.subtitle && <div style={{ fontWeight: 600, fontSize: u(22), letterSpacing: '0.3em', textTransform: 'uppercase', color: T.soft, marginTop: u(6) }}>{data.subtitle}</div>}
      </div>
    );
  } else if (layout === 'cards') {
    header = (
      <div style={{ margin: `-${u(56)}px -${u(56)}px 0`, padding: `${u(52)}px ${u(56)}px ${u(46)}px`, background: `linear-gradient(135deg, ${T.main}, ${T.deep})`, borderRadius: `0 0 ${u(44)}px ${u(44)}px`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -u(60), top: -u(80), width: u(320), height: u(320), borderRadius: '50%', background: '#ffffff14' }} />
        {brandRow('#ffffff')}
        <div style={{ position: 'relative', fontWeight: 900, fontSize: u(84), lineHeight: 1, letterSpacing: '-0.02em', color: '#ffffff', marginTop: u(18), maxWidth: '80%' }}>{data.title}</div>
        {data.subtitle && <div style={{ position: 'relative', fontWeight: 500, fontSize: u(26), color: 'rgba(255,255,255,.85)', marginTop: u(10) }}>{data.subtitle}</div>}
        <Illus id={illus[0]} size={u(170)} style={{ right: u(40), bottom: u(18) }} />
      </div>
    );
  } else if (layout === 'elegant') {
    header = (
      <div style={{ textAlign: 'center' }}>
        {brandRow(T.deep)}
        <div style={{ fontFamily: SERIF, fontWeight: 800, fontSize: u(92), lineHeight: 1.05, color: T.deep, marginTop: u(18) }}>{data.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(14), marginTop: u(14) }}>
          <span style={{ width: u(90), height: 2, background: T.main }} /><span style={{ width: u(12), height: u(12), background: T.main, transform: 'rotate(45deg)' }} /><span style={{ width: u(90), height: 2, background: T.main }} />
        </div>
        {data.subtitle && <div style={{ fontWeight: 500, fontSize: u(24), letterSpacing: '0.24em', textTransform: 'uppercase', color: sub, marginTop: u(14) }}>{data.subtitle}</div>}
      </div>
    );
  } else {
    header = (
      <div style={{ position: 'relative', textAlign: 'center', padding: `0 ${u(170)}px` }}>
        <Illus id={illus[0]} size={u(160)} style={{ left: 0, top: u(40), transform: 'rotate(-10deg)' }} />
        <Illus id={illus[1]} size={u(160)} style={{ right: 0, top: u(40), transform: 'rotate(10deg)' }} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>{brandRow(T.deep)}</div>
        <div style={{ fontWeight: 900, fontSize: u(92), lineHeight: 1, letterSpacing: '-0.03em', color: T.deep, marginTop: u(16) }}>{data.title}</div>
        {data.subtitle && <div style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: u(50), color: T.main, marginTop: u(6) }}>{data.subtitle}</div>}
      </div>
    );
  }

  const footer = (brand.contact || data.note) && (
    <div style={{ flex: 'none', marginTop: u(22), display: 'flex', flexWrap: 'wrap', justifyContent: layout === 'elegant' || layout === 'chalk' ? 'center' : 'space-between', gap: `${u(6)}px ${u(24)}px`, fontWeight: 600, fontSize: u(21), color: sub, textAlign: 'center' }}>
      {brand.contact && <span>{brand.contact}</span>}
      {data.note && <span style={{ fontStyle: 'italic', fontWeight: 500 }}>{data.note}</span>}
    </div>
  );

  const bodyStyle: CSSProperties = {
    flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginTop: u(layout === 'cards' ? 30 : 26),
    columnCount: cols, columnGap: u(layout === 'cards' ? 22 : 44), columnFill: 'auto',
    ...(layout === 'menu' ? { background: '#ffffff', borderRadius: u(32), border: `2px solid ${T.soft}`, padding: `${u(30)}px ${u(36)}px ${u(6)}px`, boxShadow: `0 ${u(18)}px ${u(40)}px ${T.main}14` } : {}),
    ...(layout === 'elegant' ? { padding: `0 ${u(cols === 1 ? 70 : 10)}px` } : {}),
  };

  return (
    <div style={{ width: A.w, height: A.h, boxSizing: 'border-box', padding: u(56), position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: bg, fontFamily: B, color: ink }}>
      {layout === 'chalk' && <div style={{ position: 'absolute', inset: u(26), border: `${u(3)}px dashed rgba(255,255,255,.18)`, borderRadius: u(22), pointerEvents: 'none' }} />}
      {layout === 'chalk' && <><Illus id={illus[0]} size={u(130)} style={{ left: u(50), top: u(44), transform: 'rotate(-12deg)' }} /><Illus id={illus[1]} size={u(130)} style={{ right: u(50), top: u(44), transform: 'rotate(12deg)' }} /></>}
      <div style={{ flex: 'none', position: 'relative' }}>{header}</div>
      <div ref={bodyRef} data-pl-body style={bodyStyle}>
        {data.sections.map((sec, i) => <Section key={i} s={s} sec={sec} t={tok} />)}
      </div>
      {footer}
    </div>
  );
}
