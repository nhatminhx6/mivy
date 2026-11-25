'use client';
// Bộ bài 3D: 1 tay bài xoè trên bàn (13 lá, thấy mặt bài), 1 xấp bài vuông thành (thấy mặt lưng + mép giấy sọc),
// hộp đựng dựng đứng mở nắp, vài lá ló lên. Mọi texture = SVG thiết kế của khách (mặt bài, mặt lưng, các mặt hộp).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';

export interface PC3DOpts {
  faces: SVGSVGElement[];      // các lá xoè (mặt bài)
  back: SVGSVGElement;         // mặt lưng
  boxFront: SVGSVGElement; boxBack: SVGSVGElement; boxSide: SVGSVGElement; boxLid: SVGSVGElement;
  boxColor: string;            // màu nền hộp (lòng hộp, đáy)
  fontCss: string;
  wMm: number; hMm: number; rMm: number;
  box: { W: number; H: number; D: number; T: number };
}

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// UV phủ đúng khung w×h (ShapeGeometry mặc định UV = toạ độ thật)
function normUV(g: THREE.BufferGeometry, w: number, h: number) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
}

// sọc mép giấy (xấp bài) — mỗi ô 8 sọc
function edgeStripes(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 32; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#F4F2EC'; x.fillRect(0, 0, 32, 64);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#DCD8CF' : '#EDEAE3'; x.fillRect(0, i * 8 + 6, 32, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function playingCardsBuilder(o: PC3DOpts): Builder {
  return async (aniso) => {
    const W = o.wMm * S, H = o.hMm * S, R = o.rMm * S, t = 0.32 * S, eps = 0.012 * S;
    const [faceTex, backTex, bf, bb, bs, bl] = await Promise.all([
      Promise.all(o.faces.map((el) => svgTex(el, o.fontCss, 560, aniso))),
      svgTex(o.back, o.fontCss, 720, aniso),
      svgTex(o.boxFront, o.fontCss, 720, aniso), svgTex(o.boxBack, o.fontCss, 720, aniso),
      svgTex(o.boxSide, o.fontCss, 260, aniso), svgTex(o.boxLid, o.fontCss, 600, aniso),
    ]);
    const shape = roundedShape(W, H, R);
    const faceGeo = new THREE.ShapeGeometry(shape, 6); normUV(faceGeo, W, H);
    const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 6 });
    const white = new THREE.MeshStandardMaterial({ color: '#F6F4EF', roughness: 0.7 });
    // giấy bài phủ bóng (lớp linen/ cán bóng nhẹ)
    const cardMat = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.28, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const backMat = cardMat(backTex);
    const faceMats = faceTex.map(cardMat);

    // 1 lá nằm phẳng, mặt trên = top, mặt dưới = bottom (đỉnh hình hướng -z)
    const card = (top: THREE.Material, bottom: THREE.Material) => {
      const g = new THREE.Group();
      const e = new THREE.Mesh(edgeGeo, [white, white]); e.rotation.x = -Math.PI / 2; e.castShadow = true; g.add(e);
      const a = new THREE.Mesh(faceGeo, top); a.rotation.x = -Math.PI / 2; a.position.y = t + eps; g.add(a);
      const b = new THREE.Mesh(faceGeo, bottom); b.rotation.x = Math.PI / 2; b.position.y = -eps; g.add(b);
      return g;
    };

    const scene = new THREE.Group();

    // --- tay bài xoè (trục xoè ở đáy lá, gần người xem) ---
    const fan = new THREE.Group();
    const n = faceMats.length, step = 0.13, d = H * 0.36;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * step;
      const c = card(faceMats[i], backMat);
      c.position.set(Math.sin(a) * d, (t + 0.05 * S) * i, -Math.cos(a) * d);
      c.rotation.y = -a;
      fan.add(c);
    }
    fan.position.set(-30 * S, 0, 42 * S);
    fan.rotation.y = 0.08;
    scene.add(fan);

    // --- xấp bài vuông thành, thấy mặt lưng ---
    const stackH = 15 * S;
    const sideTex = edgeStripes(aniso); sideTex.repeat.set(1 / (6 * S), 1 / (8 * 0.3 * S));
    const stackGeo = new THREE.ExtrudeGeometry(shape, { depth: stackH, bevelEnabled: false, curveSegments: 6 });
    const stack = new THREE.Group();
    const sb = new THREE.Mesh(stackGeo, [white, new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.85 })]);
    sb.rotation.x = -Math.PI / 2; sb.castShadow = true; stack.add(sb);
    const st = new THREE.Mesh(faceGeo, backMat); st.rotation.x = -Math.PI / 2; st.position.y = stackH + eps; stack.add(st);
    // lá trên cùng hơi lệch như vừa xào bài
    const topCard = card(backMat, backMat); topCard.position.set(1.2 * S, stackH + 0.1 * S, -0.8 * S); topCard.rotation.y = 0.05; stack.add(topCard);
    stack.position.set(70 * S, 0, 30 * S);
    stack.rotation.y = -0.32;
    scene.add(stack);

    // --- hộp đựng dựng đứng, mở nắp, bài ló lên ---
    const { W: BW, H: BH, D: BD, T: BT } = o.box;
    const bw = BW * S, bh = BH * S, bd = BD * S, th = 0.5 * S;
    const inner = new THREE.MeshStandardMaterial({ color: o.boxColor, roughness: 0.75 });
    const paper = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    const box = new THREE.Group();
    const wall = (sx: number, sy: number, sz: number, mats: THREE.Material[], x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mats); m.position.set(x, y, z); m.castShadow = true; box.add(m); return m;
    };
    const six = (i: number, tex: THREE.Material) => Array.from({ length: 6 }, (_, k) => (k === i ? tex : inner));
    wall(bw, bh, th, six(4, paper(bf)), 0, bh / 2, bd / 2 - th / 2);          // mặt trước (+z)
    wall(bw, bh, th, six(5, paper(bb)), 0, bh / 2, -bd / 2 + th / 2);         // mặt sau (-z)
    wall(th, bh, bd, six(0, paper(bs)), bw / 2 - th / 2, bh / 2, 0);          // hông phải
    wall(th, bh, bd, six(1, paper(bs)), -bw / 2 + th / 2, bh / 2, 0);         // hông trái
    wall(bw, th, bd, six(-1, inner), 0, th / 2, 0);                            // đáy
    // nắp: bản lề ở mép trên mặt sau, mở ngả ra sau
    const hinge = new THREE.Group(); hinge.position.set(0, bh, -bd / 2);
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, th, bd), six(2, paper(bl))); lidMesh.position.set(0, 0, bd / 2); lidMesh.castShadow = true;
    hinge.add(lidMesh);
    const tongueHinge = new THREE.Group(); tongueHinge.position.set(0, 0, bd);
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, th, BT * S), inner); tongue.position.set(0, 0, (BT * S) / 2);
    tongueHinge.add(tongue); tongueHinge.rotation.x = -0.35; hinge.add(tongueHinge);
    hinge.rotation.x = -1.92;
    box.add(hinge);
    // 3 lá ló lên khỏi miệng hộp (lá giữa ló mặt bài)
    const peekBase = bh + 20 * S - H;
    [-1, 0, 1].forEach((k, i) => {
      const c = card(i === 1 && faceMats[0] ? faceMats[faceMats.length - 1] : backMat, backMat);
      c.rotation.set(Math.PI / 2, 0, k * 0.07);
      c.position.set(k * 4 * S, peekBase + H / 2 + i * 1.6 * S, (-2.5 + i * 2.4) * S);
      box.add(c);
    });
    box.position.set(38 * S, 0, -48 * S);
    box.rotation.y = -0.38;
    scene.add(box);

    return { group: scene, view: { az: 0.22, el: 0.62 }, aim: 0.3, zoom: 1.25, blob: 0.35 };
  };
}
