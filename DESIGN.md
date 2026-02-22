# Design: The Flight Deck

## The Concept
**"A pilot's pre-flight checklist."**
This is not a marketing gallery; it is a piece of infrastructure. It should feel like a dedicated hardware panel used to monitor systems. It rejects the "soft SaaS" aesthetic (white space, soft shadows, rounded sans-serifs) in favor of **precision, density, and contrast**.

## The Hook
**The "Signal Status" Indicators.**
Instead of generic "active" badges, deployment statuses should look like LEDs or physical indicators on a panel. The entire UI should feel "lit from within" on a dark substrate.

## Typography Rationale
**Typeface:** `JetBrains Mono` (Google Fonts).
**Why:** This is a tool for developers. The content *is* metadata—URLs, dates, commit hashes. Monospace is the native tongue of this data. Using a variable-width font would dress it up as "content"; using monospace respects it as "data."

## Color Rationale
**Palette:** "Void & Phosphor".
- **Backgrounds:** `#09090b` (zinc-950) -> `#18181b` (zinc-900). Deep, matte darks.
- **Borders:** `#27272a` (zinc-800). Structural, defining edges clearly.
- **Accents:**
    - **Primary:** White (`#fafafa`). Maximum legibility for names.
    - **Signal Green:** `#10b981`. Pure status indication.
    - **Dim Grey:** `#71717a`. For metadata that should recede until needed.

## Layout & Structure
- **Grid:** Strict, rhythmic grid.
- **Density:** High. We don't need 40px of padding. We need to see the latest deployment hash, the date, and the URL at a glance.
- **Cards:** They aren't "cards" floating on a surface; they are **modules** slotted into a rack. Flat, bordered, grounded.

## Rejected Ideas
- **Glassmorphism/Blur:** Rejected because it feels decorative and "drifty." A tool should feel solid and precise, not ethereal.
- **Cloudflare Orange Theme:** Rejected. While this runs on Cloudflare, branding it heavily orange makes it feel like a corporate portal. It should feel like *my* personal cockpit, not their billboard.

## Tone & Texture
- **Texture:** Matte, industrial, slightly cold but efficient.
- **Mood:** "Systems Normal." Quiet confidence.
