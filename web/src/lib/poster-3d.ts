'use client';
// Poster 3D: bản in của poster khách đang chỉnh → thành phẩm treo ở quán.
//  - 'frame': khung mảnh (đen / gỗ sồi) có viền giấy trắng + kính phản chiếu, treo tường
//  - 'tape' : poster giấy bóng dán băng keo 4 góc lên tường, góc dưới hơi cong lên
//  - 'stand': giá đứng chân tròn (kẹp poster trong khung nhôm đen) — đặt trước cửa quán
// Texture = ảnh PNG xuất từ đúng template HTML đang hiển thị (không gen gì thêm).

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';

export type PosterScene = 'frame' | 'tape' | 'stand';
export type FrameColor = 'black' | 'oak' | 'white';

export interface Poster3DOpts {
  /** ảnh poster (canvas đã vẽ sẵn) */
  art: HTMLCanvasElement;
  /** khổ in thật (mm) */
  wMm: number; hMm: number;
  scene: PosterScene;
  frame: FrameColor;
}

/** khổ in gợi ý theo tỉ lệ ảnh (cạnh dài ~ 60cm, 4:5 → 40×50, 9:16 → 45×80) */
export function posterPrintSize(w: number, h: number): { wMm: number; hMm: number; label: string } {
  const r = w / h;
  if (Math.abs(r - 0.8) < 0.03) return { wMm: 400, hMm: 500, label: '40 × 50 cm' };
  if (Math.abs(r - 1) < 0.03) return { wMm: 500, hMm: 500, label: '50 × 50 cm' };
  if (Math.abs(r - 9 / 16) < 0.03) return { wMm: 450, hMm: 800, label: '45 × 80 cm' };
  if (Math.abs(r - 16 / 9) < 0.03) return { wMm: 800, hMm: 450, label: '80 × 45 cm' };
  const long = 600;
  return r >= 1 ? { wMm: long, hMm: Math.round(long / r), label: `${long / 10} × ${Math.round(long / r / 10)} cm` } : { wMm: Math.round(long * r), hMm: long, label: `${Math.round(long * r / 10)} × ${long / 10} cm` };
}

/** cảnh gợi ý theo tỉ lệ: story dọc dài → giá đứng; còn lại → khung treo tường */
export const defaultScene = (w: number, h: number): PosterScene => (h / w > 1.6 ? 'stand' : 'frame');

// ---------- texture phụ (vẽ bằng code) ----------
let wallCanvas: HTMLCanvasElement | null = null;
function wallTex(): THREE.CanvasTexture {
  if (!wallCanvas) {
    const N = 512;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(N * 0.33, N * 0.22, 20, N * 0.45, N * 0.42, N * 1.05);
    gr.addColorStop(0, '#F4EFE7'); gr.addColorStop(1, '#DCD3C5');
    x.fillStyle = gr; x.fillRect(0, 0, N, N);
    const id = x.getImageData(0, 0, N, N);
    let sd = 11; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 8; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
    x.putImageData(id, 0, 0);
    wallCanvas = c;
  }
  const t = new THREE.CanvasTexture(wallCanvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}

let oakCanvas: HTMLCanvasElement | null = null;
function oakTex(): THREE.CanvasTexture {
  if (!oakCanvas) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const x = c.getContext('2d')!;
    x.fillStyle = '#B9875A'; x.fillRect(0, 0, 64, 512);
    let sd = 5; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = `rgba(${90 + r() * 40},${55 + r() * 25},${30 + r() * 15},${0.18 + r() * 0.3})`;
      x.lineWidth = 0.6 + r() * 1.8;
      const x0 = r() * 64; x.beginPath(); x.moveTo(x0, 0);
      for (let y = 0; y <= 512; y += 32) x.lineTo(x0 + Math.sin(y / 60 + i) * 3, y);
      x.stroke();
    }
    oakCanvas = c;
  }
  const t = new THREE.CanvasTexture(oakCanvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** bóng đổ mềm (hình chữ nhật mờ) đặt sát tường */
function softShadow(w: number, h: number, opacity: number, blur = 10): THREE.Mesh {
  const PW = 1.22, PH = 1.2;
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.max(64, Math.round(256 * (h * PH) / (w * PW)));
  const x = c.getContext('2d')!;
  x.filter = `blur(${blur}px)`; x.fillStyle = 'rgba(35,25,15,0.8)';
  const mx = (c.width - c.width / PW) / 2, my = (c.height - c.height / PH) / 2;
  x.fillRect(mx, my, c.width - mx * 2, c.height - my * 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(w * PW * S, h * PH * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false }));
}

