'use client';
// Menu dạng sổ (menu book nhà hàng): 1 engine SVG (đơn vị = mm). Khách dán thực đơn dạng danh sách
// ("## Khai vị | Starters" + "Tên | Giá | Mô tả | Tên EN | cay chay best dacbiet") → tự chia trang, cân cột,
// món đặc biệt có ảnh (ảnh khách tải, chỉ nằm trên máy) hoặc đĩa món vẽ code. Bìa: da ép logo (không in màu →
// file = khuôn ép), bìa cứng in màu (lề gập 15mm bồi bìa), bìa nhựa PVC (tờ in kẹp trong, lề xén 3mm).
// Mẫu = phong cách ẩm thực × bảng màu × font, render code 100%, không gọi AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { printPageDims } from './print-export';
import { qrPath } from './flyer-qr';

// ---------- khổ, bìa, gáy ----------
export interface MBSize { id: string; name: string; wMm: number; hMm: number }
export const MB_SIZES: MBSize[] = [
  { id: 'a4', name: 'A4 · 21×29,7 cm', wMm: 210, hMm: 297 },
  { id: 'a5', name: 'A5 · 14,8×21 cm', wMm: 148, hMm: 210 },
  { id: '24x32', name: '24×32 cm (sang)', wMm: 240, hMm: 320 },
];
export const mbSize = (id: string) => MB_SIZES.find((s) => s.id === id) || MB_SIZES[0];

export type MBCover = 'leather' | 'hard' | 'pvc';
export const MB_COVERS: { id: MBCover; name: string; blurb: string }[] = [
  { id: 'leather', name: 'Bìa da ép logo', blurb: 'Da/simili, logo ép kim hoặc ép chìm — không in màu' },
  { id: 'hard', name: 'Bìa cứng in màu', blurb: 'Giấy in màu bồi bìa cứng 2mm, cán màng' },
  { id: 'pvc', name: 'Bìa nhựa PVC', blurb: 'Bìa nhựa trong, kẹp tờ in bìa bên trong — chống nước' },
];
export type MBBind = 'screw' | 'stitch';
export const MB_BINDS: { id: MBBind; name: string }[] = [
  { id: 'screw', name: 'Ốc vít gáy (thay trang được)' },
  { id: 'stitch', name: 'Khâu gáy' },
];
export type MBPrice = 'k' | 'd' | 'num';
export const MB_PRICES: { id: MBPrice; name: string }[] = [
  { id: 'k', name: '65k' }, { id: 'd', name: '65.000đ' }, { id: 'num', name: '65 (nghìn đồng)' },
];
export const MB_PAGE_OPTS = [4, 6, 8, 10, 12, 14, 16] as const;
export const MB_BLEED_MM = 3;   // ruột + bìa PVC: lề xén 3mm
export const MB_WRAP_MM = 15;   // bìa cứng: giấy bồi gập ôm tấm bìa 15mm
export const MB_SHEET_MM = 0.6; // 1 tờ ruột ép plastic dày ~0.6mm

export interface MBLeather { id: string; name: string; color: string }
export const MB_LEATHERS: MBLeather[] = [
  { id: 'den', name: 'Đen', color: '#1D1C1E' },
  { id: 'nau', name: 'Nâu bò', color: '#5E3A22' },
  { id: 'do', name: 'Đỏ đô', color: '#561A1E' },
  { id: 'navy', name: 'Xanh navy', color: '#1C2840' },
  { id: 'reu', name: 'Xanh rêu', color: '#33402E' },
  { id: 'be', name: 'Be cát', color: '#C3AE8E' },
];
export const mbLeather = (id: string) => MB_LEATHERS.find((l) => l.id === id) || MB_LEATHERS[0];
export type MBFoil = 'gold' | 'silver' | 'copper' | 'deboss';
export const MB_FOILS: { id: MBFoil; name: string; color: string }[] = [
  { id: 'gold', name: 'Ép kim vàng', color: '#D8B24C' },
  { id: 'silver', name: 'Ép kim bạc', color: '#CDD2D8' },
  { id: 'copper', name: 'Ép kim đồng', color: '#C07A4A' },
  { id: 'deboss', name: 'Ép chìm (không màu)', color: '' },
];
export const mbFoil = (id: string) => MB_FOILS.find((f) => f.id === id) || MB_FOILS[0];

// ---------- font (chỉ font có TTF ở /public/fonts → file in outline được) ----------
const BODY = 'Be Vietnam Pro';
const EN_FAM = 'Cormorant Garamond'; // dòng tiếng Anh: Cormorant 500 nghiêng
export interface MBFont { id: string; name: string; family: string; weight: number }
export const MB_FONTS: MBFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const mbFont = (id: string) => MB_FONTS.find((f) => f.id === id) || MB_FONTS[0];
export const MB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Cormorant+Garamond:ital,wght@0,700;1,500&family=Montserrat:wght@800&family=Prata&display=swap');`;

