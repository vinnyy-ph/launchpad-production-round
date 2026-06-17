# SwiftWork — Project Memory & Handoff

> Handoff doc for continuing the **1:1 brandbook ↔ UI-kit fidelity** work in a fresh session.
> Written 2026-06-18. Branch: `frontend-demo`. Repo root has `src/` (NO `frontend/` subdir).

---

## The open task — DONE (2026-06-18, uncommitted on `frontend-demo`)

The 1:1 pass below is complete and render-verified (Playwright @980px vs the served book). Edits:
- Foundation: `--gradient-jia-45` (the book's 45° `--grad`) + `bg-gradient-jia-45` util (jia-tokens/tailwind);
  ported `.jia-cb-root`/`.jia-rb-root` (checkbox/radio, Radix `[data-state]` + `::after` marks) and
  `.circle-prog`/`.cp-*` into `src/index.css` `@layer components`.
- Primitives matched to the book CSS: button (radius 8, md px14, sm 13px, lg px16, per-variant border,
  disabled .38), badge + StatusBadge (5px gap / 6px radius / 3·8 pad / exact colorways), input (shadow-xs,
  500, focus #111322), select trigger (40px, gradient-open ring, caret flip) + items + menu, dropdown
  menu/items/separator/destructive, combobox trigger, checkbox/radio (135° fill + indeterminate), card
  (14px, 45° brand-scrim), progress (6px/45° + circular), table (gc-50 head, gc-100 rows).
- `/kit`: 3 card surfaces, circular-progress showcase, gradient-border "Brand ✦" display button,
  indeterminate checkbox. tsc clean (only pre-existing jest-dom test-matcher errors remain).

If you need to redo or extend it, the original brief follows.

**Make every live UI-kit component render 1:1 (pixel-identical) to its counterpart in the SwiftWork
brandbook.** Token-compliance is already done; the components still only *approximate* the brandbook's
hand-authored recipes. The owner wants exact parity — same heights, padding, radii, border colors,
shadows, type, and every state (hover/focus/disabled/checked) — for each component, AND the `/kit`
showcase displaying them identically to the brandbook's component gallery.

### Source of truth (the visual target)
`.claude/docs/swiftwork-design-system/swiftwork-brand-book.html` — a faithful clone of the FAT Jia book
`.claude/docs/jia-design-system/Brand Book.html`, reskinned to SwiftWork. Its `<style>` block holds the
exact component recipes. **This file IS the spec. When in doubt, match it.**
- Serve it: `cd .claude/docs/swiftwork-design-system && python -m http.server 8850` → open
  `http://127.0.0.1:8850/swiftwork-brand-book.html`. (file:// is blocked in the Playwright MCP.)
- Tokens: `.claude/docs/swiftwork-design-system/colors_and_type.css` (verbatim Jia tokens; mirrored in
  the app at `src/shared/styles/jia-tokens.css`).

### The brandbook's component CSS classes to match (in its `<style>`)
`.btn` (+ `.secondary/.ghost/.destructive`, sizes, `.gradient-border`), `.badge` (+ `.modern/.pill`,
sizes, dot), `.inp` (+ focus gradient border, error), `.dd-trigger/.dd-menu/.dd-item` (+ destructive),
`.jia-cb` (checkbox, gradient fill, indeterminate), `.jia-rb` (radio, gradient fill), `.comp-card`,
`.circle-prog/.cp-*` (circular progress), `.pt-stage.*` (table status badges), `.tbl-*` (data table +
toolbar), `.portal-table/.pt-*`, progress bar/track. Grep the html for each.

### Recommended method (surest 1:1 — port the CSS)
1. Serve the brandbook + run the app (`npm run dev`, port 3000 — likely already running). Open
   `http://localhost:3000/kit` beside the brandbook. Compare with Playwright screenshots.
2. For EACH component: read its exact brandbook CSS rule(s); restyle the live primitive in
   `src/shared/ui/primitives/<name>.tsx` (and patterns/charts) to those EXACT values (Tailwind
   arbitrary values or tokens). Match every state. **Two surest routes:** (a) copy the brandbook's
   component CSS rules into a kit stylesheet and have the component apply those class names, or
   (b) translate each rule to Tailwind on the primitive. (a) guarantees parity; (b) is more idiomatic.
3. Re-render `/kit` and diff against the brandbook section until identical. Don't move on until it
   matches.
4. Component checklist (brandbook Components section): Buttons (4 hierarchies × 5 sizes 32/36/40/44/48px
   + icon + the showcase `.gradient-border`), Badges (color/modern/pill × sm22/md24/lg28 + 6px dot),
   Inputs (default/error/hint + gradient focus border), Selects + Dropdowns (40px trigger, menu,
   destructive item), Checkboxes (gradient fill + white check + indeterminate bar), Radios (gradient
   fill + 3px white dot), Cards (inset-halo / standard / brand-scrim), Progress (6px linear gradient +
   step dots + circular cp-sm/md/lg), Data tables (directory + toolbar variants, `.pt-stage` status
   badges, pagination). Also confirm the foundation displays if the kit should show them.

### Constraints (owner instructions — obey)
- **Re-skin Jia 1:1**: token values are Jia's, unchanged; only identity differs. Cool ramp = `--gray-*`,
  text/border ramp = `--gray-neutral-*`; gradient stops `--brand-peach/pink/lilac/blue`; `--gradient-jia`
  is the ONE gradient moment (never on buttons/borders/text). Satoshi 400/500/700 only. Sentence case,
  no emoji except the sparkle `✦`, no exclamation marks.
- **NO subagents, NO workflows.** Owner wants Opus 4.8 + ultracode working DIRECTLY (subagents felt slow).
  Use Read/Edit/Write/Bash/Playwright yourself.
- **Verify by rendering** (Playwright on :3000 + the served brandbook). Screenshots are saved to repo
  root by the MCP — delete them when done (`rm -f *.png *.jpeg .playwright-mcp -r`). Use small viewport
  (~960px) + jpeg to stay under the image API size cap.
- **Don't commit** unless the owner asks.
- **Skip (decided):** gradient-border button as a *product* variant (brand rule = buttons never
  gradient; it's showcase-only in the book). Circular progress as a live component only if a screen
  needs it — but the kit SHOWCASE should still display it to be 1:1 with the book.

---

## What's already done (don't redo)

- **Brandbook** (`.claude/docs/swiftwork-design-system/`): fat-complete, reskinned to ERP, render-verified.
  Files: `swiftwork-brand-book.html` (~184KB), `colors_and_type.css`, `README.md`, `fonts/` (Satoshi
  400/500/700), `assets/` (swiftwork logos + the full Untitled-UI `icons/` set). `.claude/` is GITIGNORED.
- **Kit alignment (B1–B5)** on `frontend-demo`, UNCOMMITTED (~35 files): Tailwind tokens (radius/shadow/
  gradient/gray-cool+neutral scales, `bg-gradient-jia`); shell (sidebar/topbar) matched to the book;
  primitives + patterns themed (badge variants+dot+pill, button sizes/recipes, input 40px+inset-halo+
  focus, card variants, checkbox/radio gradient-fill, dropdown destructive, table header, chart palette→
  peach, SuccessState/ProgressBar/PageSkeleton, StatCard/StatusBadge brand); screens (dashboard gradient
  stat + display heading, login, directory); `frontend-swiftwork` skill reference repointed to the book.
- **`/kit` showcase** (`src/app/(dev)/kit/page.tsx`): REWRITTEN to the brandbook layout (hero + 7 grouped
  sections w/ section-label/title/lead + `.comp-card` grid + right dot-rail). tsc clean. **Layout now
  matches; the COMPONENTS inside still need the 1:1 pass — that's the open task.**

## Key paths
- Brandbook: `.claude/docs/swiftwork-design-system/swiftwork-brand-book.html`
- Kit showcase: `src/app/(dev)/kit/page.tsx`  ·  Primitives: `src/shared/ui/primitives/*`  ·
  Patterns: `src/shared/ui/patterns/*`  ·  Charts: `src/shared/ui/charts/*`
- Tokens: `src/shared/styles/jia-tokens.css`  ·  Tailwind: `tailwind.config.ts`  ·  Global: `src/index.css`
- Plan + audits: `.claude/docs/plans/2026-06-18-kit-jia-alignment.md` (+ `kit-alignment-notes/`)
- Stack: Next.js 14 App Router, React 18, Tailwind v3, shadcn (new-york), Radix, TanStack Query, lucide.
  Login via fake Google auth → role switcher ("Viewing as ▾"); dashboard at `/`, showcase at `/kit`.

## History / why the prior attempts missed (avoid repeating)
1. First brandbook = thin hand-built token-doc → rejected ("nowhere near Jia"). Fix: CLONE the real
   brandbook HTML, don't hand-build.
2. Cloned `Brand Book (stable).html`; owner corrected → use FAT `Brand Book.html` (more complete
   components). Ported the fat-only components in.
3. Aligned components to tokens but `/kit` page was a cramped flat dump → rebuilt the page layout.
4. **Now:** components still aren't pixel-1:1 with the book → the open task above.

The lesson each time: **match the actual brandbook artifact exactly; "close to the tokens" is not enough.**
