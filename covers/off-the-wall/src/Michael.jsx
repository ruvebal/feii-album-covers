// Michael tal y como sale en la portada: esmoquin negro abierto, camisa
// blanca, pajarita, calcetines blancos que brillan con el flash, mocasines y
// la sonrisa, con la postura de la foto: piernas abiertas, una mano abierta a
// la altura de la cintura y la otra junto al muslo.
// Figura modelada solo con código (perfiles de torno y piezas sencillas):
// es una interpretación propia, no un escaneo ni una foto.
//
// Animación (en useFrame, sin estado de React por fotograma):
//  - en reposo está en la postura de la portada, respira y balancea un poco;
//  - al bailar deja esa postura (dances.js da `amount`) y vuelve al acabar;
//  - las piernas tienen rodilla y tobillo, y el cuerpo apoya solo sobre la
//    pierna más alta que esté en el suelo (los pies no flotan ni se hunden);
//  - cuando suena una canción del disco sigue los graves;
//  - cuatro pasos de baile (POSES): la vuelta de dos giros que acaba de
//    puntillas, las puntillas con el brazo arriba, la patada y deslizarse
//    hacia atrás alternando los talones.
// Con prefers-reduced-motion no hay movimiento: se enseña el paso quieto.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  TorusGeometry,
  TubeGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { LEG, groovePose, kneeFor, moonwalkLoop, movePose, toeRise } from './dances.js';
import { travelState } from './travel.js';
import { applyLook } from './looks.js';
import { MICHAEL } from './set.js';
import { flashLevel, glowWhites } from './flash.js';

// Aplastamiento del torso de delante a atrás (un cuerpo no es un cilindro).
const FLAT = 0.62;
// Altura de la cadera: el resto del cuerpo cuelga de aquí.
const HIP_Y = 0.92;
// Móvil (pantalla táctil o estrecha): las piezas pequeñas (puños, manos,
// calcetines, zapatos, solapas y cuello) no proyectan sombra. Cada pieza que
// la proyecta se dibuja otra vez en el mapa de sombras; así el móvil se queda
// por debajo del tope de 80 llamadas del curso. La sombra de Michael en la
// pared sigue saliendo (la hacen el cuerpo, las piernas, los brazos y la cabeza).
const LITE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
// Altura (desde la cadera) de la cintura del pantalón, alta como en los
// setenta: la camisa se ve de ahí al cuello; por debajo, el pantalón negro.
// Ensanchado del tronco (1 = el modelo tal cual).
const WIDEN = 1.05;
const WAIST = 0.15;
// Distancia del centro del pecho al hombro (donde cuelga el brazo y va la hombrera).
const SHOULDER = 0.198;
// Postura de baile neutra: de pie, relajado, de la que parten los pasos.
const DANCE = {
  hip: 0.035, shoulders: -0.05, headTilt: 0.07, headTurn: 0.08,
  armRZ: -0.07, armRX: -0.05, elbowR: -0.38, armLZ: 0.07, armLX: -0.05, elbowL: -0.44,
  elbowRZ: 0, elbowLZ: 0,
  wristRX: 0, wristRY: 0, wristRZ: 0, wristLX: 0, wristLY: 0, wristLZ: 0, thumbIn: 0,
  legOutR: 0.045, legOutL: 0, footOut: 0.12, heelL: 0, kneeInL: 0, kneeBendL: 0, kneeInR: 0, footInR: 0, hipOut: 0,
  twist: 0, lean: 0, knee: 0, swayHip: 0,
};
// Postura de la portada: piernas abiertas, las dos manos en vertical con el
// pulgar en el bolsillo (una más alta que la otra) y el torso inclinado.
const COVER = {
  // Como en la foto: el peso va en su pierna izquierda (la de la derecha de
  // la imagen), la cadera sale hacia ese lado y el tronco se inclina hacia el
  // otro; la cabeza compensa y queda casi recta. (Ajustado a mano por Alejandro.)
  hip: 0.06, shoulders: 0.07, headTilt: -0.08, headTurn: -0.04,
  // Codos pegados al tronco. La mano derecha cae junto al bolsillo; la
  // izquierda queda arriba, a la altura de la cintura y del bajo de la camisa
  // (el codo se dobla más y va algo atrás), también en vertical: con los
  armRZ: 0.05, armRX: 0.22, elbowR: -1.0, armLZ: -0.05, armLX: 0.45, elbowL: -1.86,
  elbowRZ: 0.11, elbowLZ: -0.01,
  // Muñecas: las dos manos en vertical, con los dedos hacia abajo (los de la
  // derecha, un poco abiertos hacia fuera: solo gira la muñeca) y el
  // pulgar metido en el bolsillo (thumbIn lo esconde dentro del pantalón).
  wristRX: 0.995, wristRY: 0.96, wristRZ: -0.486, wristLX: 1.35, wristLY: -1.15, wristLZ: 0.15, thumbIn: 1,
  legOutR: 0.2, legOutL: 0.13, footOut: 0.1, heelL: 0.3, kneeInL: 0.05, kneeBendL: 0.1,
  kneeInR: 0.06, footInR: 0.35, hipOut: -0.03,
  twist: 0, lean: 0.02, knee: 0, swayHip: 0.25,
};

// Perfil de la chaqueta: [radio, altura] desde el bajo hasta el cuello.
const JACKET = [
  [0.0, -0.21],
  [0.152, -0.2],
  [0.148, -0.1],
  // Cintura un poco más ancha (0,9 cm por lado): en la portada el tronco cae
  // casi recto, no tan entallado.
  [0.146, -0.02],
  [0.143, 0.1],
  [0.143, 0.22],
  [0.151, 0.36],
  // Hombros rectos con hombrera, como un esmoquin de la época: el perfil se
  // mantiene ancho casi hasta arriba y se cierra de golpe hacia el cuello.
  // En la portada se le ve ancho de hombros: la chaqueta se abre más arriba y
  // encima va una hombrera a cada lado (jacketGeometry).
  [0.18, 0.46],
  [0.198, 0.55],
  [0.196, 0.578],
  [0.125, 0.598],
  [0.06, 0.608],
  [0.0, 0.612],
];

/** Radio de la chaqueta a una altura dada (interpolando el perfil). */
function jacketRadius(y) {
  for (let i = 1; i < JACKET.length; i += 1) {
    const [r1, y1] = JACKET[i];
    const [r0, y0] = JACKET[i - 1];
    if (y <= y1) {
      const t = (y - y0) / (y1 - y0 || 1);
      return r0 + (r1 - r0) * Math.max(0, Math.min(1, t));
    }
  }
  return 0;
}

/**
 * Banda pegada a la superficie de la chaqueta, de y0 a y1, entre dos ángulos
 * que dependen de la altura (0 = el centro del pecho). Sirve para la pechera
 * en V y para las solapas, que así siguen la curva del cuerpo.
 */
