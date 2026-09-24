'use client';

import { useState, useRef } from 'react';
import {
  Sparkles,
  Download,
  Image as ImageIcon,
  Wand2,
  Upload,
  ShoppingBag,
  Scissors,
  CheckCircle2,
  RefreshCw,
  X,
  Layers,
  Smartphone,
  Store,
  Share2,
  Eye,
  Info,
} from 'lucide-react';
import { api, pollJob } from '@/lib/api';

type StudioMode = 'product' | 'text';
type TargetPlatform = 'shopee' | 'tiktok' | 'facebook';
type AspectRatio = '1:1' | '9:16' | '4:5';

interface PlatformConfig {
  id: TargetPlatform;
  name: string;
  tag: string;
  badgeColor: string;
  borderColor: string;
  accentBg: string;
  icon: typeof Store;
  defaultAspect: AspectRatio;
  availableAspects: { id: AspectRatio; label: string; desc: string; size: string }[];
  guidelines: {
    rule: string;
    detail: string;
  }[];
}

const PLATFORMS: Record<TargetPlatform, PlatformConfig> = {
  shopee: {
    id: 'shopee',
    name: 'Shopee & Sàn TMĐT',
    tag: 'TIÊU CHUẨN SÀN',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    borderColor: 'hover:border-orange-500/50',
    accentBg: 'from-orange-500/10 to-amber-500/5',
    icon: Store,
    defaultAspect: '1:1',
    availableAspects: [
      { id: '1:1', label: '1:1 Vuông Chuẩn', desc: 'Bắt buộc cho ảnh đại diện Shopee/Lazada', size: '1080 x 1080 px' },
    ],
    guidelines: [
      { rule: 'Tỷ lệ 1:1 vuông bắt buộc', detail: 'Shopee Mall & Shop Yêu Thích yêu cầu 100% ảnh bìa phải đúng tỷ lệ 1:1, kích thước tối thiểu 1024x1024.' },
      { rule: 'Nền trắng sạch chiếm ưu thế', detail: 'Nền trắng studio giúp sản phẩm đạt điểm SEO gian hàng tối đa và tránh bị sàn bóp hiển thị.' },
      { rule: 'Căn giữa an toàn 75%', detail: 'Mivy tự động căn giữa và chừa lề an toàn 8% để không bị viền bo khung che khuất sản phẩm.' },
    ],
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Shop & Video',
    tag: 'CHUẨN SAFE ZONE',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    borderColor: 'hover:border-cyan-500/50',
    accentBg: 'from-cyan-500/10 to-pink-500/5',
    icon: Smartphone,
    defaultAspect: '9:16',
    availableAspects: [
      { id: '9:16', label: '9:16 Dọc Toàn Màn Hình', desc: 'Ảnh bìa video, Story & Livestream TikTok', size: '1080 x 1920 px' },
      { id: '1:1', label: '1:1 Catalog Giỏ Hàng', desc: 'Ảnh danh mục sản phẩm trong giỏ hàng TikTok Shop', size: '1080 x 1080 px' },
    ],
    guidelines: [
      { rule: 'Vùng an toàn Safe Zone', detail: 'TikTok có thanh tương tác bên phải (Tim, Share) và box giỏ hàng phía dưới. Sản phẩm được tự động đặt vào vùng an toàn.' },
      { rule: 'Hình ảnh sống động bắt mắt', detail: 'TikTok ưu tiên các tone màu Gradient hiện đại, độ tương phản cao thu hút người xem lướt feed.' },
    ],
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook & Instagram',
    tag: 'FEED TỐI ƯU',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    borderColor: 'hover:border-blue-500/50',
    accentBg: 'from-blue-500/10 to-indigo-500/5',
    icon: Share2,
    defaultAspect: '4:5',
    availableAspects: [
      { id: '4:5', label: '4:5 Dọc Feed', desc: 'Tối ưu diện tích hiển thị trên điện thoại', size: '1080 x 1350 px' },
      { id: '1:1', label: '1:1 Vuông Post', desc: 'Chuẩn bài đăng album hoặc Carousel', size: '1080 x 1080 px' },
    ],
    guidelines: [
      { rule: 'Chiếm trọn màn hình dọc (4:5)', detail: 'Khổ 4:5 chiếm diện tích gấp 1.25 lần so với ảnh vuông khi người dùng lướt Facebook/Insta feed.' },
      { rule: 'Bố cục sang trọng chuyên nghiệp', detail: 'Tự động tạo bóng đổ chân thực và phối nền studio cao cấp.' },
    ],
  },
};

