#!/usr/bin/env node
// covers/queen-bohemian-rhapsody/tools/make-sleeve.mjs — pinta la portada PROPIA de la funda,
// covers/queen-bohemian-rhapsody/public/sleeve.png (1024², 8-bit RGB sRGB).
//
//   node covers/queen-bohemian-rhapsody/tools/make-sleeve.mjs
//
// Derechos (D8): arte original hecho por este script para el repo. Comparte la ATMÓSFERA de la
// película (atardecer en un estadio, cantante a contraluz) pero no copia la portada oficial:
// sin foto, sin texto, sin escudo, pose propia (maniquí de frente con el puño en alto y el micro
// a la altura del pecho), composición propia.
//
// Sin dependencias: cada píxel se calcula con campos de distancia (SDF) y se escribe un PNG a mano
// (zlib de Node + CRC32). Semilla fija → el mismo PNG byte a byte en cada ejecución.
//   1. Cielo: degradado violeta → magenta → naranja → oro, con bandas de nubes (value noise).
//   2. Sol a la izquierda, bajo: halo + rayos (modulación angular) + bloom.
//   3. Estadio: cubierta curva en silueta con hileras de luces; césped oscuro.
//   4. Maniquí: cápsulas y elipses (sin rasgos), contorno anaranjado por el contraluz.
//   5. Grano fino (para que el encoder ETC1S/UASTC de task3 trabaje con algo parecido a una foto).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const N = 1024;
const OUT = new URL('../public/sleeve.png', import.meta.url);

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const mix3 = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// PRNG con semilla (mulberry32) y value noise 2D con tabla de gradientes fija.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1975);
const TABLE = Float32Array.from({ length: 256 * 256 }, rand);
const lattice = (x, y) => TABLE[((y & 255) << 8) | (x & 255)];
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = x - xi;
  const v = y - yi;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  return mix(mix(lattice(xi, yi), lattice(xi + 1, yi), su), mix(lattice(xi, yi + 1), lattice(xi + 1, yi + 1), su), sv);
}
function fbm(x, y, oct = 5) {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i += 1) {
    s += a * vnoise(x, y);
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s;
}

// SDF: cápsula (segmento con radio que varía de r1 a r2) y elipse aproximada.
function capsule(px, py, ax, ay, bx, by, r1, r2 = r1) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - mix(r1, r2, h);
}
function ellipse(px, py, cx, cy, rx, ry) {
  const k = Math.hypot((px - cx) / rx, (py - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
}
const smin = (a, b, k) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k);
  return mix(b, a, h) - k * h * (1 - h);
};

// ---------- paleta ----------
const SKY = [
  [0.0, hex('#3a1868')],
  [0.28, hex('#8e2f9c')],
  [0.5, hex('#d2487f')],
  [0.66, hex('#f27a3c')],
  [0.8, hex('#ffb54f')],
  [1.0, hex('#ffd889')],
];
function skyAt(t) {
  for (let i = 0; i < SKY.length - 1; i += 1) {
    const [t0, c0] = SKY[i];
    const [t1, c1] = SKY[i + 1];
    if (t <= t1) return mix3(c0, c1, smooth(t0, t1, t));
  }
  return SKY[SKY.length - 1][1];
}
const INK = hex('#170a16');
const RIM = hex('#ff9a3d');
const SUN = { x: 0.13, y: 0.635 }; // asomando justo sobre el borde de la cubierta

// ---------- capas ----------
/** Maniquí de frente, ligeramente girado; coordenadas en [0,1], y hacia abajo. */
function figure(x, y) {
  const cx = 0.6;
  let d = ellipse(x, y, cx, 0.395, 0.034, 0.042); // cabeza
  d = smin(d, capsule(x, y, cx, 0.43, cx + 0.002, 0.46, 0.017), 0.01); // cuello
  d = smin(d, capsule(x, y, cx - 0.004, 0.485, cx + 0.008, 0.6, 0.058, 0.044), 0.02); // torso
  d = smin(d, capsule(x, y, cx + 0.008, 0.6, cx + 0.01, 0.645, 0.046, 0.05), 0.02); // cadera
  // Brazo derecho (a la izquierda de la imagen) en alto, puño cerrado.
  d = smin(d, capsule(x, y, cx - 0.05, 0.47, cx - 0.1, 0.38, 0.021, 0.017), 0.015);
  d = smin(d, capsule(x, y, cx - 0.1, 0.38, cx - 0.122, 0.27, 0.017, 0.015), 0.01);
  d = smin(d, ellipse(x, y, cx - 0.124, 0.255, 0.021, 0.024), 0.008); // puño
  // Brazo izquierdo doblado: el micro a la altura del pecho.
  d = smin(d, capsule(x, y, cx + 0.052, 0.48, cx + 0.085, 0.565, 0.02, 0.017), 0.015);
  d = smin(d, capsule(x, y, cx + 0.085, 0.565, cx + 0.04, 0.505, 0.016, 0.014), 0.01);
  d = Math.min(d, capsule(x, y, cx + 0.035, 0.5, cx + 0.012, 0.455, 0.009, 0.013)); // micro
  // Piernas abiertas, firmes.
  d = smin(d, capsule(x, y, cx - 0.018, 0.64, cx - 0.06, 0.78, 0.03, 0.022), 0.015);
  d = smin(d, capsule(x, y, cx - 0.06, 0.78, cx - 0.085, 0.905, 0.022, 0.017), 0.01);
  d = smin(d, capsule(x, y, cx + 0.035, 0.64, cx + 0.075, 0.78, 0.03, 0.022), 0.015);
  d = smin(d, capsule(x, y, cx + 0.075, 0.78, cx + 0.1, 0.905, 0.022, 0.017), 0.01);
  d = Math.min(d, capsule(x, y, cx - 0.1, 0.912, cx - 0.06, 0.912, 0.012)); // pies
  d = Math.min(d, capsule(x, y, cx + 0.088, 0.912, cx + 0.13, 0.912, 0.012));
  return d;
}

