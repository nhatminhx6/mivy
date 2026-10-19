import { drawIndustryConcept } from './industry-renderer';
import { drawCatalogPoster } from './catalog-renderer';
import { drawSaleSticker } from './sticker-engine';
import { drawSeasonDecor } from './season-engine';
import { POSTER_FONT, setPosterFontFromState, ensurePosterFontsReady, extractPrimaryFontFamily, collectGlyphsFromState, normalizeCanvasContext } from './poster-font';
export { POSTER_FONT, setPosterFontFromState, ensurePosterFontsReady, extractPrimaryFontFamily, collectGlyphsFromState, normalizeCanvasContext } from './poster-font';
import { resolveStorySource, stripLeadingEnumeration } from './balanced-pages';
export { stripLeadingEnumeration } from './balanced-pages';
import { qcBox } from './qc-capture';
import { AssetInfo, AspectRatio, CopyItem, IndustryId, MarketingState, PosterKind, PosterTheme, ThemeId } from '@/types';

export const POSTER_THEMES: Record<ThemeId, PosterTheme> = {
  tech_dark: {
    id: 'tech_dark',
    name: 'Tech Dark',
    bg: '#0a0d14',
    bgGrad: ['#0a0d14', '#121826', '#06080d'],
    glow: 'rgba(59, 130, 246, 0.18)',
    accent: '#3b82f6',
    accentLight: '#93c5fd',
    accentText: '#ffffff',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    cardBg: 'rgba(18, 24, 38, 0.78)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    cardHighlightBg: 'rgba(59, 130, 246, 0.15)',
    cardHighlightBorder: 'rgba(59, 130, 246, 0.45)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    badgeText: '#93c5fd',
    tagBg: 'rgba(255, 255, 255, 0.08)',
    tagText: '#cbd5e1',
  },
  warm_editorial: {
    id: 'warm_editorial',
    name: 'Warm Editorial',
    bg: '#fbf8f3',
    bgGrad: ['#fbf8f3', '#f3ede2', '#ebdcc6'],
    glow: 'rgba(180, 83, 9, 0.12)',
    accent: '#b45309',
    accentLight: '#d97706',
    accentText: '#ffffff',
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#854d0e',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardBorder: 'rgba(120, 53, 15, 0.18)',
    cardHighlightBg: 'rgba(245, 158, 11, 0.12)',
    cardHighlightBorder: 'rgba(217, 119, 6, 0.45)',
    badgeBg: 'rgba(180, 83, 9, 0.1)',
    badgeBorder: 'rgba(180, 83, 9, 0.25)',
    badgeText: '#b45309',
    tagBg: 'rgba(0, 0, 0, 0.05)',
    tagText: '#44403c',
  },
  bold_vibrant: {
    id: 'bold_vibrant',
    name: 'Bold Vibrant',
    bg: '#0d0f22',
    bgGrad: ['#0d0f22', '#1a1838', '#090814'],
    glow: 'rgba(244, 63, 94, 0.2)',
    accent: '#f43f5e',
    accentLight: '#fda4af',
    accentText: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#f43f5e',
    cardBg: 'rgba(26, 24, 56, 0.78)',
    cardBorder: 'rgba(244, 63, 94, 0.25)',
    cardHighlightBg: 'rgba(244, 63, 94, 0.16)',
    cardHighlightBorder: 'rgba(244, 63, 94, 0.5)',
    badgeBg: 'rgba(244, 63, 94, 0.18)',
    badgeBorder: 'rgba(244, 63, 94, 0.4)',
    badgeText: '#fda4af',
    tagBg: 'rgba(255, 255, 255, 0.1)',
    tagText: '#ffffff',
  },
  clean_minimal: {
    id: 'clean_minimal',
    name: 'Clean Minimal',
    bg: '#ffffff',
    bgGrad: ['#ffffff', '#f8fafc', '#f1f5f9'],
    glow: 'rgba(15, 23, 42, 0.05)',
    accent: '#0f172a',
    accentLight: '#334155',
    accentText: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    cardBorder: 'rgba(15, 23, 42, 0.12)',
    cardHighlightBg: 'rgba(15, 23, 42, 0.05)',
    cardHighlightBorder: 'rgba(15, 23, 42, 0.25)',
    badgeBg: 'rgba(15, 23, 42, 0.08)',
    badgeBorder: 'rgba(15, 23, 42, 0.2)',
    badgeText: '#0f172a',
    tagBg: 'rgba(15, 23, 42, 0.05)',
    tagText: '#334155',
  },
};

export function isMostlyEnglish(text: string): boolean {
  if (!text) return false;
  const viRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (viRegex.test(text)) return false;
  const enWords = text.match(/\b(the|and|for|with|in|to|of|lead|senior|engineer|developer|experience|requirements|skills|apply|build|system|backend|frontend)\b/gi);
  return (enWords ? enWords.length : 0) >= 2;
}

export function getPosterLabels(marketing: MarketingState, sampleText: string = '') {
  const lang = marketing.outputLanguage || 'preserve';
  const isEn = lang === 'en' || (lang === 'preserve' && isMostlyEnglish(sampleText || marketing.details || ''));
  return {
    isEn,
    launchTag: isEn ? '01 / 03 · CAREER OPPORTUNITY' : '01 / 03 · CƠ HỘI NGHỀ NGHIỆP',
    storyTag: (pageLabel?: string) => {
      if (pageLabel) {
        return isEn ? `02 / 03 · ${pageLabel} · REQUIREMENTS` : `02 / 03 · ${pageLabel} · TIÊU CHÍ & YÊU CẦU`;
      }
      return isEn ? '02 / 03 · CRITERIA & REQUIREMENTS' : '02 / 03 · TIÊU CHÍ & YÊU CẦU';
    },
    storySubtitle: isEn ? 'WHAT WE ARE LOOKING FOR' : 'ĐIỀU CHÚNG EM TÌM KIẾM Ở ANH',
    storyFooter: isEn ? 'Next step: Review benefits & submit application' : 'Bước tiếp theo: Tìm hiểu quyền lợi & nộp hồ sơ ứng tuyển',
    actionTag: isEn ? '03 / 03 · CONNECT & APPLY' : '03 / 03 · KẾT NỐI & ỨNG TUYỂN',
    actionSubtitle: isEn ? 'JOIN OUR TEAM TODAY' : 'GIA NHẬP ĐỘI NGŨ NGAY HÔM NAY',
    actionPerkTitle: isEn ? 'OFFER & BENEFITS FOR YOU' : 'ĐÃI NGỘ DÀNH RIÊNG CHO BẠN',
    actionStepPrefix: isEn ? 'STEP' : 'BƯỚC',
    actionContactTitle: isEn ? 'Direct Contact & Inquiries:' : 'Liên hệ & Trao đổi trực tiếp:',
  };
}

export function posterText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  maxHeight: number,
  start: number,
  color: string,
  weight: string = '700',
  family: string = `${POSTER_FONT()}`
): number {
  normalizeCanvasContext(ctx);
  const words = (text || '').split(/\s+/).filter(Boolean);
  // greedy wrap theo bề rộng w
  const greedy = (w: number): string[] => {
    const out: string[] = []; let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > w && line) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
    return out;
  };
  let size = start;
  let lines: string[] = [];
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = greedy(width);
    if (lines.length * size * 1.2 <= maxHeight && lines.every(l => ctx.measureText(l).width <= width)) break;
    size -= 2;
  } while (size > 12);
  // Ngắt CÂN BẰNG: nếu >1 dòng, tìm bề rộng nhỏ nhất vẫn giữ nguyên số dòng
  // → các dòng đều hơn, tránh ngắt kỳ kiểu "Hội / An".
  ctx.font = `${weight} ${size}px ${family}`;
  if (lines.length > 1) {
    const L = lines.length;
    let lo = Math.max(1, ...words.map((wd) => ctx.measureText(wd).width)), hi = width, best = width;
    for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (greedy(mid).length <= L) { best = mid; hi = mid; } else lo = mid + 0.5; }
    const balanced = greedy(best);
    if (balanced.length === L) lines = balanced;
  }

  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * 1.2));
  return lines.length * size * 1.2;
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | null = null,
  stroke: string | null = null,
  shadow: boolean = false
) {
  qcBox('content', x, y, w, h, 'card');
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  radius: number = 0
) {
  if (!img) return;
  const nw = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 1;
  const nh = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 1;
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, radius);
    ctx.clip();
  }
  const imgRatio = nw / nh;
  const targetRatio = dw / dh;
  let sx = 0, sy = 0, sw = nw, sh = nh;
  if (imgRatio > targetRatio) {
    sw = nh * targetRatio;
    sx = (nw - sw) / 2;
  } else {
    sh = nw / targetRatio;
    sy = (nh - sh) / 2;
  }
  try {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  } catch (e) {}
  ctx.restore();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  if (bgImg && ((bgImg as HTMLImageElement).complete || (bgImg as HTMLImageElement).naturalWidth > 0)) {
    try {
      ctx.drawImage(bgImg, 0, 0, w, h);
      ctx.save();
      const tint = ctx.createLinearGradient(0, 0, 0, h);
      if (th.id === 'tech_dark') {
        tint.addColorStop(0, 'rgba(12, 15, 23, 0.75)');
        tint.addColorStop(0.35, 'rgba(12, 15, 23, 0.60)');
        tint.addColorStop(1, 'rgba(10, 13, 20, 0.94)');
      } else if (th.id === 'warm_editorial') {
        tint.addColorStop(0, 'rgba(248, 245, 238, 0.82)');
        tint.addColorStop(0.35, 'rgba(248, 245, 238, 0.70)');
        tint.addColorStop(1, 'rgba(237, 228, 211, 0.95)');
      } else if (th.id === 'bold_vibrant') {
        tint.addColorStop(0, 'rgba(10, 17, 40, 0.75)');
        tint.addColorStop(0.35, 'rgba(10, 17, 40, 0.60)');
        tint.addColorStop(1, 'rgba(6, 11, 28, 0.94)');
      } else {
        tint.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        tint.addColorStop(0.35, 'rgba(248, 250, 252, 0.75)');
        tint.addColorStop(1, 'rgba(241, 245, 249, 0.95)');
      }
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return;
    } catch (e) {}
  }

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, th.bgGrad[0]);
  grad.addColorStop(0.5, th.bgGrad[1]);
  grad.addColorStop(1, th.bgGrad[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const rg1 = ctx.createRadialGradient(w * 0.85, h * 0.15, 50, w * 0.85, h * 0.15, w * 0.7);
  rg1.addColorStop(0, th.glow);
  rg1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rg1;
  ctx.fillRect(0, 0, w, h);

  const rg2 = ctx.createRadialGradient(w * 0.15, h * 0.85, 30, w * 0.15, h * 0.85, w * 0.6);
  rg2.addColorStop(0, th.glow);
  rg2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rg2;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = th.cardBorder;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(56, 136);
  ctx.lineTo(w - 56, 136);
  ctx.stroke();
  ctx.restore();
}

export function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  border: string,
  color: string,
  dotColor: string | null = null,
  customH: number = 38
): number {
  ctx.save();
  normalizeCanvasContext(ctx);
  const h = customH;
  ctx.font = h <= 34 ? `700 16px ${POSTER_FONT()}` : `600 19px ${POSTER_FONT()}`;
  const padX = h <= 34 ? 14 : 20;
  const metrics = ctx.measureText(text);
  const w = Math.round(metrics.width + padX * 2 + (dotColor ? 16 : 0));
  qcBox('content', x, y, w, h, 'badge');

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  let textX = x + padX;
  if (dotColor) {
    ctx.beginPath();
    ctx.arc(x + padX + 5, y + h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    textX += 16;
  }

  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, textX, y + h / 2);
  ctx.restore();
  return w;
}

