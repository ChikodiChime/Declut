# Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the admin dashboard to full visual and structural parity with the user dashboard by parameterizing the shared `Sidebar` component and adding `TopBar` to the admin layout.

**Architecture:** Parameterize `components/dashboard/Sidebar.tsx` with `navItems`, `logoHref`, and `sectionLabel` props (all with defaults so the user dashboard is unaffected). Replace `AdminSidebar` with a thin wrapper that passes admin-specific values. Update the admin layout to add `TopBar` and match the user layout structure.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Framer Motion, Lucide React

---

## File Map

| File | Action | What changes |
|---|---|---|
| `components/dashboard/Sidebar.tsx` | Modify | Add `navItems`, `logoHref`, `sectionLabel` props; update `isActive`; thread props through inner components |
| `components/admin/AdminSidebar.tsx` | Modify | Replace with thin wrapper around `Sidebar` |
| `app/admin/layout.tsx` | Modify | Add `"use client"`, add `<TopBar />`, change `bg-card` → `bg-background` |

---

## Task 1: Parameterize `Sidebar`

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add `SidebarProps` interface and update `isActive`**

In `components/dashboard/Sidebar.tsx`, add the interface after the existing `NavItem` interface and update `isActive`:

```tsx
interface SidebarProps {
  navItems?: NavItem[];
  logoHref?: string;
  sectionLabel?: string;
}

function isActive(pathname: string, href: string, logoHref: string) {
  return href === "/" || href === logoHref
    ? pathname === href
    : pathname.startsWith(href);
}
```

Replace the existing `isActive` function (lines 50–53):
```tsx
// REMOVE this:
function isActive(pathname: string, href: string) {
  return href === "/" || href === "/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}
```

- [ ] **Step 2: Update `DesktopNavItems` to accept `navItems` and `logoHref`**

Replace the `DesktopNavItems` function signature and its internal usage:

