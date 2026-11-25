'use client';
// Bộ bàn ăn 3D: khay gỗ (vân gỗ vẽ code) lót GIẤY LÓT KHAY của khách → tô phở/bát (Lathe gốm sứ) hoặc ly cà phê / burger
// theo phong cách quán; bên cạnh: khăn giấy gấp 4 (lộ logo, vân dập nổi) + đôi đũa nằm trong BAO ĐŨA in.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface TW3DOpts {
  liner: SVGSVGElement | null; sleeveFront: SVGSVGElement | null; sleeveBack: SVGSVGElement | null; napkin: SVGSVGElement | null;
  linerW: number; linerH: number; style: string; accent: string; accent2: string; fontCss: string;
}

let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

// ---------- vân gỗ ----------
function woodCanvas(base: [number, number, number], len = 1024): HTMLCanvasElement {
  seed = 7;
  const c = document.createElement('canvas'); c.width = len; c.height = len;
  const x = c.getContext('2d')!;
  const [r, g, b] = base;
  x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(0, 0, len, len);
  // dải màu rộng (ván ghép)
  for (let i = 0; i < 6; i++) {
    const y = (i / 6) * len, h = len / 6;
    const k = 0.9 + rnd() * 0.18;
    x.fillStyle = `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},0.55)`; x.fillRect(0, y, len, h);
    x.fillStyle = 'rgba(40,20,8,0.22)'; x.fillRect(0, y, len, 1.5);
  }
  // thớ gỗ: đường lượn sóng chạy dọc chiều dài
  for (let i = 0; i < 260; i++) {
    const y0 = rnd() * len, amp = 2 + rnd() * 7, fr = 0.004 + rnd() * 0.01, ph = rnd() * 6;
    x.strokeStyle = rnd() > 0.5 ? `rgba(70,38,16,${0.06 + rnd() * 0.12})` : `rgba(255,230,190,${0.05 + rnd() * 0.08})`;
    x.lineWidth = 0.6 + rnd() * 1.8;
    x.beginPath();
    for (let px = 0; px <= len; px += 8) { const yy = y0 + Math.sin(px * fr + ph) * amp + Math.sin(px * fr * 3.1) * amp * 0.25; if (px) x.lineTo(px, yy); else x.moveTo(px, yy); }
    x.stroke();
  }
  // mắt gỗ
  for (let k = 0; k < 3; k++) {
    const cx = rnd() * len, cy = rnd() * len;
    for (let j = 6; j > 0; j--) { x.strokeStyle = `rgba(60,30,12,${0.08 + j * 0.02})`; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, j * 9, j * 3.2, 0, 0, Math.PI * 2); x.stroke(); }
  }
  return c;
}
// vân dập nổi khăn giấy (chấm + viền hoa)
function embossCanvas(): HTMLCanvasElement {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
  x.fillStyle = '#B4B4B4';
  for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { if ((i + j) % 2) continue; x.beginPath(); x.arc(i * 8 + 4, j * 8 + 4, 1.6, 0, Math.PI * 2); x.fill(); }
  // viền hoa văn sát mép (2 cạnh gấp + 2 cạnh mở đều có, như khăn thật)
  x.strokeStyle = '#C8C8C8'; x.lineWidth = 3;
  for (let k = 0; k < 2; k++) { const o = 14 + k * 10; x.strokeRect(o, o, n - o * 2, n - o * 2); }
  return c;
}

// ---------- vật thể ----------
function lathe(pts: [number, number][], seg = 96) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * S, y * S)), seg); }

