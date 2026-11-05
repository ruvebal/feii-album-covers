# feii-album-covers

The FE II class aggregator for the [Units 8–9 assignment](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/units-8-9-assignment/): a **web 3D version of your favourite album cover**, handed in as pull requests that light your team's route.

One repository, one gallery, one route per team at `/covers/<slug>`. The instructor runs `npm run dev` once and walks every cover by URL. Students never get a separate assignment repo and never replace the router: a team adds **one folder** (`covers/<slug>/`) and **one registry object**, and its route turns on.

`react-template` remains the Units 8–9 **lesson sandbox** (the beacon). Practise there or in CodeSandbox; hand in here.

**Start with [`CONTRIBUTING.md`](CONTRIBUTING.md)** — branch pattern, PR ritual, route contract. Before your first AI prompt, read the [AI-assisted 3D covenant](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/ai-assisted-3d-covenant/).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173/ — the gallery index
npm run lint       # ESLint + registry schema check
npm run build      # production build into dist/
```

Pins match `react-template`: `react` / `react-dom` 19.3.1, `three` 0.185.1, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, `react-router-dom` 7.18.5. JavaScript + JSDoc; no TypeScript.

To serve from a subfolder, build with `BASE_PATH=/feii-album-covers/ npm run build` (and preview with the same variable). The router's `basename` and every built path come from `import.meta.env.BASE_URL`.

## Route contract (summary, D26)

The full text is in [`CONTRIBUTING.md`](CONTRIBUTING.md#route-contract).

Each `/covers/<slug>` is a **complete student-authored endpoint**: your team owns DOM, Canvas (if any), camera, controls, state, layout, and CSS for that URL. The exhibition shell (`src/gallery/CoverRoute.jsx`) only routes, lazy-loads your module, isolates errors, and supplies a collapsed fixed project selector plus prev/next/all navigation — it does **not** mount a shared `<Canvas>` around student work.

1. **Module.** Default-export one component from `covers/<slug>/src/Route.jsx`. The gallery lazy-loads it when the slug is lit in `covers/registry.json`.
2. **Pictures.** Each route keeps its pictures in `covers/<slug>/public/` and references them relative to the loading module — `new URL('../public/sleeve.png', import.meta.url).href` — never by a path from the site root.
3. **Materials.** When you use R3F, `extend` keys are shared by every route. Register under a slug-unique key or use the component form. `npm run lint` fails when two slugs share a key.

`covers/_studio` is a **reference**, not a prescribed composition (sleeve shader + KTX2 compare). Instructor fixtures `_fixture-webgl` and `_fixture-dom` prove WebGL-only and DOM-first formats.

## Layout

```
src/
  main.jsx                 BrowserRouter (basename from BASE_URL), tokens → CSS vars
  App.jsx                  instructor-owned router: / and /covers/:slug
  gallery/
    Home.jsx               visual exhibition index (thumbnails, readiness)
    CoverRoute.jsx         exhibition shell: lazy Route.jsx, error boundary, overlay nav
    ProjectSelector.jsx    collapsed fixed project switcher (keyboard accessible)
    RouteNav.jsx           prev / next / all projects
    registry.js            registry.json + import.meta.glob('../../covers/*/src/Route.jsx')
    CanvasErrorBoundary.jsx
  lib/                     BudgetProbe (+ Unit 9 per-frame probe), budget verdict, KTX2 loader,
                           gpuBytes, reduced-motion hook, JSDoc typedefs
  theme/tokens.js          colour tokens (single source)
covers/
  registry.json            [{ slug, title, authors, concept, thumbnail, tags, readiness }]
  _template/               neutral Route.jsx starters (DOM / WebGL / hybrid) — never a route
  _studio/                 instructor reference route (not the expected student answer)
public/basis/              the ONE vendored Basis transcoder pair (three 0.185.1)
scripts/
  check-registry.mjs       registry schema + sort, unique R3F extend keys (runs in npm run lint)
  encode-cover.mjs         PNG → ETC1S + UASTC KTX2, verified with ktx info (fails loudly without toktx)
