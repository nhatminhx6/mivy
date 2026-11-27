'use client';
// Standee mica mini để bàn: hình nhân vật / thú cưng / ảnh khách → bế viền theo hình (nở 2.5mm) + CHÂN CẮM ở đáy
// → đế mica (bầu dục / chữ nhật / đế in tên) có khe cắm khớp chân. Xuất file cắt (CutContour hình + đế + khe),
// lớp In + lớp lót trắng (mực trắng UV) + mặt sau (in 2 mặt). Mọi hình mẫu vẽ bằng code (linh vật chung, không bản quyền).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { diecutFromArt, trimAlpha, type CutResult } from './cutout-engine';

export const AS_P = 10;          // px ảnh / mm khi dựng hình (≈254dpi)
export const AS_BORDER = 2.5;    // viền mica trong quanh hình (mm)
export const AS_TAB_H = 5.5;     // chân cắm (mm) — đế dày 5mm
export const AS_BASE_T = 5;      // đế mica dày 5mm
export const AS_FIG_T = 3;       // thân mica 3mm
export const AS_SLOT_PLAY = 0.3; // dư khe cắm mỗi bên (mm)
const MARGIN = 15;               // lề trong CutResult (0.1mm) — khớp cutout-engine

// ---------- font ----------
export interface AsFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const AS_FONTS: AsFont[] = [
  { id: 'baloo', name: 'Baloo 2 (tròn, dễ thương)', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam Pro', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
  { id: 'vibes', name: 'Great Vibes (viết tay)', family: 'Great Vibes', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
];
export const asFont = (id: string) => AS_FONTS.find((f) => f.id === id) || AS_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const AS_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function useAsFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-as-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-as-fonts'; link.rel = 'stylesheet';
        link.href = AS_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Baloo 2"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '800 40px "Playfair Display"', '400 40px "Great Vibes"', '700 40px "Dancing Script"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu chữ đế ----------
export interface AsPalette { id: string; name: string; ink: string; accent: string }
export const AS_PALETTES: AsPalette[] = [
  { id: 'ink', name: 'Đen than', ink: '#1F2430', accent: '#E4572E' },
  { id: 'rose', name: 'Hồng phấn', ink: '#B3365B', accent: '#F28CA8' },
  { id: 'navy', name: 'Xanh navy', ink: '#1E3A6E', accent: '#4C8BF5' },
  { id: 'gold', name: 'Vàng đồng', ink: '#8A6420', accent: '#D4A940' },
  { id: 'mint', name: 'Xanh bạc hà', ink: '#13715F', accent: '#3CC2A0' },
  { id: 'purple', name: 'Tím', ink: '#5B2D9E', accent: '#A779F2' },
];
export const asPalette = (id: string) => AS_PALETTES.find((p) => p.id === id) || AS_PALETTES[0];

// ---------- nhân vật vẽ bằng code (linh vật chung) ----------
export type AsChar = 'cat' | 'corgi' | 'bear' | 'bunny' | 'bride' | 'groom' | 'idol' | 'astro' | 'dino' | 'grad' | 'mascot' | 'angelcat';
export const AS_CHARS: { id: AsChar; name: string }[] = [
  { id: 'cat', name: 'Mèo cam' }, { id: 'corgi', name: 'Cún corgi' }, { id: 'bear', name: 'Gấu nâu' }, { id: 'bunny', name: 'Thỏ hồng' },
  { id: 'bride', name: 'Cô dâu' }, { id: 'groom', name: 'Chú rể' }, { id: 'idol', name: 'Ca sĩ (idol)' }, { id: 'astro', name: 'Phi hành gia' },
  { id: 'dino', name: 'Khủng long' }, { id: 'grad', name: 'Tân cử nhân' }, { id: 'mascot', name: 'Linh vật cầm biển' }, { id: 'angelcat', name: 'Mèo thiên thần' },
];

const OL = 'stroke="#3B2A20" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"';
const eyes = (y: number, dx = 22, cx = 100) => `
  <ellipse cx="${cx - dx}" cy="${y}" rx="7.5" ry="9.5" fill="#2A211C"/><circle cx="${cx - dx + 2.5}" cy="${y - 3.5}" r="2.8" fill="#fff"/>
  <ellipse cx="${cx + dx}" cy="${y}" rx="7.5" ry="9.5" fill="#2A211C"/><circle cx="${cx + dx + 2.5}" cy="${y - 3.5}" r="2.8" fill="#fff"/>`;
const blush = (y: number, dx = 36, cx = 100) => `<ellipse cx="${cx - dx}" cy="${y}" rx="9" ry="5.5" fill="#FF8FA3" opacity=".55"/><ellipse cx="${cx + dx}" cy="${y}" rx="9" ry="5.5" fill="#FF8FA3" opacity=".55"/>`;
const smile = (y: number, cx = 100) => `<path d="M${cx - 9} ${y} q4.5 6 9 0 q4.5 6 9 0" fill="none" stroke="#3B2A20" stroke-width="2.6" stroke-linecap="round"/>`;
const chibiFace = (skin: string, y = 96) => `<circle cx="100" cy="${y}" r="52" fill="${skin}" ${OL}/>${eyes(y + 8, 20)}${blush(y + 24, 32)}${smile(y + 26)}`;

function charBody(id: AsChar): string {
  switch (id) {
    case 'cat':
    case 'angelcat': {
      const halo = id === 'angelcat'
        ? `<ellipse cx="100" cy="22" rx="44" ry="11" fill="none" stroke="#F2C230" stroke-width="7"/><ellipse cx="100" cy="22" rx="44" ry="11" fill="none" stroke="#FFF1B0" stroke-width="2"/>
           <path d="M40 178 q-38 -30 -30 -70 q22 18 44 40 z" fill="#FFFFFF" ${OL}/><path d="M160 178 q38 -30 30 -70 q-22 18 -44 40 z" fill="#FFFFFF" ${OL}/>` : '';
      const fur = id === 'angelcat' ? '#E9E4DA' : '#F4A340', dark = id === 'angelcat' ? '#B9B1A3' : '#D9822B';
      return `${halo}
        <path d="M150 220 q46 -6 34 -56 q-6 -18 -18 -8 q8 30 -22 44 z" fill="${fur}" ${OL}/>
        <ellipse cx="100" cy="200" rx="58" ry="52" fill="${fur}" ${OL}/>
        <ellipse cx="100" cy="210" rx="32" ry="36" fill="#FFF0D8"/>
        <path d="M46 78 L56 26 L90 56 Z" fill="${fur}" ${OL}/><path d="M154 78 L144 26 L110 56 Z" fill="${fur}" ${OL}/>
        <path d="M58 64 L62 40 L80 56 Z" fill="#FFB3C0"/><path d="M142 64 L138 40 L120 56 Z" fill="#FFB3C0"/>
        <ellipse cx="100" cy="104" rx="64" ry="56" fill="${fur}" ${OL}/>
        <path d="M100 52 v16 M86 55 l4 13 M114 55 l-4 13" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
        ${eyes(108, 24)}${blush(128, 40)}
        <path d="M95 122 h10 l-5 6 z" fill="#FF7E93"/>${smile(130)}
        <path d="M44 120 l-26 -4 M44 128 l-26 4 M156 120 l26 -4 M156 128 l26 4" stroke="#3B2A20" stroke-width="2"/>
        <ellipse cx="78" cy="246" rx="17" ry="10" fill="${fur}" ${OL}/><ellipse cx="122" cy="246" rx="17" ry="10" fill="${fur}" ${OL}/>`;
    }
    case 'corgi':
      return `<ellipse cx="100" cy="204" rx="56" ry="48" fill="#E98A3C" ${OL}/>
        <ellipse cx="100" cy="212" rx="30" ry="34" fill="#FFF6EA"/>
        <path d="M48 84 L40 18 L92 58 Z" fill="#E98A3C" ${OL}/><path d="M152 84 L160 18 L108 58 Z" fill="#E98A3C" ${OL}/>
        <path d="M52 70 L50 36 L80 58 Z" fill="#FFC9A8"/><path d="M148 70 L150 36 L120 58 Z" fill="#FFC9A8"/>
        <ellipse cx="100" cy="106" rx="62" ry="54" fill="#E98A3C" ${OL}/>
        <path d="M100 56 C84 80 60 110 68 140 C80 160 120 160 132 140 C140 110 116 80 100 56 Z" fill="#FFF6EA"/>
        ${eyes(104, 26)}${blush(126, 42)}
        <ellipse cx="100" cy="128" rx="9" ry="6.5" fill="#2A211C"/><path d="M100 134 v6" stroke="#3B2A20" stroke-width="2.6"/>${smile(141)}
        <path d="M100 141 q0 12 8 10 q4 -4 -2 -10" fill="#FF7E93"/>
        <ellipse cx="78" cy="248" rx="16" ry="9" fill="#FFF6EA" ${OL}/><ellipse cx="122" cy="248" rx="16" ry="9" fill="#FFF6EA" ${OL}/>`;
    case 'bear':
      return `<ellipse cx="100" cy="202" rx="58" ry="52" fill="#9A6B47" ${OL}/>
        <ellipse cx="100" cy="210" rx="32" ry="34" fill="#E3C9A6"/>
        <circle cx="50" cy="56" r="22" fill="#9A6B47" ${OL}/><circle cx="150" cy="56" r="22" fill="#9A6B47" ${OL}/>
        <circle cx="50" cy="56" r="11" fill="#E3C9A6"/><circle cx="150" cy="56" r="11" fill="#E3C9A6"/>
        <ellipse cx="100" cy="104" rx="62" ry="56" fill="#9A6B47" ${OL}/>
        ${eyes(98, 26)}${blush(124, 42)}
        <ellipse cx="100" cy="126" rx="24" ry="18" fill="#E3C9A6"/><ellipse cx="100" cy="118" rx="9" ry="6.5" fill="#2A211C"/>${smile(129)}
        <ellipse cx="60" cy="196" rx="14" ry="20" fill="#9A6B47" ${OL} transform="rotate(25 60 196)"/><ellipse cx="140" cy="196" rx="14" ry="20" fill="#9A6B47" ${OL} transform="rotate(-25 140 196)"/>
        <path d="M86 160 q14 10 28 0 l-14 14 z" fill="#E4572E" ${OL}/>
        <ellipse cx="78" cy="248" rx="17" ry="10" fill="#9A6B47" ${OL}/><ellipse cx="122" cy="248" rx="17" ry="10" fill="#9A6B47" ${OL}/>`;
    case 'bunny':
      return `<path d="M70 66 C54 20 60 -6 78 2 C94 10 92 44 86 66 Z" fill="#FFFFFF" ${OL}/><path d="M130 66 C146 20 140 -6 122 2 C106 10 108 44 114 66 Z" fill="#FFFFFF" ${OL}/>
        <path d="M74 58 C66 28 68 12 77 14 C85 18 85 40 82 58 Z" fill="#FFC2D1"/><path d="M126 58 C134 28 132 12 123 14 C115 18 115 40 118 58 Z" fill="#FFC2D1"/>
        <ellipse cx="100" cy="204" rx="54" ry="50" fill="#FFFFFF" ${OL}/>
        <ellipse cx="100" cy="112" rx="60" ry="54" fill="#FFFFFF" ${OL}/>
        ${eyes(112, 24)}${blush(132, 40)}
        <path d="M95 128 h10 l-5 6 z" fill="#FF7E93"/>${smile(136)}
        <path d="M70 196 q30 22 60 0" fill="none" stroke="#FFB3C6" stroke-width="10" stroke-linecap="round"/>
        <circle cx="148" cy="62" r="9" fill="#FF8FB1" ${OL}/><circle cx="160" cy="60" r="9" fill="#FF8FB1" ${OL}/><circle cx="154" cy="62" r="4.5" fill="#FFD2E0"/>
        <ellipse cx="80" cy="248" rx="16" ry="9" fill="#FFFFFF" ${OL}/><ellipse cx="120" cy="248" rx="16" ry="9" fill="#FFFFFF" ${OL}/>`;
    case 'bride':
      return `<path d="M100 40 C30 46 26 170 40 250 L160 250 C174 170 170 46 100 40 Z" fill="#FFFFFF" opacity=".82" ${OL}/>
        <path d="M60 160 L40 252 L160 252 L140 160 Z" fill="#FFFFFF" ${OL}/>
        <path d="M60 160 q40 -14 80 0 l-6 22 q-34 -10 -68 0 z" fill="#F7E7EF" ${OL}/>
        <path d="M54 92 C50 40 150 40 146 92 C150 120 140 140 136 150 L64 150 C60 140 50 120 54 92 Z" fill="#3B2A20"/>
        ${chibiFace('#FFE0C8', 98)}
        <path d="M48 86 C54 46 146 46 152 86 C140 66 120 58 100 62 C80 58 60 66 48 86 Z" fill="#3B2A20"/>
        <circle cx="100" cy="44" r="14" fill="#3B2A20"/><path d="M80 50 q20 -14 40 0" fill="none" stroke="#F2C230" stroke-width="5"/>
        <circle cx="100" cy="200" r="20" fill="#FF8FB1" ${OL}/><circle cx="88" cy="194" r="8" fill="#FFC2D1"/><circle cx="110" cy="206" r="7" fill="#F2556F"/><path d="M92 216 l-6 18 M108 216 l6 18" stroke="#3F8F5A" stroke-width="5"/>`;
    case 'groom':
      return `<path d="M54 160 L46 252 L154 252 L146 160 Z" fill="#232838" ${OL}/>
        <path d="M100 160 L82 160 L100 210 L118 160 Z" fill="#FFFFFF" ${OL}/><path d="M90 166 l10 6 l10 -6 l-2 10 l-8 -4 l-8 4 z" fill="#C1272D"/>
        <path d="M100 210 v40" stroke="#151924" stroke-width="3"/><circle cx="100" cy="222" r="3" fill="#C9CDD3"/><circle cx="100" cy="236" r="3" fill="#C9CDD3"/>
        <path d="M128 178 l12 -4 l-2 12 z" fill="#FFFFFF"/><circle cx="134" cy="182" r="5" fill="#F2556F"/>
        ${chibiFace('#FFDCC0', 98)}
        <path d="M46 92 C42 40 158 40 154 92 C146 66 124 58 100 64 C82 58 60 62 52 80 Z" fill="#2A211C"/>
        <path d="M70 52 q30 -18 66 6 q-30 -6 -48 4 z" fill="#2A211C"/>`;
    case 'idol':
      return `<path d="M44 96 C38 30 162 30 156 96 C160 150 152 190 146 210 L54 210 C48 190 40 150 44 96 Z" fill="#5B3A8C"/>
        <path d="M64 168 L46 250 L154 250 L136 168 Z" fill="#FF6FA8" ${OL}/>
        <path d="M70 168 q30 18 60 0" fill="none" stroke="#FFE36E" stroke-width="5"/>
        <path d="M82 206 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 l13 -2 z" fill="#FFE36E"/>
        ${chibiFace('#FFE3D0', 98)}
        <path d="M46 90 C50 40 150 40 154 90 C140 70 122 60 100 66 C86 58 62 64 46 90 Z" fill="#5B3A8C"/>
        <path d="M120 54 l6 -18 l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 z" fill="#FFE36E" ${OL}/>
        <rect x="144" y="150" width="12" height="40" rx="5" fill="#2A2E35" ${OL} transform="rotate(-20 150 170)"/><circle cx="141" cy="148" r="11" fill="#C9CDD3" ${OL}/>
        <path d="M24 70 l4 10 l10 2 l-8 6 l2 10 l-8 -6 l-8 6 l2 -10 l-8 -6 l10 -2 z" fill="#FF9FCB"/>`;
    case 'astro':
      return `<rect x="50" y="150" width="100" height="96" rx="30" fill="#F4F5F7" ${OL}/>
        <rect x="74" y="172" width="52" height="34" rx="8" fill="#DDE3EC" ${OL}/><circle cx="88" cy="189" r="5" fill="#E4572E"/><circle cx="104" cy="189" r="5" fill="#4C8BF5"/><rect x="113" y="184" width="8" height="10" rx="2" fill="#F2C230"/>
        <rect x="36" y="160" width="26" height="60" rx="13" fill="#F4F5F7" ${OL}/><rect x="138" y="160" width="26" height="60" rx="13" fill="#F4F5F7" ${OL}/>
        <circle cx="100" cy="96" r="64" fill="#F4F5F7" ${OL}/>
        <ellipse cx="100" cy="100" rx="46" ry="40" fill="#1B2A4A" ${OL}/>
        <ellipse cx="100" cy="104" rx="32" ry="28" fill="#FFE0C8"/>${eyes(102, 13)}${smile(116)}
        <path d="M74 76 q16 -12 34 -6" fill="none" stroke="#9EC5FF" stroke-width="5" stroke-linecap="round" opacity=".8"/>
        <rect x="96" y="26" width="8" height="18" fill="#C9CDD3" ${OL}/><circle cx="100" cy="22" r="7" fill="#E4572E" ${OL}/>`;
    case 'dino':
      return `<path d="M150 214 q46 4 44 -34 q-14 12 -40 10 z" fill="#4CB26B" ${OL}/>
        <ellipse cx="100" cy="196" rx="58" ry="56" fill="#4CB26B" ${OL}/>
        <ellipse cx="100" cy="206" rx="32" ry="38" fill="#D9F2B8"/>
        <path d="M54 52 l10 -22 l12 20 l10 -24 l12 22 l12 -22 l10 24 l12 -20 l8 22" fill="#F2C230" ${OL}/>
        <ellipse cx="100" cy="100" rx="64" ry="54" fill="#4CB26B" ${OL}/>
        ${eyes(96, 26)}${blush(118, 42)}<path d="M82 126 q18 14 36 0" fill="none" stroke="#3B2A20" stroke-width="3" stroke-linecap="round"/>
        <circle cx="88" cy="116" r="2.6" fill="#2D6B3F"/><circle cx="112" cy="116" r="2.6" fill="#2D6B3F"/>
        <ellipse cx="62" cy="184" rx="9" ry="14" fill="#4CB26B" ${OL} transform="rotate(30 62 184)"/><ellipse cx="138" cy="184" rx="9" ry="14" fill="#4CB26B" ${OL} transform="rotate(-30 138 184)"/>
        <ellipse cx="78" cy="248" rx="18" ry="10" fill="#4CB26B" ${OL}/><ellipse cx="122" cy="248" rx="18" ry="10" fill="#4CB26B" ${OL}/>`;
    case 'grad':
      return `<path d="M56 160 L44 252 L156 252 L144 160 Z" fill="#1E2A44" ${OL}/>
        <path d="M84 160 L100 196 L116 160 Z" fill="#FFFFFF" ${OL}/>
        <rect x="118" y="186" width="42" height="14" rx="6" fill="#FFF6E2" ${OL} transform="rotate(-18 139 193)"/><rect x="134" y="186" width="6" height="16" fill="#C1272D" transform="rotate(-18 139 193)"/>
        ${chibiFace('#FFE0C8', 100)}
        <path d="M48 96 C46 56 154 56 152 96 C140 78 122 70 100 74 C80 70 60 76 48 96 Z" fill="#3B2A20"/>
        <path d="M30 52 L100 26 L170 52 L100 78 Z" fill="#1E2A44" ${OL}/><rect x="70" y="58" width="60" height="22" rx="4" fill="#1E2A44" ${OL}/>
        <path d="M158 56 v30" stroke="#F2C230" stroke-width="4"/><circle cx="158" cy="90" r="6" fill="#F2C230"/>`;
    case 'mascot':
      return `<rect x="28" y="30" width="144" height="72" rx="12" fill="#FFFFFF" ${OL}/><rect x="36" y="38" width="128" height="56" rx="8" fill="#FFF3C4"/>
        <rect x="58" y="100" width="8" height="40" fill="#B07A45" ${OL}/><rect x="134" y="100" width="8" height="40" fill="#B07A45" ${OL}/>
        <path d="M100 118 C40 118 34 186 46 226 C56 254 144 254 154 226 C166 186 160 118 100 118 Z" fill="#FFC93C" ${OL}/>
        ${eyes(170, 22)}${blush(190, 38)}<path d="M84 194 q16 16 32 0 z" fill="#C1272D" ${OL}/>
        <ellipse cx="58" cy="140" rx="12" ry="10" fill="#FFC93C" ${OL}/><ellipse cx="142" cy="140" rx="12" ry="10" fill="#FFC93C" ${OL}/>
        <ellipse cx="78" cy="250" rx="16" ry="8" fill="#F29E1F" ${OL}/><ellipse cx="122" cy="250" rx="16" ry="8" fill="#F29E1F" ${OL}/>`;
  }
}
export function charSvg(id: AsChar, px = 800): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 200 264" width="${px}" height="${Math.round(px * 1.32)}">${charBody(id)}</svg>`;
}
export const charDataUrl = (id: AsChar) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(charSvg(id, 400))}`;

// ---------- spec / mẫu ----------
export type AsKind = 'single' | 'couple' | 'text';
export type AsBase = 'oval' | 'rect' | 'name';
export type AsHeight = 80 | 100 | 120 | 150;
export const AS_HEIGHTS: AsHeight[] = [80, 100, 120, 150];
export const AS_BASES: { id: AsBase; name: string; hint: string }[] = [
  { id: 'oval', name: 'Đế bầu dục', hint: 'Mềm mại, hợp thú cưng / nhân vật' },
  { id: 'rect', name: 'Đế chữ nhật bo góc', hint: 'Gọn, đứng vững' },
  { id: 'name', name: 'Đế in tên (vòm trước)', hint: 'Mép trước cong, chữ to' },
];
export type AsBaseTint = 'clear' | 'white';
export interface AsSpec {
  tpl: string; kind: AsKind; chars: AsChar[]; height: AsHeight; base: AsBase; baseTint: AsBaseTint;
  white: boolean; sides: 1 | 2; font: string; palette: string;
}
export interface AsData { name: string; sub: string; topText: string; sign: string }
export interface AsTemplate { id: string; name: string; group: string; spec: Omit<AsSpec, 'tpl'>; data: AsData }

const T = (id: string, name: string, group: string, s: Partial<Omit<AsSpec, 'tpl'>>, data: AsData): AsTemplate => ({
  id, name, group,
  spec: { kind: 'single', chars: ['cat'], height: 100, base: 'oval', baseTint: 'clear', white: true, sides: 1, font: 'baloo', palette: 'ink', ...s },
  data,
});
export const AS_TEMPLATES: AsTemplate[] = [
  T('meo-cam', 'Mèo cam nhà mình', 'Thú cưng', { chars: ['cat'], palette: 'rose' }, { name: 'Mochi', sub: 'Boss của cả nhà', topText: '', sign: '' }),
  T('cun-corgi', 'Cún corgi', 'Thú cưng', { chars: ['corgi'], base: 'name', palette: 'gold' }, { name: 'Lu Lu', sub: 'Cún cưng 2 tuổi', topText: '', sign: '' }),
  T('gau-nau', 'Gấu bông', 'Quà tặng', { chars: ['bear'], base: 'rect', palette: 'ink', height: 80 }, { name: 'Gấu Bông', sub: 'Tặng Bảo Ngọc', topText: '', sign: '' }),
  T('tho-hong', 'Thỏ hồng', 'Quà tặng', { chars: ['bunny'], palette: 'rose', font: 'dancing' }, { name: 'Bé Thỏ', sub: 'Chúc mừng sinh nhật', topText: '', sign: '' }),
  T('cap-doi', 'Cô dâu chú rể', 'Cưới', { kind: 'couple', chars: ['bride', 'groom'], base: 'name', palette: 'gold', font: 'vibes', height: 120 }, { name: 'Quốc Bảo & Thu Hà', sub: 'Lễ thành hôn · 20.12.2026', topText: '', sign: '' }),
  T('idol', 'Idol fan merch', 'Fan merch', { chars: ['idol'], base: 'rect', palette: 'purple', height: 150 }, { name: 'AN NHIÊN', sub: 'LIVE TOUR 2026', topText: '', sign: '' }),
  T('tuong-niem', 'Tưởng niệm thú cưng', 'Thú cưng', { chars: ['angelcat'], base: 'oval', palette: 'navy', font: 'dancing' }, { name: 'Mãi nhớ Miu', sub: '2014 – 2026 · Ngủ ngoan nhé', topText: '', sign: '' }),
  T('cake-topper', 'Cake topper Mr & Mrs', 'Cưới', { kind: 'text', chars: [], base: 'oval', palette: 'gold', font: 'vibes', height: 80 }, { name: 'Gia Khánh & Bảo Ngọc', sub: '06.02.2027', topText: 'Mr & Mrs', sign: '' }),
  T('phi-hanh-gia', 'Phi hành gia nhí', 'Trẻ em', { chars: ['astro'], base: 'rect', palette: 'navy' }, { name: 'Gia Khánh', sub: 'Tương lai phi hành gia', topText: '', sign: '' }),
  T('khung-long', 'Khủng long', 'Trẻ em', { chars: ['dino'], base: 'oval', palette: 'mint', height: 80 }, { name: 'Bé Bin', sub: 'Tròn 3 tuổi', topText: '', sign: '' }),
  T('tot-nghiep', 'Tân cử nhân', 'Kỷ niệm', { chars: ['grad'], base: 'name', palette: 'navy', height: 120 }, { name: 'Thu Hà', sub: 'Tốt nghiệp 2026', topText: '', sign: '' }),
  T('mascot', 'Linh vật cửa hàng', 'Doanh nghiệp', { chars: ['mascot'], base: 'rect', palette: 'ink', height: 150, font: 'bvp' }, { name: 'AN KHANG CAFÉ', sub: '12 Nguyễn Huệ · 0909 123 456', topText: '', sign: 'XIN CHÀO!' }),
];
export const defaultAs = () => ({ spec: { ...AS_TEMPLATES[0].spec, tpl: AS_TEMPLATES[0].id } as AsSpec, data: { ...AS_TEMPLATES[0].data } });

// ---------- ảnh khách: tách nền đơn giản ----------
// Ảnh đã có nền trong suốt (PNG) → giữ. Ảnh có nền: loang từ mép theo màu 4 góc (tol = ngưỡng sai khác màu).
export function removeBg(img: HTMLImageElement, tol: number, maxPx = 1400): HTMLCanvasElement {
  const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, w, h);
  const id = x.getImageData(0, 0, w, h), a = id.data;
  let transparent = 0;
  for (let i = 0; i < w; i++) { if (a[i * 4 + 3] < 200) transparent++; if (a[((h - 1) * w + i) * 4 + 3] < 200) transparent++; }
  if (transparent > w * 0.3 || tol <= 0) return trimAlpha(c);
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((p) => [a[p * 4], a[p * 4 + 1], a[p * 4 + 2]]);
  const near = (p: number) => corners.some((cc) => Math.abs(a[p * 4] - cc[0]) + Math.abs(a[p * 4 + 1] - cc[1]) + Math.abs(a[p * 4 + 2] - cc[2]) < tol * 3);
  const seen = new Uint8Array(w * h); const st: number[] = [];
  for (let i = 0; i < w; i++) { st.push(i, (h - 1) * w + i); }
  for (let j = 0; j < h; j++) { st.push(j * w, j * w + w - 1); }
  while (st.length) {
    const p = st.pop()!;
    if (seen[p] || !near(p)) continue;
    seen[p] = 1; a[p * 4 + 3] = 0;
    const px = p % w, py = (p / w) | 0;
    if (px > 0) st.push(p - 1); if (px < w - 1) st.push(p + 1); if (py > 0) st.push(p - w); if (py < h - 1) st.push(p + w);
  }
  x.putImageData(id, 0, 0);
  return trimAlpha(c);
}

// ---------- dựng hình + đế ----------
export interface StandFig {
  res: CutResult;           // đường cắt (đơn vị 0.1mm) gồm cả chân cắm
  wMm: number; hMm: number; // khung cắt (mm) không gồm lề
  tabCx: number; tabW: number; // tâm + bề ngang chân cắm (mm, toạ độ khung res)
  bottom: number;           // đáy chân (mm, toạ độ khung res)
  whiteHref: string; backHref: string; // lớp lót trắng (đen = in trắng) + mặt sau (lật gương)
}
export interface StandBase { w: number; d: number; shape: AsBase; path: string; slots: { cx: number; cy: number; w: number; h: number }[]; textTop: number }
export interface StandResult { figs: StandFig[]; base: StandBase; key: string }

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const im = new Image(); im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await im.decode(); return im;
}

function drawTextFigure(text: string, font: AsFont, color: string, hPx: number): HTMLCanvasElement {
  const lines = (text || 'Mr & Mrs').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const c = document.createElement('canvas'); c.width = Math.round(hPx * 2.4); c.height = Math.round(hPx * 1.3);
  const x = c.getContext('2d')!;
  let size = hPx / (lines.length * 1.05);
  const fs = (s: number) => `${font.weight} ${s}px "${font.family}"`;
  x.font = fs(size);
  const wMax = c.width * 0.92;
  while (Math.max(...lines.map((l) => x.measureText(l).width)) > wMax && size > 10) { size *= 0.95; x.font = fs(size); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  lines.forEach((l, i) => {
    const y = c.height / 2 + (i - (lines.length - 1) / 2) * size * 1.0;
    x.lineWidth = size * 0.07; x.strokeStyle = color; x.strokeText(l, c.width / 2, y);
    x.fillStyle = color; x.fillText(l, c.width / 2, y);
  });
  // 2 trái tim nhỏ
  const heart = (hx: number, hy: number, s: number) => { x.beginPath(); x.moveTo(hx, hy + s * 0.3); x.bezierCurveTo(hx, hy, hx - s * 0.5, hy, hx - s * 0.5, hy + s * 0.3); x.bezierCurveTo(hx - s * 0.5, hy + s * 0.6, hx, hy + s * 0.8, hx, hy + s); x.bezierCurveTo(hx, hy + s * 0.8, hx + s * 0.5, hy + s * 0.6, hx + s * 0.5, hy + s * 0.3); x.bezierCurveTo(hx + s * 0.5, hy, hx, hy, hx, hy + s * 0.3); x.fill(); };
  x.fillStyle = color; heart(c.width * 0.1, c.height * 0.12, size * 0.28); heart(c.width * 0.9, c.height * 0.12, size * 0.22);
  return trimAlpha(c);
}

function signText(canvas: HTMLCanvasElement, sign: string, font: AsFont) {
  // vẽ chữ lên biển linh vật (biển nằm trong vùng 36..164 x 38..94 của viewBox 0 -4 200 264)
  const x = canvas.getContext('2d')!;
  const sx = canvas.width / 200, sy = canvas.height / 264;
  const bx = 40 * sx, by = 42 * sy, bw = 120 * sx, bh = 48 * sy;
  let size = bh * 0.62;
  const fs = (s: number) => `${font.weight} ${s}px "${font.family}"`;
  x.font = fs(size);
  while (x.measureText(sign).width > bw && size > 6) { size *= 0.94; x.font = fs(size); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3B2A20';
  x.fillText(sign, bx + bw / 2, by + bh / 2 + size * 0.04);
}

// đường cắt → điểm (mm, toạ độ khung res)
function pathPts(d: string): number[][] {
  const out: number[][] = [];
  const re = /[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g; let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push([+m[1] / 10, +m[2] / 10]);
  return out;
}

async function buildFigure(art: HTMLCanvasElement, heightMm: number): Promise<StandFig> {
  const P = AS_P, b = AS_BORDER;
  // nở canvas xuống dưới để vẽ chân cắm (chỉ dùng cho mặt nạ bế, không in)
  const tabW = Math.max(14, Math.min(40, (art.width / P) * 0.4));
  const extra = Math.round((AS_TAB_H + 1) * P);
  const W = art.width, H = art.height + extra;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const mask = mk(), only = mk();
  only.getContext('2d')!.drawImage(art, 0, 0);
  const mx = mask.getContext('2d')!;
  mx.drawImage(art, 0, 0);
  // đáy hình ở dải giữa → chân bắt đầu từ đó
  const a = art.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, art.width, art.height).data;
  let low = art.height * 0.8;
  for (let y = art.height - 1; y >= 0; y--) {
    let hit = false;
    for (let x = Math.round(art.width * 0.38); x < art.width * 0.62; x += 2) if (a[(y * art.width + x) * 4 + 3] > 30) { hit = true; break; }
    if (hit) { low = y; break; }
  }
  const tw = Math.max(4, (tabW - b * 2)) * P;
  mx.fillStyle = '#000';
  mx.fillRect(W / 2 - tw / 2, low - 3 * P, tw, art.height - low + 3 * P + (AS_TAB_H - b + 0.2) * P);
  const run = (size: number) => { const r = diecutFromArt(mask, { sizeMm: size, borderMm: b, edge: 'transparent', P }); return r; };
  let res = run(heightMm);
  const wMm0 = (res.w - MARGIN * 2) / 10, hMm0 = (res.h - MARGIN * 2) / 10;
  if (wMm0 > hMm0) res = run(heightMm * (wMm0 / hMm0));
  res.art.href = only.toDataURL('image/png');
  const wMm = (res.w - MARGIN * 2) / 10, hMm = (res.h - MARGIN * 2) / 10;
  // đo chân thật trên đường cắt
  const pts = pathPts(res.d);
  const bottom = Math.max(...pts.map((p) => p[1]));
  const band = pts.filter((p) => p[1] > bottom - AS_TAB_H * 0.55);
  const tx0 = Math.min(...band.map((p) => p[0])), tx1 = Math.max(...band.map((p) => p[0]));
  // lớp lót trắng (đen = vùng in mực trắng) + mặt sau lật gương
  const wc = mk(); const wx = wc.getContext('2d')!;
  wx.drawImage(art, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#000'; wx.fillRect(0, 0, W, H);
  const bc = mk(); const bx = bc.getContext('2d')!; bx.translate(W, 0); bx.scale(-1, 1); bx.drawImage(art, 0, 0);
  return { res, wMm, hMm, tabCx: (tx0 + tx1) / 2, tabW: tx1 - tx0, bottom, whiteHref: wc.toDataURL('image/png'), backHref: bc.toDataURL('image/png') };
}

function basePath(shape: AsBase, w: number, d: number): string {
  if (shape === 'oval') {
    const rx = w / 2, ry = d / 2;
    return `M0 ${ry} A${rx} ${ry} 0 1 1 ${w} ${ry} A${rx} ${ry} 0 1 1 0 ${ry} Z`;
  }
  if (shape === 'rect') {
    const r = Math.min(5, d * 0.2);
    return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${d - r} Q${w} ${d} ${w - r} ${d} H${r} Q0 ${d} 0 ${d - r} V${r} Q0 0 ${r} 0 Z`;
  }
  // đế in tên: mép sau thẳng bo góc, mép trước vòm ra
  const r = 4, bulge = d * 0.22, dd = d - bulge;
  return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${dd} Q${w / 2} ${d + bulge} 0 ${dd} V${r} Q0 0 ${r} 0 Z`;
}

export async function buildStand(spec: AsSpec, data: AsData, uploads: (HTMLImageElement | null)[], tol: number): Promise<StandResult> {
  const f = asFont(spec.font), pal = asPalette(spec.palette);
  const n = spec.kind === 'couple' ? 2 : 1;
  const contentH = Math.max(30, spec.height - AS_TAB_H - AS_BORDER * 2);
  const arts: HTMLCanvasElement[] = [];
  for (let i = 0; i < n; i++) {
    const up = uploads[i];
    let art: HTMLCanvasElement;
    if (up) art = removeBg(up, tol);
    else if (spec.kind === 'text') art = drawTextFigure(data.topText, f.script ? f : asFont('vibes'), pal.ink, contentH * AS_P * 0.6);
    else {
      const id = spec.chars[i] || spec.chars[0] || 'cat';
      const im = await loadSvgImage(charSvg(id, Math.round(contentH * AS_P / 1.32)));
      const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
      c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
      if (id === 'mascot' && data.sign) signText(c, data.sign, f);
      art = trimAlpha(c);
    }
    // co về đúng chiều cao nội dung (px = mm × P)
    const k = (contentH * AS_P) / art.height;
    const c2 = document.createElement('canvas'); c2.width = Math.max(1, Math.round(art.width * k)); c2.height = Math.round(contentH * AS_P);
    c2.getContext('2d')!.drawImage(art, 0, 0, c2.width, c2.height);
    arts.push(c2);
  }
  const figs: StandFig[] = [];
  for (const art of arts) figs.push(await buildFigure(art, spec.height));
  // đế: đủ rộng ôm các hình, khe cắm đặt hơi lùi sau để chừa chỗ in tên phía trước
  const gap = 4;
  const figsW = figs.reduce((s, g) => s + g.wMm, 0) + gap * (n - 1);
  const d = spec.height >= 120 ? 36 : spec.height >= 100 ? 32 : 28;
  const w = Math.round(Math.max(figsW * (spec.base === 'oval' ? 1.02 : 0.92), spec.base === 'name' ? 70 : 52, d * 1.7));
  const slotCy = d * 0.34;
  const slots: StandBase['slots'] = [];
  let x = w / 2 - figsW / 2;
  for (const g of figs) {
    slots.push({ cx: x + g.tabCx, cy: slotCy, w: g.tabW + AS_SLOT_PLAY * 2, h: AS_FIG_T + AS_SLOT_PLAY * 2 });
    x += g.wMm + gap;
  }
  const key = JSON.stringify([spec, data, uploads.map((u) => u?.src.length || 0), tol]);
  return { figs, base: { w, d, shape: spec.base, path: basePath(spec.base, w, d), slots, textTop: slotCy + 3.5 }, key };
}

// ---------- chữ in trên đế ----------
let mctx: CanvasRenderingContext2D | null = null;
const measure = (t: string, family: string, weight: number, size: number) => {
  if (typeof document === 'undefined') return Array.from(t).length * size * 0.58;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return Array.from(t).length * size * 0.58;
  mctx.font = `${weight} ${size}px "${family}"`;
  return mctx.measureText(t).width;
};
function fitSize(t: string, family: string, weight: number, maxW: number, maxSize: number, min = 2) {
  let s = maxSize;
  while (s > min && measure(t, family, weight, s) > maxW) s *= 0.95;
  return s;
}
// chữ trên mặt đế (toạ độ mm của đế); mode 'white' → tô đen để làm lớp lót trắng
export function BaseText({ base, data, spec, mode = 'ink' }: { base: StandBase; data: AsData; spec: AsSpec; mode?: 'ink' | 'white' }) {
  const f = asFont(spec.font), pal = asPalette(spec.palette);
  const ink = mode === 'white' ? '#000' : pal.ink, sub = mode === 'white' ? '#000' : pal.accent;
  const top = base.textTop, bottom = base.d - (base.shape === 'name' ? 1.5 : base.shape === 'oval' ? base.d * 0.12 : 2.5);
  const avail = Math.max(6, bottom - top);
  // bề ngang dùng được tại dải chữ (đế bầu dục hẹp dần về mép)
  const midY = top + avail * 0.45;
  const halfW = base.shape === 'oval' ? (base.w / 2) * Math.sqrt(Math.max(0.05, 1 - ((midY - base.d / 2) / (base.d / 2)) ** 2)) : base.w / 2 - 3;
  const maxW = halfW * 2 * 0.86;
  const clip = (value: string, family: string, weight: number, min: number) => {
    const chars = Array.from(value.trim());
    if (measure(chars.join(''), family, weight, min) <= maxW) return chars.join('');
    while (chars.length && measure(chars.join('') + '…', family, weight, min) > maxW) chars.pop();
    return chars.length ? chars.join('').trimEnd() + '…' : '';
  };
  const name = clip(data.name || '', f.family, f.weight, 2.2);
  const s2 = clip(data.sub || '', BODY, 600, 1.6);
  const nSize = name ? fitSize(name, f.family, f.weight, maxW, Math.min(avail * (s2 ? 0.58 : 0.8), f.script ? 11 : 8.5), 2.2) : 0;
  const sSize = s2 ? fitSize(s2, BODY, 600, maxW, Math.min(avail * 0.26, 3.6), 1.6) : 0;
  const total = nSize * (f.script ? 1.0 : 0.95) + (s2 ? sSize * 1.5 : 0);
  const y0 = top + (avail - total) / 2;
  return (
    <g data-as-basetext="1">
      {name && <text x={base.w / 2} y={y0 + nSize * (f.script ? 0.78 : 0.8)} textAnchor="middle" fontFamily={`'${f.family}'`} fontWeight={f.weight} fontSize={nSize} fill={ink}>{name}</text>}
      {s2 && <text x={base.w / 2} y={y0 + nSize * (f.script ? 1.0 : 0.95) + sSize * 1.2} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={600} fontSize={sSize} fill={sub} letterSpacing={0.2}>{s2}</text>}
    </g>
  );
}

// ---------- bản vẽ ----------
const CUT = '#EC008C';
// Tờ sản xuất (mm): hình đứng + đế (nhìn từ trên). mode: print (lớp In) | white (lót trắng) | back (mặt sau) | cut (chỉ đường cắt) | file (đủ lớp)
export function sheetLayout(r: StandResult) {
  const M = 8, gap = 8;
  const figsW = r.figs.reduce((s, g) => s + g.wMm + 3, 0) + gap * (r.figs.length - 1);
  const maxH = Math.max(...r.figs.map((g) => g.hMm + 3));
  const W = Math.round(Math.max(figsW, r.base.w + 3) + M * 2), H = Math.round(maxH + r.base.d + gap + 3 + M * 2 + 4);
  let x = M + (W - M * 2 - figsW) / 2;
  const figs = r.figs.map((g) => { const o = { x, y: M + (maxH - g.hMm - 3) }; x += g.wMm + 3 + gap; return o; });
  return { W, H, M, figs, base: { x: M + (W - M * 2 - r.base.w) / 2, y: M + maxH + gap } };
}
export function StandSheetSvg({ r, spec, data, mode, style }: { r: StandResult; spec: AsSpec; data: AsData; mode: 'print' | 'white' | 'back' | 'cut' | 'file'; style?: CSSProperties }) {
  const L = sheetLayout(r);
  const figImg = (kind: 'art' | 'white' | 'back') => r.figs.map((g, i) => {
    const art = g.res.art, o = L.figs[i];
    const href = kind === 'white' ? g.whiteHref : kind === 'back' ? g.backHref : art.href;
    return <g key={i} transform={`translate(${o.x} ${o.y}) scale(0.1)`} data-as-fig={i}><image href={href} x={art.x} y={art.y} width={art.w} height={art.h} preserveAspectRatio="none" /></g>;
  });
  const cuts = (
    <>
      {r.figs.map((g, i) => <path key={i} transform={`translate(${L.figs[i].x} ${L.figs[i].y}) scale(0.1)`} d={g.res.d} fill="none" stroke={CUT} strokeWidth={2.5} data-cut="fig" />)}
      <g transform={`translate(${L.base.x} ${L.base.y})`}>
        <path d={r.base.path} fill="none" stroke={CUT} strokeWidth={0.25} data-cut="base" />
        {r.base.slots.map((sl, i) => <rect key={i} x={sl.cx - sl.w / 2} y={sl.cy - sl.h / 2} width={sl.w} height={sl.h} fill="none" stroke={CUT} strokeWidth={0.25} data-cut="slot" />)}
      </g>
    </>
  );
  const baseText = (m: 'ink' | 'white') => <g transform={`translate(${L.base.x} ${L.base.y})`}><BaseText base={r.base} data={data} spec={spec} mode={m} /></g>;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${L.W} ${L.H}`} width={`${L.W}mm`} height={`${L.H}mm`} style={style} data-as-sheet={mode}>
      {mode === 'file' ? (
        <>
          <rect x={0} y={0} width={L.W} height={L.H} fill="#FFFFFF" />
          {spec.white && <g id="WhiteInk" opacity={0.22}>{figImg('white')}{baseText('white')}</g>}
          <g id="In">{figImg('art')}{baseText('ink')}</g>
          <g id="CutContour">{cuts}</g>
          <text x={L.M} y={L.H - 3} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.6} fill="#64748B">Standee mica cao {spec.height}mm · thân {AS_FIG_T}mm · đế {AS_BASE_T}mm · khe {r.base.slots.map((s) => `${s.w.toFixed(1)}×${s.h.toFixed(1)}`).join(', ')}mm · nét hồng = CutContour{spec.white ? ' · lớp WhiteInk = mực trắng lót' : ''}</text>
        </>
      ) : mode === 'cut' ? cuts : mode === 'white' ? <>{figImg('white')}{baseText('white')}</> : mode === 'back' ? figImg('back') : <>{figImg('art')}{baseText('ink')}</>}
    </svg>
  );
}

