"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { ListingImage, Modal } from "@/components/ui";
import {
  Package,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  KeyRound,
  ChevronRight,
  Gift,
  ShoppingBag,
  Inbox,
  CheckCircle2,
  Star,
} from "lucide-react";
import Link from "next/link";
import {
  useSellerOrders,
  useConfirmOrder,
  useVerifyPickup,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";
import { useBuyerOrders, type BuyerOrder } from "@/lib/hooks/useBuyerOrders";
import {
  PURCHASE_STATUS_STYLE,
  PURCHASE_STATUS_LABEL,
} from "@/lib/constants/orderStatus";
import {
  useMyClaims,
  useSellerClaims,
  useUpdateClaim,
  type MyClaim,
  type SellerClaim,
} from "@/lib/hooks/useClaims";

// ─── Shared ───────────────────────────────────────────────────────────────────

function OrderSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4">
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.12}s` }} />
      <div className="w-20 h-20 rounded-xl shrink-0" style={{ background: '#ede9e3' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-2/3 rounded" style={{ background: '#ede9e3' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#e8e4dc' }} />
        <div className="h-3 w-1/2 rounded" style={{ background: '#e8e4dc' }} />
      </div>
    </div>
  );
}

function EmptyState({
  heading,
  body,
  action,
}: {
  icon?: React.ElementType;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-12 lg:py-20 text-center">
      <div className="relative mb-5 w-44 h-44 lg:w-64 lg:h-64">
        <div
          aria-hidden
          className="absolute"
          style={{
            inset: "-12px",
            background: "#ffffff",
            borderRadius: "62% 38% 46% 54% / 60% 44% 56% 40%",
            boxShadow: "0 8px 40px rgba(55,48,163,0.08)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/empty-listings.svg"
          alt=""
          aria-hidden
          className="relative w-full h-full select-none"
          draggable={false}
        />
      </div>
      <p className="text-base font-semibold text-text mb-2">{heading}</p>
      <p className="text-sm text-text-muted max-w-xs leading-relaxed">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const CLAIM_STATUS_CLS: Record<string, string> = {
  pending: "bg-accent/10 text-accent",
  accepted: "bg-success/10 text-success",
  completed: "bg-border text-text-muted",
  cancelled: "bg-border text-text-subtle",
};

const CLAIM_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completed: "Collected",
  cancelled: "Cancelled",
};

// ─── Sales tab ────────────────────────────────────────────────────────────────

type SalesTab = {
  label: string;
  status: "paid" | "confirmed" | "shipped" | "delivered";
};

const SALES_TABS: SalesTab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Shipped", status: "shipped" },
  { label: "Delivered", status: "delivered" },
];

const SALES_EMPTY: Record<
  string,
  { icon: React.ElementType; heading: string; body: string }
> = {
  paid: {
    icon: ShoppingBag,
    heading: "No new orders yet",
    body: "When a buyer completes payment, their order will land here for you to confirm.",
  },
  confirmed: {
    icon: CheckCircle2,
    heading: "Nothing confirmed yet",
    body: "Orders you confirm will move here. Delivery orders await a dispatcher; pickup orders await the buyer.",
  },
  shipped: {
    icon: Truck,
    heading: "No deliveries in transit",
    body: "Orders picked up by a dispatcher will appear here while in transit.",
  },
  delivered: {
    icon: Package,
    heading: "No deliveries yet",
    body: "Orders confirmed as received will be recorded here.",
  },
};

function PickupCodeEntry({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const { mutate: verify, isPending } = useVerifyPickup();
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <KeyRound
          size={12}
          strokeWidth={2}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle"
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="w-24 rounded-xl border border-border bg-surface pl-7 pr-2 py-2 text-xs font-mono tracking-widest text-text outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>
      <button
        onClick={() => verify({ id: orderId, code })}
        disabled={isPending || code.length !== 4}
        className="rounded-xl bg-success px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Verifying…" : "Confirm pickup"}
      </button>
    </div>
  );
}

function SellerOrderCard({
  order,
  tab,
}: {
  order: SellerOrder;
  tab: SalesTab;
}) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  const firstItem = order.order_items?.[0];
  const extraItems = (order.order_items ?? []).slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row gap-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Images */}
      <div className="flex sm:flex-col gap-2 shrink-0">
        {[firstItem, ...extraItems].map((item, i) =>
          item ? (
            <div
              key={i}
              className="relative w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-surface border border-border"
            >
              {item.listing.images?.[0] ? (
                <ListingImage
                  src={item.listing.images[0]}
                  fill
                  sizes="80px"
                  className="object-cover"
                  alt={item.listing.title}
                />
              ) : (
                <Package
                  size={20}
                  strokeWidth={1.5}
                  className="text-text-subtle"
                />
              )}
            </div>
          ) : null,
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + price + delivery badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <div className="space-y-0.5 mb-1">
              {(order.order_items ?? []).map((item) => (
                <h3
                  key={item.id}
                  className="text-sm font-semibold text-text leading-snug"
                >
                  {item.listing.title}
                </h3>
              ))}
            </div>
            <p className="text-base font-bold text-primary mt-0.5">
              ₦{order.total_price.toLocaleString()}
            </p>
          </div>
          <span
            className={[
              "self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0",
              order.delivery_type === "delivery"
                ? "bg-primary/8 text-primary"
                : "bg-success/8 text-success",
            ].join(" ")}
          >
            {order.delivery_type === "delivery" ? (
              <>
                <Truck size={11} strokeWidth={2} /> Delivery
              </>
            ) : (
              <>
                <MapPin size={11} strokeWidth={2} /> Pickup
              </>
            )}
          </span>
        </div>

        {/* Buyer info — 2-col grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <User
              size={11}
              strokeWidth={2}
              className="shrink-0 text-text-subtle"
            />
            <span className="truncate">{order.buyer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Phone
              size={11}
              strokeWidth={2}
              className="shrink-0 text-text-subtle"
            />
            <span className="truncate">{order.buyer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted col-span-2">
            <Mail
              size={11}
              strokeWidth={2}
              className="shrink-0 text-text-subtle"
            />
            <span className="truncate">{order.buyer_email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted col-span-2">
            <MapPin
              size={11}
              strokeWidth={2}
              className="shrink-0 text-text-subtle"
            />
            <span className="line-clamp-1">{order.buyer_address}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {tab.status === "paid" && (
            <button
              onClick={() => confirm(order.id)}
              disabled={confirming}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {confirming ? "Confirming…" : "Confirm order"}
            </button>
          )}
          {tab.status === "confirmed" && order.delivery_type === "pickup" && (
            <PickupCodeEntry orderId={order.id} />
          )}
          {tab.status === "confirmed" && order.delivery_type === "delivery" && (
            <span className="text-xs rounded-full px-3 py-1.5 font-medium bg-primary/8 text-primary">
              Awaiting dispatcher
            </span>
          )}
          <a
            href={`mailto:${order.buyer_email}?subject=${encodeURIComponent("Your Declutter order")}&body=${encodeURIComponent(`Hi ${order.buyer_name},\n\nThank you for your order.\n\n`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface hover:text-text transition-colors"
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
  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <OrderSkeleton key={i} index={i} />
        ))}
      </div>
    );
  const cfg = SALES_EMPTY[tab.status] ?? SALES_EMPTY.paid;
  if (!orders || orders.length === 0)
    return <EmptyState icon={cfg.icon} heading={cfg.heading} body={cfg.body} />;
  return (
    <div className="flex flex-col gap-4">
      {orders.map((o) => (
        <SellerOrderCard key={o.id} order={o} tab={tab} />
      ))}
    </div>
  );
}


