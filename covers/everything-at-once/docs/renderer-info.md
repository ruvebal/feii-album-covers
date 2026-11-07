# renderer.info — cover

<!-- Template (Unit 8). Replace every ellipsis. Numbers come from the gallery
     panel on YOUR route, read on YOUR machine. The beacon's 6 / 1368 belong to
     the beacon; do not copy them here. Change the tree → change this table and
     CEILING in src/budget.js in the same PR. -->

Album: Texas Red — Everything at Once (2025).
Scene (V2, the record): Karu's cover as six layered planes (star + five member sides, KTX2 ETC1S 2048 px), the sleeve's back face and three spine edges, the vinyl and its label on both faces (7 Nov: the rear face and rear label, so the disc never disappears on a turn). Unlit TSL node materials (riso shift, in-material focus blur), no lights, shadows off, no post-processing pass, DPR cap [1, 1.5]. Renderer: `WebGPURenderer` through R3F's async `gl` factory; where WebGPU is missing it runs its WebGL 2 backend (as in every headless reading below).
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.
Accepted ceiling for this tree: calls ≤ 18, triangles ≤ 400, geometries ≤ 18, textures ≤ 12 (`src/budget.js`). Mobile is well inside the cap.

Renderer: `WebGPURenderer` with `forceWebGL: true` (7 Nov), so every browser renders through its WebGL 2 backend, as the course asks, while the materials stay in TSL (compiled to GLSL on that backend). `?debug=fps` names the backend and GPU.

How calls are measured: on `WebGPURenderer`, `info.render.calls` counts render() invocations over the renderer's lifetime, so the shared Unit 8 probe would report an ever-growing number. `src/RouteBudgetProbe.jsx` reports the same sample shape with `calls` = the draw calls of one whole frame (auto-reset off, one reset per R3F frame, read before the next render). One of the calls is the renderer's own output pass (colour-space conversion: 1 call, 1 triangle).

Pins: three@0.185.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, react@19.3.1 (this repo's package.json).

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 baked scene, idle (retired 6 Nov) | Headless Chromium 155 + SwiftShader (software WebGL), i7-10750H, 5 Nov 2026 | off | 144 | 209,586 | 129 | 0 | superseded |
| V1 baked scene, hovering Guille's side (retired) | same | off | 143 | 209,014 | 129 | 0 | superseded |
| V2 record, rest | Headless Chromium 155.0.8059.84, WebGPURenderer on its WebGL 2 backend + SwiftShader, i7-10750H, 6 Nov 2026 | off | 14 | 183 | 14 | 11 | yes |
| V2 record, Javi active (others blurred) | same | off | 14 | 183 | 14 | 11 | yes |
| V2 record, back face | same | off | 14 | 183 | 14 | 11 | yes |
| V2 record, vinyl out | same | off | 14 | 183 | 14 | 11 | superseded |
| Record with the disc's rear face, rest | Headless Chromium 155.0.8059.84, WebGL 2 backend on ANGLE/Vulkan, RTX 2060 Mobile, 7 Nov 2026 | off | 16 | 343 | 16 | 12 | yes |
| same, Lucy selected (her ghost drawn) | same | off | 17 | 345 | 17 | 12 | yes |
| same, Lucy selected, vinyl out | same | off | 17 | 345 | 17 | 12 | yes |
| same, back face, vinyl out | same | off | 16 | 343 | 17 | 12 | yes |
| cover + style treatment (task2) | ... | off | ... | ... | ... | ... | ... |
| cover + KTX2 textures (task3) | ... | off | ... | ... | ... | ... | ... |

The 6 Nov readings come from software rendering; from 7 Nov the headless checks run on the laptop's GPU. Counts (calls, triangles, geometries) do not depend on the GPU; frame time does. Frame time, `?debug=fps`, idle at 775×775, 7 Nov: RTX 2060 Mobile 133.1 FPS (p95 9.7 ms); Intel UHD (CML GT2) 111.3 FPS (p95 10.4 ms) after the layer blur and tear became uniform branches (11.9 FPS before).

V1 geometry reduction (Blender, `scripts/build_web.py`; that scene is retired, the numbers are kept as history): 2,345,131 → ~300,000 triangles. Ship subdivision 2 → 0, console subdivision 2 → 1, cable curve resolution 12 → 6, Decimate (collapse) on meshes heavier than their share of the frame (the four coins 229,600 → 3,000 each). Lights, the backdrop cube and props outside the cover camera removed. Flat-shaded renders from the cover camera before/after: mean difference 0.5/255; only the bottle edge and the console cable change visibly.

`memory.textures` is a texture **count**, not bytes. With every map null it already reads 1 (three's empty placeholder); the sleeve picture is one more.
