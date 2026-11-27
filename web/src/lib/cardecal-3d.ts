import * as THREE from 'three';
import { svgTex, type Builder } from './mockup3d';
import { CD_PAINTS, cdPalette, cdPanels, type CDSpec } from './cardecal-engine';

export function buildMockup(spec: CDSpec, svgs: SVGSVGElement[], css: string): Builder {
  return async (aniso) => {
    const group = new THREE.Group();
    const paint = CD_PAINTS.find((p) => p.id === spec.paint)?.color ?? cdPalette(spec.palette).paint;
    const shell = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.34, metalness: 0.18 });
    const glass = new THREE.MeshStandardMaterial({ color: '#223644', roughness: 0.16, metalness: 0.3 });
    const trim = new THREE.MeshStandardMaterial({ color: '#242526', roughness: 0.88 });
    const hubs = new THREE.MeshStandardMaterial({ color: '#b6c3cb', metalness: 0.6, roughness: 0.25 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
    };
    const truck = spec.vehicle === 'truck';
    const van = spec.vehicle === 'van';
    const width = 1.18, length = truck ? 3.55 : van ? 3.1 : 2.9;
    const floor = 0.46, cargoH = truck ? 1.42 : van ? 1.16 : 0.56;
    const zoneLength = truck ? 2.24 : van ? 2.06 : 1.92;
    const zoneX = -length / 2 + zoneLength / 2;
    box(length, 0.2, width, 0, floor - 0.08, 0, trim);
    box(zoneLength, cargoH, width, zoneX, floor + cargoH / 2, 0, shell);
    const nose = length - zoneLength;
    box(nose, truck ? .75 : .42, width * .98, length / 2 - nose / 2, floor + (truck ? .375 : .21), 0, shell);
    const cabinHeight = truck ? 0.57 : 0.45;
    box(truck ? nose * .81 : 1.12, cabinHeight, width * .86, truck ? .98 : .35, floor + (truck ? .75 : cargoH) + cabinHeight / 2, 0, glass);
    box(truck ? nose * .76 : 1.16, .08, width * .9, truck ? .98 : .35, floor + (truck ? .75 : cargoH) + cabinHeight, 0, shell);
    for (const x of [-length * .31, length * .31]) for (const side of [-1,1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,.19,32), trim);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x,.30,side * (width / 2 - .04));
      wheel.castShadow = true;
      group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.025,24), hubs);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x,.30,side * (width / 2 + .065));
      group.add(hub);
    }
    for (const z of [-.42,.42]) {
      box(.03,.12,.18,length / 2,.68,z,new THREE.MeshStandardMaterial({color:'#fff6ce'}));
      box(.03,.13,.13,-length / 2,.58,z,new THREE.MeshStandardMaterial({color:'#be2924'}));
    }
    const panels = cdPanels(spec.vehicle, spec.hood);
    await Promise.all(panels.map(async (panel, index) => {
      if (!svgs[index]) return;
      const map = await svgTex(svgs[index], css, 1024, aniso, '');
      const side = panel.id === 'left' || panel.id === 'right';
      const hood = panel.id === 'hood';
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(side ? zoneLength : width, hood ? nose : cargoH), new THREE.MeshStandardMaterial({ map, transparent:true, alphaTest:0.02, polygonOffset:true, polygonOffsetFactor:-1 }));
      if (side) {
        decal.rotation.y = panel.id === 'left' ? 0 : Math.PI;
        decal.position.set(zoneX, floor + cargoH / 2, (panel.id === 'left' ? 1 : -1) * (width / 2 + .003));
      } else if (hood) {
        decal.rotation.x = -Math.PI / 2;
        decal.position.set(length / 2 - nose / 2, floor + .423, 0);
      } else {
        decal.rotation.y = -Math.PI / 2;
        decal.position.set(-length / 2 - .003, floor + cargoH / 2, 0);
      }
      group.add(decal);
    }));
    return { group, view: { az:.53, el:.3 } };
  };
}