.cursor/rules/             00-project, 20-r3f-patterns, 30-shaders, 40-asset-pipeline, 50-performance
.github/
  pull_request_template.md contract · acceptance · checks · a11y · rights · AI Review Log
  workflows/lint-and-build.yml   npm ci → lint → build (no deploy, no secrets)
```

A slug is a route only when it is both in `covers/registry.json` **and** has `covers/<slug>/src/Route.jsx`.

## Collaboration

The TTOD contribution ritual, mapped onto cover routes: branch `cover-<slug>-task<N>-<short-topic-name>` from `main`; change only your slug plus one registry object; the PR template with its **AI Review Log**; the `lint-and-build` check and **one human approval** (a course rule: the instructor merges only through PRs; see [`CONTRIBUTING.md`](CONTRIBUTING.md) step 6); small staged PRs (task1 mesh → task2 shader → task3 KTX2 → task4 cross-cover); at least one PR into another slug and one formal review outside your own. Bots and assistants may comment; they never approve or merge. Details: [`CONTRIBUTING.md`](CONTRIBUTING.md). Contribution epigraph: Tao of Development `qa-007`.

No MCP servers, MCP shopping, Stitch, 21st.dev, or other assistant servers, design generators, or editor plugins are homework here. The covenant is the student contract; everything else is optional.

## Rights

The repository is **public** with GitHub Pages at [https://ruvebal.github.io/feii-album-covers/](https://ruvebal.github.io/feii-album-covers/) — classroom artwork is world-visible, so **licence and IP matter more, not less** (D8). Each route records the creator, source, licence/permission, and attribution in `docs/ktx2-note.md`. Use student-created artwork, public-domain material, an open licence that permits the public adaptation, or written permission from the rights holder. Owning a physical album is not permission to republish its cover. `_studio` and the `_template` use original or PD/CC material only.

## Instructor notes

- **Review loop** (TTOD [`reviewing-cohort-prs.md`](https://github.com/ruvebal/ttod/blob/main/docs/public/guides/reviewing-cohort-prs.md)): check student PRs out in one sibling worktree, never in the teaching clone — `git fetch origin && git worktree add --detach ../feii-album-covers-review origin/main` (detached, because `main` is already checked out in the teaching clone), then `gh pr checkout <n>` there. Humans run `gh pr review --approve | --request-changes`; merge with `gh pr merge --squash`. A local model may comment; there is no cloud review workflow.
- **Merge rule (D23, amended 2026-11-05):** `lint-and-build` must pass and one human must approve. The repository is **public** (GitHub Pages exhibition). Branch protection on `main` is **enabled**: required check `lint-and-build`, ≥1 approving review, force-push disabled. Students never press Merge; the instructor merges through PRs. Keep a local mirror. `lint-and-build` also runs on every push to `main`.
- **CODEOWNERS** requests the instructor's review for `src/`, `scripts/`, `covers/_studio/`, `covers/_template/`, `.github/`, `.cursor/`, the README and CONTRIBUTING, `index.html`, `.gitignore`, and the package and build config. With branch protection, reviews are required before merge. Student slugs are not instructor-owned.
- **Shared assets**: the Basis transcoder is vendored once at the repo-root `public/basis/` (three 0.185.1's pair; see `public/basis/README.md`), and `src/lib/ktx2.js` builds its path from `import.meta.env.BASE_URL`. Routes never copy it. When the three pin changes, copy both files again. Vite also emits an unused hashed copy from three's default path into `dist/assets/`; that is expected.
- **`/covers/_studio`** is the instructor's reference route: the Cover shaders sleeve material (extend key `StudioSleeve`) on an original sleeve, and the KTX2 hello-world switch (Flat / PNG / ETC1S / UASTC) with file bytes, computed GPU bytes, the texture count, `texture.format`, and colorSpace / colour / orientation checks. Its measured notes are in `covers/_studio/docs/`. Students copy `_template`, never `_studio`.
