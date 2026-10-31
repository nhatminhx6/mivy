// Bố cục poster quảng cáo CHUẨN (slot) — khoác "skin" nghệ thuật.
// Nội dung ngành đổ vào slot; vibe (màu/font/hoa văn) lấy từ skin.
import { AD_SKINS, AdContent, AdSkin, getSkin, getBackground } from './ad-skins';
import { renderSeasonDecor, type SeasonDecorOpts } from './season-decor';

export interface AdTemplateDef { id: string; title: string; group: string; w: number; h: number; css: string; html: string; }

function esc(s = ''): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Bóng nhiều lớp — độ sâu "nổi khối" kiểu brandbird (gần/xa chồng nhau)
const LAYERED_SHADOW = '0 2px 6px rgba(0,0,0,0.10), 0 10px 22px rgba(0,0,0,0.14), 0 36px 70px rgba(0,0,0,0.30)';
const LAYERED_SHADOW_SOFT = '0 2px 6px rgba(0,0,0,0.08), 0 8px 18px rgba(0,0,0,0.10), 0 28px 56px rgba(0,0,0,0.18)';
// Phản chiếu sàn dưới ảnh/thiết bị
const REFLECT = '-webkit-box-reflect:below 16px linear-gradient(transparent 58%, rgba(0,0,0,0.20) 100%);';
// Ánh sáng loang — đèn mềm trên + tối nhẹ dưới → nền có chiều sâu (chữ ký brandbird)
const lightOverlay = (): string =>
  `<div style="position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(130% 85% at 50% -12%,rgba(255,255,255,0.22) 0%,transparent 52%),radial-gradient(120% 75% at 50% 118%,rgba(0,0,0,0.30) 0%,transparent 58%);"></div>`;
// Lớp hạt noise mịn (data-URI để html-to-image render ổn định)
const grainLayer = (opacity = 0.06): string =>
  `<div style="position:absolute;inset:0;pointer-events:none;z-index:1;opacity:${opacity};mix-blend-mode:overlay;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");background-size:140px 140px;"></div>`;

export interface AdFrameOpts { borderWidth?: number; borderColor?: string; borderRadius?: number }

// Đa khổ — 1 thiết kế xuất mọi sàn (như brandbird). Mọi renderer reflow theo W/H.
export interface AdSize { id: string; name: string; hint: string; w: number; h: number }
export const AD_SIZES: AdSize[] = [
  { id: 'feed45', name: 'Dọc 4:5', hint: 'Feed IG/FB', w: 1080, h: 1350 },
  { id: 'square', name: 'Vuông 1:1', hint: 'Post vuông', w: 1080, h: 1080 },
  { id: 'story', name: 'Story 9:16', hint: 'Story/Reels/TikTok', w: 1080, h: 1920 },
  { id: 'wide', name: 'Ngang 16:9', hint: 'Cover/Banner', w: 1920, h: 1080 },
];
const DEF: AdSize = AD_SIZES[0];
export function getAdSize(id?: string): AdSize { return AD_SIZES.find((s) => s.id === id) || DEF; }
// hệ số thở theo chiều cao (giới hạn để không méo)
const vUnit = (h: number) => Math.min(1.25, Math.max(0.6, h / 1350));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Nhãn nhấn (accent tag) — khối màu bo góc, dùng cho ưu đãi/eyebrow (kiểu brandbird label)
function accentTag(text: string | undefined, skin: AdSkin, size = 26): string {
  if (!text) return '';
  const padV = Math.round(size * 0.42), padH = Math.round(size * 0.78);
  return `<span style="display:inline-block;font-family:${skin.fontBody};font-weight:700;font-size:${size}px;letter-spacing:0.01em;color:${skin.accentInk};background:${skin.accent};padding:${padV}px ${padH}px;border-radius:${Math.round(size * 0.55)}px;line-height:1;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,0.18);">${esc(text)}</span>`;
}

// Byline chip — avatar tròn (chữ cái đầu) + tên thương hiệu + dòng phụ (kiểu brandbird)
function bylineChip(brand: string | undefined, skin: AdSkin, sub?: string, onDark = false): string {
  const name = (brand || 'Mivy').trim();
  const initial = esc(name.charAt(0).toUpperCase() || 'M');
  const nameCol = onDark ? '#ffffff' : skin.ink;
  const subCol = onDark ? 'rgba(255,255,255,0.78)' : skin.muted;
  return `<div style="display:flex;align-items:center;gap:14px;">
    <div style="width:54px;height:54px;border-radius:50%;background:${skin.accent};color:${skin.accentInk};display:flex;align-items:center;justify-content:center;font-family:${skin.fontDisplay};font-weight:700;font-size:25px;flex:none;box-shadow:0 4px 12px rgba(0,0,0,0.2);">${initial}</div>
    <div style="display:flex;flex-direction:column;line-height:1.18;">
      <span style="font-family:${skin.fontBody};font-weight:700;font-size:23px;color:${nameCol};">${esc(name)}</span>
      ${sub ? `<span style="font-family:${skin.fontBody};font-size:17px;color:${subCol};">${esc(sub)}</span>` : ''}
    </div>
  </div>`;
}

