'use client';
// Nhãn tên học sinh 3D: bàn học gỗ sáng — cuốn vở dán nhãn lớn trên bìa, bình nước dán nhãn vừa quấn cong,
// bút chì dán nhãn mini quấn quanh thân, và tờ nhãn A4 nằm phẳng với vài ô đã bóc (ô trống).
// Mỗi nhãn là lưới phẳng nhiều ô uốn theo bề mặt (trụ / mặt phẳng), cắt hình bằng alpha của texture, phủ bóng.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface NL3DOpts {
  big: SVGSVGElement | null; medium: SVGSVGElement | null; mini: SVGSVGElement | null; sheet: SVGSVGElement | null;
  fontCss: string; accent: string; soft: string; accent2: string; bottle: string; capColor: string;
}

type Place = (u: number, v: number) => THREE.Vector3; // u phải, v lên (mm quanh tâm nhãn) → toạ độ mm

// 1 nhãn decal: mặt trước in phủ bóng, mặt sau keo trắng; uốn theo place()
function label(W: number, H: number, tex: THREE.Texture, place: Place, seg = 40): THREE.Group {
  const g = new THREE.PlaneGeometry(1, 1, seg, Math.max(4, Math.round(seg * H / W)));
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const p = place(pos.getX(i) * W, pos.getY(i) * H);
    pos.setXYZ(i, p.x * S, p.y * S, p.z * S);
  }
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  const front = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({
    map: tex, alphaTest: 0.5, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.14, side: THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const back = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ alphaMap: tex, color: '#ECE9E2', alphaTest: 0.5, roughness: 0.85, side: THREE.BackSide }));
  front.castShadow = true;
  const out = new THREE.Group(); out.add(front, back);
  return out;
}

function woodTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d')!;
  x.fillStyle = '#E4CDA8'; x.fillRect(0, 0, 1024, 1024);
  // ván ghép dọc + vân gỗ mảnh
  for (let p = 0; p < 4; p++) {
    const x0 = p * 256;
    x.fillStyle = ['#E6CFAB', '#DFC59E', '#E9D3B1', '#E1C8A2'][p]; x.fillRect(x0, 0, 256, 1024);
    for (let i = 0; i < 60; i++) {
      const xx = x0 + Math.random() * 256, a = 0.05 + Math.random() * 0.08;
      x.strokeStyle = `rgba(120,80,40,${a})`; x.lineWidth = 0.6 + Math.random() * 1.6;
      x.beginPath(); x.moveTo(xx, 0);
      for (let y = 0; y <= 1024; y += 32) x.lineTo(xx + Math.sin(y / 90 + i) * 4, y);
      x.stroke();
    }
    x.fillStyle = 'rgba(90,60,30,0.18)'; x.fillRect(x0, 0, 2, 1024);
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return t;
}

// bìa vở: màu nhạt + kẻ ô mờ + gáy dán băng
function coverTex(color: string, aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 720;
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, 512, 720);
  x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 2;
  for (let i = 0; i < 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 720); x.stroke(); }
  for (let j = 0; j < 720; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(0, 0, 40, 720);
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(150, 560, 230, 70);
  x.fillStyle = 'rgba(0,0,0,0.25)';
  for (let k = 0; k < 3; k++) x.fillRect(165, 578 + k * 16, 200, 2);
  return canvasTex(c, aniso);
}

// bìa vở tương phản với màu nhãn: nhãn xanh dương/tím → bìa vàng mù tạt, còn lại → bìa navy
function coverColor(hex: string): string {
  const c = new THREE.Color(hex); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const deg = hsl.h * 360;
  return deg >= 190 && deg <= 290 ? '#E9B949' : '#2E4A78';
}

