// SunsetSky.jsx — skybox con shader GLSL propio (task2). Nota completa: docs/shader-note.md.
//
// 1. Propósito: cielo generativo atardecer → noche, sin texturas: degradado, sol que se pone,
//    nubes fbm iluminadas a contraluz y estrellas que se estiran en "star trails".
// 2. Entradas (uniforms):
//    - uTime   s, envuelto con SKY_PERIOD en JS (sky.js); congelado con prefers-reduced-motion.
//    - uTod    hora del día, 0 atardecer … 1 noche (la interpola CameraRig desde keys.js).
//    - uSunDir dirección unitaria hacia el sol, en mundo (sunDirection(tod) de sky.js: la misma
//              que usa la luz direccional de SkyLights).
//    Sin atributos propios: solo `position` de la esfera (lo declara three).
// 3. Espacio: vDir = posición de objeto de una esfera que sigue a la cámara (solo se traslada,
//    nunca rota ni escala) = dirección de vista en MUNDO. Así el sol, las nubes y el polo de las
//    estrellas quedan fijos al estadio y no a la pantalla.
// 4. Rendimiento: 0 texturas, sin discard. Un bucle for de 5 iteraciones fijas (fbm) llamado
//    3 veces → 15 noise() (60 hash) por fragmento. Esfera 48 × 32 (2 976 triángulos), 1 draw call.
//    Precisión highp (justificada en la línea 4 de la nota): el hash de las estrellas y uTime·k.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Vector3 } from 'three';
import { SKY_PERIOD, sunDirection } from './sky.js';

// Vueltas ENTERAS por periodo: al envolver uTime nada salta (ver sky.js).
const CLOUD_TURNS = 1; // las nubes giran alrededor del cénit: 1 vuelta / 50 min
const STAR_TURNS = 10; // el cielo estrellado gira sobre su polo: 1 vuelta / 5 min
const TWINKLES = 1000; // centelleo: ~2,1 rad/s
const f1 = (n) => n.toFixed(1); // los #define necesitan literal float

