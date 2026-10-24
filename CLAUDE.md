# Brutus — Battleship: Engineers vs AI

A small browser game. Battleship, retold as a story about software engineers competing with AI.
**The goal is empathy, not doom.** The player should feel seen; the ending reframes competition
as collaboration. Storytelling matters more than feature count. When in doubt, cut a feature
and polish a moment.

## Premise

- The player is a software engineer. Their fleet is their work:
  The Side Project (5), The Promotion (4), The Open-Source Lib (3), The Pet Project (3),
  The Weekend Hack (2).
- Four chapters. The AI grows stronger each chapter:
  | Ch  | Interstitial       | AI                                |
  | --- | ------------------ | --------------------------------- |
  | 1   | Monday standup     | Tier 1: random                    |
  | 2   | 2am commit         | Tier 2: hunt/target               |
  | 3   | Performance review | Tier 3: probability density       |
  | 4   | The pager goes off | Choice: fight (Tier 3) or team up |
- Between chapters: a 2–4 line interstitial with a typewriter effect.
- The AI makes one short comment per move. Its tone runs from clumsy (Tier 1) to unnervingly
  confident (Tier 3).
- **Losing never ends the game.** Each chapter's outcome is recorded and reflected in later copy.
- **Chapter 4:** the player chooses. "Team up" starts a co-op mode: player and AI take turns
  against a shared **Production Incident** fleet (Memory Leak 5, Race Condition 4, Flaky Test 3,
  DNS 3, Off-by-One 2), with the AI's density map shown as a faint hint overlay. "Keep fighting"
  plays a short Tier 3 match, then the incident escalates and the choice comes back. The player
  is never forced into co-op, but co-op is the true ending.

## Stack

TypeScript (strict), Vite, React, Vitest, Playwright, ESLint, Prettier. No backend. A static site
deployed to GitHub Pages at `/brutus/`. Node 22 (see `.nvmrc`).

**Dependencies are minimal by rule.** Ask before adding any runtime or dev dependency beyond:
React, Vite, Vitest, Playwright, ESLint, Prettier, and their direct tooling packages
(`@vitejs/plugin-react`, `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `@types/*`).
Fonts are system stacks; sound is synthesised with Web Audio, with no asset files.

## Layout and layering

```
src/
  engine/       pure game logic: types, coord, fleet, placement, board, match reducer, rng
  ai/           AI tiers behind one interface; sees BoardView only, never the real Board
  story/        chapters.ts (ALL copy) + commentary picker
  persistence/  versioned localStorage save/load
  ui/           React: screens/, components/, hooks/, styles/
e2e/            Playwright tests
```

Dependency direction: `ui → story, persistence, ai → engine`. ESLint (`no-restricted-imports`)
enforces this. Never import upward, and never import React outside `src/ui` and `src/main.tsx`.

## Key contracts

```ts
interface Ai {
  readonly tier: 1 | 2 | 3;
  chooseShot(boardView: BoardView, history: readonly ShotRecord[]): Coord;
}
createAi(tier, rng): Ai
```

- `densityMap(view)` (Tier 3's heatmap) is exported from `src/ai` and also drives the co-op
  hint overlay.
- AIs are stateless between calls: they rebuild any working state from `boardView` and `history`.
- `BoardView` exposes only `'unknown' | 'miss' | 'hit' | 'sunk'` per cell, plus the remaining
  ship lengths. The AI can't cheat because the type system won't let it.
- Ships are stored as placements (origin, orientation, length). Their cells are derived.
  Shots are the source of truth for hits.
- One battle is a pure reducer: `matchReducer(state, action) → state` in `engine/match.ts`
  (modes `versus` | `coop`). `applyMatchAction` is the same transition but returns a typed
  `Result`, for tests and for callers that need the error. The chapter flow (Phase 5) wraps
  matches; it doesn't change them. The UI drives both with `useReducer`.
- Fallible engine functions return `Result<T, E>` (`ok` / `err` in `engine/types.ts`) instead of
  throwing. Throwing is reserved for programmer errors (e.g. `pick([])`).

## Rules

1. **Every engine or AI change ships with tests.** There is no untested logic in `src/engine` or `src/ai`.
2. **Story copy lives in `src/story/chapters.ts`.** No user-facing narrative strings in logic or
   components. UI chrome (button labels, ARIA labels) may live in components.
3. **No `Math.random`.** Use the injectable `Rng` from `src/engine/rng.ts` (ESLint enforces this).
   Tests use fixed seeds.
4. **Engine and AI are pure:** no DOM, no React, no `Date.now()`, no I/O.
5. **Accessibility is not optional:** full keyboard play (roving tabindex and arrow keys on grids),
   visible `:focus-visible`, an ARIA label on every cell (e.g. "Row C, column 5, hit"), a polite
   live region for shot results, and `prefers-reduced-motion` respected (the typewriter becomes
   instant and animations are dropped).
6. **Visual restraint:** two typefaces (`--font-mono`, `--font-sans`), five colours as CSS
   variables in `src/ui/styles/tokens.css` (`--bg --fg --muted --accent --signal`). No new
   colours without updating tokens. No gradients, no emoji UI. Motion only for hit, sink, and
   chapter transitions.
7. **Board is CSS Grid (or SVG), never Canvas.**
8. **Saves are versioned.** Bump `version` on any change to the shape of `GameState`, and discard
   (don't crash on) unknown or invalid saves.
9. Sound is optional and **muted by default**.

## Commands

```sh
npm run dev           # local dev server
npm run lint          # ESLint (type-aware)
npm run format        # Prettier write   | format:check to verify
npm run typecheck     # tsc -b
npm test              # Vitest (unit)
npm run test:e2e      # Playwright (builds + previews)
npm run check         # everything CI runs except e2e
```

Before declaring any work done, run `npm run check` (and `npm run test:e2e` for UI changes).

## Workflow

- One branch and one PR per phase off `main` (`phase-N-<slug>`). The owner reviews every PR.
- Build phases: 1 scaffold/CI · 2 engine · 3 AI · 4 UI · 5 story · 6 polish + Pages deploy.
- Stop after each phase with a summary, verification steps, commit message, and PR description.
- If the brief is ambiguous or a better approach exists, ask or propose. Don't silently decide.
