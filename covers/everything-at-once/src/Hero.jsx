// covers/everything-at-once — a member's hero object: the drawn prop leaves the page and performs in 3D.
//
// At rest the hero is hidden and Karu's drawing shows it. When its side is presented (selected, settled on
// the front, nobody handling the record), the 3D model appears exactly over the drawn one, registered to the
// cover camera, while the side's art crossfades to its under-plate (the drawing with the prop removed). Then
// it rises off the page, turns a little to show it is solid, and plays to the beat: the pendulum ticks, the
// body hops, and the riso channels kick on each beat. Leaving reverses it; the channels align as it lands.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { Box3, MathUtils, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { texture, uv, vec2, vec4 } from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { useReleaseOnUnmount } from './materials.js';
import { TURN } from './turn.js';
import { AUDIO, BEAT, BPM, HEROES, SHOW } from './heroes.js';

const COVER_HEIGHT = 8.935; // the Blender cover camera: straight down from this height (cameras.json)
const TAN_COVER = 18 / 50; // its half field of view: 36 mm sensor, 50 mm lens
const SWING = 0.2; // rad: wider, the pale rod pokes past the housing's narrow top as a stray line
const CALM = 0.3; // s the record must stay settled before the hero comes back
const Y_AXIS = new Vector3(0, 1, 0);

// ?debug only: window.__eaoHeroHold = <0..1> holds the presentation there, __eaoHeroHide hides the model
// (registration checks: scripts/hero_fit.py).
const DEBUG = new URLSearchParams(window.location.search).has('debug') ? window : null;
const smooth = (a, b, x) => MathUtils.smoothstep(x, a, b);
// Lands exactly on the target, so a parked hero is really hidden.
const approach = (v, target, dt, rate) => {
  const n = v + (target - v) * Math.min(1, dt * rate);
  return Math.abs(target - n) < 1e-4 ? target : n;
};
const tmpM = new Matrix4();
const tmpF = new Matrix4();
const tmpQ = new Quaternion();
const RISE = 0.28; // of the hero's size, towards the camera

/** An image-space similarity for the head-on camera, as a sleeve-space matrix: rotation and scale about the
 *  optical axis, shift (ndc) as a shear along the view, so every depth moves by the same amount on screen. */
function imageSim(m, rot, scale, tx, ty, cam, vd) {
  const c = Math.cos(rot) * scale, s = Math.sin(rot) * scale;
  return m.set(c, -s, -tx / vd, (tx * cam) / vd, s, c, -ty / vd, (ty * cam) / vd, 0, 0, 1, 0, 0, 0, 0, 1);
}
const tmpV = new Vector3();

/**
 * @param {{ name: string, active: string | null, reduced: boolean,
 *   shift: import('three/tsl').UniformNode<number>, rest: { z: number, comp: number, ax: number, ay: number },
 *   viewDistance: number, frontZ: number }} props
 */
