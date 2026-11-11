# renderer.info — Queen · Bohemian Rhapsody

Album: Queen — Bohemian Rhapsody (homenaje 3D, arte propio).
Scene (task1): portada procedural (CanvasTexture) → skybox con shader propio + estadio, escenario,
Freddie-maniquí y micro **procedurales** (placeholders, `USE_GLB = false`) + multitud de 5000 fans en
1 `InstancedMesh`. 3 luces (ambiente, direccional, spot), shadows off, DPR cap [1, 1.5], sin post-proceso.
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80. Objetivo propio: ≤ 40 calls, ≤ 600k triangles.
Accepted ceiling for this tree: TODO(medir) — se escribe a la vez en `src/budget.js` (`CEILING`).

Pins: three@0.185.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, react@19.3.1 (this repo's package.json).

## Medido (task1)

Fuente: `console.table` de `RendererInfo.jsx` (etiquetas `[queen-bohemian-rhapsody] renderer.info — …`)
y el panel `BudgetProbe` (arriba a la izquierda en `npm run dev`, o con `?budget`).

| Momento | Machine, browser, date | Shadows | calls | triangles | geometries | textures |
| --- | --- | --- | --- | --- | --- | --- |
| portada (t ≈ 1 s) | TODO(medir) | off | TODO(medir) | TODO(medir) | TODO(medir) | TODO(medir) |
| plano ancho (t ≈ 4,6 s) | TODO(medir) | off | TODO(medir) | TODO(medir) | TODO(medir) | TODO(medir) |
| plano final (intro + 1 s) | TODO(medir) | off | TODO(medir) | TODO(medir) | TODO(medir) | TODO(medir) |

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
| CoverPortal: funda (caja, 6 grupos de material) + vinilo + etiqueta + telón | 12 + 384 + 192 + 2 = 590 | 6 + 1 + 1 + 1 = 9 (solo hasta t = 2,3 s) |
| **Total con todo visible** (fundido t = 1,3–2,3 s) | **≈ 497 070** | **15** |

Esperado: en idle y durante el zoom solo se dibuja CoverPortal (el mundo está oculto hasta t = 1,3 s) → ~9 calls, ~590 triángulos.
Tras el fundido (t > 2,3 s) desaparece la funda: ≈ 496 480 triángulos, 6 calls.
`memory.textures` es un **recuento**, no bytes: la portada aporta 1 CanvasTexture.

La multitud es el 97 % de los triángulos. Si el plano final pasa de presupuesto en un portátil modesto,
la palanca es `count` en `Crowd.jsx` o un Fan_LOD1 (~100 tris) para la grada lejana en task3.
