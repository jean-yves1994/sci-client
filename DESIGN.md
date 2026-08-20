# Design notes

The web application has been restyled after the **Flup admin dashboard**
(Phenomenon Studio). What follows is what was taken, what was deliberately not,
and where the tokens live.

## What was adopted

| Reference characteristic | Implementation |
|---|---|
| Soft off-white canvas, white cards floating on it | `canvas: #F6F7F9`; cards are white with `shadow-card` |
| **No card borders** — separation by shadow | Cards carry a diffuse two-layer shadow instead of a 1px rule |
| Large corner radii | 22px cards, 18px controls, 28px modals, fully-round buttons |
| Pastel status chips with saturated text | `chip.*` token pairs (background + ink) |
| Tinted icon tile above a large figure | The `<Metric>` component |
| Sidebar sitting on the canvas, active item as a raised white pill | `(app)/layout.tsx` |
| Generous row height, no vertical rules in tables | Hairline top-border per cell, row hover tint |
| Tight heading tracking | `tracking-tightest` (-0.03em) on headings and figures |

## What was deliberately not adopted

The reference is a furniture retailer: warm, playful, with product photography
carrying much of the visual weight. This is a bank's collateral system, so:

- **The hue stays institutional blue.** The shapes and spacing do the
  modernising; the palette does not need to. A lending decision is not a
  furniture purchase.
- **Colour still means something.** Semantic colours are reserved for status —
  amber for waiting, green for settled, violet for correction, red for refused.
  Nothing is tinted for decoration alone.
- **No large imagery.** The reference leans on product photos; the equivalent
  here is inspection evidence, which appears in the photo grid on the detail
  page where it does real work.

## Where the tokens live

`web/tailwind.config.ts` holds every colour, radius and shadow. Changing the
accent is a single edit to `brand`; the chips derive independently so status
colour does not shift with branding.

`web/src/components/ui.tsx` holds the primitives — `Button`, `Card`, `Chip`,
`StatusChip`, `Metric`, `Table`, `Modal`, `Segmented`, `Avatar` and the loading
skeletons. Pages compose these rather than restyling locally, so a change to a
primitive propagates everywhere.

`web/src/components/icons.tsx` holds a small inline icon set at a consistent
1.8 stroke weight. Kept local rather than pulling an icon package: a dozen
glyphs do not justify the dependency, and this way the stroke weight matches the
typography.

## Interaction details worth noting

- **Skeletons, not spinners**, for tables and cards. They preserve the page's
  shape so content does not jump when it arrives.
- **Search is debounced at 300ms** and executed server-side. Filtering thousands
  of records in the browser would be slow and would hand the client data it
  should not hold.
- **Any filter change resets to page 1.** Staying on page 7 of a new result set
  shows an empty table and reads as a bug.
- **Deterministic avatar tints.** The colour is derived from a hash of the
  user's id or email, so the same person keeps the same colour across screens.
- **Overdue dates turn red** only while an inspection is still open — an
  approved inspection is not late.
- **Decision buttons are hidden when the server would refuse anyway** (for
  example, an inspector viewing their own submission). The rule is enforced
  server-side regardless; hiding it avoids inviting a doomed click.

## Preview

`preview/dashboard-preview.html` opens in any browser with no install and shows
the dashboard rendered with these exact tokens. Figures in it are illustrative;
the running application computes every number from the database.
