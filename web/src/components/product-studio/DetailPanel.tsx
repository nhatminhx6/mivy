'use client';
// Bộ ảnh chi tiết sản phẩm cho 1 sàn: điền chữ 1 lần → ảnh bìa, điểm nổi bật, thông số, bảng size, hướng dẫn, cam kết.
import { useEffect, useRef, useState } from 'react';
import { Download, Plus, X } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand } from '@/lib/brand-presets';
import { POSTER_THEMES, type PosterThemeId } from '@/lib/infographic-engine';
import { posterColorsFromBrand } from '@/lib/poster-engine';
import { DETAIL_PLATFORMS, DETAIL_SLIDES, POLICY_PRESETS, drawDetailSlide, slideHasContent, type DetailData, type DetailOpts, type DetailPlatformId, type DetailSlideId } from '@/lib/detail-set-engine';
import { marketingZip } from '@/lib/marketing-zip';
import { downloadBlob } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';

const KEY = 'mivy-detail-set';
const DEFAULT: DetailData = {
  name: 'Tên sản phẩm',
  tagline: 'Chất lượng tốt — giá hợp lý',
  badges: ['Chính hãng', 'Freeship'],
  features: [
    { title: 'Chất liệu cao cấp', desc: 'Bền đẹp, an toàn khi dùng hằng ngày' },
    { title: 'Thiết kế tiện lợi', desc: 'Nhỏ gọn, dễ mang theo mọi nơi' },
    { title: 'Giá tốt tại shop', desc: 'Nhiều ưu đãi khi mua combo' },
  ],
  specs: [{ k: 'Chất liệu', v: 'Ghi chất liệu' }, { k: 'Kích thước', v: 'Dài × rộng × cao' }, { k: 'Xuất xứ', v: 'Việt Nam' }, { k: 'Bảo quản', v: 'Nơi khô ráo, thoáng mát' }],
  sizeHead: ['Size', 'Cân nặng', 'Chiều cao'],
  sizeRows: [['S', '40–50kg', '150–158cm'], ['M', '50–58kg', '158–165cm'], ['L', '58–66kg', '165–172cm'], ['XL', '66–75kg', '170–178cm']],
  sizeNote: 'Bảng size chỉ mang tính tham khảo, có thể chênh 1–2cm do đo thủ công.',
  steps: ['Mở hộp, kiểm tra sản phẩm', 'Dùng theo hướng dẫn trên bao bì', 'Bảo quản nơi khô ráo sau khi dùng'],
  policies: POLICY_PRESETS.slice(0, 4),
  shop: '',
  hotline: '',
};
const DEFAULT_ON: DetailSlideId[] = ['cover', 'features', 'specs', 'policy'];

interface Saved { data: DetailData; on: DetailSlideId[]; platform: DetailPlatformId; themeId: PosterThemeId | 'brand' }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.92));