export function renderAdPoster(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, frame?: AdFrameOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const u = vUnit(h);
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const bw = frame?.borderWidth || 0;
  const border = bw > 0 ? `border:${bw}px solid ${frame?.borderColor || ink};` : '';
  const radius = frame?.borderRadius ? `border-radius:${frame.borderRadius}px;` : '';
  const headTransform = skin.headlineUpper ? 'uppercase' : 'none';
  const headStyle = `font-family:${fontDisplay};font-weight:${skin.headlineWeight || 800};font-style:${skin.headlineItalic ? 'italic' : 'normal'};text-transform:${headTransform};line-height:0.98;letter-spacing:${skin.headlineUpper ? '0.01em' : '-0.01em'};color:${ink};`;

  const eyebrow = content.eyebrow
    ? `<div>${accentTag(content.eyebrow, skin, 24)}</div>`
    : '';

  const headline = content.headline
    ? `<h1 style="margin:28px 0 0;font-size:96px;${headStyle}">${esc(content.headline)}</h1>`
    : '';

  const divider = `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:30px 0;color:${muted};">
      <span style="width:72px;height:1.5px;background:${muted};"></span>
      <span style="width:9px;height:9px;transform:rotate(45deg);background:${accent};"></span>
      <span style="width:72px;height:1.5px;background:${muted};"></span>
    </div>`;

  const subhead = content.subhead
    ? `<p style="margin:0 auto;max-width:720px;font-family:${fontBody};font-size:30px;line-height:1.45;color:${ink};opacity:0.9;">${esc(content.subhead)}</p>`
    : '';

  const image = content.image
    ? `<div style="margin:40px auto 0;width:560px;height:360px;${imgBg(content.image, muted, 'center', frameOf(content))}border:2px solid ${ink};"></div>`
    : '';

  const points = (content.points || []).filter(Boolean).slice(0, 4);
  const pointsHtml = points.length
    ? `<div style="margin:40px auto 0;display:flex;flex-direction:column;gap:14px;align-items:center;">
        ${points.map((p) => `<div style="font-family:${fontBody};font-size:25px;color:${ink};display:flex;align-items:center;gap:12px;">
          <span style="width:7px;height:7px;transform:rotate(45deg);background:${accent};display:inline-block;"></span>${esc(p)}</div>`).join('')}
      </div>`
    : '';

  const cta = content.cta
    ? (skin.ctaOutline
        ? `<a href="#" style="font-family:${fontBody};font-weight:700;font-size:26px;text-decoration:none;color:${ink};border:2px solid ${ink};padding:16px 42px;letter-spacing:0.04em;">${esc(content.cta)}</a>`
        : `<a href="#" style="font-family:${fontBody};font-weight:700;font-size:26px;text-decoration:none;color:${accentInk};background:${accent};padding:18px 44px;letter-spacing:0.04em;">${esc(content.cta)}</a>`)
    : '';

  const brand = content.brand || '';

  return `
  <div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bg};font-family:${fontBody};color:${ink};${border}${radius}">
    ${skin.frame(ink, accent, muted)}
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="position:relative;height:100%;box-sizing:border-box;padding:${Math.round(132 * Math.min(1, u))}px 112px;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div style="width:100%;display:flex;align-items:center;justify-content:space-between;font-family:${fontBody};font-size:19px;letter-spacing:0.28em;text-transform:uppercase;color:${muted};">
        <span style="font-weight:700;color:${ink};">${esc(brand)}</span>
        <span>Mivy</span>
      </div>

      <div style="flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;width:100%;">
        ${eyebrow}
        ${headline}
        ${divider}
        ${subhead}
        ${image}
        ${pointsHtml}
        ${content.cta ? `<div style="margin-top:46px;">${cta}</div>` : ''}
      </div>

      <div style="width:100%;display:flex;align-items:center;justify-content:center;">
        ${bylineChip(content.brand, skin, String(new Date().getFullYear()))}
      </div>
    </div>
  </div>`;
}