export function useMBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-mb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-mb-fonts'; link.rel = 'stylesheet';
        link.href = MB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...MB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `italic 500 40px "${EN_FAM}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- phong cách (= mẫu) ----------
export type Motif = 'lotus' | 'flame' | 'deco' | 'wave' | 'leaf' | 'neon';
export interface MBPal {
  paper: string; ink: string; sub: string; accent: string; accent2: string; rule: string;
  cover: string; coverInk: string; coverAccent: string; inside: string;
}
export interface MBStyle { id: string; name: string; cuisine: string; font: string; motif: Motif; pal: MBPal; leather: string; foil: MBFoil }
export const MB_CUISINES: { id: string; name: string }[] = [
  { id: 'viet', name: 'Nhà hàng Việt' },
  { id: 'lau', name: 'Lẩu nướng' },
  { id: 'steak', name: 'Âu · steak' },
  { id: 'asia', name: 'Nhật Bản · Hàn Quốc' },
  { id: 'chay', name: 'Nhà hàng chay' },
  { id: 'bar', name: 'Bar · cocktail' },
];
export const MB_STYLES: MBStyle[] = [
  { id: 'viet-do', name: 'Việt · đỏ đô kem', cuisine: 'viet', font: 'playfair', motif: 'lotus', leather: 'do', foil: 'gold',
    pal: { paper: '#FBF6EC', ink: '#2B1D14', sub: '#6E5A48', accent: '#9E2A2B', accent2: '#B98A3A', rule: '#D9C7A8', cover: '#7A1F21', coverInk: '#F6E7C8', coverAccent: '#D9B163', inside: '#EFE4CF' } },
  { id: 'viet-ngoc', name: 'Việt · xanh ngọc', cuisine: 'viet', font: 'prata', motif: 'lotus', leather: 'reu', foil: 'gold',
    pal: { paper: '#F4F6F0', ink: '#1F2E26', sub: '#56665B', accent: '#2F6B4F', accent2: '#B98A3A', rule: '#C9D5C6', cover: '#1F4A38', coverInk: '#F2ECD8', coverAccent: '#D9B163', inside: '#E3E9DD' } },
  { id: 'lau-den', name: 'Lẩu nướng · đen lửa', cuisine: 'lau', font: 'oswald', motif: 'flame', leather: 'den', foil: 'copper',
    pal: { paper: '#1C1A19', ink: '#F4EDE3', sub: '#B7AA9A', accent: '#F07B23', accent2: '#E2B13C', rule: '#4A403A', cover: '#141212', coverInk: '#F4EDE3', coverAccent: '#F07B23', inside: '#2A2624' } },
  { id: 'lau-do', name: 'Lẩu nướng · đỏ cam', cuisine: 'lau', font: 'oswald', motif: 'flame', leather: 'do', foil: 'gold',
    pal: { paper: '#FFF7EE', ink: '#2A1510', sub: '#73594C', accent: '#C8281E', accent2: '#E8902A', rule: '#F0D2B6', cover: '#B3221A', coverInk: '#FFF1DC', coverAccent: '#F6C25A', inside: '#F6E3CF' } },
  { id: 'steak-den', name: 'Steak · đen vàng', cuisine: 'steak', font: 'cormorant', motif: 'deco', leather: 'den', foil: 'gold',
    pal: { paper: '#161514', ink: '#EFE8DA', sub: '#A89F8E', accent: '#C9A45C', accent2: '#C9A45C', rule: '#3A352C', cover: '#0F0F0F', coverInk: '#EFE8DA', coverAccent: '#C9A45C', inside: '#24221F' } },
  { id: 'steak-nga', name: 'Bistro · trắng ngà', cuisine: 'steak', font: 'cormorant', motif: 'deco', leather: 'nau', foil: 'gold',
    pal: { paper: '#F8F4EC', ink: '#1D1B18', sub: '#6B6153', accent: '#7A5A2E', accent2: '#B08D57', rule: '#DCD1BD', cover: '#2A2621', coverInk: '#F3EADA', coverAccent: '#C7A266', inside: '#ECE3D2' } },
  { id: 'nhat-trang', name: 'Nhật Bản · trắng đỏ', cuisine: 'asia', font: 'bvp', motif: 'wave', leather: 'den', foil: 'silver',
    pal: { paper: '#FBFAF7', ink: '#1A1A1A', sub: '#5C5C5C', accent: '#C0262D', accent2: '#1F3A5F', rule: '#D8D3C8', cover: '#F1ECE1', coverInk: '#1A1A1A', coverAccent: '#C0262D', inside: '#E9E3D6' } },
  { id: 'han-nuong', name: 'Hàn Quốc · BBQ', cuisine: 'asia', font: 'montserrat', motif: 'wave', leather: 'navy', foil: 'silver',
    pal: { paper: '#FFF9F0', ink: '#2B2118', sub: '#6C5C4C', accent: '#D9442B', accent2: '#2E6E5A', rule: '#EAD8C2', cover: '#2B2118', coverInk: '#FFF1DE', coverAccent: '#F2A33A', inside: '#F1E4D2' } },
  { id: 'chay-la', name: 'Chay · xanh lá', cuisine: 'chay', font: 'prata', motif: 'leaf', leather: 'be', foil: 'deboss',
    pal: { paper: '#F5F3E8', ink: '#23331F', sub: '#5D6B52', accent: '#4E7D3A', accent2: '#B8923F', rule: '#D6D9C2', cover: '#3E5F2E', coverInk: '#F3F0E0', coverAccent: '#D8C27A', inside: '#E7E6D4' } },
  { id: 'bar-navy', name: 'Bar · navy ánh kim', cuisine: 'bar', font: 'montserrat', motif: 'neon', leather: 'navy', foil: 'gold',
    pal: { paper: '#141B2D', ink: '#EDE7DA', sub: '#9AA6BF', accent: '#E3B04B', accent2: '#2EC4B6', rule: '#2C3650', cover: '#0E1424', coverInk: '#EDE7DA', coverAccent: '#E3B04B', inside: '#1D2640' } },
];
export const mbStyle = (id: string) => MB_STYLES.find((s) => s.id === id) || MB_STYLES[0];

export interface MBSpec {
  style: string; font: string; size: string; cover: MBCover; bind: MBBind; cols: 1 | 2;
  pages: 'auto' | number; bilingual: boolean; price: MBPrice; intro: boolean; leather: string; foil: MBFoil;
}
export const MB_FIRST: MBSpec = {
  style: 'viet-do', font: 'playfair', size: 'a4', cover: 'leather', bind: 'screw', cols: 2,
  pages: 'auto', bilingual: true, price: 'k', intro: true, leather: 'do', foil: 'gold',
};
export const applyStyle = (cur: MBSpec, st: MBStyle): MBSpec => ({ ...cur, style: st.id, font: st.font, leather: st.leather, foil: st.foil });

// ---------- nội dung ----------
export type MBData = Record<string, string>;
export interface MBField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; rows?: number }
export const MB_FIELDS: MBField[] = [
  { key: 'brand', label: 'Tên quán / nhà hàng', half: true },
  { key: 'tagline', label: 'Slogan (dòng nhỏ)', half: true },
  { key: 'story', label: 'Câu chuyện quán (trang mở đầu)', multiline: true, rows: 3 },
  { key: 'hours', label: 'Giờ mở cửa', half: true },
  { key: 'phone', label: 'Hotline / đặt bàn', half: true },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'website', label: 'Website / fanpage (tạo mã QR)', half: true },
  { key: 'note', label: 'Ghi chú cuối trang', half: true },
];

const VIET_MENU = `## Khai vị | Starters
Gỏi cuốn tôm thịt | 65k | Bánh tráng cuốn tôm, thịt ba chỉ, bún, rau thơm, chấm tương đậu | Fresh spring rolls | best
Chả giò rế cua | 85k | Bánh tráng rế giòn rụm, nhân thịt cua, khoai môn | Crispy crab rolls
Gỏi ngó sen tôm thịt | 95k | Ngó sen giòn, tôm, thịt, đậu phộng, nước mắm chua ngọt | Lotus stem salad
Nộm hoa chuối | 75k | Hoa chuối, đậu hũ, rau răm, mè rang | Banana blossom salad | chay
## Món đặc biệt | Signature
Cá kho tộ | 185k | Cá bông lau kho tộ đất, tiêu xanh, ăn cùng cơm trắng | Caramelized fish in clay pot | dacbiet best
Bò lúc lắc khoai tây | 195k | Thăn bò Úc xào lửa lớn, khoai tây chiên, xà lách | Shaking beef | dacbiet
## Món chính | Main dishes
Cơm tấm sườn bì chả | 89k | Sườn nướng mật ong, bì, chả trứng, mỡ hành | Broken rice with grilled pork
Bún bò Huế | 79k | Nước dùng sả ớt, bắp bò, giò heo, chả cua | Hue spicy beef noodle | cay
Gà kho gừng | 129k | Gà ta kho gừng, nước màu, ăn cùng cơm nóng | Ginger braised chicken
Canh chua cá lóc | 145k | Cá lóc, thơm, cà chua, giá, bạc hà, me chua | Sweet & sour fish soup
Rau muống xào tỏi | 59k | Rau muống xào tỏi phi giòn | Morning glory with garlic | chay
Đậu hũ sốt cà | 69k | Đậu hũ non chiên vàng, sốt cà chua hành lá | Tofu in tomato sauce | chay
## Tráng miệng | Desserts
Chè hạt sen long nhãn | 45k | Hạt sen bùi, long nhãn ngọt thanh | Lotus seed sweet soup | chay
Bánh flan caramen | 35k | Flan trứng gà, caramen cà phê | Caramel flan
## Đồ uống | Drinks
Trà sen | 55k | Trà ướp hoa sen, ấm nhỏ | Lotus tea
Nước sấu đá | 39k | Sấu ngâm đường phèn | Dracontomelon juice
Cà phê sữa đá | 35k | Phin truyền thống | Iced milk coffee | best
Bia Sài Gòn | 30k | Chai 330ml | Saigon beer`;

const LAU_MENU = `## Lẩu | Hotpot
Lẩu Thái hải sản | 389k | Tôm, mực, nghêu, cá viên, nước lẩu chua cay (2–3 người) | Thai seafood hotpot | cay best dacbiet
Lẩu bò nhúng giấm | 359k | Bò Mỹ thái mỏng, nước giấm dừa, rau sống, bánh tráng | Beef vinegar hotpot
Lẩu nấm thập cẩm | 289k | 7 loại nấm, đậu hũ, rau củ, nước dùng rau củ hầm | Mushroom hotpot | chay
## Đồ nướng | Grill
Ba chỉ bò Mỹ | 159k | Ba chỉ bò thái lát, sốt ướp đặc biệt của quán | US beef belly | best
Sườn heo nướng mật ong | 139k | Sườn non ướp mật ong, sả, tỏi | Honey pork ribs
Mực trứng nướng sa tế | 169k | Mực trứng tươi, sa tế cay nồng | Grilled squid with satay | cay
Tôm sú nướng muối ớt | 189k | Tôm sú size lớn, muối ớt xanh | Grilled tiger prawns | cay
Combo nướng 4 người | 699k | Bò, heo, gà, hải sản, rau củ nướng, kim chi | Grill combo for 4 | dacbiet
## Món thêm | Add-ons
Rau nhúng lẩu | 39k | Cải thảo, cải ngọt, rau muống, nấm kim châm | Hotpot vegetables | chay
Mì / bún / miến | 15k | Chọn 1 loại | Noodles
Kim chi cải thảo | 35k | Muối chua cay kiểu Hàn | Kimchi | cay
## Đồ uống | Drinks
Bia tươi | 25k | Ly 500ml | Draft beer | best
Trà tắc | 25k | Tắc tươi, mật ong | Kumquat tea
Nước ngọt các loại | 20k | Lon 330ml | Soft drinks`;

const STEAK_MENU = `## Khai vị | Starters
Súp kem nấm Truffle | 145k | Nấm rừng xay mịn, dầu truffle, bánh mì nướng bơ tỏi | Truffle mushroom soup
Salad Caesar | 165k | Xà lách romaine, phô mai parmesan, bánh mì giòn, sốt Caesar | Caesar salad
Cá hồi áp chảo | 245k | Cá hồi Na Uy, sốt chanh bơ, măng tây | Pan-seared salmon
## Bò bít tết | Steaks
Thăn ngoại bò Úc 250g | 690k | Striploin hạng MB3+, sốt tiêu đen, khoai nghiền | Australian striploin | best dacbiet
Thăn nội bò Mỹ 200g | 790k | Tenderloin Prime, sốt rượu vang đỏ, rau củ nướng | US Prime tenderloin | dacbiet
Ribeye Wagyu 300g | 1.450k | Wagyu Úc MB6, muối hồng, mù tạt Dijon | Wagyu ribeye
## Món chính | Mains
Mì Ý sốt bò bằm | 189k | Spaghetti, sốt cà chua thịt bò, phô mai | Spaghetti Bolognese
Gà nướng thảo mộc | 259k | Đùi gà rút xương, hương thảo, khoai tây đút lò | Herb roasted chicken
Risotto nấm | 219k | Gạo Arborio, nấm porcini, parmesan | Mushroom risotto | chay
## Tráng miệng | Desserts
Bánh Tiramisu | 95k | Mascarpone, cà phê espresso, cacao | Tiramisu | best
Kem vani Pháp | 75k | 2 viên, sốt dâu rừng | French vanilla ice cream
## Rượu vang | Wine
Vang đỏ Chile (ly) | 150k | Cabernet Sauvignon | House red (glass)
Vang trắng Pháp (chai) | 950k | Chardonnay | French white (bottle)`;

const ASIA_MENU = `## Sushi · Sashimi | Sushi & Sashimi
Sashimi cá hồi | 189k | 6 lát cá hồi Na Uy tươi, wasabi, gừng hồng | Salmon sashimi | best
Sushi lươn nướng | 149k | Lươn Nhật nướng sốt tare, 4 miếng | Unagi nigiri
Cơm cuộn California | 129k | Thanh cua, bơ, dưa leo, trứng cá | California roll
Combo sushi 18 miếng | 459k | Thập cẩm cá hồi, cá ngừ, tôm, lươn | Sushi platter | dacbiet
## Nướng Hàn Quốc | Korean BBQ
Ba chỉ heo nướng | 169k | Samgyeopsal, kim chi, tỏi nướng, rau cuốn | Grilled pork belly | best
Sườn bò ướp Galbi | 289k | Sườn bò ướp lê và nước tương | Galbi beef ribs | dacbiet
Gà sốt cay Yangnyeom | 159k | Gà rán giòn, sốt cay ngọt | Spicy fried chicken | cay
## Món nóng | Hot dishes
Mì Ramen Tonkotsu | 139k | Nước hầm xương heo 12 giờ, chashu, trứng lòng đào | Tonkotsu ramen
Canh kim chi đậu hũ | 99k | Kim chi, đậu hũ non, thịt heo | Kimchi stew | cay
Tokbokki phô mai | 89k | Bánh gạo sốt cay, phô mai kéo sợi | Cheese tteokbokki | cay
Cơm trộn Bibimbap | 119k | Rau củ, trứng, thịt bò, tương ớt | Bibimbap
## Đồ uống | Drinks
Trà xanh Matcha | 45k | Matcha Uji pha sữa | Matcha latte
Soju trái cây | 99k | Đào, nho, việt quất | Fruit soju
Sake nóng | 159k | Bình 180ml | Hot sake`;

const CHAY_MENU = `## Khai vị | Starters
Gỏi cuốn rau củ | 55k | Bánh tráng, rau củ tươi, đậu hũ, sốt mè | Vegetable spring rolls | best
Súp bí đỏ hạt sen | 49k | Bí đỏ nấu nhừ, hạt sen, nước cốt dừa | Pumpkin lotus soup
Nấm đùi gà chiên giòn | 69k | Nấm tẩm bột chiên, muối tiêu chanh | Crispy king oyster mushroom
## Món đặc biệt | Signature
Lẩu nấm thiên nhiên | 259k | 8 loại nấm, rau củ, nước dùng hầm 6 tiếng | Mushroom hotpot | dacbiet best
Cơm chiên hạt sen lá sen | 99k | Cơm chiên gói lá sen hấp thơm | Lotus leaf fried rice | dacbiet
## Món chính | Main dishes
Đậu hũ kho nấm | 79k | Đậu hũ non, nấm đông cô, kho tiêu | Braised tofu & mushroom
Cà ri rau củ | 89k | Khoai lang, cà rốt, đậu que, nước cốt dừa, bánh mì | Vegetable curry | cay
Bún Huế chay | 65k | Nước dùng sả ớt, chả chay, nấm | Vegetarian Hue noodle | cay
Rau củ xào thập cẩm | 69k | Bông cải, cà rốt, nấm, đậu Hà Lan | Stir-fried vegetables
## Tráng miệng · Đồ uống | Desserts & Drinks
Chè khúc bạch | 45k | Thạch hạnh nhân, nhãn, hạnh nhân lát | Almond panna cotta
Nước ép cần tây táo | 49k | Ép lạnh, không đường | Celery apple juice
Trà hoa cúc mật ong | 39k | Hoa cúc, kỷ tử, mật ong rừng | Chrysanthemum tea`;

const BAR_MENU = `## Signature cocktail | Signature
Sài Gòn Sunset | 189k | Rum, chanh dây, sả, si-rô gừng | Passion fruit rum sour | dacbiet best
Hạ Long Mist | 199k | Gin, trà xanh, chanh, lòng trắng trứng | Green tea gin fizz | dacbiet
Ớt Hiểm Margarita | 179k | Tequila, chanh, ớt hiểm, muối hồng | Chili margarita | cay
## Cổ điển | Classics
Mojito | 159k | Rum trắng, bạc hà, chanh, soda | Mojito | best
Negroni | 179k | Gin, Campari, Vermouth đỏ | Negroni
Old Fashioned | 199k | Bourbon, đường, bitters, vỏ cam | Old Fashioned
Espresso Martini | 189k | Vodka, cà phê espresso, Kahlúa | Espresso Martini
## Không cồn | Mocktails
Dưa hấu bạc hà | 89k | Dưa hấu, bạc hà, soda | Watermelon mint cooler
Trà vải hoa hồng | 89k | Trà đen, vải, si-rô hoa hồng | Lychee rose tea
## Bia · rượu | Beer & spirits
Bia thủ công IPA | 129k | Lon 330ml, hương cam chanh | Craft IPA
Whisky Single Malt (ly) | 249k | 12 năm, 40ml | Single malt whisky
## Đồ nhắm | Bar bites
Khoai tây chiên phô mai | 89k | Phô mai cheddar, bột ớt paprika | Cheese fries
Cánh gà sốt cay | 129k | 6 cánh, sốt buffalo | Buffalo wings | cay`;

export const MB_SAMPLES: Record<string, MBData> = {
  viet: { brand: 'Sen Quê', tagline: 'Hương vị cơm nhà Việt', story: 'Từ những công thức của bà ngoại ở miền Tây, Sen Quê nấu từng món như bữa cơm gia đình: nguyên liệu chợ sáng, nước mắm nhĩ, kho bằng nồi đất và lửa riu riu.', hours: '10:00 – 22:00 mỗi ngày', phone: '0909 123 456', address: '12 Lê Thánh Tôn, Q.1, TP.HCM', website: 'senque.vn', note: 'Giá đã bao gồm VAT', menu: VIET_MENU },
  lau: { brand: 'Lửa Hồng', tagline: 'Lẩu & nướng không khói', story: 'Bếp than hoa, nước lẩu ninh xương 8 tiếng và thịt tươi nhập mỗi sáng — Lửa Hồng là chỗ hẹn của hội bạn sau giờ làm.', hours: '16:00 – 23:30', phone: '0938 456 789', address: '88 Phan Xích Long, Phú Nhuận, TP.HCM', website: 'facebook.com/luahong', note: 'Giá chưa gồm VAT 8%', menu: LAU_MENU },
  steak: { brand: 'The Gold Steakhouse', tagline: 'Steak · Wine · Grill', story: 'Bò được ủ khô 21 ngày, nướng trên than đá núi lửa và phục vụ cùng tuyển chọn rượu vang từ Pháp, Ý, Chile.', hours: '11:00 – 23:00', phone: '028 3822 6868', address: '5 Đồng Khởi, Q.1, TP.HCM', website: 'thegoldsteak.vn', note: 'Giá chưa gồm 5% phí phục vụ & 8% VAT', menu: STEAK_MENU },
  asia: { brand: 'Hanami', tagline: 'Sushi & Korean BBQ', story: 'Hanami mang tinh thần ngắm hoa mùa xuân vào từng món: cá tươi về mỗi sáng, thịt nướng ướp theo công thức Seoul.', hours: '10:30 – 22:30', phone: '0901 222 333', address: '27 Thảo Điền, TP. Thủ Đức', website: 'hanami.vn', note: 'Giá đã bao gồm VAT', menu: ASIA_MENU },
  chay: { brand: 'An Nhiên', tagline: 'Ẩm thực chay thanh tịnh', story: 'Rau củ từ vườn hữu cơ Đà Lạt, không bột ngọt, không dầu chiên lại — mỗi bữa ăn là một khoảng lặng an nhiên.', hours: '07:00 – 21:00', phone: '0977 888 111', address: '9 Tú Xương, Q.3, TP.HCM', website: 'annhienchay.vn', note: 'Toàn bộ món chay thuần, không trứng sữa', menu: CHAY_MENU },
  bar: { brand: 'Velvet Bar', tagline: 'Cocktail · Music · Night', story: 'Quầy bar nhỏ trên tầng thượng, nhạc jazz mỗi tối thứ Sáu và cocktail pha từ nguyên liệu Việt: sả, chanh dây, trà xanh, ớt hiểm.', hours: '18:00 – 01:00', phone: '0912 345 678', address: 'Tầng 9, 76 Lê Lai, Q.1, TP.HCM', website: 'velvetbar.vn', note: 'Chỉ phục vụ khách từ 18 tuổi', menu: BAR_MENU },
};
export const defaultMBData = (cuisine = 'viet'): MBData => ({ ...(MB_SAMPLES[cuisine] || MB_SAMPLES.viet) });
/** đổi phong cách: ô còn nguyên chữ mẫu ẩm thực cũ → thay mẫu mới; ô khách tự viết → giữ */
export function switchMBData(d: MBData, from: string, to: string): MBData {
  if (from === to) return d;
  const oldS = MB_SAMPLES[from] || {}, next = defaultMBData(to);
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

// ---------- logo + ảnh món ----------
export interface MBLogo { href: string; w: number; h: number; mask?: { href: string; w: number; h: number } }
/** ảnh món đặc biệt: key = tên món */
export type MBPhotos = Record<string, string>;

// ---------- phân tích thực đơn ----------
export interface MBItem { name: string; price: string; desc: string; en: string; tags: string[] }
export interface MBSection { title: string; en: string; items: MBItem[] }
const TAG_ALIAS: Record<string, string> = {
  cay: 'cay', spicy: 'cay', chay: 'chay', vegan: 'chay', veg: 'chay', best: 'best', bestseller: 'best', hot: 'best',
  dacbiet: 'dacbiet', 'dac-biet': 'dacbiet', special: 'dacbiet', signature: 'dacbiet', '*': 'dacbiet',
};
const stripVN = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
export function parseMenu(text: string): MBSection[] {
  const out: MBSection[] = [];
  let cur: MBSection | null = null;
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const [t, en] = line.replace(/^#+\s*/, '').split('|').map((s) => s.trim());
      cur = { title: t || '', en: en || '', items: [] };
      out.push(cur);
      continue;
    }
    const parts = line.split('|').map((s) => s.trim());
    let name = parts[0] || '';
    const tags = new Set<string>();
    if (name.startsWith('*')) { tags.add('dacbiet'); name = name.replace(/^\*+\s*/, ''); }
    for (const t of (parts[4] || '').split(/[\s,;]+/)) { const k = TAG_ALIAS[stripVN(t)]; if (k) tags.add(k); }
    if (!name) continue;
    if (!cur) { cur = { title: '', en: '', items: [] }; out.push(cur); }
    cur.items.push({ name, price: parts[1] || '', desc: parts[2] || '', en: parts[3] || '', tags: [...tags] });
  }
  return out.filter((s) => s.items.length || s.title);
}
export const featuredItems = (text: string) => parseMenu(text).flatMap((s) => s.items).filter((i) => i.tags.includes('dacbiet'));

/** "65k" / "65" / "65000" / "65.000đ" / "1.450k" → định dạng thống nhất; không đọc được → giữ nguyên */
export function fmtPrice(raw: string, mode: MBPrice): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const low = s.toLowerCase().replace(/\s/g, '');
  const m = low.match(/^([\d.,]+)(k|đ|d|vnđ|vnd)?$/);
  if (!m) return s;
  const numStr = m[1];
  let n: number;
  if (m[2] === 'k') n = parseFloat(numStr.replace(/\./g, '').replace(',', '.')) * 1000;
  else n = parseFloat(numStr.replace(/[.,]/g, ''));
  if (!isFinite(n)) return s;
  if (n < 1000) n *= 1000; // "65" = 65 nghìn
  const th = n / 1000;
  const thStr = Number.isInteger(th) ? th.toLocaleString('vi-VN') : th.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (mode === 'k') return `${thStr}k`;
  if (mode === 'num') return thStr;
  return `${Math.round(n).toLocaleString('vi-VN')}đ`;
}

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; it?: boolean; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function tw(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.58 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.58 + ls;
  mctx.font = `${ts.it ? 'italic ' : ''}${ts.wt} ${size * 20}px "${ts.fam}"`;
  return mctx.measureText(s).width / 20 + ls;
}
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || tw(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** co chữ tới khi ≤ maxLines dòng và mọi dòng vừa maxW; cân dòng (tránh chữ mồ côi) */
function fit(text: string, maxW: number, size: number, ts: TS, maxLines: number, minScale = 0.55, balance = true): { lines: string[]; size: number } {
  let s = size, lines = wrap(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * minScale) { s *= 0.95; lines = wrap(text, maxW, s, ts); }
  if (lines.length > maxLines) {
    // vẫn dư dòng → cắt, dòng cuối thêm "…"
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && tw(`${last}…`, s, ts) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  } else if (balance && lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.5, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(text, hi, s, ts);
  }
  for (let i = 0; i < 30; i++) {
    const widest = Math.max(0, ...lines.map((l) => tw(l, s, ts)));
    if (widest <= maxW) break;
    s *= Math.max(0.8, Math.min(0.98, maxW / widest));
  }
  return { lines, size: s };
}
const T = (x: number, y: number, s: string, size: number, ts: TS, fill: string, anchor: 'start' | 'middle' | 'end' = 'start', extra: Record<string, unknown> = {}) => (
  <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontStyle={ts.it ? 'italic' : undefined} fontSize={size} fill={fill} textAnchor={anchor}
    letterSpacing={ts.ls || undefined} {...extra}>{s}</text>
);

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
const isDarkHex = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
};
const initials = (brand: string) => {
  const skip = new Set(['NHÀ', 'HÀNG', 'QUÁN', 'THE', 'BAR', 'CAFE', 'CÀ', 'PHÊ']);
  const ws = (brand || '').toUpperCase().split(/\s+/).filter((w) => w && !skip.has(w));
  const all = ws.length ? ws : (brand || 'M').toUpperCase().split(/\s+/);
  return ((all[0]?.[0] || 'M') + (all[1]?.[0] || '')).slice(0, 2);
};

// ---------- hình vẽ code: icon + hoạ tiết ----------
/** icon cay / chay / best — gốc (x,y) = góc trái baseline, cao ≈ s */
function Icon({ kind, x, y, s }: { kind: string; x: number; y: number; s: number }) {
  const cy = y - s * 0.38;
  if (kind === 'cay') return (
    <g transform={`translate(${x} ${cy}) scale(${s / 10})`}>
      <path d="M1.2 1.5 C3 -3.8 8.3 -4 9.4 -1.6 C7.6 -2.6 4.8 -1.4 3.2 2.6 C2.6 4 1.4 3.8 1.2 1.5 Z" fill="#D8322A" />
      <path d="M8.6 -2.2 C9.2 -3.6 9.9 -4.3 11 -4.4" stroke="#3E8E3E" strokeWidth={1.1} fill="none" strokeLinecap="round" />
    </g>
  );
  if (kind === 'chay') return (
    <g transform={`translate(${x} ${cy}) scale(${s / 10})`}>
      <path d="M0.6 3.6 C0.2 -2.4 5.4 -4.6 10.2 -4.6 C10 0.8 6.8 4.6 0.6 3.6 Z" fill="#3E8E3E" />
      <path d="M1.2 3 C3.8 0.4 6 -1.4 8.6 -3" stroke="#E8F3DF" strokeWidth={0.7} fill="none" strokeLinecap="round" />
    </g>
  );
  // best: ngôi sao vàng
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.2 : 5.2;
    return `${(5.2 + r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return <g transform={`translate(${x} ${cy}) scale(${s / 10})`}><polygon points={pts} fill="#E2A72E" /></g>;
}
const iconW = (s: number) => s * 1.15;

/** hoạ tiết góc trang theo phong cách; (x,y) = góc, sx/sy = hướng vào trong */
function Corner({ motif, x, y, sx, sy, k, c, c2 }: { motif: Motif; x: number; y: number; sx: number; sy: number; k: number; c: string; c2: string }) {
  const tr = `translate(${x} ${y}) scale(${sx * k} ${sy * k})`;
  switch (motif) {
    case 'lotus': return (
      <g transform={tr} fill="none" stroke={c} strokeWidth={0.45} strokeLinecap="round">
        <path d="M0 14 C4 9 9 7 14 7 M7 0 C7 5 9 10 14 14" />
        <path d="M14 14 C10 8 10 3 14 0 C18 3 18 8 14 14 Z" fill={c2} fillOpacity={0.18} />
        <path d="M14 14 C9 11 6 7 6 3 C10 4 13 8 14 14 Z M14 14 C19 11 22 7 22 3 C18 4 15 8 14 14 Z" />
        <circle cx={14} cy={17} r={1.1} fill={c} stroke="none" />
      </g>
    );
    case 'flame': return (
      <g transform={tr} fill={c} stroke="none">
        <path d="M6 18 C1 14 3 8 7 4 C7 8 10 9 10 6 C14 10 14 16 10 18 Z" opacity={0.9} />
        <path d="M7.5 17.5 C5.5 15.5 6.5 12.5 8 11 C8.5 13 10 13.4 10 12 C11.6 14 11.2 16.6 9.6 17.5 Z" fill={c2} />
      </g>
    );
    case 'deco': return (
      <g transform={tr} fill="none" stroke={c} strokeWidth={0.4}>
        <path d="M0 0 L22 0 M0 0 L0 22 M3 3 L16 3 M3 3 L3 16" />
        {[6, 10, 14].map((r) => <path key={r} d={`M3 ${3 + r} A${r} ${r} 0 0 0 ${3 + r} 3`} />)}
        <circle cx={3} cy={3} r={1.2} fill={c} stroke="none" />
      </g>
    );
    case 'wave': return (
      <g transform={tr} fill="none" stroke={c} strokeWidth={0.4}>
        {[0, 1, 2].map((i) => [0, 1, 2].map((j) => (
          <g key={`${i}-${j}`} transform={`translate(${i * 8 + (j % 2) * 4} ${j * 4})`}>
            {[4, 2.8, 1.6].map((r) => <path key={r} d={`M${4 - r} 4 A${r} ${r} 0 0 1 ${4 + r} 4`} />)}
          </g>
        )))}
      </g>
    );
    case 'leaf': return (
      <g transform={tr} stroke="none">
        <path d="M1 20 C4 12 9 6 18 2" stroke={c} strokeWidth={0.5} fill="none" />
        {[[5, 13, -40], [9, 8, -30], [13, 5, -20], [7, 15, 40], [12, 9, 50]].map(([px, py, a], i) => (
          <ellipse key={i} cx={px} cy={py} rx={3.4} ry={1.3} transform={`rotate(${a} ${px} ${py})`} fill={i % 2 ? c2 : c} opacity={0.85} />
        ))}
      </g>
    );
    case 'neon': default: return (
      <g transform={tr} fill="none" stroke={c} strokeWidth={0.45}>
        <path d="M0 0 L18 0 M0 0 L0 18 M4 4 L12 4 L4 12 Z" />
        <path d="M0 6 L6 0 M0 11 L11 0" stroke={c2} strokeWidth={0.35} />
      </g>
    );
  }
}

/** đĩa món vẽ code khi chưa có ảnh: nhìn từ trên, màu theo ẩm thực */
function Plate({ x, y, w, h, seed, cuisine, pal }: { x: number; y: number; w: number; h: number; seed: number; cuisine: string; pal: MBPal }) {
  const R = Math.min(w, h) * 0.4, cx = x + w / 2, cy = y + h / 2;
  let s = 7 + seed * 31; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const food: Record<string, string[]> = {
    viet: ['#B5652B', '#E3A04B', '#6BA34B', '#F2D9A8'], lau: ['#C8381F', '#F08A3A', '#7FB04A', '#F5E1C0'],
    steak: ['#6E3420', '#9C5A33', '#7BA05B', '#E9D7B4'], asia: ['#F08A6B', '#F4C6A8', '#5F9E5A', '#FFFFFF'],
    chay: ['#7FB04A', '#E8B04B', '#C9DF9F', '#F3E7C5'], bar: ['#E3B04B', '#F07B5B', '#7BD3C8', '#F7EFD9'],
  };
  const cols = food[cuisine] || food.viet;
  const bgDark = isDarkHex(pal.paper);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={bgDark ? shade(pal.paper, 0.12) : shade(pal.rule, 0.35)} />
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={x + r() * w} cy={y + r() * h} r={R * (0.25 + r() * 0.4)} fill={bgDark ? '#FFFFFF' : pal.rule} opacity={0.08} />)}
      <ellipse cx={cx + R * 0.08} cy={cy + R * 0.1} rx={R * 1.04} ry={R * 1.0} fill="#000" opacity={0.18} />
      <circle cx={cx} cy={cy} r={R} fill="#FBFAF6" />
      <circle cx={cx} cy={cy} r={R * 0.78} fill="#F1EEE7" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = r() * Math.PI * 2, d = r() * R * 0.38;
        return <ellipse key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} rx={R * (0.16 + r() * 0.16)} ry={R * (0.1 + r() * 0.12)} transform={`rotate(${r() * 180} ${cx + Math.cos(a) * d} ${cy + Math.sin(a) * d})`} fill={cols[i % 3]} />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const a = r() * Math.PI * 2, d = R * (0.1 + r() * 0.5);
        return <circle key={`h${i}`} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={R * 0.045} fill={i % 2 ? cols[2] : cols[3]} />;
      })}
      <rect x={cx + R * 1.12} y={cy - R * 0.9} width={R * 0.07} height={R * 1.9} rx={R * 0.03} fill={bgDark ? '#C9B79A' : '#8B6A4A'} transform={`rotate(8 ${cx + R * 1.12} ${cy})`} />
    </g>
  );
}

