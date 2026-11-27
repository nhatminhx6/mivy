import * as THREE from 'three';
import { svgTex, type Builder } from './mockup3d';
import { nlGeo, nlStrap, type NLSpec } from './nonla-engine';

export function buildMockup(spec: NLSpec, svgs: SVGSVGElement[], css: string): Builder {
  return async (aniso) => {
    const g = nlGeo(spec.size);
    const r = 1.25, h = r * g.h / g.r;
    const group = new THREE.Group();
    const leaf = new THREE.MeshStandardMaterial({color:'#dec594', roughness:.9, side:THREE.DoubleSide});
    const rib = new THREE.MeshStandardMaterial({color:'#ac8755', roughness:.8});
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r,h,128,1,true),leaf);
    cone.position.y = h/2 + .07;
    cone.castShadow = true;
    group.add(cone);
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r*t,.008,6,96),rib);
      ring.rotation.x = Math.PI/2;
      ring.position.y = h*(1-t)+.07;
      group.add(ring);
    }
    if (svgs[0]) {
      const segments = 100;
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      for (let i=0; i<=segments; i++) {
        const around = (i/segments-.5)*Math.PI*2;
        const sector = around*g.k;
        for (const t of [.001,1]) {
          positions.push((r+.003)*t*Math.sin(around),h*(1-t)+.071,(r+.003)*t*Math.cos(around));
          uvs.push(.5+t*Math.sin(sector)/2,.5-t*Math.cos(sector)/2);
        }
        if (i<segments) {
          const a = 2*i;
          indices.push(a,a+1,a+3,a,a+3,a+2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const map = await svgTex(svgs[0], css, 1536, aniso, '');
      group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.04,side:THREE.DoubleSide,roughness:.85})));
    }
    const strap = nlStrap(spec.strap);
    if (strap.color) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.05,.13,0),new THREE.Vector3(0,-.04,.88),new THREE.Vector3(1.05,.13,0));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,32,.026,8,false), new THREE.MeshStandardMaterial({color:strap.color,roughness:.8})));
    }
    return {group,view:{az:.25,el:.36}};
  };
}