export function drawAssetShowcase(
  ctx: CanvasRenderingContext2D,
  asset: AssetInfo | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 20,
  options: { badge?: string; tag?: string; theme?: PosterTheme; pad?: number; isCutout?: boolean } = {}
) {
  if (!asset || !asset.im) return;

  const th = options.theme || POSTER_THEMES.tech_dark;
  const imW = asset.im.naturalWidth || asset.im.width || 1;
  const imH = asset.im.naturalHeight || asset.im.height || 1;
  const boxW = asset.w || imW;
  const boxH = asset.h || imH;
  const boxL = asset.l || 0;
  const boxT = asset.t || 0;

  const isCutout = options.isCutout ?? (boxW < imW * 0.9 && boxH < imH * 0.9);

  if (isCutout) {
    drawCard(ctx, x, y, w, h, radius, th.cardBg, th.cardBorder, true);
    const pad = options.pad || 24;
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const scale = Math.min(maxW / boxW, maxH / boxH);
    const drawW = boxW * scale;
    const drawH = boxH * scale;
    const dx = x + (w - drawW) / 2;
    const dy = y + (h - drawH) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 12;
    try {
      ctx.drawImage(asset.im, boxL, boxT, boxW, boxH, dx, dy, drawW, drawH);
    } catch (e) {}
    ctx.restore();
  } else {
    drawImageCover(ctx, asset.im, x, y, w, h, radius);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();

    const ov = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
    ov.addColorStop(0, 'rgba(0, 0, 0, 0)');
    ov.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = ov;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = th.cardBorder || 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  if (options.badge) {
    drawBadgePill(ctx, options.badge, x + 20, y + h - 50, th.badgeBg, th.cardHighlightBorder, th.textPrimary);
  }

  if (options.tag && w > 360) {
    drawBadgePill(ctx, options.tag, x + w - 210, y + 16, 'rgba(0, 0, 0, 0.55)', 'rgba(255, 255, 255, 0.22)', '#ffffff');
  }
}

export function drawArrowIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x + size * 0.35, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size, y + size * 0.65);
  ctx.stroke();
  ctx.restore();
}

