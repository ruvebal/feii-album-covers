# KTX2 choice — pendiente (task3 sin hacer)

Ruta: `museo-vinilos` (sala 3D en primera persona; cada vinilo del estante enlaza a la ruta de un compañero).

## KTX2

**Pendiente, no N/A.** Esta ruta sí sube texturas a la GPU: el loft y el disco como JPEG dentro de `room.glb` y `public/disc/`, y las fundas como lienzos 2D. El enunciado pide KTX2 (ETC1S frente a UASTC, bytes en disco y bytes en GPU calculados) cuando la ruta carga texturas GPU. **Eso no está hecho** y no hay filas de bytes: no se ha medido nada. Para cerrarlo hace falta `toktx` (no instalado aquí) o una excepción del profesor.

## Derechos de lo que se publica (D8)

| Elemento | Autor y fuente | Licencia | Estado |
| --- | --- | --- | --- |
| Loft (`public/room.glb`, modelo del salón; el cuadro de la calavera es parte de su textura) | «Loft (5) interior for free», **dasy444**, https://sketchfab.com/3d-models/none-883881f6025646c79c92824fdbc8a0cc (identificado por nombre y 41 070 triángulos en la API pública de Sketchfab, 2026-11-18). | **Sketchfab «Free Standard»**: no es Creative Commons. Esa licencia no permite redistribuir el modelo tal cual, y servirlo en una web pública deja descargar el `.glb`. | **Bloquea la publicación.** Pedir permiso a dasy444 o sustituir el loft antes de subir a Pages. Para uso local no hay problema. |
| Tocadiscos («grammaphone», dentro de `room.glb`) | **Artbor**, https://sketchfab.com/3d-models/none-3996b96c48664caeb52992e454345ee1 (coincide por nombre y 780 triángulos). | CC Attribution (CC BY). | Atribución visible en la ruta. Cambios: escala y posición en la sala. |
| Mueble («Record Table», dentro de `room.glb`) | **turtlesomber**, https://sketchfab.com/3d-models/none-5f6a7f4de45b4c468b8934e7f0adebdd (coincide por nombre y unos 13 900 triángulos; el modelo importado tiene 13 668). | CC Attribution (CC BY). | Atribución visible en la ruta. Cambios: escala, posición y orientación. |
| Disco que saca Steve (`public/disc/disc.glb`, texturas reducidas) | «12" Vinyl Record», AleixoAlonso, https://sketchfab.com/3d-models/12-vinyl-record-dd27284e8c1a4622b3a0433c7cc8ee72 | CC BY 4.0 | Atribución visible en la ruta y en `public/disc/CREDITS.txt`. Cambios: texturas reducidas y etiquetas de AC/DC/Atlantic borradas y sustituidas. |
| Portadas de las fundas | Cada una sale de la ruta de su autor (`covers/<slug>/public/`). Para ver el museo en local, `public/locales/` (carpeta ignorada por git) guarda las portadas reales de *mosca* (MusicBrainz / Cover Art Archive), *Currents* (MusicBrainz / CAA), *Off the Wall* y *Bohemian Rhapsody (The Original Soundtrack)* (iTunes Search API), *Un Verano Sin Ti* (MusicBrainz / CAA) y *Everything at Once* de Texas Red (el `poster.jpg` de la ruta de su compañero, en la rama pública `cover-everything-at-once-task1-route` del PR #10 de PRNovoa; es arte de su autor, para vista previa local). | Obras con derechos de sus titulares; descargadas el 2026-11-18, reducidas a 768 px. *Everything at Once* es arte de un compañero. | **Sin permiso del titular (D8).** Subidas el 2026-11-19 por decisión expresa de Andrea, que asume el riesgo; es relleno hasta que cada ruta aporte su portada. No cumple D8 hasta que el profesor lo autorice por escrito o se retiren. La portada de `por-si-manana-no-estoy` tiene su propio aviso pendiente. |
| Sonidos | Sintetizados con Web Audio en `src/sfx.js`. | Propios. | Sin pendientes. |

Tener un archivo descargado no es permiso para republicarlo. Hasta resolver el loft y las portadas, la ruta no cumple D8.

Las licencias salen de la API pública de Sketchfab (`api.sketchfab.com/v3/search`), no de los archivos descargados: conviene que Andrea confirme en cada página del modelo que la licencia sigue siendo esa.

Atribución requerida: «12" Vinyl Record» de AleixoAlonso, CC BY 4.0.

Orientation check: N/A (sin KTX2).
colorSpace check: las texturas de color usan `SRGBColorSpace` (fundas y base del disco); los mapas de normal y rugosidad del disco, sin espacio de color.
