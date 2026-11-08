// covers/everything-at-once — the heroes' shared state (one diorama exists at a time, like its uniforms).

import { uniform } from 'three/tsl';

export const BPM = 96; // fixed tempo while the sound is off (DIRECTION-v2 §8)

/** Per member: the GLB, its texture and the moving parts. */
export const HEROES = {
  andres: {
    glb: new URL('../public/hero-andres.glb', import.meta.url).href,
    tex: new URL('../public/hero-andres.ktx2', import.meta.url).href,
    swing: 'Metronome_pendulum', // pivot empty at the rod's foot; swings about its local y
    // Karu's ink vs the model's cover-view silhouette: image-space rotation (rad), scale and shift (cover ndc)
    // from scripts/hero_fit.py (IoU 0.798 -> 0.888). Applied at the handoff, relaxed as the hero rises.
    fit: { rot: 0.036, scale: 0.98969, shift: [-0.05938, 0.00813] },
  },
};
const each = (f) => Object.fromEntries(Object.keys(HEROES).map((n) => [n, f()]));

/** Riso kick on the beat (Diorama's layer adds it to its own shift). */
export const BEAT = each(() => 0);
/** 0 = the drawing, 1 = the under-plate with the 3D hero over it (Hero.jsx drives it, the layer reads it). */
export const SHOW = each(() => uniform(0));
/** Whether a song is audible (Route.jsx writes it): the beat's riso kick runs only with the music on. */
export const AUDIO = { playing: false };
