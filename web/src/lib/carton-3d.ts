import * as THREE from 'three';
import { canvasTex, type Builder } from './mockup3d';
import { boardHex, ctxOf, ctFlute, ctSpecSize, drawArt, heroArt, infoArt, insideArt, flapArt, type Art, type CtData, type CtSpec } from './carton-engine';

export function buildMockup(spec: CtSpec, _svgs: SVGSVGElement[], _css: string, data: CtData, logo: string): Builder {
  return async (aniso) => {
    const { l, w, h } = ctSpecSize(spec);
    const k = 2.4 / l;
    const paper = boardHex(spec.board);
    const images = new Map<string, HTMLImageElement>();
    if (logo) {
      const image = new Image();
      image.src = logo;
      await image.decode();
      images.set(logo, image);
    }
    const context = ctxOf(spec, data, logo);
    const plain = new THREE.MeshStandardMaterial({color:paper, roughness:0.92});
    const printed = (art: Art) => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(4, 1024 / Math.max(art.w, art.h));
      canvas.width = Math.ceil(art.w * scale);
      canvas.height = Math.ceil(art.h * scale);
      drawArt(canvas.getContext('2d')!, art, scale, images, paper);
      return new THREE.MeshStandardMaterial({map:canvasTex(canvas, aniso), roughness:0.86});
    };
    const group = new THREE.Group();
    const thickness = ctFlute(spec.flute).t;
    const W = l*k, H = h*k, D = w*k, t = thickness*k;
    function panel(width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material | THREE.Material[]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
      mesh.position.set(x,y,z);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    }
    const face = printed(heroArt(l,h,context));
    const side = printed(infoArt(w,h,context));
    if (spec.style === 'rsc') {
      panel(W,H,D,0,H/2,0,[side,side,printed(flapArt(l,w,context)),plain,face,face]);
      const tape = new THREE.MeshStandardMaterial({color:'#b18d65', roughness:.58});
      panel(W,.004,D*.11,0,H+.002,0,tape);
    } else {
      panel(W,t,D,0,t/2,0,plain);
      panel(W,H,t,0,H/2,D/2-t/2,[plain,plain,plain,plain,face,plain]);
      panel(W,H,t,0,H/2,-D/2+t/2,plain);
      for (const sign of [-1,1]) panel(t,H,D,sign*(W-t)/2,H/2,0,plain);
      const angle = -.48;
      const lid = panel(W,D,t,0,H+D/2*Math.cos(angle),-D/2+D/2*Math.sin(angle),[plain,plain,plain,plain,printed(insideArt(l,w,context)),plain]);
      lid.rotation.x = angle;
      const corrugated = new THREE.MeshStandardMaterial({color:spec.board === 'kraft' ? '#836445' : '#b7a48b',roughness:.92});
      const wave: THREE.Vector3[] = [];
      for (let i=0; i<=120; i++) {
        const x = (i/120-.5)*(W-2*t);
        wave.push(new THREE.Vector3(x,H+.002,D/2-t/2+Math.sin(i*Math.PI/2)*t*.23));
      }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wave),160,Math.min(.006,t*.16),5,false),corrugated));
    }
    return {group, view:{ az:.57, el:.45 }};
  };
}
