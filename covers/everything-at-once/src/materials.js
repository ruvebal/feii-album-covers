// covers/everything-at-once — the route's TSL materials.

import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import {
  atan, color, float, Fn, fwidth, If, Loop, mx_fractal_noise_float, positionGeometry, positionLocal, pow, screenUV, sin, texture, uniform,
  uv, vec2, vec3, vec4, length, max, mix, sign, smoothstep, step,
} from 'three/tsl';

/**
 * How far the backdrop (the star's yellow and its lettering) recedes while a member is selected, 0..1.
 * Driven by Diorama.jsx; the same darkening and desaturation as a blurred side, without the blur, so the
 * title stays readable and the selected piece is the only bright thing on the page.
 */
export const RECEDE = uniform(0);
const recede = (rgb, k) => mix(rgb, vec3(rgb.dot(vec3(0.299, 0.587, 0.114))), k.mul(0.45)).mul(k.mul(-0.2).add(1));

/**
 * A diorama layer: Karu's art with the riso misregistration and the in-material focus blur.
 * - `shift` (UV units) offsets where the red and blue channels are sampled: zero at rest, a short
 *   kick on activation, aligning again as the side returns.
 * - `blur` (0..1) softens an inactive side inside its own material: four taps at a lower mip,
 *   desaturated and darkened. No post-processing pass; the same on desktop and mobile.
 * - `clip` (uv rect: min x, min y, max x, max y) is the sleeve's square in this layer's own uv. An
 *   enlarged side is clipped there, so it never spills past the sleeve's edge.
 * - `lift` (0..1) is how far this side has lifted off the page. A lifted side is a piece torn out of the
 *   printed poster: its edge frays along a noisy tear line (two noise scales), the paper's cream core shows
 *   in a band of fibres along the tear, and a soft plum shadow falls down-right onto the page. The tear is
 *   irregular by nature, so the cut never has to trace the drawing's details. Distance to the edge comes
 *   from the layer's own alpha blurred at mip 3, all inside this material: no extra pass.
 * - `seed` makes each side tear differently.
 * - `plate` (optional) is the side with its drawn hero removed; `plateMix` (0..1) crossfades to it while the
 *   3D hero performs. Every tap reads the mix, so the tear and shadow follow the plate's outline too.
 * Colour: the KTX2 file is tagged sRGB, so sampling returns linear colour and the renderer encodes
 * the output; no manual conversion here.
 * @param {THREE.Texture} map
 * @param {{ shift: import('three/tsl').UniformNode<number>, blur: import('three/tsl').UniformNode<number>,
 *   clip: import('three/tsl').UniformNode<import('three').Vector4>, lift: import('three/tsl').UniformNode<number> }} u
 */
