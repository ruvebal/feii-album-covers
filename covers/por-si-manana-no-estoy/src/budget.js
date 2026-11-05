// covers/por-si-manana-no-estoy/src/budget.js — techo aceptado para ESTE árbol.
// Mismos números que la fila `cover` de docs/renderer-info.md (medidos con ?budget).
// La galería no monta su BudgetProbe aquí (es R3F y esta ruta usa Three.js directo):
// el panel propio de Route.jsx lee renderer.info y se compara a mano con este techo.

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = { calls: 32, triangles: 210000, geometries: 30, textures: 21 };