// LAYOUT TỐI GIẢN THƯƠNG MẠI — ảnh làm chủ đạo (bo góc + bóng mềm), chữ tối giản, nhiều khoảng thở.
export function renderAdPosterMinimal(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const u = vUnit(h);
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const pad = Math.round(88 * Math.min(1.1, u));
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  const cta = content.cta
    ? `<a href="#" style="font-family:${fontBody};font-weight:600;font-size:26px;text-decoration:none;color:${accentInk};background:${accent};padding:18px 40px;border-radius:999px;white-space:nowrap;">${esc(content.cta)}</a>`
    : '';

  const bgCss = skin.bgGradient || bg;
  const shadow = skin.bgGradient ? LAYERED_SHADOW : LAYERED_SHADOW_SOFT;
  const tilt = skin.imageTilt ? 'transform:perspective(1700px) rotateY(-9deg) rotateX(5deg);transform-origin:center;' : '';
  const reflect = skin.imageReflect ? REFLECT : '';
  let imageBlock: string;
  if (skin.imageFrame === 'browser') {
    imageBlock = `<div style="border-radius:22px;overflow:hidden;box-shadow:${shadow};background:#ffffff;">
      <div style="height:50px;background:#eceae4;display:flex;align-items:center;gap:12px;padding:0 24px;">
        <span style="width:15px;height:15px;border-radius:50%;background:#ff5f57;"></span><span style="width:15px;height:15px;border-radius:50%;background:#febc2e;"></span><span style="width:15px;height:15px;border-radius:50%;background:#28c840;"></span>
      </div>
      <div style="height:${clamp(Math.round(h * 0.405), 300, 760)}px;${img}"></div>
    </div>`;
  } else {
    imageBlock = `<div style="width:100%;height:${clamp(Math.round(h * 0.445), 320, 820)}px;border-radius:30px;${img}box-shadow:${shadow};"></div>`;
  }
  return `
  <div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};color:${ink};font-family:${fontBody};padding:${pad}px;display:flex;flex-direction:column;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    ${skin.bgGradient ? lightOverlay() : ''}
    ${skin.grain ? grainLayer() : ''}
    <div style="position:relative;z-index:2;">${bylineChip(content.brand, skin, String(new Date().getFullYear()))}</div>
    <div style="position:relative;z-index:2;margin-top:40px;${reflect}"><div style="${tilt}">${imageBlock}</div></div>
    <div style="position:relative;z-index:2;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;margin-top:16px;">
      ${content.eyebrow ? `<div style="margin:0 0 20px;">${accentTag(content.eyebrow, skin, 30)}</div>` : ''}
      <h1 style="margin:0;font-family:${fontDisplay};font-weight:600;font-size:76px;line-height:1.04;letter-spacing:-0.015em;color:${ink};">${esc(content.headline || '')}</h1>
      ${content.subhead ? `<p style="margin:22px 0 0;font-size:30px;line-height:1.4;color:${muted};">${esc(content.subhead)}</p>` : ''}
    </div>
    <div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:flex-end;gap:24px;">
      ${cta}
    </div>
  </div>`;
}

function imgBg(image?: string, muted?: string, pos = 'center', fr?: { z?: number; x?: number; y?: number }): string {
  if (!image) return `background:linear-gradient(135deg,${muted}22,${muted}55);`;
  if (fr && (fr.z != null || fr.x != null || fr.y != null)) {
    const z = Math.max(5, fr.z == null ? 100 : fr.z);
    const x = fr.x ?? 50, y = fr.y ?? 50;
    const size = z === 100 ? 'cover' : `${z}%`; // <100 = thu nhỏ, >100 = phóng to
    return `background-image:url('${image}');background-repeat:no-repeat;background-position:${x}% ${y}%;background-size:${size};`;
  }
  return `background:url('${image}') ${pos}/cover no-repeat;`;
}
// khung ảnh chính (zoom/pan) từ content — dùng cho ảnh hero
const frameOf = (c: AdContent) => ({ z: c.imgZoom, x: c.imgX, y: c.imgY });
function starRow(col: string, n = 5): string {
  const star = `<path d="M0 -13 L3.8 -4 L13 -4 L5.6 2.4 L8.4 12 L0 6 L-8.4 12 L-5.6 2.4 L-13 -4 L-3.8 -4 Z" fill="${col}"/>`;
  return `<svg width="${n * 40}" height="30" viewBox="0 0 ${n * 40} 30">${Array.from({ length: n }, (_, i) => `<g transform="translate(${20 + i * 40},15)">${star}</g>`).join('')}</svg>`;
}
const ctaBtn = (content: AdContent, skin: AdSkin) => content.cta
  ? `<a href="#" style="font-family:${skin.fontBody};font-weight:600;font-size:26px;text-decoration:none;color:${skin.accentInk};background:${skin.accent};padding:17px 38px;border-radius:999px;white-space:nowrap;display:inline-block;">${esc(content.cta)}</a>` : '';

// ===== KHUNG DEVICE PHOTOREAL (titanium + dynamic island + gloss + bóng lớp) =====
const TITAN = 'linear-gradient(145deg,#eceaef 0%,#a7a5ab 16%,#6c6a70 30%,#d3d1d6 50%,#6c6a70 70%,#a7a5ab 84%,#eceaef 100%)';
const GLOSS = 'linear-gradient(118deg,rgba(255,255,255,0.20) 0%,rgba(255,255,255,0.05) 22%,transparent 44%,transparent 100%)';

