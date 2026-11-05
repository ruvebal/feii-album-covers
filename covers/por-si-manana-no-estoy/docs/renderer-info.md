# renderer.info — cover

Album: Omar Courtz — Por Si Mañana No Estoy (2026).
Scene: picture disc (plano 320×320 con ShaderMaterial + canto), brazo del tocadiscos (13 mallas MeshStandard/Basic + sombra), halo, 2 nubes de partículas (420 + 380 puntos), entorno PMREM para el metal, post-proceso EffectComposer (RenderPass + UnrealBloomPass + OutputPass). Shadows off, DPR cap 1.5.
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.
Accepted ceiling for this tree: calls ≤ 32, triangles ≤ 210 000, geometries ≤ 30, textures ≤ 21.

Pins: three@0.185.1, react@19.3.1 (this repo's package.json). Esta ruta no usa @react-three/fiber: monta Three.js directamente en `src/scene.js`, así que el panel de la galería (BudgetProbe, R3F) no aplica. Las lecturas salen del panel propio: abrir `/covers/por-si-manana-no-estoy?budget`.

Como el bloom renderiza varias pasadas por frame, `renderer.info.autoReset` está a `false` y se reinicia al principio de cada frame: los números son del frame completo (escena + pasadas de bloom).

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cover (task1, picture disc + bloom) | Apple M3 Pro, macOS 27.0.1, Chrome headless (SwiftShader), 1440×900, DPR 1, 2026-11-05 | off | 30 | 208 442 | 30 | 21 | sí |
| cover + sleeve picture (task2) | — | off | — | — | — | — | — |
| cover + KTX2 sleeve (task3) | — | off | — | — | — | — | — |

Notas:
- ~204 800 de los triángulos son del plano del vinilo (320×320 segmentos × 2): hace falta esa densidad para que el depth map levante la foto en relieve. Es la primera cosa a bajar (p. ej. 200×200) si un móvil no llega.
- `memory.textures` es un **recuento**, no bytes: 5 imágenes (cover, depth, glow, heart, strands) + entorno PMREM + render targets del bloom.
- TODO (autor): repetir la fila en Chrome normal con GPU y en un móvil real, y actualizar `src/budget.js` si cambia.
