export type IndustryId = 'general' | 'recruitment' | 'education' | 'service';
export type AspectRatio = '1:1' | '4:5' | '9:16';
export type PosterKind = 'launch' | 'story' | 'action';
export type LayoutMode = 'full_photo' | 'matrix';
export type OutputLanguage = 'preserve' | 'vi' | 'en';

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

export interface FactItem {
  id: string;
  source_excerpt: string;
  text: string;
  selected: boolean;
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
  categoryId?: string;
  conceptId?: string;
  industryFields?: Record<string,string>;
  templateId?: string;
  name: string;
  goal: string;
  details: string;
  brand: string;
  offer: string;
  image?: string;
  cutout?: string;
  bgUrl?: string;
  mainImageFit?: "cover" | "contain";
  mainImageZoom?: number;
  mainImageX?: number;
  mainImageY?: number;
  backgroundImage?: string;
  backgroundDim?: number;
  backgroundBlur?: number;
  backgroundX?: number;
  backgroundY?: number;
  aspect: AspectRatio;
  theme: ThemeId;
  layoutMode?: LayoutMode;
  selected: PosterKind;
  outputLanguage?: OutputLanguage;
  facts?: FactItem[];
  storyPage?: number;
  storyPerPage?: number;
  copies: Record<PosterKind, CopyItem>;
}

export interface AssetInfo {
  im: HTMLImageElement;
  l: number;
  t: number;
  w: number;
  h: number;
}

