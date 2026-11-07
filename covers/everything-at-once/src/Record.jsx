// covers/everything-at-once — the record: a sleeve (front diorama, Karu's back face) and the vinyl.
//
// The sleeve tilts a few degrees towards the pointer on a spring (no OrbitControls), turns freely while
// dragged (turn.js decides the face it settles on) and lets the vinyl slide out of its open (right)
// edge, spinning, with Karu's label. While the vinyl is out the camera pulls back so the whole motion
// stays on the stage.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { MathUtils, Vector3 } from 'three/webgpu';
import { color, float, length, mix, sin, uv, vec3 } from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { faceMaterial, useReleaseOnUnmount } from './materials.js';
import Diorama, { FRONT_Z, VIEW_DISTANCE } from './Diorama.jsx';
import { coastStep, FACES, TURN } from './turn.js';

const BACK_URL = new URL('../public/back.ktx2', import.meta.url).href;
const LABEL_URL = new URL('../public/label.ktx2', import.meta.url).href;
const SPINE_URL = new URL('../public/spine.ktx2', import.meta.url).href;
const FILL_URL = new URL('../public/star-fill.ktx2', import.meta.url).href;
const THICK = FRONT_Z * 2;
const TILT = 0.07; // radians at the stage's edge
const DISC = 0.96; // vinyl radius (the sleeve is 2 x 2)
const SPIN = (33.3 / 60) * Math.PI * 2; // 33 1/3 rpm
const approach = (v, target, dt, rate) => v + (target - v) * Math.min(1, dt * rate);
const FLAT_FROM = 25; // deg from upright where the shadow box starts to flatten onto the sleeve
const FLAT_TO = 45;
// The sleeve's corners, for the projected hit polygon (preallocated: written every frame).
const CORNERS = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(x, y, z * FRONT_Z))));
const P = CORNERS.map(() => new Vector3());
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
 * @param {{ face: 'front' | 'back', out: boolean, reduced: boolean, active: string | null,
 *   spread: { current: number }, onHover: (id: string | null) => void, onSelect: (id: string) => void }} props
 */
export default function Record({ face, out, reduced, active, spread, onHover, onSelect }) {
  const back = useKTX2Texture(BACK_URL);
  const label = useKTX2Texture(LABEL_URL);
  const spine = useKTX2Texture(SPINE_URL);
  const fill = useKTX2Texture(FILL_URL);
  const mats = useMemo(
    () => ({
      back: faceMaterial(back),
      label: faceMaterial(label, { transparent: true }),
      spine: faceMaterial(spine),
      card: faceMaterial(fill, {}, true), // the cover's own star yellow (grain included), receding with a selection
    }),
    [back, label, spine, fill],
  );
  const vinyl = useVinylMaterial();
  useReleaseOnUnmount([BACK_URL, LABEL_URL, SPINE_URL, FILL_URL], [back, label, spine, fill]);
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
  const s = useRef({ rx: 0, ry: 0, out: 0, cam: 0 });
  useFrame(({ pointer, camera, size }, delta) => {
    const dt = Math.min(delta, 0.05); // back from a hidden tab: no snap, no jump in the vinyl's spin
    const st = s.current;
    const rate = reduced ? 1e9 : 6;
    const k = reduced ? 1 : dt;
    const still = TURN.mode === 'idle' || TURN.mode === 'pending'; // no hover tilt while handled
    st.rx = approach(st.rx, reduced || !still ? 0 : -pointer.y * TILT, k, rate);
    st.ry = approach(st.ry, reduced || !still ? 0 : pointer.x * TILT, k, rate);
    // Turning: the drag (or its coast) moves the target; otherwise it is the upright face. The shown
    // orientation follows more slowly than the cursor.
    coastStep(dt);
    if (still) TURN.target.copy(FACES[face]);
    if (reduced) TURN.q.copy(TURN.target);
    else TURN.q.slerp(TURN.target, 1 - Math.exp(-dt * (TURN.mode === 'drag' ? 12 : 7)));
    // Angle to the nearest upright face (front = identity, back = half turn about y).
    const near = (2 * Math.acos(Math.min(1, Math.max(Math.abs(TURN.q.w), Math.abs(TURN.q.y))))) / MathUtils.DEG2RAD;
    TURN.flat = 1 - MathUtils.smoothstep(near, FLAT_FROM, FLAT_TO);
    st.out = approach(st.out, out ? 1 : 0, k, reduced ? 1e9 : 4);
    // The opening: the record arrives a little tilted and further back and settles in as the layers
    // spread to their depths (head-on the spread alone is invisible: the layers are scale-compensated).
    const o = 1 - spread.current;
    const e = o * o * (3 - 2 * o); // smoothstep: eases into place
    tilt.current.rotation.set(st.rx + e * 0.45, st.ry - e * 0.35, e * 0.06);
    tilt.current.position.z = -e * 0.9;
    flip.current.quaternion.copy(TURN.q);
    disc.current.position.x = st.out * 1.15;
    if (!reduced && st.out > 0.01) spin.current.rotation.z -= SPIN * dt;
    // Pull back while the vinyl is out, so sleeve + disc fit the square stage.
    camera.position.set(st.out * 0.57, 0, VIEW_DISTANCE + FRONT_Z + st.out * 3.2);
    camera.lookAt(st.out * 0.57, 0, 0);
    if (TURN.hull) {
      flip.current.updateWorldMatrix(true, false);
      camera.updateMatrixWorld();
      for (let i = 0; i < 8; i++) P[i].copy(CORNERS[i]).applyMatrix4(flip.current.matrixWorld).project(camera);
      writeHull(size);
    }
  });

  return (
    <group ref={tilt}>
      <group ref={flip}>
        <Diorama active={active} spread={spread} reduced={reduced} onHover={onHover} onSelect={onSelect} interactive={face === 'front' && !out} />
        <mesh position={[0, 0, FRONT_Z - 0.0005]} material={mats.card}>
          <planeGeometry args={[2, 2]} />
        </mesh>
        <mesh position={[0, 0, -FRONT_Z]} rotation={[0, Math.PI, 0]} material={mats.back}>
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
          </group>
        </group>
      </group>
    </group>
  );
}
