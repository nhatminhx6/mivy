'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Download, Copy, FileText, RefreshCw, Upload, Check, Layers, Image as ImageIcon, Maximize2, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { AssetInfo, AspectRatio, IndustryId, MarketingState, PosterKind, ThemeId, OutputLanguage, FactItem } from '@/types';
import { POSTER_THEMES, drawIndustryPoster } from '@/lib/design-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { balancedPages } from '@/lib/balanced-pages';
import { api } from '@/lib/api';
import { IndustryForm } from '@/components/marketing/IndustryForm';
import { CONCEPTS } from '@/lib/industry-concepts';
import { switchIndustry } from '@/lib/industry-drafts';
import { TemplateLibrary } from '@/components/marketing/TemplateLibrary';
import { CATEGORIES } from '@/lib/template-catalog';

const DEFAULT_MARKETING: MarketingState = {
  industry: 'recruitment',
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
  const [isBgLoading, setIsBgLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
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

  // Load initial state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mivy-marketing-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((prev) => ({
          ...prev,
          ...parsed,
          layoutMode: parsed.layoutMode || 'full_photo',
        }));
      }
    } catch (e) {}
  }, []);

  // Save state on change
  const saveState = (newState: MarketingState) => {
    setState(newState);
    try {
      localStorage.setItem('mivy-marketing-v1', JSON.stringify(newState));
    } catch {
      setStatusText('Bản nháp chưa lưu được vào trình duyệt. Anh tải nội dung trước khi đóng trang hoặc giảm dung lượng ảnh.');
    }
  };

  const changeCategory = (categoryId:string) => {
    const category=CATEGORIES.find(c=>c.id===categoryId);
    if(!category) return;
    try { const next=switchIndustry(state,category.id,category.industry,localStorage); saveState({...next,conceptId:next.conceptId || CONCEPTS.find(c=>c.category===category.id)?.id}); }
    catch { setStatusText('Chưa lưu được bản nháp. Anh giữ nguyên ngành hiện tại và tải nội dung trước.'); }
  };

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
    const [asset, bgImg] = await Promise.all([
      loadAsset(assetUrl),
      loadBgImg(state.backgroundImage || state.bgUrl || ''),
    ]);
    if (version !== renderVersion.current) return;
    assetRef.current = asset;
    bgImgRef.current = bgImg;

    if (canvasLaunchRef.current) {
      drawIndustryPoster(canvasLaunchRef.current, state, 'launch', state.copies.launch, asset, bgImg);
    }
    if (canvasStoryRef.current) {
      drawIndustryPoster(canvasStoryRef.current, state, 'story', state.copies.story, asset, bgImg);
    }
    if (canvasActionRef.current) {
      drawIndustryPoster(canvasActionRef.current, state, 'action', state.copies.action, asset, bgImg);
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
    const searchCorpus = [
      state.copies.launch.headline,
      state.copies.launch.subline,
      ...(state.copies.launch.points || []),
      state.copies.launch.caption,
      state.copies.story.headline,
      state.copies.story.subline,
      ...(state.copies.story.points || []),
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

  // Trigger render on visual state changes
  useEffect(() => {
    renderAllCanvases();
  }, [state.conceptId, state.industryFields, state.mainImageFit, state.mainImageZoom, state.mainImageX, state.mainImageY, state.backgroundImage, state.backgroundDim, state.backgroundBlur, state.backgroundX, state.backgroundY, state.templateId, state.categoryId, state.brand, state.offer, state.details, state.facts, state.storyPerPage, state.theme, state.aspect, state.copies, state.image, state.cutout, state.bgUrl, state.industry, state.layoutMode, state.storyPage, state.outputLanguage]);

  // Handle Form Submission (Generate copies via AI)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setStatusText('Đang phân tích thông tin và viết nội dung…');

    try {
      const res = await api('/v1/creative/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: state.industry,
          name: state.name,
          details: `[${CATEGORIES.find(c => c.id === state.categoryId)?.name || state.industry}]\n${state.details}`,
          brand: state.brand,
          goal: state.goal,
          offer: state.offer,
          output_language: state.outputLanguage || 'preserve',
        }),
      });

      const extractedFacts = res.facts && res.facts.length > 0
        ? res.facts
        : extractFactsFromDetails(state.details, state.offer);

      let updatedState: MarketingState = {
        ...state,
        facts: extractedFacts,
        storyPage: 0,
        copies: {
          launch: { ...state.copies.launch, ...res.launch },
          story: { ...state.copies.story, ...res.story },
          action: { ...state.copies.action, ...res.action },
        },
      };

      // If no photo uploaded yet, generate AI background
      if (!state.image && !state.backgroundImage && !state.bgUrl) {
        setStatusText('Đang tạo ảnh nền Visual AI…');
        try {
          const bgRes = await api('/v1/creative/background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              industry: state.industry,
              theme: state.theme,
              aspect_ratio: state.aspect,
            }),
          });
          if (bgRes?.url) {
            updatedState.bgUrl = bgRes.url;
          }
        } catch (err) {
          console.warn('Background generation fallback:', err);
        }
      }

      saveState(updatedState);
      setStatusText('');
    } catch (err: any) {
      alert(err.message || 'Chưa tạo được nội dung. Anh thử lại nhé.');
    } finally {
      setIsGenerating(false);
      setStatusText('');
    }
  };

  // Handle Visual AI Refresh
  const handleRefreshBg = async () => {
    setIsBgLoading(true);
    try {
      const res = await api('/v1/creative/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: state.industry,
          theme: state.theme,
          aspect_ratio: state.aspect,
          seed: Math.floor(Math.random() * 999999),
        }),
      });
      if (res?.url) {
        saveState({ ...state, bgUrl: res.url, backgroundImage: '', templateId: state.templateId || 'editorial' });
      }
    } catch (e: any) {
      alert('Chưa đổi được nền AI: ' + e.message);
    } finally {
      setIsBgLoading(false);
    }
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
    await document.fonts.ready;
    const assetUrl = snapshot.cutout || snapshot.image || '';
    const bgUrl = snapshot.backgroundImage || snapshot.bgUrl || '';
    const [asset, bgImg] = await Promise.all([
      loadAsset(assetUrl),
      loadBgImg(bgUrl),
    ]);
    if (assetUrl && !asset) throw new Error('Không thể tải ảnh chính. Vui lòng kiểm tra lại.');
    if (bgUrl && !bgImg) throw new Error('Không thể tải ảnh nền. Vui lòng kiểm tra lại.');

    const draw = (kind: PosterKind, page: number = 0) => {
      const c = document.createElement('canvas');
      c.width = 1080;
      c.height = snapshot.aspect === '1:1' ? 1080 : snapshot.aspect === '9:16' ? 1920 : 1350;
      drawIndustryPoster(c, { ...snapshot, storyPage: page }, kind, snapshot.copies[kind], asset, bgImg);
      return c;
    };
    return { snapshot, asset, bgImg, draw };
  };

  // Download single PNG
  const handleDownloadSingle = async () => {
    try {
      setStatusText('Đang xử lý ảnh...');
      const { snapshot, draw } = await prepareExport();
      const canvas = draw(snapshot.selected, snapshot.storyPage || 0);
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
      const allStoryPoints = snapshot.copies.story.points || [];
      const storyPerPage = snapshot.storyPerPage || 3;
      const totalStoryPages = snapshot.conceptId ? balancedPages(allStoryPoints, storyPerPage).length : Math.max(1, Math.ceil(allStoryPoints.length / storyPerPage));

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
      {/* Top Banner / Config Bar */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            MARKETING STUDIO 2.0
          </span>
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-2xl font-black text-white">Tạo Bộ 3 Poster Quảng Cáo</h1>
            <a href="/studio/marketing/review" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Xem bộ mẫu kiểm tra
            </a>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Chọn chủ đề, tỷ lệ và kiểm tra visual render theo thời gian thực chuẩn studio.
          </p>
        </div>

        {/* Controls: Mode, Theme, Background, Aspect */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Layout Mode Selector: Full Photo vs Matrix */}
          {!state.conceptId && (
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
          )}

          {/* Theme Selector */}
          {!state.conceptId && (
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
          )}

          {/* AI Background Refresh */}
          <button
            type="button"
            onClick={handleRefreshBg}
            disabled={isBgLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isBgLoading ? 'animate-spin' : ''}`} />
            <span>Đổi Nền AI</span>
          </button>

          {/* Aspect Ratio */}
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

      <TemplateLibrary state={state} onChange={saveState} onCategoryChange={changeCategory} />

      {/* Main Workspace Grid: Left Form + Center Canvases + Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Brief Input Form (4 cols) */}
        <div className="lg:col-span-4 glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Thông Tin Chiến Dịch</span>
            </h2>
            <select
              value={state.categoryId || (state.industry === 'general' ? 'retail' : state.industry)}
              onChange={(e) => { changeCategory(e.target.value); }}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-400 focus:outline-none"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
                <p className="text-slate-400">Phủ phía sau để tạo không khí và chiều sâu.</p>
                {(state.backgroundImage || state.bgUrl) && <img src={state.backgroundImage || state.bgUrl} alt="Ảnh nền của anh" className="w-full h-24 object-cover rounded-lg" />}
                <label className="block cursor-pointer text-emerald-400 py-2">Tải ảnh nền
                  <input aria-label="Tải ảnh nền" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                    const file=e.target.files?.[0]; if(!file) return;
                    const reader=new FileReader(); reader.onload=()=>saveState({...state,backgroundImage:reader.result as string,templateId:state.templateId || 'editorial'});reader.readAsDataURL(file);e.target.value='';
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

        {/* Center & Right Column: Posters Preview + Interactive Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
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
              const totalStoryPoints = state.copies.story.points?.length || 0;
              const storyPerPage = state.storyPerPage || 3;
              const totalStoryPages = Math.max(1, Math.ceil(totalStoryPoints / storyPerPage));
              if (totalStoryPages <= 1) return null;
              return (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">Carousel Phân Trang:</span>
                    <span className="text-xs text-slate-300">
                      Trang {(state.storyPage || 0) + 1} / {totalStoryPages} · ({totalStoryPoints} yêu cầu chuyên môn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={(state.storyPage || 0) <= 0}
                      onClick={() => saveState({ ...state, storyPage: (state.storyPage || 0) - 1 })}
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white disabled:opacity-40 transition-colors"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-white px-2">
                      {(state.storyPage || 0) + 1} / {totalStoryPages}
                    </span>
                    <button
                      type="button"
                      disabled={(state.storyPage || 0) >= totalStoryPages - 1}
                      onClick={() => saveState({ ...state, storyPage: (state.storyPage || 0) + 1 })}
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
                      updated[state.selected].headline = e.target.value;
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
                      updated[state.selected].subline = e.target.value;
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
                      updated[state.selected].cta = e.target.value;
                      saveState({ ...state, copies: updated });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {state.selected !== 'launch' && currentCopy.points && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Các tiêu chí (mỗi dòng một ý)
                    </label>
                    <textarea
                      rows={4}
                      value={currentCopy.points.join('\n')}
                      onChange={(e) => {
                        const updated = { ...state.copies };
                        updated[state.selected].pointsEdited = true;
                        updated[state.selected].points = e.target.value.split('\n').filter(Boolean);
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
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-3 overflow-hidden"
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
              className="max-h-[78vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/10 select-none"
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
