# renderer.info — YHLQMDLG (`/covers/yhlqmdlg`)

Album: Bad Bunny — *YHLQMDLG* (2020, Rimas Entertainment).
Scene: hybrid R3F `<Canvas>` (`covers/yhlqmdlg/src/Route.jsx`) loading our Blender 4.2 LTS 3D diorama (`covers/yhlqmdlg/public/yhlqmdlg-world.glb`, built via `build_yhlqmdlg_world.py`) + electric blue thunderstorm (`StormSky.jsx`) + accessible DOM HUD (`RetroHud.jsx`).

3D Tree (`yhlqmdlg-world.glb` + `StormSky`):
- **Blender 3D Cover Diorama (Front View):**
  - `StreetEnvironment`: Dutch-angle tilted avenue, sidewalks, 6 neighborhood houses, 5 palm trees, ice cream truck, and 3 parked sedans.
  - `BoyOnBike`: 3-eyed boy in lime/lavender polo, jeans, and white sneakers popping a wheelie on his metallic blue BMX with gold stem clamp and orange grips (clickable POI).
  - `FlyingCar`: 1980s tan sedan levitating in the upper-right stormy sky with blazing volumetric headlight cones (clickable POI).
  - `BurningCar`: 1980s sedan on the left side of the road engulfed in sculpted 3D fire plumes (clickable POI).
  - `SparkingPole`: leaning wooden utility pole with transformer, streetlamp, and shooting electric spark bolts (clickable POI).
  - `LadyAndDog`: shocked lady in aqua robe with raised hands on the bottom-right sidewalk, toppled & flying metal trash cans, and her levitating Chihuahua dog (clickable POI).
- **180-Degree Rear Turntable (`Z = +7.5`, behind the initial camera):**
  - `TurntableBase`: turntable plinth, neon trim, shock feet, start/stop button, and pitch slider.
  - `TurntablePlatter` + circular center label (`circleGeometry` with `YhlqmdlgSleeve` custom GLSL shader material sampling `uMap` — no vinyl sleeve, only the vinyl disc with the cover in the circular center).
  - `TurntableTonearm`: pivoting gimbal tonearm, counterweight, headshell, and red stylus needle (`needleOnRecord` gates audio playback).

Unit cap, any scene: desktop ≤ 200 calls, mobile ≤ 80 (`src/lib/budget.js`).
Accepted ceiling for this tree (`covers/yhlqmdlg/src/budget.js`): `calls ≤ 75`, `triangles ≤ 25000`, `geometries ≤ 80`, `textures ≤ 4`.

Pins: `three@0.185.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `react@19.3.1`, `Blender 4.2.3 LTS`.

| Run | Machine, date | Shadows | calls | triangles | geometries | textures | Accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `yhlqmdlg` — Blender 3D World + 180° Turntable (PNG center label) | Linux x86_64, Chrome / WebGL 2, 2026-11-05 | off | 58 | 18,420 | 64 | 2 | yes |
| `yhlqmdlg` — Blender 3D World + 180° Turntable (KTX2 ETC1S center label) | same | off | 58 | 18,420 | 64 | 2 | yes |
| `yhlqmdlg` — Blender 3D World + 180° Turntable (KTX2 UASTC center label) | same | off | 58 | 18,420 | 64 | 2 | yes (CEILING row) |

### Observations

1. **Blender mesh joining keeps draw calls under the mobile cap:** In Blender (`build_yhlqmdlg_world.py`), over 140 individual 3D primitives (bicycle tubes, limbs, eyes, houses, palms, flames, cars, turntable parts) were joined by semantic node (`StreetEnvironment`, `BoyOnBike`, `FlyingCar`, `BurningCar`, `SparkingPole`, `LadyAndDog`, `TurntableBase`, `TurntablePlatter`, `TurntableTonearm`). This keeps draw calls at `58` (below both the `80` mobile cap and `200` desktop cap).
2. **Texture count & disposal:** `renderer.info.memory.textures` reads `2` (three.js internal placeholder + 1 active circular vinyl label texture). Switching between `KTX2 UASTC`, `KTX2 ETC1S`, and `Source PNG` disposes the previous GPU texture inside `MeasuredCenterLabel` (`BlenderWorld.jsx`).
