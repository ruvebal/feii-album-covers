# renderer.info — cover

Album: Michael Jackson — Off the Wall (1979).
Scene: pared de ladrillo de 4,2 m (1 InstancedMesh de unos 1.340 ladrillos con bisel + mortero), suelo, Michael (unas 55 mallas con perfiles de torno; los dedos no proyectan sombra), plató (2 ventanas de luz, trípode con cámara, reflector, marca en el suelo). Una sola luz con sombra (la principal, mapa de 2048 px, PCF); el plató y la pared no proyectan sombra, solo la reciben. Entorno de reflejos con `Environment` + `Lightformer` (se pinta una vez, sin HDR descargado). DPR [1, 1.5].
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.
Accepted ceiling for this tree: calls ≤ 98, triangles ≤ 193 000, geometries ≤ 90, textures ≤ 6.

Pins: three@0.185.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, react@19.3.1 (this repo's package.json).

Medido con el `BudgetProbe` de la galería (panel en `/covers/off-the-wall?budget`), Microsoft Edge sin ventana, ANGLE D3D11 sobre Intel UHD Graphics (portátil i7-13620H), 1440x900, 2026-11-11. Los triángulos y las llamadas incluyen la pasada del mapa de sombras.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| task1, primer intento (bisel de 2 segmentos, pared con sombra) | Intel UHD, 2026-11-11 | 1 luz | 77 | 704 566 | 80 | 6 | No: rechazado, ver merge log |
| task1, versión anterior — vista El plató (pared de 3,6 m, manos sin dedos) | Intel UHD, 2026-11-11 | 1 luz | 88 | 167 094 | 80 | 6 | Superada |
| task1 — vista Portada | Intel UHD, 2026-11-11 | 1 luz | 79 | 191 066 | 71 | 6 | Sí |
| task1 — vista De lado | Intel UHD, 2026-11-11 | 1 luz | 76 | 190 946 | 77 | 6 | Sí |
| task1 — vista Por detrás de Michael | Intel UHD, 2026-11-11 | 1 luz | 79 | 189 040 | 87 | 6 | Sí |
| task1 — vista El plató (la más cara) | Intel UHD, 2026-11-11 | 1 luz | 96 | 191 574 | 88 | 6 | Sí (escritorio) |

`memory.textures` es un recuento, no bytes: el mapa de sombras, el mapa de entorno y los objetivos internos de `Environment`. La ruta no carga ninguna imagen.

Fotogramas: unos 60 por segundo en esa máquina (contados con `requestAnimationFrame` durante 3 s). El grano de película del DOM va sin `mix-blend-mode`: con él bajaba a unos 57.

Móvil: sin medir en un teléfono real. En la vista "El plató" se pasa del tope de 80 llamadas (96); en las otras tres vistas queda en 76–79. Si hace falta, el siguiente paso es fusionar las piezas estáticas de Michael en menos mallas.