// ---------- dàn trang ----------
interface Geo { W: number; H: number; k: number; mx: number; top: number; bottom: number; cw: number; gap: number; cols: 1 | 2 }
function geoOf(spec: MBSpec): Geo {
  const sz = mbSize(spec.size);
  const W = sz.wMm, H = sz.hMm, k = W / 148;
  const mx = 12 * k, gap = 8 * k;
  const top = 20 * k, bottom = H - 17 * k;
  const cw = spec.cols === 2 ? (W - mx * 2 - gap) / 2 : W - mx * 2;
  return { W, H, k, mx, top, bottom, cw, gap, cols: spec.cols };
}
/** cỡ chữ cơ bản (mm) theo khổ + số cột */
const baseSize = (g: Geo, sc = 1) => (g.cols === 2 ? 3.25 : 3.55) * g.k * sc;

interface Blk { kind: 'head' | 'item' | 'feat'; h: number; keep?: boolean; draw: (x: number, y: number) => ReactNode; name?: string }
interface Ctx { spec: MBSpec; st: MBStyle; pal: MBPal; disp: TS; g: Geo; photos: MBPhotos; sc: number }

function headBlock(sec: MBSection, c: Ctx): Blk {
  const { g, pal, disp, spec } = c;
  const hs = (g.cols === 2 ? 5.2 : 5.8) * g.k * Math.min(c.sc, 1.15);
  const title = fit(sec.title.toUpperCase(), g.cw, hs, { ...disp, ls: hs * 0.04 }, 1, 0.6);
  const en = spec.bilingual && sec.en ? fit(sec.en, g.cw, hs * 0.5, { fam: EN_FAM, wt: 500, it: true }, 1) : null;
  const h = hs * 0.25 + title.size + (en ? en.size * 1.25 : 0) + 3.4 * g.k + 2.6 * g.k;
  return {
    kind: 'head', h, keep: true,
    draw: (x, y) => {
      const yb = y + hs * 0.25 + title.size * 0.82;
      const ye = yb + (en ? en.size * 1.25 : 0);
      const yr = ye + 2.2 * g.k;
      return (
        <g>
          {T(x, yb, title.lines[0], title.size, { ...disp, ls: title.size * 0.04 }, pal.accent)}
          {en && T(x, ye, en.lines[0], en.size, { fam: EN_FAM, wt: 500, it: true }, pal.sub)}
          <line x1={x} y1={yr} x2={x + g.cw} y2={yr} stroke={pal.rule} strokeWidth={0.3 * g.k} />
          <line x1={x} y1={yr} x2={x + Math.min(g.cw, 18 * g.k)} y2={yr} stroke={pal.accent2} strokeWidth={0.9 * g.k} />
        </g>
      );
    },
  };
}

