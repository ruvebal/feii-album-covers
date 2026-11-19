# renderer.info — museo-vinilos

Escena: loft de noche (`room.glb`, unos 30 meshes con materiales PBR), mueble de discos con tocadiscos, estantes con 8 fundas (cada una con un plano de relieve; el destello va dentro de su shader), 3 lámparas de pie (un foco a la pared cada una y un foco al techo en una), una luz de área sobre los estantes y una luz hemisférica; ya no hay luces puntuales, dos paredes de ladrillo que cierran el loft, brazo de Steve (2 cajas) y, durante la secuencia, el disco (1 malla) y partículas. DPR tope 1.25. Sin sombras. Un pase de bloom suave (se quitó la oclusión ambiental: pesaba demasiado).

Techo del curso, cualquier escena: escritorio ≤ 200 calls, móvil ≤ 80.

Medir: abrir `/covers/museo-vinilos?budget` (panel con fps reales, `renderer.info` del fotograma completo y una lectura por segundo). Los fps de la tabla se midieron con la GPU real del Mac de Andrea (Apple M4) en Chrome headless; con WebGL por software el panel marcó 7 fps y no es una medida válida. **Sin medir:** un portátil con GPU integrada antigua y un móvil.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sala de noche, vista desde el sofá (modo completo) | Mac de Andrea, Chrome headless con WebGL por software (SwiftShader), 1100×680, 2026-11-18 | off | 98 | 90 686 | 53 | 64 | sí (escritorio ≤ 200) |
| Mismo, `?fast` (sin bloom, DPR 0,75) | igual | off | 98 | 90 686 | 53 | 53 | — |
| Sala parada, caminando y durante la secuencia completa (8 fases) | **Apple M4**, macOS, Chrome headless con ANGLE Metal (GPU real), 1280×800, DPR 1, 2026-11-18 | off | 67 | 47 704 | 51 | 60 | **60,4 fps parado (p95 18,5 ms), 60,4 caminando, ≥ 62 fps en todas las fases de la secuencia**; calidad adaptativa sin bajar |
| Fotograma completo con bloom (todas las pasadas, `renderer.info.autoReset` apagado) | Mac de Andrea, Chrome headless con WebGL por software (SwiftShader), 1100×680, 2026-11-18 | off | 67 | 47 704 | 51 | 60 | escritorio sí (≤ 200); móvil sí (≤ 80) por conteo; fps sin medir |
| Durante la secuencia (disco y partículas) | **sin medir** | off | — | — | — | — | — |

Cómo se midió: `renderer.info` tras un `renderer.render(scene, camera)` suelto con la cámara en la sala. Eso es solo la pasada de la escena: **no incluye** las pasadas del bloom ni de la salida; el total del fotograma completo es la fila de 67 llamadas. Los conteos valen para cualquier GPU. Los fps de la fila de la M4 son de una sola máquina y de Chrome headless (sin pestaña visible, sincronizado a 60 Hz): no valen para otras GPU.

Notas:
- **Sin cifras inventadas.** Las filas con WebGL por software (SwiftShader) cuentan llamadas y triángulos pero no sirven para fps; los fps salen de la fila de la M4.
- Primera secuencia en frío: una muestra de 22,9 fps (compilación del shader del disco). Se precompila ahora al cargar y, en tres pasadas posteriores, el mínimo fue 62 fps.
- Hay 5 luces dinámicas con materiales estándar. Las 67 llamadas del fotograma completo caben en el techo de móvil (80). Cada funda y cada brazo son ahora una sola llamada (una caja de seis materiales eran seis). Los triángulos (90 712) y las texturas no se han recortado para móvil.
- Adaptación automática de calidad: si el equipo da menos de 38 fps sostenidos durante 4 s, apaga primero el bloom y luego baja la resolución a 1:1 (aviso en consola). **No se ha probado en un equipo lento real.** Prueba artificial en la M4 (Chrome con GPU real, DPR 2 → tope 1,25): con un bucle que gasta 30 ms por fotograma (≈ 33 fps) el gobernador avisó «calidad bajada al nivel 1» (bloom apagado, 3 → 2 pasadas) y «al nivel 2» (resolución 1,25 → 1) y no dio errores; como la carga era CPU y fija, los fps no se recuperaron: demuestra que el mecanismo se activa, no que baste en una GPU lenta. Estrangular la CPU 8× con DevTools no bajó los fps (60 → 60): el coste de CPU por fotograma es mínimo.
- El loft pesa 9 MB en `room.glb` (texturas reducidas a 1024 px, JPEG). Los tres archivos del disco suman unos 270 KB.

- Memoria JS al entrar y salir de la ruta 4 veces (Chrome, recogida de basura forzada): 10 → 12 → 12 → 13 MB. Crece poco y se estabiliza; no demuestra ausencia de fugas de GPU, que no se midieron.
- Mando táctil (cruceta y botón E) y mirar con el dedo: probado con un toque emulado en Chrome; sin probar en un móvil real.
- Texturas WebGL vivas tras salir de la ruta (contando `createTexture`/`deleteTexture` en Chrome con GPU real): antes de corregir el orden de liberación quedaban 40 de 59; ahora quedan 10, de las cuales 8 son texturas vacías que three crea por contexto y no libera nunca, y 2 subidas por uniform que no he identificado. Buffers: 206 → 2.
- Programas de shader WebGL: 29 (con duplicados para la pantalla) → 19 tras compilar contra el destino del compositor; al coger el primer vinilo no se compila ninguno nuevo. fps en la M4 tras el cambio: 60,3 parado y ≥ 62,1 en todas las fases.
- Las 7 fundas muestran portada real en local. Sin `public/locales/<slug>.jpg`, la petición da un 404 esperado en la consola y la funda cae a la lisa con título.
- Peor caso medido: Chrome con renderizado por software (SwiftShader, 900×600): 4,1 fps en nivel 0 → 4,7 fps al apagar el bloom (nivel 1) → 4,7 fps en el nivel 2 → 4,1 fps en el nivel 3 (resolución 0,75). Ahí bajar píxeles no ayuda, porque el cuello es la geometría y las luces, no el relleno. El gobernador baja hasta el nivel 3 (sin bloom, resolución ≤ 0,75) pero **solo se ha demostrado que se activa, no que arregle un equipo lento**; en una GPU integrada limitada por píxeles debería ayudar, sin probar. La siguiente palanca sería recortar triángulos del relieve (64×64 por funda) o luces.
- Malla del relieve de 64×64 a 32×32 por funda: triángulos del fotograma 90 712 → 47 704 (−47 %), sin cambio visible en el relieve (comprobado de lado en la M4). En software los fps no cambiaron (≈ 4,7): ahí el cuello son los shaders con luces, no la geometría. Sin medir el efecto en una GPU integrada real.
