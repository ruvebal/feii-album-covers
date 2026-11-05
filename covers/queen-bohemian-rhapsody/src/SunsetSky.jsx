// SunsetSky.jsx — skybox con shader GLSL propio (Covenant Bar 2). Revisión completa en task2.
//
// 1. Propósito: cielo generativo atardecer → noche (degradado, sol, nubes fbm a
//    contraluz y estrellas que se alargan en "star trails"), sin texturas.
// 2. Entradas: uTime (s, congelado con prefers-reduced-motion), uTod (time of day,
//    0 atardecer … 1 noche; lo escribe el CameraRig), uSunDir (dirección del sol, mundo).
// 3. Espacio: dirección de vista en espacio de objeto de una esfera centrada en la
//    cámara (= dirección de mundo, porque la esfera solo se traslada).
// 4. Rendimiento: 0 texturas; fbm de 5 octavas llamado 3 veces (bucle for fijo de
//    5 iteraciones) → ~15 noise() por fragmento; sin discard. Una esfera de ~3k tris.
//    TODO(task2): justificar highp en docs/shader-note.md (hash de estrellas y acos)
//    o pasar a mediump; acotar uTime con módulo; conectar uTod a las luces.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Vector3 } from 'three';

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;                       // dirección desde el centro de la esfera
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;
  uniform float uTod;       // 0 = atardecer, 1 = noche
  uniform vec3  uSunDir;

  // ---- ruido ----
  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return v;
  }

  // ---- paletas (valores de pantalla, ver la nota de salida) ----
  vec3 sunset(float h){
    vec3 horizon = vec3(1.00, 0.50, 0.12);
    vec3 mid     = vec3(0.85, 0.22, 0.45);
    vec3 top     = vec3(0.22, 0.12, 0.45);
    vec3 c = mix(horizon, mid, smoothstep(0.0, 0.25, h));
    return mix(c, top, smoothstep(0.2, 0.8, h));
  }
  vec3 night(float h){
    return mix(vec3(0.06, 0.09, 0.22), vec3(0.01, 0.02, 0.09), smoothstep(0.0, 0.7, h));
  }

  void main(){
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 sunDir = normalize(uSunDir);

    // 1) degradado base mezclado por hora del día
    vec3 col = mix(sunset(h), night(h), uTod);

    // 2) sol: núcleo + halo + resplandor ancho (se apaga con la noche)
    float s = max(dot(d, sunDir), 0.0);
    vec3 sun = vec3(1.0, 0.85, 0.5) * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.6 + pow(s, 6.0) * 0.25);
    col += sun * (1.0 - uTod);

    // 3) nubes: proyección plana con perspectiva + iluminación a contraluz
    vec2 cuv = d.xz / (d.y + 0.18) * 0.9 + vec2(uTime * 0.01, 0.0);
    float dens  = fbm(cuv * 1.5);
    float cloud = smoothstep(0.45, 0.80, dens) * smoothstep(0.0, 0.12, d.y);
    // "lit": densidad en el punto vs. desplazada hacia el sol -> borde plateado
    float toward = fbm((cuv + normalize(sunDir.xz + 1e-4) * 0.08) * 1.5);
    float lit = clamp((dens - toward) * 6.0 + 0.5, 0.0, 1.0);
    vec3 cloudCol = mix(vec3(0.35, 0.18, 0.35), vec3(1.0, 0.62, 0.30), lit);
    cloudCol = mix(cloudCol, vec3(0.05, 0.07, 0.16), uTod * 0.85);
    col = mix(col, cloudCol, cloud * 0.85);

    // 4) estrellas con trails: rejilla en coordenadas polares alrededor de un polo
    vec3 P  = normalize(vec3(0.2, 0.9, -0.4));
    vec3 t1 = normalize(cross(P, vec3(0.0, 0.0, 1.0)));
    vec3 t2 = cross(P, t1);
    float ang = atan(dot(d, t2), dot(d, t1)) + uTime * 0.02;   // rotación lenta del cielo
    float rad = acos(clamp(dot(d, P), -1.0, 1.0));
    vec2 g  = vec2(rad * 70.0, ang * 6.0);
    vec2 id = floor(g), f = fract(g);
    float rnd = hash21(id);
    vec2 sp = vec2(hash21(id + 3.1), hash21(id + 7.7));
    // multiplicar la componente angular por 0.15 => la estrella se estira en esa dirección
    float dist  = length((f - sp) * vec2(1.0, 0.15));
    float star  = smoothstep(0.12, 0.0, dist) * step(0.86, rnd);
    star *= 0.6 + 0.4 * sin(uTime * 2.0 + rnd * 40.0);          // centelleo
    // bandas suaves de "streaks" anisótropas (el velo luminoso del vídeo)
    float bands = pow(fbm(vec2(rad * 5.0, ang * 0.7)), 3.0);
    float nightMask = smoothstep(0.35, 1.0, uTod) * smoothstep(0.0, 0.15, d.y);
    col += (vec3(0.9, 0.95, 1.0) * star * 1.6 + vec3(0.25, 0.35, 0.7) * bands * 0.9) * nightMask;

    // Salida directa: las paletas están pensadas en valores de pantalla (sRGB),
    // por eso NO incluimos colorspace_fragment y usamos toneMapped={false}.
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
      uSunDir: { value: new Vector3(-0.25, 0.05, 1.0) },
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (!mesh.current || !material.current) return;
    const u = material.current.uniforms;
    if (!reduced) u.uTime.value += Math.min(delta, 0.05);
    u.uTod.value = progress.current.tod;
    mesh.current.position.copy(camera.position); // el cielo siempre "en el infinito"
  });

  return (
    <mesh ref={mesh} name="SunsetSky" renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 32]} />
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