export function drawPaperPlaneIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.45);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.35, y + size);
  ctx.lineTo(x + size * 0.45, y + size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawHandwrittenSlogan(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  angleDeg: number = -6
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.font = `600 ${size}px "Caveat", "Dancing Script", cursive, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';

  const lines = text.split('\n');
  let maxW = 0;
  lines.forEach((line, idx) => {
    ctx.fillText(line, 0, idx * (size * 1.05));
    const w = ctx.measureText(line).width;
    if (w > maxW) maxW = w;
  });

  const underlineY = lines.length * (size * 1.05) - 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-maxW * 0.85, underlineY);
  ctx.quadraticCurveTo(-maxW * 0.4, underlineY - 4, 0, underlineY + 2);
  ctx.stroke();

  ctx.restore();
}

export function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h);

  const buildings = [
    { w: 55, h: 90 }, { w: 40, h: 140 }, { w: 60, h: 70 }, { w: 45, h: 180, spire: true },
    { w: 70, h: 110 }, { w: 50, h: 150 }, { w: 80, h: 85 }, { w: 45, h: 200, spire: true },
    { w: 65, h: 130 }, { w: 55, h: 95 }, { w: 75, h: 160 }, { w: 50, h: 120 },
    { w: 90, h: 75 }, { w: 45, h: 170, spire: true }, { w: 60, h: 105 }, { w: 85, h: 140 }
  ];

  let curX = x;
  for (let i = 0; curX < x + w; i++) {
    const b = buildings[i % buildings.length];
    const bw = b.w;
    const bh = Math.min(h, b.h);
    const by = y + h - bh;

    ctx.lineTo(curX, by);
    if (b.spire) {
      const spireX = curX + bw / 2;
      ctx.lineTo(spireX - 3, by);
      ctx.lineTo(spireX, by - 24);
      ctx.lineTo(spireX + 3, by);
      ctx.lineTo(curX + bw, by);
      ctx.lineTo(curX + bw, y + h);
    } else {
      ctx.lineTo(curX + bw, by);
      ctx.lineTo(curX + bw, y + h);
    }
    curX += bw;
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRecruitmentHero(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  const hasPhoto = Boolean(asset && asset.im);
  if (hasPhoto && asset?.im) {
    drawImageCover(ctx, asset.im, 0, 0, w, h, 0);
    const vignette = ctx.createLinearGradient(0, 0, 0, h);
    vignette.addColorStop(0, 'rgba(3, 7, 18, 0.78)');
    vignette.addColorStop(0.18, 'rgba(3, 7, 18, 0.42)');
    vignette.addColorStop(0.38, 'rgba(3, 7, 18, 0.12)');
    vignette.addColorStop(0.55, 'rgba(3, 7, 18, 0.48)');
    vignette.addColorStop(0.75, 'rgba(3, 7, 18, 0.88)');
    vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
    drawCitySkyline(ctx, 0, h - 280, w, 220, th.glow);
  }

  const m = 54, contentW = w - m * 2;

  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;

  const brandText = marketing.brand || 'MIVY STUDIO';
  drawBadgePill(ctx, brandText, m, 52, th.badgeBg, th.cardBorder, th.textPrimary);
  drawBadgePill(ctx, labels.launchTag, w - m - 320, 52, th.badgeBg, th.cardBorder, th.accent);

  ctx.save();
  ctx.font = 'italic 700 44px "Caveat", "Dancing Script", cursive, sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText("We're", m + 4, 134);
  ctx.restore();

  ctx.save();
  ctx.font = `900 86px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textPrimary;
  ctx.fillText('HIRING', m, 216);
  ctx.restore();

  const roleTitle = (copy.headline || marketing.name || 'FULLSTACK DEVELOPER').replace(/^tuyển(?: dụng)?\s+/i, '');
  ctx.save();
  ctx.font = `700 34px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentLight;
  ctx.fillText(roleTitle.toUpperCase(), m + 2, 264);
  ctx.restore();

  ctx.save();
  ctx.font = `600 14px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textMuted;
  ctx.fillText(isEn ? 'JOIN OUR TEAM   ·   BUILD BETTER TOGETHER' : 'GIA NHẬP ĐỘI NGŨ   ·   CÙNG NHAU PHÁT TRIỂN', m + 3, 296);
  ctx.restore();

  const allFacts = (copy.pointsEdited || (copy.points && copy.points.length >= 5))
    ? copy.points!
    : (marketing.details || '').split(/\n+/).map(t => t.trim()).filter(Boolean);

  let salaryHighlight = '';
  const cleanFacts: string[] = [];
  for (const fact of allFacts) {
    if (!salaryHighlight && /lương|triệu|usd|\$|thưởng|đãi ngộ/i.test(fact)) {
      salaryHighlight = fact;
    } else {
      cleanFacts.push(fact);
    }
  }
  if (!salaryHighlight && marketing.offer) {
    salaryHighlight = marketing.offer;
  }

  const footerH = 145;
  const footerY = h - footerH - 30;

  const tableY = 330;
  const tableH = footerY - tableY - 24;

  const itemsToRender: { icon: string; category: string; content: string; highlight: boolean }[] = [];

  if (salaryHighlight) {
    itemsToRender.push({
      icon: '💰',
      category: isEn ? 'OFFER & REWARDS' : 'ĐÃI NGỘ & LƯƠNG',
      content: salaryHighlight,
      highlight: true,
    });
  }

  for (const fact of cleanFacts) {
    if (itemsToRender.length >= ((hasPhoto && h < 1350) ? 3 : 4)) break;
    let icon = '⚡';
    let category = isEn ? 'KEY REQUIREMENT' : 'TIÊU CHÍ TRỌNG TÂM';
    if (/năm|year|exp|kinh nghiệm/i.test(fact)) {
      icon = '⚙️';
      category = isEn ? 'EXPERIENCE' : 'KINH NGHIỆM';
    } else if (/react|node|js|ts|python|golang|java|cloud|aws|docker|k8s|tech|stack|sql/i.test(fact)) {
      icon = '💻';
      category = isEn ? 'TECH STACK' : 'KỸ NĂNG & CÔNG NGHỆ';
    } else if (/tp\.hcm|hà nội|đà nẵng|remote|hybrid|hồ chí minh|toàn thời gian|full-time|on-site|location/i.test(fact)) {
      icon = '📍';
      category = isEn ? 'LOCATION & MODE' : 'ĐỊA ĐIỂM & CHẾ ĐỘ';
    } else if (/debt|mentor|codebase|stakeholder|lead|team|quản lý|leadership/i.test(fact)) {
      icon = '🎯';
      category = isEn ? 'RESPONSIBILITIES' : 'TRÁCH NHIỆM CHÍNH';
    }
    itemsToRender.push({
      icon,
      category,
      content: fact,
      highlight: false,
    });
  }

  if (itemsToRender.length === 0 && copy.subline) {
    itemsToRender.push({
      icon: '✨',
      category: isEn ? 'OVERVIEW' : 'TỔNG QUAN',
      content: copy.subline,
      highlight: false,
    });
  }

  const rowCount = Math.max(1, itemsToRender.length);
  const cardGap = (hasPhoto && h < 1350) ? 12 : 16;
  const rowH = Math.floor((tableH - (rowCount - 1) * cardGap) / rowCount);

  itemsToRender.forEach((item, rIdx) => {
    const ry = tableY + rIdx * (rowH + cardGap);
    const cardCenterY = Math.round(ry + rowH / 2);

    drawCard(
      ctx,
      m,
      ry,
      contentW,
      rowH,
      18,
      item.highlight ? 'rgba(16, 185, 129, 0.16)' : th.cardBg,
      item.highlight ? th.accent : th.cardBorder
    );

    const badgeFontSize = (hasPhoto && h < 1350) ? 12 : 13;
    ctx.save();
    ctx.font = `700 ${badgeFontSize}px ${POSTER_FONT()}`;
    const badgeText = `${item.icon}  ${item.category}`;
    const badgeTextW = Math.round(ctx.measureText(badgeText).width);
    const badgeW = badgeTextW + 28;
    const badgeH = (hasPhoto && h < 1350) ? 32 : 36;
    const badgeY = Math.round(cardCenterY - badgeH / 2);

    drawBadgePill(
      ctx,
      badgeText,
      m + 20,
      badgeY,
      item.highlight ? th.accent : th.badgeBg,
      item.highlight ? th.accent : th.badgeBorder,
      item.highlight ? th.accentText : th.accentLight
    );
    ctx.restore();

    const textX = m + 20 + badgeW + 20;
    const maxTextW = contentW - (textX - m + 24);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(m, ry, contentW, rowH, 18);
    ctx.clip();

    const maxFontSize = (hasPhoto && h < 1350) ? 19 : 22;
    posterText(
      ctx,
      item.content,
      textX,
      ry + 12,
      maxTextW,
      rowH - 24,
      maxFontSize,
      item.highlight ? th.accentLight : th.textPrimary,
      '600',
      `${POSTER_FONT()}`
    );
    ctx.restore();
  });

  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  const btnW = 290, btnH = 64;
  drawCard(ctx, m, footerY + 8, btnW, btnH, 32, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 28, footerY + 28, 24, th.accentText);

  ctx.save();
  ctx.font = `700 23px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(isEn ? 'Apply Now' : 'Ứng tuyển ngay', m + 68, footerY + 8 + btnH / 2);
  ctx.restore();

  const infoX = m + btnW + 28;
  ctx.save();
  ctx.font = `500 17px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textSecondary;
  ctx.fillText(isEn ? '✉ Or connect to receive the full JD!' : '✉  hoặc inbox để nhận JD đầy đủ!', infoX, footerY + 28);

  ctx.font = `700 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textPrimary;
  const contactText = phone ? `📞  Hotline: ${phone}` : (email ? `✉  Email: ${email}` : (marketing.brand ? `🏢  ${marketing.brand}` : (isEn ? '📩  Connect with us' : '📩  Inbox để ứng tuyển')));
  ctx.fillText(contactText, infoX, footerY + 58);
  ctx.restore();

  drawHandwrittenSlogan(ctx, isEn ? 'Same Team\nBrighter Future' : 'Cùng Đội Ngũ\nVươn Xa Hơn', w - m, footerY + 52, 28, th.accentLight, -5);

  ctx.save();
  ctx.font = `600 12px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textMuted;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  const footerBrand = marketing.brand ? marketing.brand.toUpperCase() : 'INNOVATE';
  ctx.fillText(`${footerBrand}   ·   GROW   ·   LEARN   ·   MAKE AN IMPACT`, w / 2, h - 18);
  ctx.restore();
}

export function drawRecruitmentStory(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  const hasPhoto = Boolean(asset && asset.im);

  if (hasPhoto && asset?.im) {
    drawImageCover(ctx, asset.im, 0, 0, w, h, 0);
    const vignette = ctx.createLinearGradient(0, 0, 0, h);
    vignette.addColorStop(0, 'rgba(3, 7, 18, 0.82)');
    vignette.addColorStop(0.25, 'rgba(3, 7, 18, 0.45)');
    vignette.addColorStop(0.55, 'rgba(3, 7, 18, 0.65)');
    vignette.addColorStop(1, 'rgba(3, 7, 18, 0.96)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
  }

  const m = 60, contentW = w - m * 2;

  const resolved = resolveStorySource(marketing, copy);
  const allPoints = resolved.items;
  const labels = getPosterLabels(marketing, [copy.headline, copy.subline, ...allPoints, marketing.details].filter(Boolean).join(' '));
  const isEn = labels.isEn;

  const totalPages = resolved.totalPages;
  const curPage = resolved.pageIndex;
  const points = resolved.pageItems;
  const startIdx = resolved.pageOffset;

  const pageLabel = totalPages > 1 ? (isEn ? `PAGE ${curPage + 1}/${totalPages}` : `TRANG ${curPage + 1}/${totalPages}`) : '';
  const badgeText = labels.storyTag(pageLabel);
  const badgeW = totalPages > 1 ? 360 : 300;

  drawBadgePill(ctx, marketing.brand || (isEn ? 'CAREERS' : 'TUYỂN DỤNG'), m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, badgeText, w - m - badgeW, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.font = `700 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accent;
  ctx.fillText(labels.storySubtitle, m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || (isEn ? 'Technical Criteria & Requirements' : 'Yêu cầu chuyên môn & kinh nghiệm'),
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 60 : 46,
    th.textPrimary,
    '800',
    `${POSTER_FONT()}`
  );

  const startY = 215 + titleHeight + 28;
  const footerY = h - 120;
  const availableH = footerY - startY - 20;

  const cardH = points.length > 0 ? (availableH - (points.length - 1) * 16) / points.length : 0;

  points.forEach((point, i) => {
    const cy = startY + i * (cardH + 16);
    const cardCenterY = cy + cardH / 2;
    const globalIdx = startIdx + i + 1;
    const numStr = (globalIdx < 10 ? '0' : '') + globalIdx;


    ctx.save();
    ctx.font = `800 ${cardH > 140 ? '54px' : '42px'} "Be Vietnam Pro", monospace`;
    ctx.fillStyle = th.accent;
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, m + 10, cardCenterY);
    ctx.restore();

    posterText(
      ctx,
      stripLeadingEnumeration(point),
      m + 115,
      cy + (cardH > 140 ? 18 : 10),
      contentW - 135,
      cardH - 24,
      cardH > 140 ? 28 : (cardH > 90 ? 22 : 18),
      th.textPrimary,
      '600',
      `${POSTER_FONT()}`
    );
  });

  ctx.save();
  ctx.font = `600 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textSecondary;
  ctx.fillText(labels.storyFooter, m, footerY + 39);
  drawArrowIcon(ctx, m + contentW - 45, footerY + 22, 20, th.accent);
  ctx.restore();
}

export function drawRecruitmentAction(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  const hasPhoto = Boolean(asset && asset.im);

  if (hasPhoto && asset?.im) {
    drawImageCover(ctx, asset.im, 0, 0, w, h, 0);
    const vignette = ctx.createLinearGradient(0, 0, 0, h);
    vignette.addColorStop(0, 'rgba(3, 7, 18, 0.85)');
    vignette.addColorStop(0.25, 'rgba(3, 7, 18, 0.50)');
    vignette.addColorStop(0.60, 'rgba(3, 7, 18, 0.78)');
    vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
  }

  const m = 60, contentW = w - m * 2;

  const source = ((copy.points || []).join(' ') + ' ' + copy.subline + ' ' + marketing.details + ' ' + marketing.offer);
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;

  drawBadgePill(ctx, marketing.brand || (isEn ? 'CAREERS' : 'TUYỂN DỤNG'), m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, labels.actionTag, w - m - 310, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  ctx.save();
  ctx.font = `700 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accent;
  ctx.fillText(labels.actionSubtitle, m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || (isEn ? 'Application Process & How to Apply' : 'Quy trình ứng tuyển nhanh gọn'),
    m,
    215,
    contentW,
    h * 0.15,
    h >= 1350 ? 60 : 46,
    th.textPrimary,
    '800',
    `${POSTER_FONT()}`
  );

  let currentY = 215 + titleHeight + 25;

  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];

  const contactH = h >= 1350 ? 250 : 200;
  drawCard(ctx, m, currentY, contentW, contactH, 24, th.cardHighlightBg, th.cardHighlightBorder, true);

  drawBadgePill(ctx, isEn ? 'DIRECT APPLICATION METHOD' : 'CÁCH THỨC ỨNG TUYỂN TRỰC TIẾP', m + 32, currentY + 28, th.tagBg, th.cardHighlightBorder, th.tagText);

  ctx.save();
  ctx.font = hasPhoto ? `800 36px ${POSTER_FONT()}` : `800 42px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textPrimary;
  const emailText = email || (isEn ? 'Send resume to recruiting team' : 'Gửi CV về ban tuyển dụng');
  ctx.fillText(emailText.length > 28 ? emailText.slice(0, 25) + '...' : emailText, m + 32, currentY + 115);

  ctx.font = `500 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.textSecondary;
  const subText = isEn
    ? 'Subject: [Full Name] - Application for ' + (marketing.name || 'Position')
    : 'Tiêu đề: [Họ tên] - Ứng tuyển ' + (marketing.name || 'Vị trí');
  ctx.fillText(subText.length > 36 ? subText.slice(0, 33) + '...' : subText, m + 32, currentY + 160);
  if (contactH > 210 && marketing.offer) {
    const notePrefix = isEn ? 'Note: ' : 'Ghi chú: ';
    ctx.fillText(notePrefix + (marketing.offer.length > 38 ? marketing.offer.slice(0, 35) + '...' : marketing.offer), m + 32, currentY + 200);
  }
  ctx.restore();

  currentY += contactH + 30;

  let steps: { num: string; title: string; desc: string }[] = [];
  if (copy.points && copy.points.length >= 2) {
    steps = copy.points.slice(0, 3).map((pt, i) => {
      const parts = pt.split(/[:\-\–]/);
      const title = parts[0]?.trim() || (isEn ? `Step ${i + 1}` : `Bước ${i + 1}`);
      const desc = parts.slice(1).join(':').trim() || pt;
      return { num: `0${i + 1}`, title, desc };
    });
  } else {
    steps = isEn
      ? [
          { num: '01', title: 'Submit CV', desc: 'Send resume & portfolio of production projects' },
          { num: '02', title: 'Interview', desc: 'Technical and architectural discussion with team' },
          { num: '03', title: 'Offer', desc: 'Finalize compensation and onboarding schedule' },
        ]
      : [
          { num: '01', title: 'Gửi Hồ Sơ', desc: 'CV & Portfolio các sản phẩm thực tế đã làm' },
          { num: '02', title: 'Phỏng Vấn', desc: 'Trao đổi chuyên môn cùng Tech Lead' },
          { num: '03', title: 'Nhận Offer', desc: 'Thống nhất đãi ngộ và bắt đầu đồng hành' },
        ];
  }

  const stepCardW = (contentW - 36) / 3;
  const stepCardH = Math.min(180, Math.max(120, h - currentY - 140));

  steps.forEach((st, i) => {
    const sx = m + i * (stepCardW + 18);
    drawCard(ctx, sx, currentY, stepCardW, stepCardH, 20, th.cardBg, th.cardBorder);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sx, currentY, stepCardW, stepCardH, 20);
    ctx.clip();

    const pad = 18;
    const headerH = 34;
    const headerCenterY = currentY + pad + headerH / 2;

    const badgeH = 28;
    const badgeY = Math.round(headerCenterY - badgeH / 2);
    const badgeW = drawBadgePill(ctx, st.num, sx + pad, badgeY, th.badgeBg, th.badgeBorder, th.accent, null, badgeH);

    const titleX = sx + pad + badgeW + 12;
    const maxTitleW = stepCardW - (pad + badgeW + 12 + pad);
    ctx.save();
    ctx.font = `700 20px ${POSTER_FONT()}`;
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(st.title, titleX, headerCenterY, maxTitleW);
    ctx.restore();

    const descY = currentY + pad + headerH + 12;
    const descH = stepCardH - (pad + headerH + 12 + pad);
    posterText(
      ctx,
      st.desc,
      sx + pad,
      descY,
      stepCardW - pad * 2,
      descH,
      15,
      th.textSecondary,
      '400',
      `${POSTER_FONT()}`
    );

    ctx.restore();
  });

  const footerY = h - 105;
  drawCard(ctx, m, footerY, contentW, 68, 20, th.accent, null, true);
  ctx.save();
  ctx.font = `700 24px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || (isEn ? 'Apply Now' : 'Gửi CV Ngay Hôm Nay'), m + 32, footerY + 34);
  drawArrowIcon(ctx, m + contentW - 55, footerY + 22, 24, th.accentText);
  ctx.restore();
}

export function drawEducationPoster(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  drawBackground(ctx, w, h, th, bgImg);
  const m = 60, contentW = w - m * 2;
  const hasPhoto = Boolean(asset && asset.im);

  const labels = ['KHÓA HỌC MỚI', 'LỘ TRÌNH ĐÀO TẠO', 'THÔNG TIN ĐĂNG KÝ'];
  const stepIdx = kind === 'launch' ? 0 : kind === 'story' ? 1 : 2;

  drawBadgePill(ctx, marketing.brand || 'MIVY ACADEMY', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, labels[stepIdx], w - m - 260, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  const titleHeight = posterText(
    ctx,
    copy.headline,
    m,
    180,
    contentW,
    h * 0.18,
    h >= 1350 ? 64 : 50,
    th.textPrimary,
    '800',
    `${POSTER_FONT()}`
  );

  let currentY = 180 + titleHeight + 22;
  const footerY = h - 130;

  if (hasPhoto) {
    const photoH = h >= 1920 ? 360 : (h >= 1350 ? 240 : 160);
    drawAssetShowcase(ctx, asset, m, currentY, contentW, photoH, 20, {
      badge: 'LỚP HỌC & GIẢNG VIÊN',
      tag: 'THỰC HÀNH DỰ ÁN',
      theme: th,
      isCutout: Boolean(marketing.cutout),
    });
    currentY += photoH + 20;
  } else if (copy.subline) {
    const subH = posterText(ctx, copy.subline, m, currentY, contentW, h * 0.08, 26, th.textSecondary, '400');
    currentY += subH + 20;
  }

  const cardAreaH = footerY - currentY - 20;
  const resolvedEdu = resolveStorySource(marketing, copy);
  const points = kind === 'story' ? resolvedEdu.pageItems : resolvedEdu.items.slice(0, 3);
  const cardH = points.length > 0 ? (cardAreaH - (points.length - 1) * 16) / points.length : 0;

  points.forEach((pt, i) => {
    const cy = currentY + i * (cardH + 16);
    drawCard(ctx, m, cy, contentW, cardH, 20, th.cardBg, th.cardBorder);
    drawBadgePill(ctx, 'CHẶNG 0' + (i + 1), m + 24, cy + 20, th.tagBg, th.cardHighlightBorder, th.tagText);

    posterText(ctx, stripLeadingEnumeration(pt), m + 160, cy + 18, contentW - 190, cardH - 36, cardH > 100 ? 25 : 21, th.textPrimary, '600');
  });

  drawCard(ctx, m, footerY, 340, 80, 22, th.accent, null, true);
  ctx.save();
  ctx.font = `700 25px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Đăng ký ngay', m + 32, footerY + 40);
  drawArrowIcon(ctx, m + 285, footerY + 28, 24, th.accentText);
  ctx.restore();

  if (marketing.offer) {
    const infoW = contentW - 360;
    drawCard(ctx, m + 360, footerY, infoW, 80, 22, th.cardHighlightBg, th.cardHighlightBorder);
    ctx.save();
    ctx.font = `700 24px ${POSTER_FONT()}`;
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText('Ưu đãi: ' + marketing.offer, m + 385, footerY + 40);
    ctx.restore();
  }
}

export function drawServicePoster(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  drawBackground(ctx, w, h, th, bgImg);
  const m = 60, contentW = w - m * 2;
  const hasPhoto = Boolean(asset && asset.im);

  drawBadgePill(ctx, marketing.brand || 'DỊCH VỤ CHUYÊN NGHIỆP', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, 'GIẢI PHÁP TỐI ƯU', w - m - 230, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  const titleHeight = posterText(
    ctx,
    copy.headline,
    m,
    180,
    contentW,
    h * 0.18,
    h >= 1350 ? 64 : 50,
    th.textPrimary,
    '800',
    `${POSTER_FONT()}`
  );

  let currentY = 180 + titleHeight + 22;
  const footerY = h - 130;

  if (hasPhoto) {
    const photoH = h >= 1920 ? 360 : (h >= 1350 ? 240 : 160);
    drawAssetShowcase(ctx, asset, m, currentY, contentW, photoH, 20, {
      badge: 'DỊCH VỤ & GIẢI PHÁP THỰC TẾ',
      tag: 'CHUYÊN NGHIỆP',
      theme: th,
      isCutout: Boolean(marketing.cutout),
    });
    currentY += photoH + 20;
  } else if (copy.subline) {
    const subH = posterText(ctx, copy.subline, m, currentY, contentW, h * 0.08, 26, th.textSecondary, '400');
    currentY += subH + 20;
  }

  const resolvedSvc = resolveStorySource(marketing, copy);
  const points = kind === 'story' ? resolvedSvc.pageItems : resolvedSvc.items.slice(0, 3);
  const cardAreaH = footerY - currentY - 20;
  const cardH = points.length > 0 ? (cardAreaH - (points.length - 1) * 16) / points.length : 0;

  points.forEach((pt, i) => {
    const cy = currentY + i * (cardH + 16);
    drawCard(ctx, m, cy, contentW, cardH, 20, th.cardBg, th.cardBorder);

    ctx.save();
    ctx.font = '800 24px "Be Vietnam Pro", monospace';
    ctx.fillStyle = th.accent;
    ctx.fillText('0' + (i + 1), m + 28, cy + cardH / 2 + 8);
    ctx.restore();

    posterText(ctx, stripLeadingEnumeration(pt), m + 80, cy + 22, contentW - 110, cardH - 44, cardH > 100 ? 25 : 21, th.textPrimary, '600');
  });

  drawCard(ctx, m, footerY, contentW, 80, 22, th.accent, null, true);
  ctx.save();
  ctx.font = `700 26px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Liên hệ tư vấn ngay', m + 36, footerY + 40);
  drawArrowIcon(ctx, m + contentW - 55, footerY + 28, 24, th.accentText);
  ctx.restore();
}

export function drawGeneralModernPoster(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;
  const source = [copy.headline, copy.subline, marketing.details, marketing.offer].filter(Boolean).join(' ');
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;
  const isTall = h >= 1600;
  const isCompact = h <= 1100;
  const resolved = resolveStorySource(marketing, copy);

  const fitLine = (t: string, maxW: number, startPx: number, weight: string): number => {
    let fs = startPx; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`;
    while (ctx.measureText(t).width > maxW && fs > 18) { fs -= 2; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`; }
    return fs;
  };

  // ===== Nền màu đặc theo theme =====
  const grad = (th.bgGrad && th.bgGrad.length >= 3) ? th.bgGrad : [th.bg, th.bg, th.bg];
  const bgG = ctx.createLinearGradient(0, 0, w * 0.45, h);
  bgG.addColorStop(0, grad[0]); bgG.addColorStop(0.55, grad[1]); bgG.addColorStop(1, grad[2]);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, w, h);
  const glowG = ctx.createRadialGradient(w * 0.1, 0, 20, w * 0.1, 0, w * 0.8);
  glowG.addColorStop(0, th.glow); glowG.addColorStop(1, 'transparent');
  ctx.fillStyle = glowG; ctx.fillRect(0, 0, w, h);

  const m = 64, contentW = w - m * 2, cw = contentW;

  // ===== Top: brand + kicker =====
  let y = 60;
  drawBadgePill(ctx, (marketing.brand || marketing.name || 'MIVY STUDIO'), m, y, th.badgeBg, th.badgeBorder, th.badgeText);
  const kicker = kind === 'launch' ? (isEn ? 'Featured' : 'Nổi bật')
    : kind === 'story' ? (isEn ? 'Why choose us' : 'Vì sao nên chọn')
      : (isEn ? 'Offer & contact' : 'Ưu đãi & liên hệ');

  // ===== Hero (kicker chỉ hiện 1 lần dạng script, tránh lặp) =====
  y = isCompact ? 150 : 178;
  ctx.save();
  ctx.font = `italic 700 ${isCompact ? 34 : 42}px "Caveat", "Dancing Script", cursive, sans-serif`;
  ctx.fillStyle = th.accent; ctx.textBaseline = 'alphabetic';
  ctx.fillText(kicker, m, y);
  ctx.restore();

  const bigTitle = (copy.headline || marketing.name || (isEn ? 'Our product' : 'Sản phẩm & dịch vụ')).toUpperCase();
  const bigPx = fitLine(bigTitle, cw, isCompact ? 56 : (isTall ? 88 : 72), '900');
  const titleH = posterText(ctx, bigTitle, m, y + 18, cw, isTall ? 260 : 210, bigPx, th.textPrimary, '900', `${POSTER_FONT()}`);
  y = y + 18 + titleH + 6;

  if (copy.subline) {
    const sH = posterText(ctx, copy.subline, m, y, cw, 64, isTall ? 22 : 18, th.textSecondary, '500', `${POSTER_FONT()}`);
    y += sH + 4;
  }

  // ===== Ảnh sản phẩm (nếu có) trong khung =====
  const hasAsset = Boolean(asset && asset.im);
  const bandH = Math.round(h * (isTall ? 0.26 : (isCompact ? 0.20 : 0.24)));
  if (hasAsset) {
    const bandY = y + 20;
    drawAssetShowcase(ctx, asset!, m, bandY, cw, bandH, 22, { theme: th, isCutout: Boolean(marketing.cutout) });
    y = bandY + bandH;
  }

  // ===== Ưu đãi + điểm nổi bật =====
  const points = (kind === 'story' ? resolved.pageItems : resolved.items).filter(Boolean);
  const footerY = h - (isTall ? 160 : 132);
  let ry = y + 26;

  if (marketing.offer) {
    const chipH = 58;
    drawCard(ctx, m, ry, cw, chipH, 14, th.accent, null, false);
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, ry, cw, chipH, 14); ctx.clip();
    ctx.font = `700 12px ${POSTER_FONT()}`; ctx.fillStyle = th.accentText; ctx.textBaseline = 'alphabetic';
    ctx.fillText(isEn ? 'OFFER' : 'ƯU ĐÃI', m + 18, ry + 22);
    posterText(ctx, marketing.offer, m + 18, ry + 30, cw - 36, 22, 17, th.accentText, '700', `${POSTER_FONT()}`);
    ctx.restore();
    ry += chipH + 18;
  }

  if (points.length > 0 && footerY - ry - 20 > 70) {
    ctx.save(); ctx.font = `700 14px ${POSTER_FONT()}`; ctx.fillStyle = th.accentLight; ctx.textBaseline = 'alphabetic';
    ctx.fillText(isEn ? 'HIGHLIGHTS' : 'ĐIỂM NỔI BẬT', m + 14, ry);
    ctx.restore();
    ry += 24;
    const maxN = hasAsset ? (isTall ? 4 : 3) : (isTall ? 6 : 4);
    const show = points.slice(0, maxN);
    const n = show.length;
    const rowFs = isTall ? 20 : 18;
    const availH = footerY - 24 - ry;
    // thẻ cao, dàn đều LẤP khoảng trống (tránh card nhỏ trôi nổi) — ưu tiên thẻ to, gap nhỏ
    const gap = n > 1 ? 16 : 0;
    let cardH = Math.floor((availH - gap * (n - 1)) / n);
    cardH = Math.max(66, Math.min(cardH, isTall ? 240 : 200));
    const blockH = n * cardH + (n - 1) * gap;
    const startY = ry + Math.max(0, Math.floor((availH - blockH) / 2));
    const badgeH = 30;
    show.forEach((pt, i) => {
      const cardY = startY + i * (cardH + gap);
      drawCard(ctx, m, cardY, cw, cardH, 14, th.cardBg, th.cardBorder, false);
      ctx.save(); ctx.beginPath(); ctx.roundRect(m, cardY + 14, 4, cardH - 28, 2); ctx.fillStyle = th.accent; ctx.fill(); ctx.restore();
      const badgeW = drawBadgePill(ctx, `0${i + 1}`, m + 22, Math.round(cardY + (cardH - badgeH) / 2), th.badgeBg, th.badgeBorder, th.accent, null, badgeH);
      const tx = m + 22 + badgeW + 16;
      posterText(ctx, stripLeadingEnumeration(pt), tx, cardY + Math.round((cardH - rowFs * 1.3) / 2), cw - (tx - m) - 20, cardH - 16, rowFs, th.textPrimary, '600', `${POSTER_FONT()}`);
    });
  }

  // ===== CTA + liên hệ =====
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];
  const cta = copy.cta || (isEn ? 'Learn more' : 'Khám phá ngay');
  ctx.font = `700 22px ${POSTER_FONT()}`;
  const ctaW = Math.round(ctx.measureText(cta).width + 90);
  const ctaH = 60;
  drawCard(ctx, m, footerY, ctaW, ctaH, 30, th.accent, null, true);
  ctx.save(); ctx.font = `700 22px ${POSTER_FONT()}`; ctx.fillStyle = th.accentText; ctx.textBaseline = 'middle';
  ctx.fillText(cta, m + 28, footerY + ctaH / 2 + 1);
  drawArrowIcon(ctx, m + ctaW - 34, footerY + ctaH / 2 - 11, 22, th.accentText);
  ctx.restore();
  const contact = phone ? `📞 ${phone}` : (email ? `✉ ${email}` : (marketing.brand || ''));
  if (contact) {
    ctx.save(); ctx.fillStyle = th.textSecondary; ctx.textBaseline = 'middle'; ctx.font = `600 16px ${POSTER_FONT()}`;
    ctx.fillText(contact, m + ctaW + 24, footerY + ctaH / 2 + 1);
    ctx.restore();
  }
}

