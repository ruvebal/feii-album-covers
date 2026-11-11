# Shader note

The star's infinity mirror: `mirrorMaterial` in `src/materials.js` (TSL), on the card plane under the layers.

1. Stage: all the work is in the fragment stage; the vertex stage only places the card.
2. Uniforms: `MIRROR.amount` (0 at rest, up to 1 while the record turns or opens), `MIRROR.shimmer` (the lights' phase), `MIRROR.cam` (the camera in the card's space) and `MIRROR.tint` (the selected member's colour). They change every frame.
3. Coordinate space: the card's local space. Each echo is a ray from the camera through the fragment, continued deeper into the card (`q = p + (p − cam) · z / cam.z`), so the echoes shrink and slide with perspective like the reflections in a mirror box.
4. Samplers: `star-fill.ktx2` (the star's printed yellow, at the sleeve's UV) and `star-sdf.ktx2` (the star's signed distance, linear data).
5. Effect: eight star outlines receding into the star, each 0.7 fainter than the last, lined with soft lights that run down the tunnel, printed as purple over a misregistered magenta.
6. Precision: highp; the rays divide by the camera's depth, which gets small at grazing angles.
7. Cost: no post-processing pass and no extra draw call (it replaces the card's material).
8. The page behind the record (`backdropMaterial`, same file): one full-screen quad drawn after the sleeve, with a straight five-point star (Inigo Quilez's `sdStar5`) that follows the record and pulses on the beat, plus glints, halftone, dust and sound rings; it stays still under reduced motion.