// ─── Purchases tab ────────────────────────────────────────────────────────────

function SellerOrderRow({ order }: { order: BuyerOrder }) {
  const statusStyle =
    PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending;
  const firstItem = order.order_items?.[0];
  const extraCount = (order.order_items?.length ?? 1) - 1;

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
        {firstItem?.listing.images?.[0] ? (
          <ListingImage
            src={firstItem.listing.images[0]}
            fill
            sizes="48px"
            className="object-cover"
            alt={firstItem.listing.title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {firstItem?.listing.title ?? "Order"}
          {extraCount > 0 && (
            <span className="text-text-subtle"> +{extraCount} more</span>
          )}
        </p>
        <p className="text-xs text-primary mt-0.5 font-semibold">
          ₦{order.total_price.toLocaleString()}
        </p>
        {order.seller?.name && (
          <p className="text-[10px] text-text-subtle mt-0.5">
            from {order.seller.name}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={statusStyle}
        >
          {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-text-subtle">
          {order.delivery_type === "delivery" ? (
            <>
              <Truck size={9} strokeWidth={2} /> Delivery
            </>
          ) : (
            <>
              <MapPin size={9} strokeWidth={2} /> Pickup
            </>
          )}
        </span>
        {["delivered", "completed"].includes(order.status) && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: "#f59e0b" }}>
            <Star size={9} strokeWidth={0} fill="#f59e0b" /> Rate seller
          </span>
        )}
      </div>
      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="text-border-strong"
      />
    </Link>
  );
}

type CheckoutGroup = {
  paystackReference: string | null;
  orders: BuyerOrder[];
  createdAt: string;
};

function groupByCheckout(orders: BuyerOrder[]): CheckoutGroup[] {
  const map = new Map<string, BuyerOrder[]>();
  for (const order of orders) {
    const key = order.paystack_reference ?? order.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }
  return Array.from(map.entries()).map(([, group]) => ({
    paystackReference: group[0].paystack_reference,
    orders: group,
    createdAt: group[0].created_at,
  }));
}

function CheckoutGroupCard({ group }: { group: CheckoutGroup }) {
  const grandTotal = group.orders.reduce((s, o) => s + o.total_price, 0);
  const date = new Date(group.createdAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const multiVendor = group.orders.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {multiVendor && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
            {group.orders.length} vendors · {date}
          </span>
          <span className="text-xs font-semibold text-text">
            ₦{grandTotal.toLocaleString()}
          </span>
        </div>
      )}
      <div className={multiVendor ? "divide-y divide-border" : ""}>
        {group.orders.map((order) => (
          <SellerOrderRow key={order.id} order={order} />
        ))}
      </div>
    </motion.div>
  );
}

function PurchasesPanel() {
  const { data: orders, isLoading } = useBuyerOrders();

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <OrderSkeleton key={i} index={i} />
        ))}
      </div>
    );

  if (!orders || orders.length === 0)
    return (
      <EmptyState
        icon={ShoppingBag}
        heading="No purchases yet"
        body="When you buy something on Declutter, your orders will appear here."
        action={
          <Link
            href="/"
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-text-muted hover:bg-surface transition-colors"
          >
            Browse listings
          </Link>
        }
      />
    );

  const groups = groupByCheckout(orders);
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <CheckoutGroupCard
          key={group.paystackReference ?? group.orders[0].id}
          group={group}
        />
      ))}
    </div>
  );
}

