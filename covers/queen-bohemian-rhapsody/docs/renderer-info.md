# renderer.info — Queen · Bohemian Rhapsody

Album: Queen — Bohemian Rhapsody (homenaje 3D, arte propio).
Scene (task1): portada procedural (CanvasTexture) → skybox con shader propio + estadio, escenario,
Freddie-maniquí y micro **procedurales** (placeholders, `USE_GLB = false`) + multitud de 5000 fans en
1 `InstancedMesh`. task2: + 1 667 luces de móvil en 1 `Points`, 4 luces (ambiente, direccional, 2 spots), shadows off, DPR cap [1, 1.5], sin post-proceso.
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80. Objetivo propio: ≤ 40 calls, ≤ 600k triangles.
Accepted ceiling for this tree: **19 calls · 559 733 triangles · 14 geometries · 4 textures** (pico del fundido, task3 con el GLB) — igual que `src/budget.js` (`CEILING`).
task3: el GLB de Blender sustituye a los placeholders (`USE_GLB = true`): estadio + escenario + Freddie (modelo CC-BY, ver D8) + micro, multitud con Fan_LOD0/Fan_LOD1; funda en KTX2 ETC1S.

Pins: three@0.185.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, react@19.3.1 (this repo's package.json).

## Medido (task1)

Fuente: `console.table` de `RendererInfo.jsx` (etiquetas `[queen-bohemian-rhapsody] renderer.info — …`)
y el panel `BudgetProbe` (arriba a la izquierda en `npm run dev`, o con `?budget`).

| Momento | Machine, browser, date | Shadows | calls | triangles | geometries | textures |
| --- | --- | --- | --- | --- | --- | --- |
| idle (funda orbitable, antes de entrar) | MacBook (macOS), HeadlessChrome 157 + SwiftShader, 2026-11-11 | off | 8 | 588 | 3 | 2 |
| portada (t ≈ 1 s, zoom sobre la funda) | ídem | off | 10 | 592 | 4 | 2 |
| **pico: fundido portada → mundo (t ≈ 1,3–2,3 s)** | ídem (panel muestreado cada 100 ms) | off | **16** | **497 072** | 10 | 2 |
| plano ancho (t ≈ 4,6 s) | ídem | off | 6 | 496 480 | 10 | 2 |
| plano final (intro + 1 s) | ídem | off | 4 | 494 700 | 10 | 2 |

Cómo se midió: `npm run dev` + Chrome headless (`--use-angle=swiftshader`, 1440×900, DPR 1) controlado por
CDP; filas de `console.table` (`RendererInfo.jsx`) y, para idle y el pico, el texto del panel `BudgetProbe`.
`renderer.info` cuenta lo que se dibuja: no depende de la GPU, así que los conteos valen para cualquier
máquina; **no** mide rendimiento (SwiftShader es CPU). Pendiente: fps en un portátil real.
La diferencia entre plano ancho y final es el frustum
culling (Freddie/escenario fuera de cuadro al mirar al cielo).

## Medido (task2, 2026-11-12)

Mismo método y máquina (HeadlessChrome 157 + SwiftShader). Cambios de task2: shader del cielo revisado
(mismo coste: 1 esfera), bote de la multitud en el vertex shader (0 calls, 0 triángulos), luces de móvil
(`Points`, 1 667 puntos, **1 call**, 1 geometría; no suman triángulos) y un segundo foco violeta (0 calls).

| Momento | Machine, browser, date | Shadows | calls | triangles | geometries | textures |
| --- | --- | --- | --- | --- | --- | --- |
| idle | HeadlessChrome 157 + SwiftShader, 2026-11-12 | off | 8 | 588 | 3 | 2 |
| portada (t ≈ 1 s) | ídem | off | 10 | 592 | 4 | 2 |
| **pico: fundido (t ≈ 1,3–2,3 s)** | ídem (panel cada 100 ms) | off | **16** | **497 072** | **11** | 2 |
| plano ancho (t = 4 s, scrub dev) | ídem (panel) | off | 6 | 496 480 | 11 | 2 |
| primer plano, móviles encendiéndose (t = 11 s) | ídem (panel) | off | 7 | 496 480 | 11 | 2 |
| plano final (intro + 1 s) | ídem (`console.table`) | off | 5 | 494 700 | 11 | 2 |

Los móviles solo se dibujan cuando hay alguno encendido (`material.visible`, uNight > 0, tod ≳ 0,3): en el pico
del fundido (tod = 0) no se dibujan, por eso calls y triángulos del techo no cambian. `geometries` sube a 11
en cuanto el mundo se monta. `CEILING` actualizado a 11 geometrías en `src/budget.js`.

## Calculado (no medido) — para contrastar

Triángulos por geometría, contados en Node con las mismas funciones de `src/placeholders.js`
(índices / 3). No sustituye a la medición: `render.triangles` solo cuenta lo que se dibuja en ese frame.

| Pieza | Triángulos | Draw calls |
| --- | ---: | ---: |
| Stadium (césped + grada, LatheGeometry 72 seg.) | 11 712 | 1 |
| Stage | 12 | 1 |
| Freddie (cápsulas fusionadas, pose de la portada propia) | 1 608 | 1 |
| Mic | 172 | 1 |
| Crowd: Fan_LOD0 provisional 96 × 5000 instancias | 480 000 | 1 |
| SunsetSky (esfera 48 × 32) | 2 976 | 1 |
| Phones (task2): `Points`, 1 de cada 3 fans | 0 (1 667 puntos) | 1 (solo de noche) |
| CoverPortal: funda (caja, 6 grupos de material) + vinilo + etiqueta + telón | 12 + 384 + 192 + 2 = 590 | 6 + 1 + 1 + 1 = 9 (solo hasta t = 2,3 s) |
| **Total con todo visible** (fundido t = 1,3–2,3 s) | **≈ 497 070** | **15** |

Esperado: en idle y durante el zoom solo se dibuja CoverPortal (el mundo está oculto hasta t = 1,3 s) → ~9 calls, ~590 triángulos.
Tras el fundido (t > 2,3 s) desaparece la funda: ≈ 496 480 triángulos, 6 calls.
`memory.textures` es un **recuento**, no bytes: la portada aporta 1 CanvasTexture.

La multitud es el 97 % de los triángulos. Si el plano final pasa de presupuesto en un portátil modesto,
la palanca es `count` en `Crowd.jsx` o un Fan_LOD1 (~100 tris) para la grada lejana en task3.

## Medido (task3, 2026-11-17) — GLB + KTX2

Mismo método (HeadlessChrome 157 + ANGLE/SwiftShader, 1440×900, DPR 1, CDP; panel `BudgetProbe` cada 100 ms y
`console.table` de `RendererInfo.jsx`). Escena: `public/stadium.ktx2.glb` (meshopt + ETC1S) y funda `sleeve-etc1s.ktx2`.

| Momento | Machine, browser, date | Shadows | calls | triangles | geometries | textures |
| --- | --- | --- | --- | --- | --- | --- |
| idle | HeadlessChrome 157 + SwiftShader, 2026-11-17 | off | 8 | 588 | 3 | 2 |
| portada (t ≈ 1 s) | ídem (`console.table`) | off | 10 | 592 | 4 | 2 |
| **pico: fundido portada → mundo** | ídem (panel cada 100 ms) | off | **19** | **559 733** | **14** | **4** |
| plano ancho (t = 4,6 s) | ídem (`console.table`) | off | 9 | 559 141 | 14 | 4 |
| plano final (intro + 1 s) | ídem (`console.table`) | off | 7 | 535 220 | 14 | 4 |

`CEILING` actualizado a `{ calls: 19, triangles: 559733, geometries: 14, textures: 4 }` (`src/budget.js`).
Dentro del objetivo propio (≤ 40 calls, ≤ 600k triángulos) y del tope del curso (≤ 200 / ≤ 80 calls).
SwiftShader es CPU: la intro tardó ~95 s de reloj en vez de 16,5 (el reloj de la intro avanza por frame). Los conteos
no dependen de la GPU; el rendimiento real (fps) está pendiente de medir en un portátil.

### Calculado (task3) — triángulos del GLB (`gltf-transform inspect`)

| Pieza | Triángulos | Draw calls |
| --- | ---: | ---: |
| Stadium (grada 360°, AO bakeado, color de vértice) | 17 288 | 1 |
| Stage (`QBR_Baked` + `Sg_Lamp` emisivo) | 1 756 | 2 |
| Freddie (modelo CC-BY diezmado, 1 atlas, alfa MASK) | 23 683 | 1 |
| Mic (cromo + negro) | 238 | 2 |
| Crowd LOD0: 200 fans más cercanos × 886 | 177 200 | 1 |
| Crowd LOD1: 4 800 fans × 70 | 336 000 | 1 |
| SunsetSky | 2 976 | 1 |
| Phones (`Points`, solo de noche) | 0 | 1 |
| CoverPortal (solo hasta el fundido) | 590 | 9 |
| **Total con todo visible** | **559 731** | **19** (con los móviles apagados) |

El calculado (559 731) cuadra con el medido (559 733). La multitud sigue siendo el 92 % de los triángulos; antes de task3,
5 000 × Fan_LOD0 (886) habrían sido 4,4 M: por eso Fan_LOD1 se rehízo a 70 tris (merge log, fila 22).
