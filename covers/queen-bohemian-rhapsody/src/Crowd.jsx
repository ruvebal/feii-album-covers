// Crowd.jsx — la multitud: UN InstancedMesh (1 draw call) + luces de móvil en UN Points (1 draw call).
//
// Las posiciones no viven en el GLB (presupuesto del plan): crowdLayout() las reparte
//   - FIELD fans en el césped, delante del escenario (lado −Z), mirando a Freddie;
//   - el resto en las filas de la grada (360°), mirando al centro.
// Un PRNG con semilla hace que la multitud sea la misma en cada carga y que el render sea puro.
//
// task2 — dos efectos de shader, ambos movidos por la fase del pulso (uBeat ∈ [0, 1), 72 bpm,
// calculada en JS con sky.js):
// 1. Bote: onBeforeCompile sobre el MeshStandardMaterial de la multitud. Atributo por instancia
//    `aPhase` (desfase 0–0,25 de pulso: casi a la vez, no en bloque). En el vertex shader, tras
//    <begin_vertex>: transformed.y += uBounce · sin(π · fract(uBeat + aPhase)) → un salto por pulso,
//    0 al principio y al final (continuo al envolver). Se suma en espacio de OBJETO (antes de
//    instanceMatrix), así cada fan bota sobre su sitio. Iluminación intacta (solo se traslada).
// 2. Móviles: Points aditivos, 1 de cada 3 fans, a la altura de la mano. Cada móvil se enciende
//    cuando uNight supera su `aSeed` (aparecen uno a uno al caer la noche), botan con el mismo
//    aPhase que su fan y se mecen a un compás de 4 pulsos (uSway). Sin textura ni discard: el
//    disco suave sale de gl_PointCoord y lo que queda fuera suma 0.
// prefers-reduced-motion: uBounce = uSwayAmp = 0 (los móviles se encienden, pero no se mueven).

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  Vector2,
} from 'three';
import { FLOOR_Y, STAND_DEPTH, STAND_R0, STAND_ROWS, standY } from './placeholders.js';
import { BEAT_HZ } from './sky.js';

const BOUNCE = 0.07; // m, altura del salto
const PHONE_EVERY = 3; // 1 de cada 3 fans levanta el móvil
const PHONE_Y = 1.55; // m sobre los pies (fan de escala 1)

/**
 * mulberry32: PRNG pequeño y determinista.
 *
 * @param {number} seed
 * @returns {() => number} Números en [0, 1).
 */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Reparto determinista de la multitud (función pura: se puede llamar en useMemo).
 *
 * @param {number} count
 * @param {number} field
 */
function crowdLayout(count, field) {
  const rand = prng(1985); // Live Aid
  const matrices = new Float32Array(count * 16);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const phones = { position: [], phase: [], seed: [] };
  const dummy = new Object3D();
  const color = new Color();

  for (let n = 0; n < count; n += 1) {
    if (n < field) {
      // Césped: semicírculo delante del escenario, entre 4,5 y 20 m de Freddie.
      const r = 4.5 + rand() * 15.5;
      const a = Math.PI + (rand() - 0.5) * Math.PI * 0.9; // centrado en −Z
      dummy.position.set(Math.sin(a) * r, FLOOR_Y, Math.cos(a) * r);
    } else {
      const row = Math.floor(rand() * STAND_ROWS);
      const r = STAND_R0 + row * STAND_DEPTH + (rand() - 0.5) * 0.3;
      const a = rand() * Math.PI * 2;
      dummy.position.set(Math.sin(a) * r, standY(row), Math.cos(a) * r);
    }
    // Mirar al escenario: gira sobre Y para que el +Z local del fan apunte al origen.
    dummy.rotation.set(0, Math.atan2(-dummy.position.x, -dummy.position.z), 0);
    const scale = 0.9 + rand() * 0.2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    dummy.matrix.toArray(matrices, n * 16);

    // Tonos apagados de ropa en contraluz.
    color.setHSL(0.02 + rand() * 0.1, 0.15 + rand() * 0.25, 0.18 + rand() * 0.22);
    color.toArray(colors, n * 3);
    phases[n] = rand() * 0.25;

    if (n % PHONE_EVERY === 0) {
      // Mano algo hacia delante (+Z local, hacia el escenario) y a un lado.
      const side = (rand() - 0.5) * 0.4;
      const yaw = dummy.rotation.y;
      phones.position.push(
        dummy.position.x + (Math.sin(yaw) * 0.25 + Math.cos(yaw) * side) * scale,
        dummy.position.y + PHONE_Y * scale,
        dummy.position.z + (Math.cos(yaw) * 0.25 - Math.sin(yaw) * side) * scale,
      );
      phones.phase.push(phases[n]);
      phones.seed.push(rand());
    }
  }
  return { matrices, colors, phases, phones };
}

