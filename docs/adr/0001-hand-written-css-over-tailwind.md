# 0001 — Hand-written CSS Modules instead of Tailwind

**Status:** accepted · **Date:** 2026-09-03

## Context

The design system needs to be consumed by both the Next.js app and Storybook. A
utility framework would mean sharing build configuration and content globs
between two toolchains that otherwise have nothing to do with each other.

## Decision

`packages/ui` ships plain CSS Modules layered on top of a design-token file of
CSS custom properties. No utility framework anywhere in the repo.

## Consequences

- The UI package has no build-tool dependency; anything that can import CSS can
  consume it.
- Component styles sit next to the component, so a reader can see the whole
  object in two files instead of decoding a long class string.
- Theming is free: every token is a custom property, so `data-theme` swaps the
  whole palette with no class churn and no flash on load.
- Fewer dependencies to install and keep current in CI.
- Trade-off: no utility escape hatch for one-off spacing, so layout-only classes
  live in `globals.css`. Accepted — the surface is small and it keeps the
  cascade predictable.
