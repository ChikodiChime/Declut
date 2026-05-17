"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import {
  Package,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  ShoppingBag,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  useSellerOrders,
  useConfirmOrder,
  useDeliverOrder,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";

type Tab = { label: string; status: "paid" | "confirmed" | "delivered" };

const TABS: Tab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Delivered", status: "delivered" },
];

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

function EmptyState({ tab }: { tab: string }) {
  const icons: Record<string, React.ElementType> = {
    New: Clock,
    Confirmed: CheckCircle2,
    Delivered: ShoppingBag,
  };
  const Icon = icons[tab] ?? Clock;
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
        style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
      >
        <Icon size={24} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "#16130f" }}>
        No {tab.toLowerCase()} orders
      </p>
      <p className="mt-1 text-xs" style={{ color: "#a8a09a" }}>
        {tab === "New"
          ? "New paid orders from buyers will appear here."
          : tab === "Confirmed"
          ? "Orders you have confirmed will appear here."
          : "Orders you have marked as delivered will appear here."}
      </p>
    </div>
  );
}

function OrderCard({ order, tab }: { order: SellerOrder; tab: Tab }) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  const { mutate: deliver, isPending: delivering } = useDeliverOrder();

  const isPending = confirming || delivering;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row gap-4"
      style={{ borderColor: "#e8e4dc" }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full sm:w-20 h-40 sm:h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "#f0ece5" }}
      >
        {order.listing.images?.[0] ? (
          <CldImage
            src={order.listing.images[0]}
            fill
            sizes="80px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={22} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>
              {order.listing.title}
            </h3>
            <p className="font-display text-base mt-0.5" style={{ color: "#4f46e5" }}>
              ₦{order.total_price.toLocaleString()}
            </p>
          </div>
          <span
            className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0"
            style={
              order.delivery_type === "delivery"
                ? { background: "rgba(79,70,229,0.08)", color: "#4f46e5" }
                : { background: "rgba(16,185,129,0.08)", color: "#10b981" }
            }
          >
            {order.delivery_type === "delivery" ? (
              <Truck size={11} strokeWidth={2} />
            ) : (
              <MapPin size={11} strokeWidth={2} />
            )}
            {order.delivery_type === "delivery" ? "Delivery" : "Pickup"}
          </span>
        </div>

        {/* Buyer info */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <User size={11} strokeWidth={2} className="shrink-0" />
            <span>{order.buyer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Mail size={11} strokeWidth={2} className="shrink-0" />
            <span>{order.buyer_email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Phone size={11} strokeWidth={2} className="shrink-0" />
            <span>{order.buyer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <MapPin size={11} strokeWidth={2} className="shrink-0" />
            <span className="line-clamp-1">{order.buyer_address}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {tab.status === "paid" && (
            <button
              onClick={() => confirm(order.id)}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "#4f46e5" }}
            >
              {confirming ? "Confirming…" : "Confirm order"}
            </button>
          )}
          {tab.status === "confirmed" && (
            <button
              onClick={() => deliver(order.id)}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "#10b981" }}
            >
              {delivering ? "Delivering…" : "Mark as delivered"}
            </button>
          )}
          <a
            href={`mailto:${order.buyer_email}?subject=${encodeURIComponent(`Your Declutter order — ${order.listing.title}`)}&body=${encodeURIComponent(`Hi ${order.buyer_name},\n\nThank you for your order.\n\n`)}`}
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

function TabContent({ tab }: { tab: Tab }) {
  const { data: orders, isLoading } = useSellerOrders(tab.status);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return <EmptyState tab={tab.label} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} tab={tab} />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>
          Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#78726c" }}>
          Manage orders from buyers.
        </p>
      </motion.div>

      {/* Tabs */}
      <div
        className="inline-flex gap-0.5 rounded-full p-0.5"
        style={{ background: "#f0ece5" }}
      >
        {TABS.map((tab) => {
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

      {/* Tab content */}
      <TabContent tab={activeTab} />
    </div>
  );
}
