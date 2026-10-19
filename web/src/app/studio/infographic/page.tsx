'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Flame } from 'lucide-react';
import { drawInfographic, InfographicData, InfographicRow, InfographicStyleId, INFOGRAPHIC_STYLES } from '@/lib/infographic-engine';

type Aspect = '1:1' | '4:5' | '9:16';

const TEMPLATES: { name: string; style: InfographicStyleId; data: InfographicData }[] = [
  {
    name: 'Reality / Hot-take (so sánh)', style: 'cyber',
    data: {
      kicker: 'Chia sẻ thật', title: 'React Native', title2: 'Reality 📱',
      hook: 'Nhìn thì dễ… tới lúc ship lên production 😅',
      rows: [
        { icon: '🤖', left: 'Android chạy ngon', right: 'iOS vỡ trận' },
        { icon: '🐞', left: 'Debug thì ổn', right: 'Release crash' },
        { icon: '⌨️', left: 'UI nhìn đẹp', right: 'Bật bàn phím là hỏng' },
        { icon: '📱', left: 'Máy nào cũng chạy', right: 'Trừ 1 máy của sếp' },
      ],
      insight: 'Trải nghiệm thật bắt đầu ở nơi tutorial kết thúc.',
      cta: 'Anh em thấy đúng không? 👇', brand: '✸ mivy',
    },
  },
  {
    name: 'Sự thật phũ bán hàng (so sánh)', style: 'violet',
    data: {
      kicker: 'Sự thật phũ', title: 'Bán hàng Online', title2: 'nhìn dễ mà… 🥲',
      hook: 'Ai cũng tưởng cứ đăng là có đơn',
      rows: [
        { icon: '📸', left: 'Chụp ảnh đẹp', right: 'Vẫn không ai bấm vào' },
        { icon: '💬', left: 'Rep tin nhắn 24/7', right: '“Để em hỏi lại” rồi mất hút' },
        { icon: '🚚', left: 'Giá rẻ nhất sàn', right: 'Khách vẫn so giá' },
        { icon: '⭐', left: 'Hàng xịn thật', right: '1 sao vì shipper trễ' },
      ],
      insight: 'Khác biệt nằm ở thương hiệu, không phải giá.',
      cta: 'Chủ shop nào thấm điểm nào? 👇', brand: '✸ mivy',
    },
  },
  {
    name: 'Tips / Checklist (liệt kê)', style: 'sunset',
    data: {
      kicker: '5 điều ước', title: 'Giá mà biết sớm', title2: 'khi mới bán hàng',
      hook: 'Tiết kiệm anh em vài tháng mò mẫm 🔥',
      rows: [
        { icon: '🎯', left: 'Chọn 1 tệp khách thật rõ, đừng bán cho tất cả' },
        { icon: '🖼️', left: 'Ảnh/banner nhất quán ăn đứt chạy quảng cáo bừa' },
        { icon: '🔁', left: 'Khách cũ mua lại > tốn tiền kéo khách mới' },
        { icon: '📊', left: 'Đo số mỗi ngày, đừng bán theo cảm tính' },
      ],
      insight: 'Làm đều 1 việc nhỏ mỗi ngày > bùng nổ 1 hôm.',
      cta: 'Lưu lại để làm dần nhé 👇', brand: '✸ mivy',
    },
  },
];

