import { fontFamilyById } from './brand-presets';
import { MarketingState } from '@/types';

// Font đang dùng cho poster (render canvas). Đặt từ state trước mỗi lần vẽ.
let active = '"Be Vietnam Pro", sans-serif';

export function setPosterFontFromState(s: MarketingState) {
  active = s.headingFontId
    ? fontFamilyById(s.headingFontId)
    : s.brandKit
      ? fontFamilyById(s.brandKit.fontHeadingId)
      : '"Be Vietnam Pro", sans-serif';
}

export function POSTER_FONT() {
  return active;
}

/**
 * Trích xuất tên family chính từ chuỗi CSS font-family hoặc font stack.
 * Xử lý chính xác tên font có nhiều từ (e.g. "Be Vietnam Pro", "Playfair Display", "Plus Jakarta Sans")
 * mà không bị cắt cụt do tách theo khoảng trắng.
 */
export function extractPrimaryFontFamily(fontStackOrFamily?: string | null): string {
  if (!fontStackOrFamily) return '';
  const first = fontStackOrFamily.split(',')[0] || '';
  return first.replace(/^['"\s]+|['"\s]+$/g, '').trim();
}

/**
 * Thu thập toàn bộ ký tự (glyphs) thực tế xuất hiện trong state / copy / brandkit.
 * Dùng để nạp chính xác các glyph thực tế khi trình duyệt tải font theo unicode-range.
 */
export function collectGlyphsFromState(s?: any): string {
  if (!s || typeof s !== 'object') return '';
  const set = new Set<string>();
  const addStr = (str?: string | null) => {
    if (!str || typeof str !== 'string') return;
    for (const ch of str) {
      if (ch > ' ') set.add(ch);
    }
  };
  addStr(s.name);
  addStr(s.brand);
  addStr(s.details);
  addStr(s.offer);
  addStr(s.goal);
  if (s.industryFields && typeof s.industryFields === 'object') {
    for (const v of Object.values(s.industryFields)) {
      if (typeof v === 'string') addStr(v);
    }
  }
  if (s.copies && typeof s.copies === 'object') {
    for (const c of Object.values(s.copies) as any[]) {
      if (!c || typeof c !== 'object') continue;
      addStr(c.headline);
      addStr(c.subline);
      addStr(c.caption);
      addStr(c.cta);
      if (Array.isArray(c.points)) {
        for (const p of c.points) addStr(p);
      }
    }
  }
  if (s.brandKit && typeof s.brandKit === 'object') {
    addStr(s.brandKit.name);
    addStr(s.brandKit.slogan);
    if (s.brandKit.contact && typeof s.brandKit.contact === 'object') {
      for (const cv of Object.values(s.brandKit.contact)) {
        if (typeof cv === 'string') addStr(cv);
      }
    }
  }
  return Array.from(set).join('');
}

/**
 * Đảm bảo toàn bộ font, weight và unicode subsets cần thiết cho poster đã được nạp trước khi vẽ canvas.
 *
 * QUAN TRỌNG:
 * Theo chuẩn W3C CSS Font Loading Module Level 3, khi gọi `document.fonts.load(font)` mà KHÔNG truyền tham số `text`,
 * trình duyệt sẽ tải TOÀN BỘ các `@font-face` rules và toàn bộ các unicode slices (latin, latin-ext, vietnamese).
 * Nếu truyền một tập ký tự giới hạn, trình duyệt sẽ chỉ tải các slice chứa ký tự đó, dẫn đến thiếu dấu/ký tự đặc biệt
 * như '·', ':', '&', '-', 'ế', 'ệ', 'ự', 'ớ', 'ợ', 'ấ', 'ể'...
 *
 * Hàm này:
 * 1. Gọi `document.fonts.load(font)` không kèm tham số text để buộc tải toàn bộ các lát cắt (subsets).
 * 2. Nếu có state, thu thập glyph thực tế và gọi thêm `document.fonts.load(font, actualGlyphs)` để bảo đảm mọi ký tự trong nội dung đều đã sẵn sàng.
 * 3. Chờ `Promise.all(loads)` và `document.fonts.ready`.
 */
export async function ensurePosterFontsReady(
  s?: Pick<MarketingState, 'headingFontId' | 'bodyFontId' | 'brandKit'> | MarketingState | null
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  const fontFamilies = new Set<string>();
  fontFamilies.add('Be Vietnam Pro');
  fontFamilies.add('Montserrat');
  fontFamilies.add('Caveat');
  fontFamilies.add('Plus Jakarta Sans');
  fontFamilies.add('Playfair Display');
  fontFamilies.add('Lora');

  if (s?.headingFontId) {
    const fam = extractPrimaryFontFamily(fontFamilyById(s.headingFontId));
    if (fam) fontFamilies.add(fam);
  }
  if (s?.bodyFontId) {
    const fam = extractPrimaryFontFamily(fontFamilyById(s.bodyFontId));
    if (fam) fontFamilies.add(fam);
  }
  if (s?.brandKit?.fontHeadingId) {
    const fam = extractPrimaryFontFamily(fontFamilyById(s.brandKit.fontHeadingId));
    if (fam) fontFamilies.add(fam);
  }
  if (s?.brandKit?.fontBodyId) {
    const fam = extractPrimaryFontFamily(fontFamilyById(s.brandKit.fontBodyId));
    if (fam) fontFamilies.add(fam);
  }

  const weights = ['400', '500', '600', '700', '800', '900'];
  const actualGlyphs = collectGlyphsFromState(s);
  const loads: Promise<unknown>[] = [];

  for (const family of fontFamilies) {
    for (const weight of weights) {
      // 1. Tải toàn bộ font face / subsets (không giới hạn bởi tham số text)
      try {
        loads.push(document.fonts.load(`${weight} 32px "${family}"`).catch(() => []));
      } catch {
        // Safe ignore
      }
      // 2. Nếu có glyphs thực tế, xác nhận rõ ràng với browser
      if (actualGlyphs) {
        try {
          loads.push(document.fonts.load(`${weight} 32px "${family}"`, actualGlyphs).catch(() => []));
        } catch {
          // Safe ignore
        }
      }
    }
    if (family === 'Caveat') {
      try {
        loads.push(document.fonts.load(`italic 700 32px "Caveat"`).catch(() => []));
      } catch {}
      if (actualGlyphs) {
        try {
          loads.push(document.fonts.load(`italic 700 32px "Caveat"`, actualGlyphs).catch(() => []));
        } catch {}
      }
    }
  }

  try {
    await Promise.all(loads);
  } catch {}

  try {
    await document.fonts.ready;
  } catch {}
}

/**
 * Chuẩn hóa các thuộc tính font & context 2D của canvas về giá trị mặc định chuẩn đồ họa.
 *
 * QUAN TRỌNG:
 * Khi thẻ <canvas> được gắn vào DOM, nó thừa hưởng CSS `letter-spacing: -0.006em` từ `body` trong `globals.css`.
 * Trong khi đó, canvas offscreen (`document.createElement('canvas')`) không nằm trong DOM nên có `letter-spacing: normal` (0px).
 * Điều này gây lệch layout và lệch pixel (~37.000 pixels) giữa preview canvas trên màn hình và bản xuất ZIP/PNG.
 *
 * Hàm này chuẩn hóa:
 * 1. CSS style của thẻ canvas: `letterSpacing = 'normal'`, `wordSpacing = 'normal'`.
 * 2. Thuộc tính context 2D: `letterSpacing = '0px'`, `wordSpacing = '0px'`, `fontKerning = 'auto'`,
 *    `textRendering = 'auto'`, `fontStretch = 'normal'`, `fontVariantCaps = 'normal'`, `direction = 'ltr'`.
 */
export function normalizeCanvasContext(
  ctx?: CanvasRenderingContext2D | null,
  canvas?: HTMLCanvasElement | null
): void {
  if (canvas && canvas.style) {
    try {
      canvas.style.letterSpacing = 'normal';
      canvas.style.wordSpacing = 'normal';
      (canvas.style as any).webkitFontSmoothing = 'subpixel-antialiased';
      (canvas.style as any).textRendering = 'geometricPrecision';
    } catch {}
  }
  if (!ctx) return;
  if ('letterSpacing' in ctx) {
    try {
      (ctx as any).letterSpacing = '0px';
    } catch {}
  }
  if ('wordSpacing' in ctx) {
    try {
      (ctx as any).wordSpacing = '0px';
    } catch {}
  }
  if ('fontKerning' in ctx) {
    try {
      (ctx as any).fontKerning = 'normal';
    } catch {}
  }
  if ('textRendering' in ctx) {
    try {
      (ctx as any).textRendering = 'geometricPrecision';
    } catch {}
  }
  if ('fontStretch' in ctx) {
    try {
      (ctx as any).fontStretch = 'normal';
    } catch {}
  }
  if ('fontVariantCaps' in ctx) {
    try {
      (ctx as any).fontVariantCaps = 'normal';
    } catch {}
  }
  if ('direction' in ctx) {
    try {
      ctx.direction = 'ltr';
    } catch {}
  }
}