function phoneFrame(img: string): string {
  return `<div style="position:relative;width:432px;height:884px;border-radius:74px;background:${TITAN};padding:7px;box-sizing:border-box;box-shadow:0 2px 4px rgba(0,0,0,0.3),0 20px 44px rgba(0,0,0,0.34),0 64px 120px rgba(0,0,0,0.46);">
    <div style="position:absolute;inset:0;border-radius:74px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.55),inset 0 0 0 7px rgba(0,0,0,0.32);pointer-events:none;"></div>
    <div style="position:absolute;left:-3px;top:206px;width:4px;height:50px;border-radius:3px;background:linear-gradient(#aeacb2,#6c6a70);"></div>
    <div style="position:absolute;left:-3px;top:288px;width:4px;height:84px;border-radius:3px;background:linear-gradient(#aeacb2,#6c6a70);"></div>
    <div style="position:absolute;left:-3px;top:392px;width:4px;height:84px;border-radius:3px;background:linear-gradient(#aeacb2,#6c6a70);"></div>
    <div style="position:absolute;right:-3px;top:300px;width:4px;height:120px;border-radius:3px;background:linear-gradient(#aeacb2,#6c6a70);"></div>
    <div style="position:relative;width:100%;height:100%;border-radius:67px;background:#000;padding:13px;box-sizing:border-box;">
      <div style="position:relative;width:100%;height:100%;border-radius:55px;overflow:hidden;${img}">
        <div style="position:absolute;top:21px;left:50%;transform:translateX(-50%);width:124px;height:36px;background:#000;border-radius:20px;display:flex;align-items:center;justify-content:flex-end;padding-right:13px;box-sizing:border-box;">
          <div style="width:12px;height:12px;border-radius:50%;background:#0a0d18;box-shadow:inset 0 0 3px rgba(90,100,170,0.7);"></div>
        </div>
        <div style="position:absolute;inset:0;background:${GLOSS};pointer-events:none;"></div>
      </div>
    </div>
  </div>`;
}

function laptopFrame(img: string): string {
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;">
    <div style="position:relative;width:880px;height:552px;border-radius:26px;background:linear-gradient(#37373b,#1b1b1e);padding:14px;box-sizing:border-box;box-shadow:0 2px 4px rgba(0,0,0,0.4),0 44px 96px rgba(0,0,0,0.5);">
      <div style="position:absolute;inset:0;border-radius:26px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.16);pointer-events:none;"></div>
      <div style="position:relative;width:100%;height:100%;border-radius:12px;overflow:hidden;${img}">
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:128px;height:20px;background:#0a0a0c;border-radius:0 0 12px 12px;"></div>
        <div style="position:absolute;inset:0;background:${GLOSS};pointer-events:none;"></div>
      </div>
    </div>
    <div style="position:relative;width:978px;height:30px;margin-top:-2px;border-radius:0 0 16px 16px;background:linear-gradient(#cfcfd3,#9a9a9e 55%,#68686c);box-shadow:0 26px 36px rgba(0,0,0,0.34);">
      <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:160px;height:9px;border-radius:0 0 9px 9px;background:#76767a;"></div>
    </div>
  </div>`;
}

function ipadFrame(img: string): string {
  return `<div style="position:relative;width:720px;height:560px;border-radius:42px;background:${TITAN};padding:9px;box-sizing:border-box;box-shadow:0 2px 4px rgba(0,0,0,0.3),0 44px 96px rgba(0,0,0,0.46);">
    <div style="position:absolute;inset:0;border-radius:42px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.5),inset 0 0 0 9px #0a0a0a;pointer-events:none;"></div>
    <div style="position:relative;width:100%;height:100%;border-radius:22px;overflow:hidden;${img}">
      <div style="position:absolute;inset:0;background:${GLOSS};pointer-events:none;"></div>
    </div>
  </div>`;
}

// 2. KHUNG THIẾT BỊ — ảnh lồng khung điện thoại/laptop trên nền
export function renderAdDevice(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const dk = clamp(h / 1350, 0.6, 1.1); // thu/phóng khung máy theo chiều cao
  const { bg, ink, muted, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  const tilt = skin.imageTilt ? 'transform:perspective(1800px) rotateY(-10deg) rotateX(4deg);' : '';
  let device: string;
  if (skin.device === 'laptop') {
    device = `<div style="${tilt}">${laptopFrame(img)}</div>`;
  } else if (skin.device === 'ipad') {
    device = `<div style="${tilt}">${ipadFrame(img)}</div>`;
  } else if (skin.device === 'polaroid') {
    device = `<div style="${tilt}"><div style="background:#fbfaf7;padding:28px 28px 104px;border-radius:5px;box-shadow:0 44px 96px rgba(0,0,0,0.4);"><div style="width:560px;height:620px;${img}"></div><div style="text-align:center;margin-top:40px;font-family:${fontDisplay};font-weight:600;font-size:40px;color:#2a2822;">${esc(content.headline || '')}</div></div></div>`;
  } else {
    device = `<div style="${tilt}">${phoneFrame(img)}</div>`;
  }
  // polaroid tự có caption; các khung khác hiện caption dưới
  const showCaption = skin.device !== 'polaroid';
  const reflect = skin.imageReflect ? REFLECT : '';
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};color:${ink};font-family:${fontBody};padding:80px;display:flex;flex-direction:column;align-items:center;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    ${skin.grain ? grainLayer() : ''}
    <div style="position:relative;z-index:2;width:100%;display:flex;align-items:center;justify-content:space-between;font-size:20px;letter-spacing:0.26em;text-transform:uppercase;color:${muted};"><span style="font-weight:700;color:${ink};">${esc(content.brand || 'Mivy')}</span><span>${new Date().getFullYear()}</span></div>
    <div style="position:relative;z-index:2;flex:1 1 auto;display:flex;align-items:center;justify-content:center;overflow:hidden;"><div style="${reflect}"><div style="transform:scale(${dk});transform-origin:center;">${device}</div></div></div>
    ${showCaption ? `<div style="position:relative;z-index:2;text-align:center;"><h1 style="margin:0;font-family:${fontDisplay};font-weight:600;font-size:60px;line-height:1.05;letter-spacing:-0.01em;color:${ink};">${esc(content.headline || '')}</h1>${content.subhead ? `<p style="margin:16px 0 0;font-size:28px;color:${muted};">${esc(content.subhead)}</p>` : ''}</div>` : ''}
  </div>`;
}

