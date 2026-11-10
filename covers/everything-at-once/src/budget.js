// covers/everything-at-once/src/budget.js — accepted ceiling for this tree.
// Measured 6 Nov 2026 (V2 record: 6 diorama layers, sleeve back and edges, vinyl + label), the same in
// every state (rest, a member active, back face, vinyl out): calls 14, triangles 183, geometries 14,
// textures 11. Calls come from src/RouteBudgetProbe.jsx (per-frame draw calls on WebGPURenderer).
// 7 Nov, the disc's rear face and rear label added: calls 16 at rest, 17 with a member selected (its
// ghost) or the vinyl out; triangles 345, geometries 17, textures 12 (docs/renderer-info.md).
// 7 Nov night, Andrés's metronome hero: rest calls 16, triangles 343, geometries 16, textures 13; Andrés
// selected (ghost + the hero's meshes) calls 21, triangles 4793, geometries 19, textures 14.
// 8 Nov, Pavlo's cigarettes (3 sticks + instanced smoke + instanced ember glows, plate and hero textures resident): rest calls 16,
// triangles 343, geometries 16, textures 14; Pavlo selected calls 25, triangles 1527, geometries 21, textures 15.
// 8 Nov, Lucy's sunglasses (frame, lenses, two arms; plate and hero textures resident): rest calls 16,
// triangles 343, geometries 16, textures 15; Lucy selected calls 25, triangles 11589, geometries 21, textures 16.
// 8 Nov, Guille's guitar (one joined mesh of ~12k triangles, drawn in two passes as a transparent double-sided
// material, plus 6 instanced strings; plate and hero textures resident): rest calls 16, triangles 343,
// geometries 16, textures 16; Guille selected calls 20, triangles 24659, geometries 19, textures 17.
// 8 Nov, Javi's controller (body + 9 pressable parts, each its own draw in two passes as a transparent
// double-sided material; plate and hero textures resident): rest calls 16, triangles 343, geometries 16,
// textures 17; Javi selected calls 33, triangles 14733, geometries 27, textures 18.
// 8 Nov, the star's infinity mirror (the card's material: no new draw; + the R8 star SDF): rest calls 16,
// triangles 343, geometries 16, textures 18; Javi selected calls 33, triangles 14733, geometries 27, textures 19.
// 10 Nov, the full-page backdrop (one full-screen quad behind the record: one big analytic star, no texture): +1 call and
// +1 geometry in every state, +0 textures. The canvas is now the viewport, so hero parts beyond the sleeve's edge are
// no longer culled (Javi's controller): rest calls 17, triangles 345, geometries 17, textures 18; Javi selected
// calls 38, triangles 15071, geometries 28, textures 19 (Lucy/Pavlo 26, Andrés 22, Guille 21 calls).

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = { calls: 38, triangles: 25000, geometries: 28, textures: 19 };
