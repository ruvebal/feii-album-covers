// covers/everything-at-once — the heroes' shared state (one diorama exists at a time, like its uniforms).

import { uniform } from 'three/tsl';

export const BPM = 96; // fixed tempo while the sound is off (DIRECTION-v2 §8); a playing song sets its own

/** Per member: the GLB, its texture and the moving parts. */
export const HEROES = {
  andres: {
    glb: new URL('../public/hero-andres.glb', import.meta.url).href,
    tex: new URL('../public/hero-andres.ktx2', import.meta.url).href,
    swing: 'Metronome_pendulum', // pivot empty at the rod's foot; swings about its local y
    // Karu's ink vs the model's cover-view silhouette: image-space rotation (rad), scale and shift (cover ndc)
    // from scripts/hero_fit.py (IoU 0.798 -> 0.888). Applied at the handoff, relaxed as the hero rises.
    // Up, it shrinks towards its middle on the sleeve, so it clears the hint and the navigation (user, 10 Nov).
    shrink: { to: 0.8, at: [-0.25, -0.65] },
    fit: { rot: 0.036, scale: 0.98969, shift: [-0.05938, 0.00813] },
  },
  lucy: {
    glb: new URL('../public/hero-lucy.glb', import.meta.url).href,
    tex: new URL('../public/hero-lucy.ktx2', import.meta.url).href,
    fold: { Arm_upper: 1, Arm_lower: -1 }, // hinge pivots (hero_pivots.py); each opens away from the lenses
    glint: 'lenses',
    tilt: 0.6, // rad on the long axis while performing, so the arms' swing shows
    half: true, // plays at half the song's tempo: 170 BPM made the arms flap (user, 8 Nov)
    // Up, it shrinks towards its middle on the sleeve, so the frames stay on the page (user, 10 Nov).
    shrink: { to: 0.82, at: [-0.35, 0.6] },
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
  guille: {
    glb: new URL('../public/hero-guille.glb', import.meta.url).href,
    tex: new URL('../public/hero-guille.ktx2', import.meta.url).href,
    // The six strings, saddle -> nut, glTF space (Blender's string curves are not in the GLB: the route draws them).
    strings: [
      [[-3.751, 0.71, 4.454], [-6.781, 0.68, -6.07]], // low E
      [[-3.589, 0.71, 4.405], [-6.664, 0.68, -6.105]], // A
      [[-3.428, 0.71, 4.357], [-6.547, 0.68, -6.14]], // D
      [[-3.279, 0.71, 4.312], [-6.43, 0.68, -6.175]], // G
      [[-3.111, 0.71, 4.262], [-6.314, 0.68, -6.21]], // B
      [[-2.943, 0.71, 4.212], [-6.198, 0.68, -6.244]], // high E
    ],
    // The guitar is ~2.5 sleeves long and mostly off the cover; it sticks out (user, 8 Nov), shrinking to `shrink`
    // as it rises, so on the full-page canvas it no longer covers the page (user, 10 Nov).
    // It rises a little along the ray through its body (glTF; the body's centre in Blender), not its box centre,
    // so the drawn body stays put; then the neck swings out past the sleeve's edge and rocks on the beat.
    anchor: [-3.595, 0.3, 3.431],
    rise: 0.05, // of the hero's size (RISE is for hand-sized props)
    shrink: { to: 0.34, at: [-0.7, -0.5] }, // up, it is this size, shrunk towards where it enters the sleeve
    rock: { out: 0.12, beat: 0.06 }, // rad about the page normal through the anchor: swung out, then +- on the beat

    fit: { rot: 0, scale: 0.93906, shift: [-0.02, 0] },
  },
  javi: {
    glb: new URL('../public/hero-javi.glb', import.meta.url).href,
    tex: new URL('../public/hero-javi.ktx2', import.meta.url).href,
    // Pivot empties carrying their press direction and depth (extras, scripts/controller_rig.py): with a song
    // playing one presses per beat, in this order; the D-pad tips towards an arm instead. The stick circles.
    press: ['A_low-pivot', 'B_low-pivot', 'direction_low-pivot', 'C1-pivot', 'C2-pivot', 'C3-pivot', 'C4-pivot', 'start_low-pivot'],
    dpad: 'direction_low-pivot',
    stick: 'joystick_low-pivot',
    // Up, it shrinks towards its middle on the sleeve, so it stays clear of the credits (user, 10 Nov).
    shrink: { to: 0.64, at: [0.55, 0.62] },
    // Fitted on four landmarks (D-pad, Start, the two round buttons above it; 2.3 px rms on the 1024 cover), not the
    // silhouette: the fingers hide the drawn controller's right half, so an IoU fit dragged it 70 px off.
    fit: { rot: -0.00661, scale: 0.94819, shift: [-0.03886, -0.03258] },
  },
};
const each = (f) => Object.fromEntries(Object.keys(HEROES).map((n) => [n, f()]));

/** Riso kick on the beat (Diorama's layer adds it to its own shift). */
export const BEAT = each(() => 0);
/** 0 = the drawing, 1 = the under-plate with the 3D hero over it (Hero.jsx drives it, the layer reads it). */
export const SHOW = each(() => uniform(0));
/** How far each hero is up, 0..1 (Hero.jsx writes it): a newly selected side waits until the last hero is down. */
export const UP = each(() => 0);
/** No other hero is still drawn (switching members: the new side and hero wait, or the last one showed through). */
export const clearFor = (name) => Object.keys(UP).every((n) => n === name || UP[n] === 0);
/** The ember's breathing glow, 0..1 (Hero.jsx drives it; only heroes with `ember` read it). */
export const GLOW = each(() => uniform(0));
/** Where the lens glint is across the lenses (Hero.jsx drives it; one hero performs at a time). */
export const SWEEP = uniform(-1);
/** How hard the guitar's strings vibrate, 0..1 (Hero.jsx drives it on the beat, only with the music on). */
export const STRUM = uniform(0);
/**
 * Whether a song is audible, and its clock (Route.jsx writes both): the beat's riso kick runs only with the
 * music on, and the heroes play on the song's beat.
 * @type {{ playing: boolean, clock: (() => { bpm: number, beat: number } | null) | null }}
 */
export const AUDIO = { playing: false, clock: null };
