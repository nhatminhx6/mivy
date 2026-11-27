import * as THREE from 'three';
import { svgTex, type Builder } from './mockup3d';
import { mcPalette, mcSize, type MCSpec } from './mooncakebox-engine';

export function buildMockup(spec: MCSpec, svgs: SVGSVGElement[], css: string): Builder {
  return async (aniso) => {
    const {w,d,h,cols} = mcSize(spec);
    const scale = .01;
    const W = w*scale, D = d*scale, H = h*scale, t = .045;
    const group = new THREE.Group();
    const palette = mcPalette(spec);
    const outside = new THREE.MeshStandardMaterial({color:palette.paper,roughness:.67});
    const tray = new THREE.MeshStandardMaterial({color:palette.tray,roughness:.83});
    const cake = new THREE.MeshStandardMaterial({color:'#ad6326',roughness:.57});
    const pattern = new THREE.MeshStandardMaterial({color:'#c48942',roughness:.5});
    function piece(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number,y: number,z: number) {
      const mesh = new THREE.Mesh(geometry,material);
      mesh.position.set(x,y,z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }
    piece(group,new THREE.BoxGeometry(W,t,D),outside,0,t/2,0);
    for (const sign of [-1,1]) {
      piece(group,new THREE.BoxGeometry(W,H,t),outside,0,H/2,sign*(D-t)/2);
      piece(group,new THREE.BoxGeometry(t,H,D),outside,sign*(W-t)/2,H/2,0);
    }
    const cellW = W/cols, cellD = D/2;
    piece(group,new THREE.BoxGeometry(W-2*t,t,D-2*t),tray,0,.19,0);
    for (let i=1;i<cols;i++) piece(group,new THREE.BoxGeometry(.035,.30,D-2*t),tray,(i-cols/2)*cellW,.34,0);
    piece(group,new THREE.BoxGeometry(W-2*t,.30,.035),tray,0,.34,0);
    for (let i=0;i<spec.count;i++) {
      const x = (i%cols+.5)*cellW-W/2, z = (Math.floor(i/cols)+.5)*cellD-D/2;
      const outline = new THREE.Shape();
      for (let j=0;j<=112;j++) {
        const a = j/112 * Math.PI*2, r = .324 + .025*Math.cos(16*a);
        if (j===0) outline.moveTo(r*Math.cos(a),r*Math.sin(a));
        else outline.lineTo(r*Math.cos(a),r*Math.sin(a));
      }
      const pastry = piece(group,new THREE.ExtrudeGeometry(outline,{depth:.255, bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:3}),cake,x,.25,z);
      pastry.rotation.x = -Math.PI/2;
      const ring = piece(group,new THREE.TorusGeometry(.23,.013,6,36),pattern,x,.532,z);
      ring.rotation.x = Math.PI/2;
      for (let j=0;j<8;j++) {
        const angle = j*Math.PI/4;
        const petal = piece(group,new THREE.SphereGeometry(.081,15,8),pattern,x+.10*Math.cos(angle),.529,z+.10*Math.sin(angle));
        petal.scale.set(1.05,.19,.51);
        petal.rotation.y = -angle;
      }
    }
    const lid = new THREE.Group();
    if (svgs[0]) {
      const map = await svgTex(svgs[0],css,1400,aniso,palette.paper);
      const cover = new THREE.MeshStandardMaterial({map,roughness:.59});
      piece(lid,new THREE.BoxGeometry(W,D,.075),[outside,outside,outside,outside,cover,outside],0,0,0);
    } else {
      piece(lid,new THREE.BoxGeometry(W,D,.075),outside,0,0,0);
    }
    lid.rotation.x = -.22;
    lid.position.set(-W*.16,D/2,-D/2-.23);
    group.add(lid);
    return {group,view:{az:.57,el:.51},aim:.44};
  };
}
