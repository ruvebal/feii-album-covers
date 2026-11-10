// covers/everything-at-once — the record: a sleeve (front diorama, Karu's back face) and the vinyl.
//
// The sleeve tilts a few degrees towards the pointer on a spring (no OrbitControls), turns freely while
// dragged (turn.js decides the face it settles on) and lets the vinyl slide out of its open (right)
// edge, spinning, with Karu's label on both faces. The disc is pulled by hand (turn.js) or by a tap on its
// edge; a sliver always shows on the front so it reads as something to pull, and a mouse over the edge
// makes it peek further. While the vinyl
// is out the camera pulls back so the whole motion stays on the stage. Each frame also projects the DOM hit
// zones: the sleeve's outline and the vinyl's edge (or the exposed disc), and shows the member's text while their
// hero is presented.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { MathUtils, Vector3 } from 'three/webgpu';
import { color, float, length, mix, sin, uv, vec3 } from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { faceMaterial, MIRROR, mirrorMaterial, BACKDROP, BIG, backdropMaterial, useReleaseOnUnmount } from './materials.js';
import LAYERS from './layers.json';
import { MEMBERS } from './members.js';
import Diorama, { FRONT_Z, HALF_FOV_TAN, VIEW_DISTANCE } from './Diorama.jsx';
import { OUT_SPAN, recordBox } from './frame.js';
import { coastStep, FACES, TURN } from './turn.js';
import { AUDIO, BPM } from './heroes.js';

const BACK_URL = new URL('../public/back.ktx2', import.meta.url).href;
const LABEL_URL = new URL('../public/label.ktx2', import.meta.url).href;
const SPINE_URL = new URL('../public/spine.ktx2', import.meta.url).href;
const FILL_URL = new URL('../public/star-fill.ktx2', import.meta.url).href;
const SDF_URL = new URL('../public/star-sdf.ktx2', import.meta.url).href;
const CARD_Z = FRONT_Z - 0.0005; // the card (the star's floor) sits just under the layers
const REST = 0; // the mirror's intensity at rest: head-on there is no mirror, only Karu's cover
const THICK = FRONT_Z * 2;
const TILT = 0.07; // radians at the stage's edge
const DISC = 0.96; // vinyl radius (the sleeve is 2 x 2)
const SPIN = (33.3 / 60) * Math.PI * 2; // 33 1/3 rpm
const TRAVEL = 1.15; // disc centre at full extraction: about 60 % of the disc out
const PEEK = 0.16; // mouse over the edge: the disc comes out a little further
const SLIVER = 0.085; // about 3 % of the disc stays visible while tucked in
const ZONE_PX = 44; // the tucked disc's hit strip: 44 CSS px wide on screen, no more (it reaches into the sleeve
// only as far as that needs, so it stays off the members' sides on large screens; user, 10 Nov)
const ZONE_MIN = 0.04; // sleeve units: never thinner than this inside the edge
const approach = (v, target, dt, rate) => v + (target - v) * Math.min(1, dt * rate);
const FLAT_FROM = 25; // deg from upright where the shadow box starts to flatten onto the sleeve
const FLAT_TO = 45;
// The sleeve's corners, for the projected hit polygon (preallocated: written every frame).
const CORNERS = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(x, y, z * FRONT_Z))));
const P = CORNERS.map(() => new Vector3());
const STAR = new Vector3(); // the star's centre, projected for the backdrop star
const ORDER = new Int8Array(8);
const HULL = new Int8Array(9);
const byX = (a, b) => P[a].x - P[b].x || P[a].y - P[b].y;
const cross = (o, a, b) => (P[a].x - P[o].x) * (P[b].y - P[o].y) - (P[a].y - P[o].y) * (P[b].x - P[o].x);

