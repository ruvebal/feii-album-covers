// Las dos chaquetas rojas de los vídeos de Thriller, en maniquíes de
// costura junto a la pared izquierda, cada una con su placa:
//  - «Beat It» (vídeo de marzo de 1983): cuero rojo lleno de cremalleras.
//  - «Thriller» (vídeo de diciembre de 1983): cuero rojo con las uves negras
//    en el pecho y los hombros.
// Son de 1983, de los vídeos que vinieron justo después del disco: la placa
// lo dice. Modeladas con código (interpretación propia, sin copiar fotos):
// tronco de torno, mangas, cuello y el dibujo pintado en el color de los
// vértices. Al pulsarlas se abre su ficha con una foto real enlazada.
// Coste: 3 llamadas (chaquetas, maniquíes y placas) y una textura.

import { useEffect, useMemo } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';

/** Junto a la pared izquierda, entre el burro de vestuario y la salida. */
const JACKETS = [
  { id: 'beatit', x: -3.72, z: 7.05 },
  { id: 'thrillerJacket', x: -3.72, z: 7.95 },
  // La de «Billie Jean» en Motown 25 (marzo de 1983), con su fedora.
  { id: 'billiejean', x: -3.72, z: 6.15 },
];

const RED = new Color('#a3141a');
const RED_DARK = new Color('#6e0d12');
const BLACK = new Color('#0e0b0c');
const ZIP = new Color('#c9ccd1');
const SILVER = new Color('#b9bcc4');
const SEQUIN = new Color('#8a8d96');
/** Cómo se pinta cada chaqueta, en el orden de JACKETS. */
const PAINTS = [(...a) => beatIt(...a), (...a) => thriller(...a), (...a) => billieJean(...a)];

function place(geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale)));
  return geo;
}

function flat(g) {
  if (!g.index) return g;
  const n = g.toNonIndexed();
  g.dispose();
  return n;
}

/** Pinta cada vértice con `fn(x, y, z)` (coordenadas de la chaqueta). */
function paint(geo, fn) {
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const col = fn(p.getX(i), p.getY(i), p.getZ(i));
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(c, 3));
  return geo;
}

/** Chaqueta de cuero corta: tronco, mangas caídas y cuello levantado. */
function jacketParts() {
  const body = new LatheGeometry(
    [
      [0.0, 0.0],
      [0.17, 0.0],
      [0.165, 0.12],
      [0.17, 0.3],
      [0.2, 0.42],
      [0.19, 0.47],
      [0.08, 0.5],
      [0.0, 0.5],
    ].map(([r, y]) => new Vector2(r, y)),
    40,
  );
  body.scale(1, 1, 0.62);
  return [
    body,
    place(new CapsuleGeometry(0.05, 0.38, 6, 14), [0.215, 0.24, 0], [0, 0, 0.1]),
    place(new CapsuleGeometry(0.05, 0.38, 6, 14), [-0.215, 0.24, 0], [0, 0, -0.1]),
    // Cuello levantado.
    place(new CylinderGeometry(0.07, 0.085, 0.07, 20, 1, true), [0, 0.53, 0]),
  ].map(flat);
}

/** «Beat It»: rojo con cremalleras plateadas en el pecho, las mangas y los bolsillos. */
function beatIt(x, y, z) {
  const front = z > 0.06;
  // Cremallera central y varias diagonales en el pecho.
  if (front && Math.abs(x) < 0.008) return ZIP;
  if (front && y > 0.25 && y < 0.42 && Math.abs(y - 0.3 - Math.abs(x) * 0.6) < 0.006) return ZIP;
  if (front && y > 0.06 && y < 0.2 && Math.abs(Math.abs(x) - 0.1) < 0.006) return ZIP;
  // Cremalleras a lo largo de las mangas.
  if (Math.abs(x) > 0.18 && Math.abs(z) < 0.012 && y > 0.05) return ZIP;
  if (y < 0.03 || y > 0.5) return RED_DARK;
  return RED;
}

