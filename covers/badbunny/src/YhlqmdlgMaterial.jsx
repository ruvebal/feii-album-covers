// covers/badbunny/src/YhlqmdlgMaterial.jsx — Custom GLSL ShaderMaterial for Bad Bunny (`/covers/badbunny`).
//
// Registered under the slug-unique R3F catalogue key `BadbunnySleeve` (`<badbunnySleeve />`)
// so it never collides with `_studio` or any other team's cover (Route contract 3).
//
// Effect overview (documented in docs/shader-note.md):
//   - Coordinate space: mesh UV (`vUv`).
//   - CRT / VHS Night Scanlines & Chromatic Shift: a horizontal wave along `vUv.y` driven by
//     wrapped `uTime` and sub-bass energy (`uBass`) offsets the red and blue channels (`uMap`)
//     around the cursor (`uPointer`) and `vec2(0.50, 0.63)`.
//   - Psychic Aura: a radial mask in UV space (`smoothstep`) around `vec2(0.50, 0.63)` and the
//     pointer mixes the track's signature color (`uTint`) with bass reactivity (`uBass`).
//   - Ends with `#include <colorspace_fragment>` so sRGB textures render accurately.

import { useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { Color, Vector2 } from 'three';

const TIME_WRAP = 62.8318; // 20 * PI so mediump float never loses precision

const BadbunnySleeveShader = shaderMaterial(
  {
    uMap: null,
    uTime: 0,
    uThirdEye: 0,
    uBass: 0,
    uPointer: new Vector2(0.5, 0.63),
    uTint: new Color('#ff2a85'),
  },
  /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform sampler2D uMap;
    uniform float uTime;
    uniform float uThirdEye;
    uniform float uBass;
    uniform vec2 uPointer;
    uniform vec3 uTint;
    varying vec2 vUv;

    void main() {
      vec2 eyeCenter = vec2(0.50, 0.63);
      float distEye = distance(vUv, eyeCenter);
      float distPtr = distance(vUv, uPointer);

      // Radial aura field around the center label and interactive pointer
      float eyeMask = 1.0 - smoothstep(0.02, 0.34 + uBass * 0.14, distEye);
      float ptrMask = 1.0 - smoothstep(0.0, 0.26, distPtr);
      float field = clamp(eyeMask * 0.85 + ptrMask * 0.55, 0.0, 1.0);

      // VHS horizontal jitter + RGB chromatic split modulated by uThirdEye and uBass
      float vhsWave = sin(vUv.y * 42.0 + uTime * 3.0) * 0.0018 * (uThirdEye + uBass);
      vec2 uvBase = vec2(clamp(vUv.x + vhsWave, 0.001, 0.999), vUv.y);
      float shift = (0.002 + 0.007 * (uThirdEye * 0.65 + uBass)) * (0.35 + field);

      float r = texture2D(uMap, uvBase + vec2(shift, 0.0)).r;
      float g = texture2D(uMap, uvBase).g;
      float b = texture2D(uMap, uvBase - vec2(shift, 0.0)).b;
      vec3 picture = vec3(r, g, b);

      // Subtle CRT scanlines + radial pulse ring in UV space
      float scanline = 0.94 + 0.06 * sin(vUv.y * 240.0 - uTime * 6.0);
      float pulseRing = (1.0 - smoothstep(0.0, 0.045, abs(distEye - fract(uTime * 0.35) * 0.48))) * uThirdEye;

      vec3 color = picture * mix(1.0, scanline, 0.45 * uThirdEye + 0.25);
      color = mix(color, color * (0.75 + 0.55 * uTint) + uTint * 0.32, field * (0.38 * uThirdEye + 0.45 * uBass));
      color += uTint * pulseRing * (0.35 + 0.4 * uBass);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);

      #include <colorspace_fragment>
    }
  `,
  (material) => {
    material.precision = 'mediump';
  },
);

// Route contract 3: slug-unique key in the global R3F catalogue
extend({ BadbunnySleeve: BadbunnySleeveShader });

export default function BadBunnyMaterial({
  map,
  thirdEyeActive,
  pointerUvRef,
  tintRgb,
  getBassEnergy,
  reduced,
}) {
  const matRef = useRef(null);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;

    const dt = Math.min(delta, 0.05);
    const bass = reduced ? 0 : getBassEnergy ? getBassEnergy() : 0;

    if (reduced) {
      mat.uTime = 0;
      mat.uBass = 0;
    } else {
      mat.uTime = (mat.uTime + dt) % TIME_WRAP;
      mat.uBass += (bass - mat.uBass) * 0.28;
    }

    const targetEye = thirdEyeActive ? 1.0 : 0.18;
    mat.uThirdEye += (targetEye - mat.uThirdEye) * 0.12;

    if (pointerUvRef && pointerUvRef.current) {
      mat.uPointer.lerp(pointerUvRef.current, 0.2);
    }
    if (tintRgb) {
      mat.uTint.setRGB(tintRgb[0], tintRgb[1], tintRgb[2]);
    }
  });

  return <badbunnySleeve ref={matRef} uMap={map} />;
}
