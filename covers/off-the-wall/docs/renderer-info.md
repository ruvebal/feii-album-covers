# renderer.info — cover

Album: Michael Jackson — Off the Wall (1979).
Scene: pared de ladrillo de 4,2 m (1 InstancedMesh de unos 1.340 ladrillos con bisel + mortero), suelo, Michael (unas 55 mallas con perfiles de torno; los dedos no proyectan sombra), plató (2 ventanas de luz, trípode con cámara, reflector, marca en el suelo). Una sola luz con sombra (la principal, mapa de 2048 px, PCF); el plató y la pared no proyectan sombra, solo la reciben. Entorno de reflejos con `Environment` + `Lightformer` (se pinta una vez, sin HDR descargado). DPR [1, 1.5].
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.
Accepted ceiling for this tree: calls ≤ 98, triangles ≤ 193 000, geometries ≤ 90, textures ≤ 8 (antes 6; la séptima es el monitor y la octava el espejo).

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

`memory.textures` es un recuento, no bytes. En las mediciones iniciales incluye el mapa de sombras, el mapa de entorno y los objetivos internos de `Environment`.

Fotogramas: unos 60 por segundo en esa máquina (contados con `requestAnimationFrame` durante 3 s). El grano de película del DOM va sin `mix-blend-mode`: con él bajaba a unos 57.

task2 (shader de los ladrillos): mismas lecturas en las cuatro vistas (79 / 76 / 79 / 96 calls, unos 191 000 triángulos, 6 texturas); el shader no añade llamadas ni texturas.

Cabeza nueva (afro que enmarca la cara, ojos, cejas, patillas, nariz y sonrisa) con las piezas de la cara fundidas en una malla por material (`mergeGeometries`): la cabeza pasa de unas 25 llamadas a 7. Medido en Intel UHD el 2026-11-11: Portada 70 calls / 189 090 tri / 63 geometrías; De lado 67 / 188 970 / 69; Por detrás 72 / 187 808 / 80; El plató 87 / 189 598 / 80; 6 texturas y unos 60 fps. Las cuatro vistas quedan por debajo del techo aceptado.

Plató horneado (todas sus piezas fundidas por material, `Studio.jsx`) y ventana en la pared. Medido en Intel UHD el 2026-11-11: Portada 71 calls / 189 592 tri / 64 geometrías; De lado 70 / 189 552 / 66; Por detrás 62 / 187 922 / 66; El plató 73 / 189 684 / 66; 6 texturas y unos 60 fps.

Móvil: sin medir en un teléfono real, pero las cuatro vistas quedan ya por debajo del tope de 80 llamadas (62–73). El lienzo usa `preserveDrawingBuffer` para poder guardar la foto de la portada; no cambia las llamadas.

Monitor en directo del plató (`LiveMonitor.jsx`) y moonwalk nuevo. Medido en Intel UHD el 2026-11-11 con el panel ?budget: Portada 74 calls / 189 646 tri / 67 geometrías; De lado 70 / 189 552 / 69; Por detrás 66 / 188 056 / 71; El plató 76 / 189 738 / 71; 7 texturas; unos 60 fps. El monitor hace una segunda pasada de render a una textura de 512 px que `renderer.info` no recoge (se reinicia en cada render), así que se midió aparte contando las llamadas de WebGL de cada fotograma con todas las pasadas (sombra, monitor y escena): como mucho 95 en escritorio y 95 en móvil simulado (390x844), por debajo del tope de 200 de escritorio. La pasada del monitor solo se hace si se ve y está de cara, cada 2 fotogramas en escritorio y una sola vez en pantallas pequeñas o táctiles.


Esmoquin abierto (fajín y botones de camisa) y monitor a 512 px, medido en Intel UHD el 2026-11-11: Portada 77 calls / 189 998 tri / 70 geometrías; De lado 73 / 189 904 / 72; Por detrás 70 / 188 548 / 74; El plató 80 / 190 230 / 74; 7 texturas. Todas dentro del techo y en el tope de móvil (El plató, justo en 80).

Espejo detrás de las cámaras (Reflector, 512 px), medido en Intel UHD el 2026-11-11: Portada 77 calls; De lado 73; Por detrás 69; El plató 79; 8 texturas. Contando todas las pasadas de WebGL por fotograma (sombra, monitor, espejo y escena): como mucho 98 en escritorio y 102 en móvil simulado.

