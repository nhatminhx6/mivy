'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Download, Copy, FileText, RefreshCw, Upload, Check, Layers, Image as ImageIcon, Maximize2, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { AssetInfo, AspectRatio, IndustryId, MarketingState, PosterKind, ThemeId, OutputLanguage, FactItem } from '@/types';
import { POSTER_THEMES, drawIndustryPoster, ensurePosterFontsReady } from '@/lib/design-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { balancedPages, resolveStorySource, clampStoryPageInState, normalizePointList } from '@/lib/balanced-pages';
import { IndustryForm } from '@/components/marketing/IndustryForm';
import { makeIndustryCopy } from '@/lib/industry-concepts';
import { STICKER_PRESETS, getPreset } from '@/lib/sticker-engine';
import { SEASON_PRESETS } from '@/lib/season-engine';
import { SEASON_VARIANTS } from '@/lib/season-decor';
import { FONT_PRESETS } from '@/lib/brand-presets';
import { StickerCorner } from '@/types';
import { TemplateLibrary } from '@/components/marketing/TemplateLibrary';
import { CATEGORIES, TEMPLATES } from '@/lib/template-catalog';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import { loadBrand } from '@/lib/brand-presets';
import { DraftController } from '@/lib/draft-controller';
import { PageHeader } from '@/components/PageHeader';
import { COPY_TONES, COPY_INDUSTRIES, suggestPosterCopy, CopyTone } from '@/lib/copy-library';
import { TemplateHtmlPreview, TemplateHtmlPreviewHandle } from '@/components/TemplateHtmlPreview';
import { AD_SKINS, AdContent } from '@/lib/ad-skins';
import { buildAdTemplate, AD_SKIN_CSS } from '@/lib/ad-poster';

// skin groups cho băng chọn phong cách
const SKIN_GROUPS = Array.from(new Set(AD_SKINS.map((s) => s.group)));

// Nền gen sẵn ĐÚNG NỘI DUNG theo từng ngành (offline, 1 lần) — chọn tức thì, không gọi AI mỗi lần.
// Danh sách ảnh THỰC TẾ đã gen theo từng ngành (gen sẵn offline, không gọi AI mỗi lần).
const BG_FILES: Record<string, string[]> = {
  recruitment: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  education: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  event: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  food: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  beauty: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  property: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  travel: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  retail: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  fitness: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  technology: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  personal: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  service: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
};
const INDUSTRY_BACKGROUNDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BG_FILES).map(([k, arr]) => [k, arr.map((s) => `/backgrounds/${k}/${s}.jpg`)])
);
const bgsFor = (categoryId?: string): string[] =>
  INDUSTRY_BACKGROUNDS[categoryId || 'retail'] || INDUSTRY_BACKGROUNDS.retail;

const DEFAULT_MARKETING: MarketingState = {
  industry: 'recruitment',
  categoryId: 'recruitment',
  bgUrl: '/backgrounds/recruitment/a.jpg',
  name: 'Lead Fullstack Developer',
  goal: 'recruitment',
  details: '5+ năm kinh nghiệm kiến trúc hệ thống lớn\nLương 25 - 35 triệu + Thưởng dự án KPI\nLàm việc TP.HCM · Hybrid\nThành thạo ReactJS, Node.js, Python, PostgreSQL\nEmail: tuyendung@mivy.vn',
  brand: 'Mivy Tech',
  offer: 'Lương 25 - 35 triệu',
  aspect: '4:5',
  theme: 'tech_dark',
  layoutMode: 'full_photo',
  selected: 'launch',
  outputLanguage: 'preserve',
  storyPage: 0,
  storyPerPage: 3,
  facts: [],
  copies: {
    launch: {
      headline: 'Fullstack Developer',
      subline: 'Gia nhập đội ngũ sản phẩm công nghệ cao',
      cta: 'Send your CV',
      caption: '🚀 MIVY TECH ĐANG TÌM KIẾM LEAD FULLSTACK DEVELOPER\n\n📌 Đãi ngộ: Lương 25 - 35 Triệu + Thưởng KPI\n📌 Địa điểm: TP.HCM · Chế độ Hybrid linh hoạt\n\nỨng tuyển ngay qua email: tuyendung@mivy.vn',
    },
    story: {
      headline: 'Yêu Cầu Chuyên Môn & Kỹ Năng',
      subline: 'Tiêu chuẩn kỹ thuật cho core member',
      cta: 'Tìm hiểu thêm',
      caption: '🎯 TIÊU CHÍ ỨNG VIÊN LEAD DEVELOPER\n\n1. 5+ năm kinh nghiệm thực chiến production\n2. Làm chủ ReactJS, Node, Python & Database\n3. Kỹ năng tư duy kiến trúc và dẫn dắt team',
      points: [
        '5+ năm kinh nghiệm với hệ thống high-traffic.',
        'Thành thạo ReactJS, TypeScript và Node / Python backend.',
        'Tư duy Clean Code, Microservices và tối ưu hiệu năng.',
      ],
    },
    action: {
      headline: 'Quy Trình Tuyển Dụng Nhanh Gọn',
      subline: '3 bước kết nối và nhận offer',
      cta: 'Gửi CV Ngay Hôm Nay',
      caption: '📬 KẾT NỐI VÀ ỨNG TUYỂN CÙNG CHÚNG EM\n\n- Vòng 1: Gửi CV & Portfolio\n- Vòng 2: Phỏng vấn kỹ thuật cùng Tech Lead\n- Vòng 3: Nhận Offer và onboard\n\nHotline/Zalo: 0907124244',
      points: [
        'Vòng 1: Gửi CV & Portfolio dự án.',
        'Vòng 2: Trao đổi kỹ thuật cùng Tech Lead.',
        'Vòng 3: Thống nhất đãi ngộ và onboard.',
      ],
    },
  },
};