function itemBlock(it: MBItem, c: Ctx): Blk {
  const { g, pal, spec } = c;
  const ns = baseSize(g, c.sc), ds = ns * 0.78, es = ns * 0.98;
  const nameTS: TS = { fam: BODY, wt: 800 };
  const price = fmtPrice(it.price, spec.price);
  const pw = price ? tw(price, ns, nameTS) : 0;
  const icons = it.tags.filter((t) => t !== 'dacbiet');
  const icW = icons.length ? icons.length * iconW(ns * 0.95) + 1 * g.k : 0;
  const nameMax = g.cw - pw - 4 * g.k - icW;
  const name = fit(it.name, Math.max(nameMax, g.cw * 0.4), ns, nameTS, 2, 0.8, false);
  const en = spec.bilingual && it.en ? fit(it.en, g.cw - pw * 0.2, es, { fam: EN_FAM, wt: 500, it: true }, 1, 0.7) : null;
  const desc = it.desc ? fit(it.desc, g.cw * 0.94, ds, { fam: BODY, wt: 600 }, 2, 0.85, false) : null;
  const nlh = name.size * 1.24, elh = es * 1.12, dlh = ds * 1.38;
  const h = name.lines.length * nlh + (en ? elh : 0) + (desc ? desc.lines.length * dlh : 0) + ns * 0.85;
  return {
    kind: 'item', h, name: it.name,
    draw: (x, y) => {
      const b1 = y + name.size * 0.95;
      const lastW = tw(name.lines[name.lines.length - 1], name.size, nameTS);
      const lastY = b1 + (name.lines.length - 1) * nlh;
      const icX = x + lastW + 1.2 * g.k;
      const lineEnd = name.lines.length === 1 ? icX + (icons.length ? icons.length * iconW(ns * 0.95) : 0) : x + tw(name.lines[0], name.size, nameTS);
      const lead0 = lineEnd + 1.6 * g.k, lead1 = x + g.cw - pw - 1.6 * g.k;
      let yy = lastY;
      const nodes: ReactNode[] = [];
      name.lines.forEach((ln, i) => nodes.push(<g key={`n${i}`}>{T(x, b1 + i * nlh, ln, name.size, nameTS, pal.ink)}</g>));
      icons.forEach((ic, i) => nodes.push(<Icon key={`i${ic}`} kind={ic} x={icX + i * iconW(ns * 0.95)} y={lastY} s={ns * 0.95} />));
      if (price) {
        if (lead1 - lead0 > 3 * g.k) nodes.push(<line key="lead" x1={lead0} y1={b1 - 0.3 * g.k} x2={lead1} y2={b1 - 0.3 * g.k} stroke={pal.sub} strokeWidth={0.32 * g.k} strokeDasharray={`${0.3 * g.k} ${1.1 * g.k}`} strokeLinecap="round" opacity={0.7} />);
        nodes.push(<g key="p">{T(x + g.cw, b1, price, ns, nameTS, pal.accent, 'end')}</g>);
      }
      if (en) { yy += elh; nodes.push(<g key="en">{T(x, yy, en.lines[0], en.size, { fam: EN_FAM, wt: 500, it: true }, pal.sub)}</g>); }
      if (desc) desc.lines.forEach((ln, i) => { yy += dlh; nodes.push(<g key={`d${i}`}>{T(x, yy, ln, desc.size, { fam: BODY, wt: 600 }, pal.sub)}</g>); });
      return <g>{nodes}</g>;
    },
  };
}

