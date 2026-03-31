# Branding & UI Polish Design

**Date:** 2026-03-31
**Status:** Approved
**Feature:** Logo, icon, design tokens, and page/component polish

---

## Overview

Create a logo and icon for the **declut** brand, establish a design token system in `globals.css`, and apply consistent polished styling across all existing pages and components. The brand personality is vibrant and energetic — Nigerian market energy with a clean, modern execution.

---

## 1. Logo & Icon

### Visual Concept

**Icon:** A price tag shape (rounded rectangle with a notch/circle at top-left and a diagonal cut at the bottom-right corner) in indigo `#4F46E5`, with a four-pointed amber spark `#F59E0B` in the bottom-right corner. The spark symbolises marketplace energy and discovery.

**Wordmark:** `declut` — all lowercase, bold weight. Letters `decl` in slate-900 (`#0F172A`), letters `ut` in indigo `#4F46E5`. Clean, punchy, memorable.

**Full logo:** Icon on the left, wordmark on the right, vertically centred. SVG at any scale.

**Standalone icon:** Just the tag + spark, works at 16×16 (favicon) up to 512×512 (app icon).

### Files

| File | Purpose |
|------|---------|
| `public/logo.svg` | Full horizontal logo (icon + wordmark) |
| `public/icon.svg` | Icon only (tag + spark) |
| `public/favicon.svg` | Favicon (SVG format, same as icon) |

### Usage

- `app/layout.tsx` — metadata: `title: "declut"`, `description`, `icons` config pointing to `/favicon.svg`
- Top of every auth page card and the home page
- Email template header (replaces plain "Declutter" text with the SVG logo inline or an img tag)

---

## 2. Design Tokens (`app/globals.css`)

All tokens defined in the `@theme inline` block. Components and pages reference these via Tailwind utility classes (`bg-surface`, `text-muted`, `shadow-card`, etc.) or CSS variables directly.

### Colors

```css
--color-primary:       #4F46E5;   /* indigo — buttons, links, focus rings */
--color-primary-hover: #4338CA;
--color-accent:        #F59E0B;   /* amber — secondary CTAs, sparks, highlights */
--color-accent-hover:  #D97706;
--color-surface:       #F8FAFF;   /* page background — light indigo tint */
--color-card:          #FFFFFF;   /* card/form backgrounds */
--color-text:          #0F172A;   /* primary text — slate-900 */
--color-text-muted:    #64748B;   /* secondary text */
--color-border:        #E2E8F0;   /* input and card borders */
--color-error:         #EF4444;   /* error states */
--color-error-bg:      #FEF2F2;   /* error message backgrounds */
```

### Shape

```css
--radius-sm:  8px;
--radius-md:  12px;
--radius-lg:  16px;
--radius-xl:  24px;
```

### Shadows (indigo-tinted for brand feel)

```css
--shadow-card:     0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(79,70,229,0.06);
--shadow-elevated: 0 4px 6px rgba(0,0,0,0.07), 0 10px 32px rgba(79,70,229,0.12);
```

### Typography

Keep Geist Sans as the primary font (already configured). Add a base `font-feature-settings` for clean rendering.

---

## 3. Component Polish

### Button (`components/ui/Button.tsx`)

- `primary` variant: indigo background, white text, `--radius-md`, hover darkens to `--color-primary-hover`
- `accent` variant (new): amber background, white text — used for the home page "Create Account" CTA
- `outline` variant: white background, `--color-border` border, `--color-text`, hover fills to gray-50
- All variants: `--radius-md`, consistent padding, loading spinner inherits variant colour
- Focus ring: 2px offset indigo ring on all variants

### Input (`components/ui/Input.tsx`)

- Border: `--color-border`, `--radius-md`
- Focus: indigo ring (`ring-2 ring-primary/20 border-primary`)
- Error state: red border + red ring, error message in `--color-error`
- Label: `--color-text`, `font-medium`, `text-sm`
- Helper text: `--color-text-muted`

### CustomDropdown (`components/ui/CustomDropdown.tsx`)

- Match Input styling exactly: same border, radius, focus ring
- Selected option: indigo text + indigo left border accent
- Hover row: `bg-indigo-50`

---

## 4. Page Styling

### Home (`app/page.tsx`)

- Full-screen `bg-surface` background
- Two large decorative circles (CSS `::before`/`::after` or divs): one indigo `opacity-10` top-right, one amber `opacity-10` bottom-left — purely visual, no layout impact
- Centred content: logo (full horizontal), tagline below, two full-width buttons
- **Tagline:** *"Nigeria's marketplace for things that deserve a second home"*
- **Sign In** button: `primary` variant
- **Create Account** button: `accent` variant (amber)

### Auth card wrapper (shared pattern for login, signup, verify-email)

All three pages share this layout:
- `min-h-screen bg-surface flex items-center justify-center`
- White card: `bg-card rounded-xl shadow-card px-8 py-10 w-full max-w-md`
- Logo (full horizontal) centred at top of card
- Form content below with consistent `space-y-6`

### Login (`app/auth/login/page.tsx`)

- Auth card wrapper
- Logo at top
- `LoginForm` as-is (component polish handles the internals)

### Signup (`app/auth/signup/page.tsx`)

- Auth card wrapper
- Logo at top
- `SignupForm` as-is

### Verify Email (`app/verify-email/page.tsx`)

- Auth card wrapper
- Logo at top
- OTP digit boxes: `h-14 w-11`, `--radius-md`, indigo focus ring, slightly larger font
- Countdown and resend button already implemented — just ensure spacing matches card

---

## 5. Email Template (`lib/email.ts`)

Replace the plain "Declutter" text header with an inline SVG version of the full logo embedded directly in the HTML email. Since email clients block external SVG references, the logo SVG content is inlined as an `<img>` with a base64 data URI, or reproduced as HTML/CSS text treatment matching the brand.

**Practical approach for email:** Reproduce the logo as styled HTML since email clients block external SVG references and inline SVG rendering is inconsistent. The indigo header bar stays; update the text to `decl<span style="color:#A5B4FC">ut</span>` — a lighter indigo (`#A5B4FC`) so `ut` reads distinctly against the dark indigo header background, matching the two-tone wordmark concept.

---

## 6. Metadata (`app/layout.tsx`)

```ts
export const metadata: Metadata = {
  title: 'declut',
  description: "Nigeria's marketplace for things that deserve a second home",
  icons: { icon: '/favicon.svg' },
}
```

---

## 7. Out of Scope

- Dark mode redesign (existing dark mode media query stays but is not actively designed for)
- New pages beyond the existing 4
- Animation or motion design
- Mobile-specific breakpoint overhauls (responsive already works via Tailwind)
