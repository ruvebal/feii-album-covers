# KTX2 choice

<!-- The KTX2/Basis satellite's ktx2-note Template, filled for the studio
     reference. Every row below was measured on 2026-11-05; how, and with which
     commands, is under the template. A student route copies the habit, never
     these numbers. -->

Album, and the source picture's right (student-created / public domain / open licence / written permission): no album. `public/sleeve.png` is original art made for this repository ("Signal & Grain", a studio reference sleeve): a seeded fractal ground, gradient-mapped and grained, with sharp type, two flat colour patches, four coloured corner squares and a UV label in each corner. It copies no album cover (D8). How it was made: `tools/make-sleeve.mjs`, colours from `src/palette.js`.

Chosen mode (ETC1S or UASTC; or PNG kept, if the encoder was missing — say so): UASTC for this sleeve. Both encodes exist; the studio switch loads either.
Why it fits this sleeve (one honest reason: photo grain, sharp type, a logo...): the sleeve is a teaching picture whose job is sharp type and exact flat colours (the title, the UV labels, the patches the colour check reads). UASTC read both patches back exactly (Δ0); ETC1S was off by Δ3 on the disc. Decoded off-line against the PNG (`ktx extract --transcode rgba8`, flipped back, `magick compare -metric PSNR`), ETC1S scores 32.2 dB on the whole picture and 30.0 dB on the title strip, UASTC 43.2 dB and 41.8 dB: ETC1S's loss lands on the type. A sleeve that was only the grainy ground would lean ETC1S: 36,496 B on disk and half UASTC's GPU bytes.

Measured on (machine, browser, date): Apple M4 Max (Mac16,9), macOS 27.0.1; headless Chrome 156.0.8078.80 on the **SwiftShader software renderer** (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)`, WebGL 2), not a GPU; 2026-11-05.
Levels counted (all levels on every row, or level 0 on every row): all levels on every row (10 levels, 512² down to 1²). Level 0 alone, for reference: PNG 1,048,576 · ETC1S 131,072 · UASTC 262,144.

| Asset | File bytes (on disk) | GPU bytes (computed) | texture.format | Observation |
| --- | ---: | ---: | --- | --- |
| Source PNG | 359,653 | 1,398,100 | RGBAFormat | Unpacked on upload: 512 × 512 × 4 for level 0, plus the mipmaps three builds (× ≈ 4/3). Grain makes the suitcase large too. |
| ETC1S .ktx2 | 36,496 | 174,776 | RGB_ETC2_Format | Smallest suitcase and smallest room (one eighth of the PNG's). Disc read back Δ3 from the PNG: codec loss, visible on the type at close range. |
| UASTC .ktx2 | 262,400 | 349,552 | RGBA_ASTC_4x4_Format | `--zcmp 18`. Suitcase only ≈ 27% smaller than the PNG, room a quarter of it. Both patches Δ0. Without `--zcmp` the same file is 350,032 B (not loaded). |

**file bytes** = the suitcase (bytes of the file the browser fetched; the panel reads them with `fetch`). **GPU bytes** = the room, computed with `src/lib/gpuBytes.js` (PNG: `TextureUtils.getByteLength` per level; KTX2: Σ `mipmaps[i].data.byteLength` as transcoded). Neither is the texture count.

Texture count (renderer.info.memory.textures, a count, not bytes), before and after the sleeve loads: 1 → 2. Flat mode (no picture) reads 1; PNG, ETC1S and UASTC each read 2. The count did not move between formats; the GPU bytes did. (When the switch changes mode the previous picture's GPU copy is disposed, so exactly one sleeve picture is resident.)

Orientation check (does uv 0,0 land bottom-left and the title read upright? how was the file encoded?): yes for PNG, ETC1S and UASTC. Both `.ktx2` files were encoded flipped (`--lower_left_maps_to_s0t0`; `ktx info` shows `KTXorientation: ru`). The panel reads the corner square at uv 0,0 back from the GPU: `rgb(47, 191, 113)` (PNG, UASTC) and `rgb(49, 190, 115)` (ETC1S), the green bottom-left square: "upright: pass". Control: an ETC1S encode without the flag (`KTXorientation: rd`) read `rgb(212, 64, 163)`, the magenta top-left square, "upside down: FAIL", with the title upside down on screen. No `1.0 - vUv.y` anywhere.
colorSpace check (what does texture.colorSpace log after loading? what did you do if it was not srgb?): `srgb` for all three; the panel shows `srgb === SRGBColorSpace: pass`. Both encodes used `--assign_oetf srgb` (`Transfer: KHR_DF_TRANSFER_SRGB`). Because that check cannot see a conversion baked into the pixels, the panel also compares two flat patches with the PNG file's own pixels (disc 227,106,44; grey 128,128,128): PNG Δ0/Δ0, ETC1S Δ3/Δ0, UASTC Δ0/Δ0, tolerance Δ ≤ 16. Controls (not committed): a PNG mis-tagged gAMA 1.0 encoded **without** assign loaded `srgb-linear` (FAIL) with the disc at `rgb(242, 171, 118)`; the same PNG encoded with `--convert_oetf srgb` loaded `srgb` (pass) but the disc read `rgb(242, 173, 115)`, Δ71: colour FAIL. Only the second check catches that one.

---

## How these numbers were made (2026-11-05)

Encoder: KTX-Software **v4.4.2** (`toktx`, `ktx` in `/usr/local/bin`). Commands, as `npm run encode -- _studio` (`scripts/encode-cover.mjs`) ran them from the repo root:

```bash
toktx --t2 --encode etc1s --genmipmap --lower_left_maps_to_s0t0 --assign_oetf srgb \
  covers/_studio/public/sleeve-etc1s.ktx2 covers/_studio/public/sleeve.png
toktx --t2 --encode uastc --zcmp 18 --genmipmap --lower_left_maps_to_s0t0 --assign_oetf srgb \
  covers/_studio/public/sleeve-uastc.ktx2 covers/_studio/public/sleeve.png
```

`ktx info` (excerpt; the script fails and deletes the file unless both lines are present):

```text
sleeve-etc1s.ktx2   Validation successful · levelCount: 10 · supercompressionScheme: KTX_SS_BASIS_LZ
                    Transfer: KHR_DF_TRANSFER_SRGB · Model: KHR_DF_MODEL_ETC1S · KTXorientation: ru
sleeve-uastc.ktx2   Validation successful · levelCount: 10 · supercompressionScheme: KTX_SS_ZSTD
                    Transfer: KHR_DF_TRANSFER_SRGB · Model: KHR_DF_MODEL_UASTC · KTXorientation: ru
                    KTXwriterScParams: --encode uastc --zcmp 18
```

Runtime: three 0.185.1 `KTX2Loader` through `src/lib/ktx2.js` (`setTranscoderPath(import.meta.env.BASE_URL + 'basis/')`, the one transcoder pair vendored at the repo-root `public/basis/`); R3F 9.8.2, drei 10.7.9, React 19.3.1. Read from the studio panel and its `[_studio]` console line after `npm run build && npm run preview`, walking gallery → `/covers/_studio` → PNG → ETC1S → UASTC → Flat → PNG in one page session. The same numbers came back from `npm run dev` and from a subfolder build (`BASE_PATH=/feii-album-covers/`, transcoder fetched from `/feii-album-covers/basis/`).

**What this does not tell you.** SwiftShader offered the transcoder ETC2 and ASTC. A laptop GPU may be offered BC7 or another format, and then the same file takes a different number of GPU bytes. That is why `texture.format` sits beside every number. Nothing here measures speed or phone memory. A real sleeve photograph will give other file bytes; measure your own.