// 3. APP STORE — tiêu đề lớn trên + khung điện thoại dưới (cắt đáy)
export function renderAppstore(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const ph = clamp(Math.round(h * 0.53), 360, 980); // cao khung điện thoại
  const pw = Math.round(ph * 0.75);
  const { bg, ink, muted, accent, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};color:${ink};font-family:${fontBody};padding:84px 84px 0;display:flex;flex-direction:column;align-items:center;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="font-size:20px;letter-spacing:0.3em;text-transform:uppercase;color:${muted};font-weight:700;">${esc(content.brand || 'Mivy')}</div>
    <h1 style="margin:26px 0 0;text-align:center;font-family:${fontDisplay};font-weight:700;font-size:72px;line-height:1.05;letter-spacing:-0.02em;color:${ink};">${esc(content.headline || '')}</h1>
    ${content.subhead ? `<p style="margin:18px 0 0;text-align:center;font-size:28px;line-height:1.4;color:${muted};max-width:820px;">${esc(content.subhead)}</p>` : ''}
    ${content.eyebrow ? `<div style="margin-top:20px;font-family:${fontDisplay};font-weight:700;font-size:34px;color:${accent};">${esc(content.eyebrow)}</div>` : ''}
    <div style="flex:1 1 auto;display:flex;align-items:flex-end;justify-content:center;margin-top:30px;">
      <div style="width:${pw}px;height:${ph}px;background:#0f0f12;border-radius:56px 56px 0 0;padding:16px 16px 0;box-shadow:0 -10px 90px rgba(0,0,0,0.4);"><div style="width:100%;height:100%;border-radius:44px 44px 0 0;${img}"></div></div>
    </div>
  </div>`;
}

// 5. CHIA ĐÔI — nửa ảnh / nửa chữ
export function renderSplit(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const iw = Math.round(w * 0.46);
  const { bg, ink, muted, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;display:flex;font-family:${fontBody};">
    <div style="width:${iw}px;height:100%;${img}"></div>
    <div style="flex:1;height:100%;background:${bgCss};color:${ink};padding:84px 72px;display:flex;flex-direction:column;justify-content:center;">
      ${renderSeasonDecor(seasonId, seasonVariant)}
      ${bylineChip(content.brand, skin, String(new Date().getFullYear()))}
      ${content.eyebrow ? `<div style="margin:26px 0 0;">${accentTag(content.eyebrow, skin, 28)}</div>` : ''}
      <h1 style="margin:22px 0 0;font-family:${fontDisplay};font-weight:600;font-size:64px;line-height:1.06;letter-spacing:-0.015em;color:${ink};">${esc(content.headline || '')}</h1>
      ${content.subhead ? `<p style="margin:22px 0 0;font-size:28px;line-height:1.45;color:${muted};">${esc(content.subhead)}</p>` : ''}
      <div style="margin-top:40px;">${ctaBtn(content, skin)}</div>
    </div>
  </div>`;
}