export function layerMaterial(map, u, seed = 0, backdrop = false, plate = null, plateMix = null) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  // The blur and the tear only run while in use: both are branches on a uniform (the same for every
  // pixel), so a side at rest pays for three taps, not for twelve plus five octaves of noise. Six
  // full-sleeve layers stack over every pixel, so this decides the frame time on integrated GPUs.
  // The plate and the misregistered red/blue taps are read only while they show (plateMix, shift > 0): both
  // land exactly on 0 at rest, where one tap gives the same pixel as the three (or six).
  const tex = (q, bias) => {
    const t = (img) => (bias === undefined ? texture(img, q) : texture(img, q).bias(bias));
    if (!plate) return t(map);
    const v = t(map).toVar();
    If(plateMix.greaterThan(0), () => v.assign(mix(v, t(plate), plateMix)));
    return v;
  };
  m.colorNode = Fn(() => {
    const p = uv();
    const sharp = tex(p).toVar();
    If(u.shift.greaterThan(0), () => {
      const d = vec2(u.shift, u.shift.mul(0.6));
      const r = tex(p.add(d));
      const b = tex(p.sub(d));
      sharp.assign(vec4(r.r, sharp.g, b.b, max(max(r.a, sharp.a), b.a)));
    });
    const c = sharp.toVar();
    If(u.blur.greaterThan(0), () => {
      const o = u.blur.mul(0.004);
      const tap = (dx, dy) => tex(p.add(vec2(dx, dy).mul(o)), u.blur.mul(3));
      const soft = tap(1, 0.5).add(tap(-1, -0.5)).add(tap(-0.5, 1)).add(tap(0.5, -1)).mul(0.25);
      const grey = vec3(soft.rgb.dot(vec3(0.299, 0.587, 0.114)));
      // Only the colour blurs; the outline stays the sharp one. A blurred alpha spread past the edge and read
      // as a glow over the yellow star, and two neighbouring blurred sides fading at their shared edge let
      // the card show through as a seam.
      const dim = vec4(mix(soft.rgb, grey, u.blur.mul(0.45)).mul(u.blur.mul(-0.2).add(1)), sharp.a);
      c.assign(mix(sharp, dim, u.blur));
    });
    if (backdrop) c.rgb.assign(recede(c.rgb, RECEDE)); // the star's lettering recedes with the page
    const out = c.toVar();
    If(u.lift.greaterThan(0), () => {
      // Torn paper. `dist` ~ signed distance to the silhouette (+ inside), from alpha averaged at mip 3.
      const tap3 = (dx, dy) => tex(p.add(vec2(dx, dy)), 3).a;
      const e = 0.0015;
      const dist = tap3(e, 0).add(tap3(-e, 0)).add(tap3(0, e)).add(tap3(0, -e)).mul(0.25).sub(0.5);
      const q = vec3(p.mul(30), float(seed));
      const wobble = mx_fractal_noise_float(q, 3, 2, 0.5).mul(0.32); // the tear's meander
      const tear = dist.add(wobble);
      const keep = smoothstep(-0.01, 0.03, tear); // paper that stays on the piece
      // Fibre band past the tear line, only near the real edge: far from the piece `dist` bottoms out at -0.5
      // and the noise alone reached the band, scattering fibres like dirt over the blurred sides.
      const nearEdge = smoothstep(-0.49, -0.4, dist);
      // The fine fibres' noise only where the band can show (elsewhere it is multiplied by 0): no texture reads
      // inside, so the per-pixel branch is safe.
      const core = float(0).toVar();
      If(keep.lessThan(1).and(nearEdge.greaterThan(0)), () => {
        const fray = mx_fractal_noise_float(vec3(p.mul(260), float(seed + 7)), 2, 2, 0.5).mul(0.09); // fine fibres
        core.assign(smoothstep(-0.3, -0.05, tear.add(fray)).mul(keep.oneMinus()).mul(nearEdge));
      });
      const art = c.a.mul(keep); // the print, torn
      const paperA = max(keep, core); // the piece: print + its torn paper edge
      const tornRgb = mix(color('#f6eddb'), c.rgb, art.div(max(paperA, 1e-4)));
      const lift = u.lift;
      const pieceA = mix(c.a, paperA, lift);
      const pieceRgb = mix(c.rgb, tornRgb, lift);
      // Shadow of the torn piece, cast down-right (light from the top-left) onto the page below.
      const shadow = tex(p.add(vec2(-0.006, 0.009)), 4).a.mul(0.55).mul(lift);
      const outside = pieceA.oneMinus();
      const a = pieceA.add(outside.mul(shadow));
      out.assign(vec4(pieceRgb.mul(pieceA).add(color('#2a1030').mul(shadow).mul(outside)).div(max(a, 1e-4)), a));
    });
    const inside = step(u.clip.x, p.x).mul(step(u.clip.y, p.y)).mul(step(p.x, u.clip.z)).mul(step(p.y, u.clip.w));
    return vec4(out.rgb, out.a.mul(inside));
  })();
  return m;
}

/** A plain textured face (sleeve back, disc label, spine). */
export function faceMaterial(map, opts = {}) {
  const m = new THREE.MeshBasicNodeMaterial(opts);
  const t = texture(map, uv());
  m.colorNode = t;
  return m;
}

/**
 * The star's infinity mirror (task2's authored shader; shader-note.md). Driven by Record.jsx every frame:
 * - `amount` 0..1: 0 at rest (head-on the star is Karu's cover, no mirror: user, 8 Nov), up to 1 while it moves.
 * - `cam`: the camera in the card plane's own space (the plane spans -1..1, z = 0).
 * - `tint` / `tintMix`: the echoes take the active member's colour instead of the purple ink.
 */
