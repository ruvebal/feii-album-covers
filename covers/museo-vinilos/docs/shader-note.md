# Shader note

`src/relief.js` → `createReliefMaterial` (ShaderMaterial de cada funda del estante y de la funda en la mano de Steve).

1. Vertex vs fragment: el vértice empuja la malla hacia delante según el mapa de profundidad (relieve que se ve de lado); el fragmento mueve el dibujo según desde dónde se mira (parallax).
2. Uniforms: `uDepth` (mapa de profundidad de la propia portada, 128×128), `uRelief` y `uParallax` (cuánto sobresale y cuánto se desplaza; suben al apuntar la funda), `uTime` y `uPhase` (la portada «respira» sola aunque no te muevas), `uSweep` y `uSheen` (destello diagonal), `uIdle` (0 con prefers-reduced-motion).
3. Espacio de coordenadas: uv de la funda. La dirección de vista (`vView`) se calcula en el espacio local del objeto con `inverse(modelMatrix)`, así el efecto sigue a la funda al balancearse.
4. Precisión: la de ShaderMaterial por defecto. `vEdge` apaga relieve y parallax a 5 % del borde para que no haya dientes.
5. Efecto: el sujeto se separa del fondo. La profundidad sale de la imagen (distancia al color del borde, contraste local y luminancia, desenfocados): es una heurística mía, no un mapa de profundidad real.
6. Sampler: `uMap` es la portada. Se lee dos veces (una para estimar el desplazamiento y otra con el uv corregido).
7. Un solo `pow()` evitado: `exp(-d*d)` en el destello; `pow` con base negativa es indefinido en GLSL.
8. Post-pase: uno, `UnrealBloomPass` suave (0,22) más `OutputPass`. La fila de `renderer-info.md` NO lo incluye (se midió una pasada suelta de la escena); el panel `?budget` sí cuenta el fotograma completo.
9. Fuera del shader: la animación de mosca (perro ladrando, onomatopeyas, destellos) se pinta en un lienzo 2D (`src/mosca.js`) y llega al shader como textura.
