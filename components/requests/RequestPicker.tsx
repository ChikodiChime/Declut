"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Link2, ChevronDown, Check } from "lucide-react";
import { usePublicRequests } from "@/lib/hooks/useRequests";
import type { ItemRequest } from "@/types";

interface RequestPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  category?: string;
}

export function RequestPicker({ value, onChange, category }: RequestPickerProps) {
  const [expanded, setExpanded] = useState(value.length > 0);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data } = usePublicRequests({
    q: debouncedQ || undefined,
    category: category || undefined,
    limit: 20,
  });

  const requests = data?.requests ?? [];

  function toggle(r: ItemRequest) {
    if (value.includes(r.id)) {
      onChange(value.filter((id) => id !== r.id));
    } else {
      onChange([...value, r.id]);
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function handleExpand() {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const selectedRequests = value
    .map((id) => requests.find((r) => r.id === id))
    .filter((r): r is ItemRequest => !!r);

  const headerTitle =
    value.length === 0
      ? "Someone's looking for this?"
      : value.length === 1 && selectedRequests[0]
        ? selectedRequests[0].title
        : `${value.length} requests linked`;

  const headerSub =
    value.length === 0
      ? "Optional — tag a request and its followers get notified"
      : "Followers will be notified when you publish";

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{ borderColor: value.length > 0 ? "rgba(79,70,229,0.4)" : "#e0dbd3" }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={expanded ? () => setExpanded(false) : handleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: value.length > 0 ? "rgba(79,70,229,0.10)" : "#f5f1eb" }}
        >
          <Link2
            size={15}
            strokeWidth={2}
            style={{ color: value.length > 0 ? "#4f46e5" : "#a8a09a" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold leading-tight truncate"
            style={{ color: value.length > 0 ? "#4f46e5" : "#16130f" }}
          >
            {headerTitle}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "#a8a09a" }}>
            {headerSub}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {value.length > 0 && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(79,70,229,0.10)", color: "#4f46e5" }}
            >
              {value.length} linked
            </span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{
              color: "#a8a09a",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          />
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: "#e8e4dc" }}
        >
          {/* Selected chips */}
          {value.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedRequests.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(79,70,229,0.09)", color: "#4f46e5" }}
                >
                  <span className="max-w-[140px] truncate">{r.title}</span>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="ml-0.5 shrink-0 hover:opacity-70 transition-opacity"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-medium transition-colors"
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
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={13}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#a8a09a" }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search community requests…"
              className="w-full h-9 pl-8 pr-8 rounded-lg border text-[13px] focus:outline-none transition-colors"
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
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "#a8a09a" }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Request list */}
          <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
            {requests.length === 0 && (
              <p className="py-6 text-center text-[13px]" style={{ color: "#a8a09a" }}>
                {debouncedQ ? "No matching requests" : "No open requests yet"}
              </p>
            )}
            {requests.map((r) => {
              const isSelected = value.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r)}
                  className="flex items-start gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors"
                  style={{ background: isSelected ? "rgba(79,70,229,0.07)" : "transparent" }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = "#faf8f4";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium leading-tight truncate"
                      style={{ color: isSelected ? "#4f46e5" : "#16130f" }}
                    >
                      {r.title}
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "#a8a09a" }}>
                      {[r.category, r.area].filter(Boolean).join(" · ") || "No category"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px]" style={{ color: "#a8a09a" }}>
                      {r.follow_count ?? 0} following
                    </span>
                    {isSelected && (
                      <Check size={13} strokeWidth={2.5} style={{ color: "#4f46e5" }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
