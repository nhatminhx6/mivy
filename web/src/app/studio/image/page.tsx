'use client';

import { useState } from 'react';
import { Sparkles, Download, Image as ImageIcon, Wand2, RefreshCw } from 'lucide-react';
import { api, pollJob } from '@/lib/api';

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState('Một tách cà phê latte art tinh tế đặt trên bàn gỗ sồi, ánh sáng buổi sáng tự nhiên');
  const [style, setStyle] = useState('cinematic');
  const [lighting, setLighting] = useState('natural');
  const [aspect, setAspect] = useState<'1:1' | '4:5' | '16:9'>('4:5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [statusText, setStatusText] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setStatusText('Đang khởi tạo tác vụ tạo ảnh…');
    setResultUrl('');

    try {
      const form = new FormData();
      form.append('prompt', `${prompt}, style: ${style}, lighting: ${lighting}`);
      form.append('aspect_ratio', aspect);

      const accepted = await api('/v1/creative/images', {
        method: 'POST',
        body: form,
      });

      setStatusText('Đang vẽ ảnh bằng AI…');
      const job = await pollJob(accepted.job_id);
      if (job.status === 'completed') {
        setResultUrl(`/v1/generations/${encodeURIComponent(accepted.job_id)}/result`);
        setStatusText('Tạo ảnh thành công!');
      }
    } catch (err: any) {
      alert(err.message || 'Chưa tạo được ảnh. Anh thử lại nhé.');
      setStatusText('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          IMAGE STUDIO
        </span>
        <h1 className="text-2xl font-black text-white mt-2">Tạo Ảnh Nghệ Thuật & Thương Mại</h1>
        <p className="text-slate-400 text-xs mt-1">
          Mô tả ý tưởng hình ảnh, chọn phong cách chiếu sáng và để AI kết xuất tác phẩm theo tỷ lệ mong muốn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Input Form (5 cols) */}
        <form onSubmit={handleGenerate} className="md:col-span-5 glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mô tả hình ảnh (Prompt)
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
                { id: '16:9', label: '16:9 Ngang' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspect(item.id as any)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    aspect === item.id
                      ? 'bg-blue-500 text-white border-blue-400'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-xs hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Đang tạo ảnh AI…' : 'Bắt Đầu Tạo Ảnh'}</span>
          </button>

          {statusText && (
            <p className="text-center text-xs text-blue-400 animate-pulse font-medium">
              {statusText}
            </p>
          )}
        </form>

        {/* Right Output Showcase (7 cols) */}
        <div className="md:col-span-7 glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[440px]">
          {resultUrl ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="rounded-2xl overflow-hidden border border-white/10 max-h-[500px] shadow-2xl">
                <img src={resultUrl} alt="Generated result" className="object-contain max-h-[500px] w-auto" />
              </div>
              <a
                href={resultUrl}
                download={`mivy-image-${Date.now()}.png`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh độ phân giải gốc</span>
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Chưa có ảnh nào được tạo</p>
              <p className="text-xs max-w-xs text-slate-500">
                Nhập mô tả ở khung bên trái và bấm Bắt đầu tạo ảnh để xem kết quả tại đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
