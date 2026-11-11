// covers/everything-at-once — drag-to-turn: the sleeve's free rotation and which face it settles on.
//
// One record exists at a time, so the gesture lives in this module (like Diorama's uniforms): Route's
// pointer handlers write it, Record's frame loop reads it, with no allocation per frame. Dragging rotates
// freely about the screen axes; only the horizontal turn decides the face. On release the record coasts
// briefly, then settles upright: |horizontal turn| >= 100 deg (after the coast, whole turns removed)
// selects the other face, anything less returns to the starting face.
// The same pointer flow serves the vinyl: a gesture that starts on its edge (or the exposed disc) pulls it
// along the sleeve's own x axis instead of turning. Turning is by dragging only (user, 7 Nov).

import { Quaternion, Vector3 } from 'three/webgpu';

export const TAP = 6; // px: less travel than this is a tap
export const DEG_PER_PX = 0.5; // 180 deg = 360 px: about half the desktop stage, most of a phone's
export const THRESHOLD = 100; // deg of horizontal turn that selects the other face
export const PULL_OUT = 0.4; // released past this much of the way out, the vinyl comes out
const COAST_DECAY = 6; // 1/s: velocity decays as exp(-COAST_DECAY t)
const COAST_TIME = 0.35; // s
const COAST_GAIN = (1 - Math.exp(-COAST_DECAY * COAST_TIME)) / COAST_DECAY; // displacement per unit velocity
const STILL = 60; // ms without movement before release: no coast
const MAX_V = 1200; // deg/s
const RAD = Math.PI / 180;
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const tmp = new Quaternion();

export const FACES = { front: new Quaternion(), back: new Quaternion().setFromAxisAngle(Y, Math.PI) };

export const TURN = {
  mode: 'idle', // 'pending' (pointer down, < TAP), 'drag', 'coast', 'idle'
  id: -1, // the pointer that owns the gesture
  x0: 0,
  y0: 0,
  x: 0,
  y: 0,
  t: 0,
  yaw: 0, // deg of horizontal turn since the drag began
  vx: 0, // deg/s
  vy: 0,
  coast: 0, // s of coast left
  startFace: 'front',
  q: new Quaternion(), // shown orientation (Record writes it)
  target: new Quaternion(), // where the drag has put the record
  flat: 1, // 1 = layers at their depths, 0 = flattened onto the sleeve (Diorama reads it)
  drags: 0, // gestures that became a drag (the checks assert a drag really happened)
  zone: 'sleeve', // where the gesture started: 'sleeve' or 'vinyl'
  pull: 0, // vinyl dragged: how far out (0 in, 1 out), followed directly by Record
  pull0: 0,
  shownOut: 0, // how far out the vinyl is shown (Record writes it)
  axisX: 1, // screen px the disc travels from in to out (Record writes it each frame)
  axisY: 0,
  dragX: 1, // ... frozen when a pull starts: the camera pulls back as the disc comes out, which would
  dragY: 0, // otherwise shrink the path under the pointer and run the disc ahead of it
  peek: false, // a mouse over the vinyl edge: the disc peeks out
  hint: false, // the first visit's guidance: the disc peeks out by itself (Route's Opening drives it)
  fore: null, // the member foreground's element: Record writes whether it shows
  hull: null, // the DOM hit polygons' point lists (Route binds them, Record writes them each frame)
  vinylZone: null,
};

export function resetTurn(face = 'front') {
  Object.assign(TURN, { mode: 'idle', id: -1, yaw: 0, vx: 0, vy: 0, coast: 0, flat: 1, startFace: face, zone: 'sleeve', peek: false, hint: false });
  TURN.q.copy(FACES[face]);
  TURN.target.copy(FACES[face]);
}

/** Rotate the target about the screen's axes (world X/Y: the camera looks down -Z). */
export function rotateBy(dxDeg, dyDeg) {
  TURN.target.premultiply(tmp.setFromAxisAngle(Y, dxDeg * RAD));
  TURN.target.premultiply(tmp.setFromAxisAngle(X, dyDeg * RAD));
  TURN.target.normalize();
}

/** The face a horizontal turn of `yaw` deg settles on: whole turns removed, then the 100 deg rule. */
export function faceAfter(startFace, yaw) {
  const n = ((((yaw + 180) % 360) + 360) % 360) - 180; // [-180, 180)
  const turned = Math.abs(Math.round(n * 1e6) / 1e6) >= THRESHOLD;
  return turned ? (startFace === 'front' ? 'back' : 'front') : startFace;
}

