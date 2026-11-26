// crowdSite.js — dónde se coloca la multitud de Crowd.jsx (placeholders de task1 o GLB de task3).
// Módulo aparte: Crowd.jsx solo exporta componentes (fast refresh).

import { FLOOR_Y } from './placeholders.js';

/**
 * Dónde va la multitud. Las filas de la grada (STAND_R0, STAND_DEPTH, STAND_RISE, STAND_ROWS) son las
 * mismas en los placeholders y en el GLB de Blender (medidas en el .blend); cambian el suelo, el centro
 * de la grada, el hueco del escenario y el césped.
 *
 * @typedef {object} CrowdSite
 * @property {number} floorY Altura del césped.
 * @property {number} centerZ Centro de la grada en Z (Freddie está en el origen).
 * @property {{ halfX: number, minZ: number } | null} gap Sin fans de grada donde |x| < halfX y z > minZ (hueco del escenario).
 * @property {{ radius: number, maxZ: number } | null} grass Césped circular alrededor del centro; null = semicírculo de task1.
 * @property {[number, number, number] | null} phone Móvil en coordenadas locales del fan (+Z al escenario); null = mano al azar.
 */

/** @type {CrowdSite} Placeholders de task1 (placeholders.js). */
export const PLACEHOLDER_SITE = { floorY: FLOOR_Y, centerZ: 0, gap: null, grass: null, phone: null };

/**
 * @type {CrowdSite} GLB de Blender (fila 18 del merge log): césped a −2,2, grada centrada en z = −22,
 * hueco de la tarima (x = ±7) y frente del escenario en z ≈ −2,2. El móvil de Fan_LOD0 está en (0,245; 1,54; 0,40).
 */
export const GLB_SITE = {
  floorY: -2.2,
  centerZ: -22,
  gap: { halfX: 7.5, minZ: -6 },
  grass: { radius: 20.5, maxZ: -4 },
  phone: [0.245, 1.54, 0.4],
};
