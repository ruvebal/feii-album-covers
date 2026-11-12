# Shader note

<!-- Plantilla de Unit 9 (línea 7 de Cover shaders), rellenada para el efecto propio de esta ruta:
     el cielo de src/SunsetSky.jsx. Los dos efectos pequeños de src/Crowd.jsx van al final. -->

1. Vertex vs fragment: el vertex shader solo copia `position` de la esfera a `vDir` y la coloca (`projectionMatrix * modelViewMatrix * position`). Todo el cielo se decide en el fragment shader, una vez por píxel: degradado, sol, nubes y estrellas, en ese orden y sumados sobre `col`.
2. Uniform: `uTod` (0 atardecer … 1 noche) es la hora del día. CameraRig la interpola desde los keyframes de `keys.js` y la misma cifra mueve las luces (`SkyLights.jsx`) y los móviles (`Crowd.jsx`). Por eso es un uniform y no una constante: el cielo, las luces y el público cambian a la vez. `uSunDir` sale de `sunDirection(tod)` (`sky.js`, el sol baja de +2,9° a −7°) y es la misma dirección que la luz direccional, así que el contraluz sobre Freddie viene de donde se ve el sol. `uTime` está en segundos, envuelto en JS con `% SKY_PERIOD` (3000 s).
3. Coordinate space: dirección de vista en mundo. `vDir` es la posición de objeto de una esfera que solo se traslada con la cámara (nunca rota), así que equivale a la dirección en mundo. Sol, nubes y polo de las estrellas quedan fijos al estadio: al girar la cámara en el vuelo, el sol sigue sobre la misma grada. Con `gl_FragCoord` o UV de pantalla el cielo iría pegado a la cámara y el sol se movería con cada giro.
4. Precision: **highp**, fijada en un solo sitio (`precision="highp"` del material, sin línea `precision` en el GLSL). Hay tres motivos. (a) `hash21` multiplica la celda por 123,34 y 456,21 y toma `fract`: con las celdas de estrellas (`rad * 70` llega a ~220) el producto pasa de 10⁴, y mediump (≈ 3 cifras) devuelve siempre el mismo `fract`, con lo que las estrellas salen en bandas regulares. (b) `acos` cerca del polo necesita la mantisa entera para que los arcos no se escalonen. (c) El centelleo usa `TAU * 1000 * uTime / 3000`: el argumento llega a ~6 300. `uTime` sigue envuelto aunque sea highp: cada movimiento del cielo da un número ENTERO de vueltas por periodo (nubes 1, estrellas 10, centelleo 1000), así que en el salto 3000 → 0 el estado es idéntico y no se ve.
5. Effect: un cielo que se hace de noche. Lo que tiene que notar el espectador son las **estrellas que se estiran en arcos alrededor de un polo** (star trails), como en una foto de larga exposición. La función clave es la rejilla polar: `g = vec2(rad * 70.0, fract(turn) * SECTORS)` y `dist = length((f - sp) * vec2(1.0, 0.15))`. El factor 0,15 en la componente angular hace que la distancia crezca despacio alrededor del polo, y por eso cada estrella es un arco y no un punto. `SECTORS = 38` es entero, así que la columna 0 y la 38 coinciden y no hay costura donde `atan` salta de π a −π. Las otras capas:
   - Sol con tres potencias de `dot(d, sol)`: 900 para el disco, 40 para el halo y 6 para el resplandor.
   - Nubes fbm de 5 octavas con borde plateado a contraluz: `lit` compara la densidad en el punto con la densidad desplazada 0,08 hacia el sol.
   - Velo de trails: fbm sobre un círculo en el espacio de ruido, sin costura.

   Con `prefers-reduced-motion`, `uTime` se congela: las estrellas siguen siendo arcos, pero no giran ni centellean.
6. Post-pass: cero.
7. Sampler: N/A. El cielo no muestrea ninguna textura (0 `sampler2D`): todo es ruido procedural. La única imagen de la ruta, la funda (`public/sleeve.png`, propia, `tools/make-sleeve.mjs`), va en un `meshStandardMaterial` con `map` en `CoverPortal.jsx`, sin shader propio, y se ve a su `uv` de caja.

**Bucles y discard (regla `30-shaders`):** hay un solo `for`, en `fbm`, de 5 iteraciones fijas (el compilador lo desenrolla). Se llama 3 veces por fragmento (nubes, nubes desplazadas hacia el sol, velo), así que son 15 `noise()` y 60 `hash21()` por píxel. No hay `discard` en ningún shader de la ruta. Coste medido: el cielo es 1 draw call y 2 976 triángulos, sin cambios respecto a task1 (`docs/renderer-info.md`).

**Limitaciones:**
- Las nubes son un plano proyectado: cerca del horizonte se comprimen (lo esconde la grada).
- El polo de las estrellas es fijo y no astronómico.
- El halo del sol se dibuja también bajo el horizonte; no se ve porque lo tapa el estadio.
- El cielo devuelve valores de pantalla sin `colorspace_fragment` (`toneMapped={false}`). Es correcto aquí porque no hay textura, pero las paletas se ajustan a ojo en sRGB.

## Efectos pequeños en `Crowd.jsx` (mismo pulso, sin textura)

- **Bote de la multitud:** `onBeforeCompile` sobre el `MeshStandardMaterial` del `InstancedMesh`. El atributo por instancia `aPhase` (0–0,25) desfasa a cada fan. Tras `<begin_vertex>` se hace `transformed.y += uBounce * sin(π * fract(uBeat + aPhase))`: un salto por pulso, que vale 0 al principio y al final del pulso, así que el `fract` no salta. Se suma en espacio de objeto, antes de `instanceMatrix`, y cada fan bota en su sitio. `uBeat` (72 bpm) se calcula en JS y llega ya en [0, 1). Coste: 0 calls y 0 triángulos extra. `customProgramCacheKey` es propio del slug.
- **Luces de móvil:** un `Points` aditivo (1 667 puntos, 1 de cada 3 fans), `ShaderMaterial` en **mediump**: todas las entradas son fases en [0, 1) y posiciones de < 40 m. Cada móvil se enciende cuando `uNight` pasa su `aSeed`, así que aparecen uno a uno al caer la noche. Botan con el mismo `aPhase` que su fan y se mecen a un compás de 4 pulsos. El tamaño va en perspectiva, una pantalla de 12 cm, con un mínimo de 1,5 px. El disco suave sale de `gl_PointCoord` y lo que queda fuera suma 0 en aditivo, así que no hace falta `discard`. Solo se dibuja de noche (`material.visible`): 1 call.
- Con `prefers-reduced-motion`, `uBounce` y el vaivén valen 0. Los móviles se encienden igual, pero quietos.

## Qué ajusté yo a mano

Nada todavía: aprobado sin cambios en GATE 2 (2026-11-12). Si en task3 retoco paletas, velocidad de los trails, altura del bote o densidad de móviles, lo anoto aquí.
