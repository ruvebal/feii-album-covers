<!--
Fill this in before requesting review. It mirrors TTOD's PR template (Phase V §5
rubric), remapped to cover routes. Branch name: cover-<slug>-task<N>-<short-topic-name>.
The assignment criteria live on the FE II "Units 8–9 assignment" page — there is no
ASSIGNMENT.md in this repo.
-->

## What this PR does

<!-- One or two sentences. Name the task (task1 mesh · task2 shader · task3 KTX2 ·
     task4 cross-cover) and the assignment bar it satisfies. -->

## Contract adherence

- [ ] Changes only `covers/<slug>/**` plus **one** object in `covers/registry.json` (task4: the other team's slug, with their consent, or a shared gallery/a11y fix)
- [ ] Does not edit `src/App.jsx`, `src/gallery/`, `src/lib/`, or the registry schema
- [ ] `covers/<slug>/src/Route.jsx` default-exports a complete endpoint (your team owns DOM and/or Canvas inside this module)
- [ ] Pictures live in `covers/<slug>/public/` and are referenced relative to the route (`new URL('../public/…', import.meta.url)`), never by a path from the site root

## Correctness & acceptance criteria

- [ ] The specific assignment bar this PR satisfies:

## Checks

- [ ] `npm run lint && npm run build` pass locally before requesting review
- [ ] `docs/renderer-info.md` and `src/budget.js` agree with the panel on my machine (if the tree changed)

## Accessibility

- [ ] Keyboard-operable controls, one accessible name per control, no colour-only cue, motion stops under `prefers-reduced-motion` — applies to every PR regardless of task
- [ ] Album title and controls are DOM text, not pixels in the WebGL buffer

## Rights (D8)

- [ ] Every picture is student-created, public domain, suitably open-licensed, or used with written permission; creator, source, right, and attribution are recorded in `docs/ktx2-note.md` (owning an album is not permission to republish its cover)

## AI Review Log (Unit 6 — required, not optional)

<!-- Reuse Unit 6's own template. A PR missing this entry is incomplete. -->

| What was AI-assisted | What I verified myself |
| --- | --- |
| | |

**AI never approves or merges this PR — only comments. A human approves.**
