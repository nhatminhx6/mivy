import { balancedPages, pageAt } from './balanced-pages';
import { MarketingState, PosterKind, CopyItem, AssetInfo } from '../types';
import { posterText } from './design-engine';

export function drawIndustryConcept(
  canvas: HTMLCanvasElement, 
  state: MarketingState & { conceptId?: string; industryFields?: Record<string, string> }, 
  kind: PosterKind, 
  copy: CopyItem, 
  asset: AssetInfo | null, 
  bgImg: CanvasImageSource | null
): boolean {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height, m = w * 0.08;
  const fields = state.industryFields || {};
  const cId = state.conceptId;
  const validConcepts = ['recruitment-announcement', 'recruitment-team', 'property-architecture', 'property-brochure', 'food-hero', 'food-menu'];
  
  if (!cId || !validConcepts.includes(cId) || (state.categoryId && !cId.startsWith(state.categoryId + '-'))) {
    return false;
  }
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  if (bgImg) {
    const im = bgImg as HTMLImageElement, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    if (sw && sh) {
      const blur = state.backgroundBlur ?? 0, bleed = blur * 3, scale = Math.max((w + bleed * 2) / sw, (h + bleed * 2) / sh);
      ctx.save(); ctx.filter = `blur(${blur}px)`;
      const dx = (w - sw * scale) * (state.backgroundX ?? 50) / 100, dy = (h - sh * scale) * (state.backgroundY ?? 50) / 100;
      ctx.drawImage(im, dx, dy, sw * scale, sh * scale);
      ctx.restore();
      ctx.fillStyle = `rgba(0,0,0,${(state.backgroundDim ?? 30) / 100})`; ctx.fillRect(0, 0, w, h);
    }
  }

  const ink = bgImg ? '#ffffff' : '#111111', brandInk = bgImg ? '#dddddd' : '#555555';
  
  const drawText = (s: string, x: number, y: number, ww: number, hh: number, size: number, color: string = ink, weight: string = '700') => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip(); posterText(ctx, s, x, y, ww, hh, size, color, weight); ctx.restore();
  };

  const drawPhoto = (x: number, y: number, ww: number, hh: number, radius: number = w * 0.03, circular: boolean = false) => {
    if (!asset) return;
    ctx.save(); ctx.beginPath();
    if (circular) ctx.arc(x + ww / 2, y + hh / 2, Math.min(ww, hh) / 2, 0, Math.PI * 2); else ctx.roundRect(x, y, ww, hh, radius);
    ctx.clip();
    const sw = asset.im.naturalWidth || asset.im.width, sh = asset.im.naturalHeight || asset.im.height;
    const fitContain = state.mainImageFit === "contain", scale = (fitContain ? Math.min(ww / sw, hh / sh) : Math.max(ww / sw, hh / sh)) * (state.mainImageZoom ?? 100) / 100;
    const dx = x + (ww - sw * scale) * (state.mainImageX ?? 50) / 100, dy = y + (hh - sh * scale) * (state.mainImageY ?? 50) / 100;
    if (!circular) {
      const l=Math.max(x,dx),t=Math.max(y,dy),rw=Math.min(x+ww,dx+sw*scale)-l,rh=Math.min(y+hh,dy+sh*scale)-t;
      ctx.beginPath();ctx.roundRect(l,t,rw,rh,Math.min(radius,rw/2,rh/2));ctx.clip();
    }
    ctx.drawImage(asset.im, dx, dy, sw * scale, sh * scale);
    ctx.restore();
  };

  const allPoints = copy.points || [];
  const isStory = kind === 'story';
  const pages = balancedPages(allPoints, state.storyPerPage || 3);
  const currentPage = pageAt(pages, state.storyPage || 0);
  const points = isStory ? currentPage.items : allPoints.slice(0,3);
  
  if (cId === 'food-menu' && !asset && !bgImg && kind !== 'story') {
    ctx.fillStyle = '#f4eedf';
    ctx.fillRect(0, 0, w, h);
    
    const paperInk = '#263a2c';
    const paperRust = '#ab4b32';
    const inset = w * 0.04;
    
    ctx.strokeStyle = paperInk;
    ctx.lineWidth = 1;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.strokeRect(inset + 4, inset + 4, w - (inset + 4) * 2, h - (inset + 4) * 2);
    
    if (state.brand) {
      drawText(state.brand, inset * 2, inset * 2, w - inset * 4, h * 0.05, w * 0.035, paperInk, '700');
    }
    
    drawText(copy.headline || '', inset * 2, h * 0.15, w - inset * 4, h * 0.16, w * 0.11, paperInk, '900');
    
    let listTop = h * 0.48;
    if (copy.subline) {
      ctx.fillStyle = paperRust;
      ctx.fillRect(0, h * 0.34, w, h * 0.10);
      drawText(copy.subline, inset * 2, h * 0.36, w - inset * 4, h * 0.06, w * 0.05, '#f4eedf', '700');
    } else {
      listTop = h * 0.34;
    }
    
    const lang = state.outputLanguage;
    const contact = fields.contact || fields.booking || '';
    const ctaText = copy.cta || (lang === 'en' ? 'VIEW MENU' : 'XEM THỰC ĐƠN');

    const measureWrap = (text: string, size: number, maxWidth: number) => {
      ctx.font = `500 ${size}px "Be Vietnam Pro"`;
      const paragraphs = text.split('\n');
      let lines: string[] = [];
      for (const p of paragraphs) {
        if (!p) {
          lines.push('');
          continue;
        }
        const words = p.split(' ');
        let currentLine = '';
        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
          } else {
            if (ctx.measureText(word).width > maxWidth) {
              if (currentLine) { lines.push(currentLine); currentLine = ''; }
              let tempLine = '';
              for (const char of word) {
                if (ctx.measureText(tempLine + char).width <= maxWidth) {
                  tempLine += char;
                } else {
                  if (tempLine) lines.push(tempLine);
                  tempLine = char;
                }
              }
              currentLine = tempLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
        }
        if (currentLine) lines.push(currentLine);
      }
      return lines;
    };

    const minSize = Math.max(30, (w / 1080) * 30);
    const sizes = [Math.max(w * 0.045, minSize), Math.max(w * 0.035, minSize), minSize];
    let finalLayout: { lines: string[], height: number }[] = [];
    let finalSize = sizes[sizes.length - 1];
    let hiddenCount = 0;
    const listBottom = h * 0.83;
    
    for (const size of sizes) {
      ctx.font = `500 ${size}px "Be Vietnam Pro"`;
      const lineHeight = size * 1.4;
      const padding = size * 1.0;
      
      let allFit = true;
      let totalH = 0;
      let fullLayout: { lines: string[], height: number }[] = [];
      
      for (let i = 0; i < allPoints.length; i++) {
        const lines = measureWrap(allPoints[i], size, w - inset * 4);
        const itemH = lines.length * lineHeight;
        const padH = fullLayout.length > 0 ? padding : 0;
        
        if (listTop + totalH + itemH + padH <= listBottom) {
          totalH += itemH + padH;
          fullLayout.push({ lines, height: itemH });
        } else {
          allFit = false;
          break;
        }
      }
      
      if (allFit) {
        finalLayout = fullLayout;
        finalSize = size;
        hiddenCount = 0;
        break;
      }
      
      let tempLayout = [];
      let currentH = 0;
      let tempHidden = 0;
      const cueH = size * 3.0;
      
      for (let i = 0; i < allPoints.length; i++) {
        const lines = measureWrap(allPoints[i], size, w - inset * 4);
        const itemH = lines.length * lineHeight;
        const padH = tempLayout.length > 0 ? padding : 0;
        
        if (listTop + currentH + itemH + padH + cueH <= listBottom) {
          currentH += itemH + padH;
          tempLayout.push({ lines, height: itemH });
        } else {
          tempHidden = allPoints.length - i;
          break;
        }
      }
      
      if (size === sizes[sizes.length - 1]) {
        finalLayout = tempLayout;
        finalSize = size;
        hiddenCount = tempHidden;
      }
    }
    
    let currentY = listTop;
    const lineHeight = finalSize * 1.4;
    
    ctx.textBaseline = 'top';
    finalLayout.forEach((item, i) => {
      if (i > 0) { 
        currentY += finalSize * 0.5; 
        ctx.fillStyle = 'rgba(38,58,44,0.15)'; 
        ctx.fillRect(inset * 2, currentY, w - inset * 4, 1); 
        currentY += finalSize * 0.5; 
      }
      ctx.font = `500 ${finalSize}px "Be Vietnam Pro"`;
      ctx.fillStyle = paperInk;
      item.lines.forEach((line) => {
        ctx.fillText(line, inset * 2, currentY);
        currentY += lineHeight;
      });
    });
    
    if (hiddenCount > 0) {
      currentY += finalSize * 0.8;
      const cue = lang === 'en' ? `+${hiddenCount} MORE ON DETAIL PAGE` : `+${hiddenCount} NỘI DUNG Ở TRANG CHI TIẾT`;
      ctx.font = `700 ${finalSize * 0.9}px "Be Vietnam Pro"`;
      ctx.fillStyle = paperRust;
      ctx.fillText(cue, inset * 2, currentY);
      currentY += finalSize * 1.5;
    } else {
      currentY += finalSize * 1.0;
    }
    
    let ctaY = currentY;
    if (ctaY > h * 0.85) ctaY = h * 0.85;
    const contactY = ctaY + h * 0.05;
    
    drawText(ctaText, inset * 2, ctaY, w - inset * 4, h * 0.04, w * 0.04, paperRust, '800');
    drawText(contact, inset * 2, contactY, w - inset * 4, h * 0.04, w * 0.035, paperInk, '500');
    
    return true;
  }

  if (state.brand) {
    drawText(state.brand, m, m, w - m * 2, h * 0.05, w * 0.03, brandInk, '600');
  }

  const lang = state.outputLanguage;
  const contact = fields.contact || fields.booking || '';

  if (isStory) {
    const page = currentPage.index + 1;
    const totalPages = pages.length;
    drawText(`${page}/${totalPages}`, w - m - w * 0.1, m, w * 0.1, h * 0.05, w * 0.03, brandInk, '600');
    
    drawText(copy.headline || '', m, m + h * 0.08, w - m * 2, h * 0.15, w * 0.08, ink, '800');
    drawText(copy.subline || '', m, m + h * 0.23, w - m * 2, h * 0.05, w * 0.05, ink, '600');
    
    const bodyY = h * 0.38;
    const bodyH = h * 0.44;
    if (cId.startsWith('recruitment')) {
      const pointH = bodyH / Math.max(1, points.length);
      points.forEach((p, i) => {
        const py = bodyY + i * pointH;
        ctx.fillStyle = brandInk; ctx.fillRect(m, py + pointH * 0.1, w * 0.015, pointH * 0.8);
        const numStr = `0${currentPage.offset + i + 1}`.slice(-2);
        drawText(numStr, m + w * 0.04, py + pointH * 0.1, w * 0.1, pointH * 0.25, w * 0.035, brandInk, '800');
        drawText(p, m + w * 0.04, py + pointH * 0.35, w - m * 2 - w * 0.04, pointH * 0.55, w * 0.04, ink, '500');
      });
    } else if (cId.startsWith('property')) {
      const is916 = (h / w) > 1.6;
      const cols = is916 ? 1 : 2;
      const rows = Math.ceil(points.length / cols);
      const pointH = bodyH / Math.max(1, rows);
      const colW = (w - m * 2 - (cols > 1 ? m * 0.5 : 0)) / cols;
      points.forEach((p, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const px = m + col * (colW + m * 0.5), py = bodyY + row * pointH;
        ctx.save(); ctx.fillStyle = bgImg ? 'rgba(0,0,0,0.4)' : 'rgba(240,240,240,0.8)';
        ctx.beginPath(); ctx.roundRect(px, py + pointH * 0.05, colW, pointH * 0.9, w * 0.03); ctx.fill(); ctx.restore();
        drawText(p, px + colW * 0.1, py + pointH * 0.15, colW * 0.8, pointH * 0.7, w * 0.035, ink, '500');
      });
    } else if (cId.startsWith('food')) {
      const pointH = bodyH / Math.max(1, points.length);
      points.forEach((p, i) => {
        const py = bodyY + i * pointH;
        ctx.fillStyle = brandInk; ctx.fillRect(m, py, w - m * 2, 1);
        if (i === points.length - 1) ctx.fillRect(m, py + pointH * 0.95, w - m * 2, 1);
        drawText(p, m, py + pointH * 0.1, w - m * 2, pointH * 0.75, w * 0.04, ink, '500');
      });
    } else {
      const pointH = bodyH / Math.max(1, points.length);
      points.forEach((p, i) => drawText(`• ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.04, ink, '500'));
    }
    
    const ctaText = copy.cta || (lang === 'en' ? 'Contact' : 'Liên hệ');
    drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.04, ink, '700');
    drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '400');
    return true;
  }

  if (cId === 'recruitment-announcement') {
    if (!asset && !bgImg) {
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, w, h);
      if (state.brand) {
        drawText(state.brand, m, m, w - m * 2, h * 0.05, w * 0.035, '#a3e635', '700');
      }
      drawText(copy.headline || '', m, h * 0.15, w - m * 2, h * 0.17, w * 0.08, '#fdfbf7', '900');
      
      let infoY = h * 0.34;
      const infoH = h * 0.12;
      const salaryText = copy.subline || fields.salary || '';
      const hasSal = !!salaryText;
      const hasLoc = !!fields.location;
      
      if (hasSal) {
        const salH = hasLoc ? infoH * 0.45 : infoH * 0.8;
        ctx.save(); ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.roundRect(m, infoY, w - m * 2, salH, w * 0.02); ctx.fill(); ctx.restore();
        const label = lang === 'en' ? 'SALARY' : 'MỨC LƯƠNG';
        drawText(`${label}: ${salaryText}`, m + w * 0.04, infoY + salH * 0.15, w - m * 2 - w * 0.08, salH * 0.7, w * 0.035, '#0a192f', '800');
        infoY += salH + infoH * 0.1;
      }
      if (hasLoc) {
        const locH = hasSal ? infoH * 0.45 : infoH * 0.8;
        ctx.save(); ctx.fillStyle = '#112240'; ctx.beginPath(); ctx.roundRect(m, infoY, w - m * 2, locH, w * 0.02); ctx.fill(); ctx.restore();
        const label = lang === 'en' ? 'LOCATION' : 'ĐỊA ĐIỂM';
        drawText(`${label}: ${fields.location}`, m + w * 0.04, infoY + locH * 0.15, w - m * 2 - w * 0.08, locH * 0.7, w * 0.035, '#fdfbf7', '700');
      }
      
      const reqY = h * 0.50;
      const reqH = h * 0.25;
      const dispPoints = allPoints.slice(0, 3);
      const pointH = reqH / Math.max(1, dispPoints.length);
      dispPoints.forEach((p, i) => {
        const py = reqY + i * pointH;
        drawText(`0${i + 1}`, m, py, w * 0.08, pointH * 0.9, w * 0.045, '#a3e635', '800');
        drawText(p, m + w * 0.1, py, w - m * 2 - w * 0.1, pointH * 0.9, w * 0.035, '#fdfbf7', '500');
      });
      if (allPoints.length > 3) {
        const extra = allPoints.length - 3;
        const msg = lang === 'en' ? `+${extra} MORE IN DETAILS` : `+${extra} NỘI DUNG Ở TRANG CHI TIẾT`;
        drawText(msg, m + w * 0.1, reqY + reqH, w - m * 2 - w * 0.1, h * 0.03, w * 0.03, '#a3e635', '600');
      }
      
      const footY = h * 0.78;
      ctx.save(); ctx.fillStyle = '#a3e635'; ctx.fillRect(0, footY, w, h - footY); ctx.restore();
      const ctaText = copy.cta || (lang === 'en' ? 'APPLY NOW' : 'ỨNG TUYỂN NGAY');
      drawText(ctaText, m, footY + h * 0.02, w - m * 2, h * 0.05, w * 0.05, '#0a192f', '900');
      if (contact) {
        drawText(contact, m, footY + h * 0.08, w - m * 2, h * 0.10, w * 0.035, '#0a192f', '600');
      }
    } else {
      drawText(copy.headline || '', m, m + h * 0.05, w - m * 2, h * 0.15, w * 0.09, ink, '900');
      drawText(copy.subline || '', m, m + h * 0.2, w - m * 2, h * 0.05, w * 0.05, ink, '700');
      let bodyY = m + h * 0.28;
      if (asset) { 
        drawPhoto(m, bodyY, w - m * 2, h * 0.25); 
        bodyY += h * 0.28; 
      }
      const bodyH = (h * 0.83) - bodyY;
      const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
      points.forEach((p, i) => drawText(`• ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.035, ink, '500'));
      
      const ctaText = copy.cta || (lang === 'en' ? 'Apply Now' : 'Ứng tuyển ngay');
      drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.04, ink, '800');
      drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '500');
    }
  } else if (cId === 'recruitment-team') {
    if (asset) drawPhoto(m, m + h * 0.05, w - m * 2, h * 0.35);
    const ty = asset ? m + h * 0.42 : m + h * 0.05;
    drawText(copy.headline || '', m, ty, w - m * 2, h * 0.1, w * 0.08, ink, '800');
    drawText(copy.subline || '', m, ty + h * 0.1, w - m * 2, h * 0.05, w * 0.04, ink, '400');
    const bodyY = ty + h * 0.18;
    const bodyH = (h * 0.83) - bodyY;
    const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
    points.forEach((p, i) => drawText(`• ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.035, ink, '500'));
    
    const ctaText = copy.cta || (lang === 'en' ? 'Join Us' : 'Tham gia cùng chúng tôi');
    drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.04, ink, '700');
    drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '500');
  } else if (cId === 'property-architecture') {
    if (!asset && !bgImg) {
      ctx.fillStyle = '#f4eedf';
      ctx.fillRect(0, 0, w, h);
      
      const forest = '#1a3322';
      
      if (state.brand) {
        drawText(state.brand, m, h * 0.05, w - m * 2, h * 0.04, w * 0.035, forest, '700');
      }
      
      if (copy.subline && copy.subline !== fields.price) {
        drawText(copy.headline || '', m, h * 0.12, w - m * 2, h * 0.08, w * 0.07, forest, '900');
        drawText(copy.subline, m, h * 0.20, w - m * 2, h * 0.05, w * 0.04, forest, '600');
      } else {
        drawText(copy.headline || '', m, h * 0.12, w - m * 2, h * 0.13, w * 0.09, forest, '900');
      }
      
      if (fields.price) {
        ctx.fillStyle = forest;
        ctx.fillRect(m, h * 0.27, w - m * 2, h * 0.07);
        drawText(fields.price, m + w * 0.04, h * 0.285, w - m * 2 - w * 0.08, h * 0.04, w * 0.045, '#f4eedf', '800');
      }
      
      const tileY = h * 0.37;
      const tileH = h * 0.12;
      const tileW = (w - m * 2 - m * 0.5) / 2;
      if (fields.area) {
        ctx.strokeStyle = forest; ctx.lineWidth = 2;
        ctx.strokeRect(m, tileY, tileW, tileH);
        drawText(lang === 'en' ? 'AREA' : 'DIỆN TÍCH', m + w * 0.03, tileY + h * 0.02, tileW - w * 0.06, h * 0.03, w * 0.03, forest, '600');
        drawText(fields.area, m + w * 0.03, tileY + h * 0.06, tileW - w * 0.06, h * 0.04, w * 0.045, forest, '800');
      }
      if (fields.bedrooms) {
        const bx = m + tileW + m * 0.5;
        ctx.strokeStyle = forest; ctx.lineWidth = 2;
        ctx.strokeRect(bx, tileY, tileW, tileH);
        drawText(lang === 'en' ? 'BEDROOMS' : 'PHÒNG NGỦ', bx + w * 0.03, tileY + h * 0.02, tileW - w * 0.06, h * 0.03, w * 0.03, forest, '600');
        drawText(fields.bedrooms, bx + w * 0.03, tileY + h * 0.06, tileW - w * 0.06, h * 0.04, w * 0.045, forest, '800');
      }
      
      const addr = fields.address || fields.location;
      if (addr) {
        drawText(lang === 'en' ? 'LOCATION' : 'VỊ TRÍ', m, h * 0.52, w - m * 2, h * 0.03, w * 0.03, forest, '600');
        drawText(addr, m, h * 0.55, w - m * 2, h * 0.05, w * 0.04, forest, '700');
      }
      
      if (fields.amenities) {
        drawText(lang === 'en' ? 'AMENITIES' : 'TIỆN ÍCH', m, h * 0.63, w - m * 2, h * 0.03, w * 0.03, forest, '600');
        const amns = fields.amenities.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const amnsY = h * 0.67;
        const amnsH = h * 0.035;
        amns.slice(0, 2).forEach((am, i) => {
          drawText(`• ${am}`, m, amnsY + i * amnsH, w - m * 2, amnsH * 0.9, w * 0.035, forest, '500');
        });
        if (amns.length > 2) {
          const extra = amns.length - 2;
          const msg = lang === 'en' ? `+${extra} MORE...` : `+${extra} TIỆN ÍCH KHÁC...`;
          drawText(msg, m, amnsY + 2 * amnsH + h * 0.005, w - m * 2, amnsH * 0.9, w * 0.03, forest, '700');
        }
      }
      
      ctx.fillStyle = forest;
      ctx.fillRect(0, h * 0.81, w, h * 0.15);
      const ctaText = copy.cta || (lang === 'en' ? 'CONTACT US' : 'LIÊN HỆ');
      drawText(ctaText, m, h * 0.83, w - m * 2, h * 0.06, w * 0.04, '#f4eedf', '800');
      if (contact) {
        drawText(contact, m, h * 0.90, w - m * 2, h * 0.05, w * 0.035, '#f4eedf', '500');
      }
    } else {
      if (asset) drawPhoto(m, m + h * 0.05, w - m * 2, h * 0.4);
      const ty = asset ? m + h * 0.48 : m + h * 0.05;
      drawText(copy.headline || '', m, ty, w - m * 2, h * 0.1, w * 0.09, ink, '800');
      drawText(copy.subline || '', m, ty + h * 0.1, w - m * 2, h * 0.05, w * 0.05, ink, '600');
      const bodyY = ty + h * 0.18;
      const bodyH = (h * 0.83) - bodyY;
      const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
      points.forEach((p, i) => drawText(`✓ ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.035, ink, '400'));
      
      const ctaText = copy.cta || (lang === 'en' ? 'Contact Us' : 'Liên hệ ngay');
      drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.04, brandInk, '600');
      drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '500');
    }
  } else if (cId === 'property-brochure') {
    const hw = asset ? w * 0.38 : w - m * 2;
    drawText(copy.headline || '', m, m + h * 0.05, hw, h * 0.15, w * 0.08, ink, '800');
    if (asset) drawPhoto(w * 0.5, m + h * 0.05, w * 0.5 - m, h * 0.35);
    drawText(copy.subline || '', m, m + h * 0.22, hw, h * 0.1, w * 0.045, ink, '700');
    const bodyY = m + (asset ? h * 0.45 : h * 0.34);
    const bodyH = (h * 0.83) - bodyY;
    const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
    points.forEach((p, i) => drawText(`• ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.035, ink, '500'));
    
    ctx.fillStyle = ink; ctx.fillRect(m, h * 0.86, w - m * 2, h * 0.07);
    const ctaText = copy.cta || (lang === 'en' ? 'CONTACT US' : 'LIÊN HỆ');
    drawText(ctaText, m + w * 0.025, h * 0.86 + h * 0.015, w - m * 2 - w * 0.05, h * 0.04, w * 0.04, bgImg ? '#000000' : '#ffffff', '700');
    drawText(contact, m, h * 0.94, w - m * 2, h * 0.04, w * 0.03, brandInk, '400');
  } else if (cId === 'food-hero') {
    let ty = m + h * 0.05;
    if (asset) {
      const s = Math.min(w - m * 2, h * 0.4); 
      drawPhoto(w / 2 - s / 2, ty, s, s, 0, true);
      ty += s + h * 0.05;
    }
    drawText(copy.headline || '', m, ty, w - m * 2, h * 0.1, w * 0.1, ink, '900');
    drawText(copy.subline || '', m, ty + h * 0.1, w - m * 2, h * 0.05, w * 0.04, '#e63946', '700');
    const bodyY = ty + h * 0.18;
    const bodyH = (h * 0.83) - bodyY;
    const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
    points.forEach((p, i) => drawText(`• ${p}`, m, bodyY + i * pointH, w - m * 2, pointH * 0.9, w * 0.035, ink, '500'));
    
    const ctaText = copy.cta || (lang === 'en' ? 'ORDER NOW' : 'ĐẶT NGAY');
    drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.045, ink, '800');
    drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '500');
  } else if (cId === 'food-menu') {
    drawText(copy.headline || '', m, m + h * 0.05, w - m * 2, h * 0.1, w * 0.09, ink, '800');
    drawText(copy.subline || '', m, m + h * 0.15, w - m * 2, h * 0.05, w * 0.05, ink, '600');
    let bodyY = m + h * 0.22;
    if (asset) { 
      drawPhoto(m, bodyY, w - m * 2, h * 0.25); 
      bodyY += h * 0.28; 
    }
    const bodyH = (h * 0.83) - bodyY;
    const pointH = asset ? bodyH / Math.max(1, points.length) : Math.min(bodyH / Math.max(1, points.length), h * 0.08);
    points.forEach((p, i) => {
      ctx.fillStyle = brandInk; ctx.fillRect(m, bodyY + i * pointH, w - m * 2, 1);
      drawText(p, m, bodyY + i * pointH + h * 0.01, w - m * 2, pointH * 0.8, w * 0.035, ink, '600');
    });
    
    const ctaText = copy.cta || (lang === 'en' ? 'VIEW MENU' : 'XEM THỰC ĐƠN');
    drawText(ctaText, m, h * 0.86, w - m * 2, h * 0.06, w * 0.04, brandInk, '700');
    drawText(contact, m, h * 0.93, w - m * 2, h * 0.05, w * 0.03, brandInk, '500');
  }
  return true;
}