let clipSeq = 0;
function featBlock(it: MBItem, idx: number, c: Ctx): Blk {
  const { g, pal, spec, disp, photos, st } = c;
  const ns = baseSize(g, c.sc);
  const ph = g.cw * (g.cols === 2 ? 0.6 : 0.42);
  const price = fmtPrice(it.price, spec.price);
  const nm = fit(it.name, g.cw - (price ? tw(price, ns * 1.05, { fam: BODY, wt: 800 }) + 10 * g.k : 0), ns * 1.32, disp, 2, 0.7);
  const en = spec.bilingual && it.en ? fit(it.en, g.cw, ns * 0.98, { fam: EN_FAM, wt: 500, it: true }, 1, 0.7) : null;
  const desc = it.desc ? fit(it.desc, g.cw, ns * 0.8, { fam: BODY, wt: 600 }, 2, 0.85, false) : null;
  const nlh = nm.size * 1.18;
  const h = ph + 3 * g.k + nm.lines.length * nlh + (en ? ns * 1.15 : 0) + (desc ? desc.lines.length * ns * 0.8 * 1.38 : 0) + ns * 1.3;
  const photo = photos[it.name];
  return {
    kind: 'feat', h, name: it.name,
    draw: (x, y) => {
      const id = `mbclip${++clipSeq}`;
      const r = 2 * g.k;
      let yy = y + ph + 3 * g.k + nm.size * 0.9;
      const nodes: ReactNode[] = [];
      nm.lines.forEach((ln, i) => nodes.push(<g key={`n${i}`}>{T(x, yy + i * nlh, ln, nm.size, disp, pal.ink)}</g>));
      if (price) {
        const pwd = tw(price, ns * 1.05, { fam: BODY, wt: 800 }) + 5 * g.k;
        nodes.push(
          <g key="p">
            <rect x={x + g.cw - pwd} y={yy - nm.size * 0.85} width={pwd} height={ns * 1.6} rx={ns * 0.8} fill={pal.accent} />
            {T(x + g.cw - pwd / 2, yy - nm.size * 0.85 + ns * 1.12, price, ns * 1.05, { fam: BODY, wt: 800 }, isDarkHex(pal.accent) ? '#FFFFFF' : '#1A1A1A', 'middle')}
          </g>,
        );
      }
      yy += (nm.lines.length - 1) * nlh;
      if (en) { yy += ns * 1.15; nodes.push(<g key="en">{T(x, yy, en.lines[0], en.size, { fam: EN_FAM, wt: 500, it: true }, pal.sub)}</g>); }
      if (desc) desc.lines.forEach((ln, i) => { yy += ns * 0.8 * 1.38; nodes.push(<g key={`d${i}`}>{T(x, yy, ln, desc.size, { fam: BODY, wt: 600 }, pal.sub)}</g>); });
      const badge = spec.bilingual ? 'ĐẶC BIỆT · SIGNATURE' : 'MÓN ĐẶC BIỆT';
      const bs = ns * 0.72, bw = tw(badge, bs, { fam: BODY, wt: 800, ls: bs * 0.08 }) + 5 * g.k;
      return (
        <g data-feat={it.name}>
          <defs><clipPath id={id}><rect x={x} y={y} width={g.cw} height={ph} rx={r} /></clipPath></defs>
          <g clipPath={`url(#${id})`}>
            {photo
              ? <image href={photo} x={x} y={y} width={g.cw} height={ph} preserveAspectRatio="xMidYMid slice" />
              : <Plate x={x} y={y} w={g.cw} h={ph} seed={idx} cuisine={st.cuisine} pal={pal} />}
          </g>
          <rect x={x} y={y} width={g.cw} height={ph} rx={r} fill="none" stroke={pal.accent2} strokeWidth={0.35 * g.k} />
          <rect x={x + 3 * g.k} y={y + 3 * g.k} width={bw} height={bs * 2} rx={bs} fill={pal.accent2} />
          {T(x + 3 * g.k + bw / 2, y + 3 * g.k + bs * 1.38, badge, bs, { fam: BODY, wt: 800, ls: bs * 0.08 }, isDarkHex(pal.accent2) ? '#FFFFFF' : '#1A1A1A', 'middle')}
          {nodes}
        </g>
      );
    },
  };
}