// 7. REVIEW — card trích dẫn / testimonial
export function renderReview(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { bg, ink, muted, accent, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const avatar = content.image
    ? `background:url('${content.image}') center/cover no-repeat;` : `background:${accent};`;
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};font-family:${fontBody};padding:96px;display:flex;align-items:center;justify-content:center;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="background:#ffffff;border-radius:40px;box-shadow:0 50px 110px rgba(0,0,0,0.28);padding:84px 76px;width:100%;max-width:880px;display:flex;flex-direction:column;align-items:center;text-align:center;">
      ${content.eyebrow ? `<div style="margin:0 0 30px;">${accentTag(content.eyebrow, skin, 26)}</div>` : ''}
      <div style="width:140px;height:140px;border-radius:50%;${avatar}box-shadow:0 10px 30px rgba(0,0,0,0.15);"></div>
      <div style="margin-top:28px;">${starRow(accent)}</div>
      <p style="margin:34px 0 0;font-family:${fontDisplay};font-weight:600;font-size:52px;line-height:1.25;color:#1f1d1a;">“${esc(content.headline || '')}”</p>
      <p style="margin:34px 0 0;font-size:28px;color:#8a857c;">${esc(content.subhead || '')}</p>
      <div style="margin-top:30px;font-size:26px;font-weight:700;color:#1f1d1a;">${esc(content.brand || '')}</div>
    </div>
  </div>`;
}

// 8. COLLAGE — ghép nhiều ô ảnh + ô chữ
export function renderCollage(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const tile = (pos: string) => `<div style="border-radius:20px;${imgBg(content.image, muted, pos)}box-shadow:0 14px 34px rgba(0,0,0,0.18);"></div>`;
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};color:${ink};font-family:${fontBody};padding:80px;display:flex;flex-direction:column;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:20px;letter-spacing:0.26em;text-transform:uppercase;color:${muted};"><span style="font-weight:700;color:${ink};">${esc(content.brand || 'Mivy')}</span><span>${new Date().getFullYear()}</span></div>
    <div style="flex:1 1 auto;margin-top:36px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1.3fr 1fr;gap:20px;">
      ${tile('center top')}
      ${tile('right center')}
      <div style="border-radius:20px;background:${accent};color:${accentInk};display:flex;flex-direction:column;justify-content:center;padding:36px;">
        <div style="font-family:${fontDisplay};font-weight:700;font-size:40px;line-height:1.1;">${esc(content.headline || '')}</div>
        ${content.eyebrow ? `<div style="margin-top:14px;font-size:24px;font-weight:600;">${esc(content.eyebrow)}</div>` : ''}
      </div>
      ${tile('left bottom')}
    </div>
    ${content.subhead ? `<p style="margin:26px 0 0;text-align:center;font-size:26px;color:${muted};">${esc(content.subhead)}</p>` : ''}
  </div>`;
}

// 4. ẢNH TRÀN VIỀN — ảnh full + chữ overlay (lớp phủ mờ)
export function renderFullbleed(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;${img}font-family:${fontBody};color:#ffffff;">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.5) 0%,transparent 28%,transparent 50%,rgba(0,0,0,0.88) 100%);"></div>
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="position:relative;height:100%;box-sizing:border-box;padding:84px;display:flex;flex-direction:column;justify-content:space-between;">
      ${bylineChip(content.brand, skin, String(new Date().getFullYear()), true)}
      <div>
        ${content.eyebrow ? `<div style="margin:0 0 22px;">${accentTag(content.eyebrow, skin, 30)}</div>` : ''}
        <h1 style="margin:0;font-family:${fontDisplay};font-weight:700;font-size:86px;line-height:1.0;letter-spacing:-0.02em;text-shadow:0 2px 24px rgba(0,0,0,0.4);">${esc(content.headline || '')}</h1>
        ${content.subhead ? `<p style="margin:22px 0 0;font-size:30px;line-height:1.4;opacity:0.92;">${esc(content.subhead)}</p>` : ''}
        ${content.cta ? `<div style="margin-top:34px;"><a href="#" style="font-weight:600;font-size:26px;text-decoration:none;color:${accentInk};background:${accent};padding:17px 38px;border-radius:999px;">${esc(content.cta)}</a></div>` : ''}
      </div>
    </div>
  </div>`;
}

// 6. CHÚ THÍCH — ảnh + nhãn ưu đãi + mũi tên khoanh vùng
export function renderAnnotate(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const bgCss = skin.bgGradient || bg;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  const label = content.eyebrow || 'ƯU ĐÃI';
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};color:${ink};font-family:${fontBody};padding:84px;display:flex;flex-direction:column;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:20px;letter-spacing:0.26em;text-transform:uppercase;color:${muted};"><span style="font-weight:700;color:${ink};">${esc(content.brand || 'Mivy')}</span><span>${new Date().getFullYear()}</span></div>
    <div style="position:relative;margin-top:40px;">
      <div style="width:100%;height:${clamp(Math.round(h * 0.46), 320, 760)}px;border-radius:26px;${img}box-shadow:0 36px 80px rgba(0,0,0,0.26);"></div>
      <svg width="260" height="200" viewBox="0 0 260 200" style="position:absolute;right:-10px;top:-54px;"><circle cx="150" cy="150" r="56" fill="none" stroke="${accent}" stroke-width="7"/><path d="M60 40 C110 20 150 50 150 92" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M150 92 l-18 -16 M150 92 l16 -18" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/></svg>
      <div style="position:absolute;left:40px;top:-30px;transform:rotate(-6deg);background:${accent};color:${accentInk};font-family:${fontDisplay};font-weight:700;font-size:40px;padding:14px 30px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.25);">${esc(label)}</div>
    </div>
    <div style="flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;">
      <h1 style="margin:0;font-family:${fontDisplay};font-weight:700;font-size:68px;line-height:1.05;letter-spacing:-0.015em;color:${ink};">${esc(content.headline || '')}</h1>
      ${content.subhead ? `<p style="margin:20px 0 0;font-size:30px;line-height:1.4;color:${muted};">${esc(content.subhead)}</p>` : ''}
    </div>
    <div>${ctaBtn(content, skin)}</div>
  </div>`;
}

