# renderer.info — cover

Album: Tame Impala — Currents (2015).
Scene: modelo glTF de Blender (`public/currents.glb`, Draco: rayas, estela, bola cromada, cuerpo, títulos, contraportada con 13 filas y cristal), marco extruido, plano de brillo, halo del latido, franja del tema que suena y fondo a pantalla completa (ShaderMaterial). 1 luz hemisférica + 2 direccionales. Shadows off, sin post-proceso, DPR cap 1.5 (baja a 1 si los primeros 2 s van por debajo de 45 fps).
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.
Accepted ceiling for this tree: calls ≤ 32, triangles ≤ 330 000, geometries ≤ 40, textures ≤ 6.

Pins: three@0.185.1, react@19.3.1 (this repo's package.json). Esta ruta no usa @react-three/fiber: monta Three.js directamente en `src/scene.js`, así que el panel de la galería (BudgetProbe, R3F) no aplica. Las lecturas salen del panel propio: abrir `/covers/currents?budget`.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cover (task1, en reposo) | Intel Core i7-1185G7 (gráfica integrada), Linux, Brave (Chromium 157), 1520×711, DPR 1.25, 2026-11-11 | off | 29 | 328 330 | 39 | 6 | sí |
| cover (task1, sonando: halo + franja del tema) | misma máquina y fecha | off | 31 | 328 334 | 40 | 6 | sí |
| cover + KTX2 (task3) | — | off | — | — | — | — | — |

Notas:
- Casi todos los triángulos son del modelo (`gltf-transform inspect`: solo las rayas son 112 704; el resto, cuerpo, estela, bola, títulos y contraportada). Las rayas son geometría con colores de vértice, no una textura: es lo primero a simplificar en Blender si un móvil no llega.
- `memory.textures` es un **recuento**, no bytes. Las imágenes de la ruta son tres: la panorámica del reflejo (`ball-env.jpg`) y las dos del modelo (rugosidad del cromo y vetas del cristal).
- Pendiente: repetir la fila en un móvil real (tope de la unidad: ≤ 80 calls; aquí 31).
