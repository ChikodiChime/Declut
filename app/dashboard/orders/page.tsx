// app/dashboard/orders/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import {
  Package,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  useSellerOrders,
  useConfirmOrder,
  useVerifyPickup,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";
import { useBuyerOrders, type BuyerOrder } from "@/lib/hooks/useBuyerOrders";
import { PURCHASE_STATUS_STYLE, PURCHASE_STATUS_LABEL } from "@/lib/constants/orderStatus";

// ─── Shared ───────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 flex gap-4">
      <div className="w-20 h-20 rounded-xl shrink-0" style={{ background: "#f0ece5" }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-2/3 rounded" style={{ background: "#f0ece5" }} />
        <div className="h-3 w-1/3 rounded" style={{ background: "#f0ece5" }} />
        <div className="h-3 w-1/2 rounded" style={{ background: "#f0ece5" }} />
      </div>
    </div>
  );
}

// ─── Sales tab ────────────────────────────────────────────────────────────────

type SalesTab = { label: string; status: "paid" | "confirmed" | "shipped" | "delivered" };

const SALES_TABS: SalesTab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Shipped", status: "shipped" },
  { label: "Delivered", status: "delivered" },
];

const SALES_EMPTY_STATE: Record<string, { emoji: string; heading: string; body: string }> = {
  paid: {
    emoji: "🛍️",
    heading: "No new orders yet",
    body: "When a buyer completes payment, their order will land here for you to confirm.",
  },
  confirmed: {
    emoji: "✅",
    heading: "Nothing confirmed yet",
    body: "Orders you confirm will move here. Delivery orders await a dispatcher; pickup orders await the buyer.",
  },
  shipped: {
    emoji: "🚚",
    heading: "No deliveries in transit",
    body: "Orders picked up by a dispatcher will appear here while in transit.",
  },
  delivered: {
    emoji: "📦",
    heading: "No deliveries yet",
    body: "Orders confirmed as received will be recorded here.",
  },
};

function SalesEmptyState({ status }: { status: string }) {
  const config = SALES_EMPTY_STATE[status] ?? SALES_EMPTY_STATE.paid;
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="relative mb-6">
        <div
          className="h-20 w-20 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)",
            boxShadow: "0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl leading-none">{config.emoji}</span>
        </div>
      </div>
      <p className="text-base font-semibold mb-2" style={{ color: "#16130f" }}>{config.heading}</p>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#a8a09a" }}>{config.body}</p>
    </div>
  );
}

function PickupCodeEntry({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const { mutate: verify, isPending } = useVerifyPickup();
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#a8a09a" }} />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="w-24 rounded-xl border pl-7 pr-2 py-2 text-xs font-mono tracking-widest outline-none focus:ring-2"
          style={{ borderColor: "#e8e4dc", background: "#faf9f7", color: "#16130f" }}
        />
      </div>
      <button
        onClick={() => verify({ id: orderId, code })}
        disabled={isPending || code.length !== 4}
        className="rounded-xl px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: "#10b981" }}
      >
        {isPending ? "Verifying…" : "Confirm pickup"}
      </button>
    </div>
  );
}

