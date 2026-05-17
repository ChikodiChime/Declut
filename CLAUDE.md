# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Stack Versions (non-standard — read docs before assuming behavior)

| Package | Version | Notes |
|---|---|---|
| Next.js | 16.2.1 | Breaking changes from prior versions — see AGENTS.md. Middleware renamed to **Proxy** (`proxy.ts` at project root, not `middleware.ts`) |
| React | 19.2.4 | |
| Tailwind CSS | 4.x | CSS-first config; no `tailwind.config.js` — theme defined in `globals.css` via `@theme` |
| ESLint | 9.x | Flat config format (`eslint.config.mjs`), not `.eslintrc` |

## Project Structure

- `app/` — App Router root (no `src/` prefix)
  - `layout.tsx` — Root layout; defines Geist font CSS vars and HTML shell
  - `page.tsx` — Home route (`/`)
  - `globals.css` — Global styles; Tailwind 4 imported via `@import "tailwindcss"`, theme tokens via `@theme inline`
- `public/` — Static assets served at `/`
- `next.config.ts` — Next.js config (TypeScript)
- `tsconfig.json` — Path alias: `@/*` → project root

## Key Conventions

- **Path alias**: Use `@/` to import from the project root (e.g., `@/app/components/Foo`).
- **Tailwind 4**: Customize design tokens in `globals.css` under `@theme inline { ... }`, not in a JS config file.
- **ESLint flat config**: Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`; add rules in `eslint.config.mjs`.
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`; available as CSS vars `--font-geist-sans` / `--font-geist-mono`.
- **Dark mode**: Via `prefers-color-scheme` media query in `globals.css` (not Tailwind's `darkMode` config).
- **Proxy (Middleware)**: Next.js 16 renamed Middleware to Proxy. Use `proxy.ts` at the project root — not `middleware.ts`. Export a named `proxy` function and `config` with `matcher`. See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **Next.js docs**: Before writing any Next.js-specific code, consult `node_modules/next/dist/docs/` for this version's actual APIs.
