// covers/currents/src/budget.js — techo aceptado para ESTE árbol.
// Mismos números que la fila `cover` de docs/renderer-info.md (medidos con ?budget).
// La galería no monta su BudgetProbe aquí (es R3F y esta ruta usa Three.js directo):
// el panel propio de scene.js lee renderer.info y se compara a mano con este techo.

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = { calls: 32, triangles: 330000, geometries: 40, textures: 6 };
