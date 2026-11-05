# Shader note

`src/shaders.js` → `recordVertex` / `recordFragment` (ShaderMaterial del picture disc).

1. Vertex vs fragment: el vertex shader levanta la superficie del disco con `uDepth` (relieve de la foto); el fragment dibuja surcos, bandas por canción, brillo anisótropo y la foto con latido.
2. Uniform: `uSpin` (ángulo acumulado del disco) llega desde JS cada frame porque depende de la inercia, del arrastre y del scroll; no es una constante. Igual `uTrack`/`uTrackGlow` (canción señalada) y `uBoost` (graves del audio).
3. Coordinate space: uv del plano (`vUv`, centrado a `p = (uv-0.5)*2`). Los surcos y bandas están en uv del objeto, así que giran y se inclinan con el disco; en `gl_FragCoord` se quedarían fijos en pantalla mientras el disco se mueve debajo.
4. Precision: la de ShaderMaterial por defecto (highp en escritorio); `fwidth` antialiasa surcos más finos que un píxel.
5. Effect: brillo anisótropo del vinilo (`pow(abs(cos(a - la)), 36.0)`): dos haces opuestos que siguen a la luz (ratón) y barren los surcos, con iridiscencia cian/rosa.
6. Post-pass: uno — UnrealBloomPass (three@0.185.1, `three/examples/jsm`) + OutputPass. La fila de `renderer-info.md` ya incluye sus pasadas.
7. Sampler: `uMap` es la portada del álbum (ver derechos en `ktx2-note.md`). Se lee en `vPhotoUv` (uv de la foto dentro del disco), así que sigue impresa al orbitar la cámara. Mi efecto **mueve el sitio** donde se lee: `uv = puv + uMouse * (d - 0.4) * 0.025` (paralaje por profundidad) y los hilos rojos ondulan `uv.y` con ruido.
