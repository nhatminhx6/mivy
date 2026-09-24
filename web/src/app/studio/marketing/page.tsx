'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Download, Copy, FileText, RefreshCw, Upload, Check, Layers, Image as ImageIcon, Maximize2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AssetInfo, AspectRatio, IndustryId, MarketingState, PosterKind, ThemeId } from '@/types';
import { POSTER_THEMES, drawIndustryPoster } from '@/lib/design-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { api } from '@/lib/api';

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
    } catch (e) {}
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

  // Render all 3 canvases
  const renderAllCanvases = async () => {
    const assetUrl = state.cutout || state.image || '';
    const [asset, bgImg] = await Promise.all([
      loadAsset(assetUrl),
      loadBgImg(state.bgUrl || ''),
    ]);
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

  // Trigger render on visual state changes
  useEffect(() => {
    renderAllCanvases();
  }, [state.theme, state.aspect, state.copies, state.image, state.cutout, state.bgUrl, state.industry, state.layoutMode]);

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
          details: state.details,
          brand: state.brand,
          goal: state.goal,
          offer: state.offer,
        }),
      });

      let updatedState = {
        ...state,
        copies: {
          launch: { ...state.copies.launch, ...res.launch },
          story: { ...state.copies.story, ...res.story },
          action: { ...state.copies.action, ...res.action },
        },
      };

      // If no photo uploaded yet, generate AI background
      if (!state.image && !state.bgUrl) {
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
        saveState({ ...state, bgUrl: res.url });
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
      saveState({ ...state, image: url, cutout: '', layoutMode: 'full_photo' });
    };
    reader.readAsDataURL(file);
  };

  // Download single PNG
  const handleDownloadSingle = () => {
    const canvasMap: Record<PosterKind, HTMLCanvasElement | null> = {
      launch: canvasLaunchRef.current,
      story: canvasStoryRef.current,
      action: canvasActionRef.current,
    };
    const canvas = canvasMap[state.selected];
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mivy-${state.selected}-${state.aspect.replace(':', 'x')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Download all 3 PNGs in ZIP
  const handleDownloadZip = async () => {
    const canvases = [
      { name: '01-hero-poster.png', canvas: canvasLaunchRef.current, copy: state.copies.launch },
      { name: '02-story-poster.png', canvas: canvasStoryRef.current, copy: state.copies.story },
      { name: '03-action-poster.png', canvas: canvasActionRef.current, copy: state.copies.action },
    ];

    const files = [];
    for (const item of canvases) {
      if (item.canvas) {
        const blob = await new Promise<Blob | null>((r) => item.canvas!.toBlob(r));
        if (blob) {
          files.push({
            name: item.name,
            data: new Uint8Array(await blob.arrayBuffer()),
          });
        }
      }
      files.push({
        name: item.name.replace('.png', '-caption.txt'),
        data: new TextEncoder().encode(item.copy.caption || ''),
      });
    }

    const zipBlob = marketingZip(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mivy-marketing-pack-${state.aspect.replace(':', 'x')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-black text-white mt-2">Tạo Bộ 3 Poster Quảng Cáo</h1>
          <p className="text-slate-400 text-xs mt-1">
            Chọn chủ đề, tỷ lệ và kiểm tra visual render theo thời gian thực chuẩn studio.
          </p>
        </div>

        {/* Controls: Mode, Theme, Background, Aspect */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Layout Mode Selector: Full Photo vs Matrix */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => saveState({ ...state, layoutMode: 'full_photo' })}
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
              onClick={() => saveState({ ...state, layoutMode: 'matrix' })}
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

          {/* Theme Selector */}
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
              value={state.industry}
              onChange={(e) => saveState({ ...state, industry: e.target.value as IndustryId })}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-400 focus:outline-none"
            >
              <option value="recruitment">Tuyển Dụng</option>
              <option value="education">Đào Tạo</option>
              <option value="service">Dịch Vụ</option>
              <option value="general">Thương Mại</option>
            </select>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
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

            {/* Photo Upload */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Ảnh Đính Kèm (Tràn viền 100% Poster)</span>
                {state.image && (
                  <button
                    type="button"
                    onClick={() => saveState({ ...state, image: '', cutout: '' })}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Gỡ ảnh
                  </button>
                )}
              </label>
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/50 bg-white/5 cursor-pointer transition-colors text-slate-400 hover:text-white">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">{state.image ? 'Đổi ảnh khác' : 'Tải ảnh team / văn phòng'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
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
