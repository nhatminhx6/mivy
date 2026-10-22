// Poster minh hoạ — 7 BỐ CỤC khác hẳn nhau, dùng chung 1 bộ nội dung (InfographicData) → user đổi bố cục không mất chữ.
// Render 100% bằng code (HTML/CSS + SVG vẽ tay) + hình 3D tĩnh trong kho /illustrations. Không gọi AI realtime.
// Khối chữ chính gắn data-b → QC Playwright kiểm không đè nhau / không tràn.

import { InfographicData, POSTER_THEMES, PosterThemeId, PosterVariant } from './infographic-engine';

// Ngoặc ĐƠN: nhét vào style="..." — ngoặc kép sẽ đóng attribute giữa chừng.
const FONT = "'Be Vietnam Pro', system-ui, sans-serif";
const SCRIPT = "'Dancing Script', cursive";
const CSS = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&family=Dancing+Script:wght@600;700&display=swap');";
const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sparkle = (size: number, color: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z" fill="${color}"/></svg>`;

export function renderPosterInfographic(data: InfographicData, themeId: PosterThemeId = 'blue', aspect: '1:1' | '4:5' | '9:16' = '4:5'): { w: number; h: number; css: string; html: string } {
  const W = 1080;
  const H = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
  const k = aspect === '1:1' ? 0.8 : aspect === '9:16' ? 1.08 : 1;
  const px = (n: number) => Math.round(n * k);
  const T = POSTER_THEMES.find((t) => t.id === themeId) || POSTER_THEMES[0];
  const v: PosterVariant = data.variant || 'split';
  const dark = v === 'bigdeal' || v === 'bento';
  const ink = dark ? '#ffffff' : T.deep;
  const accent = v === 'bigdeal' ? '#ffffff' : v === 'bento' ? T.soft : T.main;
  const maxItems = aspect === '1:1' ? 3 : 4;

  const hero = (data.hero || []).slice(0, 3);
  const cards = (data.cards || []).filter((c) => c.title).slice(0, 2);
  const c1 = cards[1];
  const items0 = (cards[0]?.items || []).filter((i) => i.text);
  const items1 = (c1?.items || []).filter((i) => i.text);
  const allItems = [...items0, ...items1];
  const brandName = (data.brand || '').replace(/^[^\p{L}\p{N}]+/u, '');

  // ---------- mảnh dùng chung ----------
  const shadow = `filter:drop-shadow(0 ${px(18)}px ${px(22)}px ${dark ? '#00000059' : T.deep + '2e'});`;
  const img = (id: string | undefined, s: number, style = '') =>
    id ? `<img src="/illustrations/fluent3d/${encodeURIComponent(id)}.png" alt="" style="display:block;width:${px(s)}px;height:${px(s)}px;${shadow}${style}"/>` : '';
  const at = (style: string, inner: string) => `<div style="position:absolute;${style}">${inner}</div>`;
  const iconBox = (icon: string | undefined, s: number, bg: string = T.tint2, border: string = T.soft) =>
    `<div style="width:${px(s)}px;height:${px(s)}px;flex:none;border-radius:${px(s * 0.28)}px;background:${bg};border:1.5px solid ${border};display:flex;align-items:center;justify-content:center;font-size:${px(s * 0.52)}px;">${esc(icon || '✦')}</div>`;
  const sub = (s: string | undefined, color = T.deep + '99', size = 18) =>
    s ? `<div style="font-weight:500;font-size:${px(size)}px;color:${color};line-height:1.3;margin-top:${px(3)}px;">${esc(s)}</div>` : '';
  const pill = () => data.kicker
    ? `<div style="display:inline-block;font-family:${SCRIPT};font-weight:700;font-size:${px(40)}px;color:${T.main};background:#ffffff;border:2px solid ${T.soft};border-radius:999px;padding:${px(2)}px ${px(30)}px ${px(6)}px;transform:rotate(-3deg);box-shadow:0 8px 20px #0000001a;">${esc(data.kicker)}</div>` : '';
  const title = (size: number, color: string, line2: string = color, align = 'left', br = true) =>
    `<h1 style="margin:${px(16)}px 0 0;font-weight:900;font-size:${px(size)}px;line-height:1;letter-spacing:-0.03em;color:${color};text-align:${align};">${esc(data.title)}${data.title2 ? `${br ? '<br/>' : ' '}<span style="color:${line2};">${esc(data.title2)}</span>` : ''}</h1>`;
  const swoosh = (w: number, color: string, center = false) =>
    `<svg width="${px(w)}" height="${px(22)}" viewBox="0 0 340 22" preserveAspectRatio="none" style="display:block;margin:${px(2)}px ${center ? 'auto' : '0'} 0;"><path d="M4 16 Q 120 2 336 10" stroke="${color}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/></svg>`;
  const tagline = (size: number, color: string, center = false) => data.tagline
    ? `<div style="margin-top:${px(8)}px;font-family:${SCRIPT};font-weight:700;font-size:${px(size)}px;line-height:1.05;color:${color};${center ? 'text-align:center;' : ''}">${esc(data.tagline)}</div>${swoosh(Math.min(340, size * 5.5), color, center)}` : '';

  const header = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;position:relative;z-index:4;">
    ${brandName ? `<div style="display:flex;align-items:center;gap:${px(12)}px;">
      <div style="width:${px(50)}px;height:${px(50)}px;border-radius:50%;background:${dark ? '#ffffff' : T.main};color:${dark ? T.main : '#ffffff'};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${px(24)}px;">${esc(brandName.charAt(0).toUpperCase())}</div>
      <div style="font-weight:900;font-size:${px(34)}px;letter-spacing:-0.01em;color:${ink};">${esc(brandName)}</div>
    </div>` : '<div></div>'}
    ${data.note ? `<div style="font-family:${SCRIPT};font-weight:700;font-size:${px(36)}px;line-height:0.95;color:${accent};text-align:center;max-width:${px(250)}px;transform:rotate(-7deg);margin-top:${px(6)}px;">${esc(data.note)}</div>` : ''}
  </div>`;

  const contacts = (data.contacts || []).filter(Boolean).slice(0, 2);
  const arrow = `<svg width="${px(110)}" height="${px(60)}" viewBox="0 0 110 60"><path d="M6 50 C 30 14, 70 8, 100 26" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M86 14 L102 27 L82 34" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const footer = (contacts.length || data.cta) ? `<div data-b style="margin-top:${px(24)}px;display:flex;align-items:center;gap:${px(24)}px;background:${dark ? '#ffffff1a' : '#ffffffb3'};border:1.5px solid ${dark ? '#ffffff33' : T.soft};border-radius:${px(24)}px;padding:${px(16)}px ${px(28)}px;position:relative;z-index:4;">
    <div style="flex:1 1 auto;min-width:0;">${contacts.map((c) => `<div style="font-weight:700;font-size:${px(23)}px;color:${ink};line-height:1.6;">${esc(c)}</div>`).join('')}</div>
    ${contacts.length && data.cta ? `<div style="width:2px;align-self:stretch;background:${dark ? '#ffffff33' : T.soft};"></div>` : ''}
    ${data.cta ? `<div style="display:flex;align-items:center;gap:${px(6)}px;">${arrow}<div style="font-family:${SCRIPT};font-weight:700;font-size:${px(38)}px;line-height:1;color:${accent};transform:rotate(-4deg);max-width:${px(300)}px;">${esc(data.cta)} <span style="font-family:${FONT};">♥</span></div></div>` : ''}
  </div>` : '';

  const spacer = (min = 16) => `<div style="flex:1 1 auto;min-height:${px(min)}px;"></div>`;
  const lightBg = `radial-gradient(circle at 80% 18%, #ffffff 0%, transparent 40%), radial-gradient(circle at 0% 100%, ${T.soft} 0%, transparent 42%), linear-gradient(180deg, ${T.tint} 0%, ${T.tint2} 100%)`;

  let bg = lightBg;
  let body = '';

  // ---------- 1. CỔ ĐIỂN: chữ trái + cụm 3D phải + 2 card ----------
  if (v === 'split') {
    const heroH = aspect === '1:1' ? 380 : aspect === '9:16' ? 620 : 500;
    const slots = [
      { s: 250, l: '50%', t: '52%', r: 0 },
      { s: 165, l: '77%', t: '22%', r: 9 },
      { s: 150, l: '22%', t: '80%', r: -9 },
    ];
    const cluster = hero.length ? `<div style="position:absolute;right:0;top:0;width:46%;height:${px(heroH)}px;">
      ${at(`left:50%;top:52%;width:${px(400)}px;height:${px(400)}px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ffffff 0%,#ffffffcc 45%,#ffffff00 72%);`, '')}
      ${at(`left:8%;top:6%;width:${px(170)}px;height:${px(130)}px;opacity:.35;background-image:radial-gradient(${T.main} 1.6px, transparent 1.8px);background-size:${px(20)}px ${px(20)}px;`, '')}
      ${at('left:4%;top:30%;', sparkle(px(34), T.main))}${at('right:6%;top:58%;', sparkle(px(24), T.main + 'aa'))}${at('left:58%;top:2%;', sparkle(px(20), T.soft))}
      ${hero.map((id, i) => at(`left:${slots[i].l};top:${slots[i].t};transform:translate(-50%,-50%) rotate(${slots[i].r}deg);`, img(id, slots[i].s))).join('')}
    </div>` : '';
    const slashes = `<svg width="${px(46)}" height="${px(40)}" viewBox="0 0 46 40" style="position:absolute;right:${px(26)}px;top:${px(22)}px;"><path d="M10 30 L18 8 M22 34 L32 6 M36 30 L42 14" stroke="${T.main}" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
    const cardsHtml = cards.map((c) => `<div data-b style="position:relative;background:#ffffff;border:2px solid ${T.soft};border-radius:${px(32)}px;padding:${px(28)}px ${px(30)}px ${px(18)}px;box-shadow:0 ${px(22)}px ${px(44)}px ${T.main}1f;">
      ${slashes}
      <div style="display:inline-block;font-weight:700;font-size:${px(22)}px;color:${T.main};background:${T.tint};border:1.5px solid ${T.soft};border-radius:999px;padding:${px(8)}px ${px(18)}px;">${esc(c.tag)}</div>
      <div style="font-weight:900;font-size:${px(50)}px;line-height:1.04;letter-spacing:-0.02em;color:${T.deep};margin:${px(16)}px 0 ${px(10)}px;">${esc(c.title)}</div>
      ${c.items.filter((it) => it.text).slice(0, maxItems).map((it, i) => `<div style="display:flex;align-items:center;gap:${px(16)}px;padding:${px(12)}px 0;${i ? `border-top:1.5px dashed ${T.soft};` : ''}">
        ${iconBox(it.icon, 54)}<div style="min-width:0;"><div style="font-weight:800;font-size:${px(25)}px;color:${T.deep};line-height:1.2;">${esc(it.text)}</div>${sub(it.sub, T.deep + '99', 19)}</div>
      </div>`).join('')}
    </div>`).join('');
    body = `<div style="position:relative;height:${px(heroH)}px;margin-top:${px(18)}px;">
      ${cluster}
      <div data-b style="position:relative;z-index:2;width:${hero.length ? '60%' : '100%'};padding-top:${px(18)}px;">${pill()}${title(92, T.deep)}${tagline(62, T.main)}</div>
    </div>
    ${spacer()}
    ${cardsHtml ? `<div style="display:grid;grid-template-columns:${cards.length > 1 ? '1fr 1fr' : '1fr'};gap:${px(24)}px;">${cardsHtml}</div>` : ''}`;
  }

  // ---------- 2. SÂN KHẤU: 1 vật thể to giữa + vòng quỹ đạo + chip nổi quanh ----------
  if (v === 'stage') {
    const pos = ['left:0;top:2%;transform:rotate(-2deg);', 'right:0;top:16%;transform:rotate(2deg);', 'left:0;bottom:14%;transform:rotate(2deg);', 'right:0;bottom:0;transform:rotate(-2deg);'];
    const chips = allItems.slice(0, 4).map((it, i) => `<div data-b style="position:absolute;${pos[i]}z-index:3;display:flex;align-items:center;gap:${px(12)}px;background:#ffffff;border:2px solid ${T.soft};border-radius:999px;padding:${px(10)}px ${px(26)}px ${px(10)}px ${px(10)}px;box-shadow:0 ${px(14)}px ${px(30)}px ${T.main}2b;max-width:${px(330)}px;">
      <div style="width:${px(54)}px;height:${px(54)}px;flex:none;border-radius:50%;background:${T.tint2};display:flex;align-items:center;justify-content:center;font-size:${px(28)}px;">${esc(it.icon || '✦')}</div>
      <div style="min-width:0;"><div style="font-weight:800;font-size:${px(23)}px;color:${T.deep};line-height:1.15;">${esc(it.text)}</div>${sub(it.sub, T.deep + '99', 17)}</div>
    </div>`).join('');
    body = `<div data-b style="position:relative;z-index:3;text-align:center;margin-top:${px(6)}px;">${pill()}${title(96, T.deep, T.main, 'center')}${tagline(54, T.main, true)}</div>
    <div style="position:relative;flex:1 1 auto;min-height:${px(330)}px;margin-top:${px(8)}px;">
      ${at(`left:50%;top:50%;width:${px(700)}px;height:${px(700)}px;transform:translate(-50%,-50%);border-radius:50%;background:repeating-conic-gradient(from 0deg, ${T.soft} 0deg 5deg, transparent 5deg 15deg);opacity:.45;`, '')}
      ${at(`left:50%;top:50%;width:${px(470)}px;height:${px(470)}px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ffffff 0%,#ffffffee 55%,#ffffff00 72%);`, '')}
      ${at(`left:50%;top:50%;width:${px(800)}px;height:${px(240)}px;transform:translate(-50%,-50%) rotate(-10deg);border:2.5px dashed ${T.main}66;border-radius:50%;`, '')}
      ${at(`left:50%;top:50%;transform:translate(-50%,-50%);`, img(hero[0], 330))}
      ${hero[1] ? at(`left:22%;top:52%;transform:translate(-50%,-50%) rotate(-10deg);`, img(hero[1], 120)) : ''}
      ${hero[2] ? at(`left:78%;top:46%;transform:translate(-50%,-50%) rotate(10deg);`, img(hero[2], 120)) : ''}
      ${at('left:30%;top:8%;', sparkle(px(30), T.main))}${at('right:30%;bottom:10%;', sparkle(px(22), T.main + 'aa'))}${at('left:62%;top:4%;', sparkle(px(18), T.soft))}
      ${chips}
    </div>`;
  }

  // ---------- 3. SỐ TO: nền đặc màu chủ đạo + số khổng lồ + 3 ô + vé voucher ----------
  if (v === 'bigdeal') {
    bg = `repeating-linear-gradient(135deg, #ffffff10 0 ${px(16)}px, transparent ${px(16)}px ${px(34)}px), radial-gradient(circle at 85% 8%, #ffffff55 0%, transparent 38%), radial-gradient(circle at 0% 100%, ${T.deep}77 0%, transparent 55%), ${T.main}`;
    const big = data.bigText || data.title2 || '';
    const bigSize = Math.min(280, Math.round(1500 / Math.max(3, big.length)));
    const head = `${esc(data.title)}${data.bigText && data.title2 ? ` ${esc(data.title2)}` : ''}`;
    const tiles = items0.length ? `<div data-b style="display:grid;grid-template-columns:repeat(${Math.min(3, items0.length)},1fr);gap:${px(16)}px;position:relative;z-index:3;">
      ${items0.slice(0, 3).map((it) => `<div style="background:#ffffff;border-radius:${px(24)}px;padding:${px(20)}px;box-shadow:0 ${px(14)}px ${px(30)}px #00000026;">${iconBox(it.icon, 54)}<div style="margin-top:${px(12)}px;font-weight:800;font-size:${px(24)}px;color:${T.deep};line-height:1.15;">${esc(it.text)}</div>${sub(it.sub)}</div>`).join('')}
    </div>` : '';
    const codeText = data.code || items1[0]?.text || '';
    const notch = (side: 'top' | 'bottom') => `<span style="position:absolute;left:-${px(16)}px;${side}:-${px(16)}px;width:${px(32)}px;height:${px(32)}px;border-radius:50%;background:${T.main};"></span>`;
    const coupon = codeText ? `<div data-b style="margin-top:${px(18)}px;display:flex;position:relative;z-index:3;filter:drop-shadow(0 ${px(14)}px ${px(24)}px #00000033);">
      <div style="flex:1 1 auto;min-width:0;background:${T.deep};border-radius:${px(24)}px 0 0 ${px(24)}px;padding:${px(22)}px ${px(28)}px;">
        ${c1?.tag ? `<div style="font-weight:700;font-size:${px(19)}px;letter-spacing:.1em;text-transform:uppercase;color:${T.soft};">${esc(c1.tag)}</div>` : ''}
        <div style="font-weight:900;font-size:${px(38)}px;color:#ffffff;line-height:1.1;margin-top:${px(4)}px;">${esc(c1?.title || 'Mã ưu đãi')}</div>
        ${items1.length > (data.code ? 0 : 1) ? `<div style="font-weight:600;font-size:${px(18)}px;color:#ffffffbb;margin-top:${px(6)}px;">${esc(items1.slice(data.code ? 0 : 1, 3).map((i) => i.text).join(' · '))}</div>` : ''}
      </div>
      <div style="position:relative;flex:none;width:0;">${notch('top')}${notch('bottom')}</div>
      <div style="flex:none;background:#ffffff;border-left:3px dashed ${T.soft};border-radius:0 ${px(24)}px ${px(24)}px 0;padding:${px(22)}px ${px(28)}px;display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:${px(260)}px;">
        <div style="font-weight:700;font-size:${px(17)}px;letter-spacing:.14em;text-transform:uppercase;color:${T.main};">${data.code ? 'Nhập mã' : 'Ưu đãi'}</div>
        <div style="margin-top:${px(6)}px;font-weight:900;font-size:${px(32)}px;letter-spacing:.06em;color:${T.deep};border:2.5px dashed ${T.main};border-radius:${px(12)}px;padding:${px(6)}px ${px(16)}px;white-space:nowrap;">${esc(codeText)}</div>
      </div>
    </div>` : '';
    body = `<div data-b style="margin-top:${px(10)}px;position:relative;z-index:3;">${pill()}<div style="margin-top:${px(16)}px;font-weight:900;font-size:${px(64)}px;line-height:1.02;letter-spacing:-0.02em;color:#ffffff;">${head}</div></div>
    <div style="position:relative;flex:1 1 auto;min-height:${px(260)}px;display:flex;align-items:center;justify-content:center;">
      ${hero[0] ? at(`right:${px(6)}px;top:0;transform:rotate(12deg);`, img(hero[0], 210)) : ''}
      ${hero[1] ? at(`left:${px(4)}px;bottom:0;transform:rotate(-12deg);`, img(hero[1], 170)) : ''}
      ${hero[2] ? at(`left:${px(40)}px;top:${px(6)}px;transform:rotate(-8deg);`, img(hero[2], 100)) : ''}
      ${at('right:24%;bottom:8%;', sparkle(px(34), '#ffffff'))}${at('left:22%;top:10%;', sparkle(px(22), '#ffffffaa'))}
      <div data-b style="position:relative;z-index:2;text-align:center;">
        <div style="font-weight:900;font-size:${px(bigSize)}px;line-height:0.92;letter-spacing:-0.05em;color:#ffffff;text-shadow:${px(10)}px ${px(10)}px 0 ${T.deep};">${esc(big)}</div>
        ${data.tagline ? `<div style="margin-top:${px(12)}px;font-family:${SCRIPT};font-weight:700;font-size:${px(58)}px;line-height:1;color:${T.tint};transform:rotate(-3deg);">${esc(data.tagline)}</div>` : ''}
      </div>
    </div>
    ${tiles}${coupon}`;
  }

  // ---------- 4. MENU: tiêu đề giữa kẹp 2 hình 3D + bảng menu có đường chấm dẫn tới giá ----------
  if (v === 'menu') {
    bg = `radial-gradient(${T.soft} 1.5px, transparent 1.7px) 0 0/${px(26)}px ${px(26)}px, linear-gradient(180deg, ${T.tint} 0%, ${T.tint2} 100%)`;
    const line = `<span style="width:${px(56)}px;height:3px;background:${T.main};border-radius:2px;"></span>`;
    const sections = cards.map((c, ci) => `<div style="${ci ? `margin-top:${px(18)}px;padding-top:${px(18)}px;border-top:2px dashed ${T.soft};` : ''}">
      <div style="display:flex;align-items:center;gap:${px(14)}px;margin-bottom:${px(4)}px;">
        <div style="font-weight:900;font-size:${px(38)}px;color:${T.deep};letter-spacing:-0.02em;">${esc(c.title)}</div>
        <div style="font-weight:700;font-size:${px(19)}px;color:${T.main};background:${T.tint};border:1.5px solid ${T.soft};border-radius:999px;padding:${px(5)}px ${px(14)}px;">${esc(c.tag)}</div>
      </div>
      ${c.items.filter((it) => it.text).slice(0, maxItems).map((it) => `<div style="display:flex;align-items:flex-end;gap:${px(12)}px;padding:${px(8)}px 0;">
        <span style="font-size:${px(30)}px;line-height:1.15;">${esc(it.icon || '•')}</span>
        <span style="font-weight:700;font-size:${px(27)}px;color:${T.deep};line-height:1.2;">${esc(it.text)}</span>
        <span style="flex:1 1 auto;min-width:${px(24)}px;border-bottom:3px dotted ${T.soft};margin-bottom:${px(8)}px;"></span>
        <span style="font-weight:900;font-size:${px(26)}px;color:${T.main};white-space:nowrap;line-height:1.2;">${esc(it.sub || '')}</span>
      </div>`).join('')}
    </div>`).join('');
    body = `<div style="position:relative;margin-top:${px(8)}px;">
      ${hero[0] ? at(`left:0;top:${px(30)}px;transform:rotate(-10deg);`, img(hero[0], 180)) : ''}
      ${hero[1] ? at(`right:0;top:${px(30)}px;transform:rotate(10deg);`, img(hero[1], 180)) : ''}
      <div data-b style="position:relative;z-index:2;margin:0 auto;max-width:${px(600)}px;text-align:center;">
        ${data.kicker ? `<div style="display:flex;align-items:center;justify-content:center;gap:${px(14)}px;font-family:${SCRIPT};font-weight:700;font-size:${px(44)}px;color:${T.main};">${line}${esc(data.kicker)}${line}</div>` : ''}
        ${title(88, T.deep, T.main, 'center')}
        ${tagline(48, T.main, true)}
      </div>
    </div>
    ${spacer(20)}
    <div data-b style="position:relative;background:#ffffff;border:2px solid ${T.soft};border-radius:${px(36)}px;padding:${px(32)}px ${px(40)}px ${px(24)}px;box-shadow:0 ${px(24)}px ${px(48)}px ${T.main}1f;">
      ${hero[2] ? at(`right:${px(26)}px;top:-${px(54)}px;transform:rotate(12deg);`, img(hero[2], 110)) : ''}
      ${sections}
    </div>`;
  }

  // ---------- 5. BENTO: nền tối + lưới ô to nhỏ ----------
  if (v === 'bento') {
    bg = `radial-gradient(circle at 92% 0%, ${T.main}77 0%, transparent 42%), radial-gradient(circle at 0% 100%, ${T.main}3d 0%, transparent 40%), ${T.deep}`;
    const tile = (inner: string, span: number, bgc: string, extra = '') =>
      `<div data-b style="grid-column:span ${span};position:relative;overflow:hidden;border-radius:${px(30)}px;background:${bgc};padding:${px(24)}px;${extra}">${inner}</div>`;
    const itemTile = (it: { icon?: string; text: string; sub?: string }, bgc: string) => tile(
      `${iconBox(it.icon, 54, '#ffffff', T.soft)}<div><div style="font-weight:800;font-size:${px(25)}px;color:${T.deep};line-height:1.15;">${esc(it.text)}</div>${sub(it.sub)}</div>`,
      2, bgc, 'display:flex;flex-direction:column;justify-content:space-between;gap:' + px(10) + 'px;');
    const tA = tile(`${at(`right:${px(20)}px;top:${px(20)}px;width:${px(150)}px;height:${px(110)}px;opacity:.35;background-image:radial-gradient(#ffffff 1.6px, transparent 1.8px);background-size:${px(18)}px ${px(18)}px;`, '')}
      <div style="position:relative;">${pill()}<h1 style="margin:${px(16)}px 0 0;font-weight:900;font-size:${px(76)}px;line-height:1;letter-spacing:-0.03em;color:#ffffff;">${esc(data.title)}${data.title2 ? `<br/><span style="color:${T.tint2};">${esc(data.title2)}</span>` : ''}</h1>
      ${data.tagline ? `<div style="margin-top:${px(10)}px;font-family:${SCRIPT};font-weight:700;font-size:${px(46)}px;line-height:1;color:${T.tint};">${esc(data.tagline)}</div>` : ''}</div>`,
      4, T.main, 'display:flex;flex-direction:column;justify-content:flex-end;');
    const tB = tile(`${at('left:50%;top:50%;transform:translate(-50%,-50%);', img(hero[0], 220))}${at(`left:${px(18)}px;top:${px(18)}px;`, sparkle(px(28), T.main))}${at(`right:${px(22)}px;bottom:${px(22)}px;`, sparkle(px(20), T.main + 'aa'))}`,
      2, `radial-gradient(circle at 50% 45%, #ffffff 0%, ${T.tint} 60%, ${T.soft} 100%)`);
    const tC = c1 ? tile(`<div style="position:relative;z-index:1;"><div style="font-weight:700;font-size:${px(18)}px;letter-spacing:.08em;text-transform:uppercase;color:${T.soft};">${esc(c1.tag)}</div>
      <div style="margin-top:${px(8)}px;font-weight:900;font-size:${px(34)}px;line-height:1.05;color:#ffffff;">${esc(c1.title)}</div></div>
      ${hero[1] ? at(`right:${px(16)}px;bottom:${px(16)}px;transform:rotate(8deg);`, img(hero[1], 104)) : ''}`, 2, '#ffffff14', 'border:1.5px solid #ffffff2e;') : '';
    const row2 = items0.slice(0, 3).map((it, i) => itemTile(it, i === 1 ? T.tint2 : '#ffffff')).join('');
    const row3 = items1.slice(0, 2).map((it, i) => itemTile(it, i === 0 ? T.soft : '#ffffff')).join('');
    body = `<div style="flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:1.45fr 1fr${c1 ? ' 1fr' : ''};gap:${px(16)}px;margin-top:${px(20)}px;">${tA}${tB}${row2}${tC}${row3}</div>`;
  }

  // ---------- 6. CÁC BƯỚC: timeline số 1-2-3 nối nét đứt + thẻ giải thưởng tối ----------
  if (v === 'steps') {
    const steps = items0.slice(0, maxItems).map((it, i) => `<div style="position:relative;display:flex;align-items:center;gap:${px(16)}px;">
      <div style="width:${px(74)}px;height:${px(74)}px;flex:none;border-radius:50%;background:${T.main};color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${px(34)}px;box-shadow:0 0 0 ${px(7)}px ${T.tint}, 0 ${px(10)}px ${px(20)}px ${T.main}55;">${i + 1}</div>
      <div style="flex:1 1 auto;min-width:0;background:#ffffff;border:2px solid ${T.soft};border-radius:${px(22)}px;padding:${px(16)}px ${px(20)}px;box-shadow:0 ${px(12)}px ${px(26)}px ${T.main}1a;">
        <div style="font-weight:800;font-size:${px(25)}px;color:${T.deep};line-height:1.2;">${esc(it.text)}</div>${sub(it.sub, T.deep + '99', 19)}
      </div>
    </div>`).join('');
    const prize = c1 ? `<div data-b style="position:relative;overflow:hidden;background:${T.deep};border-radius:${px(32)}px;padding:${px(26)}px;color:#ffffff;">
      ${at(`right:-${px(40)}px;top:-${px(40)}px;width:${px(170)}px;height:${px(170)}px;border-radius:50%;background:${T.main}66;`, '')}
      ${hero[0] ? `<div style="position:relative;display:flex;justify-content:center;">${img(hero[0], 140)}</div>` : ''}
      <div style="position:relative;display:inline-block;font-weight:700;font-size:${px(19)}px;color:#ffffff;background:#ffffff1f;border:1.5px solid #ffffff33;border-radius:999px;padding:${px(6)}px ${px(14)}px;margin-top:${px(8)}px;">${esc(c1.tag)}</div>
      <div style="position:relative;font-weight:900;font-size:${px(36)}px;line-height:1.05;margin:${px(10)}px 0 ${px(4)}px;">${esc(c1.title)}</div>
      ${items1.slice(0, 3).map((it, i) => `<div style="position:relative;display:flex;align-items:center;gap:${px(10)}px;padding:${px(9)}px 0;${i ? 'border-top:1.5px dashed #ffffff2e;' : ''}"><span style="font-size:${px(26)}px;">${esc(it.icon || '✦')}</span><div style="min-width:0;"><div style="font-weight:800;font-size:${px(21)}px;line-height:1.2;">${esc(it.text)}</div>${sub(it.sub, T.soft, 16)}</div></div>`).join('')}
    </div>` : '';
    body = `<div style="position:relative;margin-top:${px(12)}px;">
      ${hero[1] ? at(`right:${px(10)}px;top:0;transform:rotate(10deg);`, img(hero[1], 190)) : ''}
      ${hero[2] ? at(`right:${px(200)}px;top:${px(150)}px;transform:rotate(-8deg);`, img(hero[2], 90)) : ''}
      <div data-b style="position:relative;z-index:2;max-width:66%;">${pill()}${title(90, T.deep, T.main)}${tagline(54, T.main)}</div>
    </div>
    ${spacer(20)}
    <div style="display:grid;grid-template-columns:${prize ? '1.3fr 1fr' : '1fr'};gap:${px(24)}px;align-items:center;">
      <div data-b style="position:relative;display:flex;flex-direction:column;gap:${px(16)}px;">
        ${at(`left:${px(37)}px;top:${px(30)}px;bottom:${px(30)}px;border-left:3px dashed ${T.main}88;`, '')}
        ${steps}
      </div>
      ${prize}
    </div>`;
  }

  // ---------- 7. COLLAGE: 3 khung polaroid xoay + băng dính washi + chú thích viết tay ----------
  if (v === 'collage') {
    bg = `linear-gradient(${T.soft}55 1px, transparent 1px) 0 0/${px(44)}px ${px(44)}px, linear-gradient(90deg, ${T.soft}55 1px, transparent 1px) 0 0/${px(44)}px ${px(44)}px, linear-gradient(180deg, ${T.tint} 0%, ${T.tint2} 100%)`;
    const rot = [-7, 4, 8];
    const lift = [px(24), -px(18), px(30)];
    const tape = [T.main + '99', T.soft + 'ee', T.main + '99'];
    const polas = hero.map((id, i) => {
      const cap = items0[i];
      return `<div style="position:relative;flex:none;width:33%;aspect-ratio:0.8;max-height:100%;margin-left:${i ? '-3%' : '0'};transform:translateY(${lift[i]}px) rotate(${rot[i]}deg);background:#ffffff;border-radius:${px(8)}px;padding:${px(14)}px ${px(14)}px 0;box-sizing:border-box;box-shadow:0 ${px(18)}px ${px(36)}px ${T.deep}33;display:flex;flex-direction:column;z-index:${i === 1 ? 2 : 1};">
        ${at(`left:50%;top:-${px(16)}px;width:${px(110)}px;height:${px(32)}px;transform:translateX(-50%) rotate(${-rot[i] * 0.7}deg);background:${tape[i]};`, '')}
        <div style="flex:1 1 auto;min-height:0;border-radius:${px(4)}px;background:radial-gradient(circle at 50% 45%, #ffffff 0%, ${T.tint2} 78%);display:flex;align-items:center;justify-content:center;">
          <img src="/illustrations/fluent3d/${encodeURIComponent(id)}.png" alt="" style="width:74%;height:auto;max-height:88%;object-fit:contain;${shadow}"/>
        </div>
        <div style="height:${px(78)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          ${cap ? `<div style="font-family:${SCRIPT};font-weight:700;font-size:${px(30)}px;line-height:1;color:${T.deep};">${esc(cap.text)}</div>${sub(cap.sub, T.deep + '99', 15)}` : ''}
        </div>
      </div>`;
    }).join('');
    const chipsRow = (c1 && items1.length) ? `<div data-b style="margin-top:${px(16)}px;display:flex;flex-wrap:wrap;align-items:center;gap:${px(12)}px;position:relative;z-index:3;">
      <div style="font-family:${SCRIPT};font-weight:700;font-size:${px(36)}px;color:${T.main};margin-right:${px(4)}px;">${esc(c1.title)}:</div>
      ${items1.slice(0, 3).map((it) => `<div style="display:flex;align-items:center;gap:${px(8)}px;background:#ffffff;border:2px solid ${T.soft};border-radius:999px;padding:${px(8)}px ${px(18)}px;font-weight:700;font-size:${px(21)}px;color:${T.deep};"><span>${esc(it.icon || '✦')}</span>${esc(it.text)}</div>`).join('')}
    </div>` : '';
    body = `<div data-b style="margin-top:${px(10)}px;position:relative;z-index:3;">
      ${data.kicker ? `<div style="display:inline-block;font-family:${SCRIPT};font-weight:700;font-size:${px(48)}px;color:${T.main};transform:rotate(-3deg);">${esc(data.kicker)} ✦</div>` : ''}
      ${title(104, T.deep, T.main, 'left', false)}
      ${tagline(50, T.main)}
    </div>
    <div style="position:relative;flex:1 1 auto;min-height:${px(330)}px;margin-top:${px(26)}px;display:flex;align-items:center;justify-content:center;">${polas}</div>
    ${chipsRow}`;
  }

  const html = `<div style="width:${W}px;height:${H}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bg};font-family:${FONT};color:${ink};padding:${px(54)}px ${px(60)}px;display:flex;flex-direction:column;">${header}${body}${footer}</div>`;
  return { w: W, h: H, css: CSS, html };
}