export const MIRROR = {
  amount: uniform(0),
  cam: uniform(new THREE.Vector3(0, 0, 3)),
  tint: uniform(new THREE.Color('#3a1457')),
  tintMix: uniform(0),
  shimmer: uniform(0), // the lights' travelling shimmer phase, 0..2pi (held still under reduced motion)
};
const ECHOES = 8; // N reflections
// Depth of echo k: 0.04 k + 0.012 k^2 (sleeve units; the camera sits ~2.8 away). Dense near the rim, so a turn never
// slides the first echo far off Karu's edge (a strip of plain yellow at the tip, user 8 Nov); ~1.1 deep at k = 8.
const DEPTH = (k) => k.mul(0.04).add(k.mul(k).mul(0.012));
const FALL = 0.7; // r: each echo is this much fainter than the one before
const LINE = 0.9; // half the echo's ink width, in SDF texels
const LIGHT = 1.4; // a light's bright core radius, in SDF texels (its halo reaches the field's `dot` range)

/**
 * One echo of her star at card uv `q`, for the mirror: the outline's coverage on the purple
 * (`ink`) and the misregistered magenta plate (`mis`, offset by `reg` in uv), its lights (`core`, `glow`, with the
 * shimmer running around the star and down the echoes) and the signed distance `d` (texels, + inside).
 * `aa` = SDF texels per screen pixel at that echo; `k` = the echo's index, from 1.
 */
function starEcho(sdf, { range, dot, centre }, q, k, aa, reg) {
  const signed = (v) => v.mul(255).sub(128).mul(range / 127);
  const line = (d) => smoothstep(LINE, aa.add(LINE), d.abs()).oneMinus();
  const f = texture(sdf, q);
  const d = signed(f.r);
  const around = atan(q.y.sub(centre[1]), q.x.sub(centre[0]));
  const twinkle = sin(around.mul(5).add(MIRROR.shimmer).sub(k.mul(0.8))).mul(0.4).add(0.6);
  const ld = f.g.mul(dot);
  return {
    d,
    ink: line(d),
    mis: line(signed(texture(sdf, q.add(reg)).r)),
    core: smoothstep(LIGHT, aa.add(LIGHT), ld).oneMinus().mul(twinkle),
    glow: ld.div(dot).oneMinus().clamp(0, 1).pow(2).mul(twinkle),
  };
}

/**
 * The card under the layers: the cover's star yellow (`fill`) with receding star-outline echoes, as if the star
 * were a window into a mirror box. Echo k casts the camera -> fragment ray down to DEPTH(k) and reads the
 * star's signed distance there, so the echoes shrink with perspective and slide sideways as the sleeve tilts.
 * Only the outline repeats (never the artwork), printed in riso inks: purple over a slightly misregistered
 * magenta, multiplied onto the yellow; the fill darkens a little with each echo it lies inside. A string of
 * lights just inside the outline repeats in every echo too, like the LEDs of a real infinity mirror: a white core
 * and a soft pink halo, screened over the print, with a shimmer that runs around the star and down the tunnel.
 * One pass, no
 * extra draw call; every texture read is in uniform control flow (WGSL's derivative rules).
 * @param {THREE.Texture} fill the star yellow with its grain (sRGB)
 * Every echo repeats Karu's drawn star (the opening her drawing leaves, pushed under her ink), with its lights.
 * @param {THREE.Texture} sdf RG8: R signed distance to her star (+ inside, +-`range` texels at 255 / 0, 128 = the
 *   outline); G distance to the nearest light, 0..`dot`
 * @param {{ size: number, range: number, dot: number, centre: number[] }} spec layers.json `mirror`
 */