/** Pointer down on a hit zone: a gesture is pending until it travels TAP px. */
export function press(e, face, zone = 'sleeve') {
  Object.assign(TURN, { mode: 'pending', id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp, startFace: face, zone });
}

/** @returns {boolean} true once the gesture is a drag */
export function move(e) {
  if (e.pointerId !== TURN.id) return false;
  if (TURN.mode === 'pending') {
    if (Math.hypot(e.clientX - TURN.x0, e.clientY - TURN.y0) < TAP) return false;
    Object.assign(TURN, { mode: 'drag', yaw: 0, vx: 0, vy: 0, drags: TURN.drags + 1, pull0: TURN.shownOut, pull: TURN.shownOut, dragX: TURN.axisX, dragY: TURN.axisY });
    if (TURN.zone !== 'vinyl') TURN.target.copy(TURN.q); // grab the record where it is shown
    TURN.x = TURN.x0; // the travel before the threshold counts too
    TURN.y = TURN.y0;
  }
  if (TURN.mode !== 'drag') return false;
  if (TURN.zone === 'vinyl') {
    // the pointer's travel projected on the disc's own screen path (it turns with the record)
    const len2 = Math.max(1, TURN.dragX * TURN.dragX + TURN.dragY * TURN.dragY);
    const along = ((e.clientX - TURN.x0) * TURN.dragX + (e.clientY - TURN.y0) * TURN.dragY) / len2;
    TURN.pull = Math.max(0, Math.min(1, TURN.pull0 + along));
    return true;
  }
  const dx = (e.clientX - TURN.x) * DEG_PER_PX;
  const dy = (e.clientY - TURN.y) * DEG_PER_PX;
  const dt = Math.max(1, e.timeStamp - TURN.t) / 1000;
  const clamp = (v) => Math.max(-MAX_V, Math.min(MAX_V, v));
  TURN.vx = clamp(TURN.vx * 0.5 + (dx / dt) * 0.5);
  TURN.vy = clamp(TURN.vy * 0.5 + (dy / dt) * 0.5);
  Object.assign(TURN, { x: e.clientX, y: e.clientY, t: e.timeStamp });
  TURN.yaw += dx;
  rotateBy(dx, dy);
  return true;
}

/**
 * Pointer up/cancel. Returns `{ tap: zone }` for a tap, `{ out }` after a vinyl drag (cancelled: as it was),
 * `{ face }` after a turn (after the coast; the starting face if cancelled), or null (not this gesture,
 * or a cancelled tap).
 * @param {{ pointerId: number, timeStamp: number }} e @param {boolean} cancel @param {boolean} reduced
 * @returns {{ tap: string } | { out: boolean } | { face: string } | null}
 */
export function release(e, cancel, reduced) {
  if (e.pointerId !== TURN.id) return null;
  const was = TURN.mode;
  TURN.id = -1;
  if (was !== 'drag') {
    TURN.mode = 'idle';
    return cancel ? null : { tap: TURN.zone };
  }
  if (TURN.zone === 'vinyl') {
    TURN.mode = 'idle';
    return { out: cancel ? TURN.pull0 > PULL_OUT : TURN.pull > PULL_OUT };
  }
  if (cancel) {
    TURN.mode = 'idle'; // cancelled (a pinch took over, capture lost): back to the starting face
    return { face: TURN.startFace };
  }
  if (reduced || e.timeStamp - TURN.t > STILL) TURN.vx = TURN.vy = 0;
  TURN.mode = TURN.vx || TURN.vy ? 'coast' : 'idle';
  TURN.coast = COAST_TIME;
  return { face: faceAfter(TURN.startFace, TURN.yaw + TURN.vx * COAST_GAIN) };
}

/** Frame step of the coast (Record). */
export function coastStep(dt) {
  if (TURN.mode !== 'coast') return;
  const step = Math.min(dt, TURN.coast);
  const k = (1 - Math.exp(-COAST_DECAY * step)) / COAST_DECAY; // exact integral over the step
  rotateBy(TURN.vx * k, TURN.vy * k);
  const d = Math.exp(-COAST_DECAY * step);
  TURN.vx *= d;
  TURN.vy *= d;
  TURN.coast -= step;
  if (TURN.coast <= 0) TURN.mode = 'idle';
}
