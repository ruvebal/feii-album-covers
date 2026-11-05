# Shader note

<!-- Template (Unit 9, line 7 from Cover shaders). Eight to twelve lines.
     Replace every ellipsis. Describe the shader you actually ship. -->

1. Vertex vs fragment: ...
2. Uniform: ... and why it is not a constant in the shader.
3. Coordinate space: view / uv / gl_FragCoord. Which one, and what would slide if you picked the other.
4. Precision: mediump, or why this shader needs highp.
5. Effect: the one thing a viewer should notice. Name the function (fresnel, band, dissolve).
6. Post-pass: zero. Or one pass, the pin, and the per-frame renderer.info row with and without it.
7. Sampler: uMap is ... (what the picture shows, and its source or licence). It is looked up at vUv, the sleeve's own UV, so the picture stays printed when the camera orbits. My effect ... (moves the place / changes the answer) in the line ...
