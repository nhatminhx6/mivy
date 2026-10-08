'use client';

import { useEffect, useState } from 'react';
import { Check, Upload, X, Palette, Phone, MessageCircle, MapPin, Globe, Facebook } from 'lucide-react';
import { BrandKit } from '@/types';
import { COLOR_PRESETS, FONT_PRESETS, VOICE_OPTIONS, DEFAULT_BRAND, fontFamilyById, contactLine, loadBrand, saveBrand } from '@/lib/brand-presets';
import LogoMakerPage from '../logo/page';

export default function BrandKitPage() {
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'kit' | 'logo'>('kit');

  useEffect(() => { const b = loadBrand(); if (b) setBrand(b); }, []);

  const update = (patch: Partial<BrandKit>) => { setBrand((b) => ({ ...b, ...patch })); setSaved(false); };
  const updateContact = (patch: Partial<NonNullable<BrandKit['contact']>>) => update({ contact: { ...brand.contact, ...patch } });

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('Logo nên dưới 2MB.'); return; }
    const r = new FileReader();
    r.onload = () => update({ logo: r.result as string });
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const handleSave = () => { if (saveBrand(brand)) { setSaved(true); setTimeout(() => setSaved(false), 2500); } };

  const presetActive = (p: typeof COLOR_PRESETS[number]) =>
    p.colorPrimary === brand.colorPrimary && p.colorAccent === brand.colorAccent && p.colorSecondary === brand.colorSecondary;

  const head = fontFamilyById(brand.fontHeadingId), body = fontFamilyById(brand.fontBodyId);
  const cl = contactLine(brand.contact);

  const contactFields: { key: keyof NonNullable<BrandKit['contact']>; label: string; icon: React.ElementType; ph: string }[] = [
    { key: 'phone', label: 'Số điện thoại', icon: Phone, ph: '0909 123 456' },
    { key: 'zalo', label: 'Zalo', icon: MessageCircle, ph: '0909 123 456' },
    { key: 'address', label: 'Địa chỉ', icon: MapPin, ph: '12 Lê Lợi, Q.1, TP.HCM' },
    { key: 'website', label: 'Website', icon: Globe, ph: 'nami.vn' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, ph: 'fb.com/nami' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="glass-panel p-6 rounded-2xl">
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">THƯƠNG HIỆU</span>
        <h1 className="text-2xl font-black text-white mt-2">Bộ nhận diện thương hiệu</h1>
        <p className="text-slate-400 text-xs mt-1">Nhập một lần — mọi poster và ảnh sẽ tự dùng màu, font, logo, slogan và liên hệ của anh.</p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => setTab('kit')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'kit' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Nhận diện</button>
          <button type="button" onClick={() => setTab('logo')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'logo' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Tạo logo</button>
        </div>
      </div>

      {tab === 'logo' && <LogoMakerPage />}
      {tab === 'kit' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tên thương hiệu</label>
            <input value={brand.name} onChange={(e) => update({ name: e.target.value })} placeholder="VD: Nami Aquarium"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Slogan / Khẩu hiệu</label>
            <input value={brand.slogan || ''} onChange={(e) => update({ slogan: e.target.value })} placeholder="VD: Thế giới thủy sinh trong nhà bạn"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">Logo</label>
            <div className="flex items-center gap-3">
              {brand.logo
                ? <div className="relative"><img src={brand.logo} alt="logo" className="h-16 w-16 object-contain rounded-lg bg-white/10 p-1" />
                    <button type="button" onClick={() => update({ logo: undefined })} className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div>
                : <label className="h-16 w-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-emerald-500">
                    <Upload className="w-5 h-5 text-slate-400" /><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={handleLogo} /></label>}
              <p className="text-slate-500 text-[11px]">PNG nền trong suốt đẹp nhất · dưới 2MB</p>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-emerald-400" />Bảng màu</label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((p) => (
                <button key={p.name} type="button" title={p.name}
                  onClick={() => update({ colorPrimary: p.colorPrimary, colorSecondary: p.colorSecondary, colorAccent: p.colorAccent, colorInk: p.colorInk, colorSurface: p.colorSurface })}
                  className={`h-12 rounded-lg overflow-hidden border-2 flex ${presetActive(p) ? 'border-emerald-500' : 'border-white/10 hover:border-white/30'}`}>
                  <span className="flex-1" style={{ background: p.colorPrimary }} />
                  <span className="flex-1" style={{ background: p.colorSecondary }} />
                  <span className="w-1/4" style={{ background: p.colorAccent }} />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {([['colorPrimary', 'Chủ đạo'], ['colorSecondary', 'Phụ'], ['colorAccent', 'Nhấn'], ['colorInk', 'Chữ'], ['colorSurface', 'Nền sáng']] as const).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-1.5 text-slate-400">
                  <input type="color" value={brand[k]} onChange={(e) => update({ [k]: e.target.value } as Partial<BrandKit>)} className="w-7 h-7 rounded bg-transparent border border-white/10" />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Font tiêu đề</label>
              <select value={brand.fontHeadingId} onChange={(e) => update({ fontHeadingId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white">
                {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <p className="mt-1 text-white text-lg" style={{ fontFamily: head }}>Tiêu đề</p>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Font nội dung</label>
              <select value={brand.fontBodyId} onChange={(e) => update({ fontBodyId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white">
                {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <p className="mt-1 text-slate-300" style={{ fontFamily: body }}>Nội dung tiếng Việt</p>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">Giọng văn</label>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button key={v.id} type="button" onClick={() => update({ voice: v.id })}
                  className={`text-left px-3.5 py-2.5 rounded-xl border-2 ${brand.voice === v.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'}`}>
                  <b className="text-white block">{v.name}</b><span className="text-slate-400 text-[11px]">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">Thông tin liên hệ <span className="text-slate-500">· hiện ở chân poster</span></label>
            <div className="space-y-2">
              {contactFields.map(({ key, label, icon: Icon, ph }) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input value={brand.contact?.[key] || ''} onChange={(e) => updateContact({ [key]: e.target.value })} placeholder={`${label} · ${ph}`}
                    className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleSave}
            className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 flex items-center justify-center gap-2">
            {saved ? <><Check className="w-4 h-4" />Đã lưu</> : 'Lưu thương hiệu'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3 lg:sticky lg:top-4">
          <p className="text-xs text-slate-400 font-semibold">Xem trước</p>
          <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/5] flex flex-col justify-between p-8" style={{ background: brand.colorPrimary }}>
            <div>
              <div className="flex items-center gap-3">
                {brand.logo && <img src={brand.logo} alt="logo" className="h-9 object-contain" />}
                <span className="font-bold text-sm" style={{ color: '#fff', fontFamily: head }}>{(brand.name || 'THƯƠNG HIỆU').toUpperCase()}</span>
              </div>
              {brand.slogan && <p className="mt-1 text-xs" style={{ color: brand.colorAccent, fontFamily: body }}>{brand.slogan}</p>}
            </div>
            <div>
              <h2 className="text-4xl font-black leading-tight" style={{ color: '#fff', fontFamily: head }}>Tiêu đề quảng cáo nổi bật</h2>
              <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: body }}>Thông điệp phụ đi kèm chiến dịch của anh.</p>
            </div>
            <div>
              {cl && <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: body }}>{cl}</p>}
              <div className="inline-flex self-start items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm" style={{ background: brand.colorAccent, color: '#fff', fontFamily: head }}>Liên hệ ngay →</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Màu, font, logo, slogan và liên hệ này sẽ tự áp vào poster ở mục Tạo quảng cáo.</p>
        </div>
      </div>
      )}
    </div>
  );
}