export function DetailPanel({ product }: { product: { src: string; cut?: string } }) {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [data, setData] = useState<DetailData>(DEFAULT);
  const [on, setOn] = useState<DetailSlideId[]>(DEFAULT_ON);
  const [platform, setPlatform] = useState<DetailPlatformId>('shopee');
  const [themeId, setThemeId] = useState<PosterThemeId | 'brand'>('blue');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fontsTick, setFontsTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const refs = useRef<Partial<Record<DetailSlideId, HTMLCanvasElement | null>>>({});

  useEffect(() => {
    const b = loadBrand(); setKit(b);
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
      if (v?.data) { setData({ ...DEFAULT, ...v.data }); setOn(v.on); setPlatform(v.platform); setThemeId(v.themeId === 'brand' && !b ? 'blue' : v.themeId); }
      else if (b) { setData((d) => ({ ...d, shop: b.name || '' })); setThemeId('brand'); }
    } catch { /* bỏ qua */ }
    setRestored(true);
    document.fonts?.ready.then(() => setFontsTick((n) => n + 1));
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(KEY, JSON.stringify({ data, on, platform, themeId } satisfies Saved)); } catch { /* bỏ qua */ }
  }, [restored, data, on, platform, themeId]);

  useEffect(() => {
    let live = true;
    loadImage(product.cut || product.src).then((im) => { if (live) setImg(im); }).catch(() => { if (live) setImg(null); });
    return () => { live = false; };
  }, [product.src, product.cut]);

  const colors = themeId === 'brand' && kit ? posterColorsFromBrand(kit) : (POSTER_THEMES.find((t) => t.id === themeId) || POSTER_THEMES[0]);
  const slides = DETAIL_SLIDES.filter((s) => on.includes(s.id) && slideHasContent(s.id, data));
  const plat = DETAIL_PLATFORMS.find((p) => p.id === platform)!;
  const opts = (slide: DetailSlideId, scale: number): DetailOpts => ({ slide, platform, data, img, colors, fontId: kit?.fontHeadingId, scale });

  useEffect(() => {
    for (const s of slides) { const c = refs.current[s.id]; if (c) drawDetailSlide(c, opts(s.id, 0.5)); }
  }); // vẽ lại mỗi lần render (≤6 canvas nhỏ, rẻ)

  const set = <K extends keyof DetailData>(k: K, v: DetailData[K]) => setData((d) => ({ ...d, [k]: v }));
  const toggle = (id: DetailSlideId) => setOn((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const render = async (id: DetailSlideId) => {
    await document.fonts?.ready;
    const c = document.createElement('canvas'); drawDetailSlide(c, opts(id, 1)); return toBlob(c);
  };
  const fileName = (i: number, id: DetailSlideId) => `${String(i + 1).padStart(2, '0')}-${slugify(DETAIL_SLIDES.find((s) => s.id === id)!.name)}.jpg`;
  const downloadOne = async (i: number, id: DetailSlideId) => { const b = await render(id); if (b) downloadBlob(b, fileName(i, id)); };
  const downloadAll = async () => {
    setBusy(true);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const [i, s] of slides.entries()) { const b = await render(s.id); if (b) files.push({ name: fileName(i, s.id), data: new Uint8Array(await b.arrayBuffer()) }); }
      downloadBlob(marketingZip(files), `mivy-${slugify(data.name, 'san-pham')}-${platform}.zip`);
    } finally { setBusy(false); }
  };

  const input = 'mv-input !py-2 !text-sm';
  const row = 'flex items-center gap-2';
  const del = (onClick: () => void) => <button type="button" onClick={onClick} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" title="Xoá dòng"><X className="w-4 h-4" /></button>;
  const add = (label: string, onClick: () => void, disabled = false) => <button type="button" onClick={onClick} disabled={disabled} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> {label}</button>;
  const box = (title: string, id: string, children: React.ReactNode) => (
    <section className="glass-panel border border-white/10 rounded-2xl p-4 space-y-2.5" data-testid={`detail-form-${id}`}>
      <div className="mv-label">{title}</div>{children}
    </section>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-6 items-start" data-testid="detail-panel">
      {/* Cột nhập liệu */}
      <div className="space-y-4">
        <section className="glass-panel border border-white/10 rounded-2xl p-4 space-y-3">
          <div>
            <div className="mv-label mb-2">Đăng lên sàn</div>
            <div className="mv-seg !grid grid-cols-2 w-full" data-testid="detail-platform">
              {DETAIL_PLATFORMS.map((p) => <button key={p.id} type="button" onClick={() => setPlatform(p.id)} data-active={platform === p.id} className="mv-seg-btn">{p.name}</button>)}
            </div>
          </div>
          <div>
            <div className="mv-label mb-2">Các ảnh trong bộ</div>
            <div className="flex flex-wrap gap-1.5" data-testid="detail-slides">
              {DETAIL_SLIDES.map((s) => (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} data-active={on.includes(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on.includes(s.id) ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`}>{s.name}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mv-label mb-2">Màu</div>
            <div className="flex flex-wrap gap-2">
              {kit && <button type="button" onClick={() => setThemeId('brand')} title="Màu thương hiệu" className={`h-8 px-3 rounded-full border text-xs font-semibold ${themeId === 'brand' ? 'border-white text-white bg-white/10' : 'border-white/15 text-slate-300'}`}>Thương hiệu</button>}
              {POSTER_THEMES.map((t) => <button key={t.id} type="button" onClick={() => setThemeId(t.id)} title={t.name} aria-label={t.name} className={`w-8 h-8 rounded-full border-2 ${themeId === t.id ? 'border-white' : 'border-transparent'}`} style={{ background: t.main }} />)}
            </div>
          </div>
        </section>

        {box('Sản phẩm', 'basic', <>
          <input className={input} value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Tên sản phẩm" data-testid="detail-name" />
          {on.includes('cover') && <>
            <input className={input} value={data.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Câu mô tả ngắn (ảnh bìa)" />
            <input className={input} value={data.badges.join(', ')} onChange={(e) => set('badges', e.target.value.split(','))} placeholder="Nhãn góc ảnh bìa, cách nhau dấu phẩy (tối đa 3)" />
          </>}
          <div className="grid grid-cols-2 gap-2">
            <input className={input} value={data.shop} onChange={(e) => set('shop', e.target.value)} placeholder="Tên shop" />
            <input className={input} value={data.hotline} onChange={(e) => set('hotline', e.target.value)} placeholder="Hotline / Zalo" />
          </div>
        </>)}

        {on.includes('features') && box('Điểm nổi bật (tối đa 5)', 'features', <>
          {data.features.map((f, i) => (
            <div key={i} className={row}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input className={input} value={f.title} onChange={(e) => set('features', data.features.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={`Điểm ${i + 1}`} />
                <input className={`${input} !text-xs`} value={f.desc} onChange={(e) => set('features', data.features.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} placeholder="Giải thích ngắn" />
              </div>
              {del(() => set('features', data.features.filter((_, j) => j !== i)))}
            </div>
          ))}
          {add('Thêm điểm', () => set('features', [...data.features, { title: '', desc: '' }]), data.features.length >= 5)}
        </>)}

        {on.includes('specs') && box('Thông số (tối đa 10)', 'specs', <>
          {data.specs.map((s, i) => (
            <div key={i} className={row}>
              <input className={`${input} w-2/5`} value={s.k} onChange={(e) => set('specs', data.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="Tên" />
              <input className={`${input} flex-1 min-w-0`} value={s.v} onChange={(e) => set('specs', data.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} placeholder="Giá trị" />
              {del(() => set('specs', data.specs.filter((_, j) => j !== i)))}
            </div>
          ))}
          {add('Thêm dòng', () => set('specs', [...data.specs, { k: '', v: '' }]), data.specs.length >= 10)}
        </>)}

        {on.includes('size') && box('Bảng size', 'size', <>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="border-separate border-spacing-1">
              <thead><tr>
                {data.sizeHead.map((h, j) => (
                  <th key={j}><div className="flex items-center">
                    <input className={`${input} !w-24 !font-bold`} value={h} onChange={(e) => set('sizeHead', data.sizeHead.map((x, k) => (k === j ? e.target.value : x)))} placeholder="Cột" />
                    {data.sizeHead.length > 1 && del(() => { set('sizeHead', data.sizeHead.filter((_, k) => k !== j)); set('sizeRows', data.sizeRows.map((r) => r.filter((_, k) => k !== j))); })}
                  </div></th>
                ))}
              </tr></thead>
              <tbody>
                {data.sizeRows.map((r, i) => (
                  <tr key={i}>
                    {data.sizeHead.map((_, j) => (
                      <td key={j}><input className={`${input} !w-24`} value={r[j] || ''} onChange={(e) => set('sizeRows', data.sizeRows.map((x, k) => (k === i ? data.sizeHead.map((_, m) => (m === j ? e.target.value : x[m] || '')) : x)))} /></td>
                    ))}
                    <td>{del(() => set('sizeRows', data.sizeRows.filter((_, k) => k !== i)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            {add('Thêm dòng', () => set('sizeRows', [...data.sizeRows, data.sizeHead.map(() => '')]), data.sizeRows.length >= 10)}
            {add('Thêm cột', () => set('sizeHead', [...data.sizeHead, '']), data.sizeHead.length >= 6)}
          </div>
          <input className={`${input} !text-xs`} value={data.sizeNote} onChange={(e) => set('sizeNote', e.target.value)} placeholder="Ghi chú dưới bảng" />
        </>)}

        {on.includes('steps') && box('Hướng dẫn dùng (tối đa 5 bước)', 'steps', <>
          {data.steps.map((s, i) => (
            <div key={i} className={row}>
              <span className="w-6 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <input className={`${input} flex-1 min-w-0`} value={s} onChange={(e) => set('steps', data.steps.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Bước ${i + 1}`} />
              {del(() => set('steps', data.steps.filter((_, j) => j !== i)))}
            </div>
          ))}
          {add('Thêm bước', () => set('steps', [...data.steps, '']), data.steps.length >= 5)}
        </>)}

        {on.includes('policy') && box('Cam kết shop (tối đa 6)', 'policy', <>
          <div className="flex flex-wrap gap-1.5">
            {POLICY_PRESETS.map((p) => {
              const has = data.policies.some((x) => x.icon === p.icon);
              return <button key={p.icon} type="button" disabled={!has && data.policies.length >= 6} onClick={() => set('policies', has ? data.policies.filter((x) => x.icon !== p.icon) : [...data.policies, p])}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border disabled:opacity-40 ${has ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>{p.text}</button>;
            })}
          </div>
          {data.policies.map((p, i) => (
            <input key={p.icon} className={input} value={p.text} onChange={(e) => set('policies', data.policies.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          ))}
        </>)}
      </div>

      {/* Xem trước cả bộ */}
      <div className="glass-panel border border-white/10 rounded-2xl p-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-xs text-slate-400">
            {slides.length} ảnh · {plat.name} {plat.w}×{plat.h}
            {slides.length > plat.max && <span className="text-amber-400"> · {plat.name} chỉ nhận {plat.max} ảnh</span>}
          </div>
          <button type="button" onClick={downloadAll} disabled={busy || !slides.length} className="mv-btn mv-btn-primary !py-2 !text-xs disabled:opacity-50" data-testid="detail-download">
            <Download className="w-4 h-4" /> {busy ? 'Đang xuất…' : 'Tải cả bộ'}
          </button>
        </div>
        {!slides.length ? (
          <div className="p-10 text-center text-sm text-slate-400">Chọn ít nhất 1 ảnh và điền nội dung.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3" data-testid="detail-preview">
            {slides.map((s, i) => (
              <div key={`${s.id}-${platform}-${fontsTick}`} className="space-y-1.5">
                <canvas ref={(el) => { refs.current[s.id] = el; }} data-slide={s.id} className="block w-full h-auto rounded-lg shadow-lg" style={{ aspectRatio: `${plat.w}/${plat.h}` }} />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">{i + 1}. {s.name}</span>
                  <button type="button" onClick={() => downloadOne(i, s.id)} className="p-1 rounded text-slate-400 hover:text-white" title="Tải ảnh này"><Download className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
