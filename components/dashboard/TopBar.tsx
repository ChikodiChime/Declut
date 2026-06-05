"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import {
  Search,
  Bell,
  User,
  LogOut,
  ShoppingBag,
  Tag,
  Banknote,
  BellOff,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/lib/hooks/useNotifications";
import { SearchModal } from "@/components/dashboard/SearchModal";

const DROPDOWN_ANIM = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -6 },
  transition: { duration: 0.15, ease: "easeOut" as const },
};

// Radius shared by all three trigger buttons
const TRIGGER_RADIUS = 10;

type NotifType = "order_update" | "claim_request" | "payout_update";

const NOTIF_META: Record<
  NotifType,
  { Icon: React.ElementType; bg: string; iconColor: string }
> = {
  order_update: {
    Icon: ShoppingBag,
    bg: "rgba(55,48,163,0.10)",
    iconColor: "var(--color-primary)",
  },
  claim_request: {
    Icon: Tag,
    bg: "rgba(245,158,11,0.12)",
    iconColor: "#d97706",
  },
  payout_update: {
    Icon: Banknote,
    bg: "rgba(16,185,129,0.12)",
    iconColor: "#059669",
  },
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div
        className="relative overflow-hidden shrink-0 rounded-xl bg-border"
        style={{ width: 36, height: 36 }}
      >
        <div className="skeleton-shimmer" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
        <div
          className="relative overflow-hidden h-3 rounded bg-border"
          style={{ width: "60%" }}
        >
          <div className="skeleton-shimmer" />
        </div>
        <div className="relative overflow-hidden h-2.5 rounded bg-border w-full">
          <div className="skeleton-shimmer" />
        </div>
        <div
          className="relative overflow-hidden h-2 rounded bg-border"
          style={{ width: "30%" }}
        >
          <div className="skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead } = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleNotificationClick(id: string, link: string) {
    markRead(id);
    setOpen(false);
    router.push(link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center transition-colors text-text-subtle hover:text-text hover:bg-surface"
        aria-label="Notifications"
        style={{ width: 36, height: 36, borderRadius: TRIGGER_RADIUS }}
      >
        <Bell size={17} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center text-white font-bold leading-none"
            style={{
              top: 5,
              right: 5,
              minWidth: 15,
              height: 15,
              paddingInline: 3,
              borderRadius: 99,
              fontSize: 9,
              background: "#ef4444",
              border: "1.5px solid var(--color-card)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...DROPDOWN_ANIM}
            className="absolute right-0 top-full mt-2 z-50 overflow-hidden bg-card"
            style={{
              width: 340,
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4"
              style={{
                paddingTop: 14,
                paddingBottom: 12,
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text)",
                  }}
                >
                  Notifications
                </span>
                {!isLoading && unreadCount > 0 && (
                  <span
                    className="flex items-center justify-center font-semibold"
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingInline: 5,
                      borderRadius: 99,
                      fontSize: 10,
                      background: "var(--color-primary)",
                      color: "#fff",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              {!isLoading && unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  style={{
                    fontSize: 11,
                    color: "var(--color-primary)",
                    fontWeight: 500,
                  }}
                  className="hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {isLoading ? (
                <>
                  <NotificationSkeleton />
                  <div
                    style={{
                      height: 1,
                      background: "var(--color-border)",
                      opacity: 0.5,
                    }}
                  />
                  <NotificationSkeleton />
                  <div
                    style={{
                      height: 1,
                      background: "var(--color-border)",
                      opacity: 0.5,
                    }}
                  />
                  <NotificationSkeleton />
                </>
              ) : notifications.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2"
                  style={{ padding: "32px 20px" }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <BellOff
                      size={18}
                      strokeWidth={1.5}
                      style={{ color: "var(--color-text-subtle)" }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-subtle)",
                      textAlign: "center",
                    }}
                  >
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const meta =
                    NOTIF_META[n.type as NotifType] ?? NOTIF_META.order_update;
                  const { Icon } = meta;
                  return (
                    <div key={n.id}>
                      <button
                        onClick={() => handleNotificationClick(n.id, n.link)}
                        className="flex items-start gap-3 w-full text-left transition-colors hover:bg-surface"
                        style={{ padding: "12px 16px" }}
                      >
                        {/* Type icon */}
                        <div
                          className="relative shrink-0 flex items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: meta.bg,
                          }}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            style={{ color: meta.iconColor }}
                          />
                          {!n.read && (
                            <span
                              className="absolute"
                              style={{
                                top: -2,
                                right: -2,
                                width: 8,
                                height: 8,
                                borderRadius: 99,
                                background: "var(--color-primary)",
                                border: "1.5px solid var(--color-card)",
                              }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="truncate"
                            style={{
                              fontSize: 13,
                              fontWeight: n.read ? 400 : 600,
                              color: n.read
                                ? "var(--color-text-muted)"
                                : "var(--color-text)",
                              lineHeight: 1.4,
                            }}
                          >
                            {n.title}
                          </p>
                          <p
                            className="line-clamp-2"
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-subtle)",
                              marginTop: 2,
                              lineHeight: 1.5,
                            }}
                          >
                            {n.body}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: "var(--color-text-subtle)",
                              marginTop: 4,
                            }}
                          >
                            {new Date(n.created_at).toLocaleString("en-NG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </button>
                      {i < notifications.length - 1 && (
                        <div
                          style={{
                            height: 1,
                            background: "var(--color-border)",
                            opacity: 0.6,
                            marginInline: 16,
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AvatarMenu ───────────────────────────────────────────────────────────────

function AvatarMenu() {
  const { data: me } = useMe();
  const { mutate: signOut } = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex items-center gap-2 transition-colors hover:bg-surface"
        style={{ padding: "5px 8px 5px 6px", borderRadius: TRIGGER_RADIUS }}
      >
        <div
          className="shrink-0 overflow-hidden ring-1 ring-border"
          style={{ width: 26, height: 26, borderRadius: 99 }}
        >
          {me?.avatar_url ? (
            <CldImage
              src={me.avatar_url}
              width={26}
              height={26}
              alt={me?.name ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>
                {me?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
        </div>
        <div
          className="text-left min-w-0 hidden sm:block"
          style={{ maxWidth: 88 }}
        >
          <p
            className="truncate"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text)",
              lineHeight: 1.3,
            }}
          >
            {me?.name?.split(" ")[0] ?? "Account"}
          </p>
          <p
            className="truncate"
            style={{
              fontSize: 10,
              color: "var(--color-text-subtle)",
              lineHeight: 1.3,
            }}
          >
            {me?.email ?? ""}
          </p>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2}
          style={{ color: "var(--color-text-subtle)", flexShrink: 0 }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...DROPDOWN_ANIM}
            className="absolute right-0 top-full mt-2 overflow-hidden bg-card z-50"
            style={{
              width: 240,
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ padding: "16px 16px 14px" }}>
              <div className="flex items-center gap-3">
                <div
                  className="shrink-0 overflow-hidden ring-1 ring-border"
                  style={{ width: 40, height: 40, borderRadius: 99 }}
                >
                  {me?.avatar_url ? (
                    <CldImage
                      src={me.avatar_url}
                      width={40}
                      height={40}
                      alt={me?.name ?? "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span
                        style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}
                      >
                        {me?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text)",
                    }}
                  >
                    {me?.name ?? "Account"}
                  </p>
                  <p
                    className="truncate"
                    style={{ fontSize: 11, color: "var(--color-text-subtle)" }}
                  >
                    {me?.email ?? ""}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--color-border)" }} />

            <div style={{ paddingBlock: 6 }}>
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 transition-colors hover:bg-surface"
                style={{ padding: "9px 16px" }}
              >
                <User
                  size={15}
                  strokeWidth={1.75}
                  style={{ color: "var(--color-text-subtle)", flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "var(--color-text)" }}>
                  Profile Settings
                </span>
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2.5 w-full transition-colors hover:bg-red-500/5"
                style={{ padding: "9px 16px" }}
              >
                <LogOut
                  size={15}
                  strokeWidth={1.75}
                  style={{ color: "#ef4444", flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "#ef4444" }}>Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="hidden lg:flex items-center gap-4 h-14 px-6 lg:px-8 bg-card shrink-0 sticky top-0 z-20">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-xl flex items-center gap-3 transition-colors"
          style={{
            height: 38,
            paddingLeft: 14,
            paddingRight: 12,
            borderRadius: TRIGGER_RADIUS,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-border-strong)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-border)")
          }
        >
          <Search
            size={15}
            strokeWidth={1.75}
            style={{ color: "var(--color-text-subtle)", flexShrink: 0 }}
          />
          <span
            className="flex-1 text-left"
            style={{ fontSize: 13.5, color: "var(--color-text-subtle)" }}
          >
            Search listings and claims...
          </span>
          <kbd
            className="hidden sm:flex items-center gap-0.5 shrink-0"
            style={{
              fontSize: 11,
              color: "var(--color-text-subtle)",
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: "2px 6px",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 12 }}>⌘</span>K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <NotificationBell />
          <div className="mx-2 h-5 w-px bg-border shrink-0" />
          <AvatarMenu />
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