/** «Thriller»: rojo con dos uves negras anchas desde los hombros y franjas en las mangas. */
function thriller(x, y, z) {
  const front = z > 0.03;
  const v = y - 0.12 - Math.abs(x) * 1.25;
  if (front && Math.abs(x) < 0.17 && ((v > 0.16 && v < 0.2) || (v > 0.24 && v < 0.28))) return BLACK;
  if (Math.abs(x) > 0.18 && y > 0.36 && y < 0.44) return BLACK;
  if (Math.abs(x) > 0.18 && y > 0.06 && y < 0.1) return BLACK;
  if (front && Math.abs(x) < 0.006) return ZIP;
  if (y < 0.03 || y > 0.5) return RED_DARK;
  return RED;
}

/**
 * «Billie Jean» en Motown 25: chaqueta negra de lentejuelas (puntos que
 * brillan) sobre la camisa plateada, que asoma en uve por delante.
 */
function billieJean(x, y, z) {
  const front = z > 0.05;
  if (front && Math.abs(x) < 0.03 + (y - 0.1) * 0.12 && y > 0.12 && y < 0.5) return SILVER;
  const sparkle = Math.sin(x * 431 + y * 197) * Math.cos(z * 377 - y * 251);
  return sparkle > 0.86 ? SEQUIN : BLACK;
}

/** Placas de las chaquetas: un lienzo con un rectángulo de texto por chaqueta. */
function paintPlaques(lang) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const c = canvas.getContext('2d');
  const texts =
    lang === 'en'
      ? [
          ['“BEAT IT”', 'Red leather jacket', 'Music video · March 1983'],
          ['“THRILLER”', 'Red leather jacket', 'Music video · December 1983'],
          ['“BILLIE JEAN”', 'Sequined jacket and fedora', 'Motown 25 · March 25, 1983'],
        ]
      : [
          ['«BEAT IT»', 'Chaqueta de cuero rojo', 'Vídeo · marzo de 1983'],
          ['«THRILLER»', 'Chaqueta de cuero rojo', 'Vídeo · diciembre de 1983'],
          ['«BILLIE JEAN»', 'Lentejuelas y fedora', 'Motown 25 · 25 de marzo de 1983'],
        ];
  texts.forEach((lines, i) => {
    const y0 = i * 256;
    c.fillStyle = '#1a1416';
    c.fillRect(0, y0, 1024, 256);
    c.strokeStyle = '#c9a24a';
    c.lineWidth = 8;
    c.strokeRect(14, y0 + 14, 996, 228);
    c.fillStyle = '#e9c873';
    c.textAlign = 'center';
    c.font = '600 78px Oswald, sans-serif';
    c.fillText(lines[0], 512, y0 + 100);
    c.font = '46px Oswald, sans-serif';
    c.fillText(lines[1], 512, y0 + 160);
    c.fillText(lines[2], 512, y0 + 214);
  });
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Plano de la placa `i` (mitad de arriba o de abajo del lienzo). */
function plaque(i) {
  const g = new PlaneGeometry(0.34, 0.085);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k += 1) uv.setY(k, (uv.getY(k) + (2 - i)) / 3);
  return g;
}

/**
 * @param {{ lang: string, onHover: (on: boolean, name?: string) => void, onInspect: (text: string, id: string) => void }} props
 */
