'use client';
// CV khổ A4 (794×1123px @96dpi) — chọn mẫu → điền → tải PDF/PNG. Mẫu = bố cục × màu × font, render HTML bằng code 100%.
// Nội dung dài: tự thu nhỏ chữ (biến --k) cho vừa 1 trang.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link2, Mail, MapPin, Phone } from 'lucide-react';

export const CV_W = 794, CV_H = 1123;
export const CV_FONT_CSS = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Montserrat:wght@600;700;800&family=Lora:wght@400;600;700&family=Playfair+Display:wght@600;700;800&display=swap');";

export interface CvJob { role: string; org: string; time: string; desc: string }
export interface CvEdu { school: string; degree: string; time: string }
export interface CvData {
  name: string; title: string; phone: string; email: string; address: string; link: string; summary: string; photo?: string;
  jobs: CvJob[]; edus: CvEdu[]; skills: string; langs: string; hobbies: string;
}
export type CvLayout = 'sidebar' | 'classic' | 'banner' | 'timeline' | 'split' | 'gutter' | 'cards' | 'centered' | 'bold' | 'ats';
export interface CvSpec { layout: CvLayout; palette: string; font: string; color?: string } // palette 'custom' → dùng color

export const CV_LAYOUTS: { id: CvLayout; name: string }[] = [
  { id: 'sidebar', name: 'Cột màu bên trái' },
  { id: 'classic', name: 'Cổ điển 1 cột' },
  { id: 'banner', name: 'Đầu trang màu' },
  { id: 'timeline', name: 'Dòng thời gian' },
  { id: 'split', name: 'Hai cột tối giản' },
  { id: 'gutter', name: 'Tiêu đề lề trái' },
  { id: 'cards', name: 'Khối thẻ' },
  { id: 'centered', name: 'Ảnh ở giữa' },
  { id: 'bold', name: 'Tên cỡ lớn' },
  { id: 'ats', name: 'Gọn, chuẩn ATS' },
];
export const CV_PALETTES: { id: string; name: string; accent: string; dark: string; soft: string }[] = [
  { id: 'navy', name: 'Navy', accent: '#1f3a68', dark: '#16243f', soft: '#e8edf5' },
  { id: 'charcoal', name: 'Than chì', accent: '#2b2f36', dark: '#1f2227', soft: '#eceef1' },
  { id: 'burgundy', name: 'Đỏ rượu', accent: '#7a1f2b', dark: '#4a1219', soft: '#f5e9eb' },
  { id: 'blue', name: 'Xanh dương', accent: '#2457c5', dark: '#173a85', soft: '#e7eefb' },
  { id: 'brown', name: 'Nâu cà phê', accent: '#8a5a2b', dark: '#4b3017', soft: '#f6eee4' },
];
export const CV_FONTS: { id: string; name: string; head: string; body: string; headW: number }[] = [
  { id: 'vietnam', name: 'Hiện đại', head: '"Be Vietnam Pro"', body: '"Be Vietnam Pro"', headW: 800 },
  { id: 'montserrat', name: 'Mạnh mẽ', head: 'Montserrat', body: '"Be Vietnam Pro"', headW: 800 },
  { id: 'playfair', name: 'Thanh lịch', head: '"Playfair Display"', body: '"Be Vietnam Pro"', headW: 700 },
  { id: 'lora', name: 'Cổ điển', head: 'Lora', body: 'Lora', headW: 700 },
];
export const CV_DEFAULT: CvSpec = { layout: 'sidebar', palette: 'navy', font: 'vietnam' };

