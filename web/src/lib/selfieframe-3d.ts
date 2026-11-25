'use client';
// Khung check-in 3D: tấm formex 5mm đùn từ ĐÚNG đường cắt (viền ngoài + ô cửa sổ khoét thủng), mặt in phẳng satin,
// cạnh formex trắng xốp. Khung chính đứng thẳng, kẹp trong 2 đế gỗ có rãnh ở 2 góc dưới, thêm 1 khung nhỏ nằm phía trước có que gỗ cầm tay thò ra dưới mép → khách hiểu ngay "cầm tay".

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, svgTex, type Builder } from './mockup3d';

export interface Selfie3DOpts {
  print: SVGSVGElement | null; // bản xem trước (đúng khổ, ngoài đường cắt + ô cửa sổ trong suốt)
  outline: string; windowD: string; wMm: number; hMm: number;
  win: { x: number; y: number; w: number; h: number };
  fontCss: string;
}

const NS = 'http://www.w3.org/2000/svg';
function shapesWithHole(outline: string, windowD: string): THREE.Shape[] {
  const outer = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${outline}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
  const hole = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${windowD}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
  if (outer.length && hole.length) {
    const h = new THREE.Path(hole[0].getPoints(48));
    outer[0].holes.push(h);
  }
  return outer;
}

// cạnh formex: trắng, xốp li ti
function foamTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2400; i++) { const v = 100 + Math.round(r() * 60); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(r() * 256, r() * 256, 1.4, 1.4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}

function woodTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, '#B98A57'); g.addColorStop(0.5, '#D2A777'); g.addColorStop(1, '#B07F4D');
  x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  x.strokeStyle = 'rgba(110,70,35,0.35)';
  for (let i = 0; i < 18; i++) { x.lineWidth = 0.6 + (i % 3) * 0.4; x.beginPath(); x.moveTo(4 + i * 3.4, 0); x.bezierCurveTo(10 + i * 3, 160, i * 3.6, 340, 6 + i * 3.3, 512); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function selfieBuilder(o: Selfie3DOpts): Builder {
  return async (aniso) => {
    if (!o.print) throw new Error('Chưa dựng xong khung');
    const W = o.wMm, H = o.hMm;
    const px = Math.min(2048, Math.max(1200, Math.round(W * 2.2)));
    const tex = await svgTex(o.print, o.fontCss, px, aniso, '');
    tex.flipY = false; tex.repeat.set(1 / W, 1 / H); tex.needsUpdate = true;
    const shapes = shapesWithHole(o.outline, o.windowD);

    const DEPTH = 5, BEV = 0.6;
    const foam = foamTex();
    const capMat = new THREE.MeshStandardMaterial({ color: '#F6F6F2', roughness: 0.92 });
    const sideMat = new THREE.MeshStandardMaterial({ color: '#F4F4EF', roughness: 0.95, bumpMap: foam, bumpScale: 0.6 });
    const printMat = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const boardGeo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 2, curveSegments: 24 });
    const printGeo = new THREE.ShapeGeometry(shapes, 24);

    /** 1 tấm khung: gốc toạ độ ở giữa mép dưới, mặt in hướng +z, đứng thẳng theo +y */
    const board = () => {
      const inner = new THREE.Group();
      inner.scale.set(S, -S, S);
      const body = new THREE.Mesh(boardGeo, [capMat, sideMat]);
      body.castShadow = true; body.receiveShadow = true;
      const pr = new THREE.Mesh(printGeo, printMat);
      pr.position.z = DEPTH + BEV + 0.15;
      pr.renderOrder = 2;
      inner.add(body, pr);
      inner.position.set(-(W / 2) * S, H * S, -(DEPTH / 2) * S);
      const g = new THREE.Group(); g.add(inner);
      return g;
    };

    const out = new THREE.Group();
    // ---------- khung chính: đứng thẳng, kẹp trong 2 đế gỗ có rãnh ở 2 góc dưới ----------
    const main = board();
    out.add(main);
    const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.6 });
    const fw = Math.max(70, W * 0.1), fh = 30, fd = 110;
    for (const sx of [-1, 1]) {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(fw * S, fh * S, fd * S, 3, 6 * S), wood);
      foot.position.set(sx * (W / 2 - fw * 0.75) * S, (fh / 2) * S, 0);
      foot.castShadow = true; foot.receiveShadow = true;
      out.add(foot);
      // rãnh kẹp tối (khe nhìn thấy 2 bên tấm)
      const slot = new THREE.Mesh(new THREE.BoxGeometry(fw * 1.002 * S, 2 * S, (DEPTH + 3) * S), new THREE.MeshStandardMaterial({ color: '#3B2A1A', roughness: 0.9 }));
      slot.position.set(foot.position.x, fh * S + 0.2 * S, 0);
      out.add(slot);
    }

    // ---------- khung nhỏ cầm tay: que gỗ dán sau lưng, cắm đứng trong cốc sứ phía trước bên phải ----------
    const k = 0.42;
    const small = board();
    small.scale.setScalar(k);
    const stickR = 8, L = H * 0.9;
    // que dán sau mép dưới (chỉ lấn lên 30mm sau lưng tấm), phần còn lại thò xuống để cầm / cắm cốc
    const Ls = L * 0.55 + 30;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(stickR * S, stickR * S, Ls * S, 20), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62 }));
    stick.position.set(0, (30 - Ls / 2) * S, -(DEPTH / 2 + BEV + stickR) * S);
    stick.castShadow = true;
    small.add(stick);
    const below = L * 0.55 * k; // mm que thò dưới mép khung (sau khi thu nhỏ)
    const holder = new THREE.Group();
    small.position.set(0, (12 + below) * S, 0);
    small.rotation.x = -0.05;
    holder.add(small);
    // cốc sứ trắng
    const cupH = below * 0.72, r0 = 34, r1 = 42;
    const prof = [new THREE.Vector2(0, 0), new THREE.Vector2(r0 - 4, 0), new THREE.Vector2(r0, 3), new THREE.Vector2(r1, cupH), new THREE.Vector2(r1 - 4, cupH + 1.5), new THREE.Vector2(r1 - 6, cupH - 2), new THREE.Vector2(r0 - 5, 8), new THREE.Vector2(0, 8)]
      .map((v) => new THREE.Vector2(v.x * S, v.y * S));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: '#F4F2EE', roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    cup.castShadow = true; cup.receiveShadow = true;
    cup.position.set(0, 0, -(DEPTH / 2 + BEV + stickR) * k * S);
    holder.add(cup);
    holder.rotation.y = -0.38;
    holder.position.set(W * 0.5 * S, 0, (fd / 2 + 90) * S);
    out.add(holder);

    return { group: out, view: { az: 0.3, el: 0.17 }, aim: 0.42, zoom: 1.55, blob: 0 };
  };
}
