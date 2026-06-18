"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Bell, MapPin, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { useMyRequests, useCloseRequest, useDeleteRequest } from "@/lib/hooks/useRequests";
import { EditRequestModal } from "@/components/requests/EditRequestModal";
import type { ItemRequest } from "@/types";

function formatTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Request row ──────────────────────────────────────────────────────────────

function RequestRow({
  request,
  onEdit,
}: {
  request: ItemRequest;
  onEdit: (r: ItemRequest) => void;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: updateStatus, isPending: isUpdating } = useCloseRequest(request.id);
  const { mutate: deleteRequest, isPending: isDeleting } = useDeleteRequest(request.id);

  const isClosed = request.status === "closed";
  const timeAgo = formatTimeAgo(request.created_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-card px-4 py-3.5"
      style={{ borderColor: "#e8e4dc", opacity: isClosed ? 0.6 : 1 }}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isClosed ? (
          <CheckCircle2 size={18} strokeWidth={1.75} className="text-green-500" />
        ) : (
          <Circle size={18} strokeWidth={1.75} className="text-primary" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text leading-snug truncate">
          {request.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {request.category && (
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(79,70,229,0.08)", color: "#4f46e5" }}
            >
              {request.category}
            </span>
          )}
          {request.area && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <MapPin size={10} strokeWidth={2} />
              {request.area}
            </span>
          )}
          <span className="text-[11px] text-text-muted">{timeAgo}</span>
          <span className="flex items-center gap-1 text-[11px] text-text-muted">
            <Bell size={10} strokeWidth={2} />
            {request.follow_count ?? 0} follower{(request.follow_count ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <span
          className="text-[11px] font-semibold px-2 py-1 rounded-lg capitalize"
          style={{
            background: isClosed ? "#f5f1eb" : "rgba(79,70,229,0.08)",
            color: isClosed ? "#78726c" : "#4f46e5",
          }}
        >
          {request.status}
        </span>

        {/* Edit button */}
        {!confirmDelete && (
          <button
            onClick={() => onEdit(request)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors"
            style={{ borderColor: "#e0dbd3", color: "#56524d" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5";
              (e.currentTarget as HTMLElement).style.color = "#4f46e5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#e0dbd3";
              (e.currentTarget as HTMLElement).style.color = "#56524d";
            }}
          >
            <Pencil size={11} strokeWidth={2} />
            Edit
          </button>
        )}

        {/* Close / Reopen */}
        {!confirmDelete && (
          <>
            {!isClosed && (
              <>
                {confirmClose ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-muted">Close?</span>
                    <button
                      onClick={() => { updateStatus("closed"); setConfirmClose(false); }}
                      disabled={isUpdating}
                      className="text-[11px] font-medium px-2 py-1 rounded-lg text-white transition-colors disabled:opacity-50"
                      style={{ background: "#4f46e5" }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors"
                      style={{ borderColor: "#e0dbd3", color: "#56524d" }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClose(true)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: "#e0dbd3", color: "#56524d" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#ef4444";
                      (e.currentTarget as HTMLElement).style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#e0dbd3";
                      (e.currentTarget as HTMLElement).style.color = "#56524d";
                    }}
                  >
                    Close
                  </button>
                )}
              </>
            )}

            {isClosed && (
              <button
                onClick={() => updateStatus("open")}
                disabled={isUpdating}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50"
                style={{ borderColor: "#e0dbd3", color: "#56524d" }}
              >
                Reopen
              </button>
            )}
          </>
        )}

        {/* Delete */}
        {!confirmClose && (
          <>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted">Delete?</span>
                <button
                  onClick={() => deleteRequest()}
                  disabled={isDeleting}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: "#ef4444" }}
                >
                  {isDeleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors"
                  style={{ borderColor: "#e0dbd3", color: "#56524d" }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors"
                style={{ borderColor: "#e0dbd3", color: "#a8a09a" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#ef4444";
                  (e.currentTarget as HTMLElement).style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e0dbd3";
                  (e.currentTarget as HTMLElement).style.color = "#a8a09a";
                }}
              >
                <Trash2 size={11} strokeWidth={2} />
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardRequestsPage() {
  const { data: requests = [], isLoading, error } = useMyRequests();
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [editingRequest, setEditingRequest] = useState<ItemRequest | null>(null);

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const openCount = requests.filter((r) => r.status === "open").length;
  const closedCount = requests.filter((r) => r.status === "closed").length;

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-text">My Requests</h1>
            <p className="text-text-muted mt-1">
              {isLoading
                ? "Loading…"
                : `${requests.length} request${requests.length !== 1 ? "s" : ""} — ${openCount} open`}
            </p>
          </div>
          <Link
            href="/requests/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            New request
          </Link>
        </div>

        {/* Filter tabs */}
        {!isLoading && requests.length > 0 && (
          <div className="flex gap-2">
            {(["all", "open", "closed"] as const).map((f) => {
              const count = f === "all" ? requests.length : f === "open" ? openCount : closedCount;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors capitalize"
                  style={{
                    background: filter === f ? "rgba(79,70,229,0.09)" : "transparent",
                    color: filter === f ? "#4f46e5" : "#78726c",
                    border: filter === f ? "1px solid rgba(79,70,229,0.25)" : "1px solid transparent",
                  }}
                >
                  {f}
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: filter === f ? "rgba(79,70,229,0.12)" : "#f0ece6",
                      color: filter === f ? "#4f46e5" : "#a8a09a",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
              >
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: "#ede9e3" }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-2/5 rounded" style={{ background: "#ede9e3" }} />
                  <div className="h-2.5 w-1/3 rounded" style={{ background: "#e8e4dc" }} />
                </div>
                <div className="h-6 w-16 rounded-lg shrink-0" style={{ background: "#ede9e3" }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-error">Failed to load requests. Please refresh.</p>
        )}

        {/* Empty — no requests */}
        {!isLoading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl"
              style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
            >
              📋
            </div>
            <p className="text-sm font-semibold text-text mb-1">No requests yet</p>
            <p className="text-xs text-text-muted mb-6 max-w-xs">
              Post a request and community sellers will be notified when they list matching items.
            </p>
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "#4f46e5" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#4338ca")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#4f46e5")}
            >
              <Plus size={14} strokeWidth={2.5} />
              Post your first request
            </Link>
          </div>
        )}

        {/* Empty — filtered */}
        {!isLoading && !error && requests.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-text-muted py-10 text-center">
            No {filter} requests.
          </p>
        )}

        {/* List */}
        {!isLoading && filtered.length > 0 && (
          <motion.div
            className="flex flex-col gap-2"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((r) => (
              <RequestRow key={r.id} request={r} onEdit={setEditingRequest} />
            ))}
          </motion.div>
        )}

        {/* Browse link */}
        {!isLoading && (
          <div className="pt-2 border-t border-border">
            <Link
              href="/requests"
              className="text-[13px] font-medium text-text-muted hover:text-text transition-colors"
            >
              Browse all community requests →
            </Link>
          </div>
        )}
      </div>

      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}
    </>
  );
}
