import * as THREE from 'three';
import { canvasTex, svgTex, type Builder } from './mockup3d';
import { rbSize, substrateOf, type RBSpec } from './ricebag-engine';

export function buildMockup(spec: RBSpec, svgs: SVGSVGElement[], css: string): Builder {
  return async (aniso) => {
    const size = rbSize(spec.size);
    const w = 2 * size.W / size.H, h = 2;
    const d = spec.kind === 'vacuum' ? w * 0.38 : w * 0.3;
    const textures = await Promise.all(svgs.map((svg) => svgTex(svg, css, 1024, aniso, substrateOf(spec.kind))));
    const paper = new THREE.MeshStandardMaterial({ color: substrateOf(spec.kind), roughness: 0.82 });
    const group = new THREE.Group();
    const body = new THREE.BoxGeometry(w, h, d, 28, 32, 4);
    const positions = body.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const edge = Math.abs(y / (h / 2));
      const pillow = Math.pow(Math.max(0, 1 - edge * edge), spec.kind === 'vacuum' ? 0.14 : 0.55);
      const center = 1 - 0.28 * (2 * x / w) ** 4;
      positions.setXYZ(i, x * (0.96 + 0.04 * pillow), y, z * (0.08 + 0.92 * pillow * center));
    }
    body.computeVertexNormals();
    let woven: THREE.CanvasTexture | undefined;
    if (spec.kind === 'pp') {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 32;
      const g = tile.getContext('2d')!;
      g.fillStyle = '#777';
      g.fillRect(0,0,32,32);
      for (let x=0; x<32; x+=8) for (let y=0; y<32; y+=8) {
        const vertical = ((x+y)/8)%2 === 0;
        g.fillStyle = '#aaa';
        g.fillRect(x+1,y+1,vertical ? 5 : 7,vertical ? 7 : 5);
        g.fillStyle = '#ccc';
        g.fillRect(x+1,y+1,vertical ? 2 : 6,vertical ? 6 : 2);
      }
      woven = canvasTex(tile, aniso);
      woven.colorSpace = THREE.NoColorSpace;
      woven.wrapS = woven.wrapT = THREE.RepeatWrapping;
      woven.repeat.set(32,42);
    }
    const face = (map?: THREE.Texture) => new THREE.MeshStandardMaterial({
      map, color: map ? '#fff' : substrateOf(spec.kind), roughness: spec.kind === 'vacuum' ? .32 : .82,
      bumpMap:woven, bumpScale:.012,
    });
    const bag = new THREE.Mesh(body, [paper, paper, paper, paper, face(textures[0]), face(textures[1])]);
    bag.position.y = 1;
    bag.castShadow = true;
    group.add(bag);
    for (const y of [0.025, 1.975]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.03, d * 0.12), paper);
      seam.position.y = y;
      group.add(seam);
    }
    if (spec.kind === 'pp') {
      const stitches = new THREE.InstancedMesh(
        new THREE.BoxGeometry(.026,.008,.009),
        new THREE.MeshStandardMaterial({color:'#b0a99b',roughness:.88}), 26,
      );
      const frame = new THREE.Object3D();
      for (let i=0;i<26;i++) {
        frame.position.set((i/25-.5)*w*.88,1.966,d*.091);
        frame.rotation.z=.21;
        frame.updateMatrix();
        stitches.setMatrixAt(i,frame.matrix);
      }
      group.add(stitches);
    }
    if (spec.product === 'rice') {
      const grains = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1,10,6),
        new THREE.MeshStandardMaterial({color:'#eee1c6',roughness:.8}), 24,
      );
      const grain = new THREE.Object3D();
      for (let i=0;i<24;i++) {
        const a=i*2.39996, r=.24*Math.sqrt(i/24);
        grain.position.set(w*.35+r*Math.cos(a),.011,d*.66+r*Math.sin(a));
        grain.rotation.y=a;
        grain.scale.set(.03,.010,.012);
        grain.updateMatrix();
        grains.setMatrixAt(i,grain.matrix);
      }
      group.add(grains);
    }
    return { group, view: { az: 0.44, el: 0.23 } };
  };
}
