# TCM Foundation — Design System

Source of truth for tokens defined in `apps/web/src/app/globals.css`. Reference
this doc instead of re-deriving conventions per page.

## Color

Brand purple scale (`brand-50`…`brand-950`), derived from the exact color in
the client-supplied vector logo (`apps/web/public/brand/tcm-logo-purple.svg`):
`#83398a` at 500.

| Token | Hex | Typical use |
|---|---|---|
| `brand-50`/`100` | `#faf4fb` / `#f3e6f5` | Subtle tinted backgrounds |
| `brand-600` | `#94399d` | Primary button background |
| `brand-700` | `#782e7f` | Text-on-white links/accents (8.4:1) |
| `brand-900` | `#471b4b` | Strong accents |
| `brand-950` / `plum` | `#2e1231` | Footer + dark sections (16.8:1 with white text) |

Neutrals use Tailwind's built-in `stone` palette directly — no custom neutral
tokens, to avoid duplicating what Tailwind already provides well.

Semantic: `success` `#15803d`, `warning` `#a16207`, `error` `#b91c1c` — each
≥4.5:1 against white. Never the only signal for a state (always paired with
an icon or text label, not color alone).

## Typography

- **Display/heading font**: Fraunces (variable serif, `--font-display`) — editorial, premium, not ornate.
- **Body font**: Geist Sans (`--font-sans`) — already wired in `layout.tsx`.

| Role | Classes |
|---|---|
| Display | `font-display text-5xl md:text-7xl font-medium tracking-tight` |
| H1 | `font-display text-4xl md:text-5xl font-medium tracking-tight` |
| H2 | `font-display text-3xl md:text-4xl font-medium tracking-tight` |
| H3 | `font-display text-2xl md:text-3xl font-medium` |
| H4 | `font-display text-xl md:text-2xl font-medium` |
| Body Large | `font-sans text-lg leading-relaxed` |
| Body | `font-sans text-base leading-relaxed` |
| Small | `font-sans text-sm` |
| Caption | `font-sans text-xs uppercase tracking-wide text-stone-500` |

Use these combinations as-is; don't redefine per page.

## Spacing / Grid

Tailwind's default spacing scale. Content container: `mx-auto max-w-6xl
px-6` (already used in `SiteHeader`/`SiteFooter`) — reuse this, don't
introduce a second container convention.

## Motion

Every animation/transition must respect `prefers-reduced-motion` — enforced
globally in `globals.css`, no per-component opt-in needed. Keep motion
subtle: fades/slides on scroll-into-view, hover transitions, no large
animated elements.

## Icons

- **UI icons**: `lucide-react` — one consistent outline set (search, menu,
  chevrons, arrow, calendar, map-pin, phone, mail, user, heart, book, play,
  external-link). Never emoji as a UI icon.
- **Social brand icons**: `react-icons/fa6` (Font Awesome 6 Brands) —
  official recognizable marks (Facebook, Instagram, LinkedIn, YouTube, X,
  TikTok), not lucide's generic outlines. (Simple Icons' React package was
  tried first but doesn't ship a LinkedIn mark in the installed version —
  Font Awesome 6 has the full set in one consistent style, so it's the
  single source for every social icon rather than mixing two sets.)
