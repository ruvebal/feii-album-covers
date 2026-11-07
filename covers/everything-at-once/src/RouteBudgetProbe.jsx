// covers/everything-at-once — the budget probe for this route's renderer.
//
// The route renders with WebGPURenderer forced onto its WebGL 2 backend (TSL materials). There `info.render.calls` counts render()
// invocations over the renderer's lifetime, so the shared Unit 8 probe would report an ever-growing
// number. This probe reports the same BudgetSample shape with `calls` = draw calls of one whole frame:
// it turns auto-reset off, resets once per R3F frame, and reads before the next frame renders.
// The renderer's own output pass (colour-space conversion) is one of the counted draws.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// ?debug=fps: the frame times of the last WINDOW seconds, for the real-GPU and phone measurements.
const WINDOW = 30;
const RING = 8192; // frames: 30 s even at a 240 Hz display
const times = new Float32Array(RING);
const sorted = new Float32Array(RING);

/** Which backend and GPU actually render (a software renderer cannot pass the hardware gate). */
function describe(gl) {
  const b = gl.backend;
  if (b.isWebGPUBackend) {
    const a = b.device?.adapterInfo;
    return `WebGPU · ${a ? [a.vendor, a.architecture, a.description].filter(Boolean).join(' ') || 'adapter unnamed' : 'adapter unknown'}`;
  }
  const ext = b.gl?.getExtension('WEBGL_debug_renderer_info');
  return `WebGL 2 · ${ext ? b.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'renderer unknown'}`;
}

/** @param {{ onSample: (s: import('../../../src/lib/types.js').BudgetSample & { fps?: object }) => void, fps?: boolean, debug?: boolean }} props */
export default function RouteBudgetProbe({ onSample, fps = false, debug = false }) {
  const get = useThree((state) => state.get);
  const wait = useRef(0);
  const ring = useRef({ head: 0, count: 0 });

  useEffect(() => {
    const { info } = get().gl;
    info.autoReset = false;
    if (debug) {
      window.__eaoScene = get().scene; // for scripts/route-check.mjs: finite transforms
      window.__eaoR3F = get; // and timed renders (GPU cost per frame)
    }
    return () => {
      info.autoReset = true;
      delete window.__eaoScene;
      delete window.__eaoR3F;
    };
  }, [get, debug]);

  useFrame(({ gl, size, viewport }, delta) => {
    const r = ring.current;
    if (fps) {
      times[r.head] = delta;
      r.head = (r.head + 1) % RING;
      r.count = Math.min(r.count + 1, RING);
    }
    wait.current += delta;
    if (wait.current >= 1) {
      wait.current = 0;
      const { render, memory } = gl.info;
      const sample = { calls: render.drawCalls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures };
      if (fps) {
        // newest frames back to WINDOW seconds
        let n = 0;
        let sum = 0;
        while (n < r.count && sum < WINDOW) {
          const t = times[(r.head - 1 - n + RING) % RING];
          sorted[n++] = t;
          sum += t;
        }
        const last = sorted.subarray(0, n).sort();
        sample.fps = {
          avg: n / sum,
          p95: last[Math.min(n - 1, Math.floor(n * 0.95))] * 1000,
          seconds: sum,
          gpu: describe(gl),
          dpr: viewport.dpr,
          size: `${size.width}×${size.height}`,
        };
      }
      onSample(sample);
    }
    gl.info.reset();
  });

  return null;
}