export function mirrorMaterial(fill, sdf, spec) {
  const { size, range, centre } = spec;
  // KTX2Loader makes uncompressed data a nearest-filtered DataTexture: the echoes need the distance interpolated.
  sdf.minFilter = sdf.magFilter = THREE.LinearFilter;
  sdf.needsUpdate = true;
  const m = new THREE.MeshBasicNodeMaterial();
  const dist = (q) => texture(sdf, q).r.mul(255).sub(128).mul(range / 127); // texels, + inside
  m.colorNode = Fn(() => {
    const a = MIRROR.amount;
    const p = positionLocal.xy;
    const cz = max(MIRROR.cam.z, 0.05); // grazing guard: the card faces away long before this
    // The box's axis runs through the star's centre, not the sleeve's: head-on, the echoes shrink straight into
    // the star (the camera sits on the sleeve's axis; off it they read as tilted). Tilting still slides them.
    const axis = p.sub(vec2(centre[0] * 2 - 1, centre[1] * 2 - 1));
    const px = max(fwidth(uv().x), fwidth(uv().y)).mul(size); // SDF texels per screen pixel, on the card
    const inStar = smoothstep(-1, 0.5, dist(uv())); // echoes only inside the star
    const ink = mix(color('#3a1457'), MIRROR.tint.mul(0.55), MIRROR.tintMix); // a shade of it: Lucy's gold vanished on yellow
    const reg = vec2(0.9, -0.6).mul(a.add(0.5).div(size)); // the magenta plate's misregistration, in uv
    const purple = float(1).toVar();
    const magenta = float(1).toVar();
    const deep = float(0).toVar();
    const glow = float(0).toVar();
    const core = float(0).toVar();
    // At rest (amount exactly 0, Record.jsx) every echo's weight and light is 0: skip the loop, same pixel.
    If(a.greaterThan(0), () => Loop(ECHOES, ({ i }) => {
      const k = float(i).add(1);
      const t = DEPTH(k).div(cz);
      // The shallow echoes shrink but don't slide: if every echo slid with the turn, the side they left showed plain
      // yellow (under the controller, beside the lenses: user, 8 Nov). Only the deep ones swing, so lines always
      // come out from under Karu's drawing and the tunnel bends as the record moves.
      const swing = smoothstep(1.5, 6, k);
      const q = p.add(axis.sub(MIRROR.cam.xy.mul(swing)).mul(t)).mul(0.5).add(0.5);
      const onCard = step(0, q.x).mul(step(q.x, 1)).mul(step(0, q.y)).mul(step(q.y, 1)).mul(inStar);
      const aa = px.mul(t.add(1)); // an echo's texels per pixel grow with its depth
      const weight = pow(float(FALL), k.sub(1)).mul(onCard).mul(a);
      const e = starEcho(sdf, spec, q, k, aa, reg);
      const lit = pow(float(FALL), k.sub(1)).mul(onCard);
      core.addAssign(e.core.mul(lit));
      glow.addAssign(e.glow.mul(lit));
      purple.mulAssign(float(1).sub(e.ink.mul(weight)));
      magenta.mulAssign(float(1).sub(e.mis.mul(weight).mul(0.7)));
      deep.addAssign(smoothstep(-0.5, 0.5, e.d).mul(onCard));
    }));
    const printed = texture(fill, uv())
      .rgb.mul(mix(vec3(1), color('#e2477e'), magenta.oneMinus()))
      .mul(mix(vec3(1), ink, purple.oneMinus()))
      .mul(float(1).sub(deep.mul(a.mul(a)).mul(0.03))); // squared: at rest the yellow stays the card's own
    // Screen the lights over the print: they brighten, never darken; their strength follows the mirror's.
    const light = color('#ff9fd0').mul(glow.mul(0.65)).add(vec3(core)).mul(a).min(1);
    const lights = vec3(1).sub(vec3(1).sub(printed).mul(vec3(1).sub(light)));
    return vec4(recede(lights, RECEDE), 1);
  })();
  return m;
}

/** The page behind the record (Record.jsx writes these every frame). */
export const BACKDROP = {
  centre: uniform(new THREE.Vector2()), // the star's centre on screen, CSS px from the top left
  unit: uniform(100), // CSS px per sleeve unit at the record's distance
  view: uniform(new THREE.Vector2(1, 1)), // the canvas, CSS px
  rush: uniform(0), // the opening: 1 = the star starts 1.6x larger, 0 = settled
  time: uniform(0), // s, for the sparkles, dust and grain (held still under reduced motion)
  pulse: uniform(0), // 0..1: the star's beat (a kick per beat with a song, a slow breath in silence)
  beat: uniform(0), // the song's beat position: one sound ring leaves the disc per beat
  rings: uniform(0), // 0..1: the sound rings' strength (the vinyl out and playing)
  disc: uniform(new THREE.Vector2()), // the disc's centre on screen, CSS px
};
const SPARKS = 12; // Karu's four-point glints around the star
const DUST = 28; // specks drifting up
const RING_GAP = 90; // px between sound rings
/** A repeatable random number in 0..1 from a float. */
const hash = (n) => sin(n.mul(12.9898)).mul(43758.5453).fract();
const BACKDROP_REST = 0.35; // the star's strength at rest (the mirror's amount lifts it to 1)
export const BIG = 1.5; // the background star's tip radius, in sleeve units (the sleeve is 2 x 2)
const K1 = vec2(0.809016994375, -0.587785252292); // cos / sin of 36 deg: the star's fold axes

