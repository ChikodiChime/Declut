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
import { groupByCheckout, type CheckoutGroup } from "@/lib/utils/orders";

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

const SALES_STATUS_LABEL: Record<string, string> = {
  paid: "New",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
};

const SALES_STATUS_STYLE: Record<string, React.CSSProperties> = {
  paid:      { background: "rgba(217,119,6,0.1)",  color: "#d97706" },
  confirmed: { background: "rgba(55,48,163,0.08)", color: "#3730a3" },
  shipped:   { background: "rgba(124,58,237,0.08)",color: "#7c3aed" },
  delivered: { background: "rgba(5,150,105,0.08)", color: "#059669" },
};

const SALES_STATUS_COLOR: Record<string, string> = {
  paid:      "#d97706",
  confirmed: "#3730a3",
  shipped:   "#7c3aed",
  delivered: "#059669",
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

function SellerOrderCard({ order }: { order: SellerOrder }) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  const items = order.order_items ?? [];
  const visibleItems = items.slice(0, 3);
  const extraCount = items.length - visibleItems.length;
  const accentColor = SALES_STATUS_COLOR[order.status] ?? "#6b7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Status accent bar */}
      <div className="h-[3px] w-full" style={{ background: accentColor }} />

      <div className="p-5">
        {/* Top: images + item info */}
        <div className="flex gap-3 mb-4">
          {/* Thumbnail strip */}
          <div className="flex gap-1.5 shrink-0">
            {visibleItems.map((item, i) => (
              <div
                key={i}
                className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface border border-border flex items-center justify-center shrink-0"
              >
                {item.listing.images?.[0] ? (
                  <ListingImage
                    src={item.listing.images[0]}
                    fill
                    sizes="56px"
                    className="object-cover"
                    alt={item.listing.title}
                  />
                ) : (
                  <Package size={18} strokeWidth={1.5} className="text-text-subtle" />
                )}
                {i === visibleItems.length - 1 && extraCount > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(0,0,0,0.48)" }}
                  >
                    <span className="text-white text-xs font-bold">+{extraCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Title + price */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                {items.map((item) => (
                  <p key={item.id} className="text-sm font-semibold text-text leading-snug truncate">
                    {item.listing.title}
                  </p>
                ))}
              </div>
              <p className="text-base font-bold shrink-0" style={{ color: accentColor }}>
                ₦{order.total_price.toLocaleString()}
              </p>
            </div>

            {/* Buyer + delivery type */}
            <div className="flex items-center gap-2">
              <User size={10} strokeWidth={2} className="text-text-subtle shrink-0" />
              <span className="text-xs text-text-muted truncate">{order.buyer_name}</span>
              <span className="text-text-subtle text-[10px]">·</span>
              <span className="text-xs text-text-muted">{order.buyer_phone}</span>
              <span
                className={[
                  "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                  order.delivery_type === "delivery" ? "bg-primary/8 text-primary" : "bg-success/8 text-success",
                ].join(" ")}
              >
                {order.delivery_type === "delivery"
                  ? <><Truck size={9} strokeWidth={2} /> Delivery</>
                  : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={10} strokeWidth={2} className="text-text-subtle shrink-0" />
              <p className="text-xs text-text-subtle truncate">{order.buyer_address}</p>
            </div>
          </div>
        </div>

        {/* Action area */}
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          {order.status === "paid" && (
            <button
              onClick={() => confirm(order.id)}
              disabled={confirming}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: accentColor }}
            >
              {confirming ? "Confirming…" : "Confirm order"}
            </button>
          )}
          {order.status === "confirmed" && order.delivery_type === "pickup" && (
            <div className="flex-1">
              <PickupCodeEntry orderId={order.id} />
            </div>
          )}
          {order.status === "confirmed" && order.delivery_type === "delivery" && (
            <span
              className="flex-1 text-center text-xs rounded-xl px-3 py-2.5 font-medium"
              style={{ background: "rgba(55,48,163,0.06)", color: "#3730a3" }}
            >
              Awaiting dispatcher
            </span>
          )}
          <a
            href={`mailto:${order.buyer_email}?subject=${encodeURIComponent("Your Declutter order")}&body=${encodeURIComponent(`Hi ${order.buyer_name},\n\nThank you for your order.\n\n`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-text-muted hover:bg-surface hover:text-text transition-colors shrink-0"
          >
            <Mail size={12} strokeWidth={2} />
            Contact
          </a>
        </div>
      </div>
    </motion.div>
  );
}

const STATUS_SORT_ORDER = ['paid', 'confirmed', 'shipped', 'delivered']

type SalesFilter = 'all' | 'paid' | 'confirmed' | 'shipped' | 'delivered'

const FILTER_CHIPS: { label: string; value: SalesFilter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'New',       value: 'paid' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped',   value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
]

function SalesContent() {
  const { data: orders, isLoading } = useSellerOrders()
  const [filter, setFilter] = useState<SalesFilter>('all')

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <OrderSkeleton key={i} index={i} />
        ))}
      </div>
    )

  const sorted = [...(orders ?? [])].sort(
    (a, b) => STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status)
  )
  const visible = filter === 'all' ? sorted : sorted.filter((o) => o.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map(({ label, value }) => {
          const count = value === 'all'
            ? (orders ?? []).length
            : (orders ?? []).filter((o) => o.status === value).length
          const isActive = filter === value
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={
                isActive
                  ? (SALES_STATUS_STYLE[value] ?? { background: 'var(--color-text)', color: '#fff' })
                  : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
              {label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={
                    isActive
                      ? { background: 'rgba(0,0,0,0.15)', color: 'inherit' }
                      : { background: 'var(--color-border)', color: 'var(--color-text-subtle)' }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          heading={filter === 'all' ? 'No active orders' : `No ${FILTER_CHIPS.find(c => c.value === filter)?.label.toLowerCase()} orders`}
          body={filter === 'all'
            ? 'When a buyer completes payment, their order will appear here for you to manage.'
            : 'Try a different filter or check back later.'}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((o) => (
            <SellerOrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  )
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

// ─── Sales panel ─────────────────────────────────────────────────────────────

function SalesPanel() { return <SalesContent /> }

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