const phoneVert = /* glsl */ `
  attribute float aPhase; // desfase del pulso de su fan (el mismo que el bote)
  attribute float aSeed;  // 0..1: umbral de encendido y fase del vaivén
  uniform float uBeat;    // fase del pulso [0, 1)
  uniform float uSway;    // fase del vaivén [0, 1) (4 pulsos)
  uniform float uBounce;
  uniform float uSwayAmp;
  uniform float uNight;   // 0 atardecer … 1 noche
  uniform float uPx;      // píxeles por metro a 1 m: proyección[1][1] · alto del buffer / 2
  varying float vGlow;

  void main() {
    vec3 p = position;
    p.y += uBounce * sin(3.14159265 * fract(uBeat + aPhase));
    p.x += uSwayAmp * sin(6.28318531 * (uSway + aSeed));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Tamaño con perspectiva (pantalla de ~12 cm), nunca menos de 1,5 px: de lejos sigue siendo un punto.
    gl_PointSize = max(0.12 * uPx / max(-mv.z, 0.1), 1.5);
    vGlow = smoothstep(aSeed, aSeed + 0.08, uNight * 1.08); // se enciende al pasar su umbral
  }
`;

const phoneFrag = /* glsl */ `
  uniform vec3 uColor;
  varying float vGlow;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(uColor * a * a * vGlow, 1.0); // aditivo: fuera del disco suma 0
  }
`;

/**
 * @param {object} props
 * @param {import('three').BufferGeometry} props.geometry Fan_LOD0 (placeholder o nodo del GLB).
 * @param {import('react').RefObject<{ tod: number }>} props.progress Hora del día (CameraRig).
 * @param {boolean} props.reduced prefers-reduced-motion: sin bote ni vaivén.
 * @param {number} [props.count] Total de fans.
 * @param {number} [props.field] Cuántos de ellos están en el césped.
 */
export default function Crowd({ geometry, progress, reduced, count = 5000, field = 1800 }) {
  const mesh = useRef(null);
  const phonesMat = useRef(null);
  const clock = useRef(0);
  const buffer = useRef(new Vector2());
  const layout = useMemo(() => crowdLayout(count, field), [count, field]);

  // Material de la multitud con el bote inyectado. Uniforms en userData: el shader compilado
  // los comparte por referencia, así que basta con escribir .value cada frame.
  const crowdMat = useMemo(() => {
    const m = new MeshStandardMaterial({ roughness: 0.9 });
    m.userData.uBeat = { value: 0 };
    m.userData.uBounce = { value: 0 };
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uBeat = m.userData.uBeat;
      shader.uniforms.uBounce = m.userData.uBounce;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          attribute float aPhase;
          uniform float uBeat;
          uniform float uBounce;`,
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
          transformed.y += uBounce * sin(3.14159265 * fract(uBeat + aPhase));`,
        );
    };
    m.customProgramCacheKey = () => 'queen-bohemian-rhapsody-crowd-bounce';
    return m;
  }, []);

  const phones = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(layout.phones.position, 3));
    g.setAttribute('aPhase', new Float32BufferAttribute(layout.phones.phase, 1));
    g.setAttribute('aSeed', new Float32BufferAttribute(layout.phones.seed, 1));
    g.computeBoundingSphere();
    return g;
  }, [layout]);

  const phoneUniforms = useMemo(
    () => ({
      uBeat: { value: 0 },
      uSway: { value: 0 },
      uBounce: { value: 0 },
      uSwayAmp: { value: 0 },
      uNight: { value: 0 },
      uPx: { value: 500 },
      uColor: { value: new Color('#cfe0ff') },
    }),
    [],
  );

  useEffect(() => () => crowdMat.dispose(), [crowdMat]);
  useEffect(() => () => phones.dispose(), [phones]);

  useLayoutEffect(() => {
    const im = mesh.current;
    if (!im) return undefined;
    im.instanceMatrix.array.set(layout.matrices);
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor = new InstancedBufferAttribute(layout.colors, 3);
    im.computeBoundingSphere();
    // aPhase por instancia. La geometría puede venir del GLB: se quita al desmontar.
    geometry.setAttribute('aPhase', new InstancedBufferAttribute(layout.phases, 1));
    return () => geometry.deleteAttribute('aPhase');
  }, [geometry, layout]);

  useFrame((state, delta) => {
    const tod = progress.current.tod;
    if (!reduced) clock.current = (clock.current + Math.min(delta, 0.05) * BEAT_HZ) % 4; // en pulsos
    const beat = clock.current % 1;
    const sway = clock.current / 4;
    const bounce = reduced ? 0 : BOUNCE * MathUtils.lerp(0.4, 1, tod); // más bote cuando cae la noche

    const im = mesh.current;
    if (im) {
      im.material.userData.uBeat.value = beat;
      im.material.userData.uBounce.value = bounce;
    }
    const pm = phonesMat.current;
    if (pm) {
      const u = pm.uniforms;
      u.uBeat.value = beat;
      u.uSway.value = sway;
      u.uBounce.value = bounce;
      u.uSwayAmp.value = reduced ? 0 : 0.12;
      u.uNight.value = MathUtils.smoothstep(tod, 0.3, 1);
      u.uPx.value = state.camera.projectionMatrix.elements[5] * state.gl.getDrawingBufferSize(buffer.current).y * 0.5;
      // Sin móviles encendidos no se dibuja (material.visible: ahorra 1 draw call en todo el atardecer).
      pm.visible = u.uNight.value > 0;
    }
  });

  return (
    <>
      <instancedMesh ref={mesh} name="Crowd" args={[geometry, crowdMat, count]} />
      <points name="Phones" geometry={phones}>
        <shaderMaterial
          ref={phonesMat}
          vertexShader={phoneVert}
          fragmentShader={phoneFrag}
          uniforms={phoneUniforms}
          precision="mediump"
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  );
}