/** tấm giấy in có thể cong nhẹ góc dưới phải (y=0 đáy, tâm ngang x=0), đơn vị mm */
function paperSheet(W: number, H: number, mat: THREE.Material, curl = 0): THREE.Mesh {
  const g = new THREE.PlaneGeometry(W, H, 24, 32);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    // góc dưới phải hơi vểnh (giấy bóng dán băng keo, góc dưới không dán)
    const u = (x + W / 2) / W, v = 1 - (y + H / 2) / H;
    const k = Math.max(0, u - 0.62) / 0.38 * Math.max(0, v - 0.7) / 0.3;
    p.setZ(i, curl * k * k + Math.sin(u * Math.PI) * 0.6); // phồng rất nhẹ giữa tờ
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.position.y = H / 2;
  m.castShadow = true;
  return m;
}

function frameBars(W: number, H: number, face: number, depth: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const OW = W + face * 2, OH = H + face * 2;
  for (const [w, h, x, y] of [[OW, face, 0, OH - face / 2], [OW, face, 0, face / 2], [face, OH - face * 2, -OW / 2 + face / 2, OH / 2], [face, OH - face * 2, OW / 2 - face / 2, OH / 2]] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat);
    bar.position.set(x, y - face, depth / 2);
    bar.castShadow = true;
    g.add(bar);
  }
  return g;
}