function SellerOrderCard({ order, tab }: { order: SellerOrder; tab: SalesTab }) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row gap-4"
      style={{ borderColor: "#e8e4dc" }}
    >
      <div
        className="relative w-full sm:w-20 h-40 sm:h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "#f0ece5" }}
      >
        {order.listing.images?.[0] ? (
          <CldImage src={order.listing.images[0]} fill sizes="80px" className="object-cover" alt={order.listing.title} />
        ) : (
          <Package size={22} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>{order.listing.title}</h3>
            <p className="text-base mt-0.5" style={{ color: "#4f46e5" }}>₦{order.total_price.toLocaleString()}</p>
          </div>
          <span
            className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0"
            style={
              order.delivery_type === "delivery"
                ? { background: "rgba(79,70,229,0.08)", color: "#4f46e5" }
                : { background: "rgba(16,185,129,0.08)", color: "#10b981" }
            }
          >
            {order.delivery_type === "delivery" ? <Truck size={11} strokeWidth={2} /> : <MapPin size={11} strokeWidth={2} />}
            {order.delivery_type === "delivery" ? "Delivery" : "Pickup"}
          </span>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <User size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Mail size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Phone size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <MapPin size={11} strokeWidth={2} className="shrink-0" /><span className="line-clamp-1">{order.buyer_address}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tab.status === "paid" && (
            <button
              onClick={() => confirm(order.id)}
              disabled={confirming}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "#4f46e5" }}
            >
              {confirming ? "Confirming…" : "Confirm order"}
            </button>
          )}
          {tab.status === "confirmed" && order.delivery_type === "pickup" && (
            <PickupCodeEntry orderId={order.id} />
          )}
          {tab.status === "confirmed" && order.delivery_type === "delivery" && (
            <span className="text-xs rounded-full px-3 py-1.5 font-medium" style={{ background: "rgba(79,70,229,0.08)", color: "#4f46e5" }}>
              Awaiting dispatcher
            </span>
          )}
          <a
            href={`mailto:${order.buyer_email}?subject=${encodeURIComponent(`Your Declutter order — ${order.listing.title}`)}&body=${encodeURIComponent(`Hi ${order.buyer_name},\n\nThank you for your order.\n\n`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[#f5f1eb]"
            style={{ borderColor: "#e8e4dc", color: "#78726c" }}
          >
            <Mail size={12} strokeWidth={2} />
            Contact buyer
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function SalesTabContent({ tab }: { tab: SalesTab }) {
  const { data: orders, isLoading } = useSellerOrders(tab.status);
  if (isLoading) return <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}</div>;
  if (!orders || orders.length === 0) return <SalesEmptyState status={tab.status} />;
  return <div className="flex flex-col gap-4">{orders.map((o) => <SellerOrderCard key={o.id} order={o} tab={tab} />)}</div>;
}

function SalesPanel() {
  const [activeTab, setActiveTab] = useState<SalesTab>(SALES_TABS[0]);
  return (
    <div className="space-y-6">
      <div className="inline-flex gap-0.5 rounded-full p-0.5" style={{ background: "#f0ece5" }}>
        {SALES_TABS.map((tab) => {
          const isActive = activeTab.status === tab.status;
          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: isActive ? "#4f46e5" : "transparent",
                color: isActive ? "white" : "#78726c",
                boxShadow: isActive ? "0 1px 4px rgba(79,70,229,0.35)" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <SalesTabContent tab={activeTab} />
    </div>
  );
}

// ─── Purchases tab ────────────────────────────────────────────────────────────

function PurchaseRow({ order }: { order: BuyerOrder }) {
  const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/dashboard/orders/${order.id}`}
        className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-[#faf9f7]"
        style={{ borderColor: "#e8e4dc" }}
      >
        <div
          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "#f0ece5" }}
        >
          {order.listing.images?.[0] ? (
            <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#16130f" }}>{order.listing.title}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "#4f46e5" }}>₦{order.total_price.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={statusStyle}
            >
              {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#a8a09a" }}>
              {order.delivery_type === "delivery" ? <><Truck size={9} strokeWidth={2} /> Delivery</> : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
            </span>
          </div>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#c8c2bb" }} />
      </Link>
    </motion.div>
  );
}

function PurchasesPanel() {
  const { data: orders, isLoading } = useBuyerOrders();

  if (isLoading) {
    return <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)",
            boxShadow: "0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <span className="text-3xl">🛍️</span>
        </div>
        <p className="text-base font-semibold mb-2" style={{ color: "#16130f" }}>No purchases yet</p>
        <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: "#a8a09a" }}>
          When you buy something on Declutter, your orders will appear here.
        </p>
        <Link
          href="/listings"
          className="rounded-xl border px-5 py-2 text-sm font-medium transition-colors hover:bg-card"
          style={{ borderColor: "#e8e4dc", color: "#78726c" }}
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => <PurchaseRow key={order.id} order={order} />)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TopTab = "sales" | "purchases";

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topTab: TopTab = searchParams.get("tab") === "purchases" ? "purchases" : "sales";

  function setTopTab(tab: TopTab) {
    router.replace(`/dashboard/orders?tab=${tab}`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>Orders</h1>
        <p className="mt-1 text-sm" style={{ color: "#78726c" }}>
          {topTab === "sales" ? "Manage orders from buyers." : "Track everything you've bought on Declutter."}
        </p>
      </motion.div>

      {/* Top toggle */}
      <div className="inline-flex gap-0.5 rounded-full p-0.5" style={{ background: "#e8e4dc" }}>
        {(["sales", "purchases"] as TopTab[]).map((tab) => {
          const isActive = topTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setTopTab(tab)}
              className="rounded-full px-5 py-2 text-xs font-semibold capitalize transition-all duration-200"
              style={{
                background: isActive ? "white" : "transparent",
                color: isActive ? "#16130f" : "#78726c",
                boxShadow: isActive ? "0 1px 4px rgba(22,19,15,0.10)" : "none",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {topTab === "sales" ? <SalesPanel /> : <PurchasesPanel />}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="space-y-6 max-w-3xl"><OrderSkeleton /></div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
