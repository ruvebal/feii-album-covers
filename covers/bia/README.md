# BIA

BIA is a route-owned Three.js cover study of Supertramp's _Breakfast in
America_. It combines a Blender-exported glass scene with a licensed
replacement hand, an original liquid shell, original signature artwork, and
the Six Caps title font.

## Route

- URL: `/covers/bia`
- Entry point: `src/Route.jsx`
- Styling: `src/route.css`
- Controls: open **LISTEN** to reveal the Spotify album embed
- Motion: the glass, hand, and liquid animation follows the user's
  `prefers-reduced-motion` setting
- Budget panel: append `?budget` to the route to show the sampled
  `renderer.info` values

The route owns its R3F `Canvas`, loads all local assets with
`new URL('../public/...', import.meta.url)`, and removes its document scope
class when it unmounts. It does not register a custom shader or load KTX2
textures.

## Asset provenance

- The glass source is the free model
  [Empty Glass 01](https://www.cgtrader.com/free-3d-models/furniture/tableware/empty-glass-01).
- The hand asset comes from
  [Blend Swap asset #22269](https://blendswap.com/blend/22269) and is
  released under [Creative Commons Zero 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  The archived licence evidence is
  [`docs/licenses/bia-hand-license.html`](docs/licenses/bia-hand-license.html).
- The font Six Caps is licensed under the [SIL Open Font License, Version 1.1](https://fonts.google.com/specimen/Six+Caps/license).
- The liquid geometry, signature artwork, and route code are
  original project assets.
- The Spotify player is an external embed and is not redistributed by this
  repository.

The full rights declaration is in [`docs/ktx2-note.md`](docs/ktx2-note.md).

## Local checks

From the repository root:

```bash
npm run lint
npm run build
```

The current browser budget sample is documented in
[`docs/renderer-info.md`](docs/renderer-info.md).
