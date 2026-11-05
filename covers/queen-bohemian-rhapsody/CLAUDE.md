# Queen — Bohemian Rhapsody · 3D cover (feii-album-covers)

Este archivo vive en `covers/queen-bohemian-rhapsody/CLAUDE.md`. Lanza `claude` desde la raíz del repo y lee también
`CONTRIBUTING.md` y `.cursor/rules/*` (00-project, 20-r3f-patterns, 30-shaders, 40-asset-pipeline, 50-performance).
Si algo de aquí contradice al repo, gana el repo.

## Frontera (CONTRIBUTING)
- Solo se toca `covers/queen-bohemian-rhapsody/**` + UN objeto en `covers/registry.json` (ordenado por slug, una línea por objeto).
- NUNCA: `src/App.jsx`, `src/gallery/`, `src/lib/`, `scripts/`, `public/` (raíz), `.github/`, `.gitignore`, `covers/_studio`, `covers/_template`, otras covers.
- Assets de la ruta en `covers/queen-bohemian-rhapsody/public/`, referenciados con `new URL('../public/x', import.meta.url).href`.
- Transcoder Basis ya vendorizado en `public/basis/`: NO copiarlo. Ruta compartida en `src/lib/ktx2.js` (`TRANSCODER_PATH`), medir con `src/lib/gpuBytes.js`.
- Si usas `extend`, clave única con prefijo del slug (o forma componente). `npm run lint` lo comprueba.
- Al desmontar: dispose de texturas/geometrías propias, quitar listeners y rAF, quitar la clase `route-queen-bohemian-rhapsody`.
- Antes de push: `npm run lint && npm run build`.

## Mapa de archivos (src/)
| Archivo | Qué hace |
| --- | --- |
| `Route.jsx` | Canvas, overlay DOM (título, Saltar/Repetir intro, Escape, aria-live), reduced-motion, BudgetProbe |
| `Scene.jsx` | Árbol R3F: portada → mundo (cielo, luces, estadio, Freddie, multitud); `USE_GLB` elige placeholders o GLB |
| `keys.js` | Keyframes de cámara (`KEYS`), `INTRO_END`, `PORTAL_FADE`, `WORLD_FROM` |
| `CameraRig.jsx` | Vuelo Catmull-Rom por tiempos → `CameraControls` al terminar; teclas dev |
| `SunsetSky.jsx` | Skybox con shader propio (`uTime`, `uTod`, `uSunDir`) |
| `CoverPortal.jsx` | Portada PROPIA (canvas 2D procedural) que se desvanece |
| `Crowd.jsx` | Multitud = 1 `InstancedMesh`, posiciones con PRNG con semilla |
| `placeholders.js` | Geometría procedural con los nombres/medidas del futuro GLB |
| `stadiumGlb.js` | Camino GLTF + KTX2 + meshopt (inactivo hasta task3) |
| `RendererInfo.jsx` | `console.table` de renderer.info en portada / plano ancho / plano final |

## Ejes de la escena (contrato con Blender)
Metros, +Y arriba. Freddie en el origen, pies en y = 0, mirando a −Z, cara a ~1,72 m. Superficie del escenario y = 0,
césped y = −1,6. Sol hacia +Z. Grada desde r = 24 m. Fans: +Z local apunta al escenario.

## Flujo de PRs (rama: `cover-queen-bohemian-rhapsody-task<N>-<tema>`, nunca push a main)
- task1: Route.jsx + registry + `public/thumbnail.svg` + `docs/renderer-info.md` (mesh/cámara/escena)
- task2: shader propio (`SunsetSky.jsx`) + `docs/shader-note.md`
- task3: KTX2 (ETC1S/UASTC) + `docs/ktx2-note.md` (bytes de archivo y GPU) + `docs/ai-3d-merge-log.md`
- task4: arreglo en otro slug + una review formal
- Cada PR lleva la tabla **AI Review Log** (qué hizo la IA / qué verifiqué yo). Los PRs los abre el humano.

## Derechos (D8) — repo PÚBLICO con GitHub Pages
- NO publicar la portada oficial ni el vídeo de referencia. Solo referencia local en `reference/` (excluido en `.git/info/exclude`).
- Arte propio / PD / licencia abierta. Registrar creador, fuente, licencia en `docs/ktx2-note.md`.
- Freddie = maniquí estilizado: sin parecido facial realista, sin image-to-3D ni texturas a partir de fotos.

## Referencia visual (vídeo 16.5 s)
Portada flotando en vacío → atraviesa → estadio al atardecer (Freddie a contraluz) → push-in → contrapicado →
tras él → primer plano cara (focos violetas) → baja a cinturón/micro → cielo nocturno con star trails
→ plano final con fan-maniquí. Estética: maniquíes estilizados, luces de móviles, haces de luz.

## Presupuesto GPU
Tope del curso: ≤ 200 draw calls desktop, ≤ 80 móvil; techo propio en `src/budget.js` (`CEILING`) + `docs/renderer-info.md`.
Objetivo propio: ≤ 600k tris, ≤ 40 draw calls, ≤ 3 atlas 2048², GLB < 15 MB. Multitud = InstancedMesh (posiciones en JS).
Freddie 15–25k · estadio bakeado ≤ 20k · Stage+Mic ≤ 3k · Fan_LOD0 ~400 · Fan_LOD1 ~100.

## Dev tools en CameraRig (solo `npm run dev`)
Espacio pausa · ←/→ scrub · S salta al final · **P imprime keyframe** para pegar en `keys.js`. Escape (también en build) salta la intro.

## Blender (Fase 3, vía MCP de Blender) — nombres de nodo exactos
`Freddie`, `Mic`, `Stage`, `Stadium`, `Fan_LOD0`, `Fan_LOD1`. Export GLB +Y, sin cámaras/luces, luego
`npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (necesita `toktx`).
Cada paso generado por IA → fila en `docs/ai-3d-merge-log.md` (ACCEPT / REJECT / ESCALATE).