export default function MarketingStudioPage() {
  const [state, setState] = useState<MarketingState>(DEFAULT_MARKETING);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [step, setStep] = useState(1); // 1 chọn ngành · 2 nội dung · 3 xem & tải
  const [devFill, setDevFill] = useState(true); // DEV: tự điền nội dung mẫu, tắt để nhập tay
  const [copied, setCopied] = useState(false);
  const [previewKind, setPreviewKind] = useState<PosterKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [copyTone, setCopyTone] = useState<CopyTone>('sale');
  const [copyIndustry, setCopyIndustry] = useState('chung');
  const [copyIdx, setCopyIdx] = useState(0);
  const [htmlStyleId, setHtmlStyleId] = useState<string>(''); // '' = dùng canvas như cũ; id = render mẫu HTML mới
  const [styleGroup, setStyleGroup] = useState<string>('Tất cả');
  const [seasonVariant, setSeasonVariant] = useState<string>('ribbon'); // kiểu trang trí dịp cho skin
  const [editTab, setEditTab] = useState<'content' | 'design'>('content'); // tab cột trái
  const htmlPreviewRef = useRef<TemplateHtmlPreviewHandle | null>(null);

  const canvasLaunchRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStoryRef = useRef<HTMLCanvasElement | null>(null);
  const canvasActionRef = useRef<HTMLCanvasElement | null>(null);

  const assetRef = useRef<AssetInfo | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const openPreview = (kind: PosterKind) => {
    const canvasMap: Record<PosterKind, HTMLCanvasElement | null> = {
      launch: canvasLaunchRef.current,
      story: canvasStoryRef.current,
      action: canvasActionRef.current,
    };
    const c = canvasMap[kind];
    if (c) {
      setPreviewUrl(c.toDataURL('image/png'));
    }
    setPreviewKind(kind);
  };

  const handlePrevPreview = () => {
    if (!previewKind) return;
    const order: PosterKind[] = ['launch', 'story', 'action'];
    const curIdx = order.indexOf(previewKind);
    const prevIdx = (curIdx - 1 + order.length) % order.length;
    openPreview(order[prevIdx]);
  };

  const handleNextPreview = () => {
    if (!previewKind) return;
    const order: PosterKind[] = ['launch', 'story', 'action'];
    const curIdx = order.indexOf(previewKind);
    const nextIdx = (curIdx + 1) % order.length;
    openPreview(order[nextIdx]);
  };

  useEffect(() => {
    if (!previewKind) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewKind(null);
      if (e.key === 'ArrowLeft') handlePrevPreview();
      if (e.key === 'ArrowRight') handleNextPreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewKind]);

  // Khởi tạo shared production controller quản lý persistence và concurrency
  const controllerRef = useRef<DraftController | null>(null);
  const getController = () => {
    if (!controllerRef.current || controllerRef.current.isDisposed) {
      controllerRef.current = new DraftController({
        initialState: state,
        onStateChange: (next) => setState(next),
        onStatusText: (text) => setStatusText(text),
      });
    }
    return controllerRef.current;
  };

  // Mỗi lần tải trang là BẮT ĐẦU MỚI (không nhớ phiên cũ) — chỉ nạp Brand Kit.
  useEffect(() => {
    const controller = getController();
    const b = loadBrand();
    if (b) {
      controller.setBrandKit(b);
    }
    return () => {
      controller.dispose();
    };
  }, []);

  // Save state on change
  // Gợi ý copy cho poster chính (launch) — offline, 0 AI
  const suggestPoster = () => {
    const next = copyIdx + 1; setCopyIdx(next);
    const s = suggestPosterCopy(copyIndustry, copyTone, next);
    saveState({ ...state, copies: { ...state.copies, launch: { ...state.copies.launch, headline: s.headline, subline: s.subline, cta: s.cta } } });
  };

  const saveState = (newState: MarketingState) => {
    getController().saveState(clampStoryPageInState(newState));
  };

  const changeCategory = (categoryId: string) => {
    getController().changeCategory(categoryId);
  };

  // DEV: điền sẵn toàn bộ nội dung mẫu cho ngành đang chọn
  const EMPTY_COPY = { headline: '', subline: '', cta: '', caption: '', points: [] };
  const catOf = (s: MarketingState) => s.categoryId || (s.industry === 'general' ? 'retail' : s.industry);
  const applySample = (base: MarketingState) => {
    const smp = CATEGORY_SAMPLES[catOf(base)];
    if (!smp) return base;
    return { ...base, name: smp.name, brand: smp.brand, offer: smp.offer, details: smp.details, goal: smp.goal, copies: smp.copies, industryFields: smp.fields ? { ...smp.fields } : {} };
  };
  const clearSample = (base: MarketingState) => ({
    ...base, name: '', offer: '', details: '', industryFields: {},
    copies: { launch: { ...EMPTY_COPY }, story: { ...EMPTY_COPY }, action: { ...EMPTY_COPY } },
  });
  // Sticker sale: chọn preset / sửa chữ / đổi góc
  const setStickerPreset = (presetId: string) => {
    if (presetId === 'none') { saveState({ ...state, sticker: { preset: 'none', text: '', corner: state.sticker?.corner || 'tr' } }); return; }
    const p = getPreset(presetId);
    saveState({ ...state, sticker: { preset: presetId, text: p?.defaultText || '', corner: state.sticker?.corner || 'tr' } });
  };
  const setStickerText = (text: string) => saveState({ ...state, sticker: { preset: state.sticker?.preset || 'none', text, corner: state.sticker?.corner || 'tr' } });
  const setStickerCorner = (corner: StickerCorner) => saveState({ ...state, sticker: { preset: state.sticker?.preset || 'none', text: state.sticker?.text || '', corner } });
  const setSeason = (seasonId: string) => saveState({ ...state, season: seasonId });
  const setFont = (id: string) => saveState({ ...state, headingFontId: id === 'default' ? undefined : id, bodyFontId: id === 'default' ? undefined : id });
  const setBorder = (v: number) => saveState({ ...state, borderWidth: v });
  const setRadius = (v: number) => saveState({ ...state, borderRadius: v });
  const setBorderColor = (c?: string) => saveState({ ...state, borderColor: c });

  const toggleDevFill = () => {
    const next = !devFill;
    setDevFill(next);
    saveState(next ? applySample(state) : clearSample(state));
  };

  // Vào bước 2 hoặc đổi ngành: nếu bật DEV fill và form còn trống thì tự điền mẫu
  useEffect(() => {
    if (!devFill || step !== 2) return;
    if (!state.name && CATEGORY_SAMPLES[catOf(state)]) {
      saveState(applySample(state));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.categoryId, devFill]);

  // Helper to load asset (image uploaded)
  const loadAsset = async (url: string): Promise<AssetInfo | null> => {
    if (!url) return null;
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = im.width;
          c.height = im.height;
          const ctx = c.getContext('2d');
          if (!ctx) {
            resolve({ im, l: 0, t: 0, w: im.width, h: im.height });
            return;
          }
          ctx.drawImage(im, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          let l = c.width, t = c.height, r = 0, b = 0;
          for (let y = 0; y < c.height; y++) {
            for (let z = 0; z < c.width; z++) {
              if (d[(y * c.width + z) * 4 + 3] > 8) {
                l = Math.min(l, z);
                r = Math.max(r, z);
                t = Math.min(t, y);
                b = Math.max(b, y);
              }
            }
          }
          if (r >= l && b >= t) {
            resolve({ im, l, t, w: r - l + 1, h: b - t + 1 });
          } else {
            resolve({ im, l: 0, t: 0, w: im.width, h: im.height });
          }
        } catch (e) {
          resolve({ im, l: 0, t: 0, w: im.width, h: im.height });
        }
      };
      im.onerror = () => resolve(null);
      im.src = url;
    });
  };

  // Helper to load background image
  const loadBgImg = async (url: string): Promise<HTMLImageElement | null> => {
    if (!url) return null;
    return new Promise((resolve) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
  };

  const renderVersion = useRef(0);

  // Render all 3 canvases
  const renderAllCanvases = async () => {
    const version = ++renderVersion.current;
    await ensurePosterFontsReady(state);
    const assetUrl = state.cutout || state.image || '';
    const [asset, bgImg, logoImg] = await Promise.all([
      loadAsset(assetUrl),
      loadBgImg(state.backgroundImage || state.bgUrl || ''),
      loadBgImg(state.brandKit?.logo || ''),
    ]);
    if (version !== renderVersion.current) return;
    assetRef.current = asset;
    bgImgRef.current = bgImg;

    if (canvasLaunchRef.current) {
      drawIndustryPoster(canvasLaunchRef.current, state, 'launch', state.copies.launch, asset, bgImg, logoImg);
    }
    if (canvasStoryRef.current) {
      drawIndustryPoster(canvasStoryRef.current, state, 'story', state.copies.story, asset, bgImg, logoImg);
    }
    if (canvasActionRef.current) {
      drawIndustryPoster(canvasActionRef.current, state, 'action', state.copies.action, asset, bgImg, logoImg);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let active = true;
    const onFontReady = () => {
      if (active) renderAllCanvases();
    };
    document.fonts.ready.then(onFontReady);
    if ('addEventListener' in document.fonts) {
      document.fonts.addEventListener('loadingdone', onFontReady);
      return () => {
        active = false;
        document.fonts.removeEventListener('loadingdone', onFontReady);
      };
    }
    return () => {
      active = false;
    };
  }, []);

  const [factsExpanded, setFactsExpanded] = useState(false);

  // Helper to extract facts from details
  const extractFactsFromDetails = (details: string, offer?: string): FactItem[] => {
    const facts: FactItem[] = [];
    const seen = new Set<string>();
    const lines = (details || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const clean = line.replace(/^[\s\-\*\•\d\.\+\)]+/, '').trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        facts.push({
          id: `fact_${facts.length + 1}`,
          source_excerpt: line,
          text: clean,
          selected: true,
        });
      }
    }
    if (offer && offer.trim()) {
      const off = offer.trim();
      if (!seen.has(off.toLowerCase())) {
        seen.add(off.toLowerCase());
        facts.push({
          id: `fact_${facts.length + 1}`,
          source_excerpt: offer,
          text: `Đãi ngộ: ${off}`,
          selected: true,
        });
      }
    }
    return facts;
  };

  const currentFacts: FactItem[] = state.facts && state.facts.length > 0
    ? state.facts
    : extractFactsFromDetails(state.details, state.offer);

  const checkFactInPoster = (factText: string): boolean => {
    if (!factText) return false;
    const clean = factText.toLowerCase();
    const resolvedStoryPts = resolveStorySource(state, state.copies.story).items;
    const searchCorpus = [
      state.copies.launch.headline,
      state.copies.launch.subline,
      ...(state.copies.launch.points || []),
      state.copies.launch.caption,
      state.copies.story.headline,
      state.copies.story.subline,
      ...resolvedStoryPts,
      state.copies.story.caption,
      state.copies.action.headline,
      state.copies.action.subline,
      ...(state.copies.action.points || []),
      state.copies.action.caption,
    ].join(' ').toLowerCase();

    if (searchCorpus.includes(clean)) return true;
    const keywords = clean.split(/\s+/).filter((w) => w.length >= 4);
    if (keywords.length > 0) {
      const matchCount = keywords.filter((kw) => searchCorpus.includes(kw)).length;
      return matchCount >= Math.min(2, keywords.length);
    }
    return false;
  };

  const handleToggleFact = (idx: number, checked: boolean) => {
    const updated = [...currentFacts];
    updated[idx] = { ...updated[idx], selected: checked };
    saveState({ ...state, facts: updated });
  };

  const handleEditFactText = (idx: number, newText: string) => {
    const updated = [...currentFacts];
    updated[idx] = { ...updated[idx], text: newText };
    saveState({ ...state, facts: updated });
  };

  const handleSyncFactsToStory = () => {
    const selectedPoints = currentFacts.filter((f) => f.selected).map((f) => f.text);
    if (selectedPoints.length === 0) return;
    const updatedCopies = { ...state.copies };
    updatedCopies.story = {
      ...updatedCopies.story,
      points: selectedPoints,
      pointsEdited: true,
    };
    saveState({ ...state, copies: updatedCopies, storyPage: 0, facts: currentFacts });
  };

  // Trigger render on visual state changes (step: vẽ lại khi canvas vừa mount ở bước 3)
  useEffect(() => {
    renderAllCanvases();
  }, [step, state.selected, state.conceptId, state.industryFields, state.mainImageFit, state.mainImageZoom, state.mainImageX, state.mainImageY, state.backgroundImage, state.backgroundDim, state.backgroundBlur, state.backgroundX, state.backgroundY, state.templateId, state.categoryId, state.brand, state.offer, state.details, state.facts, state.storyPerPage, state.theme, state.aspect, state.copies, state.image, state.cutout, state.bgUrl, state.industry, state.layoutMode, state.storyPage, state.outputLanguage, state.brandKit, state.sticker, state.season, state.headingFontId, state.bodyFontId, state.borderWidth, state.borderRadius, state.borderColor]);

  // Dựng nội dung 100% bằng CODE từ data có sẵn — KHÔNG gọi AI realtime (đúng kiến trúc Mivy).
  // Trả về state đã có copies + nền mặc định. Dùng chung cho nút "Tiếp" (bước 1) và "Tạo lại" (bước 2).
  const buildContentState = (): MarketingState => {
    const cat = catOf(state);
    const facts = state.facts && state.facts.length > 0
      ? state.facts
      : extractFactsFromDetails(state.details, state.offer);

    // Copies: ưu tiên nội dung sẵn có (mẫu/đã sửa tay). Nếu trống → dựng local từ field ngành / name-offer-details.
    let copies = state.copies;
    if (!copies?.launch?.headline) {
      const auto = makeIndustryCopy(cat, state.industryFields || {});
      const base = auto.headline ? auto : {
        headline: state.name || state.brand || 'Tiêu đề của anh',
        subline: state.offer || '',
        cta: 'Liên hệ ngay',
        caption: state.details || '',
        points: (state.details || '').split(/\r?\n|\r/).map((s) => s.trim()).filter(Boolean).slice(0, 3),
      };
      copies = { launch: { ...base }, story: { ...base }, action: { ...base } };
    }

    const updatedState: MarketingState = { ...state, facts, storyPage: 0, copies };

    // Nền dùng template có sẵn. Chưa chọn nền nào thì gán mặc định của ngành.
    if (!state.image && !state.backgroundImage && !state.bgUrl) {
      updatedState.bgUrl = bgsFor(cat)[0] || '/backgrounds/recruitment/a.jpg';
    }
    return updatedState;
  };

  // Bước 1 → bước 2 (gộp): dựng sẵn nội dung + nền để preview không trống/đen.
  const goToCompose = () => {
    saveState(buildContentState());
    setStep(2);
  };

  // Handle Form Submission (dựng lại nội dung)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setStatusText('Đang dựng nội dung…');

    try {
      saveState(buildContentState());
      setStatusText('');
      setStep(2); // đang ở bước gộp — giữ nguyên
    } catch (err: any) {
      alert(err.message || 'Chưa dựng được nội dung. Anh thử lại nhé.');
    } finally {
      setIsGenerating(false);
      setStatusText('');
    }
  };

  // Handle Visual AI Refresh
  // Đổi nền = xoay vòng qua ảnh có sẵn CỦA NGÀNH hiện tại (không gọi AI).
  const handleRefreshBg = () => {
    const bgs = bgsFor(state.categoryId);
    const cur = bgs.indexOf(state.bgUrl || '');
    const next = bgs[(cur + 1) % bgs.length] || bgs[0];
    saveState({ ...state, bgUrl: next, backgroundImage: '', templateId: state.templateId || 'editorial' });
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      saveState({ ...state, image: url, cutout: '', mainImageZoom:100, mainImageX:50, mainImageY:50, templateId: state.templateId || 'editorial' });
    };
    reader.readAsDataURL(file);
  };

  const prepareExport = async () => {
    const snapshot = structuredClone(state);
    const storySource = typeof balancedPages !== 'undefined' && (balancedPages as any).snapshotStory
      ? (balancedPages as any).snapshotStory(snapshot)
      : null;
    await (typeof ensurePosterFontsReady !== 'undefined' ? ensurePosterFontsReady(snapshot) : document.fonts.ready);
    const assetUrl = snapshot.cutout || snapshot.image || '';
    const bgUrl = snapshot.backgroundImage || snapshot.bgUrl || '';
    const [asset, bgImg, logoImg] = await Promise.all([
      loadAsset(assetUrl),
      loadBgImg(bgUrl),
      loadBgImg(snapshot.brandKit?.logo || ''),
    ]);
    if (assetUrl && !asset) throw new Error('Không thể tải ảnh chính. Vui lòng kiểm tra lại.');
    if (bgUrl && !bgImg) throw new Error('Không thể tải ảnh nền. Vui lòng kiểm tra lại.');

    const draw = (kind: PosterKind, page: number = 0, aspect: AspectRatio = snapshot.aspect) => {
      const c = document.createElement('canvas');
      drawIndustryPoster(c, { ...snapshot, aspect, storyPage: page }, kind, snapshot.copies[kind], asset, bgImg, logoImg, 2);
      return c;
    };
    return { snapshot, storySource, asset, bgImg, draw };
  };

  // Khổ xuất cho từng sàn (tên file dễ nhận biết)
  const EXPORT_SIZES: { aspect: AspectRatio; label: string }[] = [
    { aspect: '4:5', label: 'post-1080x1350' },   // FB/IG feed
    { aspect: '9:16', label: 'story-reels-1080x1920' }, // Story/Reels/TikTok
    { aspect: '1:1', label: 'vuong-1080x1080' },  // Shopee/vuông
  ];

  // #1 Xuất poster đang chọn ở CẢ 3 khổ trong 1 file ZIP
  const handleDownloadAllSizes = async () => {
    try {
      setStatusText('Đang xuất đủ 3 khổ...');
      const { snapshot, storySource, draw } = await prepareExport();
      const targetPage = snapshot.selected === 'story' && storySource ? storySource.pageIndex : (snapshot.storyPage || 0);
      const files = [];
      for (const { aspect, label } of EXPORT_SIZES) {
        const c = draw(snapshot.selected, targetPage, aspect);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r));
        if (!blob) throw new Error(`Lỗi xuất khổ ${aspect}.`);
        files.push({ name: `mivy-${snapshot.selected}-${label}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      files.push({
        name: 'caption.txt',
        data: new TextEncoder().encode(snapshot.copies[snapshot.selected]?.caption || ''),
      });
      const zipBlob = marketingZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mivy-${snapshot.selected}-du-kho.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusText('Đã xuất đủ 3 khổ (post · story · vuông).');
    } catch (err: any) {
      setStatusText(err.message || 'Lỗi xuất đủ khổ.');
    }
  };

  // Download single PNG
  const handleDownloadSingle = async (overrideKind?: PosterKind | React.MouseEvent) => {
    try {
      if (htmlStyleId && htmlPreviewRef.current) {
        setStatusText('Đang xuất mẫu thiết kế...');
        await htmlPreviewRef.current.exportPng();
        setStatusText('Đã tạo PNG và gửi yêu cầu tải xuống.');
        return;
      }
      setStatusText('Đang xử lý ảnh...');
      const { snapshot, storySource, draw } = await prepareExport();
      const kind: PosterKind = (typeof overrideKind === 'string' && (overrideKind === 'launch' || overrideKind === 'story' || overrideKind === 'action'))
        ? overrideKind
        : snapshot.selected;
      const targetPage = kind === 'story' && storySource ? storySource.pageIndex : (snapshot.storyPage || 0);
      const canvas = draw(kind, targetPage);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r));
      if (!blob) throw new Error('Không thể tạo ảnh PNG.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mivy-${kind}-${snapshot.aspect.replace(':', 'x')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusText('Đã tạo PNG và gửi yêu cầu tải xuống.');
    } catch (err: any) {
      setStatusText(err.message || 'Lỗi tải ảnh.');
    }
  };

  // Download all posters + carousel pages in ZIP
  const handleDownloadZip = async () => {
    try {
      setStatusText('Đang tạo bộ ảnh ZIP...');
      const { snapshot, draw } = await prepareExport();
      const files = [];

      // 1. Launch Hero
      const canvasLaunch = draw('launch');
      const blobLaunch = await new Promise<Blob | null>((r) => canvasLaunch.toBlob(r));
      if (!blobLaunch) throw new Error('Lỗi xuất ảnh Hero.');
      files.push({
        name: '01-hero-poster.png',
        data: new Uint8Array(await blobLaunch.arrayBuffer()),
      });
      files.push({
        name: '01-hero-caption.txt',
        data: new TextEncoder().encode(snapshot.copies.launch.caption || ''),
      });

      // 2. Story Carousel
      const allStoryPoints = snapshot.copies.story.points
        ? (balancedPages as any).resolveStorySource(snapshot, snapshot.copies.story).items
        : (balancedPages as any).resolveStorySource(snapshot, snapshot.copies.story).items;
      const storyPerPage = snapshot.storyPerPage || 3;
      const totalStoryPages = (balancedPages as any).resolveStorySource(snapshot, snapshot.copies.story).totalPages;

      for (let p = 0; p < totalStoryPages; p++) {
        const canvasStory = draw('story', p);
        const blobStory = await new Promise<Blob | null>((r) => canvasStory.toBlob(r));
        if (!blobStory) throw new Error(`Lỗi xuất ảnh Story trang ${p + 1}.`);
        const pageSuffix = totalStoryPages > 1 ? `-page${p + 1}` : '';
        files.push({
          name: `02-story${pageSuffix}-poster.png`,
          data: new Uint8Array(await blobStory.arrayBuffer()),
        });
      }
      files.push({
        name: '02-story-caption.txt',
        data: new TextEncoder().encode(snapshot.copies.story.caption || ''),
      });

      // 3. Action Poster
      const canvasAction = draw('action');
      const blobAction = await new Promise<Blob | null>((r) => canvasAction.toBlob(r));
      if (!blobAction) throw new Error('Lỗi xuất ảnh Action.');
      files.push({
        name: '03-action-poster.png',
        data: new Uint8Array(await blobAction.arrayBuffer()),
      });
      files.push({
        name: '03-action-caption.txt',
        data: new TextEncoder().encode(snapshot.copies.action.caption || ''),
      });

      // 4. Manifest.json and Source.txt
      const totalFacts = (snapshot.facts && snapshot.facts.length > 0)
        ? snapshot.facts.length
        : extractFactsFromDetails(snapshot.details, snapshot.offer).length;

      const manifest = {
        industry: snapshot.industry,
        output_language: snapshot.outputLanguage || 'preserve',
        aspect: snapshot.aspect,
        total_facts: totalFacts,
        story_carousel_pages: totalStoryPages,
        created_at: new Date().toISOString(),
      };
      files.push({
        name: 'manifest.json',
        data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      });

      const sourceContent = `VỊ TRÍ: ${snapshot.name}\nTHƯƠNG HIỆU: ${snapshot.brand}\nĐÃI NGỘ: ${snapshot.offer}\nNGÔN NGỮ: ${snapshot.outputLanguage || 'preserve'}\n\nNỘI DUNG NGUỒN:\n${snapshot.details}`;
      files.push({
        name: 'source.txt',
        data: new TextEncoder().encode(sourceContent),
      });

      const zipBlob = marketingZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mivy-marketing-pack-${snapshot.aspect.replace(':', 'x')}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusText('Đã tạo ZIP và gửi yêu cầu tải xuống.');
    } catch (err: any) {
      setStatusText(err.message || 'Lỗi kết xuất ZIP.');
    }
  };

  // Copy caption
  const handleCopyCaption = async () => {
    const text = state.copies[state.selected]?.caption || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const currentCopy = state.copies[state.selected];
  const adContent: AdContent = {
    eyebrow: state.offer || currentCopy?.cta ? (state.offer || '') : '',
    headline: currentCopy?.headline,
    subhead: currentCopy?.subline,
    cta: currentCopy?.cta,
    points: currentCopy?.points,
    brand: state.brand,
    image: state.image || state.cutout || state.bgUrl,
  };
  const activeHtmlTemplate = htmlStyleId ? buildAdTemplate(adContent, htmlStyleId, state.season, seasonVariant) : null;
  const styleList = styleGroup === 'Tất cả' ? AD_SKINS : AD_SKINS.filter((s) => s.group === styleGroup);
  const posterNames: Record<PosterKind, string> = {
    launch: '1. Poster Chính (Hero)',
    story: '2. Tiêu Chí (Story)',
    action: '3. Kết Nối & CV (Action)',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Tạo quảng cáo"
        sub="Chọn ngành → điền nội dung → xuất poster/banner đúng khổ mọi sàn. Lấy màu & font từ Brand Kit."
      />

      <div className="space-y-8">
      {/* Stepper 3 bước */}
      <div className="mv-seg w-full mv-fade">
        {[{ n: 1, t: 'Chọn ngành & mẫu' }, { n: 2, t: 'Soạn & tải' }].map((s) => (
          <button key={s.n} type="button" onClick={() => setStep(s.n)}
            data-active={step === s.n}
            className="mv-seg-btn flex-1 flex items-center justify-center gap-2 !py-2.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === s.n ? 'bg-indigo-500 text-white' : 'bg-white/10'}`}>{s.n}</span>
            <span className="hidden sm:inline">{s.t}</span>
          </button>
        ))}
      </div>

      {/* Bước 2 (gộp): TRÁI = soạn nội dung + tuỳ chỉnh (cuộn), PHẢI = preview GHIM */}
      {step === 2 && (
      <div className="max-w-5xl mx-auto space-y-5">
        <style dangerouslySetInnerHTML={{ __html: AD_SKIN_CSS }} />

        {/* ===== BĂNG CHỌN PHONG CÁCH (skin nghệ thuật khoác lên poster ngành) ===== */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-white">Phong cách thiết kế</h3>
              <p className="text-[11px] text-slate-400">Khoác vibe nghệ thuật lên poster — nội dung anh điền giữ nguyên. &ldquo;Mặc định&rdquo; = bản canvas (xuất đủ 3 khổ).</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setStyleGroup('Tất cả')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${styleGroup === 'Tất cả' ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>Tất cả</button>
              {SKIN_GROUPS.map((g) => (
                <button key={g} type="button" onClick={() => setStyleGroup(g)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${styleGroup === g ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            <button type="button" onClick={() => setHtmlStyleId('')}
              className={`shrink-0 w-[72px] h-[90px] rounded-lg border grid place-items-center text-[10px] font-semibold text-center leading-tight transition-colors ${!htmlStyleId ? 'border-indigo-500 bg-indigo-500/15 text-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>
              Mặc định<br />(canvas)
            </button>
            {styleList.map((s) => {
              const tpl = buildAdTemplate(adContent, s.id, state.season, seasonVariant)!;
              const w = 72; const sc = w / tpl.w;
              return (
                <button key={s.id} type="button" onClick={() => setHtmlStyleId(s.id)} title={s.name}
                  className={`shrink-0 rounded-lg overflow-hidden border bg-black/40 relative transition-colors ${htmlStyleId === s.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'}`}
                  style={{ width: w, height: Math.round(tpl.h * sc) }}>
                  <div style={{ width: tpl.w, height: tpl.h, transform: `scale(${sc})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: tpl.html }} />
                </button>
              );
            })}
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 items-start">
        {/* CỘT PHẢI (order-2): preview ghim — vừa khít 1 màn, không cuộn riêng */}
        <div className="lg:sticky lg:top-4 self-start space-y-3 lg:order-2 lg:max-h-[calc(100vh-7.5rem)]">
          {/* THANH TẢI — trên cùng, nổi bật */}
          <div className="glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400">Đang chỉnh sửa</span>
                <h3 className="text-sm font-bold text-white leading-tight">{posterNames[state.selected]}</h3>
              </div>
              <span className="text-[10px] font-semibold text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 rounded-full">PNG · 1080px</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSingle}
              className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh PNG</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadAllSizes}
                title="Xuất ảnh đang chọn ở cả 3 khổ: Post 1080×1350 · Story/Reels 1080×1920 · Vuông 1080×1080"
                className="mv-btn mv-btn-ghost !flex justify-center !px-3 !py-2 !text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải đủ 3 khổ</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                className="mv-btn mv-btn-ghost !flex justify-center !px-3 !py-2 !text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải cả bộ ZIP</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-3 border border-white/10 space-y-2.5">
            {/* Poster đang chọn — TO, lấp đầy cột */}
            <div
              onClick={() => { if (!activeHtmlTemplate) openPreview(state.selected); }}
              className="group relative rounded-xl overflow-hidden cursor-pointer bg-black/60 !border-indigo-500 ring-1 ring-indigo-500/40 border"
              title="Bấm để phóng to"
            >
              {activeHtmlTemplate && (
                <div className="py-2">
                  <TemplateHtmlPreview ref={htmlPreviewRef} template={activeHtmlTemplate} content={{}} noFill maxHeightVh={42} />
                </div>
              )}
              <canvas
                ref={state.selected === 'launch' ? canvasLaunchRef : state.selected === 'story' ? canvasStoryRef : canvasActionRef}
                style={{
                  letterSpacing: 'normal',
                  wordSpacing: 'normal',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  textRendering: 'geometricPrecision',
                }}
                className={`w-full h-auto max-h-[40vh] object-contain block mx-auto ${activeHtmlTemplate ? 'hidden' : ''}`}
              />
              {!activeHtmlTemplate && (
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-6 h-6" />
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 text-[11px] font-bold text-white bg-black/65 px-2 py-0.5 rounded">{activeHtmlTemplate ? activeHtmlTemplate.title : posterNames[state.selected]}</span>
            </div>
            {/* 2 poster còn lại — hàng thumbnail ngang để đổi */}
            <div className="grid grid-cols-2 gap-2.5">
              {(['launch', 'story', 'action'] as PosterKind[]).filter((k) => k !== state.selected).map((kind) => (
                <div
                  key={kind}
                  onClick={() => saveState({ ...state, selected: kind })}
                  className="group relative rounded-lg overflow-hidden cursor-pointer bg-black/60 border border-white/10 hover:border-white/30"
                  title="Bấm để chọn poster này"
                >
                  <canvas
                    ref={kind === 'launch' ? canvasLaunchRef : kind === 'story' ? canvasStoryRef : canvasActionRef}
                    style={{
                      letterSpacing: 'normal',
                      wordSpacing: 'normal',
                      WebkitFontSmoothing: 'subpixel-antialiased',
                      textRendering: 'geometricPrecision',
                    }}
                    className="w-full h-auto max-h-[11vh] object-contain block mx-auto"
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/65 px-1.5 py-0.5 rounded">{posterNames[kind].split('.')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel phân trang — chỉ Story */}
          {state.selected === 'story' && (() => {
              const storyResolved = resolveStorySource(state, state.copies.story);
              const totalStoryPoints = storyResolved.items.length;
              const totalStoryPages = storyResolved.totalPages;
              const currentStoryPage = storyResolved.pageIndex;
              if (totalStoryPages <= 1) return null;
              return (
                <div className="glass-card flex items-center justify-between !p-3 !rounded-xl hover:!transform-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Carousel Phân Trang:</span>
                    <span className="text-xs text-slate-300">
                      Trang {currentStoryPage + 1} / {totalStoryPages} · ({totalStoryPoints} yêu cầu chuyên môn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentStoryPage <= 0}
                      onClick={() => saveState({ ...state, storyPage: Math.max(0, currentStoryPage - 1) })}
                      className="mv-btn mv-btn-ghost !p-1.5 disabled:opacity-40"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-white px-2">
                      {currentStoryPage + 1} / {totalStoryPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentStoryPage >= totalStoryPages - 1}
                      onClick={() => saveState({ ...state, storyPage: Math.min(totalStoryPages - 1, currentStoryPage + 1) })}
                      className="mv-btn mv-btn-ghost !p-1.5 disabled:opacity-40"
                      title="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* CỘT TRÁI (order-1): tool (cuộn bình thường) */}
        <div className="space-y-6 min-w-0 lg:order-1">
          {/* Tinh chỉnh hiển thị */}
      <div className="glass-card p-6 rounded-2xl space-y-5 hover:!transform-none mv-fade">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="mv-h1 !text-xl">Tuỳ chỉnh &amp; Tải poster</h1>
            <p className="mv-sub !mt-0.5 !text-xs">Chỉnh kiểu, chữ, khung, trang trí — preview cập nhật ngay.</p>
          </div>
          <a href="/studio/marketing/review" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs">
            Xem bộ mẫu kiểm tra
          </a>
        </div>

        {/* Tab chuyển nhóm cho gọn */}
        <div className="mv-seg w-full">
          <button type="button" onClick={() => setEditTab('content')} data-active={editTab === 'content'} className="mv-seg-btn flex-1 !justify-center !text-xs">📝 Nội dung</button>
          <button type="button" onClick={() => setEditTab('design')} data-active={editTab === 'design'} className="mv-seg-btn flex-1 !justify-center !text-xs">🎨 Thiết kế &amp; Trang trí</button>
        </div>
      </div>

      {editTab === 'design' && (
      <div className="glass-card p-5 rounded-2xl space-y-4 hover:!transform-none mv-fade">
        {/* Gợi ý nội dung bắt mắt (offline) cho poster chính */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="mv-label mr-1">Gợi ý tiêu đề:</span>
          <select value={copyIndustry} onChange={(e) => setCopyIndustry(e.target.value)} className="mv-chip-select !py-1.5 text-[11px]" title="Ngành hàng">
            {COPY_INDUSTRIES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <select value={copyTone} onChange={(e) => setCopyTone(e.target.value as CopyTone)} className="mv-chip-select !py-1.5 text-[11px]" title="Tông giọng">
            {COPY_TONES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={suggestPoster} className="mv-btn mv-btn-ghost !gap-1 !px-2.5 !py-1.5 !text-[11px] !text-indigo-200 !border-indigo-500/30" title="Gợi ý câu chữ bắt mắt">
            <Sparkles className="w-3.5 h-3.5" /> Gợi ý
          </button>
        </div>

        {/* Nhóm điều khiển có nhãn cho dễ tìm */}
        <div className="space-y-2.5 border-t border-white/10 pt-4">
          {/* ===== Nhóm 1: KIỂU (layout + theme) ===== */}
          {!state.conceptId && (
          <>
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-3">Kiểu</span>
            <div className="mv-seg">
              <button
                type="button"
                onClick={() => saveState({ ...state, layoutMode: 'full_photo', templateId: undefined })}
                data-active={!!(state.layoutMode === 'full_photo' || (!state.layoutMode && (state.image || state.cutout)))}
                className="mv-seg-btn inline-flex items-center gap-1.5 !text-xs"
                title="Ảnh tràn viền 100% điện ảnh và đè chữ lên ảnh"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Ảnh Tràn Viền</span>
              </button>
              <button
                type="button"
                onClick={() => saveState({ ...state, layoutMode: 'matrix', templateId: undefined })}
                data-active={!!(state.layoutMode === 'matrix' || (!state.layoutMode && !state.image && !state.cutout))}
                className="mv-seg-btn inline-flex items-center gap-1.5 !text-xs"
                title="Bảng ma trận JD 4 cột chi tiết"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bảng Ma Trận</span>
              </button>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-2">Phong cách</span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              {Object.values(POSTER_THEMES).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => saveState({ ...state, theme: th.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${state.theme === th.id ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'}`}
                >
                  {th.name}
                </button>
              ))}
            </div>
          </div>
          </>
          )}

          {/* ===== Nhóm 2: NỀN & KHỔ ===== */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-3">Nền &amp; khổ</span>
            <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshBg}
            className="mv-btn mv-btn-ghost !gap-1.5 !px-3 !py-2 !text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đổi nền</span>
          </button>
          {(state.bgUrl || state.backgroundImage) && (
            <button
              type="button"
              onClick={() => saveState({ ...state, bgUrl: '', backgroundImage: '' })}
              title="Gỡ ảnh nền — dùng nền đặc theo phong cách"
              className="mv-btn mv-btn-ghost !gap-1.5 !px-3 !py-2 !text-xs !text-rose-300 hover:!text-rose-200 hover:!border-rose-500/40"
            >
              <X className="w-3.5 h-3.5" />
              <span>Bỏ nền</span>
            </button>
          )}
          <select
            value={state.aspect}
            onChange={(e) => saveState({ ...state, aspect: e.target.value as AspectRatio })}
            className="mv-input !w-auto !py-2 !px-3 !text-xs font-semibold"
          >
            <option value="1:1">Vuông 1:1 (1080×1080)</option>
            <option value="4:5">Dọc 4:5 (1080×1350)</option>
            <option value="9:16">Story 9:16 (1080×1920)</option>
          </select>
            </div>
          </div>

          {/* ===== Nhóm 3: CHỮ & KHUNG ===== */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-3">Chữ &amp; khung</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Font chữ */}
          <select
            value={state.headingFontId || 'default'}
            onChange={(e) => setFont(e.target.value)}
            title="Đổi font chữ poster"
            className="mv-input !w-auto !py-2 !px-3 !text-xs font-semibold"
          >
            <option value="default">🔤 Font: Mặc định</option>
            {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>🔤 {f.name}</option>)}
          </select>

          {/* Viền + Bo góc (slider) */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-[11px] bg-white/[0.025] border border-white/[0.07] text-[11px] font-semibold text-slate-200">
            <span>Viền</span>
            <input type="range" min={0} max={24} value={state.borderWidth ?? 0}
              onChange={(e) => setBorder(Number(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer" />
            <span className="w-6 text-right text-slate-400">{state.borderWidth ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-[11px] bg-white/[0.025] border border-white/[0.07] text-[11px] font-semibold text-slate-200">
            <span>Bo góc</span>
            <input type="range" min={0} max={80} value={state.borderRadius ?? 0}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer" />
            <span className="w-6 text-right text-slate-400">{state.borderRadius ?? 0}</span>
          </div>

          {/* Màu viền */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-[11px] bg-white/[0.025] border border-white/[0.07] text-[11px] font-semibold text-slate-200">
            <span>Màu viền</span>
            <input type="color" value={state.borderColor || '#ffffff'}
              onChange={(e) => setBorderColor(e.target.value)}
              title="Chọn màu viền"
              className="w-7 h-6 rounded cursor-pointer bg-transparent border border-white/20 p-0" />
            {state.borderColor && (
              <button type="button" onClick={() => setBorderColor(undefined)} title="Về màu mặc định"
                className="text-slate-400 hover:text-white">↺</button>
            )}
          </div>
            </div>
          </div>

          {/* ===== Nhóm 4: TRANG TRÍ ===== */}
          {/* Dịp (2 cấp: chọn dịp → chọn kiểu) */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-2">Dịp</span>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {SEASON_PRESETS.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSeason(s.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${(state.season || 'none') === s.id ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                    {s.id !== 'none' && <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.c1, boxShadow: `inset 0 0 0 2px ${s.c2}` }} />}
                    {s.label.replace(/^[^\wÀ-ỹ]+\s*/, '') || 'Không'}
                  </button>
                ))}
              </div>
              {state.season && state.season !== 'none' && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-500 self-center mr-1">Kiểu:</span>
                  {SEASON_VARIANTS.map((v) => (
                    <button key={v.id} type="button" onClick={() => setSeasonVariant(v.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${seasonVariant === v.id ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>{v.label}</button>
                  ))}
                  <span className="text-[10px] text-slate-500 self-center ml-1">(áp cho mẫu Phong cách)</span>
                </div>
              )}
            </div>
          </div>

          {/* Sticker */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="mv-label w-24 shrink-0 pt-3">Sticker</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Sticker sale */}
          <select
            value={state.sticker?.preset || 'none'}
            onChange={(e) => setStickerPreset(e.target.value)}
            title="Dán sticker sale lên poster"
            className="mv-input !w-auto !py-2 !px-3 !text-xs font-semibold"
          >
            {STICKER_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.id === 'none' ? '🏷️ Sticker: Không' : `🏷️ ${p.label}`}</option>)}
          </select>
          {state.sticker && state.sticker.preset !== 'none' && (
            <>
              <input
                type="text"
                value={state.sticker.text}
                onChange={(e) => setStickerText(e.target.value)}
                placeholder="Chữ trên sticker"
                className="mv-input !w-40 !py-2 !px-3 !text-xs"
              />
              <div className="mv-seg">
                {(['tl', 'tr', 'bl', 'br'] as StickerCorner[]).map((c) => (
                  <button key={c} type="button" onClick={() => setStickerCorner(c)}
                    title={{ tl: 'Trên trái', tr: 'Trên phải', bl: 'Dưới trái', br: 'Dưới phải' }[c]}
                    data-active={state.sticker?.corner === c}
                    className="mv-seg-btn !px-2.5 !py-1 !text-xs">
                    {{ tl: '↖', tr: '↗', bl: '↙', br: '↘' }[c]}
                  </button>
                ))}
              </div>
            </>
          )}
            </div>
          </div>
        </div>
      </div>
          )}

          {editTab === 'content' && (<>
          <div className="glass-card p-6 rounded-2xl space-y-6 hover:!transform-none">
            <div className="grid grid-cols-1 gap-6">
              {/* Left: Poster Typography Controls */}
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-300"><ImageIcon className="w-3.5 h-3.5" /> Chữ hiển thị TRÊN ảnh</span>
                  <span className="flex-1 h-px bg-white/10" />
                </div>
                <div>
                  <label className="mv-label block mb-1.5">Tiêu đề Poster</label>
                  <input
                    type="text"
                    value={currentCopy.headline}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], headline: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="mv-input"
                  />
                </div>

                <div>
                  <label className="mv-label block mb-1.5">Thông điệp phụ / Slogan</label>
                  <input
                    type="text"
                    value={currentCopy.subline}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], subline: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="mv-input"
                  />
                </div>

                <div>
                  <label className="mv-label block mb-1.5">Nút kêu gọi (CTA)</label>
                  <input
                    type="text"
                    value={currentCopy.cta}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], cta: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="mv-input"
                  />
                </div>

                {state.selected !== 'launch' && (
                  <div>
                    <label className="mv-label block mb-1.5">
                      Các tiêu chí (mỗi dòng một ý)
                    </label>
                    <textarea
                      rows={4}
                      value={(state.selected === 'story' ? resolveStorySource(state, currentCopy).items : (currentCopy.points || [])).join('\n')}
                      onChange={(e) => {
                        const updated = { ...state.copies };
                        updated[state.selected] = {
                          ...updated[state.selected],
                          pointsEdited: true,
                          points: normalizePointList(e.target.value),
                        };
                        saveState({ ...state, copies: updated });
                      }}
                      className="mv-input font-sans leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        <div className="glass-card p-6 rounded-2xl space-y-5 hover:!transform-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-white" />
              <span>Thông Tin Chiến Dịch</span>
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleDevFill}
                title="DEV: tự điền nội dung mẫu / xoá trắng"
                className={`mv-btn mv-btn-ghost !px-2.5 !py-1 !text-xs ${devFill ? '!border-indigo-500/60 !text-indigo-200 !bg-indigo-500/10' : '!text-slate-400'}`}>
                {devFill ? '⚡ Fill mẫu: BẬT' : '⚡ Fill mẫu: TẮT'}
              </button>
              <select
                value={state.categoryId || (state.industry === 'general' ? 'retail' : state.industry)}
                onChange={(e) => { changeCategory(e.target.value); }}
                className="mv-input !w-auto !px-2.5 !py-1 !text-xs font-semibold"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <IndustryForm state={state} onChange={saveState} />
            <div>
              <label className="mv-label block mb-1.5">Ngôn ngữ nội dung</label>
              <select
                value={state.outputLanguage || 'preserve'}
                onChange={(e) => saveState({ ...state, outputLanguage: e.target.value as OutputLanguage })}
                className="mv-input font-semibold"
              >
                <option value="preserve">Giữ nguyên ngôn ngữ gốc (Mặc định)</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English (Toàn bộ nhãn & CTA tiếng Anh)</option>
              </select>
            </div>

            {!state.conceptId && (
            <div>
              <label className="mv-label block mb-1.5">Vị trí / Tên sản phẩm</label>
              <input
                type="text"
                required
                value={state.name}
                onChange={(e) => saveState({ ...state, name: e.target.value })}
                placeholder="VD: Senior Backend Engineer"
                className="mv-input"
              />
            </div>
            )}

            <div>
              <label className="mv-label block mb-1.5">Tên thương hiệu / Brand</label>
              <input
                type="text"
                value={state.brand}
                onChange={(e) => saveState({ ...state, brand: e.target.value })}
                placeholder="VD: Mivy Studio"
                className="mv-input"
              />
            </div>

            {!state.conceptId && (
              <>
            <div>
              <label className="mv-label block mb-1.5">Đãi ngộ / Ưu đãi then chốt</label>
              <input
                type="text"
                value={state.offer}
                onChange={(e) => saveState({ ...state, offer: e.target.value })}
                placeholder="VD: Lương 25 - 35 triệu"
                className="mv-input"
              />
            </div>

            <div>
              <label className="mv-label block mb-1.5">Mô tả chi tiết / Nội dung JD</label>
              <textarea
                rows={5}
                required
                value={state.details}
                onChange={(e) => saveState({ ...state, details: e.target.value })}
                placeholder="Dán nội dung JD hoặc yêu cầu công việc tại đây..."
                className="mv-input leading-relaxed font-sans"
              />
            </div>
              </>
            )}

            <div className="space-y-4">
              <div className="glass-card p-4 space-y-2.5 hover:!transform-none">
                <p className="font-bold text-white">Ảnh nền</p>
                <p className="text-slate-400">Chọn nền mẫu có sẵn, hoặc tải ảnh của anh (sẽ tự làm mờ cho chữ nổi).</p>
                <div className="grid grid-cols-2 gap-2 mv-stagger">
                  {bgsFor(state.categoryId).map((url, i) => (
                    <button key={url} type="button" title={`Nền ${i + 1}`}
                      onClick={() => saveState({ ...state, bgUrl: url, backgroundImage: '' })}
                      className={`mv-hover-zoom aspect-video rounded-lg overflow-hidden border-2 transition-all ${state.bgUrl === url && !state.backgroundImage ? 'border-indigo-500' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={url} alt={`Nền ${i + 1}`} className="w-full h-full object-cover"
                        onError={(e) => { const b = e.currentTarget.closest('button'); if (b) b.style.display = 'none'; }} />
                    </button>
                  ))}
                </div>
                {(state.backgroundImage || state.bgUrl) && <div className="mv-hover-zoom rounded-lg"><img src={state.backgroundImage || state.bgUrl} alt="Ảnh nền của anh" className="w-full h-24 object-cover rounded-lg" /></div>}
                <label className="mv-btn mv-btn-ghost !flex w-full justify-center !py-2 !text-xs">Tải ảnh nền
                  <input aria-label="Tải ảnh nền" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                    const file=e.target.files?.[0]; if(!file) return;
                    const reader=new FileReader(); reader.onload=()=>saveState({...state,backgroundImage:reader.result as string,backgroundDim: state.backgroundDim ?? 45, backgroundBlur: state.backgroundBlur ?? 8, templateId:state.templateId || 'editorial'});reader.readAsDataURL(file);e.target.value='';
                  }} />
                </label>
                {(state.backgroundImage || state.bgUrl) && <>
                  <label className="block text-slate-300 font-medium">Độ tối {state.backgroundDim ?? 35}%<input aria-label="Độ tối ảnh nền" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="85" value={state.backgroundDim ?? 35} onChange={e=>saveState({...state,backgroundDim:Number(e.target.value)})}/></label>
                  <label className="block text-slate-300 font-medium">Độ mờ {state.backgroundBlur ?? 0}<input aria-label="Độ mờ ảnh nền" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="24" value={state.backgroundBlur ?? 0} onChange={e=>saveState({...state,backgroundBlur:Number(e.target.value)})}/></label>
                  <label className="block text-slate-300 font-medium">Vị trí ngang<input aria-label="Vị trí ngang ảnh nền" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="100" value={state.backgroundX ?? 50} onChange={e=>saveState({...state,backgroundX:Number(e.target.value)})}/></label>
                  <label className="block text-slate-300 font-medium">Vị trí dọc<input aria-label="Vị trí dọc ảnh nền" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="100" value={state.backgroundY ?? 50} onChange={e=>saveState({...state,backgroundY:Number(e.target.value)})}/></label>
                  <button type="button" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs !text-rose-300" onClick={()=>saveState({...state,backgroundImage:'',bgUrl:''})}>Gỡ ảnh nền</button>
                </>}
              </div>
              <div className="glass-card p-4 space-y-2.5 hover:!transform-none">
                <p className="font-bold text-white">Ảnh chính</p>
                <p className="text-slate-400">Sản phẩm, nhân vật hoặc hình minh họa nổi bật.</p>
                {state.image && <div className="mv-hover-zoom rounded-lg"><img src={state.cutout || state.image} alt="Ảnh chính của anh" className="w-full h-32 object-contain rounded-lg" /></div>}
                <label className="mv-btn mv-btn-ghost !flex w-full justify-center !py-2 !text-xs">Tải ảnh chính<input aria-label="Tải ảnh chính" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="sr-only" /></label>
                {state.image && <div className="space-y-3">
                  <label className="block text-slate-300 font-medium">Cách đặt ảnh
                    <select aria-label="Cách đặt ảnh chính" value={state.mainImageFit || (state.templateId === 'spotlight' ? 'contain' : 'cover')} onChange={e=>saveState({...state,mainImageFit:e.target.value as 'cover'|'contain',mainImageZoom:100,templateId:state.templateId || 'editorial'})} className="mv-input mt-1">
                      <option value="cover">Lấp đầy khung — cắt phần dư</option>
                      <option value="contain">Giữ toàn ảnh — không cắt</option>
                    </select>
                  </label>
                  <label className="block text-slate-300 font-medium">Phóng to {state.mainImageZoom ?? 100}%<input aria-label="Phóng to ảnh chính" className="w-full accent-indigo-500 cursor-pointer" type="range" min="100" max="250" value={state.mainImageZoom ?? 100} onChange={e=>saveState({...state,mainImageZoom:Number(e.target.value)})}/></label>
                  <label className="block text-slate-300 font-medium">Dịch ảnh ngang<input aria-label="Dịch ảnh chính ngang" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="100" value={state.mainImageX ?? 50} onChange={e=>saveState({...state,mainImageX:Number(e.target.value)})}/></label>
                  <label className="block text-slate-300 font-medium">Dịch ảnh dọc<input aria-label="Dịch ảnh chính dọc" className="w-full accent-indigo-500 cursor-pointer" type="range" min="0" max="100" value={state.mainImageY ?? 50} onChange={e=>saveState({...state,mainImageY:Number(e.target.value)})}/></label>
                  <button type="button" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs" onClick={()=>saveState({...state,mainImageZoom:100,mainImageX:50,mainImageY:50})}>Đặt lại vị trí ảnh</button>
                </div>}
                {state.image && <div className="flex flex-wrap gap-3">
                  <button type="button" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs" onClick={()=>saveState({...state,backgroundImage:state.image,image:'',cutout:'',templateId:state.templateId || 'editorial'})}>Chuyển ảnh này làm nền</button>
                  <button type="button" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs !text-rose-300" onClick={()=>saveState({...state,image:'',cutout:''})}>Gỡ ảnh chính</button>
                </div>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang viết nội dung AI…' : '✦ Tạo Lại Bằng AI'}</span>
            </button>

            {statusText && (
              <p className="text-center text-xs text-white animate-pulse font-medium">
                {statusText}
              </p>
            )}
          </form>

          {/* Facts Review & Verification Section */}
          <div className="pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setFactsExpanded(!factsExpanded)}
              className="w-full py-2 flex items-center justify-between text-left hover:text-white transition-colors text-slate-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-xs font-bold">Đối Chiếu Facts Nguồn</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 font-semibold">
                  {currentFacts.length} ý
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <span>{factsExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${factsExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {factsExpanded && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Trích xuất từ nguồn (chống bịa fact):</span>
                  <button
                    type="button"
                    onClick={handleSyncFactsToStory}
                    className="mv-btn mv-btn-ghost !px-2.5 !py-1 !text-[11px]"
                  >
                    Đồng bộ vào Tiêu Chí
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mv-stagger">
                  {currentFacts.map((fact, fIdx) => {
                    const isIncluded = checkFactInPoster(fact.text);
                    return (
                      <div key={fact.id} className="glass-card !p-2.5 space-y-1.5 hover:!transform-none">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fact.selected}
                              onChange={(e) => handleToggleFact(fIdx, e.target.checked)}
                              className="rounded border-white/20 text-white focus:ring-0 w-3 h-3"
                            />
                            <span className="text-[10px] font-mono text-slate-400">#{fact.id}</span>
                          </label>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                            isIncluded
                              ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isIncluded ? '✓ Đã vào poster' : '⚠ Chưa vào poster'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={fact.text}
                          onChange={(e) => handleEditFactText(fIdx, e.target.value)}
                          className="mv-input !px-2 !py-1 !text-xs"
                        />
                        <p className="text-[9px] text-slate-500 truncate" title={fact.source_excerpt}>
                          Gốc: {fact.source_excerpt}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
          </>)}
        </div>
      </div>
      </div>
      )}

      {step === 1 && (
        <div className="space-y-4 mv-fade">
          <div>
          <h2 className="mv-h1 !text-xl">Chọn ngành &amp; mẫu thiết kế</h2>
          <p className="mv-sub">Chọn ngành (có sẵn nội dung mẫu) và một mẫu thiết kế, rồi bấm Tiếp.</p>
          </div>
          <TemplateLibrary state={state} onChange={saveState} onCategoryChange={changeCategory} />
          <div className="flex justify-end">
            <button type="button" onClick={goToCompose}
              className="mv-btn mv-btn-primary !px-6 !py-3">
              Tiếp → Soạn &amp; tải
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Fullscreen Preview Modal */}
      {previewKind && previewUrl && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewKind(null)}
        >
          {/* Modal Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Xem Trước Poster
              </span>
              <h2 className="text-lg font-bold text-white">
                {posterNames[previewKind]}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleDownloadSingle(previewKind)}
                className="mv-btn mv-btn-primary !px-4 !py-2 !text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewKind(null)}
                className="mv-btn mv-btn-ghost !p-2"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image View with Navigation */}
          <div
            className="relative flex-1 w-full flex items-center justify-center my-3 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevPreview}
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-indigo-400 hover:text-slate-950 text-white border border-white/20 backdrop-blur transition-all shadow-xl"
              title="Mẫu trước (Phím ←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Poster High-Res Rendered Image */}
            <div key={previewKind} className="mv-hover-zoom mv-fade rounded-2xl shadow-2xl inline-flex">
              <img
                src={previewUrl}
                alt={posterNames[previewKind]}
                className="max-h-[80vh] w-auto max-w-[72vw] object-contain rounded-2xl border border-white/10 ring-1 ring-white/10 select-none"
              />
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextPreview}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-indigo-400 hover:text-slate-950 text-white border border-white/20 backdrop-blur transition-all shadow-xl"
              title="Mẫu tiếp theo (Phím →)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            className="flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mv-seg">
            {(['launch', 'story', 'action'] as PosterKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => openPreview(k)}
                data-active={previewKind === k}
                className="mv-seg-btn !text-xs"
              >
                {posterNames[k]}
              </button>
            ))}
            </div>
            <span className="text-[11px] text-slate-500 border-l border-white/10 pl-3">
              Dùng phím ← / → để chuyển mẫu · Esc để đóng
            </span>
          </div>
        </div>
      ), document.body)}
      </div>
    </div>
  );
}
