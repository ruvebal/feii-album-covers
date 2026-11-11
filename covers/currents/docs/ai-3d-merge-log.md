# AI-assisted 3D merge log

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| 1 — port de `main.js` a `scene.js` + `Route.jsx` (Claude Code) | memory | ACCEPT | Listeners con AbortController, `setAnimationLoop(null)`, `dispose()` de geometrías, materiales, texturas y decodificador, audio parado y `AudioContext` cerrado al desmontar; comprobado navegando a otra ruta y volviendo. |
| 2 — decodificador Draco con `LoadingManager.setURLModifier` | API truth | REJECT | No cargaba en `npm run dev`: el cargador antepone su ruta y el modelo se quedaba en «Cargando». Se rehízo con `setDecoderPath({ js, wasm })` de three 0.185.1. |
| 3 — MP3 locales con respaldo al preview (del proyecto original) | ui-canvas | REJECT | En la galería pediría archivos que no existen en cada tema; el reproductor usa solo el preview. |
| 4 — tope de DPR 2 (del proyecto original) | memory | REJECT | La regla de la galería es 1.5 sin una medición que lo justifique; se bajó a 1.5. |
