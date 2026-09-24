import { AssetInfo, AspectRatio, CopyItem, IndustryId, MarketingState, PosterKind, PosterTheme, ThemeId } from '@/types';

export const POSTER_THEMES: Record<ThemeId, PosterTheme> = {
  emerald_pro: {
    id: 'emerald_pro',
    name: 'Emerald Pro',
    bg: '#041d13',
    bgGrad: ['#03140d', '#082f20', '#020f09'],
    glow: 'rgba(16, 185, 129, 0.22)',
    accent: '#10b981',
    accentLight: '#6ee7b7',
    accentText: '#041d13',
    textPrimary: '#f0fdf4',
    textSecondary: '#a7f3d0',
    textMuted: '#6ee7b7',
    cardBg: 'rgba(8, 47, 32, 0.72)',
    cardBorder: 'rgba(52, 211, 153, 0.22)',
    cardHighlightBg: 'rgba(16, 185, 129, 0.16)',
    cardHighlightBorder: 'rgba(52, 211, 153, 0.45)',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeBorder: 'rgba(52, 211, 153, 0.35)',
    badgeText: '#6ee7b7',
    tagBg: 'rgba(4, 29, 19, 0.85)',
    tagText: '#a7f3d0',
  },
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
  family: string = '"Be Vietnam Pro", sans-serif'
): number {
  let size = start;
  let lines: string[] = [];
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = [];
    let line = '';
    for (const word of (text || '').split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.2 <= maxHeight && lines.every(l => ctx.measureText(l).width <= width)) {
      break;
    }
    size -= 2;
  } while (size > 12);

  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
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
      if (th.id === 'emerald_pro') {
        tint.addColorStop(0, 'rgba(8, 35, 24, 0.72)');
        tint.addColorStop(0.35, 'rgba(8, 35, 24, 0.58)');
        tint.addColorStop(1, 'rgba(5, 26, 17, 0.92)');
      } else if (th.id === 'tech_dark') {
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
  const h = customH;
  ctx.font = h <= 34 ? '700 16px "Be Vietnam Pro", sans-serif' : '600 19px "Be Vietnam Pro", sans-serif';
  const padX = h <= 34 ? 14 : 20;
  const metrics = ctx.measureText(text);
  const w = Math.round(metrics.width + padX * 2 + (dotColor ? 16 : 0));

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

  const th = options.theme || POSTER_THEMES.emerald_pro;
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
  const w = 1080, h = canvas.height;
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

  const brandText = marketing.brand || 'MIVY STUDIO';
  drawBadgePill(ctx, brandText, m, 52, th.badgeBg, th.cardBorder, th.textPrimary);
  drawHandwrittenSlogan(ctx, 'Good People\nGreat Products', w - m, 68, 30, th.accentLight, -6);

  ctx.save();
  ctx.font = 'italic 700 44px "Caveat", "Dancing Script", cursive, sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText("We're", m + 4, 134);
  ctx.restore();

  ctx.save();
  ctx.font = '900 86px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textPrimary;
  ctx.fillText('HIRING', m, 216);
  ctx.restore();

  const roleTitle = (copy.headline || marketing.name || 'FULLSTACK DEVELOPER').replace(/^tuyển(?: dụng)?\s+/i, '');
  ctx.save();
  ctx.font = '700 34px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentLight;
  ctx.fillText(roleTitle.toUpperCase(), m + 2, 264);
  ctx.restore();

  ctx.save();
  ctx.font = '600 14px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textMuted;
  ctx.fillText('JOIN OUR TEAM   ·   BUILD BETTER TOGETHER', m + 3, 296);
  ctx.restore();

  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
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
  drawCard(ctx, m, tableY, contentW, tableH, 20, th.cardBg, th.cardBorder);

  const col0W = 320, col1W = 210, col2W = 250, col3W = contentW - col0W - col1W - col2W;
  const colX = [m, m + col0W, m + col0W + col1W, m + col0W + col1W + col2W];

  const headH = (hasPhoto && h < 1350) ? 50 : 62;
  const headers = [
    { label: 'Role / Vị trí', icon: '💼' },
    { label: 'Kinh nghiệm', icon: '⚙️' },
    { label: 'Kỹ năng / Stack', icon: '💬' },
    { label: 'Địa điểm', icon: '📍' }
  ];

  headers.forEach((hItem, i) => {
    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '700 18px "Be Vietnam Pro", sans-serif' : '700 21px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hItem.icon}  ${hItem.label}`, colX[i] + 24, tableY + headH / 2);
    ctx.restore();
  });

  ctx.save();
  ctx.strokeStyle = th.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(m, tableY + headH);
  ctx.lineTo(m + contentW, tableY + headH);
  ctx.stroke();
  ctx.restore();

  const rowCount = (hasPhoto && h < 1350) ? 3 : 4;
  const rowH = (tableH - headH) / rowCount;

  const expFact = cleanFacts.find(f => /năm|year|exp|kinh nghiệm/i.test(f)) || cleanFacts[0] || '3+ năm kinh nghiệm';
  const stackFact = cleanFacts.find(f => /react|node|js|ts|python|system|kiến trúc|dev/i.test(f)) || cleanFacts[1] || 'Strong Skills';
  const roleFact = cleanFacts.find(f => f !== expFact && f !== stackFact) || cleanFacts[2] || 'Production Software';

  const rowsData = rowCount === 3 ? [
    {
      c0: { title: roleTitle, sub: '(Core Member, Product Team)' },
      c1: expFact.length > 25 ? expFact.slice(0, 22) + '...' : expFact,
      c2: stackFact.length > 28 ? stackFact.slice(0, 25) + '...' : stackFact,
      c3: 'TP.HCM · Hybrid'
    },
    {
      c0: { title: 'Kiến trúc & Hệ thống', sub: '(Engineering & Mentorship)' },
      c1: 'Senior / Lead',
      c2: roleFact.length > 30 ? roleFact.slice(0, 27) + '...' : roleFact,
      c3: 'Full-time'
    },
    {
      c0: { title: 'Đãi ngộ & Phúc lợi', sub: '(Thưởng dự án, KPI, Thiết bị)' },
      c1: salaryHighlight || 'Cạnh tranh cao',
      c2: 'Macbook & Bảo hiểm VIP',
      c3: 'Gia nhập ngay'
    }
  ] : [
    {
      c0: { title: roleTitle, sub: '(Core Member, Product Team)' },
      c1: expFact.length > 25 ? expFact.slice(0, 22) + '...' : expFact,
      c2: 'Production Standards',
      c3: 'TP.HCM · Hybrid'
    },
    {
      c0: { title: 'Kiến trúc & Hệ thống', sub: '(System Design, Reliability)' },
      c1: 'Senior / Lead',
      c2: stackFact.length > 28 ? stackFact.slice(0, 25) + '...' : stackFact,
      c3: 'TP.HCM'
    },
    {
      c0: { title: 'Năng lực cốt lõi', sub: '(Engineering & Mentorship)' },
      c1: 'Chủ động',
      c2: roleFact.length > 30 ? roleFact.slice(0, 27) + '...' : roleFact,
      c3: 'Linh hoạt'
    },
    {
      c0: { title: 'Đãi ngộ & Phúc lợi', sub: '(Thưởng dự án, KPI, Thiết bị)' },
      c1: salaryHighlight || 'Cạnh tranh cao',
      c2: 'Macbook & Bảo hiểm VIP',
      c3: 'Full-time'
    }
  ];

  rowsData.forEach((row, rIdx) => {
    const ry = tableY + headH + rIdx * rowH;

    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '700 19px "Be Vietnam Pro", sans-serif' : '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.fillText(row.c0.title, colX[0] + 24, ry + rowH / 2 - 12);

    ctx.font = (hasPhoto && h < 1350) ? '400 14px "Be Vietnam Pro", sans-serif' : '400 16px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textSecondary;
    ctx.fillText(row.c0.sub, colX[0] + 24, ry + rowH / 2 + 16);
    ctx.restore();

    ctx.save();
    const isSalaryRow = (rIdx === rowCount - 1) && salaryHighlight;
    ctx.font = isSalaryRow ? '700 21px "Be Vietnam Pro", sans-serif' : '600 20px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = isSalaryRow ? th.accent : th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c1, colX[1] + 24, ry + rowH / 2);
    ctx.restore();

    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '500 17px "Be Vietnam Pro", sans-serif' : '500 19px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c2, colX[2] + 24, ry + rowH / 2);
    ctx.restore();

    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '600 17px "Be Vietnam Pro", sans-serif' : '600 19px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c3, colX[3] + 24, ry + rowH / 2);
    ctx.restore();

    if (rIdx < rowCount - 1) {
      ctx.save();
      ctx.strokeStyle = th.cardBorder;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(m, ry + rowH);
      ctx.lineTo(m + contentW, ry + rowH);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.save();
  ctx.strokeStyle = th.cardBorder;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.22;
  [colX[1], colX[2], colX[3]].forEach(vx => {
    ctx.beginPath();
    ctx.moveTo(vx, tableY);
    ctx.lineTo(vx, tableY + tableH);
    ctx.stroke();
  });
  ctx.restore();

  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  const btnW = 290, btnH = 64;
  drawCard(ctx, m, footerY + 8, btnW, btnH, 32, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 28, footerY + 28, 24, th.accentText);

  ctx.save();
  ctx.font = '700 23px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText('Send your CV', m + 68, footerY + 8 + btnH / 2);
  ctx.restore();

  const infoX = m + btnW + 28;
  ctx.save();
  ctx.font = '500 17px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textSecondary;
  ctx.fillText('✉  hoặc inbox để nhận JD đầy đủ!', infoX, footerY + 28);

  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textPrimary;
  const contactText = phone ? `📞  Zalo / Hotline: ${phone}` : (email ? `✉  Email: ${email}` : `📞  Zalo: ${marketing.brand || '0907124244'}`);
  ctx.fillText(contactText, infoX, footerY + 58);
  ctx.restore();

  drawHandwrittenSlogan(ctx, 'Same People\nBrighter Tomorrow', w - m, footerY + 52, 28, th.accentLight, -5);

  ctx.save();
  ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textMuted;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('HO CHI MINH CITY   ·   GROW   ·   LEARN   ·   MAKE AN IMPACT', w / 2, h - 18);
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
  const w = 1080, h = canvas.height;
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

  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, '02 / 03 · TIÊU CHÍ & YÊU CẦU', w - m - 300, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText('ĐIỀU CHÚNG EM TÌM KIẾM Ở ANH', m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || 'Yêu cầu chuyên môn & kinh nghiệm',
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 60 : 46,
    th.textPrimary,
    '800',
    '"Be Vietnam Pro", sans-serif'
  );

  const startY = 215 + titleHeight + 28;
  const footerY = h - 120;

  const availableH = footerY - startY - 20;
  let points = copy.points && copy.points.length ? copy.points.slice(0, 3) : [copy.subline];
  if (!points[0]) points = ['Kinh nghiệm làm việc thực tế với các dự án production.'];

  const cardH = (availableH - (points.length - 1) * 16) / points.length;

  points.forEach((point, i) => {
    const cy = startY + i * (cardH + 16);

    ctx.save();
    ctx.strokeStyle = th.cardBorder;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(m, cy + cardH);
    ctx.lineTo(m + contentW, cy + cardH);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `800 ${cardH > 140 ? '54px' : '42px'} "Be Vietnam Pro", monospace`;
    ctx.fillStyle = th.accent;
    ctx.fillText('0' + (i + 1), m + 10, cy + (cardH > 140 ? 56 : 42));
    ctx.restore();

    posterText(
      ctx,
      point,
      m + 115,
      cy + (cardH > 140 ? 18 : 10),
      contentW - 135,
      cardH - 24,
      cardH > 140 ? 28 : (cardH > 90 ? 22 : 18),
      th.textPrimary,
      '600',
      '"Be Vietnam Pro", sans-serif'
    );
  });

  ctx.save();
  ctx.font = '600 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textSecondary;
  ctx.fillText('Bước tiếp theo: Tìm hiểu quyền lợi & nộp hồ sơ ứng tuyển', m, footerY + 39);
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
  const w = 1080, h = canvas.height;
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

  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, '03 / 03 · KẾT NỐI & ỨNG TUYỂN', w - m - 310, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  ctx.save();
  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText('GIA NHẬP ĐỘI NGŨ', m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || 'Quy trình ứng tuyển nhanh gọn',
    m,
    215,
    contentW,
    h * 0.15,
    h >= 1350 ? 60 : 46,
    th.textPrimary,
    '800',
    '"Be Vietnam Pro", sans-serif'
  );

  let currentY = 215 + titleHeight + 25;

  const source = ((copy.points || []).join(' ') + ' ' + copy.subline + ' ' + marketing.details + ' ' + marketing.offer);
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];

  const contactH = h >= 1350 ? 250 : 200;
  drawCard(ctx, m, currentY, contentW, contactH, 24, th.cardHighlightBg, th.cardHighlightBorder, true);

  drawBadgePill(ctx, 'CÁCH THỨC ỨNG TUYỂN TRỰC TIẾP', m + 32, currentY + 28, th.tagBg, th.cardHighlightBorder, th.tagText);

  ctx.save();
  ctx.font = hasPhoto ? '800 36px "Be Vietnam Pro", sans-serif' : '800 42px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textPrimary;
  const emailText = email || 'Gửi CV về ban tuyển dụng';
  ctx.fillText(emailText.length > 28 ? emailText.slice(0, 25) + '...' : emailText, m + 32, currentY + 115);

  ctx.font = '500 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textSecondary;
  const subText = 'Tiêu đề: [Họ tên] - Ứng tuyển ' + (marketing.name || 'Vị trí');
  ctx.fillText(subText.length > 36 ? subText.slice(0, 33) + '...' : subText, m + 32, currentY + 160);
  if (contactH > 210 && marketing.offer) {
    ctx.fillText('Ghi chú: ' + (marketing.offer.length > 38 ? marketing.offer.slice(0, 35) + '...' : marketing.offer), m + 32, currentY + 200);
  }
  ctx.restore();

  currentY += contactH + 30;

  const steps = [
    { num: '01', title: 'Gửi Hồ Sơ', desc: 'CV & Portfolio các sản phẩm thực tế đã làm' },
    { num: '02', title: 'Phỏng Vấn', desc: 'Trao đổi chuyên môn cùng Tech Lead' },
    { num: '03', title: 'Nhận Offer', desc: 'Thống nhất đãi ngộ và bắt đầu đồng hành' }
  ];

  const stepCardW = (contentW - 36) / 3;
  const stepCardH = Math.min(180, Math.max(120, h - currentY - 140));

  steps.forEach((st, i) => {
    const sx = m + i * (stepCardW + 18);
    drawCard(ctx, sx, currentY, stepCardW, stepCardH, 20, th.cardBg, th.cardBorder);

    ctx.save();
    ctx.font = '800 30px "Be Vietnam Pro", monospace';
    ctx.fillStyle = th.accent;
    ctx.fillText(st.num, sx + 22, currentY + 44);

    ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.fillText(st.title, sx + 22, currentY + 84);

    posterText(
      ctx,
      st.desc,
      sx + 22,
      currentY + 102,
      stepCardW - 44,
      stepCardH - 108,
      15,
      th.textSecondary,
      '400',
      '"Be Vietnam Pro", sans-serif'
    );
    ctx.restore();
  });

  const footerY = h - 105;
  drawCard(ctx, m, footerY, contentW, 68, 20, th.accent, null, true);
  ctx.save();
  ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Gửi CV Ngay Hôm Nay', m + 32, footerY + 34);
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
  const w = 1080, h = canvas.height;
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
    '"Be Vietnam Pro", sans-serif'
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
  const points = copy.points && copy.points.length ? copy.points.slice(0, 3) : ['Thông tin chi tiết khóa học.'];
  const cardH = (cardAreaH - (points.length - 1) * 16) / points.length;

  points.forEach((pt, i) => {
    const cy = currentY + i * (cardH + 16);
    drawCard(ctx, m, cy, contentW, cardH, 20, th.cardBg, th.cardBorder);
    drawBadgePill(ctx, 'CHẶNG 0' + (i + 1), m + 24, cy + 20, th.tagBg, th.cardHighlightBorder, th.tagText);

    posterText(ctx, pt, m + 160, cy + 18, contentW - 190, cardH - 36, cardH > 100 ? 25 : 21, th.textPrimary, '600');
  });

  drawCard(ctx, m, footerY, 340, 80, 22, th.accent, null, true);
  ctx.save();
  ctx.font = '700 25px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Đăng ký ngay', m + 32, footerY + 40);
  drawArrowIcon(ctx, m + 285, footerY + 28, 24, th.accentText);
  ctx.restore();

  if (marketing.offer) {
    const infoW = contentW - 360;
    drawCard(ctx, m + 360, footerY, infoW, 80, 22, th.cardHighlightBg, th.cardHighlightBorder);
    ctx.save();
    ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
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
  const w = 1080, h = canvas.height;
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
    '"Be Vietnam Pro", sans-serif'
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

  const points = copy.points && copy.points.length ? copy.points.slice(0, 3) : ['Cam kết chất lượng dịch vụ chuẩn mực.'];
  const cardAreaH = footerY - currentY - 20;
  const cardH = (cardAreaH - (points.length - 1) * 16) / points.length;

  points.forEach((pt, i) => {
    const cy = currentY + i * (cardH + 16);
    drawCard(ctx, m, cy, contentW, cardH, 20, th.cardBg, th.cardBorder);

    ctx.save();
    ctx.font = '800 24px "Be Vietnam Pro", monospace';
    ctx.fillStyle = th.accent;
    ctx.fillText('0' + (i + 1), m + 28, cy + cardH / 2 + 8);
    ctx.restore();

    posterText(ctx, pt, m + 80, cy + 22, contentW - 110, cardH - 44, cardH > 100 ? 25 : 21, th.textPrimary, '600');
  });

  drawCard(ctx, m, footerY, contentW, 80, 22, th.accent, null, true);
  ctx.save();
  ctx.font = '700 26px "Be Vietnam Pro", sans-serif';
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
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  drawBackground(ctx, w, h, th, bgImg);
  const m = 60, contentW = w - m * 2;

  drawBadgePill(ctx, marketing.brand || marketing.name || 'MIVY STUDIO', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, 'FEATURED CAMPAIGN', w - m - 260, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  const titleHeight = posterText(
    ctx,
    copy.headline,
    m,
    180,
    contentW,
    h * 0.18,
    h >= 1350 ? 68 : 52,
    th.textPrimary,
    '800',
    '"Be Vietnam Pro", sans-serif'
  );

  let currentY = 180 + titleHeight + 20;
  const footerY = h - 130;

  const frameH = Math.min(h * 0.42, footerY - currentY - 140);

  if (asset) {
    drawAssetShowcase(ctx, asset, m, currentY, contentW, frameH, 24, {
      theme: th,
      isCutout: Boolean(marketing.cutout),
    });
  } else {
    drawCard(ctx, m, currentY, contentW, frameH, 24, th.cardBg, th.cardBorder, true);
    posterText(
      ctx,
      marketing.name || 'Sản phẩm nổi bật',
      m + 40,
      currentY + frameH * 0.38,
      contentW - 80,
      frameH * 0.4,
      48,
      th.textSecondary,
      '700'
    );
  }

  currentY += frameH + 20;

  if (copy.subline) {
    posterText(ctx, copy.subline, m, currentY, contentW, h * 0.08, 24, th.textSecondary, '500');
  }

  drawCard(ctx, m, footerY, 320, 80, 22, th.accent, null, true);
  ctx.save();
  ctx.font = '700 25px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Khám phá ngay', m + 32, footerY + 40);
  drawArrowIcon(ctx, m + 270, footerY + 28, 24, th.accentText);
  ctx.restore();

  if (marketing.offer) {
    drawCard(ctx, m + 340, footerY, contentW - 340, 80, 22, th.cardHighlightBg, th.cardHighlightBorder);
    ctx.save();
    ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText('Ưu đãi: ' + marketing.offer, m + 365, footerY + 40);
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
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw Photo as Full-Bleed Background
  const photo = (asset && asset.im) ? asset.im : bgImg;
  if (photo) {
    drawImageCover(ctx, photo, 0, 0, w, h, 0);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
    drawCitySkyline(ctx, 0, h - 280, w, 220, th.glow);
  }

  // 2. Cinematic Multi-Stop Darkening Vignette
  const vignette = ctx.createLinearGradient(0, 0, 0, h);
  vignette.addColorStop(0, 'rgba(3, 7, 18, 0.78)');
  vignette.addColorStop(0.18, 'rgba(3, 7, 18, 0.42)');
  vignette.addColorStop(0.38, 'rgba(3, 7, 18, 0.12)');
  vignette.addColorStop(0.55, 'rgba(3, 7, 18, 0.48)');
  vignette.addColorStop(0.75, 'rgba(3, 7, 18, 0.88)');
  vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const radialGlow = ctx.createRadialGradient(w * 0.85, h * 0.12, 10, w * 0.85, h * 0.12, 450);
  radialGlow.addColorStop(0, th.glow);
  radialGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, w, h);

  const m = 54, contentW = w - m * 2;

  // 3. Top Header: Brand Pill + Handwritten Slogan
  const brandText = marketing.brand || 'MIVY STUDIO';
  drawBadgePill(ctx, brandText, m, 52, 'rgba(0, 0, 0, 0.72)', 'rgba(255, 255, 255, 0.25)', '#ffffff');
  drawHandwrittenSlogan(ctx, 'Good People\nGreat Products', w - m, 68, 30, th.accentLight, -6);

  // 4. Hero Typography Overlaid on Photo
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 12;
  ctx.font = 'italic 700 46px "Caveat", "Dancing Script", cursive, sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText("We're", m + 4, 138);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.font = '900 90px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HIRING', m, 224);
  ctx.restore();

  const roleTitle = (copy.headline || marketing.name || 'FULLSTACK DEVELOPER').replace(/^tuyển(?: dụng)?\s+/i, '');
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 14;
  ctx.font = '800 36px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentLight;
  ctx.fillText(roleTitle.toUpperCase(), m + 2, 274);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('JOIN OUR CORE TEAM   ·   BUILD BETTER TOGETHER', m + 3, 308);
  ctx.restore();

  // 5. Extract Facts and Highlights
  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
  const allFacts = (copy.pointsEdited || (copy.points && copy.points.length >= 4))
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

  const expFact = cleanFacts.find(f => /năm|year|exp|kinh nghiệm/i.test(f)) || cleanFacts[0] || '3+ Năm Kinh Nghiệm';
  const stackFact = cleanFacts.find(f => /react|node|js|ts|python|system|kiến trúc|dev/i.test(f)) || cleanFacts[1] || 'Modern Tech Stack';
  const locFact = cleanFacts.find(f => /tp\.hcm|hà nội|remote|hybrid|hồ chí minh|toàn thời gian|full-time/i.test(f)) || 'TP.HCM · Hybrid';

  // 6. Floating Frosted Glass Bento Cards
  const isCompact = h <= 1080;
  const isTall = h >= 1920;

  const bentoY = isCompact ? 335 : (isTall ? 580 : 430);
  const bentoH = isCompact ? 104 : 124;
  const colGap = 16;
  const colW = (contentW - colGap * 2) / 3;

  const bentoCards = [
    {
      icon: '💰',
      tag: 'ĐÃI NGỘ / LƯƠNG',
      val: salaryHighlight || 'Cạnh Tranh Cao',
      highlight: true,
    },
    {
      icon: '⚙️',
      tag: 'KINH NGHIỆM',
      val: expFact || '3+ Năm Kinh Nghiệm',
      highlight: false,
    },
    {
      icon: '📍',
      tag: 'ĐỊA ĐIỂM & CHẾ ĐỘ',
      val: locFact || 'TP.HCM · Hybrid',
      highlight: false,
    },
  ];

  bentoCards.forEach((card, idx) => {
    const cx = m + idx * (colW + colGap);
    const bgFill = card.highlight ? 'rgba(16, 185, 129, 0.22)' : 'rgba(15, 23, 42, 0.72)';
    const bdStroke = card.highlight ? th.accent : 'rgba(255, 255, 255, 0.18)';

    drawCard(ctx, cx, bentoY, colW, bentoH, 18, bgFill, bdStroke, true);

    ctx.save();
    // Clip to card bounds so text can never overflow to next card
    ctx.beginPath();
    ctx.roundRect(cx, bentoY, colW, bentoH, 18);
    ctx.clip();

    ctx.font = '600 13px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = card.highlight ? th.accentLight : '#94a3b8';
    ctx.fillText(`${card.icon}  ${card.tag}`, cx + 18, bentoY + (isCompact ? 28 : 34));

    const maxTextW = colW - 36;
    const textStartY = bentoY + (isCompact ? 48 : 56);
    const availTextH = bentoH - (isCompact ? 52 : 62);

    posterText(
      ctx,
      card.val,
      cx + 18,
      textStartY,
      maxTextW,
      availTextH,
      isCompact ? 17 : 19,
      card.highlight ? '#ffffff' : th.textPrimary,
      '700',
      '"Be Vietnam Pro", sans-serif'
    );

    ctx.restore();
  });

  // 7. Key Requirements Section
  const reqY = bentoY + bentoH + 18;
  const footerH = 140;
  const footerY = h - footerH - 30;
  const reqH = footerY - reqY - 20;

  if (reqH > 140) {
    drawCard(ctx, m, reqY, contentW, reqH, 20, 'rgba(10, 15, 26, 0.75)', 'rgba(255, 255, 255, 0.14)', true);

    ctx.save();
    ctx.font = '700 15px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.accentLight;
    ctx.fillText('⚡ YÊU CẦU & KỸ NĂNG THEN CHỐT', m + 28, reqY + 36);
    ctx.restore();

    const pointsToShow = cleanFacts.filter(f => f !== expFact).slice(0, reqH > 220 ? 3 : 2);
    if (pointsToShow.length === 0) {
      pointsToShow.push(stackFact, 'Chủ động, tư duy giải quyết vấn đề và tinh thần đồng đội cao.');
    }

    const availablePointH = reqH - 55;
    const itemH = availablePointH / pointsToShow.length;

    pointsToShow.forEach((pt, pIdx) => {
      const centerY = reqY + 54 + pIdx * itemH + itemH / 2;
      const fontSize = isCompact ? 17 : 20;
      const lineH = Math.round(fontSize * 1.32);
      const badgeH = 34;

      const badgeX = m + 24;
      const badgeW = drawBadgePill(ctx, `0${pIdx + 1}`, badgeX, Math.round(centerY - badgeH / 2), th.badgeBg, th.badgeBorder, th.accent, null, badgeH);

      const textX = badgeX + badgeW + 18;
      const textMaxW = contentW - (badgeW + 24 + 18 + 24);

      ctx.save();
      ctx.font = `600 ${fontSize}px "Be Vietnam Pro", sans-serif`;
      const words = (pt || '').split(/\s+/);
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

      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';

      if (lines.length === 1) {
        ctx.fillText(lines[0], textX, centerY);
      } else {
        const startY = centerY - ((lines.length - 1) * lineH) / 2;
        lines.forEach((l, lIdx) => {
          ctx.fillText(l, textX, Math.round(startY + lIdx * lineH));
        });
      }
      ctx.restore();
    });
  }

  // 8. Bottom Action & Contact Footer
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  const btnW = 290, btnH = 64;
  drawCard(ctx, m, footerY + 8, btnW, btnH, 32, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 28, footerY + 28, 24, th.accentText);

  ctx.save();
  ctx.font = '700 23px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Send your CV', m + 68, footerY + 8 + btnH / 2);
  ctx.restore();

  const infoX = m + btnW + 28;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.font = '500 17px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('✉  hoặc inbox để nhận JD đầy đủ!', infoX, footerY + 28);

  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#ffffff';
  const contactText = phone ? `📞  Zalo / Hotline: ${phone}` : (email ? `✉  Email: ${email}` : `📞  Zalo: ${marketing.brand || '0907124244'}`);
  ctx.fillText(contactText, infoX, footerY + 58);
  ctx.restore();

  drawHandwrittenSlogan(ctx, 'Same People\nBrighter Tomorrow', w - m, footerY + 52, 28, th.accentLight, -5);

  ctx.save();
  ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('HO CHI MINH CITY   ·   GROW   ·   LEARN   ·   MAKE AN IMPACT', w / 2, h - 18);
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
  const w = 1080, h = canvas.height;
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

  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, 'rgba(0, 0, 0, 0.7)', 'rgba(255, 255, 255, 0.2)', '#ffffff');
  drawBadgePill(ctx, '02 / 03 · TIÊU CHÍ & YÊU CẦU', w - m - 300, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;
  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentLight;
  ctx.fillText('ĐIỀU CHÚNG EM TÌM KIẾM Ở ANH', m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || 'Yêu cầu chuyên môn & kinh nghiệm',
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 56 : 44,
    '#ffffff',
    '800',
    '"Be Vietnam Pro", sans-serif'
  );

  const startY = 215 + titleHeight + 30;
  const footerY = h - 120;
  const availableH = footerY - startY - 20;

  let points = copy.points && copy.points.length ? copy.points.slice(0, 3) : [copy.subline];
  if (!points[0]) points = ['Kinh nghiệm làm việc thực tế với các dự án production.'];

  const cardH = (availableH - (points.length - 1) * 18) / points.length;

  points.forEach((point, i) => {
    const cy = startY + i * (cardH + 18);
    const cardCenterY = cy + cardH / 2;

    drawCard(ctx, m, cy, contentW, cardH, 20, 'rgba(15, 23, 42, 0.76)', 'rgba(255, 255, 255, 0.16)', true);

    const numFontSize = cardH > 140 ? 46 : 38;
    ctx.save();
    ctx.font = `800 ${numFontSize}px "Be Vietnam Pro", sans-serif`;
    ctx.fillStyle = th.accent;
    ctx.textBaseline = 'middle';
    ctx.fillText('0' + (i + 1), m + 28, cardCenterY);
    const numW = ctx.measureText('0' + (i + 1)).width;
    ctx.restore();

    const textFontSize = cardH > 140 ? 22 : 18;
    const textLineH = Math.round(textFontSize * 1.35);
    const textX = m + 28 + Math.round(numW) + 24;
    const textMaxW = contentW - (textX - m + 28);

    ctx.save();
    ctx.font = `600 ${textFontSize}px "Be Vietnam Pro", sans-serif`;
    const words = (point || '').split(/\s+/);
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
  ctx.font = '600 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Bước tiếp theo: Tìm hiểu quyền lợi & nộp hồ sơ ứng tuyển', m, footerY + 39);
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
  const w = 1080, h = canvas.height;
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

  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, 'rgba(0, 0, 0, 0.7)', 'rgba(255, 255, 255, 0.2)', '#ffffff');
  drawBadgePill(ctx, '03 / 03 · KẾT NỐI & ỨNG TUYỂN', w - m - 310, 68, th.badgeBg, th.badgeBorder, th.accent);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;
  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentLight;
  ctx.fillText('GIA NHẬP ĐỘI NGŨ NGAY HÔM NAY', m, 178);
  ctx.restore();

  const titleHeight = posterText(
    ctx,
    copy.headline || 'Quy trình kết nối & nhận offer',
    m,
    215,
    contentW,
    h * 0.16,
    h >= 1350 ? 56 : 44,
    '#ffffff',
    '800',
    '"Be Vietnam Pro", sans-serif'
  );

  let curY = 215 + titleHeight + 25;

  if (marketing.offer) {
    const offerH = 100;
    drawCard(ctx, m, curY, contentW, offerH, 20, th.cardHighlightBg, th.cardHighlightBorder, true);
    ctx.save();
    ctx.font = '700 16px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.accentLight;
    ctx.fillText('ĐÃI NGỘ DÀNH RIÊNG CHO BẠN', m + 30, curY + 36);

    ctx.font = '800 28px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(marketing.offer, m + 30, curY + 74);
    ctx.restore();
    curY += offerH + 20;
  }

  let points = copy.points && copy.points.length ? copy.points.slice(0, 3) : [copy.subline];
  if (!points[0]) points = ['Gửi CV qua email hoặc inbox trực tiếp để nhận JD chi tiết.'];

  const stepCardH = 90;
  points.forEach((pt, i) => {
    drawCard(ctx, m, curY, contentW, stepCardH, 18, 'rgba(15, 23, 42, 0.72)', 'rgba(255, 255, 255, 0.14)', true);
    const stepCenterY = curY + stepCardH / 2;
    const badgeH = 34;
    const badgeY = Math.round(stepCenterY - badgeH / 2);

    const badgeW = drawBadgePill(ctx, `BƯỚC ${i + 1}`, m + 24, badgeY, th.badgeBg, th.badgeBorder, th.accent, null, badgeH);
    const stepTextX = m + 24 + badgeW + 18;
    const stepTextW = contentW - (24 + badgeW + 18 + 24);

    const textFontSize = 19;
    const textLineH = Math.round(textFontSize * 1.35);

    ctx.save();
    ctx.font = `600 ${textFontSize}px "Be Vietnam Pro", sans-serif`;
    const words = (pt || '').split(/\s+/);
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

    curY += stepCardH + 16;
  });

  const footerY = h - 140;
  const btnW = 320, btnH = 68;
  drawCard(ctx, m, footerY, btnW, btnH, 34, th.accent, null, true);
  drawPaperPlaneIcon(ctx, m + 32, footerY + 20, 26, th.accentText);

  ctx.save();
  ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Ứng Tuyển Ngay', m + 78, footerY + btnH / 2);
  ctx.restore();

  const source = (marketing.details || '') + ' ' + (marketing.offer || '');
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  const infoX = m + btnW + 30;
  ctx.save();
  ctx.font = '500 17px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Hotline / Zalo tư vấn 24/7:', infoX, footerY + 20);

  ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(phone ? `📞 ${phone}` : (email ? `✉ ${email}` : `📞 ${marketing.brand || '0907124244'}`), infoX, footerY + 52);
  ctx.restore();
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
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  const photo = (asset && asset.im) ? asset.im : bgImg;
  if (photo) {
    drawImageCover(ctx, photo, 0, 0, w, h, 0);
  } else {
    drawBackground(ctx, w, h, th, bgImg);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, h);
  vignette.addColorStop(0, 'rgba(3, 7, 18, 0.80)');
  vignette.addColorStop(0.28, 'rgba(3, 7, 18, 0.40)');
  vignette.addColorStop(0.60, 'rgba(3, 7, 18, 0.72)');
  vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const m = 60, contentW = w - m * 2;

  drawBadgePill(ctx, marketing.brand || 'MIVY STUDIO', m, 68, 'rgba(0, 0, 0, 0.7)', 'rgba(255, 255, 255, 0.2)', '#ffffff');

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 16;
  const titleH = posterText(
    ctx,
    copy.headline || marketing.name || 'Sản Phẩm & Dịch Vụ Đột Phá',
    m,
    h * 0.45,
    contentW,
    h * 0.22,
    h >= 1350 ? 58 : 46,
    '#ffffff',
    '800',
    '"Be Vietnam Pro", sans-serif'
  );
  ctx.restore();

  let curY = h * 0.45 + titleH + 20;

  if (copy.subline) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    const subH = posterText(
      ctx,
      copy.subline,
      m,
      curY,
      contentW,
      h * 0.12,
      24,
      '#cbd5e1',
      '500',
      '"Be Vietnam Pro", sans-serif'
    );
    ctx.restore();
    curY += subH + 24;
  }

  const footerY = h - 140;
  const btnW = 320, btnH = 68;
  drawCard(ctx, m, footerY, btnW, btnH, 34, th.accent, null, true);

  ctx.save();
  ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.cta || 'Khám Phá Ngay', m + 40, footerY + btnH / 2);
  drawArrowIcon(ctx, m + 270, footerY + 22, 24, th.accentText);
  ctx.restore();

  if (marketing.offer) {
    drawCard(ctx, m + 340, footerY, contentW - 340, btnH, 22, 'rgba(15, 23, 42, 0.8)', th.cardHighlightBorder, true);
    ctx.save();
    ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ưu đãi: ' + marketing.offer, m + 370, footerY + btnH / 2);
    ctx.restore();
  }
}