/** Convex hull (monotone chain) of the 8 projected corners into `TURN.hull` (an 8-point SVG polygon). */
function writeHull(size) {
  for (let i = 0; i < 8; i++) ORDER[i] = i;
  ORDER.sort(byX);
  let k = 0;
  for (let i = 0; i < 8; i++) {
    while (k >= 2 && cross(HULL[k - 2], HULL[k - 1], ORDER[i]) <= 0) k--;
    HULL[k++] = ORDER[i];
  }
  for (let i = 6, lo = k + 1; i >= 0; i--) {
    while (k >= lo && cross(HULL[k - 2], HULL[k - 1], ORDER[i]) <= 0) k--;
    HULL[k++] = ORDER[i];
  }
  k--; // the last point repeats the first
  const pts = TURN.hull;
  for (let i = 0; i < 8; i++) {
    const c = P[HULL[Math.min(i, k - 1)]]; // unused slots repeat the last hull point
    const pt = pts.getItem(i);
    pt.x = ((c.x + 1) / 2) * size.width;
    pt.y = ((1 - c.y) / 2) * size.height;
  }
}

const Q = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
const OFF = -1000; // px: a hidden zone collapses off the stage
/** A sleeve-local rectangle (x0..x1, -y..y, mid-plane) projected into a 4-point SVG polygon. */
function writeQuad(pts, x0, x1, y, matrix, camera, size) {
  if (!pts) return;
  Q[0].set(x0, -y, 0);
  Q[1].set(x1, -y, 0);
  Q[2].set(x1, y, 0);
  Q[3].set(x0, y, 0);
  for (let i = 0; i < 4; i++) {
    const c = Q[i].applyMatrix4(matrix).project(camera);
    const pt = pts.getItem(i);
    pt.x = ((c.x + 1) / 2) * size.width;
    pt.y = ((1 - c.y) / 2) * size.height;
  }
}
function hideQuad(pts) {
  if (!pts) return;
  for (let i = 0; i < 4; i++) {
    const pt = pts.getItem(i);
    pt.x = pt.y = OFF;
  }
}

/** The member whose title on the back is under `uv` (image top-left origin in layers.json), or null. */
function titleAt(uv) {
  if (!uv) return null;
  const x = uv.x, y = 1 - uv.y;
  return Object.keys(LAYERS.tracks).find((id) => {
    const [x0, y0, x1, y1] = LAYERS.tracks[id];
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }) ?? null;
}

function useVinylMaterial() {
  return useMemo(() => {
    // Black vinyl with fine grooves and a soft sheen band; the label is a separate disc.
    const r = length(uv().sub(0.5)).mul(2);
    const grooves = sin(r.mul(520)).mul(0.5).add(0.5).mul(0.05);
    const sheen = float(1).sub(r.sub(0.62).abs().mul(6)).clamp(0, 1).mul(0.12);
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = mix(color('#0d0a10'), vec3(1), grooves.add(sheen));
    return m;
  }, []);
}

/**
 * @param {{ face: 'front' | 'back', out: boolean, reduced: boolean, active: string | null, hoverable: boolean,
 *   spread: { current: number }, onHover: (id: string | null) => void, onSelect: (id: string) => void,
 *   onBlank: () => void, onBack: (id: string | null) => void }} props
 */
