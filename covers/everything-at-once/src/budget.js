// covers/everything-at-once/src/budget.js — accepted ceiling for this tree.
// Measured 6 Nov 2026 (V2 record: 6 diorama layers, sleeve back and edges, vinyl + label), the same in
// every state (rest, a member active, back face, vinyl out): calls 14, triangles 183, geometries 14,
// textures 11. Calls come from src/RouteBudgetProbe.jsx (per-frame draw calls on WebGPURenderer).
// 7 Nov, the disc's rear face and rear label added: calls 16 at rest, 17 with a member selected (its
// ghost) or the vinyl out; triangles 345, geometries 17, textures 12 (docs/renderer-info.md).
// Re-measure when the tree changes (heroes next).

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = { calls: 18, triangles: 400, geometries: 18, textures: 12 };
