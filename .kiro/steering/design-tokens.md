---
inclusion: always
---

# SubCrypt Graveyard Design Tokens

These tokens define the moonlit-graveyard look of SubCrypt. All styling must use them through the CSS custom properties below, defined once in `css/tokens.css`. Do not hard-code colors, font stacks, durations, or glows in component CSS.

## Rules

- Reference tokens as `var(--token-name)`. Add a new token here first if a value is missing.
- Text must meet 4.5:1 contrast against its background. The pairings in the contrast table are pre-checked; use them.
- Never convey state by color or motion alone. Pair every glow or animation with a text label.
- Every animation must sit inside `@media (prefers-reduced-motion: no-preference)`. Static states (zombie tilt, glow without pulse) may remain under reduced motion.
- Decorative layers (fog, moon, candles, ghosts) get `aria-hidden="true"` and `pointer-events: none`.
- Fonts are self-hosted from `assets/fonts/` (SIL OFL licensed). No external font or CDN requests.
- Copy is English. Brand names in demo data are fictional only: MoonMusic, CloudVault, StreamPeak, FitGhost.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-night` | `#0B0F1A` | Page background, deepest sky |
| `--color-sky-mid` | `#141B2E` | Mid-sky gradient stop |
| `--color-sky-horizon` | `#23304A` | Horizon gradient stop above the ground |
| `--color-panel` | `#161B28` | Dashboard, dialogs, banner background |
| `--color-ground` | `#0E1410` | Graveyard soil |
| `--color-moss` | `#2F4A34` | Grass tufts, ground highlights |
| `--color-stone` | `#2E333D` | Tombstone face |
| `--color-stone-edge` | `#454B57` | Tombstone bevel and border |
| `--color-stone-shadow` | `#14171D` | Tombstone drop shadow, engraved inset |
| `--color-bone` | `#ECE6D6` | Primary text |
| `--color-muted` | `#B5AF9E` | Secondary text (dates, labels, categories) |
| `--color-moon` | `#F4F1E1` | Moon disc, brightest highlights |
| `--color-moon-halo` | `rgba(244, 241, 225, 0.18)` | Moon halo |
| `--color-fog` | `rgba(200, 210, 225, 0.10)` | Fog layers |
| `--color-ecto` | `#7CFF9B` | Zombie glow, zombie badge text |
| `--color-ecto-glow` | `rgba(124, 255, 155, 0.45)` | Zombie glow shadow |
| `--color-ghost` | `rgba(230, 240, 255, 0.85)` | Ghost body |
| `--color-candle` | `#FFB347` | Candle flame, focus ring, primary accent |
| `--color-candle-glow` | `rgba(255, 179, 71, 0.35)` | Candle light halo |
| `--color-blood` | `#FF7A6B` | Haunting warning text and icons |
| `--color-blood-deep` | `#8B1E1E` | Danger button background (`Bury it`) |
| `--color-rip` | `#1B1F26` | RIP section background |

### Pre-checked contrast pairings (WCAG 2.x ratio)

| Foreground | Background | Ratio |
|---|---|---|
| `--color-bone` | `--color-night` | 15.4 |
| `--color-bone` | `--color-stone` | 10.2 |
| `--color-muted` | `--color-night` | 8.7 |
| `--color-muted` | `--color-stone` | 5.8 |
| `--color-ecto` | `--color-stone` | 10.0 |
| `--color-candle` | `--color-stone` | 7.1 |
| `--color-blood` | `--color-stone` | 5.0 |
| `--color-blood` | `--color-night` | 7.5 |
| `--color-bone` | `--color-blood-deep` | 7.3 |
| `--color-night` | `--color-candle` | 10.7 |

Check any new pairing before use.

## Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | `"Creepster", "Georgia", serif` | App title and section headings only |
| `--font-engraved` | `"IM Fell English", "Georgia", "Times New Roman", serif` | Tombstone names, epitaphs |
| `--font-body` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Body copy, forms, buttons, numbers |
| `--numeric-money` | `tabular-nums` | Value for `font-variant-numeric` on all money figures |
| `--text-xs` | `0.75rem` | Badges, fine print |
| `--text-sm` | `0.875rem` | Labels, dates |
| `--text-md` | `1rem` | Body |
| `--text-lg` | `1.25rem` | Tombstone name |
| `--text-xl` | `1.75rem` | Dashboard figures |
| `--text-display` | `clamp(2.25rem, 6vw, 4rem)` | App title |
| `--leading-tight` | `1.15` | Headings |
| `--leading-body` | `1.5` | Body |
| `--tracking-engraved` | `0.04em` | Engraved text |

