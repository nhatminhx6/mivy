'use client';
// Kho hình minh hoạ cho logo (gen OFFLINE bằng Z-Image, tách nền sẵn) — public/logo-art/<nhóm>/<id>.webp.
// User chỉ chọn hình + gõ tên, không gọi AI theo từng request.

import { useEffect, useState } from 'react';

export const LOGO_ART_CATS: { id: string; name: string; industries: string[] }[] = [
  { id: 'coffee_tea', name: 'Cà phê & trà', industries: ['fnb'] },
  { id: 'food', name: 'Quán ăn', industries: ['fnb'] },
  { id: 'bakery', name: 'Tiệm bánh', industries: ['fnb'] },
  { id: 'fashion', name: 'Thời trang', industries: ['fashion'] },
  { id: 'cosmetics', name: 'Mỹ phẩm', industries: ['beauty'] },
  { id: 'nail_spa', name: 'Nail & spa', industries: ['beauty'] },
  { id: 'salon', name: 'Tóc & barber', industries: ['beauty'] },
  { id: 'tech', name: 'Công nghệ', industries: ['tech'] },
  { id: 'baby', name: 'Mẹ & bé', industries: ['kids'] },
  { id: 'edu', name: 'Giáo dục', industries: ['edu', 'kids'] },
  { id: 'pets', name: 'Cá cảnh & thú cưng', industries: ['pet'] },
  { id: 'fitness', name: 'Thể thao', industries: ['fitness'] },
  { id: 'home', name: 'Nhà cửa', industries: ['home'] },
  { id: 'flowers', name: 'Hoa & cây cảnh', industries: ['flowers', 'home'] },
  { id: 'auto', name: 'Xe & sửa xe', industries: ['auto'] },
];

const N: Record<string, Record<string, string>> = {
  coffee_tea: { coffee_cup: 'Ly cà phê', phin: 'Phin', latte_art: 'Latte art', iced_coffee: 'Cà phê đá', bubble_tea: 'Trà sữa', teapot: 'Ấm trà', tea_leaf: 'Lá trà', beans: 'Hạt cà phê', coffee_bag: 'Túi cà phê', cat_cup: 'Mèo trong ly' },
  food: { pho: 'Phở', banh_mi: 'Bánh mì', rice_bowl: 'Cơm', noodle: 'Mì', chef: 'Đầu bếp', pot: 'Nồi', chicken: 'Gà', shrimp: 'Tôm', burger: 'Burger', pizza: 'Pizza' },
  bakery: { cake: 'Bánh kem', cupcake: 'Cupcake', croissant: 'Croissant', bread: 'Bánh mì', donut: 'Donut', macaron: 'Macaron', cookie: 'Cookie', whisk: 'Phới', rolling_pin: 'Cây cán', baker_girl: 'Cô thợ bánh' },
  fashion: { ao_dai: 'Áo dài', dress: 'Váy', tshirt: 'Áo thun', model: 'Người mẫu', handbag: 'Túi xách', high_heel: 'Giày cao gót', sneaker: 'Sneaker', hat: 'Mũ', hanger_heart: 'Móc áo', sewing: 'Máy may' },
  cosmetics: { lipstick: 'Son', serum: 'Serum', cream_jar: 'Hũ kem', perfume: 'Nước hoa', rose_bottle: 'Chai hoa hồng', makeup_brush: 'Cọ trang điểm', mirror: 'Gương', aloe: 'Nha đam', leaf_drop: 'Giọt lá', woman_glow: 'Cô gái' },
  nail_spa: { hand_nails: 'Bàn tay nail', nail_polish: 'Sơn móng', lashes: 'Mi', lotus_spa: 'Sen spa', spa_stones: 'Đá spa', candle_flower: 'Nến hoa', towel_orchid: 'Khăn & lan', foot_spa: 'Spa chân', face_leaf: 'Gương mặt', butterfly_beauty: 'Bướm' },
  salon: { woman_hair: 'Tóc nữ', curly_hair: 'Tóc xoăn', bun_hair: 'Tóc búi', braid: 'Tóc tết', barber_man: 'Barber', mustache_razor: 'Ria & dao cạo', barber_pole: 'Cột barber', scissors_comb: 'Kéo & lược', brush_scissors: 'Lược & kéo', hair_dryer: 'Máy sấy' },
  tech: { phone: 'Điện thoại', laptop: 'Laptop', headphones: 'Tai nghe', smartwatch: 'Đồng hồ', camera: 'Máy ảnh', game_controller: 'Tay cầm game', drone: 'Drone', speaker: 'Loa', charger: 'Sạc', chip: 'Chip' },
  baby: { baby_face: 'Em bé', mother_child: 'Mẹ & bé', teddy: 'Gấu bông', stroller: 'Xe đẩy', bottle: 'Bình sữa', onesie: 'Áo liền', baby_shoes: 'Giày bé', rattle: 'Lục lạc', rocking_horse: 'Ngựa gỗ', stork: 'Cò' },
  edu: { book: 'Sách', grad_cap: 'Mũ tốt nghiệp', owl: 'Cú', pencil: 'Bút chì', backpack: 'Ba lô', globe: 'Quả địa cầu', lightbulb: 'Bóng đèn', abc: 'ABC', student: 'Học sinh', rocket_book: 'Sách tên lửa' },
  pets: { betta: 'Cá betta', goldfish: 'Cá vàng', koi: 'Cá koi', angelfish: 'Cá thần tiên', fishbowl: 'Bể cá', corgi: 'Corgi', shiba: 'Shiba', cat_head: 'Mèo', cat_sitting: 'Mèo ngồi', dog_cat: 'Chó & mèo', rabbit: 'Thỏ', hamster: 'Hamster', parrot: 'Vẹt', turtle: 'Rùa', paw_heart: 'Dấu chân tim' },
  fitness: { dumbbell: 'Tạ đơn', kettlebell: 'Tạ ấm', muscle: 'Cơ bắp', runner: 'Chạy bộ', yoga: 'Yoga', boxing: 'Boxing', swimmer: 'Bơi', bicycle: 'Xe đạp', football: 'Bóng đá', shuttlecock: 'Cầu lông' },
  home: { house: 'Ngôi nhà', key: 'Chìa khoá', armchair: 'Ghế bành', bed: 'Giường', lamp: 'Đèn', kitchen: 'Bếp', window: 'Cửa sổ', plant_shelf: 'Kệ cây', broom: 'Chổi', paint_roller: 'Con lăn sơn' },
  flowers: { rose: 'Hoa hồng', bouquet: 'Bó hoa', sunflower: 'Hướng dương', tulip: 'Tulip', orchid: 'Lan', basket: 'Giỏ hoa', wreath: 'Vòng hoa', bonsai: 'Bonsai', cactus: 'Xương rồng', monstera: 'Monstera' },
  auto: { car: 'Ô tô', motorbike: 'Xe máy', bike_rider: 'Biker', helmet: 'Mũ bảo hiểm', wrench: 'Cờ lê', gear: 'Bánh răng', tire: 'Lốp xe', piston: 'Piston', spark_plug: 'Bugi', car_wash: 'Rửa xe' },
};

