# 0007. Frontend styling: Tailwind CSS + daisyUI

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md), [0006](0006-frontend-architecture-fsd.md)

## Context

Neither the brief nor any prior ADR specifies a styling approach — the frontend currently has only Vite's unused default boilerplate CSS. The UI has a handful of recognizable components (job form, job list, status badges, progress, per-URL table) that need to look reasonably presentable within a 3-day deadline, without over-investing in hand-rolled CSS or a heavy, opinionated React component library.

## Decision

Use **Tailwind CSS v4** (via the `@tailwindcss/vite` plugin — CSS-first config, no `tailwind.config.js` needed) plus **daisyUI v5** as a Tailwind plugin, which adds semantic component classes (`btn`, `card`, `badge`, `table`, `loading`, etc.) on top of Tailwind's utilities.

- `frontend/src/index.css` becomes the single entry point: `@import "tailwindcss";` + `@plugin "daisyui";`.
- Components (in `shared/ui/`, `entities/job/`, `widgets/`, `features/`) use Tailwind utility classes for layout/spacing and daisyUI classes for pre-styled elements (buttons, badges for job/URL status, cards for list items, table for the per-URL detail view) instead of custom CSS files per component.
- No CSS Modules, no styled-components/CSS-in-JS, no separate design tokens file — daisyUI's built-in theme system (CSS variables) is the theme layer.

## Consequences

- Fast to get a coherent, reasonably polished look (daisyUI's status-colored badges map directly onto `pending`/`success`/`error`/etc. without writing that styling by hand).
- Two new frontend dependencies (`tailwindcss`, `daisyui`) plus the Vite plugin; acceptable given the time saved versus hand-rolling equivalent CSS.
- Utility classes in JSX add some markup verbosity; accepted as a standard, well-understood trade-off for this ecosystem.
- No component-level CSS files needed in `shared/ui/`, keeping FSD slices ([ADR-0006](0006-frontend-architecture-fsd.md)) focused on structure/logic rather than styling boilerplate.

## Alternatives Considered

- **Plain hand-written CSS**: full control, but slower to reach a presentable result for status badges, tables, forms — no built-in component patterns.
- **A full React component library (MUI, Chakra, etc.)**: more polished defaults but heavier (larger dependency, its own theming system, React-specific component API to learn) for a small, single-page app; rejected as more than this feature needs.