Never use the display font below `--text-lg` or for body copy; it is hard to read at small sizes.

## Spacing, size, and shape

| Token | Value |
|---|---|
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-6` | `1.5rem` |
| `--space-8` | `2rem` |
| `--space-12` | `3rem` |
| `--tomb-width` | `clamp(11rem, 28vw, 14rem)` |
| `--tomb-min-height` | `15rem` |
| `--radius-tomb-top` | `50% 50% 0.5rem 0.5rem / 38% 38% 0.5rem 0.5rem` |
| `--radius-sm` | `0.375rem` |
| `--radius-md` | `0.75rem` |
| `--border-tomb` | `2px solid var(--color-stone-edge)` |
| `--tap-target` | `2.75rem` (minimum height and width for controls) |

## Light, shadow, and glow

| Token | Value | Use |
|---|---|---|
| `--shadow-tomb` | `0 0.75rem 1.5rem var(--color-stone-shadow)` | Tombstone resting on ground |
| `--shadow-engrave` | `inset 0 1px 0 rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)` | Engraved text effect |
| `--glow-zombie` | `0 0 1.25rem 0.25rem var(--color-ecto-glow)` | Zombie tombstone |
| `--glow-candle` | `0 0 1rem 0.35rem var(--color-candle-glow)` | Candle flame |
| `--glow-moon` | `0 0 4rem 1.5rem var(--color-moon-halo)` | Moon |
| `--focus-ring` | `0 0 0 3px var(--color-night), 0 0 0 5px var(--color-candle)` | Focus-visible on all controls |

## Motion

| Token | Value | Use |
|---|---|---|
| `--ease-haunt` | `cubic-bezier(0.45, 0, 0.55, 1)` | Ghost float, fog |
| `--ease-sink` | `cubic-bezier(0.55, 0, 1, 0.45)` | Burial sinking |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | UI transitions, upright recovery |
| `--motion-fast` | `150ms` | Hover, focus |
| `--motion-base` | `300ms` | Dialog open, banner in |
| `--motion-upright` | `600ms` | Zombie → upright |
| `--motion-sink` | `1400ms` | Tombstone sinking into ground |
| `--motion-ghost-float` | `4s` | Ghost bob loop |
| `--motion-candle-flicker` | `2.2s` | Candle flicker loop (use stepped, irregular keyframes) |
| `--motion-fog-slow` | `60s` | Back fog layer drift |
| `--motion-fog-fast` | `38s` | Front fog layer drift |
| `--zombie-tilt` | `-7deg` | Zombie tombstone rotation (transform-origin: bottom center) |
| `--ghost-float-distance` | `0.75rem` | Ghost bob amplitude |

Sinking animation: translate down by 110% of tombstone height while fading to opacity 0, clipped by the ground line so the stone looks swallowed by the soil.

## Layers (z-index)

| Token | Value |
|---|---|
| `--z-sky` | `0` |
| `--z-moon` | `1` |
| `--z-fog-back` | `2` |
| `--z-ground` | `3` |
| `--z-tombs` | `4` |
| `--z-fog-front` | `5` |
| `--z-ghosts` | `6` |
| `--z-banner` | `20` |
| `--z-dialog` | `30` |

The front fog layer sits above tombstones but must stay at or below 0.10 opacity so text remains readable.

## Breakpoints

| Name | Query | Layout |
|---|---|---|
| Mobile | `max-width: 639px` | Single-column tombstones, dashboard 2×2 |
| Tablet | `640px–1023px` | 2–3 tombstone columns |
| Desktop | `min-width: 1024px` | Auto-fill grid, dashboard in one row |

## State mapping

| State | Visual tokens | Required text |
|---|---|---|
| Healthy | `--shadow-tomb` | Price, cycle, renewal date |
| Zombie | `--zombie-tilt`, `--glow-zombie`, side ghost | `Zombie — burning $X/month` in `--color-ecto` |
| Haunting | Ghost above tomb, `--color-blood` label | `Renews today` / `Renews tomorrow` / `Renews in N days` |
| Zombie + Haunting | Both treatments | Both labels |
| Buried | `--color-rip` background, `--font-engraved` epitaph | `RIP {name} — saved $X/year` |