// BLOG / LIFESTYLE — ảnh lớn + hộp chữ (card) nổi, nhãn + tiêu đề serif + byline (kiểu brandbird blog)
export function renderBlog(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { bg, muted, fontDisplay } = skin;
  const bgCss = skin.bgGradient || bg;
  const img = imgBg(content.image, muted, 'center', frameOf(content));
  const imgH = clamp(Math.round(h * 0.5), 320, 1040);
  // Hộp chữ = surface sáng, chữ tối, dùng được trên mọi nền; accent lấy từ skin (guard nếu quá sáng)
  const acc = skin.accent && skin.accent.toLowerCase() !== '#ffffff' ? skin.accent : '#e11d48';
  const cardSkin: AdSkin = { ...skin, ink: '#1f1d1a', muted: '#6b6660', accent: acc, accentInk: '#ffffff' };
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${bgCss};font-family:${skin.fontBody};padding:64px;display:flex;flex-direction:column;">
    ${renderSeasonDecor(seasonId, seasonVariant)}
    ${skin.bgGradient ? lightOverlay() : ''}
    ${skin.grain ? grainLayer() : ''}
    <div style="position:relative;z-index:2;width:100%;height:${imgH}px;border-radius:28px;${img}box-shadow:${LAYERED_SHADOW};"></div>
    <div style="position:relative;z-index:3;margin:-72px 40px 0;background:#ffffff;border-radius:28px;padding:52px 48px;box-shadow:0 40px 90px rgba(0,0,0,0.30);display:flex;flex-direction:column;flex:1 1 auto;">
      ${content.eyebrow ? `<div style="margin:0 0 20px;">${accentTag(content.eyebrow, cardSkin, 24)}</div>` : ''}
      <h1 style="margin:0;font-family:${fontDisplay};font-weight:700;font-size:62px;line-height:1.08;letter-spacing:-0.015em;color:#1f1d1a;">${esc(content.headline || '')}</h1>
      ${content.subhead ? `<p style="margin:20px 0 0;font-size:28px;line-height:1.45;color:#6b6660;">${esc(content.subhead)}</p>` : ''}
      <div style="flex:1 1 auto;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:36px;">
        ${bylineChip(content.brand, cardSkin, String(new Date().getFullYear()))}
        ${ctaBtn(content, cardSkin)}
      </div>
    </div>
  </div>`;
}

// SẢN PHẨM — nền riêng + 1–3 ảnh sản phẩm (cutout) nổi ở trung tâm + promo/giá (kiểu poster sàn TMĐT)
export function renderProduct(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, size: AdSize = DEF): string {
  const { w, h } = size;
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const onLight = skin.ink.toLowerCase() !== '#ffffff';
  // Nền: lớp ảnh riêng (vị trí/độ mờ chỉnh được) + lớp phủ theo "Độ tối"; nếu không có ảnh thì màu skin
  const bgDim = (content.bgDim ?? 35) / 100;        // mặc định phủ nhẹ 35%, user chỉnh
  const bgBlur = content.bgBlur ?? 0;
  const bgx = content.bgX ?? 50, bgy = content.bgY ?? 50;
  const overlayRGB = onLight ? '255,255,255' : '12,12,18';
  const bgLayers = content.bgImage
    ? `<div style="position:absolute;inset:0;background:url('${content.bgImage}') ${bgx}% ${bgy}%/cover no-repeat;${bgBlur ? `filter:blur(${bgBlur}px);transform:scale(1.06);` : ''}"></div>
       <div style="position:absolute;inset:0;background:rgba(${overlayRGB},${bgDim});"></div>`
    : '';
  const products = (content.products || []).filter(Boolean).slice(0, 3);
  const prodMax = clamp(Math.round(h * 0.44), 300, 1000);
  // Phóng to / Dịch ảnh áp cho sản phẩm (zoom = scale, pan = translate)
  const pz = Math.max(5, content.imgZoom == null ? 100 : content.imgZoom) / 100;
  const px = content.imgX ?? 50, py = content.imgY ?? 50;
  const pTf = `transform:translate(${px - 50}%, ${py - 50}%) scale(${pz});transform-origin:center;`;
  const productsRow = products.length
    ? `<div style="position:relative;z-index:2;flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;gap:28px;">
        ${products.map((p) => `<img src="${p}" alt="" style="max-height:${prodMax}px;max-width:${Math.floor(92 / products.length)}%;object-fit:contain;filter:drop-shadow(0 26px 26px rgba(0,0,0,0.34));${pTf}" />`).join('')}
      </div>`
    : `<div style="flex:1 1 auto;"></div>`;
  const trust = `<span style="display:inline-flex;align-items:center;gap:7px;font-family:${fontBody};font-size:17px;font-weight:600;letter-spacing:0.06em;color:${muted};border:1.5px solid ${onLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.3)'};padding:7px 15px;border-radius:999px;">✓ CHÍNH HÃNG</span>`;
  const priceBox = content.priceNew
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:16px;">
        ${content.priceOld ? `<span style="font-family:${fontBody};font-size:40px;color:${muted};text-decoration:line-through;">${esc(content.priceOld)}</span>` : ''}
        <span style="font-family:${fontDisplay};font-weight:800;font-size:72px;line-height:1;color:${accentInk};background:${accent};padding:10px 26px;border-radius:16px;box-shadow:0 10px 26px rgba(0,0,0,0.22);">${esc(content.priceNew)}</span>
      </div>`
    : (content.eyebrow ? `<div style="text-align:center;margin-top:16px;">${accentTag(content.eyebrow, skin, 32)}</div>` : '');
  return `<div style="width:${w}px;height:${h}px;box-sizing:border-box;position:relative;overflow:hidden;background:${skin.bgGradient || bg};color:${ink};font-family:${fontBody};padding:72px 64px;display:flex;flex-direction:column;text-align:center;">
    ${bgLayers}
    ${renderSeasonDecor(seasonId, seasonVariant)}
    ${skin.grain ? grainLayer() : ''}
    <div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:16px;">
      <span style="font-family:${fontDisplay};font-weight:800;font-size:30px;color:${ink};">${esc(content.brand || 'Mivy')}</span>${trust}
    </div>
    <h1 style="position:relative;z-index:2;margin:16px 0 0;font-family:${fontDisplay};font-weight:800;font-size:66px;line-height:1.0;letter-spacing:-0.01em;text-transform:uppercase;color:${ink};">${esc(content.headline || '')}</h1>
    <div style="position:relative;z-index:2;">${priceBox}</div>
    ${productsRow}
    ${content.cta ? `<div style="position:relative;z-index:2;display:flex;justify-content:center;margin-top:12px;">${ctaBtn(content, skin)}</div>` : ''}
  </div>`;
}

