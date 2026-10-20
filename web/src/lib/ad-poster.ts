// Bố cục poster quảng cáo CHUẨN (slot) — khoác "skin" nghệ thuật.
// Nội dung ngành đổ vào slot; vibe (màu/font/hoa văn) lấy từ skin.
import { AD_SKINS, AdContent, AdSkin, getSkin } from './ad-skins';
import { renderSeasonDecor } from './season-decor';

export interface AdTemplateDef { id: string; title: string; group: string; w: number; h: number; css: string; html: string; }

function esc(s = ''): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface AdFrameOpts { borderWidth?: number; borderColor?: string; borderRadius?: number }

export function renderAdPoster(content: AdContent, skin: AdSkin, seasonId?: string, seasonVariant?: string, frame?: AdFrameOpts): string {
  const { bg, ink, muted, accent, accentInk, fontDisplay, fontBody } = skin;
  const bw = frame?.borderWidth || 0;
  const border = bw > 0 ? `border:${bw}px solid ${frame?.borderColor || ink};` : '';
  const radius = frame?.borderRadius ? `border-radius:${frame.borderRadius}px;` : '';
  const headTransform = skin.headlineUpper ? 'uppercase' : 'none';
  const headStyle = `font-family:${fontDisplay};font-weight:${skin.headlineWeight || 800};font-style:${skin.headlineItalic ? 'italic' : 'normal'};text-transform:${headTransform};line-height:0.98;letter-spacing:${skin.headlineUpper ? '0.01em' : '-0.01em'};color:${ink};`;

  const eyebrow = content.eyebrow
    ? `<div style="font-family:${fontBody};font-size:22px;letter-spacing:0.4em;text-transform:uppercase;color:${muted};">${esc(content.eyebrow)}</div>`
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
    ? `<div style="margin:40px auto 0;width:560px;height:360px;background:url('${content.image}') center/cover no-repeat;border:2px solid ${ink};"></div>`
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
  <div style="width:1080px;height:1350px;box-sizing:border-box;position:relative;overflow:hidden;background:${bg};font-family:${fontBody};color:${ink};${border}${radius}">
    ${skin.frame(ink, accent, muted)}
    ${renderSeasonDecor(seasonId, seasonVariant)}
    <div style="position:relative;height:100%;box-sizing:border-box;padding:132px 112px;display:flex;flex-direction:column;align-items:center;text-align:center;">
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

      <div style="width:100%;display:flex;align-items:center;justify-content:center;font-family:${fontBody};font-size:17px;letter-spacing:0.3em;text-transform:uppercase;color:${muted};">
        ${esc(brand || 'Mivy')} · ${new Date().getFullYear()}
      </div>
    </div>
  </div>`;
}

export function buildAdTemplate(content: AdContent, skinId: string, seasonId?: string, seasonVariant?: string, frame?: AdFrameOpts): AdTemplateDef | null {
  const skin = getSkin(skinId);
  if (!skin) return null;
  return {
    id: `skin-${skin.id}`,
    title: skin.name,
    group: skin.group,
    w: 1080,
    h: 1350,
    css: skin.fontImport,
    html: renderAdPoster(content, skin, seasonId, seasonVariant, frame),
  };
}

export const AD_SKIN_CSS = AD_SKINS.map((s) => s.fontImport).join('\n');
