# AI-assisted 3D merge log — Everything at Once

<!-- One row per AI-assisted diff or proposal reviewed. At least two REJECT rows
     across Units 8–9, or an explicit finding that nothing was worth rejecting. -->

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| Plan (5 Nov 2026): generate the cover's props with paid image-to-3D services (Meshy/Tripo/Rodin) | API truth | REJECT | The props already exist in the band's Blender scene; generated meshes would drift from the cover and add cost. |
| Plan (5 Nov 2026): recover the 95 missing original textures | literacy | REJECT | The author no longer has the files; we will author new textures instead. |
| Plan (5 Nov 2026): free orbit camera | ui-canvas | REJECT | Orbiting would expose faces the drawing never shows; the camera stays fixed on the cover framing. |
| Plan (5 Nov 2026): hybrid route — R3F canvas + DOM title, member buttons and info panel | ui-canvas | ACCEPT | Title and member text stay accessible DOM text, as the assignment requires. |
| Third-party models/textures with unknown source | literacy | ESCALATE | Asked the instructor; accepted in conversation (Nov 2026). Recorded in ktx2-note.md. |
| `build_web.py` export with `export_image_format='NONE'` | API truth | REJECT | `gltf-transform inspect` showed the exporter strips TEXCOORD_0 when no material samples a texture; UVs are needed for the cover textures. Replaced with one placeholder textured material. |
| Decimate targets proportional to each mesh's share of the frame (coins 229,600 → 3,000) | literacy | ACCEPT | Before/after flat renders from the cover camera differ by 0.5/255 on average. |
| Ship subdivision 2 → 0 | motion | ACCEPT | 828k → ~24k triangles; only the bottle edge changes, checked in the diff render. |
| Hover/focus/click/Esc on one `active` state shared by canvas and DOM buttons | ui-canvas | ACCEPT | Checked over CDP: hover names Guille, button pins Lucy (`aria-pressed`), Esc clears, scope class removed on leaving. |
| Style test B as the drawing blurred by mip bias (`texture2D(uCover, uv, 6.0)`) | literacy | REJECT | Rendered as mush with the star's yellow bleeding into the props; replaced by one median colour per prop, baked at load. |
| Projection kept per side with an "undo motion" matrix (`uUndo`) | motion | REJECT | It only allowed whole sides to move as one block; the rest-pose projection is now baked per vertex so each prop can lift and rock on its own pivot. |
| Hover dim of 0.6 in linear colour | ui-canvas | REJECT | Read as only ~80% brightness on screen; raised to 0.75 towards a darker colour, checked in a screenshot. |
| Lint: scoped `eslint-disable react-hooks/immutability` around `useFrame` | API truth | ACCEPT | The React Compiler rule flags any per-frame mutation of three.js objects the effect created; mutating in `useFrame` instead of `setState` is the course's own rule. Disable is limited to that block. |
| V2 direction (6 Nov 2026): Karu's drawing as layered planes instead of the drawing projected onto the 3D props | ui-canvas | ACCEPT | Every visible face is Karu's art; the rest frame matches the cover at scale 1.0, offset 0 (mean difference 7.8/255, compression only). The projection is retired. |
| Desktop focus blur as a post-processing pass | performance | REJECT | Each inactive side now blurs inside its own material (lower mip, 4 taps); same look on desktop and mobile, 0 passes, still 14 calls. Zero passes is the course reference. |
| Reuse the shared Unit 8 `BudgetProbe` on `WebGPURenderer` | API truth | REJECT | There `render.calls` counts render() calls over the renderer's lifetime; `RouteBudgetProbe.jsx` reports per-frame `drawCalls` instead (14, including the output pass). |
| KTX2 for GLB textures with `--lower_left_maps_to_s0t0` | API truth | REJECT | The flipped texture came out scrambled on the model: glTF UVs start at the top-left. The flag stays for flat planes (layers, sleeve back, label). |
| Codex review of the probe hook (6 findings) | API truth | ACCEPT | All fixed: DEV-only glob (checked absent from `dist/`), router search params, flat colour, DPR, reduced motion, per-frame counter reset. |
| Codex review of the V2 route (10 findings) | ui-canvas | ACCEPT | Nine fixed: route-owned textures released on unmount, repeat selection clears the preview, keyboard-only focus previews, a focusable stage so Escape reaches the route, poster back on failure, panel clicks finish the opening, abandoned drags dropped, dt clamped, `CEILING` and this note updated from the V2 tree. |
| Codex review finding: source PNGs beside the KTX2 files | literacy | ESCALATE | Required by task3 (CONTRIBUTING); deferred to the task3 PR with the codec comparison. |
| Release textures in the effect cleanup (first fix for the review's leak finding) | API truth | REJECT | React StrictMode's rehearsed unmount disposed them and the remounted scene rendered black; the release now waits a tick and is cancelled by an immediate remount (`useReleaseOnUnmount`). |
| Codex/ImageGen under-plate for Andrés's side and 8 painted views of the metronome | literacy | ESCALATE | Aligned with the drawing and the model (plate offset 0; views IoU 0.93-0.99); waiting for Karu's approval before they ship. |
| Codex/ImageGen 8 painted views of Pavlo's cigarettes, v1 (plain sticks, contours inked inside the silhouettes) | literacy | REJECT | Baked onto the model they read as plain pink rods: no filter or burning tip, and the contour ink, painted inside 20 px-wide views, smeared into dark streaks along the sides. Re-requested as v2. |
| Codex/ImageGen v2 views (filter with seam at the drawn end, ash and ember ring at the far end, no contour ink) + under-plate for Pavlo's side | literacy | ACCEPT | Views match the renders (IoU 0.96–0.98), every filter and ember at its requested end; plate aligned (best fit = no offset), composited through the traced mask. Karu and the band approved, 8 Nov 2026. |
| Ink outline as an inverted hull around the cigarettes | ui-canvas | REJECT | Tried to match Karu's crayon contour; once the sticks rose it read heavier than her line, and the band preferred the painted sticks alone. Removed (−3 calls). |
| Additive blending for the ember glow point | API truth | REJECT | Drew the halo quad as a dark square on this renderer's WebGL 2 backend; alpha blending with the falloff in alpha instead. |
