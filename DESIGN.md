# Design

monday.com work-OS design language applied to the PopUp Bagels Growth CRM. Bright, white, color-coded.

## Theme

Light only. Scene: a growth teammate triaging outreach on a laptop in a bright office at 10am; the screen matches the room.

## Color

OKLCH-first, hex values below for reference. Strategy: **Full palette** — one primary accent plus a fixed vocabulary of saturated status colors used as solid fills.

### Chrome & neutrals (tinted toward the primary hue, never pure black/white)

- `--surface`: #ffffff (content canvas; effectively white with a whisper of blue: oklch(99.5% 0.002 275))
- `--surface-2`: #f6f7fb (left pane, toolbars, table header rows, page background)
- `--border`: #d0d4e4 (hairlines), #e6e9f2 (row dividers)
- `--text`: #323338 (monday's near-black)
- `--text-muted`: #676879
- `--text-faint`: #9699a6

### Primary accent

- `--primary`: #6161ff (buttons, active nav, selection, focus, links on hover)
- `--primary-hover`: #4b4bd6
- `--primary-tint`: #ecedfd (active nav background, selected rows)

### Status vocabulary (solid fills, white text, 4px radius — the monday label look)

- Not contacted: #797a7e (gray)
- Reached out: #579bfc (bright blue)
- Followed up: #a25ddc (purple)
- Booked / success: #00854d (monday's AA-safe dark green; #00c875 reserved for large fills)
- Declined / danger: #d83a52 (red; hover #b63546)
- Warning / medium: #cd7b2d (AA-safe orange; #fdab3d for large fills)

Viability: high = green, medium = orange, low = red (same tokens as above).

## Typography

- Family: **Figtree** (Google font, next/font), fallback system-ui stack. One family everywhere.
- Fixed rem scale, ratio ~1.2: 12 / 13 (body-dense) / 14 (body) / 16 / 20 / 24 (page title).
- Weights: 400 body, 500 UI labels/nav, 600 headings and primary buttons. No display font.

## Layout

- **Left sidebar, light**: #f6f7fb pane, 240px, dark text, rounded active item filled with `--primary-tint` and `--primary` text. SVG icons, 18-20px, 1.5px stroke.
- **Top bar**: white, 48-56px, product name left, user + sign out right, hairline bottom border.
- **Content**: white canvas, 24-32px padding. Tables run full width and dense (40px rows); hover row = #f6f7fb.
- Radii: 4px (buttons, pills, inputs), 8px (cards/panels, modals). Nothing pill-shaped except avatars and score dots.

## Components

- **Buttons**: primary = solid `--primary`, white text, 4px radius, 500 weight; secondary = white, 1px #d0d4e4 border; danger = #d83a52. States: hover darken, visible 2px focus ring (`--primary` at 40%), disabled 40% opacity.
- **Status pills**: solid status color, white text, 4px radius, px-2.5 py-0.5, 500 weight. Never outline-style, never pastel.
- **Inputs/selects**: white, 1px #d0d4e4 border, 4px radius, focus border `--primary` + ring.
- **Tables**: #f6f7fb sticky header row (12px, 500, `--text-muted`), 1px #e6e9f2 row dividers, no zebra.
- **Kanban**: column header = status-colored bar (full-width top strip on the column, not a side stripe) with white text and count; cards = white, 8px radius, 1px border, subtle shadow on drag.
- **Modals**: white, 8px radius, shadow-xl, 1px border; SVG close icon.
- **Icons**: inline SVG only (outline, 1.5px stroke, currentColor). Emojis are banned.

## Motion

150-200ms, ease-out. State feedback only (hover, open/close, drag). No page-load choreography. Respect prefers-reduced-motion.