```tsx
function DesktopNavItems({
  pathname,
  navItems,
  logoHref,
}: {
  pathname: string;
  navItems: NavItem[];
  logoHref: string;
}) {
  const { mutate: signOut } = useSignOut();

  return (
    <>
      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, logoHref);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/30 cursor-not-allowed select-none"
              >
                <Icon size={18} strokeWidth={1.75} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="group block">
              <div
                className={[
                  "relative flex items-center gap-3 px-3 py-2.5 transition-colors duration-150",
                  active ? "text-primary" : "text-white",
                ].join(" ")}
              >
                {!active && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-l-lg bg-white/0 group-hover:bg-white/10 transition-colors duration-150"
                    style={{ right: -12 }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-y-0 left-0 bg-white rounded-l-lg"
                    style={{ right: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                {active && (
                  <motion.span
                    layoutId="sidebar-accent"
                    className="absolute top-2 bottom-2 w-[3px] bg-white rounded-r-full"
                    style={{ left: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={18} strokeWidth={active ? 2 : 1.75} className="relative z-10 shrink-0" />
                <span className="relative z-10 text-sm font-medium flex-1">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 px-3 pb-5 shrink-0">
        <div className="h-px bg-white/10 mb-3" />
        <button
          onClick={() => signOut()}
          className="group relative flex items-center gap-3 w-full px-3 py-2.5 text-red-300 hover:text-red-200 transition-colors duration-150"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-l-lg bg-red-500/0 group-hover:bg-red-500/20 transition-colors duration-150"
            style={{ right: -12 }}
          />
          <LogOut size={17} strokeWidth={1.75} className="relative z-10" />
          <span className="relative z-10 text-sm font-medium">Sign out</span>
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Update `MobileDrawerNavItems` to accept `navItems` and `logoHref`**

Replace the `MobileDrawerNavItems` function:

```tsx
function MobileDrawerNavItems({
  pathname,
  onNavigate,
  navItems,
  logoHref,
}: {
  pathname: string;
  onNavigate: () => void;
  navItems: NavItem[];
  logoHref: string;
}) {
  return (
    <div className="flex-1 flex flex-col px-3 py-3 gap-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href, logoHref);

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/30 cursor-not-allowed select-none"
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                  {item.badge}
                </span>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              active
                ? "bg-white/15 text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.75} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Update the `Sidebar` export to accept props and thread them through**

Replace the `export function Sidebar()` function:

```tsx
export function Sidebar({
  navItems = NAV_ITEMS,
  logoHref = "/dashboard",
  sectionLabel,
}: SidebarProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRID_PATTERN, backgroundSize: "36px 36px" }}
        />
        <div className="relative z-10 px-6 py-5 shrink-0">
          <Link href={logoHref}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.svg" alt="declut" className="h-7" />
          </Link>
        </div>
        {sectionLabel && (
          <div className="relative z-10 px-6 pb-3 shrink-0">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
              {sectionLabel}
            </span>
          </div>
        )}
        <DesktopNavItems pathname={pathname} navItems={navItems} logoHref={logoHref} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center gap-1 px-4 py-3 bg-primary shrink-0">
        <Link href={logoHref} className="mr-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors"
            style={{ width: 36, height: 36, borderRadius: 10 }}
          >
            <Search size={17} strokeWidth={1.75} />
          </button>
          <NotificationBell triggerClassName="text-white/80 hover:text-white hover:bg-white/15" />
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="p-2 rounded-lg text-white/80 hover:bg-white/15 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <PanelIcon size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-primary z-50 flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-light.svg" alt="declut" className="h-7" />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg text-white/60 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav links */}
              <MobileDrawerNavItems
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                navItems={navItems}
                logoHref={logoHref}
              />

              {/* Profile section */}
              <DrawerProfile onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no errors. Fix any TypeScript/ESLint issues before continuing.

- [ ] **Step 6: Verify user dashboard is unaffected**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Confirm:
- Sidebar looks identical to before (grid pattern, spring animations, mobile drawer)
- Active link highlight animates correctly between pages
- Mobile hamburger opens the drawer with profile section at the bottom

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/Sidebar.tsx
git commit -m "refactor: parameterize Sidebar with navItems, logoHref, sectionLabel props"
```

---

## Task 2: Replace `AdminSidebar` with thin wrapper

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `components/admin/AdminSidebar.tsx` with:

```tsx
'use client'

import { LayoutDashboard, Users, Package, ShoppingBag, Truck, Heart } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'

const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',        icon: Users },
  { href: '/admin/listings',  label: 'Listings',     icon: Package },
  { href: '/admin/orders',    label: 'Orders',       icon: ShoppingBag },
  { href: '/admin/dispatchers', label: 'Dispatchers', icon: Truck },
  { href: '/admin/charities', label: 'Charities',    icon: Heart },
]

export function AdminSidebar() {
  return (
    <Sidebar
      navItems={ADMIN_NAV_ITEMS}
      logoHref="/admin/dashboard"
      sectionLabel="Admin"
    />
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "refactor: replace AdminSidebar with thin Sidebar wrapper"
```

---

## Task 3: Update admin layout to match user dashboard

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/layout.tsx` with:

```tsx
"use client";

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { TopBar } from '@/components/dashboard/TopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Visual verification**

With the dev server running (`npm run dev`), navigate to `http://localhost:3000/admin/dashboard` and confirm:

- Sidebar uses grid pattern background (not decorative circles)
- Sidebar is flat (no `rounded-r-4xl`)
- Active nav item uses white background + spring animation, not gradient highlight
- "Admin" label appears below the logo in the sidebar
- TopBar is visible: search bar, ⌘K shortcut opens `SearchModal`, notification bell, avatar menu with dropdown
- Mobile: hamburger menu in top bar opens slide-in drawer with all 6 admin links and profile section at the bottom
- Background is `bg-background` (not `bg-card`) — same neutral as user dashboard

- [ ] **Step 4: Verify user dashboard still matches**

Navigate to `http://localhost:3000/dashboard` and confirm no visual regressions — sidebar, topbar, and mobile drawer all look identical to before.

- [ ] **Step 5: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: redesign admin layout to match user dashboard"
```