export default function InfographicStudio() {
  const [style, setStyle] = useState<InfographicStyleId>('cyber');
  const [aspect, setAspect] = useState<Aspect>('4:5');
  const [data, setData] = useState<InfographicData>(TEMPLATES[0].data);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const render = () => { const c = canvasRef.current; if (c) drawInfographic(c, data, style, aspect, 1); };
    render();
    (document as any).fonts?.ready?.then(render);
  }, [data, style, aspect]);

  const set = (patch: Partial<InfographicData>) => setData((d) => ({ ...d, ...patch }));
  const setRow = (i: number, patch: Partial<InfographicRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const addRow = () => setData((d) => ({ ...d, rows: [...d.rows, { icon: '✅', left: 'Ý mới', right: '' }] }));
  const delRow = (i: number) => setData((d) => ({ ...d, rows: d.rows.filter((_, idx) => idx !== i) }));

  const loadTemplate = (t: typeof TEMPLATES[number]) => { setStyle(t.style); setData(t.data); };

  const download = () => {
    const c = document.createElement('canvas');
    drawInfographic(c, data, style, aspect, 2);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `mivy-infographic-${style}.png`;
    a.click();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h1 className="mv-h1 !text-2xl flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Infographic trend</h1>
        <p className="mv-sub !mt-0.5">Điền nội dung → preview đổi ngay → tải PNG. Render 100% bằng code (không tốn AI).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
        {/* CỘT TRÁI: điều khiển */}
        <div className="space-y-5 min-w-0">
          {/* Mẫu dựng sẵn */}
          <div className="glass-card p-5 rounded-2xl space-y-3 hover:!transform-none">
            <div className="mv-label">Chọn mẫu để bắt đầu</div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.name} type="button" onClick={() => loadTemplate(t)}
                  className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs">{t.name}</button>
              ))}
            </div>
          </div>

          {/* Phong cách + khổ */}
          <div className="glass-card p-5 rounded-2xl space-y-4 hover:!transform-none">
            <div>
              <div className="mv-label mb-1.5">Phong cách</div>
              <div className="flex flex-wrap gap-1.5">
                {INFOGRAPHIC_STYLES.map((s) => (
                  <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${style === s.id ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mv-label mb-1.5">Khổ</div>
              <div className="flex gap-1.5">
                {(['4:5', '1:1', '9:16'] as Aspect[]).map((a) => (
                  <button key={a} type="button" onClick={() => setAspect(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${aspect === a ? 'bg-indigo-500/15 border-indigo-500/50 text-white' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'}`}>
                    {a === '4:5' ? 'Dọc 4:5' : a === '1:1' ? 'Vuông 1:1' : 'Story 9:16'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nội dung */}
          <div className="glass-card p-5 rounded-2xl space-y-3 hover:!transform-none">
            <div className="mv-label">Nội dung</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <L label="Nhãn trên (kicker)"><input className="mv-input" value={data.kicker || ''} onChange={(e) => set({ kicker: e.target.value })} placeholder="VD: Sự thật phũ" /></L>
              <L label="Thương hiệu / watermark"><input className="mv-input" value={data.brand || ''} onChange={(e) => set({ brand: e.target.value })} placeholder="✸ mivy" /></L>
              <L label="Tiêu đề (dòng 1)"><input className="mv-input" value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder="VD: Bán hàng Online" /></L>
              <L label="Tiêu đề (dòng 2)"><input className="mv-input" value={data.title2 || ''} onChange={(e) => set({ title2: e.target.value })} placeholder="VD: nhìn dễ mà… 🥲" /></L>
            </div>
            <L label="Câu móc (hook)"><input className="mv-input" value={data.hook || ''} onChange={(e) => set({ hook: e.target.value })} placeholder="VD: Ai cũng tưởng cứ đăng là có đơn" /></L>
          </div>

          {/* Các dòng */}
          <div className="glass-card p-5 rounded-2xl space-y-3 hover:!transform-none">
            <div className="flex items-center justify-between">
              <div className="mv-label">Các dòng — để trống ô phải = kiểu liệt kê; điền ô phải = so sánh</div>
            </div>
            <div className="space-y-2.5">
              {data.rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="mv-input !w-12 !px-2 text-center" value={r.icon || ''} onChange={(e) => setRow(i, { icon: e.target.value })} placeholder="🔥" title="Emoji" />
                  <input className="mv-input flex-1 min-w-0" value={r.left} onChange={(e) => setRow(i, { left: e.target.value })} placeholder="Vế trái" />
                  <input className="mv-input flex-1 min-w-0" value={r.right || ''} onChange={(e) => setRow(i, { right: e.target.value })} placeholder="Vế phải (tùy chọn)" />
                  <button type="button" onClick={() => delRow(i)} className="mv-btn mv-btn-ghost !p-2 !text-rose-300" title="Xoá dòng"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs"><Plus className="w-3.5 h-3.5" /> Thêm dòng</button>
          </div>

          {/* Chốt + CTA */}
          <div className="glass-card p-5 rounded-2xl space-y-3 hover:!transform-none">
            <L label="Câu chốt (hộp nổi bật)"><input className="mv-input" value={data.insight || ''} onChange={(e) => set({ insight: e.target.value })} placeholder="VD: Khác biệt nằm ở thương hiệu, không phải giá." /></L>
            <L label="CTA (câu hỏi tương tác)"><input className="mv-input" value={data.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="VD: Chủ shop nào thấm? 👇" /></L>
          </div>
        </div>

        {/* CỘT PHẢI: preview ghim + tải */}
        <div className="lg:sticky lg:top-4 self-start space-y-3">
          <div className="glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Xem trước</span>
              <span className="text-[10px] font-semibold text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 rounded-full">PNG · 2×</span>
            </div>
            <button type="button" onClick={download} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm">
              <Download className="w-4 h-4" /> <span>Tải ảnh PNG</span>
            </button>
          </div>
          <div className="glass-panel rounded-2xl p-3 border border-white/10">
            <canvas ref={canvasRef} className="w-full h-auto rounded-xl bg-black block" />
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mv-label block mb-1.5">{label}</span>{children}</label>;
}