function chestBand(y0, y1, from, to, lift) {
  // Muchas filas: la chaqueta se curva fuerte bajo el cuello y, con pocas, la
  // banda quedaba por dentro y asomaba una raya negra en la camisa.
  const rows = 48;
  const cols = 10;
  const pos = [];
  const index = [];
  for (let j = 0; j <= rows; j += 1) {
    const y = y0 + ((y1 - y0) * j) / rows;
    const a0 = from(y);
    const a1 = to(y);
    const r = jacketRadius(y) + lift;
    for (let i = 0; i <= cols; i += 1) {
      const a = a0 + ((a1 - a0) * i) / cols;
      pos.push(r * Math.sin(a), y, r * Math.cos(a) * FLAT);
    }
  }
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const a = j * (cols + 1) + i;
      const b = a + cols + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * Pelo afro: una esfera muy subdividida con dos capas de bultos deterministas,
 * una ancha (la forma) y una fina (los rizos). Se fusionan los vértices para
 * que el sombreado sea suave y los rizos se vean por la luz, no por facetas.
 */
function afroGeometry() {
  const base = new IcosahedronGeometry(0.17, 18);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const g = mergeVertices(base);
  base.dispose();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const len = Math.hypot(x, y, z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    // Ruido barato y estable: la misma dirección da siempre el mismo bulto,
    // así los vértices repetidos de la malla no se separan. La forma general
    // es casi una bola (el afro de 1979 era redondo y uniforme); los rizos,
    // pequeños y apretados.
    const broad = Math.sin(nx * 5.1 + ny * 2.3) * Math.cos(ny * 4.7 - nz * 3.2) * 0.015;
    const curls =
      Math.sin(nx * 83.3 + ny * 27.9) * Math.cos(ny * 77.1 - nz * 33.4) * Math.sin(nz * 69.7 + nx * 23.1) * 0.03 +
      Math.sin(nx * 151.7 - nz * 41.3) * Math.cos(ny * 139.2 + nx * 19.6) * 0.012;
    // Hueco de la cara: delante y por debajo de la frente el pelo se mete
    // hacia dentro, para que el afro enmarque la cara en vez de taparla.
    // La frente queda a la vista (en la foto el pelo nace arriba y sale hacia
    // arriba y a los lados, sin flequillo); el borde es redondeado, no recto.
    const front = Math.max(0, Math.min(1, (nz - 0.02) / 0.4));
    const low = Math.max(0, Math.min(1, (0.66 - ny + Math.abs(nx) * 0.35) / 0.32));
    const face = front * low;
    // Por debajo de la nuca se cierra hacia el cuello.
    const neck = Math.max(0, Math.min(1, (-0.45 - ny) / 0.35));
    const k = (1 + broad + curls) * (1 - 0.6 * face) * (1 - 0.35 * neck);
    p.setXYZ(i, nx * 0.17 * k, ny * 0.17 * k, nz * 0.17 * k);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Pelo de 1982 (Thriller): rizos sueltos y brillantes, no una bola. Más
 * volumen arriba, los lados pegados a la cabeza por encima de las orejas y
 * la nuca corta; delante, la frente despejada
 * con rizos pequeños y apretados.
 */
function curlsGeometry() {
  const base = new IcosahedronGeometry(0.145, 20);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const g = mergeVertices(base);
  base.dispose();
  const p = g.attributes.position;
  const surface = new Vector3();
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const len = Math.hypot(x, y, z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    curlSurfacePoint(nx, ny, nz, surface);
    p.setXYZ(i, surface.x, surface.y, surface.z);
  }
  g.computeVertexNormals();
  return g;
}

function curlSurfacePoint(nx, ny, nz, target = new Vector3()) {
  // La base y los rizos usan la misma superficie para que queden integrados.
  const big = Math.sin(nx * 34.1 + ny * 11.3) * Math.cos(ny * 31.7 - nz * 13.9) * Math.sin(nz * 29.3 + nx * 9.7);
  const small = Math.sin(nx * 71.3 - nz * 23.1) * Math.cos(ny * 67.9 + nx * 17.3);
  const tiny = Math.sin(nx * 131.3 + nz * 47.9) * Math.cos(ny * 119.7 - nz * 37.1);
  const curl = ((big * 0.5 + 0.5) ** 2) * 0.035 + Math.max(0, small) * 0.03 + tiny * 0.01 - 0.015;
  const top = Math.max(0, ny) * 0.035;
  const side = Math.abs(nx) * Math.max(0, 0.7 - Math.abs(ny)) * 0.09;
  const front = Math.max(0, Math.min(1, (nz - 0.05) / 0.35));
  const low = Math.max(0, Math.min(1, (0.68 - ny + Math.abs(nx) * 0.22) / 0.3));
  const face = front * low;
  const k = (1 + top + side + curl) * (1 - 0.75 * face);
  let y = ny * 0.15 * k;
  if (nz < 0.1 && ny < 0) y -= Math.min(1, -ny * 1.6) * 0.018 * Math.max(0, 0.1 - nz) * 2;
  return target.set(nx * 0.15 * k, y, nz * 0.15 * k);
}

/**
 * Rizos sueltos del pelo de 1982: 240 rizos en espiral (cada uno un tubo
 * fino que da dos vueltas), repartidos por la cabeza con un poco de azar
 * fijo: arriba y a los lados con volumen, por detrás hasta la nuca, y nada
 * delante de la cara. Van encima de una base oscura (curlsGeometry) y se
 * funden en una sola malla: una llamada de dibujo.
 */
function ringletsGeometry() {
  const parts = [];
  // Espiral de un rizo, a lo largo de y (de 0 a -largo).
  const helix = (turns, radius, length) => {
    const pts = [];
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      const a = t * turns * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * radius * (1 - t * 0.3), -t * length, Math.sin(a) * radius * (1 - t * 0.3)));
    }
    return new CatmullRomCurve3(pts);
  };
  // Azar fijo: el pelo sale igual en cada visita.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const up = new Vector3(0, 1, 0);
  const count = 240;
  for (let i = 0; i < count; i += 1) {
    // Puntos repartidos por la esfera (espiral de Fibonacci).
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * 2.399963;
    const nx = Math.cos(phi) * r;
    const nz = Math.sin(phi) * r;
    const ny = y;
    // Sin pelo delante de la cara ni por debajo de las orejas por delante.
    if (nz > 0.25 && ny < 0.5) continue;
    if (ny < -0.15 && nz > -0.1) continue;
    if (ny < -0.8) continue;
    const n = new Vector3(nx, ny, nz).normalize();
    const pos = curlSurfacePoint(nx, ny, nz).addScaledVector(n, -0.004);
    const len = 0.014 + rnd() * 0.006 + (ny < 0 ? 0.003 : 0);
    const curl = new TubeGeometry(helix(1.5 + rnd() * 0.5, 0.0035 + rnd() * 0.001, len), 18, 0.0016, 5, false);
    // El rizo sale de la cabeza hacia fuera y cuelga un poco hacia abajo.
    const dir = n.clone().multiplyScalar(-1).add(new Vector3(0, 0.6, 0)).normalize();
    const q = new Quaternion().setFromUnitVectors(up, dir);
    curl.applyMatrix4(new Matrix4().compose(pos, q, new Vector3(1, 1, 1)));
    parts.push(curl);
  }
  const g = mergeGeometries(parts);
  parts.forEach((x) => x.dispose());
  return g;
}

