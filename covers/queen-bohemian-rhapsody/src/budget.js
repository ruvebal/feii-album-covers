// covers/<slug>/src/budget.js — the accepted ceiling for YOUR tree.
//
// In the Unit 8 fork, CEILING lived in BudgetProbe.jsx. Here the probe is the
// gallery's (src/lib/BudgetProbe.jsx), so your ceiling lives in your folder.
// The panel compares each reading with it.
//
// Leave it null until you have measured your own tree. Then write your reading
// here and the same numbers as a `cover` row in docs/renderer-info.md, with the
// machine and date. Do not copy the beacon's 6 / 1368: they describe another tree.
//
// Shape when filled:
//   export const CEILING = { calls: 0, triangles: 0, geometries: 0, textures: 0 };

// Medido el 2026-11-11 (HeadlessChrome 157, ANGLE/SwiftShader, 1440×900, DPR 1): pico de la intro,
// durante el fundido portada → mundo (t ≈ 1,3–2,3 s), cuando funda, telón y mundo se dibujan a la
// vez. Detalle en docs/renderer-info.md.
// task2 (2026-11-12, misma máquina): geometries 10 → 11 por los móviles (Points). Calls y triángulos
// del pico no cambian: los móviles solo se dibujan de noche, cuando la funda ya no está.
/** @type {import('../../../src/lib/types.js').Ceiling | null} */
// task3 (2026-11-17, misma máquina): GLB de Blender + KTX2. Pico del fundido: 19 calls (estadio, escenario ×2,
// Freddie, micro ×2, multitud LOD0 + LOD1, cielo, portada ×9), 559 733 triángulos, 14 geometrías, 4 texturas
// (funda, vinilo, atlas de Freddie, AO del estadio). Detalle en docs/renderer-info.md.
export const CEILING = { calls: 19, triangles: 559733, geometries: 14, textures: 4 };
