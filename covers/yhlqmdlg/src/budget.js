// covers/yhlqmdlg/src/budget.js — GPU budget ceiling for the YHLQMDLG Blender 3D World.
// Course caps (src/lib/budget.js): desktop <= 200 calls, mobile <= 80.
// Our joined Blender 4.2 GLB scene (`yhlqmdlg-world.glb`) + StormSky stays well under 75 calls.

/** @type {import('../../../src/lib/types.js').Ceiling} */
export const CEILING = {
  calls: 75,
  triangles: 25000,
  geometries: 80,
  textures: 4,
};
