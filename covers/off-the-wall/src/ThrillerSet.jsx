// El mismo estudio de Off the Wall, tres años después: la sesión de fotos de
// Thriller (julio de 1982). Lo que cambia respecto a 1979:
//  - Delante de la pared de ladrillo cuelga un fondo de papel negro sin fin
//    (sube de la pared al suelo en curva), con el halo de luz detrás de
//    Michael, como en la portada. Las fotos de Thriller son de estudio, sobre
//    negro; el ladrillo asoma a los lados.
//  - En el rincón donde estaba Studio 54 (que cerró con sus dueños en 1980)
//    hay un rincón de 1982: una máquina recreativa, una tele de tubo con un
//    vídeo, una videoconsola de cartuchos, un radiocasete grande, un walkman
//    y un cubo de Rubik.
//  - Una mesa con las Polaroid de prueba de la sesión (antes de disparar en
//    película se hacía una Polaroid para comprobar la luz).
//  - Bajo el cuadro de los Jackson 5, una balda con el Grammy que Michael
//    ganó el 27 de febrero de 1980 por «Don't Stop 'Til You Get Enough».
// Todo es atrezo inventado y hecho con código (ninguna marca ni logotipo).
// Se hornea por material: unas 6 llamadas de dibujo.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { WALL } from './set.js';

function piece(geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale)));
  return geo;
}

/** Color liso en los vértices (varias piezas de colores en una sola malla). */
function tint(geo, hex) {
  const c = new Color(hex);
  const v = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < v.length; i += 3) {
    v[i] = c.r;
    v[i + 1] = c.g;
    v[i + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(v, 3));
  // Las geometrías que se funden deben tener los mismos atributos.
  if (!geo.index) return geo;
  const flat = geo.toNonIndexed();
  geo.dispose();
  return flat;
}

function fuse(parts) {
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    return n;
  });
  const g = mergeGeometries(clean);
  clean.forEach((x) => x.dispose());
  return g;
}

/**
 * Fondo de papel negro sin fin: baja recto desde 3,6 m pegado a la pared,
 * hace una curva de 0,7 m de radio y se extiende por el suelo hasta delante
 * de la cámara de la portada. Ancho 5,2 m (el ladrillo asoma a los dos lados).
 */
