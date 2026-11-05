# AI-assisted 3D merge log

<!-- Covenant: una fila por diff asistido por IA. Al menos dos REJECT en Units 8–9. -->

**Quién escribió qué.** El código de task1 lo redactó un agente de IA (Claude Code) el 2026-11-05 a partir
de los apéndices de un plan propio (código de partida escrito sin ejecutar contra este repo). Las filas 1–7
son decisiones del agente sobre ese código de partida, con la evidencia que corrió. **No son la revisión humana**:
la decisión humana es la de gontugithub en el GATE 1 (afinado de cámara en el navegador) y la review del PR.

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| 1. Loaders GLTF/KTX2/Meshopt importados de `three-stdlib` (apéndice A) | API truth | REJECT | `src/lib/ktx2.js` usa `three/addons/loaders/KTX2Loader.js`; dos copias del loader duplican el pool de workers. `stadiumGlb.js` importa de `three/addons` y reutiliza `TRANSCODER_PATH`. |
| 2. Multitud con `Math.random()` dentro de `useMemo` | API truth | REJECT | Render impuro (multitud distinta en cada montaje, y en StrictMode dos veces). Sustituido por PRNG mulberry32 con semilla en `useLayoutEffect`. |
| 3. `<instancedMesh args={[geometry, material]}>` con un `<meshStandardMaterial onBeforeCompile>` hijo además, e `instanceColor` / atributo `aPhase` creados en `onUpdate` | memory | REJECT | Dos materiales para una malla, y `onUpdate` reasigna buffers en cada actualización; además añadía `aPhase` a la geometría compartida del GLB. task1 usa `setMatrixAt`/`setColorAt` una vez; el bote en GPU queda para task2. |
| 4. 6000 fans en la multitud | memory | REJECT | Calculado: 6000 × 96 tris + resto ≈ 593k, al borde del objetivo de 600k. Bajado a 5000 (≈ 496k). |
| 5. `dpr={[1, 1.75]}` | API truth | REJECT | `.cursor/rules/20-r3f-patterns` fija `[1, 1.5]` salvo medición documentada. |
| 6. `precision highp float;` dentro del GLSL del cielo | literacy | REJECT | `30-shaders`: la precisión se fija en un solo sitio (propiedad del material). Movido a `precision="highp"`; la justificación o el paso a mediump queda para task2 (TODO en el archivo). |
| 7. `CameraRig` mutando `camera` devuelto por `useThree` | API truth | ACCEPT (con cambio) | Lee la cámara del estado de `useFrame` y `get()` en los listeners, como `src/lib/BudgetProbePerFrame.jsx` (que documenta ese fallo de `react-hooks/immutability`). Cambio preventivo: no se probó que la versión original fallara. `npm run lint` pasa. |

At least two REJECT rows: sí (1–6), pendientes de confirmación humana.