const vert = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position; // dirección desde el centro de la esfera (= desde la cámara)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  #define TAU 6.28318530718
  #define PERIOD ${f1(SKY_PERIOD)}
  #define CLOUD_TURNS ${f1(CLOUD_TURNS)}
  #define STAR_TURNS ${f1(STAR_TURNS)}
  #define TWINKLES ${f1(TWINKLES)}
  #define SECTORS 38.0 // sectores de la rejilla polar: entero → sin costura en atan()

  uniform float uTime;
  uniform float uTod;
  uniform vec3  uSunDir;
  varying vec3 vDir;

  // ---- ruido de valor 2D ----
  // hash21: pseudoaleatorio en [0, 1) a partir de una celda. Sus productos grandes son la razón de highp.
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // interpolación suave entre las 4 esquinas
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // fbm: 5 octavas (frecuencia ×2,03, amplitud ×0,5). Bucle de longitud fija: el compilador lo desenrolla.
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return v;
  }
  vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

  // ---- paletas (valores de pantalla, ver la salida) ----
  vec3 dusk(float h) {
    vec3 c = mix(vec3(1.00, 0.50, 0.12), vec3(0.85, 0.22, 0.45), smoothstep(0.0, 0.25, h)); // horizonte → medio
    return mix(c, vec3(0.22, 0.12, 0.45), smoothstep(0.2, 0.8, h));                         // → cénit
  }
  vec3 night(float h) {
    return mix(vec3(0.06, 0.09, 0.22), vec3(0.01, 0.02, 0.09), smoothstep(0.0, 0.7, h));
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 sunDir = uSunDir; // ya unitario (sky.js)
    float above = smoothstep(-0.01, 0.01, d.y); // 1 sobre el horizonte

    // 1) DEGRADADO: altura → paleta; uTod mezcla atardecer y noche.
    //    Resplandor del horizonte concentrado hacia el sol: se apaga al ponerse.
    vec3 col = mix(dusk(h), night(h), uTod);
    float az = max(dot(normalize(d.xz + 1e-4), normalize(sunDir.xz + 1e-4)), 0.0);
    col += vec3(0.9, 0.35, 0.1) * pow(az, 4.0) * exp(-h * 9.0) * (1.0 - uTod) * 0.5;

    // 2) SOL: potencias de dot(d, sol). Exponente alto = disco (900), medio = halo (40),
    //    bajo = resplandor ancho (6). El disco solo sobre el horizonte; el halo sigue un poco
    //    tras ponerse y se apaga con la noche.
    float s = max(dot(d, sunDir), 0.0);
    vec3 sun = vec3(1.0, 0.85, 0.5) * (pow(s, 900.0) * 6.0 * above + pow(s, 40.0) * 0.6 + pow(s, 6.0) * 0.25);
    col += sun * (1.0 - uTod);

    // 3) NUBES: plano de nubes proyectado (d.xz / altura → más juntas cerca del horizonte),
    //    girando alrededor del cénit (rotación periódica, no traslación: envuelve sin saltos).
    //    "lit" compara la densidad aquí con la densidad un poco hacia el sol: si hay menos nube
    //    hacia el sol, este punto es borde iluminado (contraluz plateado).
    float spin = TAU * CLOUD_TURNS * uTime / PERIOD;
    vec2 cuv = rot(d.xz, spin) / (d.y + 0.18) * 0.9;
    float dens = fbm(cuv * 1.5);
    float cloud = smoothstep(0.45, 0.80, dens) * smoothstep(0.0, 0.12, d.y);
    vec2 towardSun = rot(normalize(sunDir.xz + 1e-4), spin) * 0.08;
    float lit = clamp((dens - fbm((cuv + towardSun) * 1.5)) * 6.0 + 0.5, 0.0, 1.0);
    vec3 cloudCol = mix(vec3(0.35, 0.18, 0.35), vec3(1.0, 0.62, 0.30), lit);
    cloudCol = mix(cloudCol, vec3(0.05, 0.07, 0.16), uTod * 0.85);
    col = mix(col, cloudCol, cloud * 0.85);

    // 4) ESTRELLAS CON TRAILS: rejilla en coordenadas polares alrededor de un polo celeste P.
    //    Radial = ángulo a P (acos); angular = vueltas alrededor de P en [0, 1) + giro del cielo,
    //    × SECTORES enteros → la columna 0 y la 38 son la misma: sin costura donde atan salta.
    vec3 P  = normalize(vec3(0.2, 0.9, -0.4));
    vec3 t1 = normalize(cross(P, vec3(0.0, 0.0, 1.0)));
    vec3 t2 = cross(P, t1);
    float turn = atan(dot(d, t2), dot(d, t1)) / TAU + STAR_TURNS * uTime / PERIOD;
    float rad  = acos(clamp(dot(d, P), -1.0, 1.0));
    vec2 g  = vec2(rad * 70.0, fract(turn) * SECTORS);
    vec2 id = floor(g), f = fract(g);
    float rnd = hash21(id);
    vec2 sp = vec2(hash21(id + 3.1), hash21(id + 7.7)) * 0.8 + 0.1; // posición dentro de la celda
    // ×0,15 en la componente angular: la distancia crece despacio en esa dirección → la estrella
    // se estira como un arco alrededor del polo (trail). Solo el 14 % de celdas tiene estrella.
    float dist = length((f - sp) * vec2(1.0, 0.15));
    float star = smoothstep(0.12, 0.0, dist) * step(0.86, rnd);
    star *= 0.6 + 0.4 * sin(TAU * TWINKLES * uTime / PERIOD + rnd * 40.0); // centelleo
    // Velo de trails: fbm sobre un círculo en el espacio de ruido (cos/sin del ángulo): rápido en
    // radio, lento alrededor → arcos concéntricos, sin costura y girando con las estrellas.
    float phi = TAU * turn;
    float bands = pow(fbm(vec2(rad * 5.0, 0.0) + 0.45 * vec2(cos(phi), sin(phi))), 3.0);
    float nightMask = smoothstep(0.35, 1.0, uTod) * smoothstep(0.0, 0.15, d.y) * (1.0 - cloud * 0.8);
    col += (vec3(0.9, 0.95, 1.0) * star * 1.6 + vec3(0.25, 0.35, 0.7) * bands * 0.9) * nightMask;

    // Salida directa: las paletas están en valores de pantalla (sRGB). Por eso NO va
    // #include <colorspace_fragment> y el material usa toneMapped={false}. No hay textura que convertir.
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * @param {object} props
 * @param {import('react').RefObject<{ tod: number }>} props.progress Hora del día (la escribe CameraRig).
 * @param {boolean} props.reduced prefers-reduced-motion: congela uTime.
 * @param {number} [props.radius]
 */
export default function SunsetSky({ progress, reduced, radius = 500 }) {
  const mesh = useRef(null);
  const material = useRef(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTod: { value: 0 },
      uSunDir: { value: sunDirection(0, new Vector3()) },
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (!mesh.current || !material.current) return;
    const u = material.current.uniforms;
    if (!reduced) u.uTime.value = (u.uTime.value + Math.min(delta, 0.05)) % SKY_PERIOD;
    u.uTod.value = progress.current.tod;
    sunDirection(progress.current.tod, u.uSunDir.value);
    mesh.current.position.copy(camera.position); // el cielo siempre "en el infinito"
  });

  return (
    <mesh ref={mesh} name="SunsetSky" renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 32]} />
      {/* precision: UN solo sitio (aquí), sin línea precision en el GLSL. highp: ver shader-note línea 4. */}
      <shaderMaterial
        ref={material}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        precision="highp"
        side={BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
