# renderer.info — Bad Bunny (`/covers/badbunny`)

Artist & Catalog: Bad Bunny — *YHLQMDLG* (2020), *El Último Tour Del Mundo* (2020), *Un Verano Sin Ti* (2022), and *DTmF / DeBÍ TiRAR MáS FOToS* (2025).
Scene: hybrid R3F `<Canvas>` (`covers/badbunny/src/Route.jsx`) loading our Blender 4.2 LTS 3D worlds (`yhlqmdlg-world.glb`, `eutdm-world.glb`, `uvst-world.glb`, `dtmf-world.glb`, `sapo_concho.glb`) + storm sky dome (`StormSky.jsx`) + clean floating dock HUD (`RetroHud.jsx`).

3D Tree (`BlenderWorld.jsx` + `AlbumMaquetaStage.jsx` + `StormSky.jsx`):
- **Retro Vinyl Listening Studio & 180° Turntable (`Z = +7.5`, initial camera view):**
  - `TurntableStudioRoom`: walnut credenza with vinyl storage cubbies, woven rug, acoustic wood slat wall, pair of vintage walnut Hi-Fi monitor speakers with copper/gold woofers, elevated riser shelf with glowing tube preamp (amber VU meters) and warm mushroom lamp, plus 4 framed gold record / album art wall plaques.
  - `TurntableBase`, `TurntablePlatter` + circular center label (`circleGeometry` with `BadbunnySleeve` custom GLSL shader material sampling `uMap`), and interactive pivoting `TurntableTonearm`.
  - `VinylDeckCard` fan: 4 interactive 3D album sleeves with half-tucked black PVC vinyl records and 3D parabolic placement animation (`PlacingVinylAnimation`).
- **180-Degree Opposite 3D Album Scenarios (`Z < 0`, mounted only when a record is seated on the platter):**
  - *YHLQMDLG*: `StreetEnvironment`, `BoyOnBike`, `FlyingCar`, `BurningCar`, `SparkingPole`, `LadyAndDog` + `StormSky` (sky dome & clouds, without moving lightning bolt cylinders).
  - *El Último Tour Del Mundo*: `EutdmDesertHighway`, `EutdmPeterbiltTruck`, `EutdmTelegraphPoles`, and the upgraded continuous-mesh `EutdmBadBunny` (4,066 faces) standing atop the hood.
  - *Un Verano Sin Ti*: `UvstBeachSunset`, `UvstSadHeart`, `UvstPalmTrees`, `UvstDolphins`.
  - *DTmF*: `DtmfPatioGround`, `DtmfPlasticChairs`, `DtmfBananaGrove`, `DtmfPlantainBunch` + `sapo_concho.glb` with low-poly cylinder raycast proxy.

Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80 (`src/lib/budget.js`).
Accepted ceiling for this tree (`covers/badbunny/src/budget.js`): `calls ≤ 95`, `triangles ≤ 40000`, `geometries ≤ 95`, `textures ≤ 14`.

Pins: `three@0.185.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `react@19.3.1`, `Blender 4.2.3 LTS`.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `badbunny` — Turntable + Retro Studio + 4-Vinyl Fan | Linux x86_64, Chrome / WebGL 2, 2026-11-17 | off | 48 | 14,850 | 42 | 6 | yes |
| `badbunny` — YHLQMDLG 3D World + Studio (KTX2 UASTC label) | same | off | 72 | 24,980 | 68 | 6 | yes |
| `badbunny` — EUTDM / UVST / DTmF 3D Worlds + Studio | same | off | 76 | 34,200 | 74 | 7 | yes (CEILING row) |

### Observations

1. **On-demand scenario mounting & Blender mesh joining:** Opposite-side 3D scenarios (`StormSky`, `AlbumMaquetaStage`, or the `YHLQMDLG` street nodes) only mount after a vinyl record is seated on the turntable, and only the active album's 3D world is rendered. Inside Blender 4.2, each architectural/character group (`TurntableStudioRoom`, `EutdmBadBunny`, `EutdmPeterbiltTruck`, etc.) is joined into a single multi-material mesh.
2. **Raycast proxy optimization:** High-detail meshes such as `sapo_concho.glb` disable per-triangle CPU raycasting (`obj.raycast = () => null`) and delegate pointer hover/click to a 12-segment invisible bounding cylinder.
