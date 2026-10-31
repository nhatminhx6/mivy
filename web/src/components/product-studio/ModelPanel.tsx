'use client';
// Người mẫu AI (FASHN): chọn người mẫu gen sẵn → AI mặc đúng món đồ của shop. Cần đăng nhập, mỗi lần trừ tiền ví
// (đăng ký được tặng 1 lượt). Bản free = tab Nền studio (ảnh đồ trên nền đẹp).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Clapperboard, Download, ImagePlus, Loader2, LogIn, Shirt, Sparkles, Upload, Wallet } from 'lucide-react';
import { GARMENTS, MODELS, generateModelShot, handoffImage, type PhotoType, type ShotChoice } from '@/lib/model-shot';
import { ApiError, fmtDong, useAuth } from '@/lib/auth';
import { drawWatermark } from '@/lib/design-engine';
import { downloadBlob } from '@/lib/html-export';
import { scaleImage } from '@/lib/image-utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';
import type { SharedProduct } from '@/components/product-studio/BannerPanel';

const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`;
const PHOTOS: { id: PhotoType; name: string }[] = [{ id: 'flat-lay', name: 'Trải phẳng / treo móc' }, { id: 'model', name: 'Người đang mặc' }];

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
// đóng watermark Mivy lên ảnh kết quả
async function watermarked(dataUrl: string, maxSide = 1600): Promise<string> {
  const im = await loadImg(dataUrl);
  const k = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  drawWatermark(c);
  return c.toDataURL('image/jpeg', 0.92);
}

export function ModelPanel({ shared, onSend, onFree }: { shared?: SharedProduct; onSend?: (dataUrl: string, target: 'video' | 'studio') => void; onFree?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, ready, setBalance } = useAuth();
  const [product, setProduct] = useState<string | null>(null);
  const [choice, setChoice] = useState<ShotChoice>({ garment: 'top', model: MODELS[0].id, photo: 'flat-lay' });
  const [results, setResults] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (shared) setProduct(shared.src); }, [shared?.src]); // eslint-disable-line react-hooks/exhaustive-deps
  const price = me?.prices?.tryon ?? 2;
  const canPay = !!me && me.balance >= price;
  const loginHref = `/login?mode=register&next=${encodeURIComponent(pathname + (typeof window !== 'undefined' ? window.location.search : ''))}`;
  const set = (p: Partial<ShotChoice>) => setChoice((c) => ({ ...c, ...p }));

  const onFile = async (f?: File) => { if (f) { setProduct(await scaleImage(f, 1600)); setErr(''); } };
  const generate = async () => {
    if (!product) { setErr('Tải ảnh sản phẩm trước nhé.'); return; }
    if (!canPay) return;
    setBusy(true); setErr('');
    try {
      const r = await generateModelShot(product, choice, setStatus);
      setBalance(r.balance);
      const shot = await watermarked(r.image);
      setResults((x) => [shot, ...x].slice(0, 8)); setSel(0);
    } catch (e) {
      // AI lỗi → backend đã hoàn tiền, trả kèm số dư
      if (e instanceof ApiError && typeof e.data?.balance === 'number') setBalance(e.data.balance as number);
      setErr(e instanceof ApiError && e.status && e.status !== 500 ? `${e.message}${e.status >= 429 ? ' (đã hoàn tiền)' : ''}` : `Tạo ảnh lỗi: ${e instanceof Error ? e.message : 'thử lại sau'}`);
    } finally { setBusy(false); setStatus(''); }
  };

  const cur = results[sel];
  const download = async () => { if (cur) downloadBlob(await (await fetch(cur)).blob(), `mivy-thu-do-${Date.now()}.jpg`); };
  const send = (target: 'video' | 'studio') => {
    if (!cur) return;
    if (onSend) onSend(cur, target);
    else { handoffImage(target === 'video' ? 'video' : 'image', cur); router.push(target === 'video' ? '/studio/video' : '/studio/image'); }
  };
  const goFree = () => (onFree ? onFree() : router.push('/studio/image'));

  const quota = me
    ? <Link href="/studio/wallet" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:border-amber-400/60" data-testid="model-quota"><Wallet className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />Ví: {fmtDong(me.balance)} · {price} đồng/lượt</Link>
    : <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200" data-testid="model-quota">{price} đồng/lượt · đăng ký tặng 1 lượt</span>;
  const garmentChips = <div className="flex flex-wrap gap-1.5">{GARMENTS.map((g) => <button key={g.id} type="button" onClick={() => set({ garment: g.id })} className={chip(choice.garment === g.id)}>{g.name}</button>)}</div>;

  return (
    <div className={shared ? '' : 'p-6 lg:p-8'}>
      {!shared && <PageHeader title="Người mẫu AI" sub="Tải ảnh đồ của shop — AI mặc lên người mẫu thật." actions={quota} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-xs text-slate-400">Cần ảnh miễn phí, không giới hạn? Dùng <button type="button" onClick={goFree} className="underline text-slate-200 hover:text-white">Nền studio</button> — đặt ảnh đồ lên nền đẹp.</p>
        {shared && <span className="ml-auto">{quota}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <CollapsibleSection title={shared ? '1 · Loại đồ' : '1 · Ảnh sản phẩm'}>
            {shared ? (
              <div className="space-y-2">
                {garmentChips}
                <p className="text-[11px] text-slate-500">Dùng ảnh sản phẩm đang chọn ở trên. Nên là ảnh nguyên món đồ (trải phẳng, treo móc).</p>
              </div>
            ) : (
              <div className="flex gap-4 items-start">
                <button type="button" onClick={() => fileRef.current?.click()} className="w-28 h-36 shrink-0 rounded-xl border-2 border-dashed border-white/15 hover:border-indigo-400/60 bg-white/[0.03] flex items-center justify-center overflow-hidden" aria-label="Tải ảnh sản phẩm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {product ? <img src={product} alt="" className="w-full h-full object-contain bg-white" /> : <Shirt className="w-8 h-8 text-slate-500" />}
                </button>
                <div className="space-y-2.5 min-w-0">
                  <p className="text-xs text-slate-400 leading-relaxed">Ảnh <b className="text-slate-200">nguyên món đồ</b>: trải phẳng hoặc treo móc, nhìn thẳng.</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Upload className="w-3.5 h-3.5" /> {product ? 'Đổi ảnh' : 'Tải ảnh'}</button>
                  {garmentChips}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" data-testid="model-upload" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
            )}
          </CollapsibleSection>

              <CollapsibleSection title="2 · Người mẫu">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" data-testid="model-list">
                  {MODELS.map((m) => (
                    <button key={m.id} type="button" onClick={() => set({ model: m.id })} className={`rounded-xl overflow-hidden border-2 ${choice.model === m.id ? 'border-indigo-400' : 'border-transparent hover:border-white/30'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.src} alt={m.name} className="w-full aspect-[3/4] object-cover" />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Kho người mẫu đang được bổ sung thêm.</p>
              </CollapsibleSection>
              <CollapsibleSection title="3 · Ảnh đồ của bạn là">
                <div className="flex flex-wrap gap-1.5">{PHOTOS.map((p) => <button key={p.id} type="button" onClick={() => set({ photo: p.id })} className={chip(choice.photo === p.id)}>{p.name}</button>)}</div>
              </CollapsibleSection>
              {!ready ? null : !me ? (
                <Link href={loginHref} className="w-full mv-btn mv-btn-primary !flex justify-center !py-3 !text-sm" data-testid="model-login"><LogIn className="w-4 h-4" /> Đăng ký để tạo ảnh — tặng 1 lượt</Link>
              ) : canPay ? (
                <button type="button" onClick={generate} disabled={busy} className="w-full mv-btn mv-btn-primary !flex justify-center !py-3 !text-sm disabled:opacity-70" data-testid="model-generate">
                  {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {status || 'Đang tạo ảnh…'}</> : <><Sparkles className="w-4 h-4" /> Tạo ảnh người mẫu · {price} đồng</>}
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm space-y-2" data-testid="model-paywall">
                  <div className="font-bold text-amber-200 flex items-center gap-2"><Wallet className="w-4 h-4" /> Ví còn {fmtDong(me.balance)}, cần {price} đồng / lượt</div>
                  <p className="text-xs text-slate-300">Nạp 100k được 100 đồng ≈ {Math.floor(100 / price)} ảnh người mẫu. Nền studio vẫn miễn phí, không giới hạn.</p>
                  <div className="flex gap-2">
                    <Link href="/studio/wallet" className="mv-btn mv-btn-primary !px-3 !py-1.5 !text-xs"><Wallet className="w-3.5 h-3.5" /> Nạp tiền</Link>
                    <button type="button" onClick={goFree} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Shirt className="w-3.5 h-3.5" /> Dùng Nền studio</button>
                  </div>
                </div>
              )}
          {err && <p className="text-xs text-rose-300 text-center" data-testid="model-error">{err}</p>}
        </div>

        {/* Kết quả (ghim) */}
        <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-white">Kết quả</span>{busy && <span className="text-[11px] text-slate-300 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> {status || 'Đang tạo…'}</span>}</div>
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.04] border border-white/10 flex items-center justify-center" data-testid="model-result">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cur ? <img src={cur} alt="Ảnh người mẫu AI" className="w-full h-full object-contain" /> : busy ? <Loader2 className="w-8 h-8 animate-spin text-slate-500" /> : <div className="text-center text-xs text-slate-500 px-6"><ImagePlus className="w-8 h-8 mx-auto mb-2" />Ảnh người mẫu sẽ hiện ở đây</div>}
            {cur && <span className="absolute left-2 bottom-2 text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-950/70 text-slate-200">Ảnh minh hoạ AI</span>}
          </div>
          {results.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {results.map((r, i) => <button key={i} type="button" onClick={() => setSel(i)} className={`w-12 h-16 shrink-0 rounded-md overflow-hidden border-2 ${i === sel ? 'border-indigo-400' : 'border-transparent'}`}><img src={r} alt="" className="w-full h-full object-cover" /></button>)}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={download} disabled={!cur} className="mv-btn mv-btn-ghost !flex justify-center !px-1 !py-2 !text-xs disabled:opacity-40"><Download className="w-3.5 h-3.5" /> Tải ảnh</button>
            <button type="button" onClick={() => send('video')} disabled={!cur} className="mv-btn mv-btn-ghost !flex justify-center !px-1 !py-2 !text-xs disabled:opacity-40"><Clapperboard className="w-3.5 h-3.5" /> Làm video</button>
            <button type="button" onClick={() => send('studio')} disabled={!cur} className="mv-btn mv-btn-ghost !flex justify-center !px-1 !py-2 !text-xs disabled:opacity-40"><ImagePlus className="w-3.5 h-3.5" /> Đặt lên nền</button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 border-t border-white/10 pt-2.5">Ảnh bản free có watermark Mivy. Bạn chịu trách nhiệm ảnh đúng với sản phẩm thật khi đăng bán.</p>
        </div>
      </div>
    </div>
  );
}
