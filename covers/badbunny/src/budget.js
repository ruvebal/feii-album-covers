// covers/badbunny/src/budget.js — GPU budget ceiling for the Bad Bunny 3D Worlds (`/covers/badbunny`).
// Course caps (src/lib/budget.js): desktop <= 200 calls, mobile <= 80.
// Our joined Blender 4.2 GLB scene (`yhlqmdlg-world.glb`) + StormSky stays well under 75 calls.

/** @type {import('../../../src/lib/types.js').Ceiling} */
export const CEILING = {
  calls: 95,
  triangles: 40000,
  geometries: 95,
  textures: 14,
};