/** Coloca una geometría (posición, giro y escala) para fundirla con otras. */
function place(geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new Matrix4().compose(
    new Vector3(...pos),
    new Quaternion().setFromEuler(new Euler(...rot)),
    new Vector3(...scale),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Funde varias piezas en una sola geometría y libera las piezas sueltas. */
function fuse(parts) {
  const g = mergeGeometries(parts);
  parts.forEach((x) => x.dispose());
  return g;
}

/**
 * Piezas de la cara agrupadas por material: piel (cráneo, mandíbula, orejas,
 * párpados, pómulos y nariz), blanco de los ojos, iris, pelo fino (cejas y
 * patillas), labios y dientes.
 */
function headGeometries() {
  const sides = [-1, 1];
  return {
    headSkin: fuse([
      place(new SphereGeometry(0.105, 32, 24), [0, 0, 0], [0, 0, 0], [0.82, 1.12, 0.96]),
      place(new SphereGeometry(0.1, 28, 20), [0, -0.05, 0.004], [0, 0, 0], [0.68, 0.84, 0.86]),
      // Barbilla en pico: la cara se estrecha hacia abajo en forma de V.
      place(new SphereGeometry(0.036, 20, 14), [0, -0.1, 0.028], [0.2, 0, 0], [0.95, 1.2, 0.8]),
      ...sides.flatMap((s) => [
        place(new SphereGeometry(0.03, 12, 10), [s * 0.096, -0.005, -0.005], [0, 0, 0], [0.45, 1, 0.75]),
        // Párpado de arriba: da la mirada sonriente.
        place(new SphereGeometry(0.019, 14, 8), [s * 0.036, 0.028, 0.088], [0, 0, s * 0.08], [1.2, 0.12, 0.4]),
        // Pómulo marcado.
        place(new SphereGeometry(0.022, 14, 10), [s * 0.05, -0.014, 0.055], [0, 0, 0], [1, 0.7, 0.4]),
      ]),
      // Nariz fina: puente estrecho y punta pequeña.
      place(new SphereGeometry(0.012, 12, 10), [0, 0.006, 0.1], [0, 0, 0], [0.55, 1.6, 0.6]),
      place(new SphereGeometry(0.012, 14, 10), [0, -0.016, 0.103], [0, 0, 0], [1.35, 0.7, 0.75]),
    ]),
    // Ojos grandes y algo almendrados, con el iris oscuro casi entero.
    eyeWhites: fuse(
      sides.map((s) => place(new SphereGeometry(0.018, 14, 10), [s * 0.036, 0.015, 0.086], [0, 0, s * 0.06], [1.15, 0.66, 0.6])),
    ),
    irises: fuse(sides.map((s) => place(new SphereGeometry(0.0108, 12, 10), [s * 0.036, 0.015, 0.0955], [0, 0, 0], [1, 1, 0.7]))),
    hairBits: fuse(
      sides.flatMap((s) => [
        // Cejas gruesas y arqueadas.
        place(new CapsuleGeometry(0.003, 0.03, 4, 8), [s * 0.038, 0.049, 0.091], [0, s * 0.25, Math.PI / 2 - s * 0.08]),
        // Patillas: el pelo baja por delante de la oreja.
        place(new SphereGeometry(0.03, 12, 10), [s * 0.088, -0.005, 0.03], [0, 0, 0], [0.5, 1.4, 0.9]),
      ]),
    ),
    brows82: fuse(
      sides.map(
        (s) =>
          new TubeGeometry(
            new CatmullRomCurve3([
              new Vector3(s * 0.016, 0.037, 0.0945),
              new Vector3(s * 0.027, 0.039, 0.0895),
              new Vector3(s * 0.039, 0.038, 0.0835),
              new Vector3(s * 0.049, 0.034, 0.0785),
            ]),
            16,
            0.0016,
            6,
            false,
          ),
      ),
    ),
    // La sonrisa amplia: boca abierta en media luna con los dientes de arriba.
    lips: fuse([
      place(new CircleGeometry(0.035, 28, Math.PI, Math.PI), [0, -0.047, 0.094], [-0.3, 0, 0], [1, 0.52, 1]),
      place(new CapsuleGeometry(0.005, 0.056, 4, 8), [0, -0.044, 0.094], [0, 0, Math.PI / 2], [0.55, 1.2, 0.6]),
    ]),
    teeth: place(new CircleGeometry(0.033, 28, Math.PI, Math.PI), [0, -0.0475, 0.0955], [-0.3, 0, 0], [0.92, 0.36, 1]),
    closedLips: fuse([
      place(new SphereGeometry(0.019, 24, 12), [0, -0.047, 0.094], [0, 0, 0], [1.15, 0.2, 0.34]),
      place(new SphereGeometry(0.018, 24, 12), [0, -0.054, 0.0935], [0, 0, 0], [1.05, 0.28, 0.36]),
    ]),
  };
}

/**
 * Pajarita de mariposa: las dos alas se abren hacia fuera, con la punta algo
 * hundida en el centro de cada lado, y un nudo aparte.
 */
function bowGeometry() {
  const s = new Shape();
  s.moveTo(0, 0.008);
  s.bezierCurveTo(0.02, 0.011, 0.045, 0.031, 0.064, 0.027);
  s.quadraticCurveTo(0.055, 0, 0.064, -0.027);
  s.bezierCurveTo(0.045, -0.031, 0.02, -0.011, 0, -0.008);
  s.bezierCurveTo(-0.02, -0.011, -0.045, -0.031, -0.064, -0.027);
  s.quadraticCurveTo(-0.055, 0, -0.064, 0.027);
  s.bezierCurveTo(-0.045, 0.031, -0.02, 0.011, 0, 0.008);
  const g = new ExtrudeGeometry(s, {
    depth: 0.008,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  g.translate(0, 0, -0.004);
  return g;
}

/** Pernera del pantalón (torno), en dos trozos: muslo y espinilla, con algo de campana abajo. */
function trouserGeometries() {
  // El torno necesita el perfil de abajo arriba: al revés las caras miran hacia
  // dentro, no se pinta la de delante y se ve el interior oscuro (y la tapa del
  // calcetín como una raya). Por eso se da la vuelta a los puntos.
  const lathe = (pts) => new LatheGeometry([...pts].reverse().map(([r, y]) => new Vector2(r, y)), 32);
  // El muslo acaba justo en la rodilla y la espinilla empieza ahí con el mismo
  // radio: con la pierna recta no se ve ninguna junta. La pernera cae recta y
  // se abre un poco abajo, sobre el zapato, como en los setenta.
  const thigh = [
    [0.0, 0.0],
    [0.068, -0.02],
    [0.07, -0.1],
    [0.068, -0.3],
    [0.062, -0.42],
  ];
  const shin = [
    [0.062, 0.0],
    [0.06, -0.08],
    [0.062, -0.2],
    [0.068, -0.3],
    [0.076, -0.36],
  ];
  return {
    thigh: lathe(thigh),
    // Desde la rodilla hasta el bajo, que cae sobre el calcetín.
    shin: lathe([...shin, [0.0, -0.365]]),
  };
}

/** Materiales compartidos de la figura (se crean una vez y se liberan al salir). */
function useMaterials() {
  const mats = useMemo(
    () => ({
      // Paño negro del esmoquin: rugoso, con un poco de "sheen" de lana.
      wool: new MeshPhysicalMaterial({
        side: DoubleSide,
        color: '#0d0c0e',
        roughness: 0.85,
        sheen: 0.45,
        sheenRoughness: 0.6,
        sheenColor: new Color('#3a3740'),
      }),
      // Solapas y pajarita: negro mate, como en la foto (el flash no las aclara).
      satin: new MeshPhysicalMaterial({
        color: '#070608',
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
        side: DoubleSide,
      }),
      // Pajarita: negro mate, que con el flash no se vuelva gris.
      bow: new MeshStandardMaterial({ color: '#030303', roughness: 0.85 }),
      // La camisa también se enciende un poco con el flash (en useFrame).
      shirt: new MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.62, side: DoubleSide, emissive: '#fff6e8', emissiveIntensity: 0 }),
      // Calcetines blancos: en la foto brillan con el flash.
      sock: new MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.85, emissive: '#fff8ec', emissiveIntensity: 0.8 }),
      // Piel: tono cálido con algo de "sheen" para que no parezca plástico.
      skin: new MeshPhysicalMaterial({
        color: '#7a4630',
        roughness: 0.52,
        sheen: 0.35,
        sheenRoughness: 0.5,
        sheenColor: new Color('#c98a66'),
      }),
      hair: new MeshStandardMaterial({ color: '#1a120d', roughness: 0.9 }),
      leather: new MeshPhysicalMaterial({ color: '#0d0c0c', roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      teeth: new MeshStandardMaterial({ color: '#f7f2e8', roughness: 0.3 }),
      lips: new MeshStandardMaterial({ color: '#5e2f22', roughness: 0.45 }),
      eyeWhite: new MeshStandardMaterial({ color: '#f1ece4', roughness: 0.25 }),
      iris: new MeshStandardMaterial({ color: '#1c100a', roughness: 0.2 }),
      // Thriller: pañuelo de leopardo del bolsillo y hebilla plateada del cinturón.
      pocket: new MeshStandardMaterial({ color: '#b98a4e', roughness: 0.8 }),
      buckle: new MeshStandardMaterial({ color: '#d6d8dc', roughness: 0.25, metalness: 0.9 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** Geometrías hechas a mano (torno, banda del pecho, pelo); se liberan al salir. */
function jacketGeometry() {
  const body = new LatheGeometry(
    [[jacketRadius(WAIST), WAIST], ...JACKET.filter(([, y]) => y > WAIST)].map(([r, y]) => new Vector2(r, y)),
    64,
    0.45,
    Math.PI * 2 - 0.9,
  );
  // Hombreras: una pastilla achatada sobre cada hombro, que sobresale por
  // encima de la manga y deja la línea del hombro recta y ancha. Van fundidas
  // con la chaqueta (ni una llamada más) y suben con ella en la postura de la
  // portada. La malla se aplasta luego en z (FLAT): aquí se compensa.
  const pads = [-1, 1].map((s) =>
    place(new SphereGeometry(0.05, 24, 16), [s * (SHOULDER - 0.003), 0.535, -0.006], [0, 0, 0], [1, 1.15, 1 / FLAT]),
  );
  const jacket = fuse([body, ...pads]);
  const raised = jacket.clone();
  const positions = raised.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const side = Math.max(0, Math.min(1, (-positions.getX(i) - 0.06) / 0.09));
    const height = Math.max(0, Math.min(1, (positions.getY(i) - 0.35) / 0.18));
    positions.setY(i, positions.getY(i) + 0.025 * side * height);
  }
  raised.computeVertexNormals();
  jacket.morphAttributes.position = [positions.clone()];
  jacket.morphAttributes.normal = [raised.attributes.normal.clone()];
  raised.dispose();
  return jacket;
}

function useGeometries() {
  const geos = useMemo(() => {
    const vFrom = (y) => -vWidth(y);
    const vTo = (y) => vWidth(y);
    return {
      jacket: jacketGeometry(),
      // Faldones: de la cintura (con 6 cm de solape, para que al moverse no se
      // abra hueco) hasta el bajo, abiertos por
      // delante y sin tapa abajo.
      skirt: new LatheGeometry(
        [
          [0.152, -0.2],
          [0.148, -0.1],
          [0.146, -0.02],
          [0.142, 0.1],
          [jacketRadius(WAIST) - 0.002, WAIST + 0.06],
        ].map(([r, y]) => new Vector2(r, y - WAIST)),
        64,
        0.45,
        Math.PI * 2 - 0.9,
      ),
      // Pantalón de talle alto: sube hasta donde acaba la camisa, sin hueco.
      waist: new CylinderGeometry(0.134, 0.142, WAIST + 0.05, 32, 1, true),
      // Cinturilla de raso en lo alto del pantalón.
      band: new CylinderGeometry(0.136, 0.136, 0.022, 32, 1, true),
      // Chaqueta abierta: la camisa se ve desde la cintura hasta el cuello.
      // Hasta el cuello de la camisa, para que no asome la chaqueta entre los dos.
      shirtV: chestBand(WAIST, 0.592, vFrom, vTo, 0.0035),
      // Solapas estrechas a lo largo del borde abierto (una malla, una llamada).
      // En la foto no se ven bolsillos ni botones: la camisa es lisa.
      satin: fuse([
        chestBand(WAIST, 0.56, (y) => vWidth(y), (y) => vWidth(y) + lapelWidth(y), 0.005),
        chestBand(WAIST, 0.56, (y) => -vWidth(y) - lapelWidth(y), (y) => -vWidth(y), 0.005),
      ]),
      bow: bowGeometry(),
      ...trouserGeometries(),
      afro: afroGeometry(),
      curls: curlsGeometry(),
      ringlets: ringletsGeometry(),
      ...headGeometries(),
    };
  }, []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  return geos;
}

/**
 * Media abertura (en radianes) de la chaqueta a cada altura: va abierta de
 * arriba abajo, algo más estrecha en la cintura y ancha junto al cuello.
 */
function vWidth(y) {
  // Media anchura de la camisa a la vista, en metros: 0,118 en la cintura y
  // 0,09 bajo el cuello (la chaqueta abierta cae casi recta). Se pasa a ángulo
  // sobre la superficie de la chaqueta.
  const t = Math.max(0, Math.min(1, (y - WAIST) / (0.565 - WAIST)));
  const half = 0.096 - t * 0.02;
  return Math.asin(Math.min(0.97, half / Math.max(jacketRadius(y), 0.01)));
}

/** Anchura de la solapa a cada altura: se ensancha en el pecho y se cierra arriba. */
function lapelWidth(y) {
  // Solapa de raso: estrecha abajo y ancha en el pecho (unos 8 cm), y se
  // cierra junto al cuello.
  const t = Math.max(0, Math.min(1, (y - WAIST) / (0.56 - WAIST)));
  return (0.022 + Math.sin(t * Math.PI * 0.92) ** 1.4 * 0.06) / Math.max(jacketRadius(y), 0.01);
}

/** Brazo: hombro, codo, puño blanco de la camisa y mano. */
function Arm({ side, mats, armRef, elbowRef, wristRef, thumbRef }) {
  return (
    <group ref={armRef} position={[side * SHOULDER, 0.545, -0.005]}>
      {/* La manga empieza dentro del hombro: así el hombro queda recto, sin bulto. */}
      <mesh position={[0, -0.17, 0]} material={mats.wool} castShadow>
        <capsuleGeometry args={[0.045, 0.24, 8, 20]} />
      </mesh>
      <group ref={elbowRef} position={[0, -0.31, 0]}>
        <mesh position={[0, -0.12, 0]} material={mats.wool} castShadow>
          <capsuleGeometry args={[0.039, 0.21, 8, 20]} />
        </mesh>
        <mesh position={[0, -0.255, 0]} material={mats.shirt} castShadow={!LITE}>
          <cylinderGeometry args={[0.037, 0.035, 0.035, 20]} />
        </mesh>
        {/* Mano con su muñeca (gira en useFrame): palma, cuatro dedos abiertos y
            el pulgar, que en la postura de la portada se mete en el bolsillo. */}
        <group ref={wristRef} position={[0, -0.28, 0]}>
          <mesh position={[0, -0.035, 0.004]} scale={[0.62, 1.0, 0.36]} material={mats.skin} castShadow={!LITE}>
            <sphereGeometry args={[0.044, 20, 16]} />
          </mesh>
          {[-0.021, -0.007, 0.007, 0.02].map((x, i) => (
            <mesh
              key={x}
              position={[x * side * 1.35, -0.095 + Math.abs(i - 1.5) * 0.005, 0.01]}
              // Las dos manos con los dedos largos y bien abiertos, como en la foto.
              rotation={[0.3, 0, (i - 1.5) * 0.3 * side]}
              material={mats.skin}
            >
              <capsuleGeometry args={[0.0066, 0.058 - Math.abs(i - 1.5) * 0.008, 4, 8]} />
            </mesh>
          ))}
          <mesh ref={thumbRef} position={[-side * 0.026, -0.038, 0.026]} rotation={[0.45, 0, side * 0.8]} material={mats.skin}>
            <capsuleGeometry args={[0.01, 0.03, 4, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Cabeza. Las piezas pequeñas de la cara se funden en una malla por material
 * (headGeometries): así la cabeza cuesta 7 llamadas de dibujo en vez de ~25.
 */
function Head({ mats, geos, hairPos, hairScale, thriller }) {
  return (
    <group>
      {/* La cara de 1979 se reutiliza en Thriller; solo cambia la boca. */}
      <mesh geometry={geos.headSkin} material={mats.skin} castShadow />
      <mesh geometry={geos.eyeWhites} material={mats.eyeWhite} />
      <mesh geometry={geos.irises} material={mats.iris} />
      {thriller ? (
        <>
          <mesh geometry={geos.brows82} material={mats.hair} />
          {/* Boca cerrada, sin los dientes ni la sonrisa de Off the Wall. */}
          <mesh geometry={geos.closedLips} material={mats.lips} />
          {/* Los rizos cortos de 1982 terminan en la nuca. */}
          {/* Base oscura y, encima, los rizos uno a uno. */}
          {/* Más volumen arriba y a los lados, como en la portada. */}
          <mesh geometry={geos.curls} position={[0, 0.034, 0.008]} scale={[1.02, 0.9, 1.02]} material={mats.hair} />
          <mesh geometry={geos.ringlets} position={[0, 0.034, 0.008]} scale={[1.02, 0.9, 1.02]} material={mats.hair} castShadow />
        </>
      ) : (
        <>
          <mesh geometry={geos.hairBits} material={mats.hair} />
          <mesh geometry={geos.lips} material={mats.lips} />
          <mesh geometry={geos.teeth} material={mats.teeth} />
          {/* Afro redondo que rodea la cabeza y enmarca la cara (el hueco va en la geometría). */}
          <mesh geometry={geos.afro} position={hairPos} scale={hairScale} material={mats.hair} castShadow />
        </>
      )}
    </group>
  );
}

/**
 * Pierna: muslo que cuelga de la cadera, rodilla, espinilla con el calcetín
 * blanco y tobillo con el mocasín. Al ponerse de puntillas el pie gira en el
 * tobillo (sube el talón y baja la punta) y el cuerpo sube lo que haga falta.
 */
function Leg({ side, mats, geos, legRef, kneeRef, footRef }) {
  return (
    <group ref={legRef} position={[side * 0.084, HIP_Y, 0]}>
      <mesh geometry={geos.thigh} material={mats.wool} castShadow />
      <group ref={kneeRef} position={[0, -LEG.thigh, 0]}>
        {/* Rodilla: un poco más fina que la pernera, tapa por dentro la rendija al doblarla. */}
        <mesh material={mats.wool}>
          <sphereGeometry args={[0.059, 18, 12]} />
        </mesh>
        <mesh geometry={geos.shin} material={mats.wool} castShadow />
        <mesh position={[0, -(LEG.shin - 0.025), 0]} material={mats.sock} castShadow={!LITE}>
          <cylinderGeometry args={[0.046, 0.044, 0.1, 20]} />
        </mesh>
        <group ref={footRef} position={[0, -LEG.shin, 0]} rotation-order="YXZ">
          {/* Mocasín: cápsula tumbada a lo largo del pie y aplastada. */}
          <mesh position={[0, -0.056, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.66]} material={mats.leather} castShadow={!LITE}>
            <capsuleGeometry args={[0.047, 0.17, 6, 18]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Postura tumbada de la portada de Thriller: recostado en el suelo sobre el
 * codo izquierdo, las piernas estiradas hacia su derecha (la izquierda de la
 * foto) con las rodillas algo dobladas, y las manos juntas en el cinturón.
 * Es una interpretación propia de la postura, no un calco de la foto.
 * `body*` mueven todo el cuerpo (el giro es alrededor de los pies).
 */
const RECLINE = {
  // Todo el cuerpo: posición (m) y giro (rad); el giro va alrededor de los pies.
  // Como en la portada: sentado con el culo apoyado del todo en el suelo, las
  // caderas de lado (las piernas hacia la izquierda de la foto: la de delante
  // estirada y apoyada en el suelo, la del lado de la pared doblada),
  // el tronco echado atrás, la mano izquierda apoyada en el suelo y el brazo
  // derecho recto con la mano en el muslo.
  bodyPos: [0.05, -0.8, 0],
  bodyRot: [0, -1.7, 0],
  torso: [-0.88, 1.25, -0.05],
  // Girada un poco hacia la cámara, para que la mire.
  head: [0.6, 0.36, 0.04],
  // La mano izquierda apoyada en el suelo; el brazo derecho recto, pegado al
  // tronco, con la mano apoyada en el muslo.
  armL: [0.3, 0, 0.22],
  elbowL: [-1.65, 0, 0],
  wristL: [0.4, 0, 0],
  armR: [-0.35, 0, -0.12],
  elbowR: [-0.15, 0, 0],
  wristR: [0.3, 0, 0],
  // La pierna del lado de la pared, doblada con la rodilla arriba y el pie
  // plano en el suelo.
  legR: [-2.25, 0, 0.12],
  kneeR: [1.55, 0, 0],
  footR: [0.7, 0, 0],
  // La de delante, estirada y apoyada en el suelo de la cadera al talón.
  legL: [-1.47, 0, -0.04],
  kneeL: [0.05, 0, 0],
  footL: [-0.15, 0, 0],
};


/**
 * Para que la cabeza mire a la cámara de la portada (se reutiliza en cada
 * fotograma, sin crear objetos).
 */
const LOOK = {
  cam: new Vector3(0, 0.62, 4.2),
  // Giro hacia su derecha, ladeo hacia su hombro izquierdo y barbilla baja (rad).
  // Cuánto del giro hacia la cámara se aplica (0..1).
  amount: 0.5,
  // De frente (sin perfil) y con la barbilla algo levantada para que se vea.
  turn: 0,
  tilt: -0.04,
  chin: -0.2,
  pos: new Vector3(),
  centerOffset: new Vector3(),
  euler: new Euler(),
  want: new Quaternion(),
  parent: new Quaternion(),
};

// Solo en desarrollo: la postura y la mirada se pueden ajustar desde la consola.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__recline = RECLINE;
  window.__look = LOOK;
}

/** Altura de la cadera sobre el suelo que da una pierna apoyada. */
function legSupport(pitch, knee, roll, toe) {
  return (LEG.thigh * Math.cos(pitch) + LEG.shin * Math.cos(pitch + knee)) * Math.cos(roll) + LEG.ankle + toeRise(toe);
}

/** Mezcla de dos posturas (`w` = 1 es la segunda). */
function blend(a, b, w) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = a[key] + (b[key] - a[key]) * w;
  return out;
}

/**
 * @param {{
 *   move: { name: string, at: number } | null,
 *   flashAt: number | null,
 *   groove: { bpm: number, feel: string } | null,
 *   playing: boolean,
 *   reduced: boolean,
 *   level: () => number,
 *   onStep: () => void,
 *   onHover: (on: boolean, name?: string) => void,
 * }} props
 */
export default function Michael({ move, flashAt, groove, playing, reduced, level, onStep, onHover, lang, album = 'otw', travel = null }) {
  const mats = useMaterials();
  const geos = useGeometries();
  // Ropa del disco puesto: se cambian los colores de los materiales compartidos.
  useEffect(() => applyLook(mats, album), [album, mats]);
  const thriller = album === 'thriller';
  // Pelo: el afro redondo de 1979 o los rizos cortos de 1982.
  const hairScale = thriller ? [0.86, 0.98, 0.95] : [0.96, 1.16, 1.04];
  const hairPos = thriller ? [0, 0.012, -0.016] : [0, 0.03, -0.012];
  const root = useRef(null);
  // Cuánto está tumbado (0 de pie, 1 en la postura de Thriller).
  const lying = useRef(album === 'thriller' ? 1 : 0);
  const body = useRef(null);
  const torso = useRef(null);
  const jacket = useRef(null);
  const head = useRef(null);
  const armL = useRef(null);
  const armR = useRef(null);
  const elbowL = useRef(null);
  const elbowR = useRef(null);
  const wristL = useRef(null);
  const wristR = useRef(null);
  const thumbL = useRef(null);
  const thumbR = useRef(null);
  const legL = useRef(null);
  const legR = useRef(null);
  const kneeL = useRef(null);
  const kneeR = useRef(null);
  const footL = useRef(null);
  const footR = useRef(null);
  const beat = useRef(0);
  // Faldones de la chaqueta: estado del muelle (giro, vuelo hacia delante y
  // apertura) y el movimiento del cuerpo en el fotograma anterior.
  const skirt = useRef(null);
  const cloth = useRef({ twist: 0, vTwist: 0, tilt: 0, vTilt: 0, flare: 0, lastTurn: 0, lastBack: 0 });
  // Cuánto baila de fondo (sube y baja suave al empezar y parar la música) y
  // el último ritmo, para seguir bailando mientras se apaga.
  const grooveAmt = useRef(0);
  const lastGroove = useRef(/** @type {{ bpm: number, feel: string } | null} */ (null));

  useFrame(({ clock }, rawDt) => {
    const t = clock.elapsedTime;
    glowWhites(mats, flashLevel(flashAt), thriller);
    let p = movePose(move, reduced);
    // Viaje de un disco a otro: moonwalk por el plató (manda sobre todo lo demás).
    const tr = travelState(travel, performance.now() / 1000);
    if (root.current) {
      root.current.position.set(tr ? tr.x : MICHAEL.x, 0, tr ? tr.z : MICHAEL.z);
      root.current.rotation.y = tr ? tr.yaw : 0;
      root.current.visible = tr ? tr.visible : true;
    }
    if (tr?.walk) p = moonwalkLoop(reduced ? 0.2 : tr.t * 1.6);
    // Baile de fondo con la música: sigue el tempo de la canción. Un paso de
    // baile (botón o clic) tiene prioridad; al acabar, se vuelve al ritmo.
    if (groove) lastGroove.current = groove;
    // En Thriller se queda recostado con la música (solo asiente al ritmo): se
    // levanta para los bailes de los botones.
    const wantGroove = groove && !reduced && p.amount === 0 && !tr && !thriller ? 1 : 0;
    grooveAmt.current += (wantGroove - grooveAmt.current) * Math.min(1, Math.min(rawDt, 0.1) * 2.5);
    if (p.amount === 0 && grooveAmt.current > 0.01 && lastGroove.current) {
      p = groovePose(clock.elapsedTime, lastGroove.current, beat.current, grooveAmt.current);
    }
    const idle = reduced ? 0 : 1;
    // Pulso de la música: energía de los graves (bombo y bajo), suavizada.
    const target = playing && !reduced ? level() : 0;
    beat.current += (target - beat.current) * 0.35;
    const pulse = beat.current;

    // Base: la postura de la portada en reposo, la de baile mientras baila.
    const R = blend(DANCE, COVER, 1 - p.amount);

    // Balanceo lento del peso de una pierna a otra (más marcado en la portada).
    const sway = Math.sin(t * 0.7) * idle;
    torso.current.rotation.z = R.shoulders + sway * (0.012 + 0.01 * R.swayHip) + p.tilt;
    torso.current.rotation.x = R.lean + p.lean;
    torso.current.rotation.y = R.twist + sway * 0.02 * R.swayHip;
    torso.current.scale.y = 1 + Math.sin(t * 1.6) * 0.004 * idle;
    if (!jacket.current.morphTargetInfluences) jacket.current.updateMorphTargets();
    jacket.current.morphTargetInfluences[0] = 1 - p.amount;
    // Un poco más ancho de tronco y brazos (era delgado, pero no tanto); la
    // cabeza se compensa para no ensancharla.
    torso.current.scale.x = WIDEN;
    head.current.scale.x = 0.9 / WIDEN;
    head.current.rotation.y = R.headTurn + p.headY + Math.sin(t * 0.5) * 0.05 * idle;
    head.current.rotation.z = R.headTilt;
    head.current.rotation.x = -pulse * 0.08 + p.headX;

    armR.current.rotation.z = R.armRZ + p.armRZ - pulse * 0.08;
    armR.current.position.y = 0.545 + 0.02 * (1 - p.amount);
    armR.current.rotation.x = R.armRX + p.armRX;
    elbowR.current.rotation.x = R.elbowR + p.elbowR;
    elbowR.current.rotation.z = R.elbowRZ;
    armL.current.rotation.z = R.armLZ + p.armLZ + pulse * 0.08;
    armL.current.rotation.x = R.armLX + p.armLX;
    elbowL.current.rotation.x = R.elbowL + p.elbowL;
    elbowL.current.rotation.z = R.elbowLZ;
    wristR.current.rotation.set(R.wristRX, R.wristRY, R.wristRZ);
    wristL.current.rotation.set(R.wristLX, R.wristLY, R.wristLZ);
    // El pulgar entra en el bolsillo: se encoge hasta desaparecer en el pantalón.
    // En la postura de la portada, el de las dos manos (las dos van al
    // bolsillo); al bailar vuelven a verse los cinco dedos de cada una.
    const thumb = Math.max(0.001, 1 - R.thumbIn);
    thumbR.current.scale.setScalar(thumb);
    thumbL.current.scale.setScalar(thumb);

    // Piernas: muslo, rodilla y pie. El pie apoyado se queda plano en el suelo
    // (compensa el giro del muslo y de la rodilla) salvo lo que suba el talón.
    const legs = [
      // Rodillas sueltas: el muslo adelanta la mitad de lo que se dobla la rodilla.
      [legR, kneeR, footR, p.legR - R.knee / 2, p.kneeR + R.knee, -R.legOutR - p.sideR, p.toeR, p.freeR, -1],
      [legL, kneeL, footL, p.legL - R.knee / 2, p.kneeL + R.knee, R.legOutL + p.sideL, p.toeL + R.heelL, p.freeL, 1],
    ];
    const hip = R.hip - sway * 0.008 * R.swayHip;
    // Cada pierna da una altura; con la cadera inclinada, el lado alto de la
    // cadera queda más lejos del suelo. `roll` es el ángulo de la pierna en el
    // mundo, así que dentro del cuerpo inclinado se le resta la cadera.
    const heights = legs.map(([, , , pitch, bend, roll, toe, , side]) =>
      legSupport(pitch, bend, roll, toe) - side * 0.084 * Math.sin(hip),
    );
    let support = Infinity;
    legs.forEach(([, , , , , , , free], i) => {
      if (free < 0.5) support = Math.min(support, heights[i]);
    });
    if (!Number.isFinite(support)) support = 0;
    legs.forEach(([leg, knee, foot, pitch, bend, roll, toe, free, side], i) => {
      const plant = 1 - free;
      // En la postura de la portada la pierna que sobra suelta la rodilla
      // (contrapposto). Al bailar, el cuerpo apoya en la más alta, como antes.
      const relax = plant > 0.5 && p.amount < 1 ? kneeFor(Math.max(0, heights[i] - support)) * (1 - p.amount) : 0;
      const thigh = pitch - relax / 2;
      // Rodilla hacia dentro (solo la izquierda en la postura de la portada):
      // el muslo entra y la espinilla sale, así el pie sigue en su sitio.
      const kin = side > 0 ? R.kneeInL : R.kneeInR;
      const kb = side > 0 ? R.kneeBendL : 0;
      leg.current.rotation.set(thigh - kb / 2, 0, roll - hip - side * kin);
      knee.current.rotation.set(bend + relax + kb, 0, side * kin * 1.6);
      // La punta del pie derecho, metida hacia dentro.
      const toeIn = side < 0 ? R.footInR : 0;
      foot.current.rotation.set(
        toe - plant * (thigh + bend + relax + kb / 2),
        (side * R.footOut + toeIn) * plant,
        -(roll + side * kin * 0.6) * plant,
      );
    });
    if (p.amount > 0) {
      // Bailando: el cuerpo descansa sobre la pierna apoyada más alta.
      legs.forEach(([, , , , , , , free], i) => {
        if (free < 0.5) support = Math.max(support, heights[i] * p.amount + support * (1 - p.amount));
      });
    }
    const ground = support > 0 ? support - HIP_Y : 0;
    body.current.position.y = ground + p.lift + pulse * 0.035 + Math.sin(t * 1.6) * 0.002 * idle;
    // La cadera sale hacia el lado de la pierna que carga el peso.
    body.current.position.x = -R.hipOut;
    body.current.position.z = p.back;
    body.current.rotation.y = p.turn;

    // Física sencilla de los faldones: un muelle amortiguado por eje. Al girar
    // se quedan atrás y se abren; al ir hacia atrás (moonwalk) vuelan hacia
    // delante; con el baile se mecen con el pulso.
    const dt = Math.min(Math.max(rawDt, 1e-3), 0.05);
    const cl = cloth.current;
    const spin = (p.turn - cl.lastTurn) / dt;
    const slide = (p.back - cl.lastBack) / dt;
    cl.lastTurn = p.turn;
    cl.lastBack = p.back;
    const spring = (x, v, target, k, damp) => {
      const a = (target - x) * k - v * damp;
      return [x + (v + a * dt) * dt, v + a * dt];
    };
    [cl.twist, cl.vTwist] = spring(cl.twist, cl.vTwist, Math.max(-0.18, Math.min(0.18, -spin * 0.02)), 40, 9);
    [cl.tilt, cl.vTilt] = spring(cl.tilt, cl.vTilt, Math.max(-0.15, Math.min(0.15, slide * 0.4)) + pulse * 0.03, 50, 9);
    // Vuelo moderado: los faldones nunca se separan del cuerpo.
    cl.flare += (Math.min(0.1, Math.abs(spin) * 0.012) - cl.flare) * Math.min(1, dt * 6);
    if (skirt.current) {
      skirt.current.rotation.set(-cl.tilt - p.lean, cl.twist, 0);
      skirt.current.scale.set(1 + cl.flare, 1, FLAT * (1 + cl.flare));
    }
    body.current.rotation.z = hip;

    // Thriller: en reposo se queda tumbado como en la portada; para bailar o
    // irse se levanta (y se vuelve a tumbar al acabar). Mientras dura el viaje
    // va de pie; al llegar se tumba despacio.
    const wantLie = thriller && !tr?.walk && !(tr && !tr.done) && p.amount < 0.02 && grooveAmt.current < 0.05 ? 1 : 0;
    lying.current += (wantLie - lying.current) * (reduced ? 1 : Math.min(1, dt * (wantLie ? 1.6 : 4)));
    const w = lying.current * lying.current * (3 - 2 * lying.current);
    if (w > 0.001) {
      const L = (o, key, v) => {
        o[key] += (v - o[key]) * w;
      };
      const R2 = RECLINE;
      const set3 = (obj, v) => ['x', 'y', 'z'].forEach((k, i) => L(obj, k, v[i]));
      set3(body.current.position, R2.bodyPos);
      set3(body.current.rotation, R2.bodyRot);
      set3(torso.current.rotation, R2.torso);
      set3(head.current.rotation, R2.head);
      set3(armL.current.rotation, R2.armL);
      set3(elbowL.current.rotation, R2.elbowL);
      set3(wristL.current.rotation, R2.wristL);
      set3(armR.current.rotation, R2.armR);
      set3(elbowR.current.rotation, R2.elbowR);
      set3(wristR.current.rotation, R2.wristR);
      set3(legR.current.rotation, R2.legR);
      set3(kneeR.current.rotation, R2.kneeR);
      set3(footR.current.rotation, R2.footR);
      set3(legL.current.rotation, R2.legL);
      set3(kneeL.current.rotation, R2.kneeL);
      set3(footL.current.rotation, R2.footL);
      // La cabeza, recta (sin ladearse con el tronco) y mirando a la cámara de
      // la portada, como en la foto: se calcula su giro en el mundo y se pasa
      // al del cuello.
      const hq = head.current;
      hq.updateWorldMatrix(true, false);
      LOOK.pos.copy(hq.localToWorld(LOOK.centerOffset.set(0, thriller ? 0.143 : 0, 0)));
      const dx = LOOK.cam.x - LOOK.pos.x;
      const dz = LOOK.cam.z - LOOK.pos.z;
      const dy = LOOK.cam.y - LOOK.pos.y;
      // Como en la portada: casi recta, algo girada hacia su derecha (la
      // izquierda de la foto), un poco ladeada hacia su hombro izquierdo y con
      // la barbilla algo baja, mirando a cámara.
      LOOK.euler.set(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.5 + LOOK.chin, Math.atan2(dx, dz) + LOOK.turn, LOOK.tilt, 'YXZ');
      LOOK.want.setFromEuler(LOOK.euler);
      hq.parent.getWorldQuaternion(LOOK.parent);
      LOOK.want.premultiply(LOOK.parent.invert());
      // Solo una parte del giro: la cabeza mira hacia la cámara pero sigue
      // encajada en el cuello (girarla del todo la separaba de los hombros).
      hq.quaternion.slerp(LOOK.want, w * LOOK.amount);
      // Las manos juntas en el cinturón: los pulgares a la vista.
      thumbR.current.scale.setScalar(1);
      thumbL.current.scale.setScalar(1);
    }
  });

  return (
    <group
      ref={root}
      position={[MICHAEL.x, 0, MICHAEL.z]}
      onClick={(e) => {
        e.stopPropagation();
        onStep();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true, lang === 'en' ? 'Michael · click and he dances' : 'Michael · pulsa y baila');
      }}
      onPointerOut={() => onHover(false)}
    >
      <group ref={body}>
        {/* Cadera del pantalón: estrecha, une las dos piernas bajo la chaqueta abierta. */}
        <mesh position={[0, HIP_Y - 0.015, 0]} scale={[1.45, 0.95, 0.85]} material={mats.wool}>
          <sphereGeometry args={[0.1, 24, 16]} />
        </mesh>
        <Leg side={-1} mats={mats} geos={geos} legRef={legR} kneeRef={kneeR} footRef={footR} />
        <Leg side={1} mats={mats} geos={geos} legRef={legL} kneeRef={kneeL} footRef={footL} />
        <group ref={torso} position={[0, HIP_Y, 0]}>
          <mesh ref={jacket} geometry={geos.jacket} scale={[1, 1, FLAT]} material={mats.wool} castShadow receiveShadow />
          {/* Faldones con su muelle (se mueven en useFrame), colgados de la cintura. */}
          <group position={[0, WAIST, 0]}>
            <mesh ref={skirt} geometry={geos.skirt} scale={[1, 1, FLAT]} material={mats.wool} castShadow />
          </group>
          {/* Pantalón de talle alto hasta la camisa y su cinturilla. */}
          <mesh geometry={geos.waist} position={[0, (WAIST - 0.05) / 2, 0]} scale={[1, 1, 0.72]} material={mats.wool} />
          <mesh geometry={geos.band} position={[0, WAIST - 0.006, 0]} scale={[1, 1, 0.72]} material={mats.bow} />
          <mesh geometry={geos.shirtV} material={mats.shirt} />
          <mesh geometry={geos.satin} material={mats.satin} castShadow={!LITE} />
          {/* Pajarita de mariposa y su nudo, algo inclinada hacia delante. */}
          {/* Pegada a la camisa, justo debajo del cuello (a 1,3 cm de la tela: antes
              quedaba a 4 cm y de lado se veía flotando). */}
          <group visible={!thriller} position={[0, 0.568, jacketRadius(0.568) * FLAT + 0.013]} rotation={[-0.12, 0, 0]}>
            {/* Sin sombra: el mapa de sombras la pintaba como una raya dentada en la camisa. */}
            <mesh geometry={geos.bow} material={mats.bow} />
            <mesh position={[0, 0, 0.007]} scale={[1, 1.35, 0.75]} material={mats.bow}>
              <sphereGeometry args={[0.012, 12, 8]} />
            </mesh>
          </group>
          {/* Thriller: pañuelo de leopardo asomando del bolsillo del pecho (lado
              izquierdo de Michael) y hebilla plateada en el cinturón negro. */}
          {thriller ? (
            <>
              <mesh position={[0.112, 0.43, jacketRadius(0.43) * FLAT * 0.93]} rotation={[-0.1, 0.55, 0.2]} material={mats.pocket}>
                <boxGeometry args={[0.05, 0.03, 0.012]} />
              </mesh>
              <mesh position={[0, WAIST - 0.006, 0.142 * 0.72 + 0.004]} material={mats.buckle}>
                <boxGeometry args={[0.038, 0.026, 0.008]} />
              </mesh>
              {/* Tapetas de los dos bolsillos de abajo de la chaqueta. */}
              {[-1, 1].map((sd) => (
                <mesh key={sd} position={[sd * 0.105, WAIST - 0.09, jacketRadius(WAIST - 0.09) * FLAT * 0.86]} rotation={[0, sd * 0.62, 0]} material={mats.satin}>
                  <boxGeometry args={[0.085, 0.022, 0.008]} />
                </mesh>
              ))}
              {/* El cuello de la camisa negra, abierto por encima de las solapas. */}
              {[-1, 1].map((sd) => (
                <mesh key={`c${sd}`} position={[sd * 0.052, 0.565, jacketRadius(0.565) * FLAT + 0.006]} rotation={[0.25, sd * 0.35, sd * -0.75]} material={mats.shirt}>
                  <boxGeometry args={[0.06, 0.035, 0.006]} />
                </mesh>
              ))}
            </>
          ) : null}
          {/* Cuello de la camisa y cuello. */}
          <mesh position={[0, 0.612, 0.005]} material={mats.shirt}>
            <cylinderGeometry args={[0.054, 0.06, 0.075, 24, 1, true]} />
          </mesh>
          <mesh position={[0, thriller ? 0.63 : 0.645, 0]} material={mats.skin} castShadow={!LITE}>
            {thriller ? <capsuleGeometry args={[0.03, 0.01, 8, 20]} /> : <cylinderGeometry args={[0.046, 0.052, 0.11, 20]} />}
          </mesh>
          <Arm side={1} mats={mats} armRef={armL} elbowRef={elbowL} wristRef={wristL} thumbRef={thumbL} />
          <Arm side={-1} mats={mats} armRef={armR} elbowRef={elbowR} wristRef={wristR} thumbRef={thumbR} />
          {/* En 1982 la cabeza va algo más alta, para que se vea el cuello por
              encima de la camisa (si no, se hundía en el cuello abierto). */}
          <group ref={head} position={thriller ? [0, 0.638, -0.01] : [0, 0.74, 0.008]} scale={thriller ? 0.97 : 0.9}>
            <group position={thriller ? [0, 0.143, 0] : [0, 0, 0]}>
              <Head mats={mats} geos={geos} hairPos={hairPos} hairScale={hairScale} thriller={thriller} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
