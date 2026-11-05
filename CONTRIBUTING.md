# Contributing a cover

> _“The contributor who reads the style guide is the contributor whose PR gets merged.”_
> — Tao of Development, `qa-007`

This repository is the class aggregator for the FE II [Units 8–9 assignment](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/units-8-9-assignment/): one gallery, one **route per team** at `/covers/<slug>`. You hand in your album cover as a short series of pull requests that light and then grow your route. The assignment page holds the grading bars; this file holds the mechanics. Read the [AI-assisted 3D covenant](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/ai-assisted-3d-covenant/) before your first prompt.

The ritual is the one you already used in TTOD ([`contributing.md`](https://github.com/ruvebal/ttod/blob/main/docs/public/guides/contributing.md)): a named branch from `main`, changes inside your own boundary, the PR template, a CI check that must pass, one human approval, the AI Review Log, small staged PRs, and at least one contribution and one review outside your own work. The only thing that changes is the boundary: in TTOD it was a module seam; **here it is your cover slug**.

---

## Your boundary

Tasks 1–3 change only:

- `covers/<slug>/**` — your route folder, copied once from `covers/_template/`;
- **one** object in `covers/registry.json` — yours.

You never edit `src/App.jsx`, `src/gallery/`, `src/lib/`, `scripts/`, `public/`, `.github/`, `covers/_studio/`, `covers/_template/`, or another team's `covers/<slug>/` (except through task4, below). `CODEOWNERS` routes any change to those instructor paths to the instructor.

### The registry object

```json
{ "slug": "ok-computer", "title": "OK Computer", "authors": ["handle-one", "handle-two"], "concept": "Radiohead — OK Computer (1997). Recognisable sleeve as a DOM poster.", "thumbnail": "thumbnail.svg", "tags": ["dom"], "readiness": "wip" }
```

| Field | Rule |
| --- | --- |
| `slug` | Lowercase kebab-case. It is your folder name and your URL: `/covers/<slug>`. |
| `title` | Short heading for the gallery and project selector (album title as DOM text). |
| `authors` | Your team's GitHub handles. |
| `concept` | **Artist — Album (year)** plus one honest line for the exhibition index (replaces the old separate `album` field). |
| `thumbnail` | Filename under `covers/<slug>/public/` (square preview; start from `_template/public/thumbnail.svg`). |
| `tags` | Non-empty array of short labels (`webgl`, `dom`, `shader`, `ktx2`, …). |
| `readiness` | `wip` while building, `ready` when your route meets the assignment bars; instructor routes use `reference` or `demo`. |

Keep the array **sorted by slug** and put each object on one line. `npm run lint` checks this schema, the sort order, and that `covers/<slug>/src/Route.jsx` exists, on every PR. A slug that is not in the registry has no route.

---

## Route contract (D26)

Each `/covers/<slug>` is a **complete student-authored endpoint**. Your team owns format, DOM, Canvas (if any), camera, controls, state, layout, interaction, and route-scoped CSS. The aggregator owns discovery, routing, a collapsed fixed project selector, prev/next/all navigation, lazy loading, per-route error isolation, and production checks — it does **not** wrap your work in a shared `<Canvas>` or side panel.

The gallery shell (`src/gallery/CoverRoute.jsx`) lazy-loads `covers/<slug>/src/Route.jsx` inside an error boundary. Unmount your route when navigating away: dispose WebGL textures, cancel `requestAnimationFrame`, remove listeners, and drop `document.documentElement` scope classes so another slug cannot inherit your runtime.

`covers/_studio` is a **reference**, not a prescribed composition (sleeve shader + KTX2 compare on an original sleeve). Instructor fixtures `_fixture-webgl`, `_fixture-dom`, and `_fixture-throw` (error-boundary demo) show WebGL-only, DOM-first, and failing routes. Run `npm run smoke:x14` after changing shell or fixture cleanup behaviour.

### 1. Module: `Route.jsx` default export

- Add `covers/<slug>/src/Route.jsx` and default-export one React component that fills the viewport for your experience.
- You may compose R3F, plain DOM, or hybrid layouts inside this file (and helpers under your slug folder).
- Import from your folder, npm packages, and read-only helpers in `src/lib/` (`ktx2.js`, `gpuBytes.js`, `BudgetProbe.jsx`, …). Never edit `src/gallery/`, `src/App.jsx`, or another team's slug.
- Scope CSS with a route-specific class on `document.documentElement` or a root wrapper; remove it on unmount.

The Unit 8 lab still teaches a fork with `App.jsx` + `Cover.jsx`; on the aggregator that composition may live **inside your** `Route.jsx` if you choose WebGL — but DOM-only and hybrid routes are valid. See `_studio` for **one reference** layout, not the only hand-in.

### 2. Pictures: your files live in `covers/<slug>/public/`, referenced relative to your route

In the fork, Vite served the fork's root `public/` from the site root, so the Cover shaders "own photo" version loaded the picture by a root path. On the aggregator every team would collide on that one path, so **each route keeps its pictures in its own `covers/<slug>/public/`** and references them relative to the module that loads them:

```js
// covers/<slug>/src/sleevePicture.js
export const SLEEVE_URL = new URL('../public/sleeve.png', import.meta.url).href;

export function useSleevePicture() {
  return useTexture(SLEEVE_URL, tagScreenColours);
}
```

`new URL(…, import.meta.url)` resolves from the file's own location, so it keeps pointing at your folder after you copy `_template`; Vite copies the file into the build with a content hash and rewrites the URL, so it also works when the gallery is served from a subfolder. Never reference a route picture from the site root, and never put it in the repo-root `public/`. Your task3 `.ktx2` file is referenced the same way. The Basis transcoder is the exception: the gallery vendors one shared copy at the repo-root `public/basis/` (for three 0.185.1), and the shared loader `src/lib/ktx2.js` builds its path from `import.meta.env.BASE_URL`. Load your `.ktx2` with that loader's `useKTX2Texture(url)`, as `covers/_studio/src/sleeveKtx2.js` does, and measure it with `src/lib/gpuBytes.js`. Do not copy the transcoder into your route. `npm run encode -- <slug>` writes `public/sleeve-etc1s.ktx2` and `public/sleeve-uastc.ktx2` next to your `public/sleeve.png` (it needs `toktx`, and stops loudly without it).

### 3. Materials: register under a slug-unique name

React Three Fiber's `extend` writes into **one catalogue shared by every route**. If two covers both call `extend({ SleeveShader })`, whichever cover loaded last owns the name, and the other cover silently renders the wrong shader. The Cover shaders lesson's `SleeveMaterial.jsx` registers `SleeveShader`, so when you move it onto your route, change that one line in either of two ways:

```jsx
// Either: a key that starts with your slug, used as the lower-camel-case element.
extend({ OkComputerSleeve: SleeveShader });
// …
return <okComputerSleeve ref={material} uMap={map} uHot={hot ? 1 : 0} />;
```

```jsx
// Or: the component form. R3F generates a key that cannot collide.
const Sleeve = extend(SleeveShader);
// …
return <Sleeve ref={material} uMap={map} uHot={hot ? 1 : 0} />;
```

Everything else in the file stays as the lesson wrote it. Never register a three.js name (`MeshStandardMaterial`, …) either: every route uses those. `npm run lint` lists every `extend({ … })` key under `covers/*/src/` and fails, naming both slugs, when two routes share one or a key shadows a three.js export.

`covers/_template/` ships neutral `Route.jsx` starters (DOM default; optional `starters/webgl` and `starters/hybrid`). No mandated sleeve/vinyl stage.

---

## Opening a PR

1. **Branch from `main`**, with the cover branch pattern:

   ```bash
   git switch main && git pull
   git checkout -b cover-<slug>-task<N>-<short-topic-name>
   ```

   For example `cover-ok-computer-task1-mesh`, `cover-ok-computer-task2-shader`, `cover-ok-computer-task3-ktx2`. Keep the `cover-<slug>-task<N>` prefix: it is how a reviewer (or a later local review bot) matches your PR to its assignment bar.

2. **task1 only:** copy the template once and add your registry object.

   ```bash
   cp -R covers/_template covers/<slug>
   ```

   Later tasks edit that folder only.

   **Expected conflict on `covers/registry.json`.** Every team adds one object to the same array, so a PR opened before another team's merge often conflicts there. Resolve it like this:

   ```bash
   git fetch origin && git rebase origin/main
   # in covers/registry.json: keep BOTH objects (theirs and yours), delete the conflict markers,
   # keep the array sorted by slug, one object per line, valid JSON
   git add covers/registry.json && git rebase --continue
   npm run lint                         # checks the JSON, the schema and the sort order
   git push --force-with-lease          # your own cover-… branch only, never main
   ```

3. **Stage the work.** Small PRs defend better than one dump:

   | Task | What lands |
   | --- | --- |
   | **task1 — light the route** | `Route.jsx` default export, registry row (all metadata fields), `public/thumbnail.svg`, layout that reads as the named album; type and controls in the DOM; `docs/renderer-info.md` with measured rows **when WebGL applies**, or an honest N/A for pure DOM. |
   | **task2 — authored shader** | **When your route uses a custom GLSL/sampler effect:** one effect you can explain (`docs/shader-note.md`); update renderer note if the budget moves. Pure DOM routes state N/A in `shader-note.md`. |
   | **task3 — KTX2 and evidence** | **When your route loads GPU textures:** source PNG in `public/`, chosen ETC1S or UASTC `.ktx2`, `docs/ktx2-note.md` (file bytes and computed GPU bytes), completed renderer note, `docs/ai-3d-merge-log.md`. Pure DOM: document N/A — do not fake KTX2 numbers. |
   | **task4 — cross-cover** | A real fix in another team's slug (with their consent) or a shared gallery / accessibility fix, **and** at least one formal review of a PR outside your slug. |

4. **Before you push**, run what CI runs:

   ```bash
   npm run lint && npm run build
   ```

   JavaScript + JSDoc; there is no `tsc` step.

5. **Open the PR.** The template fills in: what the PR does, the contract (own route + one registry object, no `App.jsx` rewrite), the acceptance bar, checks, accessibility, rights, and the **AI Review Log**.

6. **Merge rules.** The `lint-and-build` check must pass and **one human** must approve. Students never press Merge, not even on their own PR with a green check and an approval: the instructor merges. Bots and assistants may comment; they **never approve and never merge**.

   This is a course rule, held by the instructor merging only through pull requests. Branch protection on `main` now **requires** a green `lint-and-build` check and at least one approving review; force-push to `main` is disabled. Still never push `main` yourself — always open a PR. The repository is public (Pages); IP declarations (D8) are non-negotiable.

### AI Review Log

Every PR carries Unit 6's two-column table, filled in honestly:

| What was AI-assisted | What I verified myself |
| --- | --- |
| | |

A PR missing it is incomplete, not under-documented. A bot comment on your PR is a different event from your own disclosure; it does not replace the log. Covenant decisions (ACCEPT / REJECT / ESCALATE per diff) go in your route's `docs/ai-3d-merge-log.md`.

### Cross-cover work (task4)

At least **one PR into a slug you do not own** (or a shared gallery/accessibility fix) and at least **one formal review of a PR outside your slug** are part of the assignment. To review:

```bash
gh pr checkout <number>
npm run dev        # open /covers/<their-slug>
gh pr review <number> --comment --body "..."      # or --approve / --request-changes
```

Review against the assignment bars and the PR template's checklist, not a general impression. Request changes on real defects (contract broken, budget row missing, picture without a declared right, AI Review Log missing), not on taste alone.

---

## Rights (D8)

- Use artwork you created, public-domain material, an open licence that permits the public adaptation, or written permission from the rights holder.
- Record the creator, source, licence/permission, and required attribution in `docs/ktx2-note.md`.
- Owning a physical album is not permission to republish its cover. Public Pages is not private study, and a repository is not a licence.
- A claimed legal exception requires instructor review before publication. `_studio` and `_template` ship original or public-domain / CC art only.

## Editor rules

`.cursor/rules/` holds five rule files (`00-project`, `20-r3f-patterns`, `30-shaders`, `40-asset-pipeline`, `50-performance`) tuned to this repository. Read them as the house style; they work with any editor or none.

## What this repository does not ask for

- **TTOD's seam vocabulary as branch names.** Branches are `cover-<slug>-task<N>-<short-topic-name>` — your slug is your seam.
- **TTOD's quote-proposal two-approval workflow.** That governs TTOD's quote collection; here a PR has one human approval.
- **An in-app `ASSIGNMENT.md`.** The criteria live on the FE II assignment page.
- **Cloud PR-review automation.** There is no cloud review workflow and no API key; an optional local first pass may comment, never decide.
- **MCP servers, MCP shopping, Stitch, 21st.dev, or any other assistant-server, design-generator, or editor-plugin install** as homework. The covenant explains why.
- **A second sandbox or a rewrite of `src/App.jsx`.** The gallery already owns the router and the route contract.

## Sources

- TTOD — [`contributing.md`](https://github.com/ruvebal/ttod/blob/main/docs/public/guides/contributing.md) and [`reviewing-cohort-prs.md`](https://github.com/ruvebal/ttod/blob/main/docs/public/guides/reviewing-cohort-prs.md); Tao of Development `qa-007`.
- FE II — [Unit 8](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/unit-8-r3f-fundamentals/) (cover fork), [Cover shaders](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/cover-shaders/) (lab mapping), [KTX2/Basis](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/ktx2-basis/), [Unit 6](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/unit-6-ai-code-review/) (AI Review Log), [AI-assisted 3D covenant](https://ruvebal.github.io/web-atelier-udit/lessons/en/feii/ai-assisted-3d-covenant/).