/** Signed distance (+ outside) to a regular five-point star with straight edges, tip up, tip radius `r`;
 *  `rf` sets how deep its inner corners sit. Inigo Quilez's sdStar5, in TSL. */
const sdStar = Fn(([p0, r, rf]) => {
  const p = vec2(p0.x.abs(), p0.y).toVar();
  p.subAssign(K1.mul(max(p.dot(K1), 0).mul(2)));
  const k2 = vec2(K1.x.negate(), K1.y);
  p.subAssign(k2.mul(max(p.dot(k2), 0).mul(2)));
  p.assign(vec2(p.x.abs(), p.y.sub(r)));
  const ba = vec2(0.587785252292, 0.809016994375).mul(rf).sub(vec2(0, 1));
  const h = p.dot(ba).div(ba.dot(ba)).clamp(0, r);
  return length(p.sub(ba.mul(h))).mul(sign(p.y.mul(ba.x).sub(p.x.mul(ba.y))));
});

/**
 * The page behind the record: one large regular star with straight edges (the infinity stays inside the record:
 * user, 10 Nov), centred on the record's star and following it as the record moves. A full-screen quad drawn
 * first, behind the opaque sleeve: her star's yellow (or the selected member's tint) over a misregistered magenta
 * plate, a soft halo, and a shimmer running around it, on the cover's night. To keep the page alive (user, 10 Nov):
 * the star pulses on the beat, Karu's four-point glints twinkle around it, a riso halftone and paper grain drift
 * over the night, dust floats up, and with the record playing sound rings ripple out from the disc. No texture.
 */