export default function Jackets({ lang, onHover, onInspect }) {
  const res = useMemo(() => {
    // Las chaquetas (y los maniquíes) ya colocados en el plató, girados hacia dentro.
    const jackets = [];
    const forms = [];
    const plaques = [];
    JACKETS.forEach(({ x, z }, i) => {
      const at = new Matrix4().compose(new Vector3(x, 0, z), new Quaternion().setFromEuler(new Euler(0, Math.PI / 2 - 0.15, 0)), new Vector3(1, 1, 1));
      const parts = jacketParts().map((g) => paint(g, PAINTS[i]));
      const j = mergeGeometries(parts);
      parts.forEach((g) => g.dispose());
      j.translate(0, 1.05, 0);
      j.applyMatrix4(at);
      jackets.push(j);
      // Maniquí de costura: cuello, poste y pie de tres patas.
      const f = [
        place(new SphereGeometry(0.06, 14, 10), [0, 1.62, 0], [0, 0, 0], [1, 0.6, 1]),
        place(new CylinderGeometry(0.012, 0.012, 1.05, 8), [0, 0.53, 0]),
        ...[0, 2.1, 4.2].map((a) => place(new BoxGeometry(0.3, 0.02, 0.03), [Math.cos(a) * 0.13, 0.03, Math.sin(a) * 0.13], [0, -a, 0.1])),
      ].map(flat);
      // El fedora negro encima del maniquí de «Billie Jean».
      if (JACKETS[i].id === 'billiejean') {
        f.push(
          flat(place(new CylinderGeometry(0.075, 0.085, 0.1, 20), [0, 1.72, 0])),
          flat(place(new CylinderGeometry(0.15, 0.15, 0.012, 24), [0, 1.67, 0])),
        );
      }
      const form = mergeGeometries(f);
      f.forEach((g) => g.dispose());
      form.applyMatrix4(at);
      forms.push(form);
      // Placa en un atril bajo, delante del maniquí.
      const pl = place(plaque(i), [0.36, 0.62, 0], [-0.6, Math.PI / 2, 0]);
      pl.applyMatrix4(new Matrix4().makeTranslation(x, 0, z));
      plaques.push(flat(pl));
      const stand = flat(place(new CylinderGeometry(0.012, 0.012, 0.6, 8), [x + 0.34, 0.3, z]));
      forms.push(stand);
    });
    const map = paintPlaques(lang);
    const geo = { jackets: mergeGeometries(jackets), forms: mergeGeometries(forms), plaques: mergeGeometries(plaques) };
    [...jackets, ...forms, ...plaques].forEach((g) => g.dispose());
    return {
      geo,
      map,
      mats: {
        leather: new MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 }),
        form: new MeshStandardMaterial({ color: '#2a2224', roughness: 0.4, metalness: 0.6 }),
        plaque: new MeshStandardMaterial({ map, roughness: 0.5 }),
      },
    };
  }, [lang]);
  // Las placas se repintan cuando carga la letra Oswald.
  useEffect(() => {
    let alive = true;
    document.fonts?.load('600 40px Oswald').then(() => {
      if (!alive) return;
      const fresh = paintPlaques(lang);
      res.map.image = fresh.image;
      res.map.needsUpdate = true;
      fresh.dispose();
    }, () => {});
    return () => {
      alive = false;
    };
  }, [res, lang]);
  useEffect(
    () => () => {
      Object.values(res.geo).forEach((g) => g.dispose());
      res.map.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
    },
    [res],
  );
  const names =
    lang === 'en'
      ? ['“Beat It” jacket', '“Thriller” jacket', '“Billie Jean” at Motown 25']
      : ['Chaqueta de «Beat It»', 'Chaqueta de «Thriller»', '«Billie Jean» en Motown 25'];
  return (
    <group>
      <mesh geometry={res.geo.jackets} material={res.mats.leather} castShadow />
      <mesh geometry={res.geo.forms} material={res.mats.form} />
      <mesh geometry={res.geo.plaques} material={res.mats.plaque} />
      {/* Cajas invisibles para pulsar cada chaqueta (abren su ficha). */}
      {JACKETS.map(({ id, x, z }, i) => (
        <mesh
          key={id}
          position={[x + 0.1, 0.95, z]}
          visible={false}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return;
            onInspect(names[i], id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(true, `${names[i]} · ${lang === 'en' ? 'click for its story' : 'pulsa para ver su historia'}`);
          }}
          onPointerOut={() => onHover(false)}
        >
          <boxGeometry args={[0.7, 1.9, 0.6]} />
        </mesh>
      ))}
    </group>
  );
}
