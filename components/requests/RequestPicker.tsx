"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Check, Users } from "lucide-react";
import { usePublicRequestsInfinite } from "@/lib/hooks/useRequests";
import type { ItemRequest } from "@/types";

interface RequestPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  category?: string;
}

export function RequestPicker({ value, onChange, category }: RequestPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePublicRequestsInfinite({
    q: debouncedQ || undefined,
    category: category || undefined,
  });

  const requests = data?.pages.flatMap((page) => page.requests) ?? [];
  const total = data?.pages[0]?.total ?? 0;

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

  const selectedRequests = value
    .map((id) => requests.find((r) => r.id === id))
    .filter((r): r is ItemRequest => !!r);

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedRequests.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              <span className="max-w-[160px] truncate">{r.title}</span>
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
              className="text-[11px] font-medium text-text-subtle hover:text-error transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <Search
          size={14}
          strokeWidth={2}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search community requests…"
          className="block w-full h-11 pl-10 pr-9 text-sm text-text placeholder-text-muted bg-card border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {isLoading && (
            <p className="py-8 text-center text-sm text-text-muted">Searching…</p>
          )}
          {!isLoading && requests.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
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
                className={[
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  isSelected ? "bg-primary/5" : "bg-card hover:bg-surface",
                ].join(" ")}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight truncate ${isSelected ? "text-primary" : "text-text"}`}>
                    {r.title}
                  </p>
                  <p className="text-xs text-text-muted mt-1 truncate">
                    {[r.category, r.area].filter(Boolean).join(" · ") || "No category"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <span className="flex items-center gap-1 text-xs text-text-subtle">
                    <Users size={12} strokeWidth={2} />
                    {r.follow_count ?? 0}
                  </span>
                  <div className={[
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                    isSelected ? "border-primary bg-primary" : "border-border",
                  ].join(" ")}>
                    {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {hasNextPage && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="block w-full border-t border-border py-2.5 text-center text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-60 transition-colors"
          >
            {isFetchingNextPage ? "Loading…" : `Load more (${total - requests.length} left)`}
          </button>
        )}
      </div>
    </div>
  );
}
