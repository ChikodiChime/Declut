"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  Plus,
  MapPin,
  X,
  Check,
  Bell,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { usePublicRequests, useFollowRequest, useDeleteRequest } from "@/lib/hooks/useRequests";
import { useMe } from "@/lib/hooks/useAuth";
import { EditRequestModal } from "@/components/requests/EditRequestModal";
import { VALID_CATEGORIES } from "@/app/api/listings/utils";
import type { ItemRequest, ListingType } from "@/types";

const TYPE_TABS: { value: ListingType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "for_sale", label: "For Sale" },
  { value: "free", label: "Free" },
  { value: "donate", label: "Donate" },
];

const TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  for_sale: { color: "#4f46e5", bg: "rgba(79,70,229,0.08)", label: "For Sale" },
  free:     { color: "#059669", bg: "rgba(5,150,105,0.08)", label: "Free" },
  donate:   { color: "#d97706", bg: "rgba(217,119,6,0.08)",  label: "Donate" },
};

const PAGE_SIZE = 24;

function formatTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  currentUserId,
  isLoggedIn,
  onEdit,
}: {
  request: ItemRequest;
  currentUserId?: string;
  isLoggedIn: boolean;
  onEdit: (r: ItemRequest) => void;
}) {
  const { mutate: toggleFollow, isPending } = useFollowRequest(request.id);
  const { mutate: deleteRequest, isPending: isDeleting } = useDeleteRequest(request.id);
  const isFollowing = request.is_following ?? false;
  const followCount = request.follow_count ?? 0;
  const timeAgo = formatTimeAgo(request.created_at);
  const isHot = followCount >= 5;
  const isOwner = !!currentUserId && request.user_id === currentUserId;

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const type = request.listing_type ?? "";
  const accent = TYPE_META[type] ?? { color: "#a8a09a", bg: "#f5f1eb", label: null };

  const name = request.requester?.name ?? "Someone";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="group flex flex-col rounded-2xl border bg-white transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      style={{
        borderColor: "#e8e4dc",
        borderTopColor: accent.color === "#a8a09a" ? "#e8e4dc" : accent.color,
        borderTopWidth: 3,
      }}
    >

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Header: avatar + title + hot badge */}
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
            style={{ background: accent.bg, color: accent.color === "#a8a09a" ? "#78726c" : accent.color }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-semibold leading-snug"
              style={{ color: "#16130f" }}
            >
              {request.title}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#a8a09a" }}>
              {name} · {timeAgo}
            </p>
          </div>

          {isHot && (
            <span
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#fef3c7", color: "#b45309" }}
            >
              <Flame size={9} strokeWidth={2} />
              Hot
            </span>
          )}

          {/* Owner menu */}
          {isOwner && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => { setMenuOpen((v) => !v); setConfirmDelete(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[#f5f1eb]"
                style={{ color: "#a8a09a" }}
              >
                <MoreHorizontal size={15} strokeWidth={2} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl border bg-white shadow-lg z-20 overflow-hidden"
                  style={{ borderColor: "#e8e4dc" }}
                >
                  {!confirmDelete ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onEdit(request); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors hover:bg-[#f5f1eb]"
                        style={{ color: "#16130f" }}
                      >
                        <Pencil size={13} strokeWidth={2} style={{ color: "#78726c" }} />
                        Edit request
                      </button>
                      <div className="h-px mx-2" style={{ background: "#f0ece6" }} />
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors hover:bg-red-50"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                        Delete request
                      </button>
                    </>
                  ) : (
                    <div className="px-3.5 py-3">
                      <p className="text-[12px] font-medium mb-2.5" style={{ color: "#16130f" }}>
                        Delete this request?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 h-7 rounded-lg border text-[12px] font-medium transition-colors hover:bg-[#f5f1eb]"
                          style={{ borderColor: "#e0dbd3", color: "#56524d" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => { deleteRequest(); setMenuOpen(false); }}
                          className="flex-1 h-7 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-60"
                          style={{ background: "#ef4444" }}
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {request.description && (
          <p
            className="text-[12px] leading-relaxed line-clamp-2"
            style={{ color: "#78726c" }}
          >
            {request.description}
          </p>
        )}

        {/* Tags */}
        {(request.category || type || request.area || request.max_price != null) && (
          <div className="flex flex-wrap gap-1.5">
            {request.category && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(79,70,229,0.08)", color: "#4f46e5" }}
              >
                {request.category}
              </span>
            )}
            {accent.label && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize"
                style={{ background: accent.bg, color: accent.color }}
              >
                {accent.label}
              </span>
            )}
            {request.area && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: "#f5f1eb", color: "#56524d" }}
              >
                <MapPin size={9} strokeWidth={2} />
                {request.area}
              </span>
            )}
            {request.max_price != null && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#f0fdf4", color: "#16a34a" }}
              >
                Max ₦{request.max_price.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: "#f0ece6" }}
        >
          {/* Follow toggle with count + tooltip */}
          <div className="relative group/follow">
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  window.location.href = `/auth/login?next=${encodeURIComponent("/requests")}`;
                  return;
                }
                toggleFollow();
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-lg h-8 px-2.5 border transition-all disabled:opacity-50"
              style={
                isFollowing
                  ? { borderColor: "#4f46e5", background: "#4f46e5", color: "white" }
                  : { borderColor: "#e8e4dc", background: "transparent", color: "#78726c" }
              }
              onMouseEnter={(e) => {
                if (isFollowing)
                  (e.currentTarget as HTMLElement).style.background = "#4338ca";
              }}
              onMouseLeave={(e) => {
                if (isFollowing)
                  (e.currentTarget as HTMLElement).style.background = "#4f46e5";
              }}
            >
              <Bell size={12} strokeWidth={2} fill={isFollowing ? "white" : "none"} />
              {isFollowing ? "Following" : "Follow"}
              {followCount > 0 && (
                <span
                  className="min-w-[18px] px-1 py-0.5 rounded-full text-[10px] font-bold text-center leading-none"
                  style={
                    isFollowing
                      ? { background: "rgba(255,255,255,0.25)", color: "white" }
                      : { background: "#f0ece6", color: "#78726c" }
                  }
                >
                  {followCount}
                </span>
              )}
            </button>

            {/* Tooltip */}
            <div
              className="pointer-events-none absolute bottom-full left-0 mb-2 w-52 rounded-lg px-3 py-2 text-[11px] leading-snug text-white opacity-0 group-hover/follow:opacity-100 transition-opacity duration-150"
              style={{ background: "#1c1917" }}
            >
              {!isLoggedIn
                ? "Sign in to follow this request"
                : isFollowing
                  ? "Click to unfollow — you won't get notified"
                  : "Follow to get notified when a seller lists this item"}
              <span
                className="absolute left-3 top-full border-4 border-transparent"
                style={{ borderTopColor: "#1c1917" }}
              />
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href={
              isLoggedIn
                ? `/dashboard/listings/new?request_id=${request.id}`
                : `/auth/login?next=${encodeURIComponent(`/dashboard/listings/new?request_id=${request.id}`)}`
            }
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold text-white transition-all active:scale-95"
            style={{ background: "#4f46e5" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#4338ca")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#4f46e5")
            }
          >
            <Plus size={11} strokeWidth={2.5} />
            List item
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RequestCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative overflow-hidden flex flex-col rounded-2xl border bg-white"
      style={{ borderColor: "#e8e4dc", borderTopWidth: 3 }}
    >
      <div className="skeleton-shimmer" style={{ animationDelay: `${(index % 4) * 0.12}s` }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "#ede9e3" }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded" style={{ background: "#ede9e3" }} />
            <div className="h-2.5 w-1/3 rounded" style={{ background: "#e8e4dc" }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded" style={{ background: "#e8e4dc" }} />
          <div className="h-2.5 w-4/5 rounded" style={{ background: "#e8e4dc" }} />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-20 rounded-full" style={{ background: "#ede9e3" }} />
          <div className="h-5 w-14 rounded-full" style={{ background: "#ede9e3" }} />
        </div>
        <div className="h-px" style={{ background: "#f0ece6" }} />
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 rounded-lg" style={{ background: "#ede9e3" }} />
          <div className="h-7 w-20 rounded-lg" style={{ background: "#ede9e3" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Mobile filter chips ───────────────────────────────────────────────────────

function MobileFilters({
  listing_type,
  category,
  onType,
  onCategory,
}: {
  listing_type: ListingType | "";
  category: string;
  onType: (v: ListingType | "") => void;
  onCategory: (v: string) => void;
}) {
  const hasTypeFilter = listing_type !== "";
  const hasCategoryFilter = category !== "";

  return (
    <div
      className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-3 border-b scrollbar-none"
      style={{ borderColor: "#e8e4dc", background: "white" }}
    >
      <SlidersHorizontal size={13} strokeWidth={2} style={{ color: "#a8a09a", shrink: 0 }} className="shrink-0" />
      {TYPE_TABS.filter((t) => t.value !== "").map((tab) => {
        const sel = listing_type === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onType(sel ? "" : (tab.value as ListingType))}
            className="shrink-0 h-7 px-3 rounded-full border text-[12px] font-medium transition-colors"
            style={{
              borderColor: sel ? "#4f46e5" : "#e8e4dc",
              background: sel ? "rgba(79,70,229,0.08)" : "white",
              color: sel ? "#4f46e5" : "#56524d",
            }}
          >
            {tab.label}
          </button>
        );
      })}

      {VALID_CATEGORIES.map((cat) => {
        const sel = category === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onCategory(sel ? "" : cat)}
            className="shrink-0 h-7 px-3 rounded-full border text-[12px] font-medium transition-colors"
            style={{
              borderColor: sel ? "#4f46e5" : "#e8e4dc",
              background: sel ? "rgba(79,70,229,0.08)" : "white",
              color: sel ? "#4f46e5" : "#56524d",
            }}
          >
            {cat}
          </button>
        );
      })}

      {(hasTypeFilter || hasCategoryFilter) && (
        <button
          type="button"
          onClick={() => {
            onType("");
            onCategory("");
          }}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full border transition-colors hover:bg-red-50"
          style={{ borderColor: "#e8e4dc", color: "#a8a09a" }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function RequestsContent() {
  const searchParams = useSearchParams();
  const { data: me } = useMe();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [listing_type, setListingType] = useState<ListingType | "">(
    (searchParams.get("listing_type") as ListingType) ?? ""
  );
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [areaInput, setAreaInput] = useState(searchParams.get("area") ?? "");
  const [area, setArea] = useState(areaInput);
  const [page, setPage] = useState(1);
  const [editingRequest, setEditingRequest] = useState<ItemRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => setArea(areaInput), 350);
    return () => clearTimeout(t);
  }, [areaInput]);

  const { data, isLoading, isFetching } = usePublicRequests({
    q: debouncedQ || undefined,
    category: category || undefined,
    listing_type: listing_type || undefined,
    area: area || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const requests = data?.requests ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = !!(listing_type || category || area || debouncedQ);

  function clearFilters() {
    setQ("");
    setDebouncedQ("");
    setListingType("");
    setCategory("");
    setAreaInput("");
    setArea("");
    setPage(1);
  }

  return (
    <>
    <main className="min-h-screen" style={{ background: "#faf8f4" }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          paddingTop: 68,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-7 transition-colors"
            style={{ color: "rgba(255,255,255,0.48)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.48)")
            }
          >
            <ArrowLeft size={13} strokeWidth={2} />
            Home
          </Link>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="font-bold text-white leading-tight tracking-tight"
                style={{ fontSize: "clamp(22px, 4vw, 36px)" }}
              >
                Community Requests
              </h1>
              {!isLoading && (
                <p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.48)" }}>
                  {total.toLocaleString()} open request{total === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white border border-white/25 bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              Post a request
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-6 relative max-w-lg">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "rgba(255,255,255,0.45)" }}
            />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search requests…"
              className="w-full h-11 pl-10 pr-10 rounded-xl text-[13px] focus:outline-none placeholder:text-white/40"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter chips */}
      <MobileFilters
        listing_type={listing_type}
        category={category}
        onType={(v) => { setListingType(v); setPage(1); }}
        onCategory={(v) => { setCategory(v); setPage(1); }}
      />

      {/* Body */}
      <div className="flex" style={{ borderTop: "1px solid #e8e4dc" }}>
        {/* Sidebar (desktop only) */}
        <aside
          className="hidden lg:block shrink-0 border-r px-5 py-6"
          style={{
            width: 240,
            borderColor: "#e8e4dc",
            background: "white",
            position: "sticky",
            top: 68,
            height: "calc(100vh - 68px)",
            alignSelf: "flex-start",
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
              Filters
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[12px] font-medium transition-colors"
                style={{ color: "#a8a09a" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#ef4444")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#a8a09a")
                }
              >
                Clear all
              </button>
            )}
          </div>

          {/* Type */}
          <div className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: "#a8a09a" }}
            >
              Type
            </p>
            <div className="flex flex-col gap-0.5">
              {TYPE_TABS.map((tab) => {
                const sel = listing_type === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setListingType(tab.value);
                      setPage(1);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                    style={{
                      background: sel ? "rgba(79,70,229,0.08)" : "transparent",
                      color: sel ? "#4f46e5" : "#56524d",
                      fontWeight: sel ? 600 : 400,
                    }}
                  >
                    {tab.label}
                    {sel && (
                      <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px mb-5" style={{ background: "#ede9e2" }} />

          {/* Category */}
          <div className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: "#a8a09a" }}
            >
              Category
            </p>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => {
                  setCategory("");
                  setPage(1);
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                style={{
                  background: !category ? "rgba(79,70,229,0.08)" : "transparent",
                  color: !category ? "#4f46e5" : "#56524d",
                  fontWeight: !category ? 600 : 400,
                }}
              >
                All categories
                {!category && (
                  <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />
                )}
              </button>
              {VALID_CATEGORIES.map((cat) => {
                const sel = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(sel ? "" : cat);
                      setPage(1);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                    style={{
                      background: sel ? "rgba(79,70,229,0.08)" : "transparent",
                      color: sel ? "#4f46e5" : "#56524d",
                      fontWeight: sel ? 600 : 400,
                    }}
                  >
                    {cat}
                    {sel && (
                      <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px mb-5" style={{ background: "#ede9e2" }} />

          {/* Area */}
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: "#a8a09a" }}
            >
              Location
            </p>
            <div className="relative">
              <MapPin
                size={13}
                strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#a8a09a" }}
              />
              <input
                type="text"
                placeholder="e.g. Lagos…"
                value={areaInput}
                onChange={(e) => {
                  setAreaInput(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-8 pr-8 rounded-lg border text-[13px] focus:outline-none transition-all"
                style={{ borderColor: "#e0dbd3", color: "#16130f", background: "white" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0dbd3";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {areaInput && (
                <button
                  type="button"
                  onClick={() => {
                    setAreaInput("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8a09a" }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
          {/* Result count + active filter chips */}
          {!isLoading && (
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <p className="text-[13px]" style={{ color: "#a8a09a" }}>
                {total === 0 ? "No requests found" : `${total.toLocaleString()} request${total === 1 ? "" : "s"}`}
                {isFetching && (
                  <span style={{ color: "#c4bdb5" }}> · Updating…</span>
                )}
              </p>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium h-7 px-2.5 rounded-lg border transition-colors hover:bg-red-50 hover:border-red-200"
                  style={{ borderColor: "#e8e4dc", color: "#a8a09a" }}
                >
                  <X size={11} strokeWidth={2.5} />
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Cards grid */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <RequestCardSkeleton key={i} index={i} />
              ))}
            </div>
          )}

          {!isLoading && requests.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {requests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  currentUserId={me?.id}
                  isLoggedIn={!!me}
                  onEdit={setEditingRequest}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && requests.length === 0 && (
            <div className="flex flex-col items-center py-24 text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl"
                style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
              >
                📋
              </div>
              <p className="mb-1 text-sm font-semibold" style={{ color: "#16130f" }}>
                No requests {hasFilters ? "match your filters" : "yet"}
              </p>
              <p className="mb-6 text-xs" style={{ color: "#a8a09a" }}>
                {hasFilters
                  ? "Try adjusting or clearing your filters"
                  : "Be the first to request an item from the community"}
              </p>
              {hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="rounded-full border px-5 py-2 text-xs font-medium transition-colors hover:bg-[#f5f1eb]"
                  style={{ borderColor: "#e8e4dc", color: "#78726c" }}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/requests/new"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: "#4f46e5" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#4338ca")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#4f46e5")
                  }
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Post a request
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-1">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] disabled:opacity-40 transition-colors hover:bg-[#f5f1eb]"
                style={{ borderColor: "#e8e4dc", color: "#56524d" }}
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <span className="px-3 text-[13px]" style={{ color: "#56524d" }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] disabled:opacity-40 transition-colors hover:bg-[#f5f1eb]"
                style={{ borderColor: "#e8e4dc", color: "#56524d" }}
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>

      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}
    </>
  );
}

export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsContent />
    </Suspense>
  );
}