export function drawIndustryPoster(
  canvas: HTMLCanvasElement,
  marketing: MarketingState,
  kind: PosterKind,
  rawCopy: CopyItem,
  asset: AssetInfo | null,
  bgImg: CanvasImageSource | null = null
) {
  const hMap: Record<AspectRatio, number> = { '1:1': 1080, '4:5': 1350, '9:16': 1920 };
  const h = hMap[marketing.aspect] || 1350;
  canvas.width = 1080;
  canvas.height = h;

  const th = POSTER_THEMES[marketing.theme] || POSTER_THEMES.emerald_pro;
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

  if (marketing.industry === 'recruitment') {
    if (kind === 'launch') {
      drawRecruitmentHero(canvas, marketing, copy, asset, th, bgImg);
    } else if (kind === 'story') {
      drawRecruitmentStory(canvas, marketing, copy, asset, th, bgImg);
    } else {
      drawRecruitmentAction(canvas, marketing, copy, asset, th, bgImg);
    }
    return;
  }

  if (marketing.industry === 'education') {
    drawEducationPoster(canvas, marketing, kind, copy, asset, th, bgImg);
    return;
  }

  if (marketing.industry === 'service') {
    drawServicePoster(canvas, marketing, kind, copy, asset, th, bgImg);
    return;
  }

  drawGeneralModernPoster(canvas, marketing, kind, copy, asset, th, bgImg);
}