function sweepGeometry() {
  const width = 5.2;
  const z0 = WALL.z + 0.14;
  const r = 0.7;
  const prof = [];
  for (let y = 3.6; y > r; y -= 0.4) prof.push([y, z0]);
  for (let i = 0; i <= 12; i += 1) {
    const a = (i / 12) * (Math.PI / 2);
    prof.push([r - Math.sin(a) * r + 0.002, z0 + r - Math.cos(a) * r]);
  }
  // Por el suelo llega hasta delante de la cámara de la portada (si no, en la
  // foto asoma el suelo del estudio por abajo).
  for (let z = z0 + r + 0.3; z <= 3.5; z += 0.3) prof.push([0.002, z]);
  const cols = 8;
  const pos = [];
  const index = [];
  prof.forEach(([y, z]) => {
    for (let i = 0; i <= cols; i += 1) pos.push(-width / 2 + (width * i) / cols + 0.25, y, z);
  });
  for (let j = 0; j < prof.length - 1; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const a = j * (cols + 1) + i;
      const b = a + cols + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Halo de luz detrás de Michael: un círculo que va de claro en el centro a negro en el borde. */
function haloGeometry() {
  const g = new CircleGeometry(1.1, 48, 0, Math.PI * 2);
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  const center = new Color('#c9d6e8');
  for (let i = 0; i < p.count; i += 1) {
    const d = Math.hypot(p.getX(i), p.getY(i)) / 1.1;
    // Solo un resplandor tenue, como en la portada: el fondo se queda negro.
    const k = 0.05 * Math.max(0, 1 - d) ** 2.6;
    c[i * 3] = center.r * k;
    c[i * 3 + 1] = center.g * k;
    c[i * 3 + 2] = center.b * k;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  g.scale(1.5, 0.8, 1);
  return g;
}

/** El rincón de 1982 (donde en 1979 estaba Studio 54), en piezas de colores. */
function eightiesCorner() {
  const parts = [];
  // Máquina recreativa de pie: mueble negro con laterales de color, panel de
  // mandos inclinado con palanca y botones, y marquesina arriba.
  const ax = 3.7;
  const az = 9.95;
  parts.push(
    tint(piece(new BoxGeometry(0.7, 1.75, 0.7), [ax, 0.875, az]), '#16161c'),
    tint(piece(new BoxGeometry(0.02, 1.76, 0.71), [ax - 0.36, 0.88, az]), '#d8342b'),
    tint(piece(new BoxGeometry(0.02, 1.76, 0.71), [ax + 0.36, 0.88, az]), '#d8342b'),
    tint(piece(new BoxGeometry(0.66, 0.06, 0.28), [ax, 1.02, az - 0.42], [0.35, 0, 0]), '#24242c'),
    tint(piece(new CylinderGeometry(0.008, 0.008, 0.08, 8), [ax - 0.12, 1.09, az - 0.45]), '#d6d6d6'),
    tint(piece(new SphereGeometry(0.022, 10, 8), [ax - 0.12, 1.13, az - 0.45]), '#d8342b'),
    ...[0.05, 0.13, 0.21].map((x) => tint(piece(new CylinderGeometry(0.018, 0.018, 0.02, 12), [ax + x, 1.06, az - 0.44], [0.35, 0, 0]), x < 0.1 ? '#f2c230' : '#2a7bc9')),
    // Franjas de colores en los laterales y marco alrededor de la pantalla.
    ...[-1, 1].flatMap((sd) => [
      tint(piece(new BoxGeometry(0.022, 0.08, 0.6), [ax + sd * 0.362, 1.25, az]), '#ffd400'),
      tint(piece(new BoxGeometry(0.022, 0.05, 0.6), [ax + sd * 0.362, 1.12, az]), '#ff4fd8'),
    ]),
    tint(piece(new BoxGeometry(0.58, 0.48, 0.02), [ax, 1.36, az - 0.345], [0.12, 0, 0]), '#0b0b10'),
    // Puerta de las monedas con sus dos ranuras naranjas.
    tint(piece(new BoxGeometry(0.34, 0.24, 0.01), [ax, 0.42, az - 0.355]), '#2a2a30'),
    tint(piece(new BoxGeometry(0.04, 0.06, 0.012), [ax - 0.07, 0.46, az - 0.36]), '#ff8a1e'),
    tint(piece(new BoxGeometry(0.04, 0.06, 0.012), [ax + 0.07, 0.46, az - 0.36]), '#ff8a1e'),
  );
  // Tele de tubo sobre un mueble bajo, con el vídeo debajo y una consola de cartuchos con su mando.
  const tx = 2.65;
  const tz = 9.95;
  parts.push(
    tint(piece(new BoxGeometry(0.9, 0.5, 0.45), [tx, 0.25, tz]), '#5a3b22'),
    tint(piece(new BoxGeometry(0.62, 0.48, 0.48), [tx, 0.74, tz + 0.02]), '#2b2522'),
    tint(piece(new BoxGeometry(0.1, 0.4, 0.02), [tx + 0.24, 0.74, tz - 0.23]), '#4a3f38'),
    tint(piece(new BoxGeometry(0.42, 0.08, 0.3), [tx, 0.54, tz - 0.06]), '#1c1c1f'),
    tint(piece(new BoxGeometry(0.3, 0.07, 0.2), [tx - 0.05, 0.035, tz - 0.55]), '#141414'),
    tint(piece(new BoxGeometry(0.3, 0.012, 0.2), [tx - 0.05, 0.072, tz - 0.55]), '#6b4a2c'),
    tint(piece(new BoxGeometry(0.06, 0.03, 0.06), [tx + 0.22, 0.015, tz - 0.7]), '#141414'),
    tint(piece(new CylinderGeometry(0.006, 0.006, 0.07, 6), [tx + 0.22, 0.06, tz - 0.7]), '#141414'),
    tint(piece(new SphereGeometry(0.01, 8, 6), [tx + 0.22, 0.04, tz - 0.67]), '#d8342b'),
    // Mandos y rejilla del altavoz de la tele, a la derecha de la pantalla.
    ...[0.86, 0.74].map((y) => tint(piece(new CylinderGeometry(0.022, 0.022, 0.02, 14), [tx + 0.24, y, tz - 0.245], [Math.PI / 2, 0, 0]), '#c9c9cd')),
    ...[0.66, 0.63, 0.6, 0.57].map((y) => tint(piece(new BoxGeometry(0.07, 0.008, 0.005), [tx + 0.24, y, tz - 0.245]), '#18120f')),
    // Antena de cuernos encima de la tele.
    tint(piece(new CylinderGeometry(0.004, 0.004, 0.38, 6), [tx - 0.08, 1.15, tz + 0.05], [0, 0, 0.45]), '#c9c9cd'),
    tint(piece(new CylinderGeometry(0.004, 0.004, 0.38, 6), [tx + 0.08, 1.15, tz + 0.05], [0, 0, -0.45]), '#c9c9cd'),
    tint(piece(new SphereGeometry(0.03, 12, 8), [tx, 0.99, tz + 0.05], [0, 0, 0], [1.4, 0.6, 1]), '#2b2522'),
    // Cartuchos apilados junto a la consola.
    ...[0, 1, 2].map((k) => tint(piece(new BoxGeometry(0.09, 0.018, 0.1), [tx - 0.3, 0.01 + k * 0.019, tz - 0.6], [0, k * 0.2, 0]), ['#1d1d1d', '#8a2420', '#2a5fa8'][k])),
    // Puf de piel marrón delante de la tele.
    tint(piece(new SphereGeometry(0.28, 20, 14), [tx - 0.35, 0.16, tz - 1.05], [0, 0, 0], [1, 0.6, 1]), '#6b4423'),
  );
  // Radiocasete grande en el suelo: cuerpo plateado, dos altavoces y asa.
  const bx = 3.15;
  const bz = 9.0;
  parts.push(
    tint(piece(new BoxGeometry(0.62, 0.3, 0.14), [bx, 0.15, bz]), '#b7b9bd'),
    ...[-0.19, 0.19].map((x) => tint(piece(new CylinderGeometry(0.1, 0.1, 0.02, 24), [bx + x, 0.15, bz - 0.07], [Math.PI / 2, 0, 0]), '#1d1d20')),
    tint(piece(new BoxGeometry(0.16, 0.1, 0.02), [bx, 0.17, bz - 0.071]), '#2a2a2e'),
    tint(piece(new TorusGeometry(0.2, 0.012, 6, 24, Math.PI), [bx, 0.3, bz]), '#9a9ca0'),
  );
  // Mesa baja con un cubo de Rubik y un walkman con sus cascos.
  const mx = 2.5;
  const mz = 8.95;
  parts.push(
    tint(piece(new BoxGeometry(0.55, 0.04, 0.4), [mx, 0.42, mz]), '#e8e2d2'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => tint(piece(new CylinderGeometry(0.015, 0.015, 0.4, 8), [mx + sx * 0.24, 0.2, mz + sz * 0.16]), '#c9c9cd')),
  );
  const faces = ['#e8e8e8', '#f2c230', '#d8342b', '#ff8a1e', '#2a7bc9', '#2f9a4a'];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      for (let k = 0; k < 3; k += 1) {
        parts.push(tint(piece(new BoxGeometry(0.0185, 0.0185, 0.0185), [mx - 0.12 + i * 0.02, 0.45 + j * 0.02, mz + k * 0.02], [0, 0.4, 0]), faces[(i + j * 2 + k * 3) % 6]));
      }
    }
  }
  parts.push(
    tint(piece(new BoxGeometry(0.09, 0.028, 0.13), [mx + 0.1, 0.454, mz - 0.02], [0, -0.3, 0]), '#3b5f8a'),
    tint(piece(new TorusGeometry(0.06, 0.006, 6, 20, Math.PI), [mx + 0.12, 0.445, mz + 0.1], [-Math.PI / 2, 0, 0.6]), '#d1a21e'),
    // Las almohadillas naranjas de los cascos, como las del primer walkman.
    tint(piece(new CylinderGeometry(0.022, 0.022, 0.012, 14), [mx + 0.07, 0.448, mz + 0.06]), '#ff8a1e'),
    tint(piece(new CylinderGeometry(0.022, 0.022, 0.012, 14), [mx + 0.17, 0.448, mz + 0.14]), '#ff8a1e'),
  );
  return fuse(parts);
}

/** Pantallas que brillan: la de la recreativa y la de la tele. */
function screens() {
  return fuse([
    // La marquesina iluminada (las pantallas las pinta CornerScreens.jsx).
    tint(piece(new BoxGeometry(0.62, 0.12, 0.01), [3.7, 1.66, 9.59]), '#f2c230'),
  ]);
}

/** Mesa de las Polaroid de prueba, junto a la cámara del trípode. */
function polaroids() {
  const parts = [
    tint(piece(new BoxGeometry(0.6, 0.03, 0.45), [1.55, 0.72, 4.4], [0, 0.3, 0]), '#d9d4c8'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => tint(piece(new CylinderGeometry(0.014, 0.014, 0.71, 8), [1.55 + sx * 0.25, 0.355, 4.4 + sz * 0.18]), '#2a2a2e')),
  ];
  // Seis Polaroid sueltas: el marco blanco (la foto la pinta StudioFeed.jsx).
  for (let i = 0; i < 6; i += 1) {
    const x = 1.38 + (i % 3) * 0.12;
    const z = 4.3 + Math.floor(i / 3) * 0.16;
    const r = (Math.sin(i * 7.1) * 0.5) - 0.2;
    parts.push(
      tint(piece(new BoxGeometry(0.09, 0.003, 0.107), [x, 0.737, z], [0, r, 0]), '#f3f0e8'),
    );
  }
  // La cámara instantánea, gris y negra.
  parts.push(tint(piece(new BoxGeometry(0.16, 0.1, 0.12), [1.75, 0.785, 4.52], [0, -0.4, 0]), '#3a3a3e'));
  return fuse(parts);
}

/** Balda bajo el cuadro de los Jackson 5 con el gramófono dorado del Grammy de 1980. */
function grammy() {
  const x = 4.12;
  const z = 4.6;
  const wood = fuse([tint(piece(new BoxGeometry(0.3, 0.03, 0.6), [x, 1.0, z]), '#1a1416'), tint(piece(new BoxGeometry(0.06, 0.12, 0.14), [x, 1.06, z]), '#141012')]);
  const gold = fuse([
    tint(piece(new CylinderGeometry(0.05, 0.06, 0.03, 20), [x, 1.135, z]), '#f2c75a'),
    tint(piece(new BoxGeometry(0.07, 0.04, 0.07), [x, 1.17, z]), '#f2c75a'),
    tint(piece(new CylinderGeometry(0.006, 0.006, 0.08, 8), [x, 1.21, z - 0.01], [0.3, 0, 0]), '#f2c75a'),
    // La bocina del gramófono, abierta hacia el plató.
    tint(piece(new ConeGeometry(0.075, 0.13, 20, 1, true), [x - 0.05, 1.27, z - 0.02], [0, 0, Math.PI / 2 - 0.5]), '#f2c75a'),
    // Los tres American Music Awards del 18 de enero de 1980 (artista, disco y
    // canción de soul/R&B): tres trofeos dorados sencillos, a la derecha.
    ...[0.12, 0.2, 0.28].flatMap((dz) => [
      tint(piece(new BoxGeometry(0.05, 0.03, 0.05), [x, 1.03, z + dz]), '#2a2024'),
      tint(piece(new CylinderGeometry(0.01, 0.018, 0.12, 12), [x, 1.105, z + dz]), '#f2c75a'),
      tint(piece(new SphereGeometry(0.026, 14, 10), [x, 1.185, z + dz]), '#f2c75a'),
    ]),
  ]);
  return { wood, gold };
}

/** @param {{ flash: number | null, playing: boolean, level: () => number, reduced: boolean }} props */
export default function ThrillerSet({ flash, playing, level, reduced }) {
  const res = useMemo(() => {
    const g = grammy();
    return {
      geo: {
        sweep: sweepGeometry(),
        halo: haloGeometry(),
        corner: eightiesCorner(),
        screens: screens(),
        polaroids: polaroids(),
        shelf: g.wood,
        gold: g.gold,
      },
      mats: {
        // Papel negro mate: refleja un poco, como el suelo brillante de la portada.
        sweep: new MeshStandardMaterial({ color: '#010102', roughness: 1, metalness: 0, envMapIntensity: 0.1, side: DoubleSide }),
        halo: new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
        props: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 }),
        screen: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
        gold: new MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.8, emissive: '#6b4a0e', emissiveIntensity: 0.6 }),
      },
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(res.geo).forEach((g) => g.dispose());
      Object.values(res.mats).forEach((m) => m.dispose());
    },
    [res],
  );
  const halo = useRef(null);
  const screen = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // El halo respira con la música (y destella con la foto).
    let f = 0;
    if (flash !== null) {
      const dt = performance.now() / 1000 - flash;
      if (dt >= 0 && dt < 0.4) f = 1 - dt / 0.4;
    }
    const beat = playing && !reduced ? level() : 0;
    if (halo.current) halo.current.scale.setScalar(1 + beat * 0.08 + f * 0.15);
    if (halo.current) halo.current.material.opacity = 0.8 + beat * 0.2;
    // Las pantallas parpadean un poco, como un tubo de rayos catódicos.
    if (screen.current && !reduced) screen.current.material.color.setScalar(0.85 + Math.sin(t * 50) * 0.04 + Math.sin(t * 1.3) * 0.08);
  });
  return (
    <group>
      <mesh geometry={res.geo.sweep} material={res.mats.sweep} receiveShadow />
      {/* El halo, detrás de la cabeza de Michael tumbado (a la derecha del centro). */}
      <mesh ref={halo} geometry={res.geo.halo} material={res.mats.halo} position={[-0.2, 1.25, WALL.z + 0.16]} />
      <mesh geometry={res.geo.corner} material={res.mats.props} />
      <mesh ref={screen} geometry={res.geo.screens} material={res.mats.screen} />
      <mesh geometry={res.geo.polaroids} material={res.mats.props} />
      <mesh geometry={res.geo.shelf} material={res.mats.props} />
      <mesh geometry={res.geo.gold} material={res.mats.gold} />
    </group>
  );
}
