// covers/bia/src/budget.js — accepted ceiling for the BIA route.
//
// Measured 2026-11-19 with the gallery BudgetProbe in Chromium via local Vite.
// Change the route tree only with a matching update to this ceiling and
// docs/renderer-info.md.

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
export const CEILING = {
  calls: 6,
  triangles: 644886,
  geometries: 4,
  textures: 3,
};