export function buildAdTemplate(content: AdContent, skinId: string, seasonId?: string, seasonVariant?: string | SeasonDecorOpts, frame?: AdFrameOpts, sizeId?: string, bgId?: string): AdTemplateDef | null {
  const base = getSkin(skinId);
  if (!base) return null;
  const size = getAdSize(sizeId);
  // Áp màu nền (tách khỏi bố cục): đổi gradient + chữ/nút theo nền sáng/tối
  const bgDef = getBackground(bgId);
  const skin: AdSkin = (bgDef && bgDef.css)
    ? {
        ...base, bgGradient: bgDef.css,
        ink: bgDef.light ? '#241f2e' : '#ffffff',
        muted: bgDef.light ? '#6b6676' : 'rgba(255,255,255,0.85)',
        accent: bgDef.light ? '#241f2e' : '#ffffff',
        accentInk: bgDef.light ? '#ffffff' : '#241a3a',
        grain: true, imageTilt: true, imageReflect: true,
      }
    : base;
  const byLayout: Record<string, (c: AdContent, s: AdSkin, si?: string, sv?: string | SeasonDecorOpts, sz?: AdSize) => string> = {
    minimal: renderAdPosterMinimal, device: renderAdDevice, appstore: renderAppstore, split: renderSplit, review: renderReview, collage: renderCollage, fullbleed: renderFullbleed, annotate: renderAnnotate, blog: renderBlog, product: renderProduct,
  };
  const r = skin.layout ? byLayout[skin.layout] : undefined;
  if (r) {
    return { id: `skin-${skin.id}`, title: skin.name, group: skin.group, w: size.w, h: size.h, css: skin.fontImport, html: r(content, skin, seasonId, seasonVariant, size) };
  }
  return {
    id: `skin-${skin.id}`,
    title: skin.name,
    group: skin.group,
    w: size.w,
    h: size.h,
    css: skin.fontImport,
    html: renderAdPoster(content, skin, seasonId, seasonVariant, frame, size),
  };
}

export const AD_SKIN_CSS = AD_SKINS.map((s) => s.fontImport).join('\n');