export function posterBuilder(o: Poster3DOpts): Builder {
  return (aniso) => {
    const { wMm: W, hMm: H } = o;
    const tex = canvasTex(o.art, aniso);
    const root = new THREE.Group();
    const mm = new THREE.Group(); mm.scale.setScalar(S); // mọi kích thước dưới đây tính bằng mm

    if (o.scene === 'stand') {
      // giá đứng chân tròn: poster kẹp trong khung nhôm đen mảnh, 1 trụ giữa, đế tròn nặng
      const face = 14, depth = 16;
      const alu = new THREE.MeshPhysicalMaterial({ color: '#1E1F22', metalness: 0.65, roughness: 0.35, clearcoat: 0.3 });
      const baseH = 760; // mép dưới poster cách sàn (giá đứng cao ~1,6m)
      const board = new THREE.Group(); board.position.y = baseH;
      const paper = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18 });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paper); sheet.position.set(0, H / 2, depth * 0.62);
      const backPl = new THREE.Mesh(new THREE.BoxGeometry(W, H, 3), new THREE.MeshStandardMaterial({ color: '#2A2B2F', roughness: 0.6 }));
      backPl.position.set(0, H / 2, depth * 0.35);
      const bars = frameBars(W, H, face, depth, alu);
      board.add(sheet, backPl, bars);
      // tấm phản chiếu (màng PET chống loá) phủ nhẹ
      const film = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }));
      film.position.set(0, H / 2, depth * 0.66); board.add(film);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, baseH - face, 24), alu); pole.position.set(0, (baseH - face) / 2, -14); // trụ dừng ở thanh khung dưới, nằm sau tấm
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(60, 26, 22), alu); clamp.position.set(0, baseH - face - 6, -8); clamp.castShadow = true; mm.add(clamp); pole.castShadow = true;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(190, 200, 16, 64), new THREE.MeshPhysicalMaterial({ color: '#202124', metalness: 0.5, roughness: 0.4, clearcoat: 0.4 }));
      base.position.y = 8; base.castShadow = true; base.receiveShadow = true;
      mm.add(board, pole, base);
      root.add(mm);
      return { group: root, view: { az: 0.42, el: 0.14 }, aim: 0.5, zoom: 1.12, blob: 0.7 };
    }

    // ----- treo / dán tường -----
    const lift = 1250; // tâm poster cách sàn ~1,5m — sàn nằm ngoài khung nhìn
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(W, H) * 5 * S, (lift + H * 2.4) * S), new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.95 }));
    wall.position.set(0, ((lift + H * 2.4) / 2 - lift) * S, 0);
    wall.receiveShadow = true;
    const art = new THREE.Group();

    if (o.scene === 'frame') {
      // khung mảnh: viền giấy trắng (passe-partout) 6% cạnh ngắn, kính mỏng phản chiếu
      const mat = Math.round(Math.min(W, H) * 0.06), face = 18, depth = 24;
      const IW = W + mat * 2, IH = H + mat * 2;
      const frameMat = o.frame === 'oak'
        ? new THREE.MeshStandardMaterial({ map: oakTex(), roughness: 0.62 })
        : new THREE.MeshPhysicalMaterial({ color: o.frame === 'white' ? '#F3F2EE' : '#18181B', roughness: o.frame === 'white' ? 0.5 : 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4 });
      const g = new THREE.Group();
      const matBoard = new THREE.Mesh(new THREE.BoxGeometry(IW, IH, 2), new THREE.MeshStandardMaterial({ color: '#FBFAF6', roughness: 0.9 }));
      matBoard.position.set(0, IH / 2, depth * 0.42); matBoard.receiveShadow = true;
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
      sheet.position.set(0, IH / 2, depth * 0.42 + 1.2);
      // bóng trong khung (viền giấy hắt bóng nhẹ lên ảnh) — tạo chiều sâu
      const inner = softShadow(W, H, 0.16, 6); inner.scale.setScalar(1 / S); inner.position.set(0, IH / 2 - 3, depth * 0.42 + 1.05);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(IW, IH), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }));
      glass.position.set(0, IH / 2, depth * 0.86);
      const bars = frameBars(IW, IH, face, depth, frameMat);
      g.add(matBoard, inner, sheet, glass, bars);
      g.position.y = -IH / 2; // tâm khung ở gốc của art
      art.add(g);
      art.position.z = 4 * S;
      const drop = softShadow(IW + face * 2, IH + face * 2, 0.34);
      drop.position.set(14 * S, -20 * S, 0.3 * S);
      art.scale.setScalar(S);
      const hang = new THREE.Group(); hang.add(wall, drop, art);
      hang.position.y = lift * S;
      root.add(hang);
    } else {
      // giấy bóng dán băng keo giấy 4 góc, góc dưới phải hơi vểnh
      const paper = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide });
      const sheet = paperSheet(W, H, paper, 18);
      sheet.position.z = 0.8; // y đã đặt trong paperSheet (đáy tờ ở y=0)
      const g = new THREE.Group(); g.add(sheet);
      const tapeMat = new THREE.MeshStandardMaterial({ color: '#EADBB8', roughness: 0.85, transparent: true, opacity: 0.88 });
      const tw = Math.max(55, W * 0.11), th = tw * 0.36;
      const corners: [number, number, number][] = [[-W / 2, H, -0.62], [W / 2, H, 0.58], [-W / 2, 0, 0.7]];
      for (const [x, y, rot] of corners) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), tapeMat);
        t.position.set(x + Math.sign(x) * -tw * 0.08, y + (y > 0 ? -th * 0.05 : th * 0.05), 2.2); t.rotation.z = rot;
        g.add(t);
      }
      g.position.y = -H / 2;
      g.rotation.z = -0.012;
      art.add(g);
      art.scale.setScalar(S);
      const drop = softShadow(W, H, 0.22, 7);
      drop.position.set(5 * S, -6 * S, 0.3 * S);
      const hang = new THREE.Group(); hang.add(wall, drop, art);
      hang.position.y = lift * S;
      root.add(hang);
    }

    // khung nhìn bám theo POSTER (không theo mảng tường lớn): zoom = bán kính cả cảnh / bán kính poster
    root.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(root);
    const a = new THREE.Box3().setFromObject(art);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rArt = a.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rArt) * (W > H ? 1.12 : 1.32); // khung xem ngang 4:3 cho poster ngang
    const aim = ((a.min.y + a.max.y) / 2 - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.4, el: 0.08 }, aim, zoom, blob: 0, swing: 0.5 };
  };
}
