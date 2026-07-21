# 0008. Frontend i18n: custom context + dictionary, no library

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md), [tasks.md](../../specs/001-url-status-checker/tasks.md) (T054), [0006](0006-frontend-architecture-fsd.md)

## Context

The app needed an EN/RU UI language switcher, RU default. The full string inventory is small — around 30 distinct strings/templates across 5 components (form label, buttons, table headers, status labels, two count/progress templates) — and unlikely to grow, since this is a small, purpose-built tool rather than a product with an evolving UI surface.

## Decision

Roll a minimal custom solution instead of adding a library (`react-i18next`, `lingui`, etc.):

- `frontend/src/shared/i18n/translations.ts` — a plain `Record<Lang, Dictionary>` object (`Lang = 'en' | 'ru'`), string keys plus two template functions (`progressText`, `countsText`) for the two sentences that interpolate numbers.
- `frontend/src/shared/i18n/context.ts` — the React context + `useTranslation()` hook (pure, no JSX, so it doesn't trip the `react-refresh/only-export-components` lint rule).
- `frontend/src/shared/i18n/I18nProvider.tsx` — the provider component; holds `lang` state, persists it to `localStorage`, defaults to `'ru'` when nothing is stored.
- `frontend/src/shared/ui/LanguageSwitcher.tsx` — a two-button RU/EN toggle, placed in `JobsPage` next to the title.
- Status enum values (`pending`, `completed`, etc.) are translated too via a `status` sub-map, so switching language doesn't leave half the UI (the status badges) in English.

## Consequences

- Zero new dependencies — avoids exactly the kind of unjustified-dependency issue flagged in a prior review round for this branch.
- All strings live in one file (`translations.ts`), easy to audit for completeness; TypeScript's `Record<Lang, Dictionary>` means adding a key to one language without the other is a compile error, not a silent gap.
- No pluralization engine, no ICU message format, no lazy-loaded language bundles — none of that is needed at this string count; would need revisiting if the app's UI surface grew substantially or a third language were added.
- The provider must wrap the tree above every component that calls `useTranslation()` (done once, in `main.tsx`) — tests that render those components in isolation (e.g. `JobDetail.stale-switch.test.tsx`) must also wrap with `I18nProvider`.

## Alternatives Considered

- **`react-i18next`**: the standard choice for larger apps — pluralization, interpolation, namespaces, lazy loading. Rejected as more machinery than ~30 strings warrant, and it would have been the second new frontend dependency added without a clearly outgrown reason (daisyUI/Tailwind in [ADR-0007](0007-frontend-styling-tailwind-daisyui.md) were justified by a real gap; this wouldn't be).
- **Bare `Intl` APIs only**: `Intl` covers dates/numbers (already used for `toLocaleString()` on timestamps) but not arbitrary UI string translation — doesn't solve the actual problem.