export const LOGO_ART: { id: string; cat: string; name: string }[] = LOGO_ART_CATS.flatMap((c) =>
  Object.entries(N[c.id] || {}).map(([k, name]) => ({ id: `${c.id}/${k}`, cat: c.id, name })));

export const artUrl = (id: string) => `/logo-art/${id}.webp`;
export const artCatsForIndustry = (industry: string) => LOGO_ART_CATS.filter((c) => c.industries.includes(industry));
// Ngành chưa có kho riêng (bán lẻ, du lịch…) → mỗi nhóm lấy 1 hình cho đa dạng.
export const artsForIndustry = (industry: string) => {
  const cats = artCatsForIndustry(industry).map((c) => c.id);
  if (!cats.length) return LOGO_ART_CATS.map((c) => LOGO_ART.find((a) => a.cat === c.id)!.id);
  return LOGO_ART.filter((a) => cats.includes(a.cat)).map((a) => a.id);
};

// data URL + tỉ lệ khung: SVG xuất ra (PNG/SVG) phải tự chứa ảnh, không trỏ link ngoài.
const cache = new Map<string, { href: string; ratio: number }>();
export const artInfo = (id: string) => cache.get(id) || { href: artUrl(id), ratio: 1 };

// Chỉ nạp những hình đang hiện (kho ~150 hình, nạp hết thì nặng).
export function useLogoArt(ids: string[]): number {
  const [ver, setVer] = useState(0);
  const key = Array.from(new Set(ids)).filter((id) => !cache.has(id)).join('|');
  useEffect(() => {
    if (!key) return;
    let on = true;
    Promise.all(key.split('|').map(async (id) => {
      const blob = await (await fetch(artUrl(id))).blob();
      const href = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
      const ratio = await new Promise<number>((res) => { const im = new Image(); im.onload = () => res(im.naturalHeight / Math.max(1, im.naturalWidth)); im.onerror = () => res(1); im.src = href; });
      cache.set(id, { href, ratio });
    })).catch(() => null).then(() => { if (on) setVer((v) => v + 1); });
    return () => { on = false; };
  }, [key]);
  return ver;
}