export function drawFullPhotoRecruitmentHero(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;

  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;
  const isTall = h >= 1600;
  const isCompact = h <= 1100;

  const fitLine = (t: string, maxW: number, startPx: number, weight: string): number => {
    let fs = startPx; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`;
    while (ctx.measureText(t).width > maxW && fs > 18) { fs -= 2; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`; }
    return fs;
  };

  // ===== 1. Nền màu đặc theo theme (KHÔNG đè chữ lên ảnh) =====
  const grad = (th.bgGrad && th.bgGrad.length >= 3) ? th.bgGrad : [th.bg, th.bg, th.bg];
  const bgG = ctx.createLinearGradient(0, 0, w * 0.45, h);
  bgG.addColorStop(0, grad[0]); bgG.addColorStop(0.55, grad[1]); bgG.addColorStop(1, grad[2]);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, w, h);
  const glowG = ctx.createRadialGradient(w * 0.92, 0, 20, w * 0.92, 0, w * 0.8);
  glowG.addColorStop(0, th.glow); glowG.addColorStop(1, 'transparent');
  ctx.fillStyle = glowG; ctx.fillRect(0, 0, w, h);

  const m = 64, contentW = w - m * 2, cw = contentW;

  // ===== 2. Top: brand + nhãn giai đoạn =====
  let y = 60;
  drawBadgePill(ctx, (marketing.brand || 'MIVY STUDIO'), m, y, th.badgeBg, th.badgeBorder, th.badgeText);
  ctx.save();
  ctx.font = `700 14px ${POSTER_FONT()}`; ctx.fillStyle = th.textMuted;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText((labels.launchTag || '').toUpperCase(), w - m, y + 18);
  ctx.restore();

  // ===== 3. Hero: chữ to, tương phản mạnh =====
  y = isCompact ? 150 : 180;
  ctx.save();
  ctx.font = `italic 700 ${isCompact ? 40 : 48}px "Caveat", "Dancing Script", cursive, sans-serif`;
  ctx.fillStyle = th.accent; ctx.textBaseline = 'alphabetic';
  ctx.fillText(isEn ? "We're" : 'Chúng tôi đang', m, y);
  ctx.restore();

  const bigWord = isEn ? 'HIRING' : 'TUYỂN DỤNG';
  const bigPx = fitLine(bigWord, cw, isCompact ? 96 : (isTall ? 132 : 116), '900');
  y += Math.round(bigPx * 0.98) + 18;
  ctx.save();
  ctx.font = `900 ${bigPx}px ${POSTER_FONT()}`; ctx.fillStyle = th.textPrimary;
  ctx.fillText(bigWord, m, y);
  ctx.restore();

  const roleTitle = (copy.headline || marketing.name || 'FULLSTACK DEVELOPER').replace(/^tuyển(?: dụng)?\s+/i, '').toUpperCase();
  const rolePx = fitLine(roleTitle, cw, isCompact ? 30 : 38, '800');
  y += Math.round(rolePx * 1.25);
  ctx.save();
  ctx.font = `800 ${rolePx}px ${POSTER_FONT()}`; ctx.fillStyle = th.accentLight;
  ctx.fillText(roleTitle, m, y);
  ctx.restore();

  y += 28;
  ctx.save();
  // Dùng slogan người dùng nhập (copy.subline); nếu trống mới dùng mặc định.
  const heroSub = (copy.subline && copy.subline.trim())
    ? copy.subline.toUpperCase()
    : (isEn ? 'JOIN OUR CORE TEAM  ·  BUILD BETTER TOGETHER' : 'GIA NHẬP ĐỘI NGŨ NÒNG CỐT  ·  CÙNG NHAU PHÁT TRIỂN');
  const heroSubPx = fitLine(heroSub, cw, 15, '600');
  ctx.font = `600 ${heroSubPx}px ${POSTER_FONT()}`; ctx.fillStyle = th.textSecondary;
  ctx.fillText(heroSub, m, y);
  ctx.restore();

  // ===== 4. Ảnh gọn trong 1 khung bo góc (không tràn nền) =====
  const photo = (asset && asset.im) ? asset.im : bgImg;
  const bandY = y + 26;
  const bandH = Math.round(h * (isTall ? 0.30 : (isCompact ? 0.24 : 0.28)));
  if (photo) {
    drawImageCover(ctx, photo, m, bandY, cw, bandH, 22);
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, bandY, cw, bandH, 22);
    ctx.lineWidth = 2; ctx.strokeStyle = th.cardBorder; ctx.stroke(); ctx.restore();
  } else {
    drawCard(ctx, m, bandY, cw, bandH, 22, th.cardBg, th.cardBorder, false);
    drawCitySkyline(ctx, m, bandY + bandH - 90, cw, 80, th.glow);
  }

  // ===== 5. Facts → khối màu + danh sách yêu cầu =====
  const allFacts = (copy.pointsEdited || (copy.points && copy.points.length >= 4))
    ? copy.points!
    : (marketing.details || '').split(/\n+/).map(t => t.trim()).filter(Boolean);
  let salaryHighlight = '';
  const cleanFacts: string[] = [];
  for (const f of allFacts) {
    if (!salaryHighlight && /lương|triệu|usd|\$|thưởng|đãi ngộ/i.test(f)) salaryHighlight = f;
    else cleanFacts.push(f);
  }
  if (!salaryHighlight && marketing.offer) salaryHighlight = marketing.offer;

  const infoBlocks: { tag: string; val: string; hi: boolean }[] = [];
  if (salaryHighlight) infoBlocks.push({ tag: isEn ? 'OFFER & REWARDS' : 'ĐÃI NGỘ / LƯƠNG', val: salaryHighlight, hi: true });
  const reqPoints: string[] = [];
  for (const f of cleanFacts) {
    if (infoBlocks.length < 3 && /năm|year|exp|kinh nghiệm/i.test(f)) infoBlocks.push({ tag: isEn ? 'EXPERIENCE' : 'KINH NGHIỆM', val: f, hi: false });
    else if (infoBlocks.length < 3 && /tp\.hcm|hà nội|đà nẵng|remote|hybrid|hồ chí minh|toàn thời gian|full-time|on-site|location/i.test(f)) infoBlocks.push({ tag: isEn ? 'LOCATION & MODE' : 'ĐỊA ĐIỂM & CHẾ ĐỘ', val: f, hi: false });
    else reqPoints.push(f);
  }
  if (reqPoints.length === 0 && copy.subline) reqPoints.push(copy.subline);

  // khối màu thông tin
  const iy = bandY + bandH + 26;
  const n = infoBlocks.length;
  const blockH = isTall ? 108 : 94;
  if (n > 0) {
    const gap = 16;
    const bw = (cw - gap * (n - 1)) / n;
    infoBlocks.forEach((b, i) => {
      const bx = m + i * (bw + gap);
      drawCard(ctx, bx, iy, bw, blockH, 16, b.hi ? th.accent : th.cardBg, b.hi ? null : th.cardBorder, false);
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx, iy, bw, blockH, 16); ctx.clip();
      ctx.font = `700 12px ${POSTER_FONT()}`; ctx.fillStyle = b.hi ? th.accentText : th.textMuted; ctx.textBaseline = 'alphabetic';
      ctx.fillText(b.tag, bx + 16, iy + 28);
      posterText(ctx, b.val, bx + 16, iy + 40, bw - 32, blockH - 50, isTall ? 18 : 16, b.hi ? th.accentText : th.textPrimary, '700', `${POSTER_FONT()}`);
      ctx.restore();
    });
  }

  // ===== 6. Footer ghim đáy =====
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];
  const footerY = h - (isTall ? 160 : 132);

  // ===== 7. Danh sách yêu cầu (trên nền đặc, không hộp) =====
  let ry = iy + (n > 0 ? blockH : 0) + 30;
  const reqRoom = footerY - ry - 20;
  if (reqPoints.length > 0 && reqRoom > 90) {
    ctx.save();
    ctx.font = `700 14px ${POSTER_FONT()}`; ctx.fillStyle = th.accentLight; ctx.textBaseline = 'alphabetic';
    ctx.fillText(isEn ? 'KEY REQUIREMENTS & QUALIFICATIONS' : 'YÊU CẦU & KỸ NĂNG THEN CHỐT', m + 14, ry);
    ctx.restore();
    ry += 26;
    const rowFs = isTall ? 20 : 18;
    const rowH = Math.round(rowFs * 1.7);
    const rowGap = 12;
    const fitRows = Math.max(1, Math.floor((footerY - 20 - ry + rowGap) / (rowH + rowGap)));
    const show = reqPoints.slice(0, Math.min(fitRows, isTall ? 6 : 4));
    const listBot = ry + show.length * rowH + (show.length - 1) * rowGap;
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, ry, 4, Math.max(8, listBot - ry), 2); ctx.fillStyle = th.accent; ctx.fill(); ctx.restore();
    const badgeH = 28;
    show.forEach((pt, i) => {
      const rowY = ry + i * (rowH + rowGap);
      const badgeX = m + 16;
      const badgeW = drawBadgePill(ctx, `0${i + 1}`, badgeX, Math.round(rowY + (rowH - badgeH) / 2), th.badgeBg, th.badgeBorder, th.accent, null, badgeH);
      const tx = badgeX + badgeW + 16;
      posterText(ctx, stripLeadingEnumeration(pt), tx, rowY + Math.round((rowH - rowFs * 1.3) / 2), cw - (tx - m) - 8, rowH, rowFs, th.textPrimary, '600', `${POSTER_FONT()}`);
    });
  }

  // ===== 8. CTA + liên hệ =====
  const cta = copy.cta || (isEn ? 'Apply now' : 'Gửi CV ngay');
  ctx.font = `700 22px ${POSTER_FONT()}`;
  const ctaW = Math.round(ctx.measureText(cta).width + 96);
  const ctaH = 60;
  drawCard(ctx, m, footerY, ctaW, ctaH, 30, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 26, footerY + ctaH / 2 - 11, 22, th.accentText);
  ctx.save();
  ctx.font = `700 22px ${POSTER_FONT()}`; ctx.fillStyle = th.accentText; ctx.textBaseline = 'middle';
  ctx.fillText(cta, m + 60, footerY + ctaH / 2 + 1);
  ctx.restore();

  const contactText = phone ? `📞 ${phone}` : (email ? `✉ ${email}` : (marketing.brand ? marketing.brand : (isEn ? 'Connect with us' : 'Inbox để ứng tuyển')));
  ctx.save();
  ctx.fillStyle = th.textSecondary; ctx.textBaseline = 'middle';
  ctx.font = `600 16px ${POSTER_FONT()}`;
  ctx.fillText(contactText, m + ctaW + 24, footerY + ctaH / 2 + 1);
  ctx.restore();
}

