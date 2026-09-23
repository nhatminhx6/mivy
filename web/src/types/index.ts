export type IndustryId = 'general' | 'recruitment' | 'education' | 'service';
export type AspectRatio = '1:1' | '4:5' | '9:16';
export type PosterKind = 'launch' | 'story' | 'action';

export type ThemeId = 'tech_dark' | 'warm_editorial' | 'bold_vibrant' | 'clean_minimal' | 'emerald_pro';

export interface PosterTheme {
  id: ThemeId;
  name: string;
  bg: string;
  bgGrad: [string, string, string];
  glow: string;
  accent: string;
  accentLight: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  cardHighlightBg: string;
  cardHighlightBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  tagBg: string;
  tagText: string;
}

export interface CopyItem {
  headline: string;
  subline: string;
  cta: string;
  caption: string;
  points?: string[];
  pointsEdited?: boolean;
}

export interface MarketingState {
  industry: IndustryId;
  name: string;
  goal: string;
  details: string;
  brand: string;
  offer: string;
  image?: string;
  cutout?: string;
  bgUrl?: string;
  aspect: AspectRatio;
  theme: ThemeId;
  selected: PosterKind;
  copies: Record<PosterKind, CopyItem>;
}

export interface AssetInfo {
  im: HTMLImageElement;
  l: number;
  t: number;
  w: number;
  h: number;
}
