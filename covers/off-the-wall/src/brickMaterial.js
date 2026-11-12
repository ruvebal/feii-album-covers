// Material de los ladrillos: MeshStandardMaterial de three con GLSL propio
// inyectado en onBeforeCompile (se conservan la luz, las sombras y el color
// por ladrillo de la instancia).
//
// Propósito: la pared "respira" con la música. Detrás de Michael aparece un
// charco de luz cálida que sube con los graves de la canción que suena.
// Entradas: uPulse (0..1, energía de los graves, desde player.level()),
//           uSpot (centro del charco en x/y del mundo), uSize (radios x/y).
// Espacio de coordenadas: mundo (vOtwWorld). El charco está pegado a la
//           pared, no a la pantalla: al girar la cámara se queda en su sitio.
// Rendimiento: sin bucles, sin texturas, sin discard; un ruido de valor
//           (4 hash) por fragmento para el grano del barro cocido.

import { MeshStandardMaterial } from 'three';

/** Crea el material y devuelve también sus uniforms para animarlos. */
export function createBrickMaterial() {
  const uniforms = {
    uPulse: { value: 0 },
    uSpot: { value: [0, 1.25] },
    uSize: { value: [1.35, 1.05] },
  };

  const material = new MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  material.precision = 'mediump';
  // Los uniforms viajan con el material: quien tenga la malla puede animarlos.
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPulse = uniforms.uPulse;
    shader.uniforms.uSpot = uniforms.uSpot;
    shader.uniforms.uSize = uniforms.uSize;

    // Vértice: posición en el mundo, teniendo en cuenta la matriz de cada ladrillo.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOtwWorld;')
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        vec4 otwWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          otwWorld = instanceMatrix * otwWorld;
        #endif
        vOtwWorld = (modelMatrix * otwWorld).xyz;`,
      );

    // Fragmento: grano del ladrillo (albedo y rugosidad) y charco de luz.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vOtwWorld;
        uniform float uPulse;
        uniform vec2 uSpot;
        uniform vec2 uSize;

        // Ruido de valor en 2D; la entrada se envuelve con mod para que mediump no pierda precisión.
        float otwHash(vec2 p) {
          p = mod(p, 97.0);
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        float otwNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(otwHash(i), otwHash(i + vec2(1.0, 0.0)), u.x),
                     mix(otwHash(i + vec2(0.0, 1.0)), otwHash(i + vec2(1.0, 1.0)), u.x), u.y);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // Grano fino del barro y manchas más grandes: ningún ladrillo es liso.
        float otwGrain = otwNoise(vOtwWorld.xy * 55.0) * 0.6 + otwNoise(vOtwWorld.xy * 9.0) * 0.4;
        diffuseColor.rgb *= 0.82 + otwGrain * 0.32;
        // Hollín abajo, junto al suelo.
        diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 0.7, vOtwWorld.y));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - otwGrain * 0.18, 0.55, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // Charco de luz: elipse suave detrás de Michael que crece y brilla con los graves.
        vec2 otwD = (vOtwWorld.xy - uSpot) / (uSize * (0.85 + uPulse * 0.25));
        float otwPool = 1.0 - smoothstep(0.0, 1.0, length(otwD));
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.72, 0.45) * otwPool * uPulse * 1.4;`,
      );
  };

  // Un nombre propio en la caché de programas de three: no se mezcla con otros MeshStandardMaterial.
  material.customProgramCacheKey = () => 'off-the-wall-brick';

  return { material, uniforms };
}