export type PageModel =
  | { kind: 'intro' }
  | { kind: 'menu'; cols: Blk[][]; no: number }
  | { kind: 'brand' }
  | { kind: 'close' };
export interface MBLayout { pages: PageModel[]; needed: number; overflow: boolean; menuPages: number }

/** chia thực đơn thành trang (cột chảy liên tục, tiêu đề mục không đứng một mình cuối cột, trang cuối cân 2 cột) */
/** chữ to dần (tối đa +30%) chừng nào số trang thực đơn chưa tăng → trang đầy đặn, dễ đọc */
export function layoutMenu(spec: MBSpec, data: MBData, photos: MBPhotos): MBLayout {
  const base = layoutAt(spec, data, photos, 1);
  for (const sc of [1.3, 1.22, 1.14, 1.07]) {
    const l = layoutAt(spec, data, photos, sc);
    if (l.menuPages <= base.menuPages) return l;
  }
  return base;
}
function layoutAt(spec: MBSpec, data: MBData, photos: MBPhotos, sc: number): MBLayout {
  const st = mbStyle(spec.style), g = geoOf(spec);
  const c: Ctx = { spec, st, pal: st.pal, disp: { fam: mbFont(spec.font).family, wt: mbFont(spec.font).weight }, g, photos, sc };
  const blocks: Blk[] = [];
  let fi = 0;
  for (const sec of parseMenu(data.menu || '')) {
    if (sec.title) blocks.push(headBlock(sec, c));
    for (const it of sec.items) blocks.push(it.tags.includes('dacbiet') ? featBlock(it, fi++, c) : itemBlock(it, c));
  }
  const colH = g.bottom - g.top;
  const flow = (limit: number) => {
    const columns: Blk[][] = [[]];
    let used = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const col = columns[columns.length - 1];
      const nextH = b.keep && blocks[i + 1] ? blocks[i + 1].h : 0;
      if (col.length && used + b.h + nextH > limit) { columns.push([b]); used = b.h; }
      else { col.push(b); used += b.h; }
    }
    if (!columns[columns.length - 1].length) columns.pop();
    return columns;
  };
  const per = g.cols;
  let columns = flow(colH);
  // dàn đều: số trang giữ nguyên nhưng hạ "trần" cột để các trang đầy đều nhau (không để trang cuối trống hoác)
  const pagesNeeded = Math.ceil(columns.length / per);
  if (pagesNeeded > 1) {
    const total = blocks.reduce((a, b) => a + b.h, 0);
    for (let lim = Math.max(total / (pagesNeeded * per), ...blocks.map((b) => b.h)); lim < colH; lim *= 1.03) {
      const c2 = flow(lim);
      if (Math.ceil(c2.length / per) <= pagesNeeded) { columns = c2; break; }
    }
  }
  const menuPages: Blk[][][] = [];
  for (let i = 0; i < columns.length; i += per) menuPages.push(columns.slice(i, i + per));
  // trang cuối 2 cột: dồn lại rồi chia đôi cho cân (không để tiêu đề mục ở đáy cột trái)
  if (per === 2 && menuPages.length) {
    const last = menuPages[menuPages.length - 1].flat();
    const tot = last.reduce((a, b) => a + b.h, 0);
    let best = last.length, bestV = Infinity, acc = 0;
    for (let i = 0; i <= last.length; i++) {
      if (i > 0) acc += last[i - 1].h;
      if (i > 0 && last[i - 1].keep) continue;
      if (acc > colH || tot - acc > colH) continue;
      const v = Math.max(acc, tot - acc);
      if (v < bestV) { bestV = v; best = i; }
    }
    menuPages[menuPages.length - 1] = [last.slice(0, best), last.slice(best)];
  }
  const head: PageModel[] = spec.intro ? [{ kind: 'intro' }] : [];
  const menu: PageModel[] = menuPages.map((cols, i) => ({ kind: 'menu', cols, no: i }));
  const needed = head.length + menu.length + 1;
  let total = spec.pages === 'auto' ? Math.max(4, needed + (needed % 2)) : spec.pages;
  total = Math.min(16, total);
  const overflow = needed > total;
  const room = total - head.length - 1;
  const body = menu.slice(0, Math.max(0, room));
  while (body.length < room) body.push({ kind: 'brand' });
  return { pages: [...head, ...body, { kind: 'close' }], needed, overflow, menuPages: menu.length };
}

// ---------- trang ruột ----------
function Frame({ g, st, b, small }: { g: Geo; st: MBStyle; b: number; small?: boolean }) {
  const p = st.pal, k = g.k, m = 5 * k, ck = k * (small ? 0.4 : 0.55);
  return (
    <g>
      <rect x={-b} y={-b} width={g.W + b * 2} height={g.H + b * 2} fill={p.paper} />
      <rect x={m} y={m} width={g.W - m * 2} height={g.H - m * 2} fill="none" stroke={p.rule} strokeWidth={0.35 * k} />
      {st.motif === 'deco' && <rect x={m + 1.4 * k} y={m + 1.4 * k} width={g.W - m * 2 - 2.8 * k} height={g.H - m * 2 - 2.8 * k} fill="none" stroke={p.accent} strokeWidth={0.25 * k} />}
      <Corner motif={st.motif} x={m + 1 * k} y={m + 1 * k} sx={1} sy={1} k={ck} c={p.accent} c2={p.accent2} />
      <Corner motif={st.motif} x={g.W - m - 1 * k} y={m + 1 * k} sx={-1} sy={1} k={ck} c={p.accent} c2={p.accent2} />
      <Corner motif={st.motif} x={m + 1 * k} y={g.H - m - 1 * k} sx={1} sy={-1} k={ck} c={p.accent} c2={p.accent2} />
      <Corner motif={st.motif} x={g.W - m - 1 * k} y={g.H - m - 1 * k} sx={-1} sy={-1} k={ck} c={p.accent} c2={p.accent2} />
    </g>
  );
}

function Monogram({ cx, cy, r, brand, logo, color, ring, disp }: { cx: number; cy: number; r: number; brand: string; logo: MBLogo | null; color: string; ring: string; disp: TS }) {
  if (logo) {
    const sc = Math.min((r * 2) / logo.w, (r * 2) / logo.h);
    const w = logo.w * sc, h = logo.h * sc;
    return <image href={logo.href} x={cx - w / 2} y={cy - h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" />;
  }
  const ini = initials(brand);
  const fs = r * (ini.length > 1 ? 0.78 : 1.0);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring} strokeWidth={r * 0.05} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={ring} strokeWidth={r * 0.02} />
      {T(cx, cy + fs * 0.35, ini, fs, disp, color, 'middle')}
    </g>
  );
}

const legendItems = (bil: boolean) => [
  { k: 'cay', t: bil ? 'Cay · Spicy' : 'Cay' }, { k: 'chay', t: bil ? 'Chay · Vegetarian' : 'Món chay' }, { k: 'best', t: bil ? 'Bán chạy · Best seller' : 'Bán chạy' },
];

