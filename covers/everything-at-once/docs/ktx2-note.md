# KTX2 choice — Everything at Once

<!-- Template (Units 8–9 assignment / KTX2-Basis satellite). Replace every ellipsis. -->

Album: Texas Red — Everything at Once (2025).
Artwork creator and source: cover drawing and band illustration by Karu; 3D scene (Blender) by Guille (Texas Red, guitarist). Files supplied directly by the authors.
Right to publish and adapt (student-created / public domain / open licence / written permission): written permission. Karu sent the illustrations to Pavlo Novoa (bassist, PRNovoa) granting their use for this public course page (Nov 2026); Guille, the scene's author, is a band member and agreed to its use.
Required attribution: "Cover and illustrations: Karu. 3D scene: Guille (Texas Red). Used with permission."

Provenance confirmed by Pavlo Novoa on 26 Nov 2026: the guitar and glasses are Guille's work and are covered by his recorded permission above. The other third-party models use the sources and credits listed below. The original scene's use was also accepted by the instructor in conversation in November 2026, as previously reported.

The source list was initially assembled from the author's download folder names and Sketchfab matches on 5 Nov 2026; Pavlo subsequently confirmed the listed sources. This is contributor-confirmed provenance; the original download archives and licence files were not independently inspected during this follow-up.

| Asset | Source (sketchfab.com/3d-models/…) | Author | Licence |
| --- | --- | --- | --- |
| Ship in a bottle | ship-in-a-bottle-9ddbc5b32da94bafbfdb56e1f6be9a38 (original; the download was a re-upload) | Loïc Norgeot | CC BY-NC 4.0 |
| Nintendo 64 | nintendo-64-0a6b8eb8097e4365a34b1af7b6eac408 | DevonCarlson | CC BY-NC 4.0 |
| Toy car (2008 Dodge Viper SRT10) | 2008-dodge-viper-srt10-65d8b5fc4ba7462db1f8a981af9ae32a | Ddiaz Design | CC BY-NC 4.0 |
| Frog | tiny-frog-c25c8980b93a460aa521ae62d3d94e0e | yanix | CC BY 4.0 |
| Flip phone | cute-flip-phone-596ee086b8374a74a7389c9dcd67fe8e | Kevin Perlado | CC BY 4.0 |
| D20 dice | dice-d20-2d29634374eb4893a76a48132663d5a7 | dutrabr98 | CC BY 4.0 |
| Metronome | metronome-8fe0e5c562534e2aa266d464a796dc42 | burnedhrum | CC BY 4.0 |
| Crown, microphone, drumstick | (outside the cover frame; not shipped) | — | — |
| Guitar and glasses | Supplied by Guille; confirmed by Pavlo, 26 Nov 2026 | Guille (Texas Red) | Used with permission |
| Other original-scene props (tie, coins, sword, key, ring, papers) | Not shipped as standalone models in the current route | — | — |

**What ships now:** runtime imports in `src/heroes.js` load five models: `hero-andres.glb` (metronome), `hero-guille.glb` (guitar), `hero-javi.glb` (controller), `hero-lucy.glb` (glasses), and `hero-pavlo.glb` (three cigarettes). The controller uses the Nintendo 64 source credited above, as confirmed by Pavlo. The cigarette textures and under-plate are recorded in ai-3d-merge-log.md (accepted v2, approved by Karu and the band on 8 Nov 2026); the cigarette feature was introduced in commit 20eded5. No third-party cigarette download is identified in the repository; the original mesh construction is not explicitly documented by those records. The guitar and glasses are Guille's models, used with his permission. No standalone bottle, car, frog, phone, dice, tie, coin, sword, key, ring, or paper models ship in this route's public folder; these props belong to the original scene or cover artwork. Karu's artwork is covered by the permission recorded above. The original scene and export scripts are not included in this checkout.

All shipped models are modified (geometry reduced, retextured). Poliigon texture `MetalCorrodedHeavy001` (licence forbids redistribution) is not shipped: task1 exports no source textures.

Chosen mode (ETC1S or UASTC; or PNG kept, if the encoder was missing — say so): **UASTC**, for the sleeve's back face (`public/back.png` → `public/back-uastc.ktx2`, written by `npm run encode -- everything-at-once back.png`, KTX-Software 4.4.2). The other flat layers stay ETC1S (soft crayon drawing, no small type) and the heroes' painted textures are UASTC (painted detail on small models).
Why it fits this sleeve (one honest reason: photo grain, sharp type, a logo...): sharp type. The back is Karu's tracklist in flat purple on flat yellow, and five of its titles are tap targets. ETC1S rings every letter with dark block edges and lilac halos; UASTC is indistinguishable from the PNG at 2× zoom (decoded to RGBA8 and compared with the source: ETC1S 29.7 dB PSNR, mean error 4.2/255; UASTC 44.4 dB, 0.7/255). On this GPU both transcode to BC7, so the GPU bytes are equal and the only cost of UASTC is the download: 3.7 MB instead of 472 KB.

Measured on (machine, browser, date): i7-10750H + RTX 2060 Mobile, headless Chromium 155.0.8059.84 (WebGPURenderer on its WebGL 2 backend, ANGLE/Vulkan), 10 Nov 2026. Each file loaded with the shared `KTX2Loader` (transcoder `public/basis/`, `detectSupport` on the route's renderer) and measured with `src/lib/gpuBytes.js`.
Levels counted (all levels on every row, or level 0 on every row): all levels on every row (12: 2048 → 1). Level 0 alone: PNG 16,777,216; ETC1S and UASTC 4,194,304.

| Asset | File bytes (on disk) | GPU bytes (computed) | texture.format | Observation |
| --- | ---: | ---: | --- | --- |
| Source PNG | 4,409,175 | 22,369,620 | RGBAFormat | Reference. 2048², sRGB, no ICC profile; mipmaps generated by three.js. |
| ETC1S .ktx2 | 472,379 | 5,592,432 | RGBA_BPTC_Format | Smallest file. Block edges and colour halos around every letter of the tracklist. Measured, not shipped. |
| UASTC .ktx2 | 3,682,928 | 5,592,432 | RGBA_BPTC_Format | Shipped. Type as clean as the PNG; zstd 18 on disk. A quarter of the PNG's GPU bytes. |

Texture count (renderer.info.memory.textures, a count, not bytes), before and after the sleeve loads: 18 → 18 at rest. The back face is one texture in either codec: switching it from ETC1S to UASTC replaced one texture with one (the full route at rest reads 18 in both builds).

Orientation check (does uv 0,0 land bottom-left and the title read upright? how was the file encoded?): yes. Encoded with `--lower_left_maps_to_s0t0` (`ktx info`: `KTXorientation: ru`), and the decoded level 0 matches the source only when flipped (row 0 = the bottom). In the route, turned over, the title and the tracklist read upright and the five tap targets (`layers.json.tracks`, measured on the PNG) land on their titles (`landing.json`: Let's Go → Guille, Nihongo → Lucy).
colorSpace check (what does texture.colorSpace log after loading? what did you do if it was not srgb?): `srgb` for both files (`--assign_oetf srgb`, `ktx info`: `KHR_DF_TRANSFER_SRGB`); `flipY` false. Nothing to correct.
