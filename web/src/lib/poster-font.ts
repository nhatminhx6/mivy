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
 * Đảm bảo toàn bộ font và weight cần thiết cho poster đã được nạp trước khi vẽ canvas.
 * Ngăn chặn browser canvas vẽ bằng font fallback tạm thời trên cold load, gây lệch layout
 * và lệch pixel giữa preview và export ZIP.
 */
export async function ensurePosterFontsReady(
  s?: Pick<MarketingState, 'headingFontId' | 'bodyFontId' | 'brandKit'> | null
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  const fontFamilies = new Set<string>();
  fontFamilies.add('Be Vietnam Pro');
  fontFamilies.add('Montserrat');
  fontFamilies.add('Caveat');

  if (s?.headingFontId) {
    const raw = fontFamilyById(s.headingFontId);
    const cleaned = raw.replace(/['",]/g, ' ').trim().split(/\s+/)[0];
    if (cleaned) fontFamilies.add(cleaned);
  }
  if (s?.bodyFontId) {
    const raw = fontFamilyById(s.bodyFontId);
    const cleaned = raw.replace(/['",]/g, ' ').trim().split(/\s+/)[0];
    if (cleaned) fontFamilies.add(cleaned);
  }
  if (s?.brandKit?.fontHeadingId) {
    const raw = fontFamilyById(s.brandKit.fontHeadingId);
    const cleaned = raw.replace(/['",]/g, ' ').trim().split(/\s+/)[0];
    if (cleaned) fontFamilies.add(cleaned);
  }
  if (s?.brandKit?.fontBodyId) {
    const raw = fontFamilyById(s.brandKit.fontBodyId);
    const cleaned = raw.replace(/['",]/g, ' ').trim().split(/\s+/)[0];
    if (cleaned) fontFamilies.add(cleaned);
  }

  const weights = ['400', '500', '600', '700', '800', '900'];
  const testChars = 'MIVY0123456789AaBbCcDdEeGgHhIiKkLlMmNnOoPpQqRrSsTtUuVvXxYyZzÁáÀàẢảÃãẠạÂâĂăĐđÉéÈèÊêÍíÌìÓóÒòÔôƠơÚúÙùƯưÝý';
  const loads: Promise<unknown>[] = [];

  for (const family of fontFamilies) {
    for (const weight of weights) {
      try {
        loads.push(document.fonts.load(`${weight} 32px "${family}"`, testChars).catch(() => []));
      } catch {
        // Safe ignore
      }
    }
    if (family === 'Caveat') {
      try {
        loads.push(document.fonts.load(`italic 700 32px "Caveat"`, testChars).catch(() => []));
      } catch {
        // Safe ignore
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
