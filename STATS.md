# Ambit: project stats

Snapshot taken 2026-10-08, when the project was wrapped up.

## Time
- Elapsed: ~31 hours (2026-10-07 12:46 → 2026-10-08 20:03, US Central)
- Active work: ~9 hours (stretches with no gap over 20 minutes)
- Commits landed across 16 distinct clock hours

## Conversation and compute
- Messages from Jake: ~115
- Model calls: ~760, all Claude Opus 5.5
- Tool uses: ~695 (≈550 shell commands, ≈120 file/screenshot reads, 12 doc fetches, 2 web searches)
- Tokens (≈ ¾ of a word each):
  - Output written: ~890,000
  - Cache reads: ~296 million (each step re-reads the conversation so far)
  - Cache writes: ~3.8 million
- One session, carried across several context compactions

## Code
- 86 commits at the time of the snapshot
- ~15,400 lines added, ~2,600 removed
- ~8,800 lines of TypeScript and CSS across `src/`, `worker/` and `shared/`; `styles.css` alone is 1,121 lines
- 19 components, 78 color/size/motion tokens per theme
- 78 tracked files

## Content
- 30 built-in categories, plus custom ones (any Google place type, or free text)
- 33 generated palettes in the color lab, WCAG-checked; 19 font candidates in the type lab
- 14 style guide sections; 4 dev pages (sandbox, style guide, type lab, color lab) that make no Google calls

## Decisions along the way
- Palette: teal → Citrus & ink → Gold & ink → Iris & ink → Gold & ink. A theme-switch bug drew map rings in the
  previous theme's colors, which made gold look muddy; with it fixed, gold stayed.
- Type: Young Serif wordmark, Hanken Grotesk UI
- Map rings: smoothed outlines and non-overlapping bands in the pill colors, display only
- No paid extras (hours and ratings, exact walking minutes)

## Shipped
ambit.zone: address search with walking rings for any times you choose, along real streets; the nearest spot in
each category sorted into the rings, with custom categories, picks and hidden spots; up to three saved addresses
side by side; light and dark themes with grain texture and a gently glowing logo; spot cards that open on tap
on phones; accessibility at zero automated issues apart from overlapping pins; cost guardrails (session caches,
quotas, saved results that store only IDs and ring minutes).

## How these were measured
- Git: `git rev-list --count HEAD`, `git log --shortstat`
- Session log: `~/.claude/projects/-Users-jrochford/2f122048-82b2-4ad0-9268-572144f8275d.jsonl`
  (timestamps, per-call token usage, tool calls)
