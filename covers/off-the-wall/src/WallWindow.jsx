// Ventana alta en la pared, a la derecha de Michael, como en la portada: en
// el encuadre solo asoma su borde izquierdo, con un marco fino y oscuro y el
// cielo detrás, azul arriba, casi blanco en medio y un verde difuminado abajo. Al girar la cámara se ve
// entera. Modelada con código (interpretación propia, no sacada de la foto).
// Coste: 2 llamadas (el marco va fundido en una sola geometría) y ninguna
// textura: el degradado del cielo va en los colores de los vértices.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoxGeometry, Color, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from 'three';
import { WALL } from './set.js';
import { shotRig } from './shotRig.js';

// Medidas (m) y sitio en la pared: el borde izquierdo queda justo dentro del
// lado derecho del encuadre de la portada y la parte de abajo, a la altura
// del pecho de Michael.
const W = 1.05;
const H = 2.3;
// Marco muy fino, como en la foto: apenas un perfil de metal.
const BAR = 0.011;
const LEFT = 1.06;
const BOTTOM = 0.97;
const POS = [LEFT + W / 2, BOTTOM + H / 2];
// En la foto de cintura para arriba la ventana ocupa la franja derecha, del
// borde de arriba hasta la altura de las manos, como en esa versión del disco.
const HALF_POS = [0.54 + W / 2, 0.8 + H / 2];
// Cara delantera de los ladrillos.
const FRONT = WALL.z + 0.11;

// Cielo de la ventana, de arriba abajo: [altura (0 arriba, 1 abajo), color].
// Azul casi todo el alto, que se aclara hacia el horizonte; el verde solo
// asoma, difuminado, en el último cuarto.
const SKY = [
  [0, '#3a7cc8'],
  [0.35, '#5f9fdb'],
  [0.62, '#8fc0e4'],
  [0.78, '#b4d6e2'],
  [0.9, '#a9d0a2'],
  [1, '#6aac63'],
];

/** Nubes tenues: 0 donde no hay y hasta 1 en el centro de una nube (ruido suave y estable). */
function cloud(x, y) {
  const n =
    Math.sin(x * 5.3 + y * 1.7 + 0.6) * Math.cos(y * 6.1 - x * 2.2 + 1.3) +
    0.5 * Math.sin(x * 11.7 - y * 4.3 + 2.1) * Math.cos(y * 13.3 + x * 3.1);
  return Math.max(0, Math.min(1, (n - 0.25) / 0.9));
}

/** Marco fino: cuatro listones fundidos en uno. */
function frameGeometry() {
  const bar = (w, h, x, y, d = 0.045) => {
    const g = new BoxGeometry(w, h, d);
    g.translate(x, y, d / 2);
    return g;
  };
  const parts = [
    bar(W + BAR, BAR, 0, H / 2),
    bar(W + BAR, BAR, 0, -H / 2),
    bar(BAR, H, -W / 2, 0),
    bar(BAR, H, W / 2, 0),
  ];
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

/** Cristal con el degradado del cielo en los vértices. */
function skyGeometry() {
  // Malla fina: las nubes también van en los colores de los vértices.
  const g = new PlaneGeometry(W, H, 28, 60);
  const pos = g.attributes.position;
  const colors = [];
  const c = new Color();
  const white = new Color('#f4f8fb');
  const stops = SKY.map(([at, hex]) => [at, new Color(hex)]);
  for (let i = 0; i < pos.count; i += 1) {
    // 0 arriba, 1 abajo.
    const t = Math.max(0, Math.min(1, (H / 2 - pos.getY(i)) / H));
    let a = 0;
    while (a < stops.length - 2 && t > stops[a + 1][0]) a += 1;
    const [t0, c0] = stops[a];
    const [t1, c1] = stops[a + 1];
    c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));
    // Nubes que casi no se ven, solo en la parte azul (se apagan hacia el verde).
    c.lerp(white, cloud(pos.getX(i), pos.getY(i)) * 0.22 * (1 - Math.max(0, Math.min(1, (t - 0.55) / 0.25))));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}

export default function WallWindow() {
  const res = useMemo(
    () => ({
      frame: frameGeometry(),
      glass: skyGeometry(),
      // Marco metálico oscuro, como el de la foto.
      paint: new MeshStandardMaterial({ color: '#3d3c3a', roughness: 0.45, metalness: 0.5 }),
      // El cielo es luz: no le afectan las luces del estudio.
      // Sin el mapeo de tonos de la escena: si no, el azul se lavaba casi a blanco.
      pane: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      res.frame.dispose();
      res.glass.dispose();
      res.paint.dispose();
      res.pane.dispose();
    },
    [res],
  );

  const group = useRef(/** @type {import('three').Group | null} */ (null));
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const [x, y] = shotRig.half ? HALF_POS : POS;
    g.position.set(x, y, FRONT);
  });

  return (
    <group ref={group} position={[POS[0], POS[1], FRONT]}>
      {/* El cristal va un par de centímetros por delante de la pared: así no
          asoma ninguna esquina de ladrillo a través del cielo. */}
      <mesh geometry={res.glass} material={res.pane} position={[0, 0, 0.022]} />
      <mesh geometry={res.frame} material={res.paint} receiveShadow />
    </group>
  );
}