export function drawFullPhotoRecruitmentStory(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;

  const photo = (asset && asset.im) ? asset.im : bgImg;
  if (photo) {
    drawImageCover(ctx, photo, 0, 0, w, h, 0);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, h);
  vignette.addColorStop(0, 'rgba(3, 7, 18, 0.82)');
  vignette.addColorStop(0.25, 'rgba(3, 7, 18, 0.45)');
  vignette.addColorStop(0.55, 'rgba(3, 7, 18, 0.65)');
  vignette.addColorStop(1, 'rgba(3, 7, 18, 0.96)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const m = 60, contentW = w - m * 2;

  const resolved = resolveStorySource(marketing, copy);
  const allPoints = resolved.items;
  const labels = getPosterLabels(marketing, [copy.headline, copy.subline, ...allPoints, marketing.details].filter(Boolean).join(' '));
  const isEn = labels.isEn;

  const totalPages = resolved.totalPages;
  const curPage = resolved.pageIndex;
  const points = resolved.pageItems;
  const startIdx = resolved.pageOffset;

  const pageLabel = totalPages > 1 ? (isEn ? `PAGE ${curPage + 1}/${totalPages}` : `TRANG ${curPage + 1}/${totalPages}`) : '';
  const badgeText = labels.storyTag(pageLabel);
  const badgeW = totalPages > 1 ? 360 : 300;

  drawBadgePill(ctx, marketing.brand || (isEn ? 'CAREERS' : 'TUYỂN DỤNG'), m, 68, 'rgba(0, 0, 0, 0.7)', 'rgba(255, 255, 255, 0.2)', '#ffffff');
  drawBadgePill(ctx, badgeText, w - m - badgeW, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;
  ctx.font = `700 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentLight;
  ctx.fillText(labels.storySubtitle, m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || (isEn ? 'Technical Criteria & Requirements' : 'Yêu cầu chuyên môn & kinh nghiệm'),
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 56 : 44,
    '#ffffff',
    '800',
    `${POSTER_FONT()}`
  );

  const startY = 215 + titleHeight + 30;
  const footerY = h - 120;
  const availableH = footerY - startY - 20;

  // Cap chiều cao card cho gọn (tránh card rỗng khổng lồ khi ít item), canh giữa stack trong vùng trống.
  const n = points.length;
  const gapBase = 18;
  const maxCard = h >= 1600 ? 150 : 124;
  let cardH = n > 0 ? Math.min(maxCard, (availableH - gapBase * (n - 1)) / n) : 0;
  cardH = Math.max(cardH, 88);
  let cardGap = n > 1 ? (availableH - n * cardH) / (n - 1) : gapBase;
  cardGap = Math.max(gapBase, Math.min(cardGap, 36));
  const stackTop = startY + Math.max(0, (availableH - (n * cardH + cardGap * (n - 1))) / 2);

  points.forEach((point, i) => {
    const cy = stackTop + i * (cardH + cardGap);
    const cardCenterY = cy + cardH / 2;
    const globalIdx = startIdx + i + 1;
    const numStr = (globalIdx < 10 ? '0' : '') + globalIdx;

    // Không bọc box đen: thanh accent mảnh trái + số lớn + text, có bóng đổ để nổi trên ảnh.
    ctx.save();
    ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.roundRect(m, cy + 12, 5, cardH - 24, 3); ctx.fill();
    ctx.restore();

    const numFontSize = cardH > 130 ? 46 : 38;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 10;
    ctx.font = `800 ${numFontSize}px ${POSTER_FONT()}`;
    ctx.fillStyle = th.accent;
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, m + 28, cardCenterY);
    const numW = ctx.measureText(numStr).width;
    ctx.restore();

    const textFontSize = cardH > 130 ? 22 : 18;
    const textLineH = Math.round(textFontSize * 1.35);
    const textX = m + 28 + Math.round(numW) + 24;
    const textMaxW = contentW - (textX - m + 28);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 8;
    ctx.font = `600 ${textFontSize}px ${POSTER_FONT()}`;
    const words = (stripLeadingEnumeration(point) || '').split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      const test = currentLine ? currentLine + ' ' + w : w;
      if (ctx.measureText(test).width > textMaxW && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    if (lines.length === 1) {
      ctx.fillText(lines[0], textX, cardCenterY);
    } else {
      const startY = cardCenterY - ((lines.length - 1) * textLineH) / 2;
      lines.forEach((l, lIdx) => {
        ctx.fillText(l, textX, Math.round(startY + lIdx * textLineH));
      });
    }
    ctx.restore();
  });

  ctx.save();
  ctx.font = `600 20px ${POSTER_FONT()}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(labels.storyFooter, m, footerY + 39);
  drawArrowIcon(ctx, m + contentW - 45, footerY + 22, 20, th.accent);
  ctx.restore();
}

export function drawFullPhotoRecruitmentAction(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;

  const photo = (asset && asset.im) ? asset.im : bgImg;
  if (photo) {
    drawImageCover(ctx, photo, 0, 0, w, h, 0);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, h);
  vignette.addColorStop(0, 'rgba(3, 7, 18, 0.85)');
  vignette.addColorStop(0.25, 'rgba(3, 7, 18, 0.50)');
  vignette.addColorStop(0.60, 'rgba(3, 7, 18, 0.78)');
  vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const m = 60, contentW = w - m * 2;

  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;

  drawBadgePill(ctx, marketing.brand || (isEn ? 'CAREERS' : 'TUYỂN DỤNG'), m, 68, 'rgba(0, 0, 0, 0.7)', 'rgba(255, 255, 255, 0.2)', '#ffffff');
  drawBadgePill(ctx, labels.actionTag, w - m - 310, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;
  ctx.font = `700 20px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentLight;
  ctx.fillText(labels.actionSubtitle, m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || (isEn ? 'How to Connect & Apply' : 'Quy trình kết nối & nhận offer'),
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 56 : 44,
    '#ffffff',
    '800',
    `${POSTER_FONT()}`
  );

  let curY = 215 + titleHeight + 25;

  if (marketing.offer) {
    const offerH = 92;
    ctx.save();
    ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.roundRect(m, curY + 8, 5, offerH - 16, 3); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 10;
    ctx.font = `700 16px ${POSTER_FONT()}`;
    ctx.fillStyle = th.accentLight;
    ctx.fillText(labels.actionPerkTitle, m + 22, curY + 36);
    ctx.font = `800 28px ${POSTER_FONT()}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(marketing.offer, m + 22, curY + 74);
    ctx.restore();
    curY += offerH + 18;
  }

  let points = copy.points && copy.points.length ? copy.points.slice(0, 3) : [copy.subline];
  if (!points[0]) points = [isEn ? 'Submit your CV or connect directly to receive full details.' : 'Gửi CV qua email hoặc inbox trực tiếp để nhận JD chi tiết.'];

  const stepCardH = 78;
  points.forEach((pt, i) => {
    const stepCenterY = curY + stepCardH / 2;
    const badgeH = 34;
    const badgeY = Math.round(stepCenterY - badgeH / 2);

    // Thanh accent mảnh bên trái thay cho box đen (text sạch, không bọc hộp)
    ctx.save();
    ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.roundRect(m, curY + 10, 5, stepCardH - 20, 3); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 10;
    const badgeW = drawBadgePill(ctx, `${labels.actionStepPrefix} ${i + 1}`, m + 22, badgeY, th.badgeBg, th.badgeBorder, th.accent, null, badgeH);
    ctx.restore();
    const stepTextX = m + 22 + badgeW + 18;
    const stepTextW = contentW - (22 + badgeW + 18 + 24);

    const textFontSize = 19;
    const textLineH = Math.round(textFontSize * 1.35);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 8;
    ctx.font = `600 ${textFontSize}px ${POSTER_FONT()}`;
    const words = (stripLeadingEnumeration(pt) || '').split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      const test = currentLine ? currentLine + ' ' + w : w;
      if (ctx.measureText(test).width > stepTextW && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    if (lines.length === 1) {
      ctx.fillText(lines[0], stepTextX, stepCenterY);
    } else {
      const startY = stepCenterY - ((lines.length - 1) * textLineH) / 2;
      lines.forEach((l, lIdx) => {
        ctx.fillText(l, stepTextX, Math.round(startY + lIdx * textLineH));
      });
    }
    ctx.restore();

    curY += stepCardH + 12;
  });

  const footerY = h - 140;
  const btnW = 320, btnH = 68;
  drawCard(ctx, m, footerY, btnW, btnH, 34, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 32, footerY + 20, 26, th.accentText);

  ctx.save();
  ctx.font = `700 24px ${POSTER_FONT()}`;
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || (isEn ? 'Apply Now' : 'Ứng Tuyển Ngay'), m + 78, footerY + btnH / 2);
  ctx.restore();

  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  const infoX = m + btnW + 30;
  ctx.save();
  ctx.font = `500 17px ${POSTER_FONT()}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(labels.actionContactTitle, infoX, footerY + 20);

  ctx.font = `700 22px ${POSTER_FONT()}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(phone ? `📞  ${phone}` : (email ? `✉  ${email}` : (marketing.brand ? `🏢  ${marketing.brand}` : (isEn ? '📩  Connect with our team' : '📩  Liên hệ để kết nối ngay'))), infoX, footerY + 52);
  ctx.restore();
}

// Vẽ 1 card check-list (dùng cho story/action các ngành chung)
function drawCheckCards(
  ctx: CanvasRenderingContext2D,
  items: string[],
  m: number,
  contentW: number,
  top: number,
  bottom: number,
  th: PosterTheme
) {
  if (!items.length) return;
  const gap = 18;
  const availH = bottom - top;
  const n = items.length;
  const cardH = Math.min(132, (availH - (n - 1) * gap) / n);
  const rowGap = n > 1 ? Math.max(gap, Math.min((availH - n * cardH) / (n - 1), 40)) : gap;
  const stackTop = top + Math.max(0, (availH - (n * cardH + rowGap * (n - 1))) / 2);
  items.forEach((pt, i) => {
    const cy = stackTop + i * (cardH + rowGap);
    const cardCenterY = cy + cardH / 2;

    // Không bọc box đen: dot check accent + text, bóng đổ để nổi trên ảnh.
    const dotR = Math.min(24, cardH * 0.26);
    const dotX = m + 24 + dotR, dotY = cardCenterY;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'; ctx.shadowBlur = 10;
    ctx.fillStyle = th.accent;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = th.accentText || '#04110c';
    ctx.lineWidth = Math.max(3, dotR * 0.18);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(dotX - dotR * 0.42, dotY + dotR * 0.02);
    ctx.lineTo(dotX - dotR * 0.08, dotY + dotR * 0.38);
    ctx.lineTo(dotX + dotR * 0.46, dotY - dotR * 0.4);
    ctx.stroke();
    ctx.restore();

    const textX = dotX + dotR + 24;
    const textMaxW = contentW - (textX - m) - 28;
    const fs = cardH > 120 ? 24 : 21;
    const lineH = Math.round(fs * 1.32);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 8;
    ctx.font = `600 ${fs}px ${POSTER_FONT()}`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    const words = (pt || '').split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(t).width > textMaxW && cur) { lines.push(cur); cur = wd; } else { cur = t; }
    }
    if (cur) lines.push(cur);
    const visible = lines.slice(0, 3);
    const sy = cardCenterY - ((visible.length - 1) * lineH) / 2;
    visible.forEach((l, li) => ctx.fillText(l, textX, Math.round(sy + li * lineH)));
    ctx.restore();
    // QC: ghi tâm Y của số (dotY) và text để audit so khớp
    const rec = (globalThis as unknown as { __qcAlign?: { n: number; t: number }[] }).__qcAlign;
    if (rec) rec.push({ n: dotY, t: sy + ((visible.length - 1) * lineH) / 2 });
  });
}

