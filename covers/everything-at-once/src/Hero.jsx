// covers/everything-at-once — a member's hero object: the drawn prop leaves the page and performs in 3D.
//
// At rest the hero is hidden and Karu's drawing shows it. When its side is presented (selected, settled on
// the front, nobody handling the record), the 3D model appears exactly over the drawn one, registered to the
// cover camera, while the side's art crossfades to its under-plate (the drawing with the prop removed). Then
// it rises off the page and plays to the beat: the pendulum ticks and the body hops (metronome), or the
// cigarettes hop in turn while their embers breathe and smoke; the riso channels kick on each beat. Leaving reverses it; the channels align as it lands.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { Box3, MathUtils, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import {
  instancedBufferAttribute,
  smoothstep,
  texture,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { useReleaseOnUnmount } from './materials.js';
import { TURN } from './turn.js';
import { AUDIO, BEAT, BPM, GLOW, HEROES, SHOW } from './heroes.js';

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
const BOB = 0.12; // model units (a cigarette is 1.5 long)
const PUFFS = 8; // smoke puffs per ember, one instanced draw for all of them
const SMOKE_LIFE = 2.6; // s from the ember until a puff has faded

/** An image-space similarity for the head-on camera, as a sleeve-space matrix: rotation and scale about the
 *  optical axis, shift (ndc) as a shear along the view, so every depth moves by the same amount on screen. */
function imageSim(m, rot, scale, tx, ty, cam, vd) {
  const c = Math.cos(rot) * scale, s = Math.sin(rot) * scale;
  return m.set(c, -s, -tx / vd, (tx * cam) / vd, s, c, -ty / vd, (ty * cam) / vd, 0, 0, 1, 0, 0, 0, 0, 1);
}
const tmpV = new Vector3();
const tmpS = new Vector3();
const tmpP = new Vector3();
const FACE = new Quaternion();

/** Place the smoke puffs: each one leaves its ember at a staggered time, drifts up the page (glTF -z is up on
 *  the cover) and off it (+y), sways, grows and fades. `level` 0 hides them all (handoff, reduced motion).
 *  The glow points sit on the tips and swell with `glow`. */
