export const PURCHASE_STATUS_STYLE: Record<string, { background: string; color: string }> = {
  pending:   { background: "rgba(251,191,36,0.12)",  color: "#d97706" },
  paid:      { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  confirmed: { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  shipped:   { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  delivered: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  completed: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  cancelled: { background: "rgba(239,68,68,0.08)",   color: "#ef4444" },
};

export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  paid:      "Confirmed",
  confirmed: "Confirmed",
  shipped:   "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};
