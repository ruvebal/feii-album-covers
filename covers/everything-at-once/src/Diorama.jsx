// covers/everything-at-once — the sleeve's front: Karu's drawing as a shadow box.
//
// Six layers (the star with its lettering, then one per member side) sit at depths taken from the band's
// Blender scene. Each is scaled by (D - z) / D, so at rest, from the head-on camera, every layer projects
// exactly where the drawing has it: the first frame is the cover. Depth only shows as parallax when the
// record tilts. Activating a side brings it forward and enlarges it about 15 % around its anchor, the other
// sides blur inside their own materials, and the riso channels kick apart and settle back.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector4 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { layerMaterial, RECEDE, useReleaseOnUnmount } from './materials.js';
import { MEMBERS } from './members.js';
import LAYERS from './layers.json'; // scripts/route_assets.py
import { TURN } from './turn.js';

/** Camera distance from the sleeve's front at rest; Record.jsx frames the sleeve with it. */
export const VIEW_DISTANCE = 1 / Math.tan((15 * Math.PI) / 180);
export const FRONT_Z = 0.015; // the sleeve's front face (half its thickness)
const DEPTH = 0.06; // the shadow box: the nearest side sits this far in front of the star
const LIFT = 0.05; // how far an active side comes forward
const GROW = 1.15; // ~15 % apparent enlargement, anchored around the side (DIRECTION-v2 3.2)
const url = (n) => new URL(`../public/layer-${n}.ktx2`, import.meta.url).href;
const URLS = {
  star: url('star'),
  lucy: url('lucy'),
  javi: url('javi'),
  pavlo: url('pavlo'),
  andres: url('andres'),
  guille: url('guille'),
};
const MAP_URL = new URL('../public/sides-map.png', import.meta.url).href;
// One pair of uniforms per layer, at module scope: the lint forbids mutating a hook's return value,
// and one diorama exists at a time.
const uniforms = (blur) => ({ shift: uniform(0), blur: uniform(blur), clip: uniform(new Vector4(0, 0, 1, 1)), lift: uniform(0) });
const U = Object.fromEntries(Object.keys(URLS).map((n) => [n, uniforms(0)]));
// The page under a lifted side: the same art left in place, blurred and dimmed like the other sides, so the
// enlarged piece never leaves gaps (a concave side scaled about its anchor no longer covers its own outline).
const GHOST = Object.fromEntries(Object.keys(URLS).map((n) => [n, uniforms(1)]));

/** Smoothly approach a target (critically damped enough for UI motion). */
// Lands exactly on the target: blur and lift > 0 switch on the costly shader branches (materials.js).
const approach = (v, target, dt, rate) => {
  const n = v + (target - v) * Math.min(1, dt * rate);
  return Math.abs(target - n) < 1e-4 ? target : n;
};

