/* Mivy Agency-Grade Poster Engine: Bento Grid, Modern Design System & Multi-Theme */

const POSTER_THEMES = {
  tech_dark: {
    id: 'tech_dark',
    name: 'Tech Dark',
    bg: '#0c0f17',
    bgGrad: ['#090c14', '#111726', '#0a0d15'],
    glow: 'rgba(255, 107, 43, 0.20)',
    accent: '#ff6b2b',
    accentLight: '#ff8c53',
    accentText: '#0a0d14',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    cardHighlightBg: 'rgba(255, 107, 43, 0.12)',
    cardHighlightBorder: 'rgba(255, 107, 43, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#f8fafc',
    tagBg: 'rgba(255, 107, 43, 0.18)',
    tagText: '#ff925c',
  },
  warm_editorial: {
    id: 'warm_editorial',
    name: 'Warm Editorial',
    bg: '#f8f5ee',
    bgGrad: ['#fbf9f4', '#f4efe4', '#ede4d3'],
    glow: 'rgba(196, 88, 38, 0.12)',
    accent: '#c45826',
    accentLight: '#df713f',
    accentText: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: 'rgba(22, 23, 26, 0.09)',
    cardHighlightBg: '#faede6',
    cardHighlightBorder: '#e8a381',
    textPrimary: '#16171a',
    textSecondary: '#525761',
    textMuted: '#8a909c',
    badgeBg: '#ece6d8',
    badgeBorder: '#d9d0be',
    badgeText: '#16171a',
    tagBg: '#faede6',
    tagText: '#c45826',
  },
  bold_vibrant: {
    id: 'bold_vibrant',
    name: 'Bold Vibrant',
    bg: '#0a1128',
    bgGrad: ['#060b1c', '#101d42', '#152454'],
    glow: 'rgba(255, 77, 0, 0.28)',
    accent: '#ff4d00',
    accentLight: '#ff7733',
    accentText: '#ffffff',
    cardBg: 'rgba(255, 255, 255, 0.07)',
    cardBorder: 'rgba(255, 255, 255, 0.16)',
    cardHighlightBg: 'rgba(255, 77, 0, 0.18)',
    cardHighlightBorder: 'rgba(255, 77, 0, 0.55)',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    badgeBg: 'rgba(255, 77, 0, 0.2)',
    badgeBorder: 'rgba(255, 77, 0, 0.45)',
    badgeText: '#ff9866',
    tagBg: 'rgba(255, 77, 0, 0.22)',
    tagText: '#ff884d',
  },
  clean_minimal: {
    id: 'clean_minimal',
    name: 'Clean Minimal',
    bg: '#ffffff',
    bgGrad: ['#ffffff', '#f8fafc', '#f1f5f9'],
    glow: 'rgba(5, 150, 105, 0.12)',
    accent: '#059669',
    accentLight: '#10b981',
    accentText: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardHighlightBg: '#ecfdf5',
    cardHighlightBorder: '#a7f3d0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    badgeBg: '#f1f5f9',
    badgeBorder: '#cbd5e1',
    badgeText: '#334155',
    tagBg: '#ecfdf5',
    tagText: '#059669',
  },
  emerald_pro: {
    id: 'emerald_pro',
    name: 'Emerald Pro',
    bg: '#082318',
    bgGrad: ['#051a11', '#0b3323', '#061c13'],
    glow: 'rgba(52, 211, 153, 0.22)',
    accent: '#34d399',
    accentLight: '#6ee7b7',
    accentText: '#051d13',
    cardBg: 'rgba(52, 211, 153, 0.05)',
    cardBorder: 'rgba(52, 211, 153, 0.22)',
    cardHighlightBg: 'rgba(52, 211, 153, 0.14)',
    cardHighlightBorder: 'rgba(52, 211, 153, 0.45)',
    textPrimary: '#ffffff',
    textSecondary: '#a7f3d0',
    textMuted: '#6ee7b7',
    badgeBg: 'rgba(52, 211, 153, 0.12)',
    badgeBorder: 'rgba(52, 211, 153, 0.3)',
    badgeText: '#ffffff',
    tagBg: 'rgba(52, 211, 153, 0.18)',
    tagText: '#34d399',
  }
};

