import * as THREE from 'three';
import { svgTex, type Builder } from './mockup3d';
import { ccGeom, ccMedia, ccSize, type CCSpec } from './cupcarrier-engine';

export function buildMockup(spec: CCSpec, svgs: SVGSVGElement[], css: string): Builder {
  return async (aniso) => {
    const size = ccSize(spec.size);
    const media = ccMedia(spec.media);
    const group = new THREE.Group();
    const w = 2.2, scale = w / size.w;
    const geometry = ccGeom(size, spec.handle);
    const h = size.h * scale;
    const d = (size.d || size.g) * scale;
    const plastic = spec.kind === 'pe';
    const material = new THREE.MeshPhysicalMaterial({color:media.hex, opacity:media.opacity, transparent:media.opacity < 1, roughness:plastic ? .25 : .85, side:THREE.DoubleSide, depthWrite:media.opacity >= 1});
    const count = size.cups;
    const baseHeight = Math.min(h*.72, .84);
    if (count > 0) {
      const rows = count > 2 ? 2 : 1, columns = Math.ceil(count / rows);
      const tea = new THREE.MeshPhysicalMaterial({color:'#bb8459',roughness:.3,clearcoat:.8});
      const lid = new THREE.MeshPhysicalMaterial({color:'#ddd9d0',transparent:true,opacity:.64,roughness:.2});
      const straw = new THREE.MeshStandardMaterial({color:'#ae5644'});
      for (let i=0; i<count; i++) {
        const x = (i%columns-(columns-1)/2)*w/columns;
        const z = (Math.floor(i/columns)-(rows-1)/2)*d/rows;
        const radius = Math.min(w*.43/columns, d*.46/rows);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.75,baseHeight,34),tea);
        cup.position.set(x,baseHeight/2+.08,z);
        cup.castShadow = true;
        group.add(cup);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(radius*1.03,32,14,0,Math.PI*2,0,Math.PI/2),lid);
        cap.scale.y = .56;
        cap.position.set(x,baseHeight+.08,z);
        group.add(cap);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,h*.22,12),straw);
        tube.position.set(x,baseHeight+.17,z);
        tube.rotation.z = .11;
        group.add(tube);
      }
    }
    const maps = await Promise.all(svgs.map((svg) => svgTex(svg, css, 1024, aniso, '')));
    for (const side of [-1,1]) {
      const map = maps[side === 1 ? 0 : 1];
      const faceMesh = new THREE.PlaneGeometry(w, h, 42, 42);
      const pos = faceMesh.attributes.position;
      const uv = faceMesh.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), x = pos.getX(i);
        const folded = Math.pow(Math.max(0, 1 - (2*x/w)**2), .5);
        pos.setZ(i, plastic ? folded * (.09*Math.sin((y/h+.5)*Math.PI) + .024*Math.sin(13*x/w + 9*y/h)) : 0);
        const svgY = geometry.top + (1 - uv.getY(i)) * size.h;
        uv.setY(i, 1 - svgY / geometry.H);
      }
      faceMesh.computeVertexNormals();
      const inkMaterial = new THREE.MeshPhysicalMaterial({ map, transparent:true, alphaTest:.035, roughness:plastic ? .28 : .83, depthWrite:!plastic });
      const face = new THREE.Mesh(faceMesh, inkMaterial);
      face.rotation.y = side === 1 ? 0 : Math.PI;
      face.position.set(0,h/2,side*d/2);
      group.add(face);
      if (!plastic) {
        const handle = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-w*.22,h-.09,side*d*.5),new THREE.Vector3(-w*.23,h+.23,side*d*.49),
          new THREE.Vector3(0,h+.40,side*d*.44),new THREE.Vector3(w*.23,h+.23,side*d*.49),
          new THREE.Vector3(w*.22,h-.09,side*d*.5),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(handle,32,.032,8,false),material));
      }
    }
    for (const side of [-1,1]) {
      const sideHeight = h * (plastic ? .72 : 1);
      const gusset = new THREE.Mesh(new THREE.PlaneGeometry(d,sideHeight),material);
      gusset.rotation.y = Math.PI/2;
      gusset.position.set(side*w/2,sideHeight/2,0);
      group.add(gusset);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),material);
    group.add(base);
    return { group, view:{az:.5,el:.3} };
  };
}