export function PageSvg({ spec, data, model, pageNo, logo, bleed = 0, style }: {
  spec: MBSpec; data: MBData; model: PageModel; pageNo: number; logo: MBLogo | null; bleed?: number; style?: CSSProperties;
}) {
  const st = mbStyle(spec.style), g = geoOf(spec), p = st.pal, k = g.k;
  const disp: TS = { fam: mbFont(spec.font).family, wt: mbFont(spec.font).weight };
  const b = bleed;
  const vb = `${-b} ${-b} ${g.W + b * 2} ${g.H + b * 2}`;
  const cx = g.W / 2;
  let body: ReactNode = null;

  if (model.kind === 'menu') {
    const x0 = g.mx;
    // đầu trang: tên quán + số trang; chân trang: chú thích icon + ghi chú
    const hdr = fit((data.brand || '').toUpperCase(), g.W * 0.5, 2.8 * k, { ...disp, ls: 0.6 * k }, 1);
    const ls = 2.3 * k;
    const fx0 = 17 * k, fx1 = g.W - 17 * k;
    let lx = fx0;
    const legend = legendItems(spec.bilingual).map((l) => {
      const node = <g key={l.k}><Icon kind={l.k} x={lx} y={g.H - 9 * k} s={ls * 1.1} />{T(lx + iconW(ls * 1.1) + 0.6 * k, g.H - 9 * k, l.t, ls, { fam: BODY, wt: 600 }, p.sub)}</g>;
      lx += iconW(ls * 1.1) + 0.6 * k + tw(l.t, ls, { fam: BODY, wt: 600 }) + 4 * k;
      return node;
    });
    const noteTxt = [spec.price === 'num' ? 'Đơn vị: nghìn đồng' : '', data.note || ''].filter(Boolean).join(' · ');
    const note = noteTxt ? fit(noteTxt, Math.max(10 * k, fx1 - lx - 2 * k), ls, { fam: BODY, wt: 600 }, 1, 0.75) : null;
    body = (
      <>
        {T(cx, 13 * k, hdr.lines[0] || '', hdr.size, { ...disp, ls: 0.6 * k }, p.sub, 'middle')}
        <line x1={cx - 10 * k} y1={15.2 * k} x2={cx + 10 * k} y2={15.2 * k} stroke={p.accent2} strokeWidth={0.4 * k} />
        {model.cols.map((col, ci) => {
          let y = g.top;
          const x = x0 + ci * (g.cw + g.gap);
          return <g key={ci} data-col={ci}>{col.map((blk, bi) => { const n = <g key={bi} data-blk={blk.kind}>{blk.draw(x, y)}</g>; y += blk.h; return n; })}</g>;
        })}
        {g.cols === 2 && model.cols[1]?.length ? <line x1={g.W / 2} y1={g.top + 2 * k} x2={g.W / 2} y2={g.bottom - 6 * k} stroke={p.rule} strokeWidth={0.25 * k} /> : null}
        <line x1={g.mx} y1={g.H - 13 * k} x2={g.W - g.mx} y2={g.H - 13 * k} stroke={p.rule} strokeWidth={0.25 * k} />
        {legend}
        {note && T(fx1, g.H - 9 * k, note.lines[0], note.size, { fam: BODY, wt: 600 }, p.sub, 'end')}
        {T(cx, g.H - 5.9 * k, String(pageNo), 2.2 * k, { fam: BODY, wt: 800 }, p.accent, 'middle')}
      </>
    );
  } else if (model.kind === 'intro') {
    const bs = 13 * k;
    const brand = fit(data.brand || '', g.W - g.mx * 2.4, bs, disp, 2, 0.5);
    const tag = fit((data.tagline || '').toUpperCase(), g.W - g.mx * 3, 3 * k, { fam: BODY, wt: 800, ls: 0.9 * k }, 1, 0.6);
    const story = fit(data.story || '', g.W - g.mx * 3.2, 3.7 * k, { fam: EN_FAM, wt: 500, it: true }, 7, 0.75, false);
    let y = g.H * 0.3;
    const mono = <Monogram cx={cx} cy={g.H * 0.2} r={11 * k} brand={data.brand} logo={logo} color={p.accent} ring={p.accent2} disp={disp} />;
    const brandEls = brand.lines.map((ln, i) => <g key={i}>{T(cx, y + brand.size * 0.9 + i * brand.size * 1.1, ln, brand.size, disp, p.ink, 'middle')}</g>);
    y += brand.size * 0.9 + (brand.lines.length - 1) * brand.size * 1.1 + 8 * k;
    const tagEl = tag.lines[0] ? T(cx, y, tag.lines[0], tag.size, { fam: BODY, wt: 800, ls: 0.9 * k * (tag.size / (3 * k)) }, p.accent, 'middle') : null;
    y += 6 * k;
    const orn = <g><line x1={cx - 22 * k} y1={y} x2={cx - 4 * k} y2={y} stroke={p.accent2} strokeWidth={0.4 * k} /><circle cx={cx} cy={y} r={1.2 * k} fill={p.accent2} /><line x1={cx + 4 * k} y1={y} x2={cx + 22 * k} y2={y} stroke={p.accent2} strokeWidth={0.4 * k} /></g>;
    y += 10 * k;
    const storyEls = story.lines.map((ln, i) => <g key={i}>{T(cx, y + i * story.size * 1.45, ln, story.size, { fam: EN_FAM, wt: 500, it: true }, p.ink, 'middle')}</g>);
    const info = [data.hours ? `Mở cửa: ${data.hours}` : '', data.phone ? `Đặt bàn: ${data.phone}` : ''].filter(Boolean);
    body = (
      <>
        {mono}{brandEls}{tagEl}{orn}{storyEls}
        <Corner motif={st.motif} x={cx - 14 * k * 1.1} y={g.H * 0.74} sx={1} sy={1} k={k * 1.1} c={p.accent} c2={p.accent2} />
        <Corner motif={st.motif} x={cx + 14 * k * 1.1} y={g.H * 0.74} sx={-1} sy={1} k={k * 1.1} c={p.accent} c2={p.accent2} />
        {info.map((t, i) => <g key={i}>{T(cx, g.H - 22 * k + i * 5 * k, fit(t, g.W - g.mx * 2.5, 3 * k, { fam: BODY, wt: 600 }, 1).lines[0], fit(t, g.W - g.mx * 2.5, 3 * k, { fam: BODY, wt: 600 }, 1).size, { fam: BODY, wt: 600 }, p.sub, 'middle')}</g>)}
      </>
    );
  } else if (model.kind === 'brand') {
    const bs = 11 * k;
    const brand = fit(data.brand || '', g.W - g.mx * 2.6, bs, disp, 2, 0.5);
    const y0 = g.H * 0.56;
    body = (
      <>
        <rect x={5 * k} y={5 * k} width={g.W - 10 * k} height={g.H - 10 * k} fill={p.accent} opacity={isDarkHex(p.paper) ? 0.12 : 0.07} />
        <Monogram cx={cx} cy={g.H * 0.38} r={16 * k} brand={data.brand} logo={logo} color={p.accent} ring={p.accent2} disp={disp} />
        {brand.lines.map((ln, i) => <g key={i}>{T(cx, y0 + brand.size * 0.9 + i * brand.size * 1.1, ln, brand.size, disp, p.ink, 'middle')}</g>)}
        {data.tagline && T(cx, y0 + brand.size * 0.9 + (brand.lines.length - 1) * brand.size * 1.1 + 9 * k, fit(data.tagline, g.W - g.mx * 3, 4 * k, { fam: EN_FAM, wt: 500, it: true }, 1).lines[0], fit(data.tagline, g.W - g.mx * 3, 4 * k, { fam: EN_FAM, wt: 500, it: true }, 1).size, { fam: EN_FAM, wt: 500, it: true }, p.sub, 'middle')}
      </>
    );
  } else {
    // trang cuối: cảm ơn + liên hệ + QR
    const ts = 9 * k;
    const thanks = fit(spec.bilingual ? 'Cảm ơn quý khách' : 'Hẹn gặp lại quý khách', g.W - g.mx * 2.6, ts, disp, 1, 0.5);
    const qrText = data.website || (data.phone ? `tel:${data.phone.replace(/\s/g, '')}` : '');
    const q = qrText ? qrPath(qrText) : null;
    const qs = 30 * k;
    const lines = [data.address, data.phone ? `Hotline: ${data.phone}` : '', data.hours ? `Mở cửa: ${data.hours}` : '', data.website].filter(Boolean) as string[];
    let y = g.H * 0.26;
    body = (
      <>
        <Monogram cx={cx} cy={g.H * 0.15} r={9 * k} brand={data.brand} logo={logo} color={p.accent} ring={p.accent2} disp={disp} />
        {T(cx, (y += thanks.size), thanks.lines[0], thanks.size, disp, p.ink, 'middle')}
        {spec.bilingual && T(cx, (y += 7 * k), 'Thank you & see you again', 4 * k, { fam: EN_FAM, wt: 500, it: true }, p.sub, 'middle')}
        <line x1={cx - 16 * k} y1={(y += 7 * k)} x2={cx + 16 * k} y2={y} stroke={p.accent2} strokeWidth={0.4 * k} />
        {lines.map((t, i) => { const f = fit(t, g.W - g.mx * 2.4, 3.3 * k, { fam: BODY, wt: 600 }, 2, 0.7); return <g key={i}>{f.lines.map((ln, j) => <g key={j}>{T(cx, y + 9 * k + i * 6.4 * k + j * f.size * 1.3, ln, f.size, { fam: BODY, wt: 600 }, p.ink, 'middle')}</g>)}</g>; })}
        {q && (
          <g data-qr="1">
            <rect x={cx - qs / 2 - 3 * k} y={g.H * 0.6 - 3 * k} width={qs + 6 * k} height={qs + 6 * k} rx={2 * k} fill="#FFFFFF" />
            <path d={q.d} transform={`translate(${cx - qs / 2} ${g.H * 0.6}) scale(${qs / q.n})`} fill="#111111" shapeRendering="crispEdges" />
            {T(cx, g.H * 0.6 + qs + 9 * k, spec.bilingual ? 'Quét để xem fanpage · Scan me' : 'Quét mã để ghé fanpage', 2.8 * k, { fam: BODY, wt: 600 }, p.sub, 'middle')}
          </g>
        )}
      </>
    );
  }

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-page={pageNo} data-kind={model.kind} data-trim={`${g.W}x${g.H}`}>
      <Frame g={g} st={st} b={b} small={model.kind === 'menu'} />
      {body}
    </svg>
  );
}

