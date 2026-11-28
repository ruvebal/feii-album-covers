// Portadas en 3D: cada funda lleva un plano con relieve. La profundidad se calcula de la propia imagen
// (lo que se separa del fondo y lo que tiene más contraste sobresale) y el shader hace dos cosas:
//   1. desplaza los vértices hacia delante según la profundidad (relieve real que se ve de lado),
//   2. desplaza el dibujo según desde dónde se mira (parallax): al moverte, el sujeto se separa del fondo.
// No inventa dibujo: solo mueve los píxeles de la portada original.

import * as THREE from 'three';

const N = 128;

/** Desenfoque de caja separable sobre un campo N×N. */
function blur(src, r) {
  const tmp = new Float32Array(N * N);
  const out = new Float32Array(N * N);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < N; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * N + Math.min(N - 1, Math.max(0, x))];
    for (let x = 0; x < N; x++) {
      tmp[y * N + x] = sum * k;
      sum += src[y * N + Math.min(N - 1, x + r + 1)] - src[y * N + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < N; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(N - 1, Math.max(0, y)) * N + x];
    for (let y = 0; y < N; y++) {
      out[y * N + x] = sum * k;
      sum += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x];
    }
  }
  return out;
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Mapa de profundidad (blanco = cerca) de una portada, como textura alineada con la propia imagen. */
export function makeDepthTexture(source) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(source, 0, 0, N, N);
  const px = g.getImageData(0, 0, N, N).data;

  // color de fondo: media del borde
  let br = 0;
  let bg = 0;
  let bb = 0;
  let cnt = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (x < 6 || x >= N - 6 || y < 6 || y >= N - 6) {
        const i = (y * N + x) * 4;
        br += px[i];
        bg += px[i + 1];
        bb += px[i + 2];
        cnt += 1;
      }
    }
  }
  br /= cnt;
  bg /= cnt;
  bb /= cnt;

  const lum = new Float32Array(N * N);
  const fg = new Float32Array(N * N);
  let meanFg = 0;
  for (let i = 0; i < N * N; i++) {
    const r = px[i * 4];
    const gg = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    lum[i] = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    fg[i] = smooth(0.06, 0.3, Math.hypot(r - br, gg - bg, b - bb) / 441);
    meanFg += fg[i];
  }
  meanFg /= N * N;

  // saliencia: contraste local frente a una media amplia
  const lumWide = blur(lum, 12);
  const sal = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) sal[i] = Math.min(1, Math.abs(lum[i] - lumWide[i]) * 3.2);
  const salB = blur(sal, 4);
  const fgB = blur(fg, 3);
  const lumB = blur(lum, 5);

  const depth = new Float32Array(N * N);
  // fondo liso (el perro sobre azul): manda la silueta. Imagen llena (una foto, un patrón): manda el contraste.
  const wFg = meanFg < 0.7 ? 0.7 : 0.15;
  for (let i = 0; i < N * N; i++) depth[i] = wFg * fgB[i] + (1 - wFg) * (0.7 * salB[i] + 0.3 * lumB[i]);
  const d2 = blur(blur(depth, 2), 2);
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < N * N; i++) {
    lo = Math.min(lo, d2[i]);
    hi = Math.max(hi, d2[i]);
  }
  const out = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.round(255 * ((d2[i] - lo) / Math.max(1e-4, hi - lo)));
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
    out.data[i * 4 + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Material con relieve y parallax. `map` es la textura de la portada (sRGB) y `depth` su mapa de profundidad.
 * @param {THREE.Texture} map @param {THREE.Texture} depth
 */
export function createReliefMaterial(map, depth) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uDepth: { value: depth },
      uRelief: { value: 0.02 }, // cuánto sobresale lo más cercano (metros)
      uParallax: { value: 0.03 }, // cuánto se desplaza el dibujo al cambiar el punto de vista
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uIdle: { value: 1 }, // 0 con prefers-reduced-motion
      uSweep: { value: 0 }, // posición del destello diagonal
      uSheen: { value: 0.08 }, // intensidad del destello
      uLight: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      uniform sampler2D uDepth;
      uniform float uRelief;
      varying vec2 vUv;
      varying float vEdge;
      varying vec3 vView;
      varying float vD;
      void main() {
        vUv = uv;
        float d = texture2D(uDepth, uv).r;
        vD = d;
        vEdge = smoothstep(0.0, 0.05, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
        // solo hacia delante: nunca por detrás del frente de la funda (si no, asoma el cartón)
        vec3 p = position + vec3(0.0, 0.0, d * uRelief * vEdge);
        vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vView = normalize(camLocal - p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform sampler2D uDepth;
      uniform float uParallax;
      uniform float uLight;
      uniform float uTime;
      uniform float uPhase;
      uniform float uIdle;
      uniform float uSweep;
      uniform float uSheen;
      varying vec2 vUv;
      varying float vEdge;
      varying vec3 vView;
      varying float vD;
      void main() {
        // el dibujo respira solo (aunque no te muevas) y reacciona a desde dónde miras
        vec2 idle = vec2(sin(uTime * 0.9 + uPhase), cos(uTime * 0.7 + uPhase * 1.3)) * 0.5 * uIdle;
        vec2 off = (vView.xy / max(vView.z, 0.3) + idle * 0.35) * uParallax;
        vec2 uv = vUv - off * (texture2D(uDepth, vUv).r - 0.35);
        uv = vUv - off * (texture2D(uDepth, clamp(uv, 0.0, 1.0)).r - 0.35);
        uv = mix(vUv, uv, vEdge); // sin dientes en los bordes
        vec3 c = texture2D(uMap, clamp(uv, 0.0, 1.0)).rgb;
        float shade = 0.84 + 0.26 * vD; // lo que sobresale recibe un poco más de luz
        // destello diagonal que cruza la funda (suma luz, no cambia el dibujo)
        float bd = (vUv.x * 0.7 + vUv.y * 0.7 - uSweep) * 7.0;
        float band = exp(-bd * bd); // cuadrado directo: pow() con base negativa es indefinido en GLSL
        gl_FragColor = vec4(c * shade * uLight + vec3(band * uSheen), 1.0);
      }
    `,
    fog: false,
  });
}