// ─── Claims tab ───────────────────────────────────────────────────────────────

function MyClaimCard({ claim }: { claim: MyClaim }) {
  const { mutate: updateClaim, isPending } = useUpdateClaim();
  const img = claim.listing.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card p-4 flex gap-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
        {img ? (
          <ListingImage
            src={img}
            fill
            sizes="64px"
            className="object-cover"
            alt={claim.listing.title}
          />
        ) : (
          <Package size={18} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-text truncate">
            {claim.listing.title}
          </p>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CLAIM_STATUS_CLS[claim.status] ?? ""}`}
          >
            {CLAIM_STATUS_LABEL[claim.status]}
          </span>
        </div>
        <p className="text-xs text-text-subtle mb-1">
          from {claim.listing.seller?.name ?? "Seller"} · {claim.listing.area}
        </p>
        {claim.status === "accepted" && claim.pickup_address && (
          <p className="text-xs rounded-lg px-2 py-1.5 mb-2 bg-success/8 text-success">
            Pickup: {claim.pickup_address}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {claim.status === "pending" && (
            <button
              onClick={() => updateClaim({ id: claim.id, status: "cancelled" })}
              disabled={isPending}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {claim.status === "accepted" && (
            <button
              onClick={() => updateClaim({ id: claim.id, status: "completed" })}
              disabled={isPending}
              className="rounded-xl bg-success px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {isPending ? "Updating…" : "Mark as Collected"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MyClaimsPanel() {
  const { data: claims, isLoading } = useMyClaims();

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <OrderSkeleton key={i} index={i} />
        ))}
      </div>
    );

  const active = (claims ?? []).filter((c) => c.status !== "cancelled");

  if (active.length === 0)
    return (
      <EmptyState
        icon={Gift}
        heading="No active claims"
        body="When you claim a free item, it will appear here while you wait for the seller to accept."
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {active.map((c) => (
        <MyClaimCard key={c.id} claim={c} />
      ))}
    </div>
  );
}

function AcceptClaimModal({
  claim,
  updateClaim,
  isPending,
  onClose,
}: {
  claim: SellerClaim;
  updateClaim: ReturnType<typeof useUpdateClaim>["mutate"];
  isPending: boolean;
  onClose: () => void;
}) {
  const [address, setAddress] = useState("");

  function handleAccept() {
    if (!address.trim()) return;
    updateClaim(
      { id: claim.id, status: "accepted", pickup_address: address.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Accept claim">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Enter the pickup address you want to share with{" "}
          <strong className="text-text">
            {claim.buyer.name ?? "the buyer"}
          </strong>
          .
        </p>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 12 Bode Thomas St, Surulere, Lagos"
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!address.trim() || isPending}
            className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {isPending ? "Accepting…" : "Accept & share address"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SellerClaimCard({ claim }: { claim: SellerClaim }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const { mutate: updateClaim, isPending } = useUpdateClaim();
  const img = claim.listing.images?.[0];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card p-4 flex gap-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
          {img ? (
            <ListingImage
              src={img}
              fill
              sizes="64px"
              className="object-cover"
              alt={claim.listing.title}
            />
          ) : (
            <Package size={18} strokeWidth={1.5} className="text-text-subtle" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-text truncate">
              {claim.listing.title}
            </p>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CLAIM_STATUS_CLS[claim.status] ?? ""}`}
            >
              {CLAIM_STATUS_LABEL[claim.status]}
            </span>
          </div>
          <p className="text-xs text-text-subtle mb-2">
            claimed by {claim.buyer.name ?? "Buyer"} ·{" "}
            {new Date(claim.claimed_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </p>
          <div className="flex items-center gap-2">
            {claim.status === "pending" && (
              <>
                <button
                  onClick={() => setIsAccepting(true)}
                  disabled={isAccepting}
                  className="rounded-xl bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    updateClaim({ id: claim.id, status: "cancelled" })
                  }
                  disabled={isPending}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
            {claim.status === "accepted" && (
              <button
                onClick={() =>
                  updateClaim({ id: claim.id, status: "completed" })
                }
                disabled={isPending}
                className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
              >
                {isPending ? "Updating…" : "Mark as Collected"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
      {isAccepting && (
        <AcceptClaimModal
          claim={claim}
          updateClaim={updateClaim}
          isPending={isPending}
          onClose={() => setIsAccepting(false)}
        />
      )}
    </>
  );
}

function IncomingClaimsPanel() {
  const { data: claims, isLoading } = useSellerClaims();

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <OrderSkeleton key={i} index={i} />
        ))}
      </div>
    );

  const active = (claims ?? []).filter(
    (c) => c.status !== "cancelled" && c.status !== "completed",
  );

  if (active.length === 0)
    return (
      <EmptyState
        icon={Inbox}
        heading="No incoming claims"
        body="When someone claims one of your free listings, it will appear here."
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {active.map((c) => (
        <SellerClaimCard key={c.id} claim={c} />
      ))}
    </div>
  );
}

// ─── Sales panel (restored) ───────────────────────────────────────────────────

function SalesPanel() {
  const [activeTab, setActiveTab] = useState<SalesTab>(SALES_TABS[0]);
  return (
    <div className="space-y-5">
      {/* Sub-tab row — underline style */}
      <div className="flex gap-0 border-b border-border">
        {SALES_TABS.map((tab) => {
          const isActive = activeTab.status === tab.status;
          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab)}
              className={[
                "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive ? "text-primary" : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="sales-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <SalesTabContent tab={activeTab} />
    </div>
  );
}

// ─── Claims panel (restored) ──────────────────────────────────────────────────

type ClaimsSubTab = "mine" | "incoming";

function ClaimsPanel() {
  const [subTab, setSubTab] = useState<ClaimsSubTab>("mine");
  return (
    <div className="space-y-5">
      {/* Sub-tab row — underline style */}
      <div className="flex gap-0 border-b border-border">
        {(["mine", "incoming"] as ClaimsSubTab[]).map((tab) => {
          const isActive = subTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={[
                "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive ? "text-primary" : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              {tab === "mine" ? "My Claims" : "Incoming"}
              {isActive && (
                <motion.span
                  layoutId="claims-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
      {subTab === "mine" ? <MyClaimsPanel /> : <IncomingClaimsPanel />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TopTab = "sales" | "purchases" | "claims";

const TOP_TAB_LABELS: Record<TopTab, string> = {
  sales: "Sales",
  purchases: "Purchases",
  claims: "Claims",
};

const TOP_TAB_SUBTITLES: Record<TopTab, string> = {
  sales: "Manage orders from your buyers.",
  purchases: "Track everything you've bought on Declutter.",
  claims: "Manage free item claims — yours and incoming.",
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab");
  const topTab: TopTab =
    rawTab === "purchases" ? "purchases" : rawTab === "claims" ? "claims" : "sales";

  function setTopTab(tab: TopTab) {
    router.replace(`/dashboard/orders?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-text tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-text-muted">{TOP_TAB_SUBTITLES[topTab]}</p>
      </motion.div>

      {/* Top-level tabs — pill style */}
      <div className="inline-flex gap-1 bg-surface rounded-xl p-1 border border-border">
        {(["sales", "purchases", "claims"] as TopTab[]).map((tab) => {
          const isActive = topTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setTopTab(tab)}
              className={[
                "relative rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-150",
                isActive ? "text-text" : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              {isActive && (
                <motion.span
                  layoutId="top-tab-bg"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{TOP_TAB_LABELS[tab]}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        key={topTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {topTab === "sales" ? <SalesPanel /> : topTab === "purchases" ? <PurchasesPanel /> : <ClaimsPanel />}
      </motion.div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <OrderSkeleton />
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
