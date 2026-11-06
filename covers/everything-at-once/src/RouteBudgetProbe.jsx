// covers/everything-at-once — the budget probe for this route's renderer.
//
// The route renders with WebGPURenderer (TSL materials). There `info.render.calls` counts render()
// invocations over the renderer's lifetime, so the shared Unit 8 probe would report an ever-growing
// number. This probe reports the same BudgetSample shape with `calls` = draw calls of one whole frame:
// it turns auto-reset off, resets once per R3F frame, and reads before the next frame renders.
// The renderer's own output pass (colour-space conversion) is one of the counted draws.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** @param {{ onSample: (s: import('../../../src/lib/types.js').BudgetSample) => void }} props */
export default function RouteBudgetProbe({ onSample }) {
  const get = useThree((state) => state.get);
  const wait = useRef(0);

  useEffect(() => {
    const { info } = get().gl;
    info.autoReset = false;
    return () => {
      info.autoReset = true;
    };
  }, [get]);

  useFrame(({ gl }, delta) => {
    wait.current += delta;
    if (wait.current >= 1) {
      wait.current = 0;
      const { render, memory } = gl.info;
      onSample({ calls: render.drawCalls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures });
    }
    gl.info.reset();
  });

  return null;
}
