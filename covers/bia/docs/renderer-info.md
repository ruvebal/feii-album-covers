# renderer.info — cover

Album: BIA
Scene: route-owned R3F Canvas, original-size glTF model, and a fallback stage; no orbit controls are added. The `.glb` includes one exported punctual point light named `Point`, loaded by GLTFLoader. A route-owned point light also casts percentage shadows; DPR cap [1, 1.5].
Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80.

Pins: three@0.185.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, react@19.3.1 (this repo's package.json).

The route loads three local GLB files: the main glass scene, a replacement
hand, and the liquid geometry. The values below are from `/covers/bia?budget`
after the assets finished loading. They are a desktop browser sample, not a
mobile certification.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BIA route, loaded GLB assets | Chromium via local Vite, 2026-11-19 | percentage | 6 | 644886 | 4 | 3 | yes |
