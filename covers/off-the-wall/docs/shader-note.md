# Shader note

`src/brickMaterial.js` → `createBrickMaterial()`: el `MeshStandardMaterial` de los ladrillos con GLSL propio inyectado en `onBeforeCompile`. Así se conservan la luz, la sombra de Michael y el color de cada ladrillo.

1. Vertex vs fragment: el vertex shader solo calcula `vOtwWorld`, la posición en el mundo con la matriz de cada ladrillo (`instanceMatrix`). El fragment shader hace el trabajo: grano del barro cocido, hollín junto al suelo y el charco de luz.
2. Uniform: `uPulse` es la energía de los graves (bombo y bajo) de la canción que suena. La lee `player.level()` con un `AnalyserNode` y se suaviza en `useFrame`. No es una constante porque cambia con la música y vale 0 cuando no suena nada. `uSpot` y `uSize` (centro y radios del charco) son uniforms para poder moverlo sin recompilar.
3. Coordinate space: mundo (`vOtwWorld.xy`). El charco y el grano están pegados a la pared, así que al girar la cámara se quedan en su sitio. Con `gl_FragCoord` el charco seguiría a la pantalla y resbalaría sobre los ladrillos.
4. Precision: `mediump`, fijado una vez con `material.precision`. El hash envuelve la entrada con `mod(p, 97.0)` para que el `sin` no pierda precisión con coordenadas grandes.
5. Effect: un charco de luz cálida detrás de Michael que se enciende y crece con los graves (`smoothstep` sobre la distancia elíptica a `uSpot`, sumado a `totalEmissiveRadiance` y multiplicado por el color del propio ladrillo). El grano (dos octavas de ruido de valor) solo varía el albedo y la rugosidad, para que ningún ladrillo sea liso.
6. Post-pass: cero.
7. Sampler: no hay `uMap` ni ninguna imagen. Todo el detalle es procedural y el color de cada ladrillo viene de `instanceColor`. Sin bucles ni `discard`.

Con `prefers-reduced-motion` el charco no late: si suena música se queda encendido y quieto (`uPulse = 0.35`).