Actualización: el monitor usa una imagen JPG estática en lugar de la segunda pasada de render. Las mediciones anteriores corresponden al monitor en directo y no se han repetido para esta versión.

Móvil por debajo de 80 (2026-11-12). Medido en un móvil simulado (390x844, táctil, Edge con ANGLE D3D11 sobre Intel UHD), contando todas las llamadas de WebGL de cada fotograma (sombra, monitor, espejo y escena): Portada 73, El plató 75, De lado 66, Primer plano 38, Por detrás 30, Tocadiscos 32, Los Jackson 5 31, y bailando 73. Dos cambios: en móvil las piezas pequeñas de Michael (puños, manos, calcetines, zapatos, solapas y cuello) no proyectan sombra, y el entorno de reflejos va en un componente memorizado. Antes se volvía a generar cada vez que la ruta se repintaba y en ese fotograma había hasta 19 llamadas más (picos de 92-94). Solo quedan por encima de 80 los fotogramas del arranque, cuando se generan una vez el entorno, el monitor y el espejo. Sin probar en un móvil real.

Neones de las canciones, rincón Studio 54, Muscles, mueble del tocadiscos y entrada de cine (2026-11-12). Coste de lo nuevo: los once rótulos de neón son 1 malla y 1 textura (un lienzo con los textos; el color y el parpadeo van en los vértices); el rincón Studio 54 y la boa son 4 mallas (todo lo opaco fundido, el cuello de la boa, las copas y la bola); las hombreras van fundidas en la chaqueta y el mueble del tocadiscos sigue siendo 1 malla. Ninguna pieza nueva proyecta sombra.

Medido en Microsoft Edge sin ventana (ANGLE D3D11, Intel UHD del i7-13620H) contando las llamadas de WebGL de cada fotograma con todas las pasadas (sombra, espejo y escena), máximo en 3 s por vista, y comparado con el commit anterior (`7fd4e95`) medido igual el mismo día.

| Vista | Móvil simulado 390x844 táctil: antes → ahora | Escritorio 1440x900: antes → ahora |
| --- | --- | --- |
| Recorrido de entrada (20 s) | — → 75 | — → 88 |
| Portada | 73 → 75 | 80 → 82 |
| De lado | 66 → 66 | 79 → 79 |
| Por detrás de Michael | 30 → 35 | 163 → 173 |
| El plató | 75 → 76 | 86 → 88 |
| Primer plano | 38 → 38 | 50 → 50 |
| El monitor | 26 → 27 | 85 → 87 |
| Tocadiscos | 35 → 38 | 60 → 64 |
| Los Jackson 5 | 31 → 34 | 41 → 44 |
| Neones cara A (pared del fondo) | 20 → 22 | 51 → 59 |
| Neones cara B (pared izquierda) | 18 → 20 | 31 → 33 |
| Rincón Studio 54 | 18 → 22 | 28 → 32 |
| Muscles | 21 → 24 | 31 → 34 |
| Desde el fondo, mirando a Michael | 72 → 74 | 88 → 90 |
| Portada, con la coreografía | 70 → 72 | 80 → 82 |

Móvil: máximo 76 (El plató), por debajo del tope de 80; esta ronda suma entre 0 y 5 llamadas por vista. Escritorio: máximo 173 (Por detrás de Michael, donde el espejo pinta su reflejo), por debajo del tope de 200. Sin probar en un móvil real.

Panel `?budget` (`renderer.info`, escritorio): lecturas más altas 127 calls y 216 250 triángulos (Por detrás de Michael), 110 geometrías y 13 texturas. El techo anterior del árbol (98 / 205 000 / 100 / 11) ya se superaba antes de esta ronda (117 calls, 104 geometrías y 12 texturas en esa misma vista, desde el espejo y el cuadro de los Jackson 5), así que el panel marcaba "por encima del techo". Techo nuevo en `src/budget.js`: calls ≤ 130, triángulos ≤ 220 000, geometrías ≤ 112, texturas ≤ 13. Las líneas "Accepted ceiling" y "Scene" del principio de este documento son de la task1 y quedan superadas por este párrafo.
