# Jia UI Kit

Single source for reusable UI. Import from the barrel:

    import { Button, DataTable, BarChart, FormField } from "@/shared/ui";

## Structure
- `primitives/` — shadcn components, themed to Jia via tokens (src/index.css).
- `patterns/` — composed reusables (DataTable, ConfirmDialog, EmptyState, StatusBadge, FormField, PageSection, StatCard, FilterBar).
- `charts/` — recharts wrappers on the Jia chart palette.

## See everything live
Run the app and open **/kit** — every component, all variants and states.

## Adding a component
- Primitive: `npx shadcn@latest add <name> -y` (lands in `primitives/`), then export it from `index.ts`.
- Never hardcode a color — defer to the Jia tokens. The `--gradient-jia` appears at most once per surface, never on buttons/borders. Sentence case. Satoshi only.
