'use client';
// Kho hình minh hoạ cho logo (gen OFFLINE bằng Z-Image, tách nền sẵn) — public/logo-art/<ngành>/<id>.png.
// User chỉ chọn hình + gõ tên, không gọi AI theo từng request.

import { useEffect, useState } from 'react';

export const LOGO_ART_CATS: { id: string; name: string; industries: string[] }[] = [
  { id: 'pets', name: 'Cá cảnh & thú cưng', industries: ['pet'] },
];

export const LOGO_ART: { id: string; cat: string; name: string }[] = [
  { id: 'pets/betta', cat: 'pets', name: 'Cá betta' },
  { id: 'pets/goldfish', cat: 'pets', name: 'Cá vàng' },
  { id: 'pets/koi', cat: 'pets', name: 'Cá koi' },
  { id: 'pets/fishbowl', cat: 'pets', name: 'Bể cá' },
  { id: 'pets/paw_heart', cat: 'pets', name: 'Dấu chân tim' },
  { id: 'pets/parrot', cat: 'pets', name: 'Vẹt' },
  { id: 'pets/hamster', cat: 'pets', name: 'Hamster' },
];

export const artUrl = (id: string) => `/logo-art/${id}.png`;
export const artsForIndustry = (industry: string) => {
  const cats = LOGO_ART_CATS.filter((c) => c.industries.includes(industry)).map((c) => c.id);
  return LOGO_ART.filter((a) => cats.includes(a.cat)).map((a) => a.id);
};

// data URL + tỉ lệ khung: SVG xuất ra (PNG/SVG) phải tự chứa ảnh, không trỏ link ngoài.
const cache = new Map<string, { href: string; ratio: number }>();
export const artInfo = (id: string) => cache.get(id) || { href: artUrl(id), ratio: 1 };

export function useLogoArt(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    Promise.all(LOGO_ART.filter((a) => !cache.has(a.id)).map(async (a) => {
      const blob = await (await fetch(artUrl(a.id))).blob();
      const href = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
      const ratio = await new Promise<number>((res) => { const im = new Image(); im.onload = () => res(im.naturalHeight / Math.max(1, im.naturalWidth)); im.onerror = () => res(1); im.src = href; });
      cache.set(a.id, { href, ratio });
    })).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}
