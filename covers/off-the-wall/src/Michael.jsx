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
  CylinderGeometry,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
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
import { LEG, groovePose, kneeFor, movePose, toeRise } from './dances.js';
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
    // La sonrisa amplia: boca abierta en media luna con los dientes de arriba.
    lips: fuse([
      place(new CircleGeometry(0.035, 28, Math.PI, Math.PI), [0, -0.047, 0.094], [-0.3, 0, 0], [1, 0.52, 1]),
      place(new CapsuleGeometry(0.005, 0.056, 4, 8), [0, -0.044, 0.094], [0, 0, Math.PI / 2], [0.55, 1.2, 0.6]),
    ]),
    teeth: place(new CircleGeometry(0.033, 28, Math.PI, Math.PI), [0, -0.0475, 0.0955], [-0.3, 0, 0], [0.92, 0.36, 1]),
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
function Head({ mats, geos }) {
  return (
    <group>
      <mesh geometry={geos.headSkin} material={mats.skin} castShadow />
      <mesh geometry={geos.eyeWhites} material={mats.eyeWhite} />
      <mesh geometry={geos.irises} material={mats.iris} />
      <mesh geometry={geos.hairBits} material={mats.hair} />
      <mesh geometry={geos.lips} material={mats.lips} />
      <mesh geometry={geos.teeth} material={mats.teeth} />
      {/* Afro redondo que rodea la cabeza y enmarca la cara (el hueco va en la geometría). */}
      <mesh geometry={geos.afro} position={[0, 0.03, -0.012]} scale={[0.96, 1.16, 1.04]} material={mats.hair} castShadow />
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
export default function Michael({ move, flashAt, groove, playing, reduced, level, onStep, onHover, lang }) {
  const mats = useMaterials();
  const geos = useGeometries();
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
    glowWhites(mats, flashLevel(flashAt));
    let p = movePose(move, reduced);
    // Baile de fondo con la música: sigue el tempo de la canción. Un paso de
    // baile (botón o clic) tiene prioridad; al acabar, se vuelve al ritmo.
    if (groove) lastGroove.current = groove;
    const wantGroove = groove && !reduced && p.amount === 0 ? 1 : 0;
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
  });

  return (
    <group
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
          <group position={[0, 0.568, jacketRadius(0.568) * FLAT + 0.013]} rotation={[-0.12, 0, 0]}>
            {/* Sin sombra: el mapa de sombras la pintaba como una raya dentada en la camisa. */}
            <mesh geometry={geos.bow} material={mats.bow} />
            <mesh position={[0, 0, 0.007]} scale={[1, 1.35, 0.75]} material={mats.bow}>
              <sphereGeometry args={[0.012, 12, 8]} />
            </mesh>
          </group>
          {/* Cuello de la camisa y cuello. */}
          <mesh position={[0, 0.612, 0.005]} material={mats.shirt}>
            <cylinderGeometry args={[0.054, 0.06, 0.075, 24, 1, true]} />
          </mesh>
          <mesh position={[0, 0.645, 0]} material={mats.skin} castShadow={!LITE}>
            <cylinderGeometry args={[0.046, 0.052, 0.11, 20]} />
          </mesh>
          <Arm side={1} mats={mats} armRef={armL} elbowRef={elbowL} wristRef={wristL} thumbRef={thumbL} />
          <Arm side={-1} mats={mats} armRef={armR} elbowRef={elbowR} wristRef={wristR} thumbRef={thumbR} />
          <group ref={head} position={[0, 0.74, 0.008]} scale={0.9}>
            <Head mats={mats} geos={geos} />
          </group>
        </group>
      </group>
    </group>
  );
}
