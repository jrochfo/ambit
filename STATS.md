# Ambit: project stats

Snapshot taken 2026-10-09, when the project was finished and made public.

## Time
- Elapsed: ~46 hours (2026-10-07 12:46 → 2026-10-09 10:34, US Central)
- Active work: ~9.5 hours (stretches with no gap over 20 minutes)
- Commits landed across 17 distinct clock hours

## Conversation and compute
- Messages from Jake: ~125
- Model calls: ~820, all Claude Opus 5.5
- Tool uses: ~755 (≈600 shell commands, ≈130 file/screenshot reads, 12 doc fetches, 2 web searches)
- Tokens (≈ ¾ of a word each):
  - Output written: ~950,000
  - Cache reads: ~321 million (each step re-reads the conversation so far)
  - Cache writes: ~4.5 million
- One session, carried across several context compactions

## Code
- 97 commits at the time of the snapshot
- ~15,900 lines added, ~2,800 removed
- ~8,900 lines of TypeScript and CSS across `src/`, `worker/`, `shared/` and `tools/`; `styles.css` alone is 1,124 lines
- 19 components, 78 color/size/motion tokens per theme
- 84 tracked files

## Content
- 30 built-in categories, plus custom ones (any Google place type, or free text)
- 33 generated palettes in the color lab, WCAG-checked; 19 font candidates in the type lab
- 14 style guide sections; 4 dev pages (sandbox, style guide, type lab, color lab) that make no Google calls

## Decisions along the way
- Palette: teal → Citrus & ink → Gold & ink → Iris & ink → Gold & ink → Iris & ink, final. A theme-switch bug
  (map rings kept the previous theme's colors) muddied the early comparisons; once fixed, gold still didn't sit
  well on organic ring shapes, and violet did.
- Type: Young Serif wordmark, Hanken Grotesk UI
- Map rings: smoothed outlines and non-overlapping bands in the pill colors, display only
- No paid extras (hours and ratings, exact walking minutes)
- Launch: high quotas for two days, then lower; worst case about $64 for the week

## Shipped
ambit.zone: address search with walking rings for any times you choose, along real streets; the nearest spot in
each category sorted into the rings, with custom categories, picks and hidden spots; up to three saved addresses
side by side; light and dark themes with grain texture and a gently glowing logo; spot cards that open on tap
on phones; a friendly note when a daily quota runs out; a link preview card; accessibility at zero automated
issues apart from overlapping pins; cost guardrails (session caches, daily quotas, a per-visitor rate limit,
restricted keys, saved results that store only IDs and ring minutes).

## How these were measured
- Git: `git rev-list --count HEAD`, `git log --shortstat`
- Session log: `~/.claude/projects/-Users-jrochford/2f122048-82b2-4ad0-9268-572144f8275d.jsonl`
  (timestamps, per-call token usage, tool calls)
