// Recuerdo de los Jackson 5 en la pared derecha del plató, junto al
// tocadiscos: la portada de The Jacksons (1976) y un disco de oro con placa.
// Coste: 6 llamadas (marco, lámina, fondo del premio, disco, surcos y
// etiqueta) y una textura.

import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CanvasTexture,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { COVER_URLS, labelGeometry } from './sleeves.js';

const W = 1.4;
const H = 1.0;
const PX = 1024;
// Pared derecha del estudio (x = 4,3), mirando hacia dentro.
const POSITION = [4.27, 1.75, 4.6];
const ROT_Y = -Math.PI / 2;
// El disco de oro: a la derecha de la lámina, centro y radio en metros.
const DISC = { x: 0.36, y: -0.02, r: 0.16 };

/** Surcos del disco: anillos finos un poco más oscuros, fundidos en uno. */
function grooves() {
  const rings = [];
  for (let r = 0.065; r < DISC.r - 0.008; r += 0.0075) rings.push(new RingGeometry(r, r + 0.0022, 64));
  const g = mergeGeometries(rings);
  rings.forEach((x) => x.dispose());
  return g;
}

function paint(canvas, cover) {
  const c = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  c.fillStyle = '#171012';
  c.fillRect(0, 0, w, h);
  const size = h * 0.7;
  c.drawImage(cover.image, w * 0.04, h * 0.08, size, size);
  c.fillStyle = '#e9c873';
  c.textAlign = 'center';
  c.font = `600 ${h * 0.038}px Oswald, sans-serif`;
  c.fillText('JACKIE · TITO · MARLON', w * 0.04 + size / 2, h * 0.86);
  c.fillText('MICHAEL · RANDY', w * 0.04 + size / 2, h * 0.91);
  // Placa del disco de oro, bajo el disco (que es una pieza 3D aparte).
  const px = w * (0.5 + DISC.x / W);
  c.fillStyle = '#1b1310';
  c.fillRect(px - w * 0.17, h * 0.83, w * 0.34, h * 0.12);
  c.fillStyle = '#e9c873';
  c.textAlign = 'center';
  c.font = `600 ${h * 0.045}px Oswald, sans-serif`;
  c.fillText('THE JACKSONS', px, h * 0.88);
  c.font = `${h * 0.032}px Oswald, sans-serif`;
  c.fillText('Disco de oro · 1976', px, h * 0.925);
}

/** Vuelve a pintar el lienzo de la textura y avisa a three de que ha cambiado. */
function repaint(texture, cover) {
  paint(texture.image, cover);
  texture.needsUpdate = true;
}

export default function Jackson5() {
  const cover = useLoader(TextureLoader, COVER_URLS[2]);
  const res = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = Math.round((PX * H) / W);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    paint(canvas, cover);
    return {
      texture,
      panel: new PlaneGeometry(W, H),
      frame: new BoxGeometry(W + 0.08, H + 0.08, 0.04),
      disc: new CylinderGeometry(DISC.r, DISC.r, 0.008, 64),
      grooves: grooves(),
      label: labelGeometry(0.006, 0.055, { x: 0.04, y: 0.22, width: 0.7 * H / W, height: 0.7 }),
      // Fondo de terciopelo negro del premio, con un filo dorado.
      backing: new BoxGeometry(0.42, 0.42, 0.012),
      trim: new BoxGeometry(0.44, 0.44, 0.006),
      velvet: new MeshStandardMaterial({ color: '#0d0b0c', roughness: 1 }),
      groove: new MeshStandardMaterial({ color: '#8a6a1e', roughness: 0.45, metalness: 0.6 }),
      panelMat: new MeshStandardMaterial({ map: texture, roughness: 0.9 }),
      frameMat: new MeshStandardMaterial({ color: '#141012', roughness: 0.5 }),
      // Oro algo menos metálico y con brillo propio: con el estudio oscuro, un
      // metal puro no tiene nada que reflejar y salía negro.
      gold: new MeshStandardMaterial({ color: '#f2c75a', roughness: 0.18, metalness: 0.8, emissive: '#6b4a0e', emissiveIntensity: 0.75 }),
    };
  }, [cover]);
  const ref = useRef(res);

  useEffect(() => {
    let alive = true;
    const r = ref.current;
    repaint(r.texture, cover);
    // Con la letra Oswald ya cargada se vuelve a pintar.
    document.fonts?.load('600 40px Oswald').then(() => alive && repaint(r.texture, cover), (error) => console.error('No se pudo cargar la fuente del cuadro:', error));
    return () => {
      alive = false;
      r.texture.dispose();
      r.panel.dispose();
      r.frame.dispose();
      r.disc.dispose();
      r.grooves.dispose();
      r.label.dispose();
      r.backing.dispose();
      r.trim.dispose();
      r.velvet.dispose();
      r.groove.dispose();
      r.panelMat.dispose();
      r.frameMat.dispose();
      r.gold.dispose();
    };
  }, [cover]);

  return (
    <group position={POSITION} rotation={[0, ROT_Y, 0]}>
      <mesh geometry={res.frame} material={res.frameMat} position={[0, 0, -0.02]} />
      <mesh geometry={res.panel} material={res.panelMat} position={[0, 0, 0.002]} />
      {/* Disco de oro enmarcado como un premio: terciopelo negro con filo
          dorado, el disco con sus surcos y la etiqueta del centro. */}
      <group position={[DISC.x, DISC.y, 0]}>
        <mesh geometry={res.trim} material={res.gold} position={[0, 0, 0.004]} />
        <mesh geometry={res.backing} material={res.velvet} position={[0, 0, 0.01]} />
        <group position={[0, 0, 0.022]}>
          <mesh geometry={res.disc} material={res.gold} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={res.grooves} material={res.groove} position={[0, 0, 0.0045]} />
          <mesh geometry={res.label} material={res.panelMat} position={[0, 0, 0.005]} />
        </group>
      </group>
    </group>
  );
}
