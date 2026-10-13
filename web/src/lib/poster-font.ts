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
