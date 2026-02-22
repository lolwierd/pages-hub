# Design — pages-hub

## The Concept

**"The Dispatch Board."** A dense, industrial grid where each project has its own color identity. Not a terminal cosplay. Not an editorial broadsheet. A board you scan in two seconds and know exactly what's where. The energy is closer to a split-flap departure board than a SaaS dashboard.

## The Hook

**Hash-derived color bars.** Each tile gets a 3px top border whose hue is deterministically generated from the project name. `seedhe-maut-showcase-amp` is always the same warm orange. `rig-architecture` is always the same teal. Your brain starts recognizing projects by color before reading the name. It's data visualization disguised as decoration — every colored edge means something (this is *that* project), and no two look the same.

## Typography

- **Barlow Condensed** (600/700) — the workhorse. Condensed type is industrial, space-efficient, and has a visual density that feels decisive rather than decorative. The uppercase project names in condensed bold pack a lot of identity into small tiles. It's not a font you see on every dev tool (those all reach for Inter or JetBrains Mono). Condensed sans says "dispatch board," not "settings page."
- **DM Mono** — timestamps, URLs, metadata. A softer monospace than the typical choices. Pairs well with Barlow's geometry without fighting for attention. Used only where fixed-width is genuinely useful (aligned data), not as an aesthetic crutch.

## Color

Two complete palettes — light and dark — both driven by system `prefers-color-scheme`.

**Light:** Warm stone background (`#FAFAF9`), white tiles, warm gray borders. The tile colors are `hsl(hash, 55%, 55%)` — saturated enough to be distinctive, light enough to not overwhelm.

**Dark:** Near-black (`#111110`), raised dark tiles (`#1A1918`). The tile colors shift to `hsl(hash, 50%, 45%)` — slightly desaturated and darker, so they glow against the dark surface without screaming.

**Accent:** `#E05A33` light / `#F06840` dark — a burnt orange that's warm and assertive. Used only for: pins, hover states, focus rings, selection. One color, one meaning: "you're interacting with this."

**Temporal green:** Fresh deploys get `#2D7A3A` (light) / `#5DBF6A` (dark). Old ones fade to gray. No labels needed — color IS the label.

## Layout

A responsive auto-fill grid (`minmax(220px, 1fr)`). Not a fixed 3-column grid — it adapts to the viewport and fills space efficiently. On a wide screen you get 4-5 columns. On mobile, 2. The 10px gap keeps tiles tight — this is a board, not a gallery.

Each tile is compact: name (bold condensed), URL (tiny mono), and a footer with deploy time. The color bar at top gives identity. The pin button hides until hover. Everything earns its space.

Pinned projects group at the top with a quiet "Pinned" label. The section divider is just text, not a visual wall.

## What Was Rejected

**v1 "Flight Deck"** — Dark mode, neon green, grid overlay, "CONTROL PLANE" in monospace. The exact design every DevOps tool uses. Generic developer aesthetic with no connection to what this specific tool is.

**v2 "The Register"** — Warm parchment, Instrument Serif, dot leaders. Typographically interesting but too precious and editorial for a tool you glance at for 3 seconds. The single-column list also wastes horizontal space when you have 15+ short-named projects.

**Full brutalist approach** — Considered: no borders, no shadows, raw HTML energy. Rejected because it would make scanning harder. This tool needs to be glanceable above all else, and some visual separation between tiles genuinely helps.

## Tone

It should feel like: a well-organized wall of post-its in a studio, or the departures board at a train station. Dense but clear. Functional but not soulless. The condensed type and tight grid give it energy. The color bars give it personality. The hover animations (subtle lift + shadow) give it responsiveness without being flashy.

The small details: tiles animate in with a staggered 25ms delay (cards being dealt), shadows deepen on hover, the search input gets an accent border on focus. The pin is just a circle — filled when on, stroked when off. No icons library needed for a circle.

There's a quiet satisfaction in watching your pinned projects float to the top, each with its own color, like a hand you've been dealt.