export default function Record({ face, out, reduced, active, hoverable, spread, onHover, onSelect, onBlank, onBack }) {
  const back = useKTX2Texture(BACK_URL);
  const label = useKTX2Texture(LABEL_URL);
  const spine = useKTX2Texture(SPINE_URL);
  const fill = useKTX2Texture(FILL_URL);
  const sdf = useKTX2Texture(SDF_URL); // data: NoColorSpace and clamped from the loader
  const mats = useMemo(
    () => ({
      back: faceMaterial(back),
      label: faceMaterial(label, { transparent: true }),
      spine: faceMaterial(spine),
      card: mirrorMaterial(fill, sdf, LAYERS.mirror), // the cover's star yellow + the infinity mirror
      backdrop: backdropMaterial(), // the one big star behind the record
    }),
    [back, label, spine, fill, sdf],
  );
  const vinyl = useVinylMaterial();
  useReleaseOnUnmount([BACK_URL, LABEL_URL, SPINE_URL, FILL_URL, SDF_URL], [back, label, spine, fill, sdf]);
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      vinyl.dispose();
    },
    [mats, vinyl],
  );

  const tilt = useRef();
  const flip = useRef();
  const disc = useRef();
  const spin = useRef();
  const s = useRef({ rx: 0, ry: 0, out: 0, cam: 0, w: 0, h: 0, box: null, beat: 0 });
  useFrame(({ pointer, camera, size }, delta) => {
    const dt = Math.min(delta, 0.05); // back from a hidden tab: no snap, no jump in the vinyl's spin
    const st = s.current;
    // The page is the canvas: the sleeve at rest fills the rest box (recordBox), from the same distance as ever,
    // so the layers' depth compensation and the heroes' registration hold. Only the frustum changes: the field of
    // view scales the sleeve to the box and the view offset centres it there.
    if (size.width !== st.w || size.height !== st.h) {
      st.w = size.width;
      st.h = size.height;
      st.box = recordBox(size.width, size.height);
      const { S, x, y } = st.box;
      camera.fov = (2 * Math.atan((HALF_FOV_TAN * size.height) / S) * 180) / Math.PI;
      camera.setViewOffset(size.width, size.height, size.width / 2 - x, size.height / 2 - y, size.width, size.height);
      camera.updateProjectionMatrix();
    }
    const rate = reduced ? 1e9 : 6;
    const k = reduced ? 1 : dt;
    const still = TURN.mode === 'idle' || TURN.mode === 'pending';
    // No hover tilt while handled, nor while a side is selected: the record holds still under its hero (user, 7 Nov).
    const sway = still && !active && !reduced;
    const rx0 = st.rx, ry0 = st.ry;
    st.rx = approach(st.rx, sway ? -pointer.y * TILT : 0, k, rate);
    st.ry = approach(st.ry, sway ? pointer.x * TILT : 0, k, rate);
    // Turning: the drag (or its coast) moves the target; otherwise it is the upright face. The shown
    // orientation follows more slowly than the cursor.
    coastStep(dt);
    if (still) TURN.target.copy(FACES[face]);
    if (reduced) TURN.q.copy(TURN.target);
    else TURN.q.slerp(TURN.target, 1 - Math.exp(-dt * (TURN.mode === 'drag' ? 12 : 7)));
    // Angle to the nearest upright face (front = identity, back = half turn about y).
    const near = (2 * Math.acos(Math.min(1, Math.max(Math.abs(TURN.q.w), Math.abs(TURN.q.y))))) / MathUtils.DEG2RAD;
    TURN.flat = 1 - MathUtils.smoothstep(near, FLAT_FROM, FLAT_TO);
    // The vinyl: followed directly while pulled by hand; otherwise out, peeking, a touch sliver or in.
    const pulling = TURN.zone === 'vinyl' && TURN.mode === 'drag';
    const settled = face === 'front' && still && near < 2; // extraction starts only once upright
    const tucked = settled ? (TURN.peek || TURN.hint ? PEEK : SLIVER) : 0;
    st.out = pulling ? TURN.pull : approach(st.out, out ? 1 : tucked, k, reduced ? 1e9 : 4);
    TURN.shownOut = st.out;
    // The opening: the record arrives a little tilted and further back and settles in as the layers
    // spread to their depths (head-on the spread alone is invisible: the layers are scale-compensated).
    const o = 1 - spread.current;
    const e = o * o * (3 - 2 * o); // smoothstep: eases into place
    tilt.current.rotation.set(st.rx + e * 0.45, st.ry - e * 0.35, e * 0.06);
    tilt.current.position.z = -e * 0.9;
    flip.current.quaternion.copy(TURN.q);
    disc.current.position.x = st.out * TRAVEL;
    if (!reduced && out && st.out > 0.3) spin.current.rotation.z -= SPIN * dt; // it plays only once out
    // The mirror deepens while the record moves: turned away from upright (either face: the settled back is
    // rest too), arriving in the opening, or tilting as the pointer moves. A tilt held towards a resting pointer
    // is rest: back to 0.
    const tiltSpeed = Math.hypot(st.rx - rx0, st.ry - ry0) / Math.max(dt, 1e-3); // rad/s
    const motion = Math.min(1, Math.max(near / 20, e, tiltSpeed / 0.15));
    MIRROR.amount.value = reduced ? REST : approach(MIRROR.amount.value, REST + (1 - REST) * motion, dt, 5);
    const tint = MEMBERS.find((mb) => mb.id === active)?.tint;
    if (tint) MIRROR.tint.value.set(tint);
    MIRROR.tintMix.value = approach(MIRROR.tintMix.value, tint ? 1 : 0, k, rate);
    if (!reduced) MIRROR.shimmer.value = (MIRROR.shimmer.value + dt * 1.6) % (Math.PI * 2); // the lights' shimmer runs
    // With the vinyl out, centre sleeve + disc, towards the side the disc comes out of (the sleeve's x axis faces
    // the other way on the back), and pull back only as far as the page needs to fit them.
    const q = TURN.q;
    const cx = st.out * 0.57 * (1 - 2 * (q.y * q.y + q.z * q.z));
    const pull = Math.max(0, VIEW_DISTANCE * ((OUT_SPAN * st.box.S) / st.box.room - 1));
    camera.position.set(cx, 0, VIEW_DISTANCE + FRONT_Z + st.out * pull);
    camera.lookAt(cx, 0, 0);
    flip.current.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    const m = flip.current.matrixWorld;
    flip.current.worldToLocal(MIRROR.cam.value.copy(camera.position)).z -= CARD_Z; // into the card's space
    // The backdrop star sits on the record's star centre, at the record's scale (opening: pushed back, larger).
    const [sx, sy] = LAYERS.mirror.centre;
    const c = STAR.set(sx * 2 - 1, sy * 2 - 1, CARD_Z).applyMatrix4(m).project(camera);
    BACKDROP.centre.value.set(((c.x + 1) / 2) * size.width, ((1 - c.y) / 2) * size.height);
    BACKDROP.unit.value = ((st.box.S / 2) * VIEW_DISTANCE) / (VIEW_DISTANCE + st.out * pull + e * 0.9);
    // Settled, the whole star stays on the page (user, 10 Nov: the top tip ran off): tip to lower tips (0.809 of
    // the radius down) fits between margins at the top and bottom, and the star moves down off the record's star
    // only as far as that needs. Its lower tips fall either side of the navigation's buttons.
    const gap = 1.5 * st.box.rem;
    const r = Math.min(BACKDROP.unit.value * BIG, (size.height - 2 * gap) / 1.809);
    BACKDROP.unit.value = r / BIG;
    BACKDROP.centre.value.y = MathUtils.clamp(BACKDROP.centre.value.y, gap + r, size.height - gap - 0.809 * r);
    BACKDROP.view.value.set(size.width, size.height);
    BACKDROP.rush.value = e;
    // Its life: time, the beat (the song's, or a slow breath on the silent tempo), the disc for the sound rings.
    const clock = AUDIO.playing ? AUDIO.clock?.() : null;
    st.beat = clock ? clock.beat % 64 : (st.beat + (dt * BPM) / 60) % 64;
    if (!reduced) BACKDROP.time.value = (BACKDROP.time.value + dt) % 1000;
    BACKDROP.pulse.value = reduced ? 0 : clock ? Math.exp(-(st.beat % 1) * 5) : 0.25 - 0.25 * Math.cos((st.beat / 4) * Math.PI * 2);
    BACKDROP.beat.value = st.beat;
    BACKDROP.rings.value = approach(BACKDROP.rings.value, clock && out && !reduced ? 1 : 0, dt, 2);
    const dc = STAR.set(st.out * TRAVEL, 0, 0).applyMatrix4(m).project(camera);
    BACKDROP.disc.value.set(((dc.x + 1) / 2) * size.width, ((1 - dc.y) / 2) * size.height);
    if (TURN.hull) {
      for (let i = 0; i < 8; i++) P[i].copy(CORNERS[i]).applyMatrix4(m).project(camera);
      writeHull(size);
    }
    // The disc's screen path from in to out, for pulling it by hand along its own axis.
    const a = Q[0].set(0, 0, 0).applyMatrix4(m).project(camera);
    const ax = a.x, ay = a.y;
    const b = Q[0].set(TRAVEL, 0, 0).applyMatrix4(m).project(camera);
    TURN.axisX = ((b.x - ax) / 2) * size.width;
    TURN.axisY = (-(b.y - ay) / 2) * size.height;
    // Hit zones. The vinyl's: its edge strip (extraction starts only on the settled front), or the exposed
    // disc once out (returning works from either face).
    // The strip is 44 px on screen in all: the exposed disc plus as little of the sleeve as that needs.
    const edge = Math.max(1.02, st.out * TRAVEL + DISC);
    const pxPerUnit = Math.hypot(TURN.axisX, TURN.axisY) / TRAVEL || 1;
    const zone = Math.max(ZONE_MIN, ZONE_PX / pxPerUnit - (edge - 1));
    if (out || pulling || settled) {
      writeQuad(TURN.vinylZone, st.out > 0.5 ? 1 : 1 - zone, edge, DISC, m, camera, size);
    } else hideQuad(TURN.vinylZone);
    // The member's text (the page's left column) shows while their hero is presented: settled on the front,
    // nobody handling the record.
    const fore = TURN.fore;
    if (fore) {
      const shown = String(!!active && settled && spread.current >= 1);
      if (fore.dataset.shown !== shown) fore.dataset.shown = shown;
    }
  });

  return (
    <>
      {/* The page behind the record: drawn first, over the whole canvas. */}
      <mesh name="eao-backdrop" material={mats.backdrop} renderOrder={-1} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    <group ref={tilt}>
      <group ref={flip}>
        <Diorama
          active={active}
          spread={spread}
          reduced={reduced}
          onHover={onHover}
          onSelect={onSelect}
          onBlank={onBlank}
          hoverable={hoverable}
          selectable={face === 'front'}
        />
        <mesh name="eao-mirror" userData={{ sdf }} position={[0, 0, CARD_Z]} material={mats.card}>
          <planeGeometry args={[2, 2]} />
        </mesh>
        {/* Karu's back: a click on one of the five assigned titles picks that member (layers.json tracks);
            anywhere else returns an extracted disc. Only while the back is the face shown. */}
        <mesh
          position={[0, 0, -FRONT_Z]}
          rotation={[0, Math.PI, 0]}
          material={mats.back}
          onClick={
            face === 'back'
              ? (e) => {
                  e.stopPropagation();
                  onBack(titleAt(e.uv));
                }
              : undefined
          }
        >
          <planeGeometry args={[2, 2]} />
        </mesh>
        {/* Closed edges carry Karu's spine; the right edge is the open one the vinyl leaves by. */}
        <mesh position={[-1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={mats.spine}>
          <planeGeometry args={[THICK, 2]} />
        </mesh>
        <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={mats.spine}>
          <planeGeometry args={[THICK, 2]} />
        </mesh>
        <mesh position={[0, -1, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} material={mats.spine}>
          <planeGeometry args={[THICK, 2]} />
        </mesh>
        <group ref={disc}>
          <group ref={spin}>
            <mesh material={vinyl}>
              <circleGeometry args={[DISC, 96]} />
            </mesh>
            <mesh position={[0, 0, 0.001]} material={mats.label}>
              <circleGeometry args={[DISC * 0.34, 64]} />
            </mesh>
            {/* The rear face: single-sided circles turned to face backwards, so the label reads unmirrored. */}
            <mesh rotation={[0, Math.PI, 0]} material={vinyl}>
              <circleGeometry args={[DISC, 96]} />
            </mesh>
            <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]} material={mats.label}>
              <circleGeometry args={[DISC * 0.34, 64]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
    </>
  );
}
