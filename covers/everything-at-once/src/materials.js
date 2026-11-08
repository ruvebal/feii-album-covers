// covers/everything-at-once — the route's TSL materials.

import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { color, float, Fn, If, mx_fractal_noise_float, texture, uniform, uv, vec2, vec3, vec4, max, mix, smoothstep, step } from 'three/tsl';

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
  const tex = (q, bias) => {
    const t = (img) => (bias === undefined ? texture(img, q) : texture(img, q).bias(bias));
    return plate ? mix(t(map), t(plate), plateMix) : t(map);
  };
  m.colorNode = Fn(() => {
    const p = uv();
    const d = vec2(u.shift, u.shift.mul(0.6));
    const r = tex(p.add(d));
    const g = tex(p);
    const b = tex(p.sub(d));
    const sharp = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
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
      const fray = mx_fractal_noise_float(vec3(p.mul(260), float(seed + 7)), 2, 2, 0.5).mul(0.09); // fine fibres
      const tear = dist.add(wobble);
      const keep = smoothstep(-0.01, 0.03, tear); // paper that stays on the piece
      // Fibre band past the tear line, only near the real edge: far from the piece `dist` bottoms out at -0.5
      // and the noise alone reached the band, scattering fibres like dirt over the blurred sides.
      const nearEdge = smoothstep(-0.49, -0.4, dist);
      const core = smoothstep(-0.3, -0.05, tear.add(fray)).mul(keep.oneMinus()).mul(nearEdge);
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

/** A plain textured face (sleeve back, disc label); `backdrop` makes it recede with RECEDE (the star's card). */
export function faceMaterial(map, opts = {}, backdrop = false) {
  const m = new THREE.MeshBasicNodeMaterial(opts);
  const t = texture(map, uv());
  m.colorNode = backdrop ? vec4(recede(t.rgb, RECEDE), t.a) : t;
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