// Xem phẳng: mặt trước đứng trên đế (đế vẽ phối cảnh nhẹ, có chữ)
export function StandFrontSvg({ r, spec, data, style }: { r: StandResult; spec: AsSpec; data: AsData; style?: CSSProperties }) {
  const gap = 4;
  const figsW = r.figs.reduce((s, g) => s + g.wMm, 0) + gap * (r.figs.length - 1);
  const maxH = Math.max(...r.figs.map((g) => g.hMm));
  const sq = 0.42;                                  // nén chiều sâu đế cho cảm giác nhìn chéo
  const W = Math.max(figsW, r.base.w) + 16, baseH = r.base.d * sq + AS_BASE_T;
  const H = maxH + baseH + 10;
  const bx = (W - r.base.w) / 2, baseTop = 6 + maxH - AS_TAB_H + 0.5;
  let x = (W - figsW) / 2;
  const tint = spec.baseTint === 'white' ? 'rgba(255,255,255,0.96)' : 'rgba(214,232,240,0.55)';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} style={style} data-as-front="1">
      <defs>
        <linearGradient id="as-edge" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" /><stop offset="1" stopColor="#B9D6E2" stopOpacity="0.6" /></linearGradient>
      </defs>
      {r.figs.map((g, i) => {
        const ox = x, oy = 6 + (maxH - g.hMm);
        x += g.wMm + gap;
        const art = g.res.art;
        return (
          <g key={i} transform={`translate(${ox} ${oy}) scale(0.1) translate(${-15} ${-15})`}>
            <path d={g.res.d} fill="rgba(226,240,246,0.6)" stroke="#9FC3D1" strokeWidth={4} />
            <image href={art.href} x={art.x} y={art.y} width={art.w} height={art.h} preserveAspectRatio="none" />
          </g>
        );
      })}
      <g transform={`translate(${bx} ${baseTop - r.base.d * sq * 0.34})`}>
        <g transform={`scale(1 ${sq})`}>
          <path d={r.base.path} transform={`translate(0 ${AS_BASE_T / sq})`} fill="#9FB9C4" opacity={0.35} />
          <path d={r.base.path} fill={tint} stroke="url(#as-edge)" strokeWidth={0.8} />
          <BaseText base={r.base} data={data} spec={spec} />
        </g>
      </g>
    </svg>
  );
}

// Mặt trên đế (chỉ chữ, nền trong) — dùng làm texture 3D
export function BaseTopSvg({ r, spec, data, style }: { r: StandResult; spec: AsSpec; data: AsData; style?: CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${r.base.w} ${r.base.d}`} style={style} data-as-basetop="1">
      <BaseText base={r.base} data={data} spec={spec} />
    </svg>
  );
}