function getActiveTheme() {
  if (marketing.theme && POSTER_THEMES[marketing.theme]) {
    return POSTER_THEMES[marketing.theme];
  }
  // Smart defaults by sector
  if (marketing.industry === 'recruitment') return POSTER_THEMES.emerald_pro;
  if (marketing.industry === 'education') return POSTER_THEMES.warm_editorial;
  if (marketing.industry === 'service') return POSTER_THEMES.clean_minimal;
  return POSTER_THEMES.bold_vibrant;
}

function industryCopy(copy, kind, source) {
  const norm = s => String(s || '').toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}@]+/gu, ' ').trim();
  const same = (a, b) => {
    a = norm(a); b = norm(b);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  };
  const points = [];
  for (const p of copy.points || []) {
    if (!p.trim() || same(p, copy.headline) || points.some(v => same(v, p))) continue;
    if (/không cần|không yêu cầu/i.test(p) && !norm(source).includes(norm(p))) continue;
    points.push(p);
  }
  const subline = points.some(p => same(p, copy.subline)) ? '' : copy.subline;
  return { ...copy, points, subline };
}

/* Base Drawing Primitives */
function drawCard(ctx, x, y, w, h, r, fill, stroke, shadow = false) {
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

function drawImageCover(ctx, img, dx, dy, dw, dh, radius = 0) {
  if (!img) return;
  const nw = img.naturalWidth || img.width || 1;
  const nh = img.naturalHeight || img.height || 1;
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

function drawBackground(ctx, w, h, th, bgImg = null) {
  if (bgImg && (bgImg.complete || bgImg.naturalWidth > 0)) {
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
    } catch (e) {
      // In case drawImage throws on mock canvas, fall back to procedural
    }
  }

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, th.bgGrad[0]);
  grad.addColorStop(0.5, th.bgGrad[1]);
  grad.addColorStop(1, th.bgGrad[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft atmospheric lighting glow
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

  // Subtle architectural grid line
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

function drawBadgePill(ctx, text, x, y, bg, border, color, dotColor = null) {
  ctx.save();
  ctx.font = '600 19px "Be Vietnam Pro", sans-serif';
  const padX = 20, padY = 9;
  const metrics = ctx.measureText(text);
  const w = metrics.width + padX * 2 + (dotColor ? 16 : 0);
  const h = 38;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 19);
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
  ctx.fillText(text, textX, y + h / 2);
  ctx.restore();
  return w;
}

function drawAssetShowcase(ctx, asset, x, y, w, h, radius = 20, options = {}) {
  if (!asset || !asset.im) return;

  const th = options.theme || getActiveTheme();
  const imW = asset.im.naturalWidth || asset.im.width || 1;
  const imH = asset.im.naturalHeight || asset.im.height || 1;
  const boxW = asset.w || imW;
  const boxH = asset.h || imH;
  const boxL = asset.l || 0;
  const boxT = asset.t || 0;

  const isCutout = Boolean(marketing.cutout) || (boxW < imW * 0.9 && boxH < imH * 0.9);

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

function drawArrowIcon(ctx, x, y, size, color) {
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

function drawPaperPlaneIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + size, y);
  ctx.lineTo(x, y + size * 0.62);
  ctx.lineTo(x + size * 0.4, y + size * 0.72);
  ctx.lineTo(x + size * 0.52, y + size);
  ctx.lineTo(x + size * 0.68, y + size * 0.76);
  ctx.lineTo(x + size, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHandwrittenSlogan(ctx, text, x, y, size, color, angle = -6) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.font = `italic 600 ${size}px "Caveat", "Dancing Script", "Playfair Display", Georgia, cursive, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, i * size * 1.15);
  });
  const lastLine = lines[lines.length - 1] || text;
  const w = ctx.measureText(lastLine).width;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const lineY = (lines.length - 1) * size * 1.15 + size * 0.52;
  ctx.moveTo(-w * 0.95, lineY);
  ctx.quadraticCurveTo(-w * 0.5, lineY + 3, 5, lineY - 2);
  ctx.stroke();
  ctx.restore();
}

function drawCitySkyline(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  const buildings = [
    { w: 0.04, h: 0.35 },
    { w: 0.05, h: 0.5 },
    { w: 0.04, h: 0.4 },
    { w: 0.06, h: 0.65 },
    { w: 0.04, h: 0.45 },
    { w: 0.06, h: 0.78, tower: true },
    { w: 0.05, h: 0.55 },
    { w: 0.04, h: 0.42 },
    { w: 0.06, h: 0.95, spire: true },
    { w: 0.05, h: 0.68 },
    { w: 0.05, h: 0.52 },
    { w: 0.06, h: 0.4 },
    { w: 0.05, h: 0.62 },
    { w: 0.06, h: 0.48 },
    { w: 0.08, h: 0.38 },
    { w: 0.06, h: 0.52 },
    { w: 0.07, h: 0.32 },
    { w: 0.04, h: 0.25 },
  ];
  let curX = x;
  for (const b of buildings) {
    const bw = b.w * w;
    const bh = b.h * h;
    const by = y + h - bh;
    if (b.spire) {
      ctx.lineTo(curX, y + h);
      ctx.lineTo(curX, by + bh * 0.4);
      ctx.lineTo(curX + bw * 0.35, by + bh * 0.15);
      ctx.lineTo(curX + bw * 0.48, by);
      ctx.lineTo(curX + bw * 0.52, by);
      ctx.lineTo(curX + bw * 0.65, by + bh * 0.15);
      ctx.lineTo(curX + bw, by + bh * 0.4);
      ctx.lineTo(curX + bw, y + h);
    } else {
      ctx.lineTo(curX, by);
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

/* Master Industry Poster Router */
function drawIndustryPoster(canvas, kind, raw, asset, bgImg = null) {
  const h = { '1:1': 1080, '4:5': 1350, '9:16': 1920 }[marketing.aspect];
  canvas.width = 1080;
  canvas.height = h;

  const th = getActiveTheme();
  const copy = industryCopy(raw, kind, marketing.details + ' ' + marketing.offer);

  if (marketing.industry === 'recruitment') {
    if (kind === 'launch') {
      drawRecruitmentHero(canvas, copy, asset, th, bgImg);
    } else if (kind === 'story') {
      drawRecruitmentStory(canvas, copy, asset, th, bgImg);
    } else {
      drawRecruitmentAction(canvas, copy, asset, th, bgImg);
    }
    return;
  }

  if (marketing.industry === 'education') {
    drawEducationPoster(canvas, kind, copy, asset, th, bgImg);
    return;
  }

  if (marketing.industry === 'service') {
    drawServicePoster(canvas, kind, copy, asset, th, bgImg);
    return;
  }

  // Fallback / General
  drawGeneralModernPoster(canvas, kind, copy, asset, th, bgImg);
}

/* =========================================================================
   1. RECRUITMENT POSTERS (Hero, Story / Requirements, Action / Contact)
   ========================================================================= */

function drawRecruitmentHero(canvas, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx, w, h, th, bgImg);

  const m = 54, contentW = w - m * 2;
  const hasPhoto = Boolean(asset && asset.im);

  // 1. Bottom Cityscape Silhouette (shown when no photo banner)
  if (!hasPhoto) {
    drawCitySkyline(ctx, 0, h - 280, w, 220, th.glow);
  }

  // 2. Top Header Composition: Brand + Script Slogan + Giant HIRING
  const brandText = marketing.brand || 'MIVY STUDIO';
  drawBadgePill(ctx, brandText, m, 52, th.badgeBg, th.cardBorder, th.textPrimary);

  // Top-Right Slogan (Handwritten angled with underline)
  drawHandwrittenSlogan(ctx, 'Good People\nGreat Products', w - m, 68, 30, th.accentLight, -6);

  // "We're" cursive script
  ctx.save();
  ctx.font = 'italic 700 44px "Caveat", "Dancing Script", "Playfair Display", Georgia, cursive, sans-serif';
  ctx.fillStyle = th.accent;
  ctx.fillText("We're", m + 4, 134);
  ctx.restore();

  // "HIRING" Heavy Bold Display
  ctx.save();
  ctx.font = '900 86px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textPrimary;
  ctx.fillText('HIRING', m, 216);
  ctx.restore();

  // Role Headline (e.g. LEAD / FULLSTACK DEVELOPER)
  const roleTitle = (copy.headline || marketing.name).replace(/^tuyển(?: dụng)?\s+/i, '');
  ctx.save();
  ctx.font = '700 34px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentLight;
  ctx.fillText(roleTitle.toUpperCase(), m + 2, 264);
  ctx.restore();

  // Tracking Tagline
  ctx.save();
  ctx.font = '600 14px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textMuted;
  ctx.fillText('JOIN OUR TEAM   ·   BUILD BETTER TOGETHER', m + 3, 296);
  ctx.restore();

  // 3. Information Extraction from JD
  const source = marketing.details + ' ' + marketing.offer;
  const allFacts = (copy.pointsEdited || copy.points?.length >= 5)
    ? copy.points
    : marketing.details.split(/\n+/).map(t => t.trim()).filter(Boolean);

  let salaryHighlight = '';
  const cleanFacts = [];
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

  // 4. Structured Job Specification Matrix Table
  const footerH = 145;
  const footerY = h - footerH - 30;

  let tableY = 328;
  if (hasPhoto) {
    const photoY = 320;
    const photoH = h >= 1920 ? 460 : (h >= 1350 ? 290 : 200);
    const badgeText = salaryHighlight
      ? `✨ ĐÃI NGỘ: ${salaryHighlight.slice(0, 32).toUpperCase()}`
      : '🏢 MÔI TRƯỜNG & VĂN PHÒNG CHUYÊN NGHIỆP';

    drawAssetShowcase(ctx, asset, m, photoY, contentW, photoH, 20, {
      badge: badgeText,
      tag: 'MIVY TEAM & CULTURE',
      theme: th,
    });
    tableY = photoY + photoH + 18;
  }

  const tableH = footerY - tableY - 24;

  // Table container card
  drawCard(ctx, m, tableY, contentW, tableH, 20, th.cardBg, th.cardBorder);

  // Column definitions
  const col0W = 320, col1W = 210, col2W = 250, col3W = contentW - col0W - col1W - col2W;
  const colX = [m, m + col0W, m + col0W + col1W, m + col0W + col1W + col2W];

  // Table Header
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

  // Table header bottom divider
  ctx.save();
  ctx.strokeStyle = th.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(m, tableY + headH);
  ctx.lineTo(m + contentW, tableY + headH);
  ctx.stroke();
  ctx.restore();

  // Dynamic rows mapping
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

    // Col 0: Title & Subtitle
    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '700 19px "Be Vietnam Pro", sans-serif' : '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.fillText(row.c0.title, colX[0] + 24, ry + rowH / 2 - 12);

    ctx.font = (hasPhoto && h < 1350) ? '400 14px "Be Vietnam Pro", sans-serif' : '400 16px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textSecondary;
    ctx.fillText(row.c0.sub, colX[0] + 24, ry + rowH / 2 + 16);
    ctx.restore();

    // Col 1: Exp / Salary
    ctx.save();
    const isSalaryRow = (rIdx === rowCount - 1) && salaryHighlight;
    ctx.font = isSalaryRow ? '700 21px "Be Vietnam Pro", sans-serif' : '600 20px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = isSalaryRow ? th.accent : th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c1, colX[1] + 24, ry + rowH / 2);
    ctx.restore();

    // Col 2: Stack / Skills
    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '500 17px "Be Vietnam Pro", sans-serif' : '500 19px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c2, colX[2] + 24, ry + rowH / 2);
    ctx.restore();

    // Col 3: Location
    ctx.save();
    ctx.font = (hasPhoto && h < 1350) ? '600 17px "Be Vietnam Pro", sans-serif' : '600 19px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = th.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.fillText(row.c3, colX[3] + 24, ry + rowH / 2);
    ctx.restore();

    // Horizontal divider between rows
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

  // Vertical column dividers
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

  // 5. Footer & Action Area
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (source.match(/(?:0\d{9,10}|\+84\d{9,10})/i) || [])[0];

  // Send CV Button
  const btnW = 290, btnH = 64;
  drawCard(ctx, m, footerY + 8, btnW, btnH, 32, th.accent, null, true);

  // Paper airplane icon
  drawPaperPlaneIcon(ctx, m + 28, footerY + 28, 24, th.accentText);

  // Button text
  ctx.save();
  ctx.font = '700 23px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.accentText;
  ctx.textBaseline = 'middle';
  ctx.fillText('Send your CV', m + 68, footerY + 8 + btnH / 2);
  ctx.restore();

  // Direct Contact Info next to button
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

  // Bottom-Right Handwritten Slogan
  drawHandwrittenSlogan(ctx, 'Same People\nBrighter Tomorrow', w - m, footerY + 52, 28, th.accentLight, -5);

  // Micro-Footer Tagline
  ctx.save();
  ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textMuted;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('HO CHI MINH CITY   ·   GROW   ·   LEARN   ·   MAKE AN IMPACT', w / 2, h - 18);
  ctx.restore();
}

function drawRecruitmentStory(canvas, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx, w, h, th, bgImg);

  const m = 60, contentW = w - m * 2;
  const hasPhoto = Boolean(asset && asset.im);

  // Header Bar
  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, '02 / 03 · TIÊU CHÍ & YÊU CẦU', w - m - 300, 68, th.badgeBg, th.badgeBorder, th.accent);

  // Section Title
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

  let startY = 215 + titleHeight + 22;
  const footerY = h - 120;

  if (hasPhoto) {
    const photoH = h >= 1920 ? 340 : (h >= 1350 ? 220 : 150);
    drawAssetShowcase(ctx, asset, m, startY, contentW, photoH, 20, {
      badge: '✨ VĂN HÓA LÀM VIỆC & PHÁT TRIỂN',
      tag: 'OUR WORKSPACE',
      theme: th,
    });
    startY += photoH + 20;
  }

  const availableH = footerY - startY - 20;

  // Render 3 Editorial Bento Cards
  let points = copy.points?.length ? copy.points.slice(0, 3) : [copy.subline];
  if (!points[0]) points = ['Kinh nghiệm làm việc thực tế với các dự án production.'];

  const cardH = (availableH - (points.length - 1) * 16) / points.length;

  points.forEach((point, i) => {
    const cy = startY + i * (cardH + 16);

    // Clean divider line instead of enclosing card bounding box
    ctx.save();
    ctx.strokeStyle = th.cardBorder;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(m, cy + cardH);
    ctx.lineTo(m + contentW, cy + cardH);
    ctx.stroke();
    ctx.restore();

    // Large numeral
    ctx.save();
    ctx.font = `800 ${cardH > 140 ? '54px' : '42px'} "Be Vietnam Pro", monospace`;
    ctx.fillStyle = th.accent;
    ctx.fillText('0' + (i + 1), m + 10, cy + (cardH > 140 ? 56 : 42));
    ctx.restore();

    // Text content
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

  // Bottom action hint (clean text + arrow, no box)
  ctx.save();
  ctx.font = '600 20px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = th.textSecondary;
  ctx.fillText('Bước tiếp theo: Tìm hiểu quyền lợi & nộp hồ sơ ứng tuyển', m, footerY + 39);
  drawArrowIcon(ctx, m + contentW - 45, footerY + 22, 20, th.accent);
  ctx.restore();
}

function drawRecruitmentAction(canvas, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx, w, h, th, bgImg);

  const m = 60, contentW = w - m * 2;
  const hasPhoto = Boolean(asset && asset.im);

  // Header Bar
  drawBadgePill(ctx, marketing.brand || 'MIVY CAREERS', m, 68, th.badgeBg, th.badgeBorder, th.badgeText);
  drawBadgePill(ctx, '03 / 03 · KẾT NỐI & ỨNG TUYỂN', w - m - 310, 68, th.tagBg, th.cardHighlightBorder, th.tagText);

  // Section Title
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

  // 1. Prominent Contact Box (Glassmorphism)
  const source = copy.points.join(' ') + ' ' + copy.subline + ' ' + marketing.details + ' ' + marketing.offer;
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];

  const contactH = h >= 1350 ? 250 : 200;
  drawCard(ctx, m, currentY, contentW, contactH, 24, th.cardHighlightBg, th.cardHighlightBorder, true);

  if (hasPhoto) {
    const photoW = Math.min(320, Math.floor(contentW * 0.34));
    const photoX = m + contentW - photoW;
    drawAssetShowcase(ctx, asset, photoX, currentY, photoW, contactH, 24, {
      badge: 'WELCOME',
      theme: th,
    });
  }

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

  // 2. Three Step Pipeline Cards
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

  // Footer CTA
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

/* =========================================================================
   2. EDUCATION & COURSE POSTERS
   ========================================================================= */

function drawEducationPoster(canvas, kind, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
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
    });
    currentY += photoH + 20;
  } else if (copy.subline) {
    const subH = posterText(
      ctx,
      copy.subline,
      m,
      currentY,
      contentW,
      h * 0.08,
      26,
      th.textSecondary,
      '400',
      '"Be Vietnam Pro", sans-serif'
    );
    currentY += subH + 20;
  }

  const cardAreaH = footerY - currentY - 20;
  const points = copy.points?.length ? copy.points.slice(0, 3) : ['Thông tin chi tiết khóa học.'];
  const cardH = (cardAreaH - (points.length - 1) * 16) / points.length;

  points.forEach((pt, i) => {
    const cy = currentY + i * (cardH + 16);
    drawCard(ctx, m, cy, contentW, cardH, 20, th.cardBg, th.cardBorder);

    drawBadgePill(ctx, 'CHẶNG 0' + (i + 1), m + 24, cy + 20, th.tagBg, th.cardHighlightBorder, th.tagText);

    posterText(
      ctx,
      pt,
      m + 160,
      cy + 18,
      contentW - 190,
      cardH - 36,
      cardH > 100 ? 25 : 21,
      th.textPrimary,
      '600',
      '"Be Vietnam Pro", sans-serif'
    );
  });

  // Footer
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

/* =========================================================================
   3. SERVICE & CONSULTING POSTERS
   ========================================================================= */

function drawServicePoster(canvas, kind, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
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
    });
    currentY += photoH + 20;
  } else if (copy.subline) {
    const subH = posterText(
      ctx,
      copy.subline,
      m,
      currentY,
      contentW,
      h * 0.08,
      26,
      th.textSecondary,
      '400',
      '"Be Vietnam Pro", sans-serif'
    );
    currentY += subH + 20;
  }

  const points = copy.points?.length ? copy.points.slice(0, 3) : ['Cam kết chất lượng dịch vụ chuẩn mực.'];
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

    posterText(
      ctx,
      pt,
      m + 80,
      cy + 22,
      contentW - 110,
      cardH - 44,
      cardH > 100 ? 25 : 21,
      th.textPrimary,
      '600',
      '"Be Vietnam Pro", sans-serif'
    );
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

/* =========================================================================
   4. GENERAL / PRODUCT MODERN POSTERS
   ========================================================================= */

function drawGeneralModernPoster(canvas, kind, copy, asset, th, bgImg = null) {
  const w = 1080, h = canvas.height;
  const ctx = canvas.getContext('2d');
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

  // Center Product / Visual Frame
  const frameH = Math.min(h * 0.42, footerY - currentY - 140);

  if (asset) {
    drawAssetShowcase(ctx, asset, m, currentY, contentW, frameH, 24, { theme: th });
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
      '700',
      '"Be Vietnam Pro", sans-serif'
    );
  }

  currentY += frameH + 20;

  if (copy.subline) {
    posterText(
      ctx,
      copy.subline,
      m,
      currentY,
      contentW,
      h * 0.08,
      24,
      th.textSecondary,
      '500',
      '"Be Vietnam Pro", sans-serif'
    );
  }

  // Footer & Offer
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
