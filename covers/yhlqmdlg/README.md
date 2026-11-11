# `covers/yhlqmdlg` — Bad Bunny · *YHLQMDLG* (2020)

Interactive 3D album cover endpoint at `/covers/yhlqmdlg` for FE II Units 8–9.

## Features

- **3D Vinyl & Sleeve Stage (`src/components/VinylStage.jsx`):** Interactive 3D jacket with neon spine, removable 33 RPM vinyl record with specular grooves and third-eye center label, and live format switching (`KTX2 UASTC`, `KTX2 ETC1S`, `Source PNG`) with automatic GPU texture disposal.
- **3D Night Street & BMX Wheelie Bike (`src/components/NightStreet.jsx`):** Nocturnal street scene inspired by the *YHLQMDLG* cover with wet asphalt, neon lane lines, barrio streetlamp, floating 3D Third-Eye portal monument, and an interactive low-poly BMX bicycle popping a wheelie.
- **Custom GLSL Shader (`src/YhlqmdlgMaterial.jsx`):** Registered under the slug-unique R3F catalogue key `YhlqmdlgSleeve` (`<yhlqmdlgSleeve />`). Implements UV-space VHS horizontal wave distortion, RGB chromatic shift, CRT scanlines, and a radial Third-Eye psychic aura around `vec2(0.50, 0.63)` and the cursor (`uPointer`), reactive to track neon color (`uTint`) and real-time sub-bass energy (`uBass`).
- **Accessible DOM HUD & 20-Track Cassette Deck (`src/components/RetroHud.jsx`):** Semantic HTML overlay with all 20 tracks of *YHLQMDLG*, camera mode switcher (`Estudio 3D` vs `Calle Nocturna & Bici`), Perreo/Third-Eye toggle, KTX2/GPU telemetry inspector, and hybrid audio engine (`src/audioEngine.js`, Apple Music 30s CORS previews + procedural Web Audio API dembow synthesizer fallback).

## Evidence Documents

- [`docs/renderer-info.md`](./docs/renderer-info.md) — GPU budget table (`calls`, `triangles`, `geometries`, `textures`).
- [`docs/shader-note.md`](./docs/shader-note.md) — Authored GLSL shader documentation.
- [`docs/ktx2-note.md`](./docs/ktx2-note.md) — KTX2 comparison table (File bytes vs computed GPU bytes for PNG, ETC1S, and UASTC).