export function drawFullPhotoGeneral(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  copy: CopyItem,
  asset: AssetInfo | null,
  th: PosterTheme,
  bgImg: CanvasImageSource | null = null
) {
  const S = canvas.width / 1080, w = 1080, h = canvas.height / S;
  const ctx = canvas.getContext('2d')!;

  const source = [copy.headline, copy.subline, marketing.details, marketing.offer].filter(Boolean).join(' ');
  const labels = getPosterLabels(marketing, source);
  const isEn = labels.isEn;
  const isTall = h >= 1600;
  const isCompact = h <= 1100;
  const resolved = resolveStorySource(marketing, copy);

  const fitLine = (t: string, maxW: number, startPx: number, weight: string): number => {
    let fs = startPx; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`;
    while (ctx.measureText(t).width > maxW && fs > 18) { fs -= 2; ctx.font = `${weight} ${fs}px ${POSTER_FONT()}`; }
    return fs;
  };

  // ===== Nền màu đặc theo theme (KHÔNG đè chữ lên ảnh) =====
  const grad = (th.bgGrad && th.bgGrad.length >= 3) ? th.bgGrad : [th.bg, th.bg, th.bg];
  const bgG = ctx.createLinearGradient(0, 0, w * 0.45, h);
  bgG.addColorStop(0, grad[0]); bgG.addColorStop(0.55, grad[1]); bgG.addColorStop(1, grad[2]);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, w, h);
  const glowG = ctx.createRadialGradient(w * 0.92, 0, 20, w * 0.92, 0, w * 0.8);
  glowG.addColorStop(0, th.glow); glowG.addColorStop(1, 'transparent');
  ctx.fillStyle = glowG; ctx.fillRect(0, 0, w, h);

  const m = 64, contentW = w - m * 2, cw = contentW;

  // ===== Top: brand (kicker chỉ hiện 1 lần ở dạng script bên dưới, tránh lặp) =====
  let y = 60;
  drawBadgePill(ctx, (marketing.brand || 'MIVY STUDIO'), m, y, th.badgeBg, th.badgeBorder, th.badgeText);
  const kicker = kind === 'launch' ? (isEn ? 'Featured' : 'Nổi bật')
    : kind === 'story' ? (isEn ? 'Why choose us' : 'Vì sao nên chọn')
      : (isEn ? 'Offer & contact' : 'Ưu đãi & liên hệ');

  // ===== Hero: kicker script + tiêu đề to =====
  y = isCompact ? 150 : 178;
  ctx.save();
  ctx.font = `italic 700 ${isCompact ? 34 : 42}px "Caveat", "Dancing Script", cursive, sans-serif`;
  ctx.fillStyle = th.accent; ctx.textBaseline = 'alphabetic';
  ctx.fillText(kicker, m, y);
  ctx.restore();

  const bigTitle = (copy.headline || marketing.name || (isEn ? 'Our product' : 'Sản phẩm & dịch vụ')).toUpperCase();
  const bigPx = fitLine(bigTitle, cw, isCompact ? 56 : (isTall ? 88 : 72), '900');
  ctx.save();
  const titleH = posterText(ctx, bigTitle, m, y + 18, cw, isTall ? 260 : 210, bigPx, th.textPrimary, '900', `${POSTER_FONT()}`);
  ctx.restore();
  y = y + 18 + titleH + 6;

  if (copy.subline) {
    ctx.save();
    const sH = posterText(ctx, copy.subline, m, y, cw, 64, isTall ? 22 : 18, th.textSecondary, '500', `${POSTER_FONT()}`);
    ctx.restore();
    y += sH + 4;
  }

  // ===== Ảnh gọn trong khung bo góc =====
  const photo = (asset && asset.im) ? asset.im : bgImg;
  const bandY = y + 20;
  // Ảnh hero: poster "launch" cho ảnh TO hơn (ảnh là thứ hút khách); story/action nhỏ hơn để chừa danh sách.
  const bandRatio = kind === 'launch'
    ? (isTall ? 0.40 : (isCompact ? 0.30 : 0.38))
    : (isTall ? 0.28 : (isCompact ? 0.22 : 0.26));
  const bandH = Math.round(h * bandRatio);
  if (photo) {
    drawImageCover(ctx, photo, m, bandY, cw, bandH, 22);
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, bandY, cw, bandH, 22); ctx.lineWidth = 2; ctx.strokeStyle = th.cardBorder; ctx.stroke(); ctx.restore();
  } else {
    drawCard(ctx, m, bandY, cw, bandH, 22, th.cardBg, th.cardBorder, false);
    drawCitySkyline(ctx, m, bandY + bandH - 90, cw, 80, th.glow);
  }

  // ===== Ưu đãi (khối nhấn) + danh sách điểm =====
  const points = (kind === 'story' ? resolved.pageItems : resolved.items).filter(Boolean);
  const footerY = h - (isTall ? 160 : 132);
  let ry = bandY + bandH + 26;

  if (marketing.offer) {
    const chipH = 58;
    drawCard(ctx, m, ry, cw, chipH, 14, th.accent, null, false);
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, ry, cw, chipH, 14); ctx.clip();
    ctx.font = `700 12px ${POSTER_FONT()}`; ctx.fillStyle = th.accentText; ctx.textBaseline = 'alphabetic';
    ctx.fillText(isEn ? 'OFFER' : 'ƯU ĐÃI', m + 18, ry + 22);
    posterText(ctx, marketing.offer, m + 18, ry + 30, cw - 36, 22, 17, th.accentText, '700', `${POSTER_FONT()}`);
    ctx.restore();
    ry += chipH + 18;
  }

  if (points.length > 0 && footerY - ry - 20 > 70) {
    ctx.save(); ctx.font = `700 14px ${POSTER_FONT()}`; ctx.fillStyle = th.accentLight; ctx.textBaseline = 'alphabetic';
    ctx.fillText(isEn ? 'HIGHLIGHTS' : 'ĐIỂM NỔI BẬT', m + 14, ry);
    ctx.restore();
    ry += 26;
    const rowFs = isTall ? 19 : 17; const rowH = Math.round(rowFs * 1.7); const baseGap = 12;
    const fitRows = Math.max(1, Math.floor((footerY - 20 - ry + baseGap) / (rowH + baseGap)));
    const show = points.slice(0, Math.min(fitRows, isTall ? 6 : 4));
    const nRows = show.length;
    const availListH = footerY - 20 - ry;
    // dàn đều để LẤP khoảng trống ở khổ cao (9:16); 4:5/1:1 gần như không đổi
    const rowGap = nRows > 1 ? Math.max(baseGap, Math.min(44, Math.floor((availListH - nRows * rowH) / (nRows - 1)))) : baseGap;
    const listBot = ry + show.length * rowH + (show.length - 1) * rowGap;
    ctx.save(); ctx.beginPath(); ctx.roundRect(m, ry, 4, Math.max(8, listBot - ry), 2); ctx.fillStyle = th.accent; ctx.fill(); ctx.restore();
    const badgeH = 28;
    show.forEach((pt, i) => {
      const rowY = ry + i * (rowH + rowGap);
      const badgeW = drawBadgePill(ctx, `0${i + 1}`, m + 16, Math.round(rowY + (rowH - badgeH) / 2), th.badgeBg, th.badgeBorder, th.accent, null, badgeH);
      const tx = m + 16 + badgeW + 16;
      posterText(ctx, stripLeadingEnumeration(pt), tx, rowY + Math.round((rowH - rowFs * 1.3) / 2), cw - (tx - m) - 8, rowH, rowFs, th.textPrimary, '600', `${POSTER_FONT()}`);
    });
  }

  // ===== CTA + liên hệ =====
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];
  const cta = copy.cta || (isEn ? 'Learn more' : 'Khám phá ngay');
  ctx.font = `700 22px ${POSTER_FONT()}`;
  const ctaW = Math.round(ctx.measureText(cta).width + 90);
  const ctaH = 60;
  drawCard(ctx, m, footerY, ctaW, ctaH, 30, th.accent, null, true);
  ctx.save(); ctx.font = `700 22px ${POSTER_FONT()}`; ctx.fillStyle = th.accentText; ctx.textBaseline = 'middle';
  ctx.fillText(cta, m + 28, footerY + ctaH / 2 + 1);
  drawArrowIcon(ctx, m + ctaW - 34, footerY + ctaH / 2 - 11, 22, th.accentText);
  ctx.restore();
  const contact = phone ? `📞 ${phone}` : (email ? `✉ ${email}` : (marketing.brand || ''));
  if (contact) {
    ctx.save(); ctx.fillStyle = th.textSecondary; ctx.textBaseline = 'middle'; ctx.font = `600 16px ${POSTER_FONT()}`;
    ctx.fillText(contact, m + ctaW + 24, footerY + ctaH / 2 + 1);
    ctx.restore();
  }
}

// Watermark "mivy" chìm góc dưới (gói Free). Pro truyền pro=true để bỏ.
export function drawWatermark(canvas: HTMLCanvasElement, pro = false) {
  if (pro) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  // Vẽ theo PIXEL THẬT của canvas (reset transform) → đúng cho mọi engine, mọi khổ (1080/1200/1640…)
  const W = canvas.width, H = canvas.height;
  const fs = Math.max(16, Math.round(W * 0.018));
  const pad = Math.round(W * 0.026);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `800 ${fs}px ${POSTER_FONT()}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = Math.round(fs * 0.4); ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('✳ mivy', W - pad, H - pad);
  ctx.restore();
}

export function drawIndustryPoster(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  rawCopy: CopyItem,
  asset: AssetInfo | null,
  bgImg: CanvasImageSource | null = null,
  logoImg: CanvasImageSource | null = null,
  scale: number = 1
) {
  setPosterFontFromState(marketing); // chọn font trước khi vẽ
  drawIndustryPosterCore(canvas, marketing, kind, rawCopy, asset, bgImg, logoImg, scale);
  // Viền khung cho poster ngành (template tự xử lý trong catalog-renderer)
  if (!marketing.templateId && marketing.borderWidth && marketing.borderWidth > 0) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const S = canvas.width / 1080, W = 1080, Hh = canvas.height / S; // toạ độ logic (ctx đã scale ở Core)
      const bw = marketing.borderWidth;
      const fm = Math.round(W * 0.03);
      const rad = marketing.borderRadius ?? 0;
      ctx.save();
      ctx.strokeStyle = marketing.borderColor || marketing.brandKit?.colorAccent || '#ffffff';
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.roundRect(fm + bw / 2, fm + bw / 2, W - fm * 2 - bw, Hh - fm * 2 - bw, rad);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Overlay sau cùng — áp cho MỌI nhánh layout: trang trí mùa trước, sticker trên cùng
  drawSeasonDecor(canvas, marketing);
  drawSaleSticker(canvas, marketing);
  drawWatermark(canvas);
}

function drawIndustryPosterCore(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  rawCopy: CopyItem,
  asset: AssetInfo | null,
  bgImg: CanvasImageSource | null = null,
  logoImg: CanvasImageSource | null = null,
  scale: number = 1
) {
  const hMap: Record<AspectRatio, number> = { '1:1': 1080, '4:5': 1350, '9:16': 1920 };
  const h = hMap[marketing.aspect] || 1350;
  const S = Math.max(1, Math.min(4, scale)); // supersampling: vẽ theo toạ độ logic 1080×h, xuất 1080*S
  canvas.width = 1080 * S;
  canvas.height = h * S;
  const ctx = canvas.getContext('2d');
  if (ctx) { normalizeCanvasContext(ctx, canvas); ctx.scale(S, S); ctx.imageSmoothingQuality = 'high'; }

  if (marketing.conceptId && drawIndustryConcept(canvas, marketing, kind, rawCopy, asset, bgImg)) return;
  if (drawCatalogPoster(canvas, marketing, kind, rawCopy, asset, bgImg, logoImg)) return;

  const th = POSTER_THEMES[marketing.theme] || POSTER_THEMES.tech_dark;
  const copy = rawCopy;

  const hasPhoto = Boolean(asset && asset.im);
  const isFullPhoto = marketing.layoutMode === 'full_photo' || (marketing.layoutMode !== 'matrix' && hasPhoto);

  if (isFullPhoto) {
    if (marketing.industry === 'recruitment') {
      if (kind === 'launch') {
        drawFullPhotoRecruitmentHero(canvas, marketing, copy, asset, th, bgImg);
      } else if (kind === 'story') {
        drawFullPhotoRecruitmentStory(canvas, marketing, copy, asset, th, bgImg);
      } else {
        drawFullPhotoRecruitmentAction(canvas, marketing, copy, asset, th, bgImg);
      }
      return;
    }
    drawFullPhotoGeneral(canvas, marketing, kind, copy, asset, th, bgImg);
    return;
  }

  // Matrix (nền đặc) — mọi ngành dùng chung renderer concept sạch cho đồng nhất
  drawGeneralModernPoster(canvas, marketing, kind, copy, asset, th, bgImg);
}
