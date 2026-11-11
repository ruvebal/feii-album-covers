# Shader note

`src/waves.js` → `WAVE_VERTEX` y `beatGlow`: GLSL inyectado con `onBeforeCompile` en el material de las rayas que viene de Blender (MeshStandardMaterial). Los otros shaders de la ruta (`backdrop.js`, `halo.js`, `shaders.js`) llevan su cabecera en el propio archivo.

1. Vertex vs fragment: el vertex shader mueve las rayas (las crestas suben con los graves, una onda expansiva sale de la bola en cada golpe y el puntero deja ondas de agua); el fragment solo añade luz lila donde pasa esa onda (`vBeat`).
2. Uniform: `uBass`, `uPulse` y `uBeatAge` llegan desde JS en cada frame porque salen del `AnalyserNode` del audio; `uTrail` (12 gotas: x, nacimiento, z, fuerza) depende de por dónde pasa el puntero. Ninguno puede ser una constante.
3. Coordinate space: espacio del modelo (`transformed.xz`, con `y` como altura). Las ondas quedan pegadas a la portada al orbitar; en `gl_FragCoord` se quedarían fijas en la pantalla mientras la portada gira debajo.
4. Precision: la del material por defecto (highp). `uTime` son segundos desde que se monta la ruta, sin envolver, y con mediump las ondas perderían finura a los pocos minutos.
5. Effect: la onda del latido, un anillo gaussiano que sale de la bola con cada bombo: `exp(-pow((db - uBeatAge * 1.4) * 9.0, 2.0)) * exp(-uBeatAge * 2.2)`.
6. Post-pass: zero.
7. Sampler: N/A. Estos shaders no leen ninguna imagen: la portada es geometría con colores de vértice. Las únicas texturas son las del modelo (rugosidad del cromo, vetas del cristal) y la panorámica del reflejo, que usa el MeshStandardMaterial de three sin tocar.

Bucle (30-shaders): el vertex shader recorre las 12 gotas con un `for` de límite fijo y sale con `continue` si la gota no está viva. Corre por vértice, no por píxel; no hay `discard` propio (solo el de los planos de corte de three en `halo.js`).