export default function Hero({ name, active, reduced, shift, rest, viewDistance, frontZ }) {
  const spec = HEROES[name];
  const { scene } = useGLTF(spec.glb, false, true);
  const map = useKTX2Texture(spec.tex);
  const show = SHOW[name];
  const mat = useMemo(() => {
    const d = vec2(shift, shift.mul(0.6));
    const r = texture(map, uv().add(d));
    const g = texture(map, uv());
    const b = texture(map, uv().sub(d));
    // Unlit: the shading is painted in Karu's style. Double-sided as the GLB says (the recess's back wall is
    // a single outward-facing surface).
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true });
    m.colorNode = vec4(r.r, g.g, b.b, show); // never clipped: the whole hero shows, however far the record is
    return m;
  }, [map, shift, show]);

  // Registration: the GLB keeps its place in the cover scene (glTF y = Blender up = towards the cover camera,
  // which looks straight down from COVER_HEIGHT). The route camera has the cover camera's field of view, so
  // scaling about it by k keeps every point's projection: the hero lies exactly where the 3D render had it,
  // underside on its side's layer, with its true proportions.
  const rig = useRef(null);
  useEffect(() => {
    const box = new Box3().setFromObject(scene);
    const cam = viewDistance + frontZ; // route camera height over the sleeve's centre plane
    const k = (cam - rest.z) / (COVER_HEIGHT - box.min.y);
    if (Math.abs(viewDistance * TAN_COVER - 1) > 1e-6) throw new Error('Hero: the route camera must use the cover FOV');
    const place = new Matrix4()
      .makeTranslation(0, 0, cam - k * COVER_HEIGHT)
      .multiply(new Matrix4().makeScale(k, k, k))
      .multiply(new Matrix4().makeRotationX(Math.PI / 2));
    const centre = box.getCenter(new Vector3()).applyMatrix4(place); // in sleeve space
    const pivot = new Matrix4()
      .makeTranslation(rest.ax * rest.comp, rest.ay * rest.comp, rest.z)
      .multiply(new Matrix4().makeScale(rest.comp, rest.comp, rest.comp));
    const swing = scene.getObjectByName(spec.swing);
    const toCamera = new Vector3(0, 0, cam).sub(centre).normalize();
    const size = k * box.getSize(new Vector3()).length();
    const unpivot = pivot.clone().invert();
    rig.current = {
      place,
      unpivot, // the hero lives in its side's pivot, so it lifts and grows with the side
      centre,
      toCamera,
      size,
      swing,
      swingRest: swing ? swing.quaternion.clone() : null,
    };
    if (DEBUG) DEBUG.__eaoHeroRig = { scene, rig: rig.current, beat: BEAT, audio: AUDIO, show: SHOW };
    return () => {
      if (swing) swing.quaternion.copy(rig.current.swingRest); // the cached scene stays at rest
    };
  }, [scene, rest, viewDistance, frontZ, spec.swing]);

  const group = useRef();
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.material = mat;
      o.renderOrder = 101; // over its side, which draws at 100 while selected
    });
    return () => mat.dispose();
  }, [scene, mat]);
  useReleaseOnUnmount([spec.tex], [map], () => {
    scene.traverse((o) => o.geometry?.dispose());
    useGLTF.clear(spec.glb);
  });

  const st = useRef({ show: 0, beat: 0, calm: CALM });
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = st.current;
    const R = rig.current;
    if (!R) return;
    // Presented: selected, upright on the front and the record not being turned. The vinyl coming out or going
    // in (tapped or pulled) leaves it performing (user, 8 Nov). The selection itself is Route's.
    const turning = (TURN.mode === 'drag' || TURN.mode === 'coast') && TURN.zone !== 'vinyl';
    const handled = turning || TURN.flat < 0.999;
    // Back only after 0.3 s of calm: while the record settles the tests above flip back and forth, which
    // made the hero flicker in and out (user, 7 Nov).
    s.calm = handled ? 0 : s.calm + dt;
    const on = active === name && s.calm >= CALM;
    s.show = approach(s.show, on ? 1 : 0, reduced ? 1 : dt, reduced ? 1e9 : on ? 2.2 : 4);
    if (DEBUG?.__eaoHeroHold !== undefined) s.show = DEBUG.__eaoHeroHold;
    const g = group.current;
    g.visible = s.show > 0 && !DEBUG?.__eaoHeroHide;
    SHOW[name].value = smooth(0, 0.2, s.show); // the handoff: hero in, side to its under-plate
    if (s.show === 0) {
      s.beat = 0;
      BEAT[name] = 0;
      return;
    }
    const lift = reduced ? 0 : smooth(0.15, 1, s.show); // leaves the page after the handoff
    const perf = reduced ? 0 : smooth(0.7, 1, s.show); // plays once it is up
    s.beat += (dt * BPM) / 60;
    s.beat %= 64; // bounded
    const phase = s.beat % 1;
    const hop = Math.max(0, Math.sin(phase * Math.PI)) ** 4 * 0.02 * perf;
    BEAT[name] = AUDIO.playing ? (1 - phase) ** 6 * 0.004 * perf : 0; // the riso kick only with the music on
    if (R.swing) R.swing.quaternion.copy(R.swingRest).multiply(tmpQ.setFromAxisAngle(Y_AXIS, Math.sin(s.beat * Math.PI) * SWING * perf));
    // Rise towards the viewer along the camera ray through its centre: it stays where the drawing has it and
    // just comes closer. No turn (user, 7 Nov).
    const e = lift * lift * (3 - 2 * lift);
    tmpM.makeTranslation(tmpV.copy(R.toCamera).multiplyScalar(R.size * RISE * e + hop));
    // At the handoff: the image-space fit onto Karu's ink, exact for the head-on camera (rotation and scale
    // about the optical axis, shift as a shear along the view). It relaxes as the hero rises.
    const f = 1 - e;
    const { rot, scale, shift: t } = spec.fit;
    const cam = viewDistance + frontZ;
    imageSim(tmpF, rot * f, 1 + (scale - 1) * f, t[0] * f, t[1] * f, cam, viewDistance);
    // Never moved or clipped to fit the sleeve: it stays where the drawing has it and may stick out (user, 7 Nov).
    g.matrix.multiplyMatrices(R.unpivot, tmpM).multiply(tmpF).multiply(R.place);
    g.matrixWorldNeedsUpdate = true;
  });

  return (
    <group ref={group} matrixAutoUpdate={false} visible={false}>
      <primitive object={scene} />
    </group>
  );
}
