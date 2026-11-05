# AI-assisted 3D merge log

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| 1 — port de `main.js` a `scene.js` + `Route.jsx` (Claude Code) | memory | ACCEPT | Listeners con AbortController, `setAnimationLoop(null)` y `dispose()` de geometrías, materiales, texturas, PMREM y composer al desmontar. |
| 2 — reformateo completo de `covers/registry.json` al añadir la fila | ui-canvas | REJECT | Cambiaba las líneas de otras rutas; se rehízo añadiendo solo una línea. |
| 3 — `renderer.info.autoReset = false` + reset por frame | API truth | ACCEPT | Sin esto el panel mostraba `calls 1` (solo la última pasada del bloom). |
