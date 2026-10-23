'use client';
// Bộ ấn phẩm thương hiệu vẽ bằng HTML ở ĐÚNG kích thước thật (xuất PNG nét, không AI):
// brand board, avatar, bìa Facebook, ảnh bìa highlight, name card 2 mặt, tem dán, thiệp cảm ơn.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { ChatCircleDots, Globe, MapPin, Phone, ShoppingBag, Tag, Star, Heart, Truck, Percent, Gift, Storefront, Camera, Sparkle, Crown, Coffee, Megaphone, type Icon } from '@phosphor-icons/react';
import type { Palette } from '@/lib/brand-presets';
import { LogoSvg, LogoTone, fontById, type LogoSpec } from '@/lib/logo-engine';

export interface PackCtx {
  name: string; slogan: string; p: Palette; headFontId: string; logo?: string;
  phone?: string; web?: string; address?: string;
  highlights?: HLItem[];
}

const B = "'Be Vietnam Pro', sans-serif";
const SCRIPT = "'Dancing Script', cursive";
const head = (c: PackCtx) => { const f = fontById(c.headFontId); return { fontFamily: `'${f.family}'`, fontWeight: f.weight }; };
const lum = (h: string) => { const s = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const onColor = (h: string) => (lum(h) > 0.55 ? '#0f172a' : '#ffffff');

// Logo: ảnh trong bộ nhận diện (tô đen/trắng bằng filter) hoặc logo chữ tạm sinh bằng engine logo.
export function LogoMark({ c, tone = 'color', frame, style }: { c: PackCtx; tone?: LogoTone; frame?: 'avatar'; style: CSSProperties }) {
  if (!c.logo) {
    const spec: LogoSpec = { id: 'pack', kind: 'word-dot', fontId: c.headFontId, palette: c.p, icon: 'store', shape: 'circle', accent: 'dot' };
    return <LogoSvg spec={spec} name={c.name} slogan="" tone={tone} frame={frame} style={style} />;
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.logo} alt="" style={{ display: 'block', objectFit: 'contain', filter: tone === 'white' ? 'brightness(0) invert(1)' : tone === 'black' ? 'brightness(0)' : undefined, ...(frame ? { width: '72%', height: '72%' } : style) }} />
  );
  if (frame === 'avatar') return <div style={{ ...style, borderRadius: '50%', background: c.p.colorSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{img}</div>;
  return img;
}

const box = (w: string, h: string): CSSProperties => ({ width: w, height: h });

function ContactLines({ c, color, size, iconColor }: { c: PackCtx; color: string; size: number; iconColor: string }) {
  const rows: [Icon, string | undefined][] = [[Phone, c.phone], [Globe, c.web], [MapPin, c.address]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.45 }}>
      {rows.filter(([, v]) => v).map(([I, v]) => (
        <div key={v} style={{ display: 'flex', alignItems: 'center', gap: size * 0.5, fontFamily: B, fontWeight: 500, fontSize: size, color, lineHeight: 1.25 }}>
          <I size={size * 1.15} color={iconColor} weight="fill" style={{ flex: 'none' }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- 1. Brand board 1600×1200 ----------
function BrandBoard({ c }: { c: PackCtx }) {
  const p = c.p;
  const sw: [string, string][] = [['Màu chính', p.colorPrimary], ['Màu phụ', p.colorSecondary], ['Màu nhấn', p.colorAccent], ['Màu chữ', p.colorInk], ['Màu nền', p.colorSurface]];
  const card: CSSProperties = { background: '#ffffff', borderRadius: 28, boxShadow: '0 18px 40px rgba(15,23,42,.08)', overflow: 'hidden', position: 'relative' };
  return (
    <div style={{ width: 1600, height: 1200, boxSizing: 'border-box', padding: 64, background: p.colorSurface, display: 'grid', gridTemplateColumns: '1.55fr 1fr', gridTemplateRows: '110px 1fr 300px', gap: 28, fontFamily: B, color: p.colorInk }}>
      <div style={{ gridColumn: '1 / 3', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 20, letterSpacing: '0.3em', color: p.colorAccent }}>BỘ NHẬN DIỆN THƯƠNG HIỆU</div>
          <div style={{ ...head(c), fontSize: 64, lineHeight: 1.1, color: p.colorPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
        </div>
        {c.slogan && <div style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: 44, color: p.colorAccent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 620 }}>{c.slogan}</div>}
      </div>
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 70 }}>
        <LogoMark c={c} style={box('100%', '100%')} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sw.map(([n, col]) => (
          <div key={n} style={{ flex: 1, borderRadius: 20, background: col, border: col === p.colorSurface ? '2px solid rgba(15,23,42,.12)' : 'none', padding: '0 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: onColor(col) }}>
            <span style={{ fontWeight: 600, fontSize: 24 }}>{n}</span>
            <span style={{ fontWeight: 500, fontSize: 24, letterSpacing: '0.08em' }}>{col.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div style={{ gridColumn: '1 / 3', display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 28 }}>
        <div style={{ ...card, padding: '34px 40px', display: 'flex', alignItems: 'center', gap: 36 }}>
          <div style={{ ...head(c), fontSize: 150, lineHeight: 1, color: p.colorPrimary }}>Aa</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: '0.2em', color: p.colorAccent }}>FONT TIÊU ĐỀ</div>
            <div style={{ ...head(c), fontSize: 34, color: p.colorPrimary, marginTop: 4 }}>{fontById(c.headFontId).family}</div>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: '0.2em', color: p.colorAccent, marginTop: 22 }}>FONT NỘI DUNG</div>
            <div style={{ fontWeight: 500, fontSize: 30, marginTop: 4 }}>Be Vietnam Pro</div>
          </div>
        </div>
        <div style={{ ...card, background: p.colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50 }}>
          <LogoMark c={c} tone="white" style={box('100%', '100%')} />
        </div>
        <div style={{ ...card, background: p.colorAccent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 210, height: 210, borderRadius: '50%', boxShadow: '0 0 0 10px rgba(255,255,255,.35)' }}>
            <LogoMark c={c} frame="avatar" style={box('100%', '100%')} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 2. Avatar 1000×1000 (vùng an toàn hình tròn) ----------
function Avatar({ c, dark }: { c: PackCtx; dark?: boolean }) {
  return (
    <div style={{ width: 1000, height: 1000, background: dark ? c.p.colorPrimary : c.p.colorSurface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LogoMark c={c} tone={dark ? 'white' : 'color'} style={box('64%', '64%')} />
    </div>
  );
}

// ---------- 3. Bìa Facebook 1640×624 ----------
function FbCover({ c }: { c: PackCtx }) {
  const p = c.p;
  return (
    <div style={{ width: 1640, height: 624, position: 'relative', overflow: 'hidden', background: `linear-gradient(120deg, ${p.colorPrimary} 0%, ${p.colorSecondary} 100%)`, fontFamily: B }}>
      <div style={{ position: 'absolute', left: 60, top: 50, width: 260, height: 180, opacity: 0.16, backgroundImage: 'radial-gradient(#ffffff 2.4px, transparent 2.8px)', backgroundSize: '26px 26px' }} />
      <div style={{ position: 'absolute', left: 1160, top: -170, width: 640, height: 640, borderRadius: '50%', background: p.colorAccent, opacity: 0.92 }} />
      <div style={{ position: 'absolute', left: 1040, top: 330, width: 420, height: 420, borderRadius: '50%', border: '3px solid rgba(255,255,255,.22)' }} />
      <div style={{ position: 'absolute', left: 1250, top: 90, width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoMark c={c} tone="white" style={box('100%', '100%')} />
      </div>
      <div style={{ position: 'absolute', left: 140, top: 0, bottom: 0, width: 900, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ ...head(c), fontSize: 84, lineHeight: 1.05, color: '#ffffff' }}>{c.name}</div>
        {c.slogan && <div style={{ fontWeight: 500, fontSize: 32, color: 'rgba(255,255,255,.82)', marginTop: 16 }}>{c.slogan}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 40 }}>
          {[[Phone, c.phone], [Globe, c.web]].filter(([, v]) => v).map(([I, v]) => { const Ic = I as Icon; return (
            <span key={v as string} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.14)', border: '1.5px solid rgba(255,255,255,.25)', borderRadius: 999, padding: '12px 24px', fontWeight: 600, fontSize: 24, color: '#ffffff' }}>
              <Ic size={26} color="#ffffff" weight="fill" />{v as string}
            </span>); })}
        </div>
      </div>
    </div>
  );
}

// ---------- 4. Ảnh bìa highlight 1080×1080 ----------
export interface HLItem { id: string; icon: string; label: string }
// Kho icon chọn cho bìa Highlight (phosphor)
export const HL_ICONS: { id: string; name: string; Icon: Icon }[] = [
  { id: 'bag', name: 'Túi mua sắm', Icon: ShoppingBag }, { id: 'store', name: 'Cửa hàng', Icon: Storefront },
  { id: 'tag', name: 'Nhãn giá', Icon: Tag }, { id: 'percent', name: 'Giảm giá', Icon: Percent },
  { id: 'gift', name: 'Quà tặng', Icon: Gift }, { id: 'chat', name: 'Tin nhắn', Icon: ChatCircleDots },
  { id: 'star', name: 'Ngôi sao', Icon: Star }, { id: 'heart', name: 'Trái tim', Icon: Heart },
  { id: 'phone', name: 'Điện thoại', Icon: Phone }, { id: 'truck', name: 'Giao hàng', Icon: Truck },
  { id: 'mappin', name: 'Địa chỉ', Icon: MapPin }, { id: 'camera', name: 'Máy ảnh', Icon: Camera },
  { id: 'sparkle', name: 'Lấp lánh', Icon: Sparkle }, { id: 'crown', name: 'Vương miện', Icon: Crown },
  { id: 'coffee', name: 'Cà phê', Icon: Coffee }, { id: 'mega', name: 'Loa thông báo', Icon: Megaphone },
];
export const hlIcon = (id: string): Icon => HL_ICONS.find((x) => x.id === id)?.Icon || ShoppingBag;
export const DEFAULT_HIGHLIGHTS: HLItem[] = [
  { id: 'san-pham', icon: 'bag', label: 'Sản phẩm' }, { id: 'feedback', icon: 'chat', label: 'Feedback' },
  { id: 'uu-dai', icon: 'tag', label: 'Ưu đãi' }, { id: 'lien-he', icon: 'phone', label: 'Liên hệ' },
];
function Highlight({ c, h }: { c: PackCtx; h: HLItem }) {
  const I = hlIcon(h.icon);
  return (
    <div style={{ width: 1080, height: 1080, background: `radial-gradient(circle at 30% 25%, ${c.p.colorAccent} 0%, ${c.p.colorPrimary} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 170, borderRadius: '50%', border: '6px solid rgba(255,255,255,.28)' }} />
      <I size={380} color="#ffffff" weight="bold" />
    </div>
  );
}
export function highlightAssets(list: HLItem[]): AssetDef[] {
  return list.map((h) => ({ id: `highlight-${h.id}`, label: `Highlight · ${h.label}`, folder: '02-mang-xa-hoi', w: 1080, h: 1080, render: (c: PackCtx) => <Highlight c={c} h={h} /> }));
}

// ---------- 5. Name card 1050×600 (3.5×2 inch @300dpi) ----------
function CardFront({ c }: { c: PackCtx }) {
  const p = c.p;
  return (
    <div style={{ width: 1050, height: 600, background: '#ffffff', boxSizing: 'border-box', padding: 64, display: 'flex', alignItems: 'center', gap: 48, fontFamily: B }}>
      <div style={{ width: 340, height: 360, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoMark c={c} style={box('100%', '100%')} />
      </div>
      <div style={{ minWidth: 0, flex: 1, borderLeft: `4px solid ${p.colorAccent}`, paddingLeft: 40 }}>
        <div style={{ ...head(c), fontSize: 50, lineHeight: 1.1, color: p.colorPrimary }}>{c.name}</div>
        {c.slogan && <div style={{ fontWeight: 600, fontSize: 19, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.colorAccent, marginTop: 12 }}>{c.slogan}</div>}
        <div style={{ marginTop: 36 }}><ContactLines c={c} color={p.colorInk} size={23} iconColor={p.colorAccent} /></div>
      </div>
    </div>
  );
}
function CardBack({ c }: { c: PackCtx }) {
  return (
    <div style={{ width: 1050, height: 600, background: c.p.colorPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34, fontFamily: B }}>
      <div style={{ width: 560, height: 300 }}><LogoMark c={c} tone="white" style={box('100%', '100%')} /></div>
      {c.slogan && <div style={{ fontWeight: 600, fontSize: 20, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)' }}>{c.slogan}</div>}
    </div>
  );
}

// ---------- 6. Tem dán hộp tròn 1000×1000 (nền trong suốt ngoài vòng tròn) ----------
function Sticker({ c }: { c: PackCtx }) {
  const R = 400;
  const top = c.name.toLocaleUpperCase('vi');
  // chữ chạy vòng dài hơn cung sẽ bị CẮT im lặng → co cỡ chữ theo độ dài tên (cung trên ≈ πR, chừa 15%)
  const topSize = Math.min(46, (Math.PI * R * 0.85) / (0.8 * Math.max(1, Array.from(top).length)));
  return (
    <div style={{ width: 1000, height: 1000, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c.p.colorPrimary }} />
      <svg viewBox="0 0 1000 1000" width={1000} height={1000} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <path id="stk-top" d={`M${500 - R} 500 A${R} ${R} 0 0 1 ${500 + R} 500`} />
          <path id="stk-bot" d={`M${500 - R - 26} 500 A${R + 26} ${R + 26} 0 0 0 ${500 + R + 26} 500`} />
        </defs>
        <circle cx={500} cy={500} r={455} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth={4} strokeDasharray="14 12" />
        <text fontFamily={B} fontWeight={600} fontSize={topSize} letterSpacing="0.16em" fill="#ffffff" textAnchor="middle">
          <textPath href="#stk-top" startOffset="50%">{top}</textPath>
        </text>
        <text fontFamily={SCRIPT} fontWeight={700} fontSize={58} fill={c.p.colorAccent === c.p.colorPrimary ? '#ffffff' : c.p.colorAccent} textAnchor="middle">
          <textPath href="#stk-bot" startOffset="50%">Cảm ơn bạn ♥</textPath>
        </text>
      </svg>
      <div style={{ position: 'absolute', left: 280, top: 300, width: 440, height: 400 }}>
        <LogoMark c={c} tone="white" style={box('100%', '100%')} />
      </div>
    </div>
  );
}

// ---------- 7. Thiệp cảm ơn A6 ngang 1748×1240 (@300dpi) ----------
function ThankYou({ c }: { c: PackCtx }) {
  const p = c.p;
  return (
    <div style={{ width: 1748, height: 1240, display: 'flex', fontFamily: B }}>
      <div style={{ width: 620, flex: 'none', background: p.colorPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: 70, boxSizing: 'border-box' }}>
        <div style={{ width: 440, height: 380 }}><LogoMark c={c} tone="white" style={box('100%', '100%')} /></div>
        {c.slogan && <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)', textAlign: 'center' }}>{c.slogan}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0, background: p.colorSurface, padding: '110px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', color: p.colorInk }}>
        <div style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: 150, lineHeight: 1, color: p.colorAccent }}>Cảm ơn bạn!</div>
        <div style={{ fontWeight: 500, fontSize: 38, lineHeight: 1.55, marginTop: 50 }}>
          Cảm ơn bạn đã tin chọn <b style={{ fontWeight: 600, color: p.colorPrimary }}>{c.name}</b>. Mỗi đơn hàng đều được chúng mình chuẩn bị thật kỹ — mong bạn thật hài lòng!
        </div>
        <div style={{ marginTop: 50, alignSelf: 'flex-start', background: '#ffffff', border: `2px solid ${p.colorAccent}`, borderRadius: 24, padding: '24px 34px', fontWeight: 600, fontSize: 30, color: p.colorPrimary }}>
          Theo dõi shop để nhận ưu đãi sớm nhất nhé ♥
        </div>
        <div style={{ flex: 1 }} />
        <ContactLines c={c} color={p.colorSecondary} size={28} iconColor={p.colorAccent} />
      </div>
    </div>
  );
}

// ---------- 8. Phiếu ưu đãi (voucher) 1500×600 ----------
function Voucher({ c }: { c: PackCtx }) {
  const p = c.p;
  const code = (c.name || 'SHOP').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'SHOP';
  return (
    <div style={{ width: 1500, height: 600, display: 'flex', fontFamily: B, background: p.colorSurface, overflow: 'hidden' }}>
      <div style={{ width: 520, flex: 'none', background: p.colorPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 56, boxSizing: 'border-box' }}>
        <div style={{ width: 320, height: 240 }}><LogoMark c={c} tone="white" style={box('100%', '100%')} /></div>
        {c.slogan && <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', textAlign: 'center' }}>{c.slogan}</div>}
      </div>
      <div style={{ width: 0, borderLeft: `4px dashed ${p.colorSecondary}`, opacity: 0.45 }} />
      <div style={{ flex: 1, minWidth: 0, padding: '56px 64px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: p.colorInk }}>
        <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '0.24em', color: p.colorAccent }}>PHIẾU ƯU ĐÃI</div>
        <div style={{ ...head(c), fontSize: 112, lineHeight: 1, color: p.colorPrimary, marginTop: 6 }}>GIẢM 10%</div>
        <div style={{ fontWeight: 500, fontSize: 28, color: p.colorSecondary, marginTop: 16 }}>Áp dụng cho đơn từ 200.000đ</div>
        <div style={{ marginTop: 28, alignSelf: 'flex-start', border: `2px dashed ${p.colorAccent}`, borderRadius: 14, padding: '14px 28px', fontWeight: 700, fontSize: 30, letterSpacing: '0.12em', color: p.colorPrimary }}>MÃ: {code}10</div>
        <div style={{ marginTop: 26 }}><ContactLines c={c} color={p.colorSecondary} size={22} iconColor={p.colorAccent} /></div>
      </div>
    </div>
  );
}

// ---------- 9. Thẻ tích điểm 1050×600 ----------
function LoyaltyCard({ c }: { c: PackCtx }) {
  const p = c.p;
  return (
    <div style={{ width: 1050, height: 600, background: p.colorSurface, boxSizing: 'border-box', padding: 56, display: 'flex', flexDirection: 'column', fontFamily: B, color: p.colorInk }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ width: 300, height: 92 }}><LogoMark c={c} style={{ width: '100%', height: '100%', objectFit: 'contain' } as CSSProperties} /></div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '0.18em', color: p.colorAccent }}>THẺ TÍCH ĐIỂM</div>
      </div>
      <div style={{ ...head(c), fontSize: 38, color: p.colorPrimary, marginTop: 16 }}>Tích đủ 10 tem — Tặng 1 phần</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, width: '100%' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: `3px dashed ${p.colorAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, color: p.colorAccent, opacity: 0.55 }}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div style={{ fontWeight: 500, fontSize: 20, color: p.colorSecondary }}>{[c.phone, c.web].filter(Boolean).join('  ·  ') || 'Cảm ơn bạn đã ủng hộ shop ♥'}</div>
    </div>
  );
}

// ---------- 10. Tag treo sản phẩm 650×920 (nền trong suốt ngoài thẻ) ----------
function HangTag({ c }: { c: PackCtx }) {
  const p = c.p;
  return (
    <div style={{ width: 650, height: 920, position: 'relative', fontFamily: B }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 44, background: p.colorPrimary }} />
      <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', width: 54, height: 54, borderRadius: '50%', border: `9px solid ${p.colorSurface}` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '160px 54px 64px', boxSizing: 'border-box' }}>
        <div style={{ width: 320, height: 280 }}><LogoMark c={c} tone="white" style={box('100%', '100%')} /></div>
        {c.slogan && <div style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: 50, color: p.colorAccent, textAlign: 'center', lineHeight: 1.1 }}>{c.slogan}</div>}
        <div style={{ width: 120, height: 4, borderRadius: 2, background: p.colorAccent }} />
        <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: '0.08em', color: 'rgba(255,255,255,.82)', textAlign: 'center', whiteSpace: 'pre-line' }}>{[c.phone, c.web].filter(Boolean).join('\n') || 'Cảm ơn bạn ♥'}</div>
      </div>
    </div>
  );
}

// ---------- danh mục ----------
export interface AssetDef { id: string; label: string; folder: string; w: number; h: number; render: (c: PackCtx) => ReactNode }
export const BOARD: AssetDef = { id: 'brand-board', label: 'Brand board', folder: '', w: 1600, h: 1200, render: (c) => <BrandBoard c={c} /> };
export const SOCIAL: AssetDef[] = [
  { id: 'avatar-nen-sang', label: 'Avatar nền sáng', folder: '02-mang-xa-hoi', w: 1000, h: 1000, render: (c) => <Avatar c={c} /> },
  { id: 'avatar-nen-toi', label: 'Avatar nền tối', folder: '02-mang-xa-hoi', w: 1000, h: 1000, render: (c) => <Avatar c={c} dark /> },
  { id: 'bia-facebook', label: 'Bìa Facebook', folder: '02-mang-xa-hoi', w: 1640, h: 624, render: (c) => <FbCover c={c} /> },
];
export const PRINT: AssetDef[] = [
  { id: 'namecard-mat-truoc', label: 'Name card · mặt trước', folder: '03-an-pham-in', w: 1050, h: 600, render: (c) => <CardFront c={c} /> },
  { id: 'namecard-mat-sau', label: 'Name card · mặt sau', folder: '03-an-pham-in', w: 1050, h: 600, render: (c) => <CardBack c={c} /> },
  { id: 'tem-dan-hop', label: 'Tem dán hộp', folder: '03-an-pham-in', w: 1000, h: 1000, render: (c) => <Sticker c={c} /> },
  { id: 'thiep-cam-on', label: 'Thiệp cảm ơn A6', folder: '03-an-pham-in', w: 1748, h: 1240, render: (c) => <ThankYou c={c} /> },
  { id: 'voucher', label: 'Phiếu ưu đãi', folder: '03-an-pham-in', w: 1500, h: 600, render: (c) => <Voucher c={c} /> },
  { id: 'the-tich-diem', label: 'Thẻ tích điểm', folder: '03-an-pham-in', w: 1050, h: 600, render: (c) => <LoyaltyCard c={c} /> },
  { id: 'tag-treo', label: 'Tag treo sản phẩm', folder: '03-an-pham-in', w: 650, h: 920, render: (c) => <HangTag c={c} /> },
];

// Xem trước thu nhỏ: node bên trong giữ ĐÚNG kích thước thật (xuất PNG từ node này, bỏ transform).
export function Scaled({ w, h, nodeRef, children }: { w: number; h: number; nodeRef?: RefObject<HTMLDivElement> | ((el: HTMLDivElement | null) => void); children: ReactNode }) {
  const outer = useRef<HTMLDivElement | null>(null);
  const [s, setS] = useState(0.2);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth / w));
    ro.observe(el);
    setS(el.clientWidth / w);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={outer} style={{ width: '100%', aspectRatio: `${w} / ${h}`, position: 'relative', overflow: 'hidden' }}>
      <div ref={nodeRef} data-asset style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}
