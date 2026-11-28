# AI-assisted 3D merge log — Bad Bunny (`/covers/badbunny`)

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| 1 — Rayos 3D móviles en `StormSky.jsx` y exceso de texto informativo en el HUD superior | motion / ui-canvas | REJECT | Los cilindros de rayos moviéndose distraían de la escena de *YHLQMDLG* y el recuadro superior con metadatos y botones restaba espacio visual al lienzo 3D; se eliminaron los rayos y se trasladaron los controles a una barra flotante inferior (`.yhl-dock`). |
| 2 — Primitivas separadas con `SUBSURF` para `EutdmBadBunny` en `eutdm-world.glb` | literacy / visual | REJECT | Aplicar subdivisión Catmull-Clark sobre cilindros separados encogía los extremos creando huecos en rodillas y codos; se rehízo con mallas continuas por anillos (`bmesh` lofting) para piernas, sudadera con cordones, abrigo abierto, barba, gafas y gorro. |
| 3 — Escenario de estudio de vinilos (`TurntableStudioRoom`) unido en un solo nodo en `yhlqmdlg-world.glb` | performance / API truth | ACCEPT | Unir la credenza de nogal, los altavoces Hi-Fi, el amplificador de válvulas, la lámpara y los discos de oro enmarcados en un único nodo multi-material mantiene las llamadas de dibujado muy por debajo del límite móvil (≤ 80 calls). |
| 4 — Proxy de colisión cilíndrico en `sapo_concho.glb` y eliminación de `uvst.glb` duplicado | memory / performance | ACCEPT | Desactivar el raycasting por triángulo en la malla densa del Sapo Concho (`obj.raycast = NOOP_RAYCAST`) evita tirones al mover el ratón, y borrar `uvst.glb` sin uso ahorra 721 KB en el paquete. |