function bowl(accent: string, food: string, kind: string): THREE.Group {
  const g = new THREE.Group();
  const R = 66, H = 60; // tô Ø132mm cao 60mm
  const outer: [number, number][] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; outer.push([30 + (R - 30) * Math.pow(t, 0.72), 6 + (H - 6) * t]); }
  const prof: [number, number][] = [[0, 9], [30, 9.5], ...outer.map(([r, y]) => [r - 3.2, Math.max(9.5, y)] as [number, number]).slice(2), [R - 1.2, H + 0.8], [R + 0.4, H], ...outer.slice().reverse(), [30, 0], [26, 0], [26, 4], [0, 4]];
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#FBFAF6', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const m = new THREE.Mesh(lathe(prof), ceramic); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // 2 chỉ màu quanh miệng tô (đồng bộ màu quán)
  const band = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.22, clearcoat: 1 });
  for (const [r, y, t] of [[R - 1.5, H - 5, 0.9], [R - 3.4, H - 10.5, 0.55]] as const) {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r * S, t * S, 8, 96), band); tor.rotation.x = Math.PI / 2; tor.position.y = y * S; g.add(tor);
  }
  // món bên trong
  const fy = H - 12, fr = R - 8.5;
  if (kind === 'rice') {
    // cơm tấm: hạt cơm tấm (texture lấm tấm) đắp vun + miếng sườn nướng bóng mỡ + trứng ốp la + dưa leo, cà chua
    const rc = document.createElement('canvas'); rc.width = rc.height = 256;
    { const x = rc.getContext('2d')!; x.fillStyle = '#F4EFE2'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(205,195,170,0.55)'; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 2.6, 1.3, rnd() * 3, 0, Math.PI * 2); x.fill(); } }
    const rt = canvasTex(rc, 4); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(3, 3);
    const geo = new THREE.SphereGeometry(fr * S, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = 1 + (rnd() - 0.5) * 0.05; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * 0.42 * k, pos.getZ(i) * k); }
    geo.computeVertexNormals();
    const rice = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.75 }));
    rice.position.y = (fy - 10) * S; rice.receiveShadow = true; g.add(rice);
    const top = fy - 10 + fr * 0.42;
    const rib = new THREE.Mesh(new RoundedBoxGeometry(74 * S, 7 * S, 36 * S, 4, 3.2 * S), new THREE.MeshPhysicalMaterial({ color: '#7A3414', roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.2 }));
    rib.position.set(-10 * S, (top - 3) * S, 8 * S); rib.rotation.set(0.16, 0.55, 0.06); rib.castShadow = true; g.add(rib);
    const char = new THREE.MeshStandardMaterial({ color: '#2E1408', roughness: 0.6 });
    for (let i = 0; i < 4; i++) { const ln = new THREE.Mesh(new THREE.BoxGeometry(3 * S, 1 * S, 34 * S), char); ln.position.set((-30 + i * 14) * S, 3.6 * S, 0); rib.add(ln); }
    const egg = new THREE.Mesh(new THREE.CylinderGeometry(20 * S, 22 * S, 2.4 * S, 40), new THREE.MeshStandardMaterial({ color: '#FFFDF6', roughness: 0.45 }));
    egg.position.set(26 * S, (top - 6) * S, -24 * S); egg.rotation.x = -0.3; g.add(egg);
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(8.5 * S, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#F2A11B', roughness: 0.15, clearcoat: 1 }));
    yolk.position.set(0, 1.2 * S, 0); egg.add(yolk);
    const cuc = new THREE.MeshStandardMaterial({ color: '#BFD99A', roughness: 0.5 }), cucSkin = new THREE.MeshStandardMaterial({ color: '#3F7A2A', roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(11 * S, 11 * S, 2 * S, 28), [cucSkin, cuc, cuc]);
      c.position.set((38 + i * 5) * S, (top - 9 + i * 1.5) * S, (14 + i * 7) * S); c.rotation.set(-0.5, 0, 0.4); g.add(c);
    }
    const tom = new THREE.Mesh(new THREE.CylinderGeometry(10 * S, 10 * S, 2.4 * S, 28), new THREE.MeshPhysicalMaterial({ color: '#D9362A', roughness: 0.3, clearcoat: 0.6 }));
    tom.position.set(20 * S, (top - 4) * S, 30 * S); tom.rotation.set(-0.35, 0, -0.2); g.add(tom);
    return g;
  }
  // mặt nước dùng: texture vẽ code (gradient đậm dần ra mép + sợi bánh phở/mì + váng mỡ) → không phẳng lì
  const brothC = document.createElement('canvas'); brothC.width = brothC.height = 512;
  {
    const x = brothC.getContext('2d')!;
    const [c0, c1] = kind === 'lau' ? ['#D2502A', '#7E2112'] : kind === 'ramen' ? ['#EDD3A2', '#B98A4E'] : ['#D8A04C', '#8E5418'];
    const gr = x.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, c0); gr.addColorStop(0.78, c1); gr.addColorStop(1, '#3E2410');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    // sợi bánh/mì lấp ló dưới nước
    x.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 150, cx = 256 + Math.cos(a) * d, cy = 256 + Math.sin(a) * d;
      x.strokeStyle = kind === 'lau' ? `rgba(255,214,180,${0.08 + rnd() * 0.1})` : `rgba(250,240,214,${0.14 + rnd() * 0.16})`;
      x.lineWidth = kind === 'ramen' ? 5 : 7; x.beginPath(); x.moveTo(cx, cy);
      x.bezierCurveTo(cx + (rnd() - 0.5) * 120, cy + (rnd() - 0.5) * 120, cx + (rnd() - 0.5) * 140, cy + (rnd() - 0.5) * 140, cx + (rnd() - 0.5) * 160, cy + (rnd() - 0.5) * 160);
      x.stroke();
    }
    // váng mỡ
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 220, r0 = 2 + rnd() * 9;
      x.fillStyle = kind === 'lau' ? `rgba(255,120,40,${0.25 + rnd() * 0.3})` : `rgba(255,214,120,${0.25 + rnd() * 0.35})`;
      x.beginPath(); x.ellipse(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, r0, r0 * 0.8, rnd() * 3, 0, Math.PI * 2); x.fill();
    }
  }
  const soup = new THREE.Mesh(new THREE.CircleGeometry(fr * S, 64), new THREE.MeshPhysicalMaterial({ map: canvasTex(brothC, 4), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }));
  void food;
  soup.rotation.x = -Math.PI / 2; soup.position.y = fy * S; g.add(soup);
  // topping: thịt thái lát mỏng xếp quạt (phở/lẩu) — có viền mỡ nhạt
  const sliceC = document.createElement('canvas'); sliceC.width = 128; sliceC.height = 128;
  {
    const x = sliceC.getContext('2d')!;
    x.fillStyle = kind === 'ramen' ? '#E3B08A' : '#8C4C3C'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(245,220,205,${0.25 + rnd() * 0.3})`; x.lineWidth = 2 + rnd() * 3; x.beginPath(); x.moveTo(rnd() * 128, 0); x.bezierCurveTo(rnd() * 128, 40, rnd() * 128, 90, rnd() * 128, 128); x.stroke(); }
    x.strokeStyle = 'rgba(250,232,218,0.85)'; x.lineWidth = 10; x.strokeRect(0, 0, 128, 128);
  }
  const meat = new THREE.MeshStandardMaterial({ map: canvasTex(sliceC, 4), roughness: 0.5 });
  const nSl = kind === 'ramen' ? 3 : 5;
  for (let i = 0; i < nSl; i++) {
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(12 * S, 12 * S, 0.9 * S, 28), meat);
    sl.scale.set(1.45, 1, 0.8);
    sl.position.set((-24 + i * 10) * S, (fy + 0.9 + i * 0.4) * S, (-14 + i * 4) * S); sl.rotation.set(0.05, 0.5 + (rnd() - 0.5) * 0.3, 0.04 * (i % 2 ? 1 : -1)); sl.castShadow = true; g.add(sl);
  }
  // hành lá cắt khoanh + hành tây + ngò
  const scal = new THREE.MeshStandardMaterial({ color: '#58A63C', roughness: 0.5 });
  const onionM = new THREE.MeshStandardMaterial({ color: '#F4F1E6', roughness: 0.4 });
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, d = 8 + rnd() * fr * 0.72;
    const ring = new THREE.Mesh(new THREE.TorusGeometry((1.5 + rnd() * 0.6) * S, 0.85 * S, 6, 14), scal);
    ring.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.4; ring.position.set(Math.cos(a) * d * S, (fy + 1.2) * S, Math.sin(a) * d * S); g.add(ring);
  }
  const leafM = new THREE.MeshStandardMaterial({ color: '#3E8A2E', roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = 1.4 + rnd() * 1.6, d = 20 + rnd() * 30;
    const lf = new THREE.Mesh(new THREE.CircleGeometry(5.5 * S, 7), leafM);
    lf.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.3, 0, rnd() * 6); lf.scale.set(1, 0.75, 1);
    lf.position.set(Math.cos(a) * d * S, (fy + 1.8) * S, Math.sin(a) * d * S); g.add(lf);
  }
  if (kind === 'ramen') {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(13 * S, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#FBF3E2', roughness: 0.35, clearcoat: 0.6 }));
    egg.scale.set(1, 0.55, 1.3); egg.position.set(26 * S, fy * S, 24 * S); g.add(egg);
    const yolk = new THREE.Mesh(new THREE.CircleGeometry(7.5 * S, 24), new THREE.MeshPhysicalMaterial({ color: '#F09A1A', roughness: 0.15, clearcoat: 1 }));
    yolk.rotation.x = -Math.PI / 2; yolk.position.set(26 * S, (fy + 7.3) * S, 24 * S); g.add(yolk);
    const nori = new THREE.Mesh(new THREE.BoxGeometry(34 * S, 40 * S, 0.6 * S), new THREE.MeshStandardMaterial({ color: '#1E2A1E', roughness: 0.7 }));
    nori.position.set(-40 * S, (fy + 12) * S, 30 * S); nori.rotation.set(-0.35, 0.5, 0); g.add(nori);
  }
  if (kind === 'lau') {
    const chili = new THREE.MeshPhysicalMaterial({ color: '#D2261A', roughness: 0.3, clearcoat: 0.8 });
    for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, d = 12 + rnd() * 40; const ch = new THREE.Mesh(new THREE.TorusGeometry(3 * S, 1.3 * S, 6, 16), chili); ch.rotation.x = Math.PI / 2; ch.position.set(Math.cos(a) * d * S, (fy + 1.5) * S, Math.sin(a) * d * S); g.add(ch); }
  }
  return g;
}

function coffee(accent: string): THREE.Group {
  const g = new THREE.Group();
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#FBFAF6', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  // đĩa lót
  const saucer = new THREE.Mesh(lathe([[0, 2], [40, 2.4], [62, 6], [70, 9], [71.5, 8.2], [60, 4.2], [42, 0], [0, 0]]), ceramic);
  saucer.castShadow = true; saucer.receiveShadow = true; g.add(saucer);
  const sband = new THREE.Mesh(new THREE.TorusGeometry(70.2 * S, 1.1 * S, 8, 96), new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.25, clearcoat: 1 }));
  sband.rotation.x = Math.PI / 2; sband.position.y = 8.6 * S; g.add(sband);
  const cup = new THREE.Mesh(lathe([[0, 12], [26, 12.5], [36, 30], [41, 72], [43.4, 73], [44, 71], [39, 30], [30, 6], [24, 4], [0, 4]]), ceramic);
  cup.castShadow = true; g.add(cup);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(15 * S, 3.6 * S, 12, 32, Math.PI * 1.25), ceramic);
  handle.position.set(46 * S, 44 * S, 0); handle.rotation.z = -Math.PI * 0.62; handle.castShadow = true; g.add(handle);
  const band = new THREE.Mesh(new THREE.TorusGeometry(40.2 * S, 0.8 * S, 8, 80), new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.2, clearcoat: 1 }));
  band.rotation.x = Math.PI / 2; band.position.y = 64 * S; g.add(band);
  // mặt cà phê có lớp crema + hoạ tiết latte art đơn giản
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#C89A6A'); gr.addColorStop(0.7, '#8A5530'); gr.addColorStop(1, '#4A2A16');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  // latte art hình trái tim (crema trắng sữa viền nâu)
  const heartP = (k: number) => { x.beginPath(); x.moveTo(128, 196 - 70 * (1 - k)); x.bezierCurveTo(128 - 110 * k, 140 - 40 * k, 128 - 70 * k, 50 + 30 * (1 - k), 128, 96 + 10 * (1 - k)); x.bezierCurveTo(128 + 70 * k, 50 + 30 * (1 - k), 128 + 110 * k, 140 - 40 * k, 128, 196 - 70 * (1 - k)); x.fill(); };
  x.fillStyle = '#F4E6CE'; heartP(1); x.fillStyle = '#C99A6B'; heartP(0.55); x.fillStyle = '#F4E6CE'; heartP(0.32);
  const top = new THREE.Mesh(new THREE.CircleGeometry(40 * S, 48), new THREE.MeshPhysicalMaterial({ map: canvasTex(c, 4), roughness: 0.2, clearcoat: 0.8 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 66 * S; g.add(top);
  return g;
}

function burger(): THREE.Group {
  const g = new THREE.Group();
  const bun = new THREE.MeshPhysicalMaterial({ color: '#D58A3A', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(52 * S, 50 * S, 18 * S, 48), bun); bottom.position.y = 9 * S; g.add(bottom);
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(55 * S, 55 * S, 13 * S, 48), new THREE.MeshStandardMaterial({ color: '#4A2614', roughness: 0.85 })); patty.position.y = 24 * S; g.add(patty);
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(84 * S, 2 * S, 84 * S), new THREE.MeshPhysicalMaterial({ color: '#F6B623', roughness: 0.35, clearcoat: 0.5 }));
  cheese.position.y = 31.5 * S; cheese.rotation.y = 0.4; g.add(cheese);
  const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(58 * S, 56 * S, 3.5 * S, 24), new THREE.MeshStandardMaterial({ color: '#69B33A', roughness: 0.6 }));
  lettuce.position.y = 34.5 * S; g.add(lettuce);
  const tomato = new THREE.Mesh(new THREE.CylinderGeometry(46 * S, 46 * S, 4 * S, 40), new THREE.MeshStandardMaterial({ color: '#D7341E', roughness: 0.4 }));
  tomato.position.y = 38.5 * S; g.add(tomato);
  const topGeo = new THREE.SphereGeometry(54 * S, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2); topGeo.scale(1, 0.62, 1);
  const top = new THREE.Mesh(topGeo, bun); top.position.y = 40.5 * S; g.add(top);
  const seedM = new THREE.MeshStandardMaterial({ color: '#F6EBD2', roughness: 0.6 });
  for (let i = 0; i < 26; i++) {
    const th = rnd() * Math.PI * 2, ph = 0.25 + rnd() * 0.95;
    const sd = new THREE.Mesh(new THREE.SphereGeometry(1.5 * S, 6, 4), seedM); sd.scale.set(1.8, 0.5, 1);
    sd.position.set(Math.sin(ph) * Math.cos(th) * 54 * S, 40.5 * S + Math.cos(ph) * 54 * 0.62 * S, Math.sin(ph) * Math.sin(th) * 54 * S);
    sd.lookAt(0, 0, 0); g.add(sd);
  }
  g.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
  return g;
}

export function tablewareBuilder(o: TW3DOpts): Builder {
  return async (aniso) => {
    if (!o.liner || !o.sleeveFront || !o.sleeveBack || !o.napkin) throw new Error('Chưa dựng xong thiết kế');
    seed = 11;
    const [lt, sf, sb, nt] = await Promise.all([
      svgTex(o.liner, o.fontCss, 2048, aniso),
      svgTex(o.sleeveFront, o.fontCss, 1600, aniso),
      svgTex(o.sleeveBack, o.fontCss, 1600, aniso),
      svgTex(o.napkin, o.fontCss, 900, aniso),
    ]);
    const g = new THREE.Group();
    const W = o.linerW, D = o.linerH;

    // ---- khay gỗ ----
    const rimW = 12, pad = 10, TW = W + (pad + rimW) * 2, TD = D + (pad + rimW) * 2, base = 9, rimH = 22;
    const woodTex = canvasTex(woodCanvas([176, 122, 74]), aniso);
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    const woodTop = new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5 });
    const woodSide = new THREE.MeshPhysicalMaterial({ map: woodTex, color: '#D9C2A6', roughness: 0.6, clearcoat: 0.25 });
    const board = new THREE.Mesh(new RoundedBoxGeometry(TW * S, base * S, TD * S, 3, 2.5 * S), [woodSide, woodSide, woodTop, woodSide, woodSide, woodSide]);
    board.position.y = (base / 2) * S; board.castShadow = true; board.receiveShadow = true; g.add(board);
    const slat = (w: number, d: number, x: number, z: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, rimH * S, d * S, 3, 3 * S), woodSide);
      m.position.set(x * S, (base + rimH / 2 - 1) * S, z * S); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    slat(TW, rimW, 0, -(TD - rimW) / 2); slat(TW, rimW, 0, (TD - rimW) / 2);
    slat(rimW, TD - rimW * 2, -(TW - rimW) / 2, 0); slat(rimW, TD - rimW * 2, (TW - rimW) / 2, 0);
    // lỗ cầm 2 đầu khay (rãnh tối)
    const slot = new THREE.MeshStandardMaterial({ color: '#3A2414', roughness: 0.9 });
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new RoundedBoxGeometry(1 * S, 7 * S, Math.min(90, TD * 0.3) * S, 2, 0.45 * S), slot);
      h.position.set(sx * (TW / 2 + 0.2) * S, (base + rimH * 0.62) * S, 0); g.add(h);
    }

    // ---- giấy lót khay ----
    const linerMat = new THREE.MeshPhysicalMaterial({ map: lt, roughness: 0.78, sheen: 0.2, sheenRoughness: 0.9 });
    const liner = new THREE.Mesh(new THREE.PlaneGeometry(W * S, D * S, 1, 1), linerMat);
    liner.rotation.x = -Math.PI / 2; liner.position.y = (base + 0.25) * S; liner.receiveShadow = true; g.add(liner);
    const top = base + 0.5;

    // ---- món ăn trên khay (góc trái-sau, lấn 1 phần cột câu chuyện) ----
    const st = o.style;
    const land = W >= D;
    const dish = st === 'cafe' ? coffee(o.accent) : st === 'fastfood' ? burger() : bowl(o.accent, st === 'lau' ? '#B23A1C' : st === 'asia' ? '#D9A55C' : '#C98939', st === 'comtam' ? 'rice' : st === 'asia' ? 'ramen' : st === 'lau' ? 'lau' : 'pho');
    if (st === 'fastfood') {
      // burger nằm trên giấy gói nhỏ
      const wrap = new THREE.Mesh(new THREE.PlaneGeometry(150 * S, 150 * S), new THREE.MeshStandardMaterial({ color: '#F4EBDC', roughness: 0.9 }));
      wrap.rotation.set(-Math.PI / 2, 0, 0.5); wrap.position.y = (top + 0.2) * S;
      const wg = new THREE.Group(); wg.add(wrap); dish.position.y = (0.6) * S; wg.add(dish);
      wg.position.set((-W / 2 + 92) * S, top * S, (D / 2 - 84) * S); g.add(wg);
    } else {
      dish.position.set((-W / 2 + (land ? 82 : 72)) * S, top * S, (D / 2 - (land ? 74 : 58)) * S);
      g.add(dish);
    }

    // ---- khăn giấy gấp 4 (lộ logo) nằm cạnh khay ----
    const F = 165;
    const emb = canvasTex(embossCanvas(), aniso); emb.colorSpace = THREE.NoColorSpace;
    const napTop = new THREE.MeshStandardMaterial({ map: nt, bumpMap: emb, bumpScale: 0.6, roughness: 0.95 });
    const napEdge = new THREE.MeshStandardMaterial({ color: '#F6F5F2', roughness: 0.95 });
    const nap = new THREE.Group();
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const off = (layers - 1 - i) * 0.7;
      const m = new THREE.Mesh(new RoundedBoxGeometry(F * S, 0.75 * S, F * S, 2, 0.35 * S), i === layers - 1 ? [napEdge, napEdge, napTop, napEdge, napEdge, napEdge] : napEdge);
      m.position.set(off * S, (0.38 + i * 0.72) * S, off * S); m.castShadow = true; m.receiveShadow = true; nap.add(m);
    }
    // 2 cạnh gấp tròn (mép gấp dày hơn)
    const foldR = (layers * 0.72) / 2;
    for (const [px, pz, ry] of [[-F / 2, 0, 0], [0, -F / 2, Math.PI / 2]] as const) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(foldR * S, foldR * S, F * S, 12), napEdge);
      cyl.rotation.set(Math.PI / 2, 0, ry ? 0 : 0); if (ry) cyl.rotation.set(0, 0, Math.PI / 2);
      cyl.position.set(px * S, foldR * S, pz * S); nap.add(cyl);
    }
    const tx = TW / 2 + F / 2 + 22, tz = TD / 2 - F / 2 + 10;
    nap.position.set(tx * S, 0, tz * S); nap.rotation.y = -0.12; g.add(nap);

    // ---- bao đũa + đôi đũa, nằm chéo trên khăn ----
    const { L, Wd, T } = { L: 250, Wd: 40, T: 5.4 };
    const paperEdge = new THREE.MeshStandardMaterial({ color: '#EFEBE4', roughness: 0.85 });
    const fMat = new THREE.MeshPhysicalMaterial({ map: sf, roughness: 0.6, clearcoat: 0.15 });
    const bMat = new THREE.MeshPhysicalMaterial({ map: sb, roughness: 0.6, clearcoat: 0.15 });
    const sleeve = new THREE.Mesh(new RoundedBoxGeometry(L * S, T * S, Wd * S, 4, 2.5 * S), [paperEdge, paperEdge, fMat, bMat, paperEdge, paperEdge]);
    sleeve.castShadow = true; sleeve.receiveShadow = true;
    const sg = new THREE.Group(); sg.add(sleeve);
    const bamboo = new THREE.MeshPhysicalMaterial({ color: '#D9B37C', roughness: 0.45, clearcoat: 0.4 });
    for (const dz of [-6, 6]) {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * S, 2.1 * S, 235 * S, 12), bamboo);
      ch.rotation.z = Math.PI / 2; ch.position.set((-L / 2 + 235 / 2 - 38) * S, 0, dz * S); ch.castShadow = true; sg.add(ch);
    }
    const napTopY = 0.38 + (layers - 1) * 0.72 + 0.38;
    sg.position.set((tx + 74) * S, (napTopY + T / 2 + 0.6) * S, (tz + 14) * S);
    sg.rotation.y = 1.32;
    g.add(sg);

    // đặt cả cảnh vào giữa
    const bb = new THREE.Box3().setFromObject(g); const c = bb.getCenter(new THREE.Vector3());
    const out = new THREE.Group(); g.position.set(-c.x, 0, -c.z); out.add(g);
    return { group: out, view: { az: 0.06, el: 0.98 }, aim: 0.2, zoom: 1.62, blob: 0.35 };
  };
}
