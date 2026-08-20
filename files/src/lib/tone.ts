/**
 * The semantic tone vocabulary, shared by the design system and the formatters.
 *
 * This lives in lib/ rather than in components/ui.tsx for two reasons:
 *
 *   - ui.tsx carries 'use client'. A pure formatting utility should not have to
 *     import from a client component merely to name a colour.
 *   - It removes format.ts's dependency on the '@/' path alias entirely, so the
 *     module keeps compiling even if tsconfig paths are misconfigured again.
 *
 * Tone is deliberately semantic rather than literal — 'danger' rather than
 * 'red' — so a status keeps its meaning if the palette is ever restyled.
 */
export type Tone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'accent';