export function nameLabelBuilder(o: NL3DOpts): Builder {
  return async (aniso) => {
    if (!o.big || !o.medium || !o.mini || !o.sheet) throw new Error('Chưa dựng xong nhãn');
    const [tBig, tMed, tMini, tSheet] = await Promise.all([
      svgTex(o.big, o.fontCss, 1200, aniso, ''),
      svgTex(o.medium, o.fontCss, 900, aniso, ''),
      svgTex(o.mini, o.fontCss, 700, aniso, ''),
      svgTex(o.sheet, o.fontCss, 2048, aniso),
    ]);
    const root = new THREE.Group();
    let nbRef: THREE.Group = root;

    // ---------- mặt bàn gỗ (không tính vào khung hình) ----------
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(2600 * S, 2000 * S), new THREE.MeshStandardMaterial({ map: woodTex(aniso), roughness: 0.62 }));
    desk.rotation.x = -Math.PI / 2; desk.position.y = -0.05 * S; desk.receiveShadow = true;
    desk.geometry.boundingBox = new THREE.Box3(); desk.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
    desk.frustumCulled = false;
    root.add(desk);

    // ---------- tờ nhãn A4 nằm phẳng (vài ô đã bóc) ----------
    {
      const sw = 210, shh = 297, st = 0.35;
      const paper = new THREE.MeshStandardMaterial({ color: '#F2F0EA', roughness: 0.8 });
      const top = new THREE.MeshPhysicalMaterial({ map: tSheet, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3 });
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(sw * S, st * S, shh * S), [paper, paper, top, paper, paper, paper]);
      sheet.position.set(-118 * S, (st / 2) * S, -40 * S); sheet.rotation.y = 0.16;
      sheet.castShadow = true; sheet.receiveShadow = true;
      root.add(sheet);
    }

    // ---------- cuốn vở, nhãn lớn trên bìa ----------
    {
      const nb = new THREE.Group();
      const W = 165, D = 228, T = 7;
      const cover = new THREE.MeshPhysicalMaterial({ map: coverTex(coverColor(o.accent), aniso), roughness: 0.55, clearcoat: 0.2 });
      const pages = new THREE.MeshStandardMaterial({ color: '#F7F5EE', roughness: 0.9 });
      const book = new THREE.Mesh(new RoundedBoxGeometry(W * S, T * S, D * S, 3, 1.4 * S), [pages, pages, cover, cover, pages, pages]);
      book.position.y = (T / 2) * S; book.castShadow = true; book.receiveShadow = true;
      nb.add(book);
      const y = T + 0.08, cz = -D * 0.12;
      nb.add(label(60, 25, tBig, (u, v) => new THREE.Vector3(u, y, cz - v), 24));
      nb.position.set(105 * S, 0, 55 * S); nb.rotation.y = -0.2;
      root.add(nb);
      nbRef = nb;
    }

    // ---------- bút chì nằm trên vở, nhãn mini quấn quanh thân ----------
    {
      const pc = new THREE.Group();
      const r = 3.7, L = 150;
      const paint = new THREE.MeshPhysicalMaterial({ color: '#F7C948', roughness: 0.4, clearcoat: 0.5 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r * S, r * S, L * S, 40), paint);
      body.rotation.z = Math.PI / 2;
      const wood = new THREE.Mesh(new THREE.ConeGeometry(r * S, 16 * S, 40), new THREE.MeshStandardMaterial({ color: '#E8C99A', roughness: 0.8 }));
      wood.rotation.z = -Math.PI / 2; wood.position.x = (L / 2 + 8) * S;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(1.1 * S, 4.6 * S, 12), new THREE.MeshStandardMaterial({ color: '#2B2D33', roughness: 0.5 }));
      lead.rotation.z = -Math.PI / 2; lead.position.x = (L / 2 + 13.8) * S;
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04 * S, r * 1.04 * S, 10 * S, 24), new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.9, roughness: 0.32 }));
      ferrule.rotation.z = Math.PI / 2; ferrule.position.x = (-L / 2 - 5) * S;
      const eraser = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98 * S, r * 0.98 * S, 8 * S, 24), new THREE.MeshStandardMaterial({ color: '#F28CA5', roughness: 0.75 }));
      eraser.rotation.z = Math.PI / 2; eraser.position.x = (-L / 2 - 14) * S;
      for (const m of [body, wood, lead, ferrule, eraser]) { m.castShadow = true; m.receiveShadow = true; }
      pc.add(body, wood, lead, ferrule, eraser);
      // nhãn mini: chiều dài 30 dọc thân, chiều cao 10 quấn quanh (mặt trên hướng máy ảnh)
      const rr = r + 0.12;
      pc.add(label(30, 10, tMini, (u, v) => {
        const t = -v / rr; // quấn ngược chiều để mặt in hướng ra ngoài
        return new THREE.Vector3(-L * 0.12 + u, Math.cos(t) * rr, Math.sin(t) * rr);
      }, 30));
      pc.position.set(4 * S, (r + 7.05) * S, 62 * S); pc.rotation.y = 0.5;
      nbRef.add(pc);
    }


    // ---------- bình nước, nhãn vừa quấn cong ----------
    {
      const bt = new THREE.Group();
      const r = 33, Hb = 190;
      const prof: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
      for (let i = 0; i <= 8; i++) { const t = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(r - 5 + Math.sin(t) * 5, 5 - Math.cos(t) * 5)); }
      prof.push(new THREE.Vector2(r, Hb - 30));
      for (let i = 1; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(r - (r - 22) * (t * t * (3 - 2 * t)), Hb - 30 + t * 20)); }
      prof.push(new THREE.Vector2(22, Hb - 6), new THREE.Vector2(0, Hb - 6));
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => p.clone().multiplyScalar(S)), 96),
        new THREE.MeshPhysicalMaterial({ color: o.bottle, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.4 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(23 * S, 23.5 * S, 26 * S, 64), new THREE.MeshPhysicalMaterial({ color: o.capColor, roughness: 0.45, clearcoat: 0.4 }));
      cap.position.y = (Hb + 7) * S;
      const spout = new THREE.Mesh(new THREE.TorusGeometry(9 * S, 2.4 * S, 14, 40, Math.PI), new THREE.MeshPhysicalMaterial({ color: o.accent2, roughness: 0.5 }));
      spout.position.y = (Hb + 20) * S;
      for (const m of [body, cap, spout]) { m.castShadow = true; m.receiveShadow = true; }
      bt.add(body, cap, spout);
      const rr = r + 0.15, yc = Hb * 0.5;
      bt.add(label(45, 15, tMed, (u, v) => { const t = u / rr; return new THREE.Vector3(Math.sin(t) * rr, yc + v, Math.cos(t) * rr); }, 48));
      bt.position.set(215 * S, 0, -55 * S); bt.rotation.y = -0.35;
      root.add(bt);
    }

    return { group: root, view: { az: 0.1, el: 0.72 }, aim: 0.34, zoom: 1.86, blob: 0 };
  };
}
