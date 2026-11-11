// covers/off-the-wall/src/budget.js — techo aceptado para el árbol de esta ruta.
//
// Medido el 2026-11-11 con el BudgetProbe de la galería (panel ?budget), en
// Microsoft Edge (ANGLE D3D11, Intel UHD Graphics del i7-13620H), 1440x900.
// La lectura más alta es la vista "El plató" (96 calls); ver docs/renderer-info.md.
// Cambiar el árbol obliga a cambiar este techo y la tabla en el mismo PR.

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = { calls: 98, triangles: 193000, geometries: 90, textures: 6 };