function Layer({ name, active, spread, reduced }) {
  const map = useKTX2Texture(URLS[name]);
  const mat = useMemo(() => layerMaterial(map, U[name], Object.keys(URLS).indexOf(name) * 13, name === 'star'), [map, name]);
  const ghostMat = useMemo(() => layerMaterial(map, GHOST[name]), [map, name]);
  useEffect(
    () => () => {
      mat.dispose();
      ghostMat.dispose();
    },
    [mat, ghostMat],
  );
  useReleaseOnUnmount([URLS[name]], [map]);
  const info = LAYERS[name] ?? { depth: 0, anchor: [0.5, 0.5] };
  const [ax, ay] = [(info.anchor[0] - 0.5) * 2, (info.anchor[1] - 0.5) * 2];
  const pivot = useRef();
  const ghost = useRef();
  const s = useRef({ lift: 0, grow: 1, blur: 0, kick: 0, was: active });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // back from a hidden tab: no snap
    const st = s.current;
    const mine = active === name;
    if (active !== st.was) {
      if (mine || st.was === name) st.kick = 1; // the side that starts or stops performing kicks
      st.was = active;
    }
    const k = reduced ? 1 : dt;
    const rate = reduced ? 1e9 : 8;
    st.lift = approach(st.lift, mine ? LIFT : 0, k, rate);
    st.grow = approach(st.grow, mine ? GROW : 1, k, rate);
    st.blur = approach(st.blur, active && !mine && name !== 'star' ? 1 : 0, k, rate);
    st.kick = reduced ? 0 : Math.max(0, st.kick - dt * 2.5);
    U[name].blur.value = st.blur;
    if (name === 'star') RECEDE.value = approach(RECEDE.value, active ? 1 : 0, k, rate); // the page recedes too
    U[name].shift.value = 0.006 * st.kick * st.kick;
    // Turned away from upright, the shadow box flattens onto the sleeve (lift and growth with it).
    const f = TURN.flat;
    const z = FRONT_Z + 0.001 + (info.depth * DEPTH * spread.current + st.lift) * f;
    const grow = 1 + (st.grow - 1) * f;
    // The camera sits VIEW_DISTANCE in front of the sleeve face (z = FRONT_Z); this keeps every layer's
    // rest projection identical to the drawing.
    const comp = (VIEW_DISTANCE + FRONT_Z - z) / VIEW_DISTANCE;
    const p = pivot.current;
    p.position.set(ax * comp, ay * comp, z);
    p.scale.setScalar(comp * grow);
    // The sleeve's square, seen from the camera at this layer's depth, spans ±comp. In the layer's own
    // coordinates (world = P + S * (L - A)) that is L = (±comp - P) / S + A; uv = (L + 1) / 2.
    const S = comp * grow;
    const lo = (e, a) => ((-comp - e) / S + a + 1) / 2;
    const hi = (e, a) => ((comp - e) / S + a + 1) / 2;
    U[name].clip.value.set(lo(ax * comp, ax), lo(ay * comp, ay), hi(ax * comp, ax), hi(ay * comp, ay));
    U[name].lift.value = (st.lift / LIFT) * f;
    // The ghost stays at the rest pose (just behind the lifted piece) while this side is up.
    const g = ghost.current;
    const zr = FRONT_Z + 0.001 + info.depth * DEPTH * spread.current * f;
    const cr = (VIEW_DISTANCE + FRONT_Z - zr) / VIEW_DISTANCE;
    g.visible = st.lift > 0.0005;
    g.position.set(0, 0, zr - 0.0005);
    g.scale.setScalar(cr); // at rest the plane spans exactly the sleeve square: its clip stays the full uv rect
  });

  const order = 1 + Math.round(info.depth * 10);
  return (
    <>
      <mesh ref={ghost} material={ghostMat} renderOrder={order} visible={false}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <group ref={pivot}>
        {/* Transparent layers draw in this order: the selected side goes over every other side. */}
        <mesh position={[-ax, -ay, 0]} material={mat} renderOrder={active === name ? 100 : order}>
          <planeGeometry args={[2, 2]} />
        </mesh>
      </group>
    </>
  );
}

/**
 * @param {{ active: string | null, spread: { current: number }, reduced: boolean,
 *   onHover: (id: string | null, pointerType?: string) => void, onSelect: (id: string) => void, interactive: boolean }} props
 */
export default function Diorama({ active, spread, reduced, onHover, onSelect, interactive }) {
  const sides = useRef(null);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live) return;
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      sides.current = ctx.getImageData(0, 0, 256, 256).data;
    };
    img.src = MAP_URL;
    return () => {
      live = false;
      img.onload = null;
      img.src = '';
      sides.current = null;
    };
  }, []);

  /** @param {{ uv?: { x: number, y: number } }} e */
  const sideAt = (e) => {
    const d = sides.current;
    if (!d || !e.uv) return null;
    const x = Math.min(255, Math.floor(e.uv.x * 256));
    const y = Math.min(255, Math.floor((1 - e.uv.y) * 256));
    const i = d[(y * 256 + x) * 4];
    return i > 0 ? MEMBERS[i - 1].id : null;
  };

  return (
    <group>
      {Object.keys(URLS).map((n) => (
        <Layer key={n} name={n} active={active} spread={spread} reduced={reduced} />
      ))}
      {/* Hit plane over the whole front: the side under the pointer comes from the side map. */}
      <mesh
        position={[0, 0, FRONT_Z + DEPTH + LIFT + 0.01]}
        onPointerMove={interactive ? (e) => onHover(sideAt(e), e.pointerType) : undefined}
        onPointerOut={interactive ? () => onHover(null) : undefined}
        onClick={
          interactive
            ? (e) => {
                const id = sideAt(e);
                if (id) onSelect(id);
              }
            : undefined
        }
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