// pha màu: t=0 giữ nguyên, t=1 ra hẳn màu đích
const mix = (hex: string, to: string, t: number) => {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return '#' + [16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('');
};
// màu tự chọn → đủ bộ accent / dark (nền cột, đầu trang) / soft (nền nhạt, chip)
export function cvPalette(spec: CvSpec) {
  if (spec.palette === 'custom' && /^#[0-9a-f]{6}$/i.test(spec.color || '')) {
    const c = spec.color!;
    return { id: 'custom', name: 'Màu khác', accent: mix(c, '#000000', 0.1), dark: mix(c, '#000000', 0.35), soft: mix(c, '#ffffff', 0.9) };
  }
  return CV_PALETTES.find((x) => x.id === spec.palette) || CV_PALETTES[0];
}

export const emptyJob = (): CvJob => ({ role: '', org: '', time: '', desc: '' });
export const emptyEdu = (): CvEdu => ({ school: '', degree: '', time: '' });
export const sampleCv = (): CvData => ({
  name: 'Trần Quốc Bảo', title: 'Chuyên viên Marketing', phone: '0901 234 567', email: 'quocbao.tran@gmail.com',
  address: 'Quận 3, TP. Hồ Chí Minh', link: 'linkedin.com/in/quocbao',
  summary: '4 năm kinh nghiệm marketing số cho thương hiệu bán lẻ và F&B. Mạnh về lên kế hoạch nội dung, chạy quảng cáo Facebook/TikTok và đo hiệu quả bằng số liệu.',
  jobs: [
    { role: 'Chuyên viên Marketing', org: 'Công ty TNHH Bánh Mì Sài Gòn', time: '03/2023 – nay', desc: 'Lên kế hoạch nội dung tháng cho 3 kênh mạng xã hội\nChạy quảng cáo ngân sách 150 triệu/tháng, giảm 28% chi phí mỗi đơn\nPhối hợp ra mắt 5 sản phẩm mới' },
    { role: 'Nhân viên Content', org: 'Agency Sao Việt', time: '06/2021 – 02/2023', desc: 'Viết bài và kịch bản video ngắn cho 8 khách hàng\nQuản lý lịch đăng và báo cáo hiệu quả hằng tuần\nĐạt 1,2 triệu lượt xem cho chiến dịch Tết 2022' },
    { role: 'Thực tập sinh Marketing', org: 'Chuỗi cà phê Phố Xưa', time: '09/2020 – 05/2021', desc: 'Hỗ trợ tổ chức 4 sự kiện khai trương cửa hàng\nKhảo sát khách hàng, tổng hợp báo cáo cho trưởng phòng' },
  ],
  edus: [
    { school: 'Đại học Kinh tế TP.HCM', degree: 'Cử nhân Marketing', time: '2017 – 2021' },
    { school: 'Google', degree: 'Chứng chỉ Digital Marketing', time: '2022' },
  ],
  skills: 'Facebook Ads, TikTok Ads, Google Analytics, Canva, Viết content, Lên kế hoạch',
  langs: 'Tiếng Anh — IELTS 7.0', hobbies: 'Chụp ảnh, chạy bộ',
});

// ---------- mảnh dùng chung ----------
const px = (n: number) => `calc(${n}px * var(--k))`;
const lines = (s: string) => s.split('\n').map((l) => l.replace(/^\s*[-•*+]\s*/, '').trim()).filter(Boolean);
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const initials = (n: string) => n.trim().split(/\s+/).slice(-2).map((w) => w[0] || '').join('').toUpperCase() || 'CV';

interface Ctx { d: CvData; p: (typeof CV_PALETTES)[number]; f: (typeof CV_FONTS)[number] }

function Photo({ c, size, ring, square, bg }: { c: Ctx; size: number; ring?: string; square?: boolean; bg?: string }) {
  const st: CSSProperties = { width: px(size), height: px(size), borderRadius: square ? px(10) : '50%', flexShrink: 0, border: ring ? `${px(4)} solid ${ring}` : undefined, objectFit: 'cover', display: 'block' };
  if (c.d.photo) return <img src={c.d.photo} alt="" style={st} />; // eslint-disable-line @next/next/no-img-element
  return <div style={{ ...st, background: bg || c.p.soft, color: c.p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: c.f.head, fontWeight: 800, fontSize: px(size * 0.34) }}>{initials(c.d.name)}</div>;
}

function Title({ c, children, color, line = true }: { c: Ctx; children: ReactNode; color?: string; line?: boolean }) {
  const col = color || c.p.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(10), margin: `0 0 ${px(10)}` }}>
      <div style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(14), letterSpacing: '0.12em', textTransform: 'uppercase', color: col, whiteSpace: 'nowrap' }}>{children}</div>
      {line && <div style={{ flex: 1, height: 1.5, background: col, opacity: 0.25 }} />}
    </div>
  );
}

