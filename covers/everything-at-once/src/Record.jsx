// covers/everything-at-once — the record: a sleeve (front diorama, Karu's back face) and the vinyl.
//
// The sleeve tilts a few degrees towards the pointer on a spring (no OrbitControls), flips about its
// vertical axis to show the back, and lets the vinyl slide out of its open (right) edge, spinning, with
// Karu's label. While the vinyl is out the camera pulls back so the whole motion stays on the stage.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { color, float, length, mix, sin, uv, vec3 } from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { faceMaterial, useReleaseOnUnmount } from './materials.js';
import Diorama, { FRONT_Z, VIEW_DISTANCE } from './Diorama.jsx';

const BACK_URL = new URL('../public/back.ktx2', import.meta.url).href;
const LABEL_URL = new URL('../public/label.ktx2', import.meta.url).href;
const SPINE_URL = new URL('../public/spine.ktx2', import.meta.url).href;
const FILL_URL = new URL('../public/star-fill.ktx2', import.meta.url).href;
const THICK = FRONT_Z * 2;
const TILT = 0.07; // radians at the stage's edge
const DISC = 0.96; // vinyl radius (the sleeve is 2 x 2)
const SPIN = (33.3 / 60) * Math.PI * 2; // 33 1/3 rpm
const approach = (v, target, dt, rate) => v + (target - v) * Math.min(1, dt * rate);

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
  const s = useRef({ rx: 0, ry: 0, flip: face === 'back' ? Math.PI : 0, out: 0, cam: 0 });
  useFrame(({ pointer, camera }, delta) => {
    const dt = Math.min(delta, 0.05); // back from a hidden tab: no snap, no jump in the vinyl's spin
    const st = s.current;
    const rate = reduced ? 1e9 : 6;
    const k = reduced ? 1 : dt;
    st.rx = approach(st.rx, reduced ? 0 : -pointer.y * TILT, k, rate);
    st.ry = approach(st.ry, reduced ? 0 : pointer.x * TILT, k, rate);
    st.flip = approach(st.flip, face === 'back' ? Math.PI : 0, k, reduced ? 1e9 : 5);
    st.out = approach(st.out, out ? 1 : 0, k, reduced ? 1e9 : 4);
    // The opening: the record arrives a little tilted and further back and settles in as the layers
    // spread to their depths (head-on the spread alone is invisible: the layers are scale-compensated).
    const o = 1 - spread.current;
    const e = o * o * (3 - 2 * o); // smoothstep: eases into place
    tilt.current.rotation.set(st.rx + e * 0.45, st.ry - e * 0.35, e * 0.06);
    tilt.current.position.z = -e * 0.9;
    flip.current.rotation.y = st.flip;
    disc.current.position.x = st.out * 1.15;
    if (!reduced && st.out > 0.01) spin.current.rotation.z -= SPIN * dt;
    // Pull back while the vinyl is out, so sleeve + disc fit the square stage.
    camera.position.set(st.out * 0.57, 0, VIEW_DISTANCE + FRONT_Z + st.out * 3.2);
    camera.lookAt(st.out * 0.57, 0, 0);
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
