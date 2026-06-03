"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, ArrowUpLeft } from "lucide-react";
import { ListingImage } from "@/components/ui";
import { useRecentSearches } from "@/lib/hooks/useRecentSearches";
import { useSearchSuggestions } from "@/lib/hooks/useSearchSuggestions";
import type { Suggestion } from "@/types";

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  for_sale: { text: "For Sale", color: "#4f46e5" },
  free:     { text: "Free",     color: "#10b981" },
  donate:   { text: "Donate",   color: "#f59e0b" },
};

export function NavbarSearch({
  onSearch,
  autoFocus,
}: {
  onSearch?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const { recents, add: addRecent, remove: removeRecent, clear: clearRecents } = useRecentSearches();
  const { suggestions } = useSearchSuggestions(value, open);

  const showRecents = recents.length > 0 && value.trim().length < 2;
  const showSuggestions = suggestions.length > 0 && value.trim().length >= 2;
  const hasDropdown = open && (showRecents || showSuggestions);

  const allItems: Array<{ kind: "recent"; text: string } | { kind: "suggestion"; item: Suggestion }> =
    showRecents
      ? recents.map((text) => ({ kind: "recent" as const, text }))
      : showSuggestions
      ? suggestions.map((item) => ({ kind: "suggestion" as const, item }))
      : [];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [value, open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function navigate(q: string) {
    addRecent(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setValue("");
    setOpen(false);
    onSearch?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIdx >= 0 && allItems[activeIdx]) {
      const item = allItems[activeIdx];
      navigate(item.kind === "recent" ? item.text : item.item.title);
      return;
    }
    const q = value.trim();
    if (q) navigate(q);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
      } else if (e.key === "Escape") {
        setOpen(false);
        setActiveIdx(-1);
      }
    },
    [hasDropdown, allItems.length]
  );

  return (
    <div ref={containerRef} className="relative w-full" style={{ maxWidth: 440 }}>
      <form
        onSubmit={handleSubmit}
        className="flex items-stretch w-full overflow-hidden"
        style={{
          borderRadius: hasDropdown ? "10px 10px 0 0" : "10px",
          border: "1.5px solid",
          borderColor: open ? "#4f46e5" : "#c7d2fe",
          borderBottom: hasDropdown ? "1.5px solid #e0e7ff" : undefined,
          background: "#eef2ff",
          transition: "border-radius 150ms, border-color 180ms, box-shadow 180ms",
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
        }}
      >
        <div className="relative flex-1 flex items-center" style={{ minWidth: 0 }}>
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 pointer-events-none shrink-0"
            style={{ color: "#6366f1" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search listings…"
            autoComplete="off"
            className="w-full h-10 pl-9 pr-3 text-[13.5px] bg-transparent focus:outline-none"
            style={{ color: "#16130f" }}
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(""); inputRef.current?.focus(); }}
              className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full shrink-0"
              style={{ color: "#6366f1" }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-10 w-10 flex shrink-0 items-center justify-center transition-all duration-150"
          style={{ background: "#4f46e5", color: "#ffffff" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
        >
          <Search size={14} strokeWidth={2.5} />
        </button>
      </form>

      {hasDropdown && (
        <div
          className="absolute left-0 right-0 z-50"
          style={{
            background: "#ffffff",
            border: "1.5px solid #4f46e5",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 8px 24px -4px rgba(79,70,229,0.15), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {showRecents && (
            <>
              <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#a8a09a" }}>
                  Recent
                </span>
                <button
                  onClick={clearRecents}
                  className="text-[11px] transition-colors"
                  style={{ color: "#a8a09a" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a8a09a"; }}
                >
                  Clear all
                </button>
              </div>
              {recents.map((text, i) => (
                <RecentRow
                  key={text}
                  text={text}
                  active={activeIdx === i}
                  onSelect={() => navigate(text)}
                  onRemove={(e) => { e.stopPropagation(); removeRecent(text); }}
                />
              ))}
            </>
          )}

          {showSuggestions && (
            <>
              <div className="px-3.5 pt-2.5 pb-1">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#a8a09a" }}>
                  Suggestions
                </span>
              </div>
              {suggestions.map((item, i) => (
                <SuggestionRow
                  key={item.id}
                  item={item}
                  active={activeIdx === i}
                  onSelect={() => navigate(item.title)}
                />
              ))}
            </>
          )}
          <div className="h-1.5" />
        </div>
      )}
    </div>
  );
}

function RecentRow({
  text,
  active,
  onSelect,
  onRemove,
}: {
  text: string;
  active: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="group w-full flex items-center gap-3 px-3.5 py-2 cursor-pointer transition-colors duration-100"
      style={{ background: active ? "#f5f3ff" : "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? "#f5f3ff" : "transparent"; }}
    >
      <button type="button" onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Clock size={13} strokeWidth={1.8} style={{ color: "#a8a09a", flexShrink: 0 }} />
        <span className="flex-1 truncate text-[13px]" style={{ color: "#16130f" }}>{text}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
        style={{ color: "#a8a09a" }}
        aria-label={`Remove ${text}`}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a8a09a"; }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
      <ArrowUpLeft size={13} strokeWidth={1.8} style={{ color: "#c7d2fe", flexShrink: 0 }} />
    </div>
  );
}

function SuggestionRow({
  item,
  active,
  onSelect,
}: {
  item: Suggestion;
  active: boolean;
  onSelect: () => void;
}) {
  const typeConfig = TYPE_LABEL[item.listing_type] ?? TYPE_LABEL.for_sale;
  const thumb = item.images[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors duration-100"
      style={{ background: active ? "#f5f3ff" : "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? "#f5f3ff" : "transparent"; }}
    >
      <div
        className="relative shrink-0 rounded-lg overflow-hidden"
        style={{ width: 36, height: 36, background: "#f0ece4" }}
      >
        {thumb ? (
          <ListingImage
            src={thumb}
            fill
            sizes="36px"
            className="object-cover"
            alt={item.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Search size={14} strokeWidth={1.5} style={{ color: "#c0b9b2" }} />
          </div>
        )}
      </div>
      <span className="flex-1 truncate text-[13px] font-medium" style={{ color: "#16130f" }}>
        {item.title}
      </span>
      <span
        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${typeConfig.color}18`, color: typeConfig.color }}
      >
        {typeConfig.text}
      </span>
    </button>
  );
}
