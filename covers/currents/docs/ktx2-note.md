# KTX2 choice

Album: Tame Impala — Currents (2015).
Artwork creator and source: modelo 3D propio, generado de forma procedural en Blender (scripts `blender/currents.py` y `blender/flow.py` del proyecto original, https://github.com/nbfrodri/currents-album-cover). Recrea en geometría la composición de la portada original, obra de Robert Beatty; no se incluye la imagen original ni ningún recorte de ella. `public/ball-env.jpg` es un render propio (Cycles) de esa misma escena. `public/thumbnail.svg` es original.
Right to publish and adapt: arte creado por el estudiante; al ser una recreación (fan art) de una portada comercial, queda a revisión del profesor (D8). Tipografía Archivo Expanded bajo SIL Open Font License 1.1 (`public/fonts/ofl.txt`).
Required attribution: *Currents* (2015) es de Tame Impala; portada original de Robert Beatty. Proyecto académico sin ánimo de lucro. El audio son los previews oficiales de 30 s servidos por Apple; no se aloja audio en el repositorio.

Chosen mode: — (task3, aún no hecho; las texturas se cargan como JPG y como PNG dentro del GLB).
Why it fits this sleeve: —

Measured on: tamaños en disco y `gltf-transform inspect`, 2026-11-11. GPU bytes calculados como ancho × alto × 4 (RGBA8).
Levels counted: nivel 0 en todas las filas.

| Asset | File bytes (on disk) | GPU bytes (computed) | texture.format | Observation |
| --- | ---: | ---: | --- | --- |
| `ball-env.jpg` (1024×512, reflejo del cromo) | 47 960 | 2 097 152 | RGBAFormat | candidata a KTX2 en task3 |
| ChromeRoughness (PNG 1024×512, dentro del GLB) | ~111 400 | 2 097 152 | RGBAFormat | dato, no color |
| GlassStreaks (PNG 512×512, dentro del GLB) | ~25 200 | 1 048 576 | RGBAFormat | con alfa |
| ETC1S .ktx2 | … | … | … | task3 |
| UASTC .ktx2 | … | … | … | task3 |

Texture count (renderer.info.memory.textures, a count, not bytes): 1 mientras carga → 6 con el modelo.

Orientation check: … (task3)
colorSpace check: `ballEnv.colorSpace = SRGBColorSpace` se asigna en `src/scene.js`; las texturas del GLB las etiqueta GLTFLoader.
