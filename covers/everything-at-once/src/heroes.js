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
  lucy: {
    glb: new URL('../public/hero-lucy.glb', import.meta.url).href,
    tex: new URL('../public/hero-lucy.ktx2', import.meta.url).href,
    fold: { Arm_upper: 1, Arm_lower: -1 }, // hinge pivots (hero_pivots.py); each opens away from the lenses
    glint: 'lenses',
    tilt: 0.6, // rad on the long axis while performing, so the arms' swing shows
    // scripts/hero_fit.py lucy: IoU 0.557 -> 0.842
    fit: { rot: 0.03054, scale: 0.95875, shift: [0.04, -0.0225] },
  },
  pavlo: {
    glb: new URL('../public/hero-pavlo.glb', import.meta.url).href,
    tex: new URL('../public/hero-pavlo.ktx2', import.meta.url).href,
    ember: { Cigar_1: 0.7474, Cigar_2: 0.7474, Cigar_3: 0.7474 }, // tip along each pivot's local y (hero_fit_parts.py)
    bob: ['Cigar_1', 'Cigar_2', 'Cigar_3'], // pivot empties at each cigarette's centre: one hops per beat, in turn
    // Each cigarette laid on its drawn stick in the cover view (scripts/hero_fit_parts.py: misses of 80-360 px
    // down to <= 6 px), kept while it rises and hops (user, 8 Nov). Cigar_3 is raised to lie over Cigar_2, as drawn,
    // clear of its hop.
    // glTF position and quaternion per pivot.
    place: {
      Cigar_1: { position: [2.47263, 0.10412, 1.89651], quaternion: [0.175641, -0.106471, -0.709515, 0.674094] },
      Cigar_2: { position: [1.90554, 0.12303, 2.53883], quaternion: [0.311165, -0.329013, -0.65878, 0.600779] },
      Cigar_3: { position: [1.68942, 0.38595, 2.77114], quaternion: [0.421329, -0.421328, -0.567875, 0.567875] },
    },
    fit: { rot: 0, scale: 1, shift: [0, 0] }, // the parts are placed; no whole-hero fit
  },
};
const each = (f) => Object.fromEntries(Object.keys(HEROES).map((n) => [n, f()]));

/** Riso kick on the beat (Diorama's layer adds it to its own shift). */
export const BEAT = each(() => 0);
/** 0 = the drawing, 1 = the under-plate with the 3D hero over it (Hero.jsx drives it, the layer reads it). */
export const SHOW = each(() => uniform(0));
/** The ember's breathing glow, 0..1 (Hero.jsx drives it; only heroes with `ember` read it). */
export const GLOW = each(() => uniform(0));
/** Where the lens glint is across the lenses (Hero.jsx drives it; one hero performs at a time). */
export const SWEEP = uniform(-1);
/** Whether a song is audible (Route.jsx writes it): the beat's riso kick runs only with the music on. */
export const AUDIO = { playing: false };