function puffs({ mesh, alpha, n, points }, embers, time, level, glow) {
  embers.forEach((em, i) => {
    tmpP.copy(em.tip).applyMatrix4(em.o.matrix);
    const size = 0.4 + 0.35 * glow; // the halo swells with the flare
    points.setMatrixAt(i, tmpM.compose(tmpP, FACE, tmpS.set(size, size, size)));
  });
  points.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < n; i++) {
    const em = embers[Math.floor(i / PUFFS)];
    const k = i % PUFFS;
    const age = (time / SMOKE_LIFE + k / PUFFS + em.tip.y * 0.37 * Math.floor(i / PUFFS)) % 1;
    tmpP.copy(em.tip).applyMatrix4(em.o.matrix); // the pivots are root nodes: their matrix is scene space
    const sway = Math.sin(age * 5 + i) * 0.08 * age;
    tmpP.x += sway;
    tmpP.y += age * 0.5;
    tmpP.z -= age * 0.9;
    const size = 0.1 + age * 0.45;
    tmpM.compose(tmpP, FACE, tmpS.set(size, size, size));
    mesh.setMatrixAt(i, tmpM);
    alpha.array[i] = level * smooth(0, 0.12, age) * (1 - age) ** 1.5;
  }
  mesh.instanceMatrix.needsUpdate = true;
  alpha.needsUpdate = true;
}

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
  const glow = GLOW[name];
  const mat = useMemo(() => {
    const d = vec2(shift, shift.mul(0.6));
    const r = texture(map, uv().add(d));
    const g = texture(map, uv());
    const b = texture(map, uv().sub(d));
    // Unlit: the shading is painted in Karu's style. Double-sided as the GLB says (the recess's back wall is
    // a single outward-facing surface).
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true });
    let rgb = vec3(r.r, g.g, b.b);
    if (spec.ember) {
      // The ember: the painted red ring and the red specks on the ash are the only texels that are bright red with
      // almost no green or blue (linear); they breathe with `glow`.
      const ember = smoothstep(0.3, 0.5, g.r).mul(smoothstep(0.12, 0.04, g.b)).mul(smoothstep(0.15, 0.05, g.g));
      rgb = rgb.add(vec3(1, 0.32, 0.08).mul(ember.mul(glow)));
    }
    m.colorNode = vec4(rgb, show); // never clipped: the whole hero shows, however far the record is
    return m;
  }, [map, shift, show, glow, spec.ember]);

  // Smoke: soft puffs leave each ember, drift up the page and off it towards the viewer, grow and fade.
  const smoke = useMemo(() => {
    if (!spec.ember) return null;
    const n = PUFFS * Object.keys(spec.ember).length;
    const alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); // facing the camera (glTF y = up off the page)
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const dist = uv().sub(0.5).length();
    const puff = smoothstep(0.5, 0.18, dist); // a soft disc, slightly darker towards its rim like a riso dot
    m.colorNode = vec4(vec3(0.75, 0.61, 0.83).mul(smoothstep(0.5, 0.2, dist).mul(0.25).add(0.75)), puff.mul(instancedBufferAttribute(alpha)).mul(show).mul(0.5));
    const mesh = new THREE.InstancedMesh(geo, m, n);
    mesh.renderOrder = 102;
    mesh.frustumCulled = false; // the instance matrices move every frame
    // The glow point: one warm, additive halo per ember tip that flares on every beat (user, 8 Nov).
    // Drawn over its own stick (the halo plane cuts through the tip). Plain alpha blending: additive drew the
    // quad as a dark square on this renderer.
    const gm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false });
    const halo = smoothstep(0.5, 0, dist);
    gm.colorNode = vec4(vec3(1, 0.45, 0.14), halo.pow(1.6).mul(glow).mul(show).mul(0.85));
    const points = new THREE.InstancedMesh(geo, gm, Object.keys(spec.ember).length);
    points.renderOrder = 103;
    points.frustumCulled = false;
    return { mesh, alpha, n, points };
  }, [spec.ember, show, glow]);
  useEffect(() => () => {
    if (!smoke) return;
    smoke.mesh.geometry.dispose();
    smoke.mesh.material.dispose();
    smoke.points.material.dispose();
    smoke.mesh.dispose();
    smoke.points.dispose();
  }, [smoke]);

  // Registration: the GLB keeps its place in the cover scene (glTF y = Blender up = towards the cover camera,
  // which looks straight down from COVER_HEIGHT). The route camera has the cover camera's field of view, so
  // scaling about it by k keeps every point's projection: the hero lies exactly where the 3D render had it,
  // underside on its side's layer, with its true proportions.
  const rig = useRef(null);
  useEffect(() => {
    // Parts laid on their drawn sticks (absolute, so applying it again to the cached scene is harmless).
    for (const [n, p] of Object.entries(spec.place ?? {})) {
      const o = scene.getObjectByName(n);
      if (!o) throw new Error(`Hero: no ${n} in ${name}'s GLB`);
      o.position.fromArray(p.position);
      o.quaternion.fromArray(p.quaternion);
    }
    scene.updateMatrixWorld(true);
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
      bob: (spec.bob ?? []).map((n) => {
        const o = scene.getObjectByName(n);
        if (!o) throw new Error(`Hero: no ${n} in ${name}'s GLB`);
        return { o, y: o.position.y };
      }),
      // each ember: its pivot (a root node of the GLB) and the tip along the pivot's local y
      embers: Object.entries(spec.ember ?? {}).map(([n, y]) => ({ o: scene.getObjectByName(n), tip: new Vector3(0, y, 0) })),
    };
    if (DEBUG) (DEBUG.__eaoHeroRigs ??= {})[name] = { scene, rig: rig.current, beat: BEAT, audio: AUDIO, show: SHOW, glow: GLOW };
    return () => {
      if (swing) swing.quaternion.copy(rig.current.swingRest); // the cached scene stays at rest
      for (const b of rig.current.bob) b.o.position.y = b.y;
    };
  }, [scene, rest, viewDistance, frontZ, spec.swing, spec.bob, spec.place, spec.ember, name]);

  const group = useRef();
  useEffect(() => {
    const meshes = [];
    scene.traverse((o) => o.isMesh && meshes.push(o));
    for (const o of meshes) {
      o.material = mat;
      o.renderOrder = 101; // over its side, which draws at 100 while selected
    }
    return () => mat.dispose();
  }, [scene, mat]);
  useReleaseOnUnmount([spec.tex], [map], () => {
    scene.traverse((o) => o.geometry?.dispose());
    useGLTF.clear(spec.glb);
  });

  const st = useRef({ show: 0, beat: 0, calm: CALM, time: 0 });
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
      s.time = 0;
      BEAT[name] = 0;
      return;
    }
    const lift = reduced ? 0 : smooth(0.15, 1, s.show); // leaves the page after the handoff
    const perf = reduced ? 0 : smooth(0.7, 1, s.show); // plays once it is up
    s.beat += (dt * BPM) / 60;
    s.beat %= 64; // bounded
    const phase = s.beat % 1;
    const pulse = Math.max(0, Math.sin(phase * Math.PI)) ** 4 * perf;
    // Parts that hop in turn (the cigarettes, up off the page in model units) or the whole hero (the metronome).
    R.bob.forEach((b, i) => (b.o.position.y = b.y + (Math.floor(s.beat) % R.bob.length === i ? pulse * BOB : 0)));
    const hop = R.bob.length ? 0 : pulse * 0.02;
    BEAT[name] = AUDIO.playing ? (1 - phase) ** 6 * 0.004 * perf : 0; // the riso kick only with the music on
    if (R.swing) R.swing.quaternion.copy(R.swingRest).multiply(tmpQ.setFromAxisAngle(Y_AXIS, Math.sin(s.beat * Math.PI) * SWING * perf));
    s.time = (s.time + dt) % 600; // bounded
    // With a song playing the embers flare on every beat and die down until the next; silent (or reduced motion)
    // they hold a steady glow (user, 8 Nov).
    const steady = reduced ? 0.6 : perf * 0.6;
    GLOW[name].value = AUDIO.playing && !reduced ? perf * (0.45 + 0.55 * (1 - phase) ** 3) : steady;
    if (smoke) puffs(smoke, R.embers, s.time, reduced ? 0 : perf, GLOW[name].value);
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
      {smoke && <primitive object={smoke.mesh} />}
      {smoke && <primitive object={smoke.points} />}
    </group>
  );
}
