# AI-assisted 3D merge log

Decisiones sobre código y activos propuestos por el asistente (Claude Code) para esta ruta. Cada fila es un cambio que se aceptó o se rechazó con un motivo comprobable.

| Diff | Gate | Decision | Reason |
| --- | --- | --- | --- |
| `renderer.forceContextLoss()` al desmontar | memory | REJECT | En desarrollo, React StrictMode monta, desmonta y vuelve a montar sobre el mismo `<canvas>`. Con el contexto perdido el segundo montaje falló con `Cannot read properties of null (reading 'precision')`. Se quitó la línea y `renderer.dispose()` basta. |
| Disco del modelo `12_vinyl_record.glb` tal cual | rights | REJECT | La textura de color lleva pintadas las etiquetas de AC/DC «Highway to Hell» de Atlantic, que saldrían en todos los álbumes y son arte con derechos. Se aceptó solo la geometría y los surcos; las etiquetas se borraron y se pinta la de cada álbum. |
| Disco píxel estilo Minecraft generado en canvas (`discCanvas`) | design | REJECT | Andrea pidió que el disco no fuera estilo Minecraft y aportó el modelo del disco. Se eliminó el código. |
| Texturas de 4096 px del disco (8,8 MB) | budget | REJECT | Demasiado peso para una ruta web; se redujeron a 2048 (color) y 1024 (normal y rugosidad): unos 270 KB en total. |
| Exportar `room.glb` desde la sesión abierta de Blender | API truth | REJECT | Falló con `TimeoutError: [Errno 60]` leyendo una imagen temporal. Se exportó en modo headless desde una copia del `.blend`. |
| Ilustraciones propias y un perro ladrando animado en lugar de las portadas | design | REJECT | Andrea: «tiene que ser exactamente como es el álbum verdadero y allí lo animas». Se quitaron `mosca.js` y los dibujos de `art.js`. La funda muestra la portada real (de la ruta del autor o de `public/locales/`, local) y, sin ella, una funda lisa con el título. La animación irá en la página de cada álbum. |
| Pase de oclusión ambiental (GTAOPass) | budget | REJECT | Pesaba demasiado para una sala que debe ir ligera. Se quitó; queda un bloom suave. |
| Tono ACES de la escena para las portadas | design | REJECT | Apagaba los azules puros y deformaba el color de las portadas. Se cambió a tono Neutral de Khronos y se aclaró una copia de la imagen de mosca. |
| `pow()` con base negativa en el shader del destello | API truth | REJECT | Comportamiento indefinido en GLSL; se sustituyó por `exp(-d*d)`. |
| Planos de destello sueltos sobre cada funda | budget | REJECT | 8 llamadas de dibujo de más; el brillo pasó al shader de relieve (de 105 a 98 llamadas). |
| Importar `public/locales/` con `import.meta.glob` | rights | REJECT | Codex comprobó por SHA-256 que las cinco portadas comerciales acababan en `dist/assets`. Ahora la URL se arma como texto en tiempo de ejecución y solo en desarrollo: Vite no las ve ni las empaqueta. |
| Navegar a rutas que no existen al terminar la secuencia | API truth | REJECT | Llevaba a «No cover at /covers/…». Ahora, si la ruta no está en el registro, un aviso dentro del museo explica que se activará cuando se suba y deja seguir. |
| Retornar sin liberar al desmontar durante una carga | memory | REJECT | Se liberan el GLTF y se cancelan las cargas de imagen ya iniciadas. |
| Declarar N/A en KTX2 | API truth | REJECT | La ruta sí carga texturas GPU; queda como pendiente, no como N/A. |
| Capturar Espacio y teclas del juego con el foco en un botón del DOM | accessibility | REJECT | Codex reprodujo que Espacio saltaba la animación o hacía saltar al personaje en vez de activar «Seguir en el museo» o un vinilo de la lista. Ahora, con el foco en un control, las teclas son del control; y al empezar desde la lista se quita el foco al botón. |
| Retornar solo en las cargas correctas tras desmontar | memory | REJECT | Los caminos de error (portada, disco, éxito parcial) seguían creando recursos con la ruta ya desmontada. Se comprueba `signal.aborted` también tras los errores y se libera el éxito parcial. |
| Caja de 6 materiales para cada funda y cada brazo | budget | REJECT | Cada material de una caja es una llamada de dibujo: 49 solo en las fundas. Una caja de un solo material baja el fotograma de 107 a 67 llamadas. Al hacerlo apareció cartón entre el relieve y el frente; se arregló haciendo que el relieve solo avance. |
| Liberar las texturas de la escena después de `renderer.dispose()` | memory | REJECT | Codex lo reprodujo con GL simulado y yo en Chrome con GPU real: quedaban 40 texturas vivas tras salir. `renderer.dispose()` borra el registro interno de three y una textura liberada después ya no se borra en la GPU. Ahora se libera primero la escena y al final el renderer; también las tablas de luz de área. |
| Plazo de 4 s para esperar la compilación de shaders al salir | API truth | REJECT | Vencido el plazo se liberaba con la compilación aún pendiente y volvía el error `reading 'isReady'`. Se espera sin plazo. |
| `pointercancel` tratado como un toque | accessibility | REJECT | Un gesto táctil cancelado cogía el vinilo señalado. Ahora cancelar solo limpia el estado. |
| Cruceta táctil solo con puntero | accessibility | REJECT | Con teclado conectado, el botón «Avanzar» enfocado no respondía a Espacio, Intro ni WASD (Codex lo reprodujo; yo con teclado real en Chrome: z 7 → 7). Ahora Espacio o Intro mantenidos pulsan el botón, WASD mueve aunque tenga el foco y al soltar o perder el foco se detiene (z 7 → 4,74 mantenido y parado al soltar). |
| `skip()` que reinicia el fundido con cada repetición de Espacio | accessibility | REJECT | Con la tecla mantenida el fundido nunca llegaba a 0,7 s y no se entraba a la ruta (9 s sin entrar). `skip()` es ahora idempotente y se ignora `e.repeat`: entra en 0,8 s. |
| Gobernador de calidad con `setPixelRatio(1)` fijo | budget | REJECT | Con DPR 0,8 (zoom del navegador) bajar calidad subía la resolución a 1. Ahora `min(1, ratio actual)`: se conserva 0,8. |
| Tecla M tratada como pulsación en cada repetición | accessibility | REJECT | Mantenida, alternaba el sonido sin parar y el resultado dependía de cuándo se soltara (muted=false tras mantenerla). Ahora una pulsación mantenida es una sola alternancia. |
| Precompilar shaders para la pantalla (sRGB) | budget | REJECT | La escena se dibuja dentro del compositor (destino lineal): son otros programas y el precompilado no servía (2 programas nuevos al coger el primer vinilo; 29 programas con duplicados). Compilando contra el destino del compositor: 19 programas y ninguno nuevo durante la secuencia. |
| Relieve con malla de 64×64 por funda | budget | REJECT | La mitad de los triángulos de la escena (90 712) venían de ahí. Con 32×32 son 47 704 y el relieve se ve igual de lado. |
| Pared derecha y frente de ladrillo en three.js (`closeRoom`) | scope | ACCEPT | El loft origen tiene esos lados abiertos y se veía un vacío negro. Reutiliza la textura de ladrillo del propio modelo. |
| Colisiones por cajas delimitadoras de Blender (`colliders.js`) | API truth | ACCEPT | Medidas desde Blender, comprobadas en el navegador: el sofá bloquea a x=1,22 (0,936 + radio 0,28). Son rectángulos, no la forma real. |
| Altura del plato del tocadiscos `y=1,447` | API truth | ACCEPT | Medida lanzando rayos verticales al modelo: la superficie queda en 1,437. El primer valor supuesto (1,17) dejaba el disco dentro de la malla. |

Pendiente: revisión por una sesión de Codex nueva (ver el informe de entrega).

Skills y herramientas de terceros consultadas (solo lectura, sin instalar): `CloudAI-X/threejs-skills` y `majidmanzarpour/threejs-game-skills` (cadena de post-proceso, luces de área, «game feel», presupuestos de render). Descartadas por exigir dependencias nuevas en `package.json`, que es del profesor: `pmndrs/postprocessing`, `N8AO`, `Depth Anything V2`.
