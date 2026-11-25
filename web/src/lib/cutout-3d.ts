'use client';
// Móc khoá mica / hashtag formex 3D: đùn khối từ ĐÚNG đường cắt (CutContour) của file in → độ dày thật,
// cạnh vát bóng, mica trong có khúc xạ, khoen kim loại xỏ qua lỗ. Texture = lớp In (nền + hình) của khách.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, svgTex, type Builder } from './mockup3d';
import type { CutResult } from './cutout-engine';

export type CutMaterial = 'clear' | 'white' | 'formex';
const U = 0.1 * S;       // đơn vị file cắt = 0.1mm
const RING_R = 95;       // khoen Ø19mm (khớp bản vẽ 2D)

const NS = 'http://www.w3.org/2000/svg';
// lớp In (nền + hình) dựng thành SVG tự chứa để làm texture
function printLayer(res: CutResult, withFill: boolean): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${res.w} ${res.h}`);
  if (withFill) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', res.d); p.setAttribute('fill', res.fill);
    svg.appendChild(p);
  }
  const im = document.createElementNS(NS, 'image');
  im.setAttribute('href', res.art.href);
  for (const [k, v] of Object.entries({ x: res.art.x, y: res.art.y, width: res.art.w, height: res.art.h })) im.setAttribute(k, String(v));
  svg.appendChild(im);
  return svg;
}

function shapesOf(res: CutResult): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${res.d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  if (res.hole && shapes.length) {
    const { cx, cy, r } = res.hole;
    const host = shapes.find((s) => {
      const b = new THREE.Box2().setFromPoints(s.getPoints(32));
      return b.containsPoint(new THREE.Vector2(cx, cy));
    }) ?? shapes[0];
    const h = new THREE.Path(); h.absarc(cx, cy, r, 0, Math.PI * 2, true);
    host.holes.push(h);
  }
  return shapes;
}

export function cutoutBuilder(o: { res: CutResult | null; material: CutMaterial; ring: boolean }): Builder {
  return async (aniso) => {
    const res = o.res;
    if (!res) throw new Error('Chưa dựng xong hình cắt');
    const clear = o.material === 'clear', formex = o.material === 'formex';
    const depth = (formex ? 5 : 3) * 10;           // dày 3mm mica / 5mm formex (đơn vị 0.1mm)
    const shapes = shapesOf(res);

    // texture lớp In: toạ độ UV của mặt khối = toạ độ file cắt → map thẳng theo khung SVG
    const tex = await svgTex(printLayer(res, !clear), undefined, Math.min(2048, Math.round(res.w * 2)), aniso, '');
    tex.flipY = false;
    tex.repeat.set(1 / res.w, 1 / res.h);
    tex.needsUpdate = true;

    const BEVEL = 2.5; // vát cạnh 0.25mm — mặt trên thật nằm ở z = depth + BEVEL
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 20,
    });
    let cap: THREE.Material, side: THREE.Material;
    if (clear) {
      // mica trong: nhìn xuyên thấu, mép + mặt bắt sáng phản chiếu (fresnel) như kính acrylic
      cap = new THREE.MeshPhysicalMaterial({ color: '#F4FAF9', transparent: true, opacity: 0.28, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.49, specularIntensity: 1, depthWrite: false });
      side = new THREE.MeshPhysicalMaterial({ color: '#E2F1EE', transparent: true, opacity: 0.75, roughness: 0.05, clearcoat: 1, ior: 1.49, specularIntensity: 1 });
    } else if (formex) {
      cap = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78 });
      side = new THREE.MeshStandardMaterial({ color: '#F4F4F1', roughness: 0.9 });
    } else {
      cap = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
      side = new THREE.MeshPhysicalMaterial({ color: '#F3F3F0', roughness: 0.3, transmission: 0.25, thickness: depth * U, clearcoat: 1 });
    }
    const body = new THREE.Mesh(geo, [cap, side]);
    body.castShadow = true;

    const inner = new THREE.Group(); // hệ toạ độ file cắt (0.1mm, y xuống) → lật y
    inner.scale.set(U, -U, U);
    inner.add(body);
    if (clear) {
      // hình in nằm ngay trên mặt mica
      const print = new THREE.Mesh(new THREE.ShapeGeometry(shapes, 20), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, roughness: 0.4 }));
      print.position.z = depth + BEVEL + 0.4;
      print.renderOrder = 2;
      inner.add(print);
    }
    if (o.ring && res.hole) {
      // khoen tròn đứng vuông góc tấm mica, xỏ đúng qua lỗ
      const metal = new THREE.MeshStandardMaterial({ color: '#D5D9DE', metalness: 1, roughness: 0.22 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 9, 16, 64), metal);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(res.hole.cx, res.hole.cy - RING_R, depth / 2);
      ring.castShadow = true;
      inner.add(ring);
      const jump = new THREE.Mesh(new THREE.TorusGeometry(34, 6, 12, 40), metal);
      jump.position.set(res.hole.cx, res.hole.cy - RING_R * 2 - 26, depth / 2);
      jump.castShadow = true;
      inner.add(jump);
    }

    // canh giữa, đáy chạm đất (móc khoá treo lơ lửng 1 chút như ảnh sản phẩm)
    const g = new THREE.Group(); g.add(inner);
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -bb.min.y + (o.ring ? 8 * S : 0), -c.z);
    return { group: g, view: { az: 0.38, el: 0.14 }, aim: 0.5, zoom: 1.12, blob: o.ring ? 0.5 : 0.3 };
  };
}
