# KTX2 choice

<!-- Template (Units 8–9 assignment / KTX2-Basis satellite). Replace every ellipsis. -->

Album: Queen — Bohemian Rhapsody (banda sonora, 2018). Homenaje 3D no oficial.
Artwork creator and source: `public/sleeve.png` (1024², sRGB) pintado por `tools/make-sleeve.mjs` (script propio, sin dependencias, semilla fija; lo escribió Claude Code a petición de gontugithub el 2026-11-11). Arte original: atardecer en un estadio y un maniquí a contraluz con pose propia. Sin foto, texto, escudo ni calco de la portada oficial, que solo vive en `reference/` (excluido de git) como referencia de atmósfera.
Right to publish and adapt (student-created / public domain / open licence / written permission): student-created (generado por código del propio repo).
Required attribution: ninguna para la funda.

**Modelos 3D (GLB de la ruta).** `Stadium`, `Stage`, `Mic` y los fans: propios (generados por código en Blender vía MCP, filas 17–18 y 21 del merge log).
`Freddie`: derivado de «Freddie Mercury - T_Pose» de Gerwerni (https://sketchfab.com/3d-models/freddie-mercury-t-pose-b89ee72767a54daa8c79768a5cdd2bbd), licencia CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Cambios: pose, diezmado de 93 805 a 23 683 tris y bake de sus 24 texturas a un atlas. Atribución requerida, visible en la cover: «"Freddie Mercury - T_Pose" by Gerwerni (Sketchfab), CC BY 4.0, modificado». Representa a una persona real: la licencia no cubre su imagen. Decisión registrada en la fila 20 del merge log.

Chosen mode (ETC1S or UASTC; or PNG kept, if the encoder was missing — say so): **ETC1S** para la funda (`public/sleeve-etc1s.ktx2`, la que carga la ruta por defecto) y para las dos texturas del GLB. UASTC se codificó y se midió para comparar (`?sleeve=uastc`).
Why it fits this sleeve (one honest reason: photo grain, sharp type, a logo...): la funda es un degradado de atardecer con una silueta y **sin texto ni trazos finos**: los artefactos de bloque de ETC1S no se ven a la distancia de la portada, y pesa 12× menos que el PNG en disco y la mitad que UASTC en GPU. UASTC solo compensaría con letras o bordes nítidos, que esta funda no tiene. En el GLB, el atlas de Freddie y el AO del estadio son color o sombreado suave; no hay normal maps (que irían a UASTC).

Measured on (machine, browser, date): MacBook Apple Silicon (macOS), HeadlessChrome 157 con ANGLE/SwiftShader, 1440×900, DPR 1, 2026-11-17. SwiftShader transcodifica a ETC2/ASTC; una GPU de escritorio (p. ej. BC7/BC1) daría otro `texture.format` y otros bytes: el formato es del dispositivo.
Levels counted (all levels on every row, or level 0 on every row): **todos los niveles** en todas las filas (`gpuBytes(texture)` con `levels: 'all'`; los PNG con las mipmaps que genera three).

| Asset | File bytes (on disk) | GPU bytes (computed) | texture.format | Observation |
| --- | ---: | ---: | --- | --- |
| Funda — source PNG (`public/sleeve.png`, 1024²) | 1 730 162 | 5 592 404 | RGBAFormat | `?sleeve=png`; flipY true |
| **Funda — ETC1S .ktx2** (por defecto) | **143 086** | **699 064** | RGB_ETC2_Format | 11 niveles, sRGB, flipY false |
| Funda — UASTC .ktx2 (`--zcmp 18`) | 1 151 467 | 1 398 128 | RGBA_ASTC_4x4_Format | `?sleeve=uastc` |
| GLB — `freddie_atlas` PNG fuente (2048², RGBA) | 1 933 028 | 22 369 648 (calculado: 2048²·4·4/3) | RGBAFormat | no se carga: referencia |
| **GLB — `freddie_atlas` ETC1S** | 291 966 (dentro del GLB) | **5 592 432** | RGBA_ETC2_EAC_Format | 12 niveles; RGBA por el alfa del pelo |
| GLB — `stadium_ao` PNG fuente (2048²) | 2 002 100 | 22 369 648 (calculado) | RGBAFormat | no se carga: referencia |
| **GLB — `stadium_ao` ETC1S** | 432 432 (dentro del GLB) | **2 796 216** | RGB_ETC2_Format | 12 niveles; sin alfa → la mitad |
| GLB completo `public/stadium.ktx2.glb` | 1 156 952 (fuente sin optimizar: 6 196 356) | — | — | meshopt + ETC1S, `gltf-transform` 4.5.1 |

Texture count (renderer.info.memory.textures, a count, not bytes), before and after the sleeve loads: 0 → 2 en idle (funda + vinilo de CoverPortal); 4 con el mundo montado (+ atlas de Freddie + AO).

Orientation check (does uv 0,0 land bottom-left and the title read upright? how was the file encoded?): sí. Capturas de idle con `?sleeve=png`, `etc1s` y `uastc` idénticas (puño arriba a la izquierda, sol a la izquierda). Codificado con `npm run encode` (`--lower_left_maps_to_s0t0`, `KTXorientation: ru` comprobado con `ktx info`); `flipY` queda en false, sin `1.0 - vUv.y`. Las texturas del GLB siguen la convención glTF (GLTFLoader, flipY false).
colorSpace check (what does texture.colorSpace log after loading? what did you do if it was not srgb?): `srgb` en las tres variantes de la funda (el KTX2 lo lleva en el archivo: `--assign_oetf srgb`, `Transfer: KHR_DF_TRANSFER_SRGB`) y en las dos texturas del GLB (ranura `baseColorTexture`, sRGB por especificación). El AO se horneó lineal: antes de exportar se pasó a valores sRGB para que el decode sRGB de three devuelva el AO lineal (si no, el estadio salía ~30 % más oscuro).

## Cómo se generó (task3)

```sh
# funda
npm run encode -- queen-bohemian-rhapsody            # toktx / ktx 4.4.2
# GLB: primero ETC1S, después meshopt (al revés, meshopt se decodifica y se recomprime con pérdida)
npx @gltf-transform/cli@4.5.1 etc1s blender/stadium.glb /tmp/step1.glb --quality 255 --compression 2
npx @gltf-transform/cli@4.5.1 optimize /tmp/step1.glb public/stadium.ktx2.glb --compress meshopt \
  --texture-compress false --flatten false --join false --instance false --palette false --simplify false
```

`optimize` va con `flatten`/`join`/`instance`/`palette`/`simplify` apagados: por defecto fusiona nodos y materiales
(se perderían los nombres `Freddie`, `Stadium`, `Fan_LOD0`… que lee `Scene.jsx`) y simplifica la malla ya diezmada a mano.
Bytes «dentro del GLB»: tamaño de la imagen KTX2 incrustada (`bufferView.byteLength`).

**Dos KTX2Loader.** La funda usa el loader compartido (`useKTX2Texture`, `src/lib/ktx2.js`); el GLB necesita una
instancia propia para `GLTFLoader.setKTX2Loader` (`stadiumGlb.js`), con el mismo `TRANSCODER_PATH`. three avisa
«Multiple active KTX2 loaders»: son dos pools de workers mientras la ruta está montada; el del GLB se libera al desmontar.
Unificarlos exigiría tocar `src/lib/`, fuera de la frontera de la cover.