/** Cubierta del estadio: borde superior curvo que baja de izquierda a derecha. */
const roofTop = (x) => 0.6 + 0.12 * x + 0.05 * Math.sin(x * 2.2 + 0.4);
const STAGE_Y = 0.92;

function pixel(px, py) {
  const x = (px + 0.5) / N;
  const y = (py + 0.5) / N;

  // 1. Cielo + nubes.
  const warp = fbm(x * 3 + 7, y * 9 + 2, 4);
  let c = skyAt(clamp(y + 0.06 * (warp - 0.5)));
  const clouds = smooth(0.48, 0.78, fbm(x * 2.2 + warp * 0.6, y * 7.5, 5)) * (1 - smooth(0.55, 0.78, y));
  c = mix3(c, mix3(c, hex('#ffd0a8'), 0.55), clouds * 0.45);

  // 2. Sol: halo, núcleo y rayos.
  const dx = x - SUN.x;
  const dy = (y - SUN.y) * 1.05;
  const r = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const rays = Math.pow(0.5 + 0.5 * Math.cos(ang * 14 + 0.6), 6) * 0.6 + Math.pow(0.5 + 0.5 * Math.cos(ang * 5), 8) * 0.4;
  const glow = Math.exp(-r * 6.5) * 0.9 + Math.exp(-r * 22) * 1.2 + rays * Math.exp(-r * 4.2) * 0.55;
  c = c.map((v, i) => v + glow * [1.0, 0.86, 0.66][i]);

  // 3. Estadio y césped.
  const top = roofTop(x);
  if (y > top) {
    const depth = clamp((y - top) / 0.25);
    let s = mix3(hex('#3b1726'), hex('#1d0c18'), depth);
    // Hileras de luces en la grada.
    // Hileras de luces: pocas filas cerca del borde, puntos dispersos (umbral sobre ruido).
    const row = (y - top) * 120;
    const inRow = smooth(0.18, 0.05, Math.abs((row % 1) - 0.5));
    const sparkle = smooth(0.72, 0.9, vnoise(x * 420, Math.floor(row) * 3.1));
    s = mix3(s, hex('#ffd9a0'), clamp(inRow * sparkle * 0.8 * (1 - depth) * (row > 1.5 && row < 12 ? 1 : 0)));
    // El sol se cuela por encima del borde.
    s = s.map((v, i) => v + glow * 0.35 * [1, 0.7, 0.45][i]);
    const edge = smooth(0, 0.004, y - top);
    c = mix3(mix3(c, hex('#ffcf8a'), 0.6), s, edge);
  }
  if (y > STAGE_Y) {
    const t = smooth(STAGE_Y, 1, y);
    c = mix3(mix3(hex('#4a2010'), INK, t), c, Math.exp(-(y - STAGE_Y) * 40) * 0.4);
  }

  // 4. Maniquí con contorno de contraluz (más intenso del lado del sol).
  const d = figure(x, y);
  const fill = smooth(0.0015, -0.0015, d);
  // Solo el lado que mira al sol (izquierda) recibe contraluz; el otro se funde con la sombra.
  const rimSide = clamp((0.64 - x) / 0.14);
  const rim = smooth(0.0035, 0, Math.abs(d + 0.0018)) * rimSide * rimSide;
  c = mix3(c, INK, fill);
  c = c.map((v, i) => v + rim * RIM[i] * 0.8 * fill);

  // 5. Viñeta + grano.
  const vig = 1 - 0.28 * Math.pow(Math.hypot(x - 0.5, y - 0.5) * 1.35, 2.2);
  const grain = (TABLE[(py * N + px) % TABLE.length] - 0.5) * 0.035;
  return c.map((v) => clamp(v * vig + grain));
}

// ---------- PNG (RGB 8-bit + chunk sRGB) ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const raw = Buffer.alloc((N * 3 + 1) * N);
for (let py = 0; py < N; py += 1) {
  const row = py * (N * 3 + 1);
  raw[row] = 0; // filtro None
  for (let px = 0; px < N; px += 1) {
    const [r, g, b] = pixel(px, py);
    const o = row + 1 + px * 3;
    raw[o] = Math.round(r * 255);
    raw[o + 1] = Math.round(g * 255);
    raw[o + 2] = Math.round(b * 255);
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bits
ihdr[9] = 2; // RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('sRGB', Buffer.from([0])), // intento perceptual: colores de pantalla sRGB
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`sleeve.png ${N}×${N}, ${png.length} bytes → ${OUT.pathname}`);