function Contacts({ c, color, iconColor }: { c: Ctx; color: string; iconColor: string }) {
  const rows = [[Phone, c.d.phone], [Mail, c.d.email], [MapPin, c.d.address], [Link2, c.d.link]] as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(7) }}>
      {rows.filter(([, v]) => v.trim()).map(([I, v], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(8), fontSize: px(11.5), color, overflowWrap: 'anywhere' }}>
          <I size={13} color={iconColor} style={{ flexShrink: 0 }} /> <span>{v}</span>
        </div>
      ))}
    </div>
  );
}
function ContactsInline({ c, color }: { c: Ctx; color: string }) {
  const v = [c.d.phone, c.d.email, c.d.address, c.d.link].filter((x) => x.trim());
  return <div style={{ fontSize: px(12), color, display: 'flex', flexWrap: 'wrap', columnGap: px(14), rowGap: px(4) }}>{v.map((x, i) => <span key={i}>{x}</span>)}</div>;
}

function Jobs({ c, timeline }: { c: Ctx; timeline?: boolean }) {
  const jobs = c.d.jobs.filter((j) => j.role.trim() || j.org.trim());
  if (!jobs.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(14) }}>
      {jobs.map((j, i) => (
        <div key={i} style={{ position: 'relative', paddingLeft: timeline ? px(22) : 0 }}>
          {timeline && <>
            <div style={{ position: 'absolute', left: px(4), top: px(5), width: px(10), height: px(10), borderRadius: '50%', background: c.p.accent }} />
            {i < jobs.length - 1 && <div style={{ position: 'absolute', left: px(8.25), top: px(18), bottom: px(-14), width: 1.5, background: c.p.accent, opacity: 0.3 }} />}
          </>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(10), alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700, fontSize: px(14), color: '#15181d' }}>{j.role}</div>
            <div style={{ fontSize: px(11.5), color: c.p.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>{j.time}</div>
          </div>
          {j.org && <div style={{ fontSize: px(12.5), color: '#4a515c', fontWeight: 500, marginTop: px(2) }}>{j.org}</div>}
          {lines(j.desc).length > 0 && (
            <ul style={{ margin: `${px(6)} 0 0`, paddingLeft: px(16), fontSize: px(12.5), lineHeight: 1.5, color: '#2c3138' }}>
              {lines(j.desc).map((l, k) => <li key={k} style={{ marginBottom: px(2) }}>{l}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
function Edus({ c, color = '#15181d', sub = '#4a515c', time }: { c: Ctx; color?: string; sub?: string; time?: string }) {
  const edus = c.d.edus.filter((e) => e.school.trim() || e.degree.trim());
  if (!edus.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
      {edus.map((e, i) => (
        <div key={i}>
          <div style={{ fontWeight: 700, fontSize: px(13.5), color }}>{e.degree || e.school}</div>
          {e.degree && e.school && <div style={{ fontSize: px(12.5), color: sub, marginTop: px(2) }}>{e.school}</div>}
          {e.time && <div style={{ fontSize: px(11.5), color: time || c.p.accent, fontWeight: 600, marginTop: px(2) }}>{e.time}</div>}
        </div>
      ))}
    </div>
  );
}
function Chips({ c, items, bg, color }: { c: Ctx; items: string[]; bg: string; color: string }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(6) }}>{items.map((s, i) => <span key={i} style={{ background: bg, color, fontSize: px(11.5), fontWeight: 600, padding: `${px(4)} ${px(10)}`, borderRadius: 999 }}>{s}</span>)}</div>;
}
function Bullets({ items, color }: { items: string[]; color: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: px(5) }}>{items.map((s, i) => <div key={i} style={{ fontSize: px(12.5), color, display: 'flex', gap: px(8) }}><span style={{ opacity: 0.6 }}>•</span><span>{s}</span></div>)}</div>;
}
const Block = ({ children, gap = 22 }: { children: ReactNode; gap?: number }) => <div style={{ marginBottom: px(gap) }}>{children}</div>;
function Summary({ c, color = '#2c3138' }: { c: Ctx; color?: string }) {
  return c.d.summary.trim() ? <div style={{ fontSize: px(12.5), lineHeight: 1.6, color, whiteSpace: 'pre-line' }}>{c.d.summary}</div> : null;
}
function Name({ c, color, size = 34 }: { c: Ctx; color: string; size?: number }) {
  return <div style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(size), lineHeight: 1.1, color, letterSpacing: '-0.01em' }}>{c.d.name || 'Họ và tên'}</div>;
}
function Role({ c, color, size = 15 }: { c: Ctx; color: string; size?: number }) {
  return c.d.title ? <div style={{ fontSize: px(size), fontWeight: 600, color, marginTop: px(6), letterSpacing: '0.02em' }}>{c.d.title}</div> : null;
}

// ---------- bố cục ----------
function Layout({ c, layout }: { c: Ctx; layout: CvLayout }) {
  const { d, p } = c;
  const skills = list(d.skills), langs = list(d.langs), hobbies = list(d.hobbies);
  const hasEdu = d.edus.some((e) => e.school.trim() || e.degree.trim()), hasJob = d.jobs.some((j) => j.role.trim() || j.org.trim());

  if (layout === 'sidebar') return (
    <div style={{ display: 'flex', minHeight: CV_H }}>
      <div style={{ width: 268, background: p.dark, color: '#fff', padding: `${px(40)} ${px(26)}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: px(26) }}><Photo c={c} size={132} ring="rgba(255,255,255,0.18)" /></div>
        <Block><Title c={c} color="#fff">Liên hệ</Title><Contacts c={c} color="rgba(255,255,255,0.88)" iconColor="rgba(255,255,255,0.6)" /></Block>
        {skills.length > 0 && <Block><Title c={c} color="#fff">Kỹ năng</Title><Bullets items={skills} color="rgba(255,255,255,0.88)" /></Block>}
        {langs.length > 0 && <Block><Title c={c} color="#fff">Ngoại ngữ</Title><Bullets items={langs} color="rgba(255,255,255,0.88)" /></Block>}
        {hobbies.length > 0 && <Block><Title c={c} color="#fff">Sở thích</Title><Bullets items={hobbies} color="rgba(255,255,255,0.88)" /></Block>}
      </div>
      <div style={{ flex: 1, padding: `${px(44)} ${px(40)}` }}>
        <Block gap={26}><Name c={c} color={p.dark} /><Role c={c} color={p.accent} /></Block>
        {d.summary.trim() && <Block><Title c={c}>Giới thiệu</Title><Summary c={c} /></Block>}
        {hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} /></Block>}
        {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
      </div>
    </div>
  );

  if (layout === 'classic') return (
    <div style={{ padding: `${px(52)} ${px(60)}` }}>
      <div style={{ textAlign: 'center', marginBottom: px(14) }}>
        <Name c={c} color="#15181d" size={36} /><Role c={c} color={p.accent} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: px(12) }}><ContactsInline c={c} color="#4a515c" /></div>
      </div>
      <div style={{ height: 2, background: p.accent, margin: `${px(6)} 0 ${px(24)}` }} />
      {d.summary.trim() && <Block><Title c={c}>Giới thiệu</Title><Summary c={c} /></Block>}
      {hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} /></Block>}
      {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
      {skills.length > 0 && <Block><Title c={c}>Kỹ năng</Title><Chips c={c} items={skills} bg={p.soft} color={p.dark} /></Block>}
      {(langs.length > 0 || hobbies.length > 0) && (
        <div style={{ display: 'flex', gap: px(40) }}>
          {langs.length > 0 && <div style={{ flex: 1 }}><Title c={c}>Ngoại ngữ</Title><Bullets items={langs} color="#2c3138" /></div>}
          {hobbies.length > 0 && <div style={{ flex: 1 }}><Title c={c}>Sở thích</Title><Bullets items={hobbies} color="#2c3138" /></div>}
        </div>
      )}
    </div>
  );

  if (layout === 'banner') return (
    <div>
      <div style={{ background: p.dark, color: '#fff', padding: `${px(40)} ${px(48)}`, display: 'flex', alignItems: 'center', gap: px(28) }}>
        <Photo c={c} size={118} ring="rgba(255,255,255,0.2)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Name c={c} color="#fff" /><Role c={c} color="rgba(255,255,255,0.8)" />
          <div style={{ marginTop: px(14) }}><ContactsInline c={c} color="rgba(255,255,255,0.85)" /></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: px(36), padding: `${px(34)} ${px(48)}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {d.summary.trim() && <Block><Title c={c}>Giới thiệu</Title><Summary c={c} /></Block>}
          {hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} /></Block>}
        </div>
        <div style={{ width: 210, flexShrink: 0 }}>
          {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
          {skills.length > 0 && <Block><Title c={c}>Kỹ năng</Title><Chips c={c} items={skills} bg={p.soft} color={p.dark} /></Block>}
          {langs.length > 0 && <Block><Title c={c}>Ngoại ngữ</Title><Bullets items={langs} color="#2c3138" /></Block>}
          {hobbies.length > 0 && <Block><Title c={c}>Sở thích</Title><Bullets items={hobbies} color="#2c3138" /></Block>}
        </div>
      </div>
    </div>
  );

  if (layout === 'timeline') return (
    <div style={{ padding: `${px(46)} ${px(50)}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: px(24), paddingBottom: px(22), borderBottom: `3px solid ${p.accent}`, marginBottom: px(26) }}>
        <Photo c={c} size={104} square />
        <div style={{ flex: 1, minWidth: 0 }}><Name c={c} color="#15181d" /><Role c={c} color={p.accent} /></div>
        <div style={{ width: 220, flexShrink: 0 }}><Contacts c={c} color="#2c3138" iconColor={p.accent} /></div>
      </div>
      {d.summary.trim() && <Block><Title c={c}>Giới thiệu</Title><Summary c={c} /></Block>}
      <div style={{ display: 'flex', gap: px(34) }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} timeline /></Block>}
        </div>
        <div style={{ width: 200, flexShrink: 0 }}>
          {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
          {skills.length > 0 && <Block><Title c={c}>Kỹ năng</Title><Bullets items={skills} color="#2c3138" /></Block>}
          {langs.length > 0 && <Block><Title c={c}>Ngoại ngữ</Title><Bullets items={langs} color="#2c3138" /></Block>}
          {hobbies.length > 0 && <Block><Title c={c}>Sở thích</Title><Bullets items={hobbies} color="#2c3138" /></Block>}
        </div>
      </div>
    </div>
  );

  if (layout === 'gutter') { // tiêu đề mục nằm ở lề trái, nội dung bên phải, kẻ ngang giữa các mục
    const Row = ({ t, children }: { t: string; children: ReactNode }) => (
      <div style={{ display: 'flex', gap: px(24), padding: `${px(16)} 0`, borderTop: '1px solid #e3e6ea' }}>
        <div style={{ width: 132, flexShrink: 0, fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(12.5), letterSpacing: '0.1em', textTransform: 'uppercase', color: p.accent, paddingTop: px(2) }}>{t}</div>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    );
    return (
      <div style={{ padding: `${px(50)} ${px(54)}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: px(24), paddingBottom: px(20) }}>
          <div style={{ minWidth: 0 }}><Name c={c} color="#15181d" size={36} /><Role c={c} color={p.accent} /></div>
          <div style={{ width: 230, flexShrink: 0 }}><Contacts c={c} color="#2c3138" iconColor={p.accent} /></div>
        </div>
        {d.summary.trim() && <Row t="Giới thiệu"><Summary c={c} /></Row>}
        {hasJob && <Row t="Kinh nghiệm"><Jobs c={c} /></Row>}
        {hasEdu && <Row t="Học vấn"><Edus c={c} /></Row>}
        {skills.length > 0 && <Row t="Kỹ năng"><Chips c={c} items={skills} bg={p.soft} color={p.dark} /></Row>}
        {langs.length > 0 && <Row t="Ngoại ngữ"><Bullets items={langs} color="#2c3138" /></Row>}
        {hobbies.length > 0 && <Row t="Sở thích"><Bullets items={hobbies} color="#2c3138" /></Row>}
      </div>
    );
  }

  if (layout === 'cards') { // nền nhạt, mỗi mục một thẻ trắng bo góc
    const Card = ({ t, children }: { t?: string; children: ReactNode }) => (
      <div style={{ background: '#fff', borderRadius: px(12), padding: `${px(18)} ${px(20)}`, marginBottom: px(14), boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
        {t && <Title c={c} line={false}>{t}</Title>}{children}
      </div>
    );
    return (
      <div style={{ background: p.soft, minHeight: CV_H, padding: px(28) }}>
        <div style={{ background: p.dark, color: '#fff', borderRadius: px(14), padding: `${px(24)} ${px(26)}`, display: 'flex', alignItems: 'center', gap: px(22), marginBottom: px(14) }}>
          <Photo c={c} size={96} ring="rgba(255,255,255,0.25)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Name c={c} color="#fff" size={30} /><Role c={c} color="rgba(255,255,255,0.8)" size={14} />
            <div style={{ marginTop: px(10) }}><ContactsInline c={c} color="rgba(255,255,255,0.85)" /></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: px(14) }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.summary.trim() && <Card t="Giới thiệu"><Summary c={c} /></Card>}
            {hasJob && <Card t="Kinh nghiệm làm việc"><Jobs c={c} /></Card>}
          </div>
          <div style={{ width: 236, flexShrink: 0 }}>
            {hasEdu && <Card t="Học vấn"><Edus c={c} /></Card>}
            {skills.length > 0 && <Card t="Kỹ năng"><Chips c={c} items={skills} bg={p.soft} color={p.dark} /></Card>}
            {langs.length > 0 && <Card t="Ngoại ngữ"><Bullets items={langs} color="#2c3138" /></Card>}
            {hobbies.length > 0 && <Card t="Sở thích"><Bullets items={hobbies} color="#2c3138" /></Card>}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'centered') return ( // ảnh tròn giữa đầu trang, mọi thứ căn giữa phía trên
    <div style={{ padding: `${px(44)} ${px(52)}` }}>
      <div style={{ textAlign: 'center', marginBottom: px(26) }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: px(16) }}><Photo c={c} size={112} ring={p.accent} /></div>
        <Name c={c} color="#15181d" size={34} /><Role c={c} color={p.accent} />
        <div style={{ width: px(56), height: 3, background: p.accent, margin: `${px(14)} auto` }} />
        <div style={{ display: 'flex', justifyContent: 'center' }}><ContactsInline c={c} color="#4a515c" /></div>
      </div>
      {d.summary.trim() && <Block><div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', fontStyle: 'italic' }}><Summary c={c} color="#3a4049" /></div></Block>}
      <div style={{ display: 'flex', gap: px(34) }}>
        <div style={{ flex: 1.45, minWidth: 0 }}>{hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} /></Block>}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
          {skills.length > 0 && <Block><Title c={c}>Kỹ năng</Title><Chips c={c} items={skills} bg={p.soft} color={p.dark} /></Block>}
          {langs.length > 0 && <Block><Title c={c}>Ngoại ngữ</Title><Bullets items={langs} color="#2c3138" /></Block>}
          {hobbies.length > 0 && <Block><Title c={c}>Sở thích</Title><Bullets items={hobbies} color="#2c3138" /></Block>}
        </div>
      </div>
    </div>
  );

  if (layout === 'bold') { // tên rất to 2 dòng (chữ cuối màu nhấn), mục đánh số 01 02 03, dải màu mép trái
    const w = (d.name || 'Họ và tên').trim().split(/\s+/);
    const first = w.length > 1 ? w.slice(0, -1).join(' ') : w[0], last = w.length > 1 ? w[w.length - 1] : '';
    // số thứ tự tính sẵn (không đếm lúc render — React render 2 lần sẽ lệch số)
    const order = [d.summary.trim() && 'sum', hasJob && 'job', hasEdu && 'edu', (skills.length > 0 || langs.length > 0) && 'skill'].filter(Boolean) as string[];
    const Num = ({ t, k }: { t: string; k: string }) => (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(12), margin: `0 0 ${px(12)}` }}>
        <span style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(22), color: p.accent }}>{String(order.indexOf(k) + 1).padStart(2, '0')}</span>
        <span style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(15), color: '#15181d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t}</span>
        <span style={{ flex: 1, height: 1, background: '#d9dde2' }} />
      </div>
    );
    return (
      <div style={{ display: 'flex', minHeight: CV_H }}>
        <div style={{ width: 14, background: p.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, padding: `${px(50)} ${px(52)} ${px(40)} ${px(46)}` }}>
          <div style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(52), lineHeight: 1.02, color: '#15181d', letterSpacing: '-0.02em' }}>
            {first}{last && <><br /><span style={{ color: p.accent }}>{last}</span></>}
          </div>
          {d.title && <div style={{ fontSize: px(14), fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4a515c', marginTop: px(12) }}>{d.title}</div>}
          <div style={{ margin: `${px(16)} 0 ${px(28)}` }}><ContactsInline c={c} color="#2c3138" /></div>
          {d.summary.trim() && <Block><Num t="Giới thiệu" k="sum" /><Summary c={c} /></Block>}
          {hasJob && <Block><Num t="Kinh nghiệm" k="job" /><Jobs c={c} /></Block>}
          <div style={{ display: 'flex', gap: px(34) }}>
            {hasEdu && <div style={{ flex: 1, minWidth: 0 }}><Num t="Học vấn" k="edu" /><Edus c={c} /></div>}
            {(skills.length > 0 || langs.length > 0) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Num t="Kỹ năng" k="skill" />
                {skills.length > 0 && <div style={{ fontSize: px(12.5), lineHeight: 1.7, color: '#2c3138' }}>{skills.join('  ·  ')}</div>}
                {langs.length > 0 && <div style={{ fontSize: px(12.5), color: '#2c3138', marginTop: px(8) }}><b>Ngoại ngữ:</b> {langs.join(', ')}</div>}
                {hobbies.length > 0 && <div style={{ fontSize: px(12.5), color: '#2c3138', marginTop: px(6) }}><b>Sở thích:</b> {hobbies.join(', ')}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'ats') { // chữ đen trên nền trắng, không khối màu, không ảnh — máy lọc CV đọc dễ
    const H2 = ({ t }: { t: string }) => <div style={{ fontWeight: 800, fontSize: px(13), letterSpacing: '0.08em', textTransform: 'uppercase', color: '#15181d', borderBottom: '1.5px solid #15181d', paddingBottom: px(4), margin: `0 0 ${px(10)}` }}>{t}</div>;
    return (
      <div style={{ padding: `${px(48)} ${px(58)}` }}>
        <div style={{ fontFamily: c.f.head, fontWeight: c.f.headW, fontSize: px(30), color: '#15181d' }}>{d.name || 'Họ và tên'}</div>
        {d.title && <div style={{ fontSize: px(14), fontWeight: 600, color: p.accent, marginTop: px(4) }}>{d.title}</div>}
        <div style={{ margin: `${px(8)} 0 ${px(22)}` }}><ContactsInline c={c} color="#3a4049" /></div>
        {d.summary.trim() && <Block gap={18}><H2 t="Giới thiệu" /><Summary c={c} /></Block>}
        {hasJob && <Block gap={18}><H2 t="Kinh nghiệm làm việc" /><Jobs c={c} /></Block>}
        {hasEdu && <Block gap={18}><H2 t="Học vấn" /><Edus c={c} time="#4a515c" /></Block>}
        {skills.length > 0 && <Block gap={18}><H2 t="Kỹ năng" /><div style={{ fontSize: px(12.5), lineHeight: 1.6, color: '#2c3138' }}>{skills.join(', ')}</div></Block>}
        {(langs.length > 0 || hobbies.length > 0) && <Block gap={18}><H2 t="Thông tin thêm" />
          {langs.length > 0 && <div style={{ fontSize: px(12.5), color: '#2c3138' }}><b>Ngoại ngữ:</b> {langs.join(', ')}</div>}
          {hobbies.length > 0 && <div style={{ fontSize: px(12.5), color: '#2c3138', marginTop: px(4) }}><b>Sở thích:</b> {hobbies.join(', ')}</div>}
        </Block>}
      </div>
    );
  }

  // split: tên to trái trên, cột phải nền nhạt
  return (
    <div style={{ display: 'flex', minHeight: CV_H }}>
      <div style={{ flex: 1, minWidth: 0, padding: `${px(52)} ${px(40)} ${px(40)} ${px(52)}` }}>
        <Block gap={28}><Name c={c} color="#15181d" size={38} /><Role c={c} color={p.accent} size={16} /></Block>
        {d.summary.trim() && <Block><Title c={c}>Giới thiệu</Title><Summary c={c} /></Block>}
        {hasJob && <Block><Title c={c}>Kinh nghiệm làm việc</Title><Jobs c={c} /></Block>}
        {hasEdu && <Block><Title c={c}>Học vấn</Title><Edus c={c} /></Block>}
      </div>
      <div style={{ width: 266, background: p.soft, padding: `${px(52)} ${px(24)}`, flexShrink: 0 }}>
        <div style={{ marginBottom: px(26) }}><Photo c={c} size={120} square bg="#fff" /></div>
        <Block><Title c={c} line={false}>Liên hệ</Title><Contacts c={c} color="#2c3138" iconColor={p.accent} /></Block>
        {skills.length > 0 && <Block><Title c={c} line={false}>Kỹ năng</Title><Bullets items={skills} color="#2c3138" /></Block>}
        {langs.length > 0 && <Block><Title c={c} line={false}>Ngoại ngữ</Title><Bullets items={langs} color="#2c3138" /></Block>}
        {hobbies.length > 0 && <Block><Title c={c} line={false}>Sở thích</Title><Bullets items={hobbies} color="#2c3138" /></Block>}
      </div>
    </div>
  );
}

// Tờ CV đúng 794×1123. Chữ quá dài → thu --k (tối thiểu 0.7) cho vừa 1 trang; onFit báo còn tràn hay không.
export function CvSheet({ spec, data, onFit }: { spec: CvSpec; data: CvData; onFit?: (overflow: boolean) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const p = cvPalette(spec);
  const f = CV_FONTS.find((x) => x.id === spec.font) || CV_FONTS[0];
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    let k = 1.12; // nội dung ngắn: chữ to lên chút cho đầy trang, dài thì thu dần
    el.style.setProperty('--k', String(k));
    while (el.scrollHeight > CV_H + 1 && k > 0.7) { k = Math.round((k - 0.03) * 100) / 100; el.style.setProperty('--k', String(k)); }
    onFit?.(el.scrollHeight > CV_H + 1);
  });
  return (
    <div ref={ref} data-cv-sheet style={{ width: CV_W, height: CV_H, overflow: 'hidden', background: '#fff', fontFamily: f.body, color: '#15181d', position: 'relative', ['--k' as string]: 1 } as CSSProperties}>
      <Layout c={{ d: data, p, f }} layout={spec.layout} />
    </div>
  );
}

// Thu tờ CV theo bề ngang ô chứa (thumbnail / xem trước)
export function ScaledCv({ spec, data, onFit, className }: { spec: CvSpec; data: CvData; onFit?: (o: boolean) => void; className?: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [s, setS] = useState(0.3);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth / CV_W)); ro.observe(el); setS(el.clientWidth / CV_W);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={className} style={{ width: '100%', aspectRatio: `${CV_W} / ${CV_H}`, overflow: 'hidden', position: 'relative' }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: 'top left', position: 'absolute', left: 0, top: 0 }}>
        <CvSheet spec={spec} data={data} onFit={onFit} />
      </div>
    </div>
  );
}
