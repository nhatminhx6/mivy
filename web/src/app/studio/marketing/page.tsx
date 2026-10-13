'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Download, Copy, FileText, RefreshCw, Upload, Check, Layers, Image as ImageIcon, Maximize2, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { AssetInfo, AspectRatio, IndustryId, MarketingState, PosterKind, ThemeId, OutputLanguage, FactItem } from '@/types';
import { POSTER_THEMES, drawIndustryPoster } from '@/lib/design-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { balancedPages, resolveStorySource, clampStoryPageInState, normalizePointList } from '@/lib/balanced-pages';
import { IndustryForm } from '@/components/marketing/IndustryForm';
import { makeIndustryCopy } from '@/lib/industry-concepts';
import { STICKER_PRESETS, getPreset } from '@/lib/sticker-engine';
import { SEASON_PRESETS } from '@/lib/season-engine';
import { FONT_PRESETS } from '@/lib/brand-presets';
import { StickerCorner } from '@/types';
import { TemplateLibrary } from '@/components/marketing/TemplateLibrary';
import { CATEGORIES, TEMPLATES } from '@/lib/template-catalog';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import { loadBrand } from '@/lib/brand-presets';
import { DraftController } from '@/lib/draft-controller';

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
  theme: 'emerald_pro',
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

  // Load initial state from localStorage & resolve durable assets on mount
  useEffect(() => {
    const controller = getController();
    controller.loadInitialDraft();
    const b = loadBrand();
    if (b) {
      controller.setBrandKit(b);
    }
    return () => {
      controller.dispose();
    };
  }, []);

  // Save state on change
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
    await document.fonts.ready;
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
  }, [step, state.conceptId, state.industryFields, state.mainImageFit, state.mainImageZoom, state.mainImageX, state.mainImageY, state.backgroundImage, state.backgroundDim, state.backgroundBlur, state.backgroundX, state.backgroundY, state.templateId, state.categoryId, state.brand, state.offer, state.details, state.facts, state.storyPerPage, state.theme, state.aspect, state.copies, state.image, state.cutout, state.bgUrl, state.industry, state.layoutMode, state.storyPage, state.outputLanguage, state.brandKit, state.sticker, state.season, state.headingFontId, state.bodyFontId, state.borderWidth, state.borderRadius, state.borderColor]);

  // Handle Form Submission (Generate copies via AI)
  // Dựng nội dung 100% bằng CODE từ data có sẵn — KHÔNG gọi AI realtime (đúng kiến trúc Mivy).
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setStatusText('Đang dựng nội dung…');

    try {
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

      saveState(updatedState);
      setStatusText('');
      setStep(3); // xong → sang bước xem & tải
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
    await document.fonts.ready;
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
      c.width = 1080;
      c.height = aspect === '1:1' ? 1080 : aspect === '9:16' ? 1920 : 1350;
      drawIndustryPoster(c, { ...snapshot, aspect, storyPage: page }, kind, snapshot.copies[kind], asset, bgImg, logoImg);
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
  const handleDownloadSingle = async () => {
    try {
      setStatusText('Đang xử lý ảnh...');
      const { snapshot, storySource, draw } = await prepareExport();
      const targetPage = snapshot.selected === 'story' && storySource ? storySource.pageIndex : (snapshot.storyPage || 0);
      const canvas = draw(snapshot.selected, targetPage);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r));
      if (!blob) throw new Error('Không thể tạo ảnh PNG.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mivy-${snapshot.selected}-${snapshot.aspect.replace(':', 'x')}.png`;
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
  const posterNames: Record<PosterKind, string> = {
    launch: '1. Poster Chính (Hero)',
    story: '2. Tiêu Chí (Story)',
    action: '3. Kết Nối & CV (Action)',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Stepper 3 bước */}
      <div className="flex items-center gap-2 glass-panel p-2 rounded-2xl">
        {[{ n: 1, t: 'Chọn ngành' }, { n: 2, t: 'Nội dung' }, { n: 3, t: 'Xem & tải' }].map((s) => (
          <button key={s.n} type="button" onClick={() => setStep(s.n)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${step === s.n ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === s.n ? 'bg-slate-950/20' : 'bg-white/10'}`}>{s.n}</span>
            <span className="hidden sm:inline">{s.t}</span>
          </button>
        ))}
      </div>

      {/* Tinh chỉnh hiển thị (bước 3) */}
      {step === 3 && (
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-black text-white">Tuỳ chỉnh &amp; Tải poster</h1>
            <p className="text-slate-400 text-xs mt-0.5">Chỉnh kiểu, chữ, khung, trang trí — preview cập nhật ngay.</p>
          </div>
          <a href="/studio/marketing/review" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            Xem bộ mẫu kiểm tra
          </a>
        </div>

        {/* Nhóm điều khiển có nhãn cho dễ tìm */}
        <div className="space-y-2.5 border-t border-white/10 pt-4">
          {/* ===== Nhóm 1: KIỂU (layout + theme) ===== */}
          {!state.conceptId && (
          <div className="flex items-start gap-3 flex-wrap">
            <span className="w-24 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Kiểu</span>
            <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => saveState({ ...state, layoutMode: 'full_photo', templateId: undefined })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.layoutMode === 'full_photo' || (!state.layoutMode && (state.image || state.cutout))
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ảnh tràn viền 100% điện ảnh và đè chữ lên ảnh"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Ảnh Tràn Viền</span>
            </button>
            <button
              type="button"
              onClick={() => saveState({ ...state, layoutMode: 'matrix', templateId: undefined })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.layoutMode === 'matrix' || (!state.layoutMode && !state.image && !state.cutout)
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bảng ma trận JD 4 cột chi tiết"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bảng Ma Trận</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            {Object.values(POSTER_THEMES).map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => saveState({ ...state, theme: th.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  state.theme === th.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {th.name}
              </button>
            ))}
          </div>
            </div>
          </div>
          )}

          {/* ===== Nhóm 2: NỀN & KHỔ ===== */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="w-24 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Nền &amp; khổ</span>
            <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshBg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đổi nền</span>
          </button>
          <select
            value={state.aspect}
            onChange={(e) => saveState({ ...state, aspect: e.target.value as AspectRatio })}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="1:1">Vuông 1:1 (1080×1080)</option>
            <option value="4:5">Dọc 4:5 (1080×1350)</option>
            <option value="9:16">Story 9:16 (1080×1920)</option>
          </select>
            </div>
          </div>

          {/* ===== Nhóm 3: CHỮ & KHUNG ===== */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="w-24 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Chữ &amp; khung</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Font chữ */}
          <select
            value={state.headingFontId || 'default'}
            onChange={(e) => setFont(e.target.value)}
            title="Đổi font chữ poster"
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-indigo-500/40 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="default">🔤 Font: Mặc định</option>
            {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>🔤 {f.name}</option>)}
          </select>

          {/* Viền + Bo góc (slider) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-[11px] font-semibold text-slate-200">
            <span>Viền</span>
            <input type="range" min={0} max={24} value={state.borderWidth ?? 0}
              onChange={(e) => setBorder(Number(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer" />
            <span className="w-6 text-right text-slate-400">{state.borderWidth ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-[11px] font-semibold text-slate-200">
            <span>Bo góc</span>
            <input type="range" min={0} max={80} value={state.borderRadius ?? 0}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer" />
            <span className="w-6 text-right text-slate-400">{state.borderRadius ?? 0}</span>
          </div>

          {/* Màu viền */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-[11px] font-semibold text-slate-200">
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
          <div className="flex items-start gap-3 flex-wrap">
            <span className="w-24 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Trang trí</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Mùa sale VN */}
          <select
            value={state.season || 'none'}
            onChange={(e) => setSeason(e.target.value)}
            title="Trang trí theo mùa sale"
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/40 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
          >
            {SEASON_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.id === 'none' ? '🎉 Mùa: Không' : `Mùa: ${s.label}`}</option>)}
          </select>

          {/* Sticker sale */}
          <select
            value={state.sticker?.preset || 'none'}
            onChange={(e) => setStickerPreset(e.target.value)}
            title="Dán sticker sale lên poster"
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-rose-500/40 text-xs font-bold text-rose-300 focus:outline-none focus:border-rose-500"
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
                className="px-3 py-1.5 w-40 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
              <div className="flex gap-1">
                {(['tl', 'tr', 'bl', 'br'] as StickerCorner[]).map((c) => (
                  <button key={c} type="button" onClick={() => setStickerCorner(c)}
                    title={{ tl: 'Trên trái', tr: 'Trên phải', bl: 'Dưới trái', br: 'Dưới phải' }[c]}
                    className={`w-7 h-7 rounded-lg border text-[10px] font-bold ${state.sticker?.corner === c ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
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

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-white">Chọn ngành &amp; mẫu thiết kế</h2>
          <p className="text-slate-400 text-sm">Chọn ngành (có sẵn nội dung mẫu) và một mẫu thiết kế, rồi bấm Tiếp.</p>
          <TemplateLibrary state={state} onChange={saveState} onCategoryChange={changeCategory} />
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
              Tiếp → Nhập nội dung
            </button>
          </div>
        </div>
      )}

      {/* Workspace: nội dung (bước 2) + xem & chỉnh (bước 3) */}
      <div className="space-y-8">
        {step === 2 && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Thông Tin Chiến Dịch</span>
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleDevFill}
                title="DEV: tự điền nội dung mẫu / xoá trắng"
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${devFill ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                {devFill ? '⚡ Fill mẫu: BẬT' : '⚡ Fill mẫu: TẮT'}
              </button>
              <select
                value={state.categoryId || (state.industry === 'general' ? 'retail' : state.industry)}
                onChange={(e) => { changeCategory(e.target.value); }}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-400 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <IndustryForm state={state} onChange={saveState} />
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ngôn ngữ nội dung</label>
              <select
                value={state.outputLanguage || 'preserve'}
                onChange={(e) => saveState({ ...state, outputLanguage: e.target.value as OutputLanguage })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="preserve">Giữ nguyên ngôn ngữ gốc (Mặc định)</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English (Toàn bộ nhãn & CTA tiếng Anh)</option>
              </select>
            </div>

            {!state.conceptId && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Vị trí / Tên sản phẩm</label>
              <input
                type="text"
                required
                value={state.name}
                onChange={(e) => saveState({ ...state, name: e.target.value })}
                placeholder="VD: Senior Backend Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tên thương hiệu / Brand</label>
              <input
                type="text"
                value={state.brand}
                onChange={(e) => saveState({ ...state, brand: e.target.value })}
                placeholder="VD: Mivy Studio"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {!state.conceptId && (
              <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Đãi ngộ / Ưu đãi then chốt</label>
              <input
                type="text"
                value={state.offer}
                onChange={(e) => saveState({ ...state, offer: e.target.value })}
                placeholder="VD: Lương 25 - 35 triệu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mô tả chi tiết / Nội dung JD</label>
              <textarea
                rows={5}
                required
                value={state.details}
                onChange={(e) => saveState({ ...state, details: e.target.value })}
                placeholder="Dán nội dung JD hoặc yêu cầu công việc tại đây..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
              />
            </div>
              </>
            )}

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 p-3 space-y-2">
                <p className="font-bold text-white">Ảnh nền</p>
                <p className="text-slate-400">Chọn nền mẫu có sẵn, hoặc tải ảnh của anh (sẽ tự làm mờ cho chữ nổi).</p>
                <div className="grid grid-cols-2 gap-2">
                  {bgsFor(state.categoryId).map((url, i) => (
                    <button key={url} type="button" title={`Nền ${i + 1}`}
                      onClick={() => saveState({ ...state, bgUrl: url, backgroundImage: '' })}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${state.bgUrl === url && !state.backgroundImage ? 'border-emerald-500' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={url} alt={`Nền ${i + 1}`} className="w-full h-full object-cover"
                        onError={(e) => { const b = e.currentTarget.closest('button'); if (b) b.style.display = 'none'; }} />
                    </button>
                  ))}
                </div>
                {(state.backgroundImage || state.bgUrl) && <img src={state.backgroundImage || state.bgUrl} alt="Ảnh nền của anh" className="w-full h-24 object-cover rounded-lg" />}
                <label className="block cursor-pointer text-emerald-400 py-2">Tải ảnh nền
                  <input aria-label="Tải ảnh nền" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                    const file=e.target.files?.[0]; if(!file) return;
                    const reader=new FileReader(); reader.onload=()=>saveState({...state,backgroundImage:reader.result as string,backgroundDim: state.backgroundDim ?? 45, backgroundBlur: state.backgroundBlur ?? 8, templateId:state.templateId || 'editorial'});reader.readAsDataURL(file);e.target.value='';
                  }} />
                </label>
                {(state.backgroundImage || state.bgUrl) && <>
                  <label className="block">Độ tối {state.backgroundDim ?? 35}%<input aria-label="Độ tối ảnh nền" className="w-full" type="range" min="0" max="85" value={state.backgroundDim ?? 35} onChange={e=>saveState({...state,backgroundDim:Number(e.target.value)})}/></label>
                  <label className="block">Độ mờ {state.backgroundBlur ?? 0}<input aria-label="Độ mờ ảnh nền" className="w-full" type="range" min="0" max="24" value={state.backgroundBlur ?? 0} onChange={e=>saveState({...state,backgroundBlur:Number(e.target.value)})}/></label>
                  <label className="block">Vị trí ngang<input aria-label="Vị trí ngang ảnh nền" className="w-full" type="range" min="0" max="100" value={state.backgroundX ?? 50} onChange={e=>saveState({...state,backgroundX:Number(e.target.value)})}/></label>
                  <label className="block">Vị trí dọc<input aria-label="Vị trí dọc ảnh nền" className="w-full" type="range" min="0" max="100" value={state.backgroundY ?? 50} onChange={e=>saveState({...state,backgroundY:Number(e.target.value)})}/></label>
                  <button type="button" className="text-rose-400" onClick={()=>saveState({...state,backgroundImage:'',bgUrl:''})}>Gỡ ảnh nền</button>
                </>}
              </div>
              <div className="rounded-xl border border-white/10 p-3 space-y-2">
                <p className="font-bold text-white">Ảnh chính</p>
                <p className="text-slate-400">Sản phẩm, nhân vật hoặc hình minh họa nổi bật.</p>
                {state.image && <img src={state.cutout || state.image} alt="Ảnh chính của anh" className="w-full h-32 object-contain rounded-lg" />}
                <label className="block cursor-pointer text-emerald-400 py-2">Tải ảnh chính<input aria-label="Tải ảnh chính" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="sr-only" /></label>
                {state.image && <div className="space-y-3">
                  <label className="block">Cách đặt ảnh
                    <select aria-label="Cách đặt ảnh chính" value={state.mainImageFit || (state.templateId === 'spotlight' ? 'contain' : 'cover')} onChange={e=>saveState({...state,mainImageFit:e.target.value as 'cover'|'contain',mainImageZoom:100,templateId:state.templateId || 'editorial'})} className="block w-full mt-1 p-2 rounded bg-slate-800 text-white">
                      <option value="cover">Lấp đầy khung — cắt phần dư</option>
                      <option value="contain">Giữ toàn ảnh — không cắt</option>
                    </select>
                  </label>
                  <label className="block">Phóng to {state.mainImageZoom ?? 100}%<input aria-label="Phóng to ảnh chính" className="w-full" type="range" min="100" max="250" value={state.mainImageZoom ?? 100} onChange={e=>saveState({...state,mainImageZoom:Number(e.target.value)})}/></label>
                  <label className="block">Dịch ảnh ngang<input aria-label="Dịch ảnh chính ngang" className="w-full" type="range" min="0" max="100" value={state.mainImageX ?? 50} onChange={e=>saveState({...state,mainImageX:Number(e.target.value)})}/></label>
                  <label className="block">Dịch ảnh dọc<input aria-label="Dịch ảnh chính dọc" className="w-full" type="range" min="0" max="100" value={state.mainImageY ?? 50} onChange={e=>saveState({...state,mainImageY:Number(e.target.value)})}/></label>
                  <button type="button" className="text-slate-300 underline" onClick={()=>saveState({...state,mainImageZoom:100,mainImageX:50,mainImageY:50})}>Đặt lại vị trí ảnh</button>
                </div>}
                {state.image && <div className="flex flex-wrap gap-3">
                  <button type="button" className="text-emerald-400" onClick={()=>saveState({...state,backgroundImage:state.image,image:'',cutout:'',templateId:state.templateId || 'editorial'})}>Chuyển ảnh này làm nền</button>
                  <button type="button" className="text-rose-400" onClick={()=>saveState({...state,image:'',cutout:''})}>Gỡ ảnh chính</button>
                </div>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang viết nội dung AI…' : '✦ Tạo Lại Bằng AI'}</span>
            </button>

            {statusText && (
              <p className="text-center text-xs text-emerald-400 animate-pulse font-medium">
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
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Đối Chiếu Facts Nguồn</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
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
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors"
                  >
                    Đồng bộ vào Tiêu Chí
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {currentFacts.map((fact, fIdx) => {
                    const isIncluded = checkFactInPoster(fact.text);
                    return (
                      <div key={fact.id} className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fact.selected}
                              onChange={(e) => handleToggleFact(fIdx, e.target.checked)}
                              className="rounded border-white/20 text-emerald-500 focus:ring-0 w-3 h-3"
                            />
                            <span className="text-[10px] font-mono text-slate-400">#{fact.id}</span>
                          </label>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                            isIncluded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isIncluded ? '✓ Đã vào poster' : '⚠ Chưa vào poster'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={fact.text}
                          onChange={(e) => handleEditFactText(fIdx, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
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

        )}

        {step === 3 && (
        <div className="space-y-6">
          {/* Canvases Selection Bar */}
          <div className="grid grid-cols-3 gap-4">
            {(['launch', 'story', 'action'] as PosterKind[]).map((kind) => (
              <div
                key={kind}
                onClick={() => saveState({ ...state, selected: kind })}
                className={`group p-3 rounded-2xl glass-card text-left transition-all border cursor-pointer relative ${
                  state.selected === kind
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="aspect-[4/5] bg-black/60 rounded-xl overflow-hidden mb-2 relative flex items-center justify-center">
                  <canvas
                    ref={
                      kind === 'launch'
                        ? canvasLaunchRef
                        : kind === 'story'
                        ? canvasStoryRef
                        : canvasActionRef
                    }
                    className="w-full h-full object-contain"
                  />
                  {/* Hover Overlay Button to Preview */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      saveState({ ...state, selected: kind });
                      openPreview(kind);
                    }}
                    className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white"
                  >
                    <div className="p-2.5 rounded-full bg-emerald-500 text-slate-950 shadow-lg transform group-hover:scale-110 transition-transform">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold bg-black/70 px-3 py-1 rounded-full border border-white/20 shadow">
                      Phóng to xem ảnh
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-white truncate">{posterNames[kind]}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveState({ ...state, selected: kind });
                      openPreview(kind);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors"
                    title="Bấm xem phóng to"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {state.copies[kind]?.headline || 'Chưa có tiêu đề'}
                </p>
              </div>
            ))}
          </div>

          {/* Editor & Download Action Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs text-slate-400">Đang chỉnh sửa:</span>
                <h3 className="text-lg font-bold text-white">{posterNames[state.selected]}</h3>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadSingle}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAllSizes}
                  title="Xuất ảnh đang chọn ở cả 3 khổ: Post 1080×1350 · Story/Reels 1080×1920 · Vuông 1080×1080"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500 text-sky-300 font-bold text-xs hover:bg-sky-500/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải đủ 3 khổ</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-white font-semibold text-xs hover:bg-white/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải cả bộ ZIP</span>
                </button>
              </div>
            </div>

            {/* Carousel Pagination Controls for Story Poster */}
            {state.selected === 'story' && (() => {
              const storyResolved = resolveStorySource(state, state.copies.story);
              const totalStoryPoints = storyResolved.items.length;
              const totalStoryPages = storyResolved.totalPages;
              const currentStoryPage = storyResolved.pageIndex;
              if (totalStoryPages <= 1) return null;
              return (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">Carousel Phân Trang:</span>
                    <span className="text-xs text-slate-300">
                      Trang {currentStoryPage + 1} / {totalStoryPages} · ({totalStoryPoints} yêu cầu chuyên môn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentStoryPage <= 0}
                      onClick={() => saveState({ ...state, storyPage: Math.max(0, currentStoryPage - 1) })}
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white disabled:opacity-40 transition-colors"
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
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white disabled:opacity-40 transition-colors"
                      title="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Field Editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Poster Typography Controls */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tiêu đề Poster</label>
                  <input
                    type="text"
                    value={currentCopy.headline}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], headline: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Thông điệp phụ / Slogan</label>
                  <input
                    type="text"
                    value={currentCopy.subline}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], subline: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nút kêu gọi (CTA)</label>
                  <input
                    type="text"
                    value={currentCopy.cta}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected] = { ...updated[state.selected], cta: e.target.value };
                      saveState({ ...state, copies: updated });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {state.selected !== 'launch' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
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
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Right: Social Media Caption Editor */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Caption đi kèm bài đăng</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Đã sao chép!' : 'Sao chép caption'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={9}
                    value={currentCopy.caption}
                    onChange={(e) => {
                      const updated = { ...state.copies };
                      updated[state.selected].caption = e.target.value;
                      saveState({ ...state, copies: updated });
                    }}
                    className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Anh có thể chỉnh sửa trực tiếp thông điệp và ưu đãi trước khi xuất file.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Lightbox Fullscreen Preview Modal */}
      {previewKind && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewKind(null)}
        >
          {/* Modal Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Xem Trước Poster
              </span>
              <h2 className="text-lg font-bold text-white">
                {posterNames[previewKind]}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = `mivy-${previewKind}-${state.aspect.replace(':', 'x')}.png`;
                  a.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewKind(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
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
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-emerald-500 hover:text-slate-950 text-white border border-white/20 backdrop-blur transition-all shadow-xl"
              title="Mẫu trước (Phím ←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Poster High-Res Rendered Image */}
            <img
              src={previewUrl}
              alt={posterNames[previewKind]}
              className="max-h-full max-w-[82vw] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/10 select-none"
            />

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextPreview}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-emerald-500 hover:text-slate-950 text-white border border-white/20 backdrop-blur transition-all shadow-xl"
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
            {(['launch', 'story', 'action'] as PosterKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => openPreview(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  previewKind === k
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {posterNames[k]}
              </button>
            ))}
            <span className="text-[11px] text-slate-500 border-l border-white/10 pl-3">
              Dùng phím ← / → để chuyển mẫu · Esc để đóng
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
