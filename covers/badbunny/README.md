# `covers/badbunny` — Bad Bunny · Discografía 3D Interactiva

Interactive 3D multi-album experience at `/covers/badbunny` for FE II Units 8–9, uniting four iconic Bad Bunny albums (*YHLQMDLG*, *El Último Tour Del Mundo*, *Un Verano Sin Ti*, and *DTmF / DeBÍ TiRAR MáS FOToS*).

## Features

- **Retro Vinyl Listening Studio & 180° Turntable (`src/components/BlenderWorld.jsx`, `public/yhlqmdlg-world.glb`):**
  - Starts facing the turntable inside a cozy mid-century walnut listening corner (`TurntableStudioRoom`) featuring a walnut credenza stocked with vinyl sleeves, a pair of vintage Hi-Fi monitor speakers with copper/gold woofers, a warm mushroom glass lamp, a tube preamp with glowing amber VU meters, acoustic wood slat walls, and framed 24K gold records + album posters.
  - The 4 Bad Bunny vinyl sleeves fan out in the foreground like a deck of playing cards (`VinylDeckCard`). Hovering pops out each sleeve and slides the black PVC vinyl disc upward; clicking triggers a 3D parabolic placement animation (`PlacingVinylAnimation`) that seats the record onto the turntable platter.
  - While no record is on the platter, rotating 180° to any scenario and playing audio remain locked. Once seated, lowering the tonearm needle (`TurntableTonearm`) spins the platter and starts audio playback.
- **Four Complete Blender 4.2 3D Album Scenarios (180° Opposite the Turntable):**
  - **YHLQMDLG (2020) (`BlenderWorld.jsx` + `StormSky.jsx`):** Nocturnal storm street diorama (`StreetEnvironment`, `BoyOnBike`, `FlyingCar`, `BurningCar`, `SparkingPole`, `LadyAndDog`) under a volumetric blue storm sky dome (without distracting moving lightning bolt cylinders).
  - **El Último Tour Del Mundo (2020) (`AlbumMaquetaStage.jsx` + `public/eutdm-world.glb`):** Desert highway at crimson/starry dusk with the front-facing chrome Peterbilt 379 semi-truck (`EutdmPeterbiltTruck`, license plate `YHLQMDLG`, 15 amber LEDs) and an upgraded, anatomically sculpted 3D Bad Bunny (`EutdmBadBunny`) standing on the hood in his billowing brown trench coat, cream hoodie with white drawstrings, patchwork cargo pants, beard/goatee, narrow rectangular sunglasses, and knit beanie.
  - **Un Verano Sin Ti (2022) (`AlbumMaquetaStage.jsx` + `public/uvst-world.glb`):** Caribbean sunset beach with the 3D Sad Cyclops Heart character (`UvstSadHeart`), pinnate coconut palms (`UvstPalmTrees`), and leaping lavender dolphins (`UvstDolphins`).
  - **DTmF — DeBÍ TiRAR MáS FOToS (2025) (`AlbumMaquetaStage.jsx` + `public/dtmf-world.glb` + `public/sapo_concho.glb`):** Puerto Rican patio with the two white monoblock plastic chairs (`DtmfPlasticChairs`), hanging green plantain bunch (`DtmfPlantainBunch`), banana grove (`DtmfBananaGrove`), and the 3D Sapo Concho (`sapo_concho.glb`, *"Bad Bunny - Sapo Concho"* by AGUAY0 on Sketchfab, CC BY 4.0).
- **Custom GLSL Shader (`src/YhlqmdlgMaterial.jsx`):** Registered under the slug-unique R3F catalogue key `BadbunnySleeve` (`<badbunnySleeve />`). Implements UV-space VHS horizontal wave distortion, RGB chromatic shift, CRT scanlines, and a radial aura reactive to the active song's color (`uTint`) and real-time sub-bass energy (`uBass`).
- **Clean Floating Dock HUD & Collapsible Tracklist Drawer (`src/components/RetroHud.jsx`, `src/route.css`):** Minimalist bottom-center floating control dock (`.yhl-dock`) with pill buttons for 180° camera transitions, needle toggle, vinyl switcher, and a sleek right-side collapsible song drawer (`.yhl-tracklist-panel`) powered by `src/audioEngine.js` (Apple Music 30s CORS previews + procedural Web Audio API dembow synthesizer fallback).

## Evidence Documents

- [`docs/renderer-info.md`](./docs/renderer-info.md) — GPU budget table (`calls`, `triangles`, `geometries`, `textures`).
- [`docs/shader-note.md`](./docs/shader-note.md) — Authored GLSL shader documentation.
- [`docs/ktx2-note.md`](./docs/ktx2-note.md) — KTX2 comparison table (File bytes vs computed GPU bytes for PNG, ETC1S, and UASTC).
- [`docs/ai-3d-merge-log.md`](./docs/ai-3d-merge-log.md) — AI-assisted 3D covenant merge log.