// ---------- bìa ----------
export type MBMode = 'color' | 'mask' | 'alpha';
/** bìa trước/sau. Bìa da: không in → màu nền = da, chữ = màu ép; mask = đen trên trắng (khuôn ép); alpha = trắng trên nền trong (3D). ext = lề gập/lề xén (mm) */
export function CoverSvg({ spec, data, logo, face = 'front', mode = 'color', ext = 0, style }: {
  spec: MBSpec; data: MBData; logo: MBLogo | null; face?: 'front' | 'back'; mode?: MBMode; ext?: number; style?: CSSProperties;
}) {
  const st = mbStyle(spec.style), sz = mbSize(spec.size), p = st.pal;
  const W = sz.wMm, H = sz.hMm, k = W / 148, cx = W / 2;
  const disp: TS = { fam: mbFont(spec.font).family, wt: mbFont(spec.font).weight };
  const leather = spec.cover === 'leather';
  const L = mbLeather(spec.leather), F = mbFoil(spec.foil);
  let bg: string | null, ink: string, acc: string, sub: string;
  if (mode === 'mask') { bg = '#FFFFFF'; ink = acc = sub = '#000000'; }
  else if (mode === 'alpha') { bg = null; ink = acc = sub = '#FFFFFF'; }
  else if (leather) { bg = L.color; ink = acc = sub = F.id === 'deboss' ? shade(L.color, -0.38) : F.color; }
  else { bg = p.cover; ink = p.coverInk; acc = p.coverAccent; sub = shade(p.coverInk, isDarkHex(p.cover) ? -0.18 : 0.25); }
  const flat = leather || mode !== 'color';
  const e = ext;
  const vb = `${-e} ${-e} ${W + e * 2} ${H + e * 2}`;
  // logo: bìa da/khuôn ép dùng mặt nạ 1 màu (tô màu ép); bìa in giữ màu gốc
  const fid = `mbtint-${face}-${mode}`;
  const tinted = flat && logo?.mask;
  const logoNode = (r: number, cyy: number) => {
    if (!logo) return <Monogram cx={cx} cy={cyy} r={r} brand={data.brand} logo={null} color={acc} ring={acc} disp={disp} />;
    const src = tinted ? logo.mask! : logo;
    const sc = Math.min((r * 2) / src.w, (r * 2) / src.h);
    const w = src.w * sc, h = src.h * sc;
    return <image href={src.href} x={cx - w / 2} y={cyy - h / 2} width={w} height={h} filter={tinted ? `url(#${fid})` : undefined} preserveAspectRatio="xMidYMid meet" />;
  };

  let body: ReactNode;
  if (face === 'front') {
    const brand = fit(data.brand || '', W - 34 * k, 15 * k, disp, 2, 0.45);
    const by = H * 0.53;
    const menuWord = spec.bilingual ? 'THỰC ĐƠN · MENU' : 'THỰC ĐƠN';
    const mw = fit(menuWord, W - 40 * k, 3.6 * k, { fam: BODY, wt: 800, ls: 1.4 * k }, 1, 0.6);
    const tag = data.tagline ? fit(data.tagline, W - 40 * k, 4.2 * k, { fam: EN_FAM, wt: 500, it: true }, 1, 0.6) : null;
    const lastB = by + (brand.lines.length - 1) * brand.size * 1.08;
    body = (
      <>
        {!flat && <rect x={8 * k} y={8 * k} width={W - 16 * k} height={H - 16 * k} fill="none" stroke={acc} strokeWidth={0.5 * k} />}
        {!flat && <rect x={10 * k} y={10 * k} width={W - 20 * k} height={H - 20 * k} fill="none" stroke={acc} strokeWidth={0.22 * k} />}
        {!flat && [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy], i) => (
          <Corner key={i} motif={st.motif} x={sx > 0 ? 11 * k : W - 11 * k} y={sy > 0 ? 11 * k : H - 11 * k} sx={sx} sy={sy} k={k * 0.9} c={acc} c2={p.coverAccent} />
        ))}
        {flat && <rect x={12 * k} y={12 * k} width={W - 24 * k} height={H - 24 * k} fill="none" stroke={acc} strokeWidth={0.45 * k} />}
        {logoNode(15 * k, H * 0.3)}
        {brand.lines.map((ln, i) => <g key={i}>{T(cx, by + i * brand.size * 1.08, ln, brand.size, disp, ink, 'middle')}</g>)}
        <line x1={cx - 14 * k} y1={lastB + 7 * k} x2={cx + 14 * k} y2={lastB + 7 * k} stroke={acc} strokeWidth={0.5 * k} />
        {T(cx, lastB + 15 * k, mw.lines[0], mw.size, { fam: BODY, wt: 800, ls: 1.4 * k * (mw.size / (3.6 * k)) }, acc, 'middle')}
        {tag && T(cx, H - 22 * k, tag.lines[0], tag.size, { fam: EN_FAM, wt: 500, it: true }, sub, 'middle')}
      </>
    );
  } else {
    const lines = [data.address, data.phone ? `Hotline · ${data.phone}` : '', data.hours ? `Mở cửa · ${data.hours}` : '', data.website].filter(Boolean) as string[];
    const bf = fit((data.brand || '').toUpperCase(), W - 40 * k, 5.4 * k, { ...disp, ls: 0.8 * k }, 1, 0.5);
    const qrText = data.website || (data.phone ? `tel:${data.phone.replace(/\s/g, '')}` : '');
    const q = qrText && !flat ? qrPath(qrText) : null;
    const qs = 26 * k;
    body = (
      <>
        {!flat && <rect x={8 * k} y={8 * k} width={W - 16 * k} height={H - 16 * k} fill="none" stroke={acc} strokeWidth={0.4 * k} />}
        {logoNode(8 * k, H * 0.2)}
        {T(cx, H * 0.2 + 18 * k, bf.lines[0], bf.size, { ...disp, ls: 0.8 * k * (bf.size / (5.4 * k)) }, ink, 'middle')}
        {lines.map((t, i) => { const f = fit(t, W - 36 * k, 3.2 * k, { fam: BODY, wt: 600 }, 1, 0.6); return <g key={i}>{T(cx, H * 0.2 + 30 * k + i * 6 * k, f.lines[0], f.size, { fam: BODY, wt: 600 }, sub, 'middle')}</g>; })}
        {q && (
          <g>
            <rect x={cx - qs / 2 - 2.5 * k} y={H * 0.62 - 2.5 * k} width={qs + 5 * k} height={qs + 5 * k} rx={1.6 * k} fill="#FFFFFF" />
            <path d={q.d} transform={`translate(${cx - qs / 2} ${H * 0.62}) scale(${qs / q.n})`} fill="#111111" shapeRendering="crispEdges" />
          </g>
        )}
        {!flat && <Corner motif={st.motif} x={cx - 10 * k} y={H - 26 * k} sx={1} sy={1} k={k * 0.8} c={acc} c2={p.coverAccent} />}
        {!flat && <Corner motif={st.motif} x={cx + 10 * k} y={H - 26 * k} sx={-1} sy={1} k={k * 0.8} c={acc} c2={p.coverAccent} />}
      </>
    );
  }
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-cover={face} data-mode={mode}>
      {tinted && (
        <defs><filter id={fid} colorInterpolationFilters="sRGB"><feFlood floodColor={acc} /><feComposite in2="SourceAlpha" operator="in" /></filter></defs>
      )}
      {bg && <rect x={-e} y={-e} width={W + e * 2} height={H + e * 2} fill={bg} />}
      {body}
    </svg>
  );
}

// ---------- PDF nhiều trang (JPEG cho nhẹ — trang có ảnh món) + vạch cắt ----------
const MM_PER_IN = 25.4;
export interface MBPdfPage { el: SVGSVGElement; trim: { wMm: number; hMm: number }; bleed: number; dpi?: number; png?: boolean }
export async function mbPdf(pages: MBPdfPage[], fontCss: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const pg of pages) {
    const { pageW, pageH } = printPageDims(pg.trim, pg.bleed);
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
    else pdf.addPage([pageW, pageH], orientation);
    const dpi = pg.dpi || 300;
    const wMm = pg.trim.wMm + pg.bleed * 2, hMm = pg.trim.hMm + pg.bleed * 2;
    const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
    const c = await svgToCanvas(await selfContainedSvg(pg.el, fontCss, { outline: true }), outW, outH, '#ffffff');
    const room = (pageW - wMm) / 2;
    if (pg.png) pdf.addImage(c.toDataURL('image/png'), 'PNG', room, room, wMm, hMm, undefined, 'FAST');
    else pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', room, room, wMm, hMm, undefined, 'FAST');
    // vạch cắt 4 góc vùng thành phẩm
    const tx0 = room + pg.bleed, ty0 = room + pg.bleed, tx1 = tx0 + pg.trim.wMm, ty1 = ty0 + pg.trim.hMm;
    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
    const gap = Math.max(pg.bleed, 1), len = Math.min(4, room - 0.5);
    for (const [x, y, sx, sy] of [[tx0, ty0, 1, 1], [tx1, ty0, -1, 1], [tx0, ty1, 1, -1], [tx1, ty1, -1, -1]] as const) {
      pdf.line(x - sx * gap, y, x - sx * (gap + len), y);
      pdf.line(x, y - sy * gap, x, y - sy * (gap + len));
    }
  }
  return pdf!.output('blob');
}