export function backdropMaterial() {
  const m = new THREE.MeshBasicNodeMaterial({ depthWrite: false });
  // The quad is the clip rect at the far end of the depth range: drawn after the opaque record (Record.jsx), it
  // fails the depth test wherever the record already covers the page, so those pixels skip this shader.
  m.vertexNode = vec4(positionGeometry.xy, 0.9999, 1);
  m.colorNode = Fn(() => {
    const a = MIRROR.amount.mul(1 - BACKDROP_REST).add(BACKDROP_REST);
    const s = screenUV; // top-left origin
    const p = s.mul(BACKDROP.view).sub(BACKDROP.centre).mul(vec2(1, -1)); // CSS px from the star's centre, y up
    const r = BACKDROP.unit.mul(BIG).mul(BACKDROP.rush.mul(0.6).add(1));
    const d = sdStar(p, r, float(0.5));
    const line = (x) => smoothstep(1.2, 2.2, x.abs()).oneMinus(); // ~2.4 px of ink
    const ink = line(d);
    const mis = line(sdStar(p.add(vec2(-2.5, 1.7).mul(a.add(0.5))), r, float(0.5)));
    const around = atan(p.y, p.x);
    const shimmer = sin(around.mul(5).add(MIRROR.shimmer)).mul(0.25).add(0.75);
    const halo = d.abs().div(-28).exp().mul(0.22).mul(shimmer);
    const px = s.mul(BACKDROP.view);
    const t = BACKDROP.time;
    const night = color('#1c0f26');
    const tint = mix(color('#ffe489'), MIRROR.tint, MIRROR.tintMix);
    // The ground: Karu's riso print. A 45 deg halftone in magenta whose dots swell and shrink with a slow noise,
    // and a fixed paper grain.
    const hv = vec2(px.x.add(px.y), px.y.sub(px.x)).mul(0.7071).div(7);
    const swell = mx_fractal_noise_float(vec3(px.mul(0.004), t.mul(0.05)), 2, 2, 0.5).mul(0.22).add(0.16).clamp(0, 0.45);
    const dotty = smoothstep(swell.sub(0.06), swell, length(hv.fract().sub(0.5))).oneMinus();
    const grain = sin(px.dot(vec2(12.9898, 78.233))).mul(43758.5453).fract().sub(0.5).mul(0.02);
    const ground = mix(night, color('#e2477e'), dotty.mul(0.07)).add(grain);
    // The star, kicked by the beat.
    const beat = BACKDROP.pulse;
    const c = mix(ground, color('#e2477e'), mis.mul(a).mul(0.6));
    const star = mix(c, tint, ink.mul(a).mul(shimmer).mul(beat.mul(0.5).add(1)).min(1)).add(tint.mul(halo.mul(a).mul(beat.mul(1.5).add(1))));
    // Sound rings: one leaves the disc per beat, fading with distance.
    // (Skipped while the rings are off: they are multiplied by 0 then. The same pixels, less work.)
    const ring = float(0).toVar();
    If(BACKDROP.rings.greaterThan(0), () => {
      const dr = length(px.sub(BACKDROP.disc));
      const f = dr.div(RING_GAP).sub(BACKDROP.beat).fract();
      const w = 1.6 / RING_GAP;
      ring.assign(smoothstep(0, w, f).oneMinus().add(smoothstep(1 - w, 1, f)).mul(dr.div(-420).exp()).mul(BACKDROP.rings));
    });
    // Dust drifting up, swaying a little.
    const dust = float(0).toVar();
    Loop(DUST, ({ i }) => {
      const n = float(i).add(40);
      const y = hash(n.add(5.5)).sub(t.mul(hash(n.add(2.2)).mul(0.02).add(0.008))).fract();
      const x = hash(n.add(9.1)).add(sin(t.mul(0.3).add(n)).mul(0.01)).fract();
      const r = length(s.sub(vec2(x, y)).mul(BACKDROP.view));
      dust.addAssign(smoothstep(0.4, 2.2, r).oneMinus().mul(hash(n.add(4.4)).mul(0.5).add(0.3)));
    });
    // Karu's glints: two thin arms and a bright core, each twinkling on its own slow clock.
    const spark = float(0).toVar();
    Loop(SPARKS, ({ i }) => {
      const n = float(i);
      const twinkle = pow(max(sin(t.mul(hash(n.add(6.6)).mul(0.9).add(0.5)).add(hash(n.add(8.8)).mul(6.283))), 0), 6);
      // A glint is dark about half of its cycle (twinkle 0, the same for every pixel): skip its arms then.
      If(twinkle.greaterThan(0), () => {
        const d = px.sub(vec2(hash(n.add(1.3)), hash(n.add(7.7))).mul(BACKDROP.view)).abs();
        const arm = hash(n.add(3.1)).mul(14).add(10);
        const glint = d.x.div(arm).add(d.y.div(1.2)).negate().exp()
          .add(d.y.div(arm).add(d.x.div(1.2)).negate().exp())
          .add(length(d).div(2.5).negate().exp());
        spark.addAssign(glint.mul(twinkle));
      });
    });
    const lit = star
      .add(tint.mul(ring.mul(0.3)))
      .add(mix(color('#ffc9e4'), tint, MIRROR.tintMix).mul(dust.mul(0.3)))
      .add(color('#fff6d8').mul(spark.mul(0.75)));
    return vec4(recede(lit.min(1), RECEDE), 1);
  })();
  return m;
}

const pending = new Map();
/**
 * Release route-owned KTX2 textures (GPU memory and their loader cache entry) when the route really
 * unmounts. The release waits one tick and is cancelled by an immediate remount: React's StrictMode
 * rehearses unmount/remount in development, and disposing then left the remounted scene with dead
 * textures. Without a release, a cached texture keeps listeners on every renderer it was uploaded to.
 * @param {string[]} urls
 * @param {import('three').Texture[]} textures
 * @param {() => void} [after] releases anything else loaded with them (a hero's GLB)
 */
export function useReleaseOnUnmount(urls, textures, after) {
  const key = urls.join('|');
  useEffect(() => {
    clearTimeout(pending.get(key));
    pending.delete(key);
    return () => {
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          urls.forEach((u) => useLoader.clear(KTX2Loader, u));
          textures.forEach((t) => t.dispose());
          after?.();
        }, 0),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the URLs; the textures follow them
  }, [key]);
}