export default function ImageStudioPage() {
  const [mode, setMode] = useState<StudioMode>('product');
  const [platform, setPlatform] = useState<TargetPlatform>('shopee');

  // Product Mode State
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string>('');
  const [productBackground, setProductBackground] = useState<'studio_white' | 'gradient'>('studio_white');
  const [productAspect, setProductAspect] = useState<AspectRatio>('1:1');
  const [productNote, setProductNote] = useState('');
  const [showSafeZone, setShowSafeZone] = useState(false);

  // Free Text Mode State
  const [prompt, setPrompt] = useState('Một tách cà phê latte art tinh tế đặt trên bàn gỗ sồi, ánh sáng buổi sáng tự nhiên');
  const [style, setStyle] = useState('cinematic');
  const [lighting, setLighting] = useState('natural');
  const [textAspect, setTextAspect] = useState<AspectRatio>('1:1');

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [cutoutUrl, setCutoutUrl] = useState('');
  const [completedPlatform, setCompletedPlatform] = useState<TargetPlatform>('shopee');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPlatformConfig = PLATFORMS[platform];

  const handleSelectPlatform = (plat: TargetPlatform) => {
    setPlatform(plat);
    const cfg = PLATFORMS[plat];
    setProductAspect(cfg.defaultAspect);
    if (plat === 'shopee') {
      setProductBackground('studio_white');
    } else {
      setProductBackground('gradient');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProductPreview(objectUrl);
    setErrorMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setProductFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProductPreview(objectUrl);
    setErrorMessage('');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setStatusText('Đang khởi tạo tác vụ theo tiêu chuẩn nền tảng…');
    setErrorMessage('');
    setResultUrl('');
    setCutoutUrl('');

    try {
      const form = new FormData();

      if (mode === 'product') {
        if (!productFile) {
          throw new Error('Vui lòng chọn hoặc thả ảnh sản phẩm cần xử lý vào ô tải ảnh.');
        }
        form.append('image', productFile);
        form.append('background', productBackground);
        form.append('aspect_ratio', productAspect);
        form.append('prompt', productNote.trim() || `Sản phẩm chuẩn hóa cho ${currentPlatformConfig.name}`);
      } else {
        if (!prompt.trim()) {
          throw new Error('Vui lòng nhập mô tả ý tưởng hình ảnh.');
        }
        form.append('prompt', `${prompt}, style: ${style}, lighting: ${lighting}`);
        form.append('aspect_ratio', textAspect);
      }

      setStatusText('Đang gửi dữ liệu đến máy chủ…');
      const accepted = await api('/v1/creative/images', {
        method: 'POST',
        body: form,
      });

      setStatusText(
        mode === 'product'
          ? `Đang căn chỉnh chuẩn ${currentPlatformConfig.name} & bóc tách nền…`
          : 'Đang kết xuất tác phẩm nghệ thuật…'
      );

      const job = await pollJob(accepted.job_id);
      if (job.status === 'completed') {
        const resUrl = `/v1/generations/${encodeURIComponent(accepted.job_id)}/result`;
        setResultUrl(resUrl);
        setCompletedPlatform(platform);
        if (mode === 'product') {
          setCutoutUrl(`/v1/generations/${encodeURIComponent(accepted.job_id)}/cutout`);
        }
        setStatusText(`Đã xuất ảnh hoàn chỉnh chuẩn ${currentPlatformConfig.name}!`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Chưa thể xử lý ảnh. Anh thử lại nhé.');
      setStatusText('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              E-COMMERCE STUDIO
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Shopee · TikTok Shop · Facebook
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            Chuẩn Hóa Ảnh Sản Phẩm Theo Nền Tảng
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Mỗi nền tảng có quy định kích thước và vùng an toàn riêng biệt. Chọn đúng kênh để Mivy tự động căn chỉnh chuẩn xác 100%.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('product')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'product'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ảnh Sản Phẩm (Theo Sàn)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'text'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Vẽ Ảnh AI Tự Do</span>
          </button>
        </div>
      </div>

      {/* PLATFORM CARDS SELECTOR (When in Product Mode) */}
      {mode === 'product' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Chọn Nền Tảng Cần Đăng Bán
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Tự động áp dụng bộ tiêu chuẩn duyệt ảnh của từng sàn
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(PLATFORMS) as TargetPlatform[]).map((platKey) => {
              const cfg = PLATFORMS[platKey];
              const Icon = cfg.icon;
              const isSelected = platform === platKey;

              return (
                <button
                  key={platKey}
                  type="button"
                  onClick={() => handleSelectPlatform(platKey)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? `border-white/30 bg-gradient-to-br ${cfg.accentBg} ring-2 ring-blue-500/50 shadow-xl`
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.badgeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{cfg.name}</h3>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeColor}`}>
                          {cfg.tag}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {platKey === 'shopee' && 'Chuẩn bắt buộc 1:1 vuông (1080x1080), nền trắng tinh khiết chuẩn Shopee Mall.'}
                    {platKey === 'tiktok' && 'Chuẩn 9:16 dọc toàn màn hình, né thanh tương tác bên phải & giỏ hàng.'}
                    {platKey === 'facebook' && 'Chuẩn 4:5 dọc điện thoại chiếm tối đa diện tích lướt feed Facebook/Insta.'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Form (5 cols) */}
        <form onSubmit={handleGenerate} className="md:col-span-5 glass-card p-6 rounded-2xl border border-white/10 space-y-6">
          {mode === 'product' ? (
            <>
              {/* Product Mode Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  2. Tải ảnh sản phẩm gốc <span className="text-red-400">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {productPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black/40 p-2.5 flex items-center justify-between gap-3">
                    <img
                      src={productPreview}
                      alt="Product preview"
                      className="w-16 h-16 object-contain rounded-lg bg-white/5 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{productFile?.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {productFile ? (productFile.size / 1024 / 1024).toFixed(2) : 0} MB · Đã sẵn sàng
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductFile(null);
                        setProductPreview('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Xóa ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-white/[0.02] flex flex-col items-center justify-center space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Kéo thả ảnh sản phẩm vào đây</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Hỗ trợ PNG, JPG, WEBP (tối đa 25MB)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tỷ lệ theo sàn */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  3. Tỷ lệ kích thước ({currentPlatformConfig.name})
                </label>
                <div className="space-y-2">
                  {currentPlatformConfig.availableAspects.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProductAspect(item.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        productAspect === item.id
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">{item.label}</p>
                        <p className={`text-[11px] ${productAspect === item.id ? 'text-white/80' : 'text-slate-500'}`}>
                          {item.desc}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-1 rounded ${
                        productAspect === item.id ? 'bg-black/20 text-white' : 'bg-white/5 text-slate-400'
                      }`}>
                        {item.size}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phông nền theo tiêu chuẩn sàn */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  4. Kiểu phông nền
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProductBackground('studio_white')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      productBackground === 'studio_white'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full border border-slate-400 bg-white mb-2" />
                    <p className="text-xs font-bold">Nền Trắng Studio</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {platform === 'shopee' ? 'Khuyên dùng cho Shopee Mall' : 'Phông nền tinh khiết'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductBackground('gradient')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      productBackground === 'gradient'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full border border-slate-400 bg-gradient-to-tr from-pink-200 to-indigo-200 mb-2" />
                    <p className="text-xs font-bold">Pastel Gradient</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {platform === 'tiktok' ? 'Khuyên dùng cho TikTok Shop' : 'Hiện đại, nổi bật'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Tiêu chuẩn sàn tóm tắt */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Quy chuẩn kỹ thuật áp dụng cho {currentPlatformConfig.name}:
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-400 pl-4 list-disc">
                  {currentPlatformConfig.guidelines.map((g, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <strong className="text-slate-300">{g.rule}:</strong> {g.detail}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Free Text-to-Image Form */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mô tả hình ảnh (Prompt) <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="VD: Chân dung chuyên gia công nghệ trong văn phòng hiện đại..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phong cách</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="cinematic">Điện ảnh (Cinematic)</option>
                    <option value="studio">Studio chụp mẫu</option>
                    <option value="minimalist">Tối giản (Minimalist)</option>
                    <option value="3d_render">3D Render nghệ thuật</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ánh sáng</label>
                  <select
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="natural">Tự nhiên ban ngày</option>
                    <option value="dramatic">Tương phản cao</option>
                    <option value="neon">Ánh sáng Neon Cyber</option>
                    <option value="warm">Ấm cúng hoàng hôn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tỷ lệ khung hình</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1:1', label: '1:1 Vuông' },
                    { id: '4:5', label: '4:5 Dọc' },
                    { id: '9:16', label: '9:16 Dọc Story' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTextAspect(item.id as AspectRatio)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        textAspect === item.id
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating || (mode === 'product' && !productFile)}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>
              {isGenerating
                ? 'Đang căn chỉnh & xử lý tác phẩm…'
                : mode === 'product'
                ? `Xuất Ảnh Chuẩn Đăng ${currentPlatformConfig.name}`
                : 'Bắt Đầu Tạo Ảnh AI'}
            </span>
          </button>

          {statusText && (
            <p className="text-center text-xs text-blue-400 animate-pulse font-medium">
              {statusText}
            </p>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-400">
                <span>⚠️ Lỗi xử lý:</span>
              </div>
              <p className="break-words font-mono text-[11px] opacity-90">{errorMessage}</p>
            </div>
          )}
        </form>

        {/* Right Output Showcase (7 cols) */}
        <div className="md:col-span-7 glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[500px]">
          {resultUrl ? (
            <div className="space-y-5 w-full flex flex-col items-center">
              {/* Badge platform info */}
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Đã chuẩn hóa cho {PLATFORMS[completedPlatform]?.name || 'Sàn TMĐT'}
                </span>

                {completedPlatform === 'tiktok' && (
                  <button
                    type="button"
                    onClick={() => setShowSafeZone(!showSafeZone)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                      showSafeZone
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showSafeZone ? 'Tắt lưới Safe Zone' : 'Xem Safe Zone TikTok'}</span>
                  </button>
                )}
              </div>

              {/* Preview Box with simulated safe zone if toggled */}
              <div className="relative rounded-2xl overflow-hidden border border-white/15 max-h-[520px] shadow-2xl bg-black/50 flex items-center justify-center p-2">
                <img
                  src={resultUrl}
                  alt="Generated result"
                  className="object-contain max-h-[480px] w-auto rounded-xl"
                />

                {/* Simulated TikTok Safe Zone Overlay */}
                {completedPlatform === 'tiktok' && showSafeZone && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-cyan-400/60 rounded-xl m-4 flex flex-col justify-between p-3 bg-cyan-950/20">
                    <div className="text-[10px] font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-start border border-cyan-500/30">
                      VÙNG AN TOÀN TIKTOK (SAFE ZONE)
                    </div>
                    <div className="text-right text-[10px] font-bold text-pink-300 bg-black/60 px-2 py-0.5 rounded self-end border border-pink-500/30">
                      Né thanh công cụ tương tác & giỏ hàng
                    </div>
                  </div>
                )}
              </div>

              {/* Action Downloads */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <a
                  href={resultUrl}
                  download={`mivy-${completedPlatform}-${Date.now()}.png`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải ảnh hoàn chỉnh (Đăng {PLATFORMS[completedPlatform]?.name})</span>
                </a>

                {cutoutUrl && (
                  <a
                    href={cutoutUrl}
                    download={`mivy-cutout-${Date.now()}.png`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors border border-white/15"
                  >
                    <Scissors className="w-4 h-4 text-emerald-400" />
                    <span>Tải bản tách nền (PNG trong suốt)</span>
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 text-center max-w-md">
                <span>✔ Đã căn tỷ lệ và kiểm tra tương thích 100% với quy chuẩn đăng ảnh của {PLATFORMS[completedPlatform]?.name}.</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <currentPlatformConfig.icon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Khung Xem Trước Chuẩn {currentPlatformConfig.name}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tải ảnh sản phẩm của anh ở khung bên trái. Mivy sẽ tự động xử lý tách nền, căn tỷ lệ và phủ bóng theo đúng tiêu chuẩn duyệt bài của {currentPlatformConfig.name}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
