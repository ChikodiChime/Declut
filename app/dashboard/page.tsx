"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Package,
  PlusCircle,
  TrendingUp,
  Eye,
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  Tag,
  Truck,
  MapPin,
  Banknote,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  UserCircle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMyListings } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";
import { useBuyerOrders } from "@/lib/hooks/useBuyerOrders";
import { useSellerEarnings } from "@/lib/hooks/useSellerEarnings";
import { useSellerOrders, useConfirmOrder } from "@/lib/hooks/useSellerOrders";
import { ListingImage } from "@/components/ui";
import { PURCHASE_STATUS_STYLE, PURCHASE_STATUS_LABEL } from "@/lib/constants/orderStatus";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function isOrderUrgent(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 6 * 3600000;
}

function OnboardingChecklist({
  me,
  listings,
  isLoadingListings,
  isLoadingMe,
}: {
  me: Record<string, unknown> | null | undefined;
  listings: unknown[];
  isLoadingListings: boolean;
  isLoadingMe: boolean;
}) {
  const steps = [
    {
      id: "profile",
      icon: UserCircle,
      number: "01",
      title: "Complete your profile",
      desc: "Add a photo so buyers know who they're dealing with.",
      href: "/dashboard/profile",
      color: "text-primary",
      bgColor: "bg-primary/10",
      done: !!me?.avatar_url,
    },
    {
      id: "paystack",
      icon: CreditCard,
      number: "02",
      title: "Connect payouts",
      desc: "Add your bank account to receive payments from your sales.",
      href: "/dashboard/billing",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      done: !!(me as { paystack_onboarding_complete?: boolean })?.paystack_onboarding_complete,
    },
    {
      id: "listing",
      icon: PlusCircle,
      number: "03",
      title: "Create your first listing",
      desc: "List something for sale, give it away, or donate it.",
      href: "/dashboard/listings/new",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      done: !isLoadingListings && listings.length > 0,
    },
  ];

  if (isLoadingMe || isLoadingListings) return null;

  const completedCount = steps.filter((s) => s.done).length;
  if (completedCount === steps.length) return null;

  return (
    <motion.div {...fadeUp(0.49)} className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-text">Finish setting up your account</h2>
        <span className="text-xs text-text-muted">{completedCount} of {steps.length} done</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={[
                "relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-150",
                step.done
                  ? "border-border bg-surface opacity-60"
                  : "border-border bg-card hover:border-border-strong hover:shadow-sm",
              ].join(" ")}
            >
              {/* Step number */}
              <span className="absolute top-3 right-3 text-[11px] font-bold text-text-subtle">
                {step.number}
              </span>

              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${step.done ? "bg-success/10" : step.bgColor}`}>
                {step.done
                  ? <Check size={16} className="text-success" strokeWidth={2.5} />
                  : <Icon size={16} className={step.color} strokeWidth={1.75} />
                }
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className={`text-sm font-semibold mb-0.5 ${step.done ? "line-through text-text-muted" : "text-text"}`}>
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-text-muted leading-relaxed">{step.desc}</p>
                )}
              </div>

              {/* CTA */}
              {!step.done && (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors self-start"
                >
                  Start <ArrowRight size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function PendingOrdersCard() {
  const { data: orders, isLoading } = useSellerOrders("paid");
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();

  if (isLoading || !orders || orders.length === 0) return null;

  return (
    <motion.div {...fadeUp(0.42)} className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-text">Action needed</h2>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
            {orders.length}
          </span>
        </div>
        <Link
          href="/dashboard/orders?tab=sales"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      <p className="text-xs text-text-subtle mb-4">
        Orders auto-cancel after 24 hours if not confirmed.
      </p>

      <div className="flex flex-col gap-2">
        {orders.slice(0, 3).map((order) => {
          const firstItem = order.order_items?.[0];
          const extraCount = (order.order_items?.length ?? 1) - 1;
          const isUrgent = isOrderUrgent(order.created_at);

          return (
            <div
              key={order.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <div className="relative w-10 h-10 rounded-lg bg-surface overflow-hidden shrink-0 flex items-center justify-center">
                {firstItem?.listing.images?.[0] ? (
                  <ListingImage
                    src={firstItem.listing.images[0]}
                    fill
                    sizes="40px"
                    className="object-cover"
                    alt={firstItem.listing.title}
                  />
                ) : (
                  <Package size={16} className="text-text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">
                  {firstItem?.listing.title ?? "Order"}
                  {extraCount > 0 && (
                    <span className="text-text-subtle"> +{extraCount} more</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-muted">
                    {order.buyer_name} · ₦{order.total_price.toLocaleString()}
                  </span>
                  <span
                    className={[
                      "text-[11px] font-medium",
                      isUrgent ? "text-red-500" : "text-text-subtle",
                    ].join(" ")}
                  >
                    {timeAgo(order.created_at)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => confirm(order.id)}
                disabled={confirming}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  };
}

export default function DashboardPage() {
  const { data: me, isLoading: isLoadingMe } = useMe();
  const { data, isLoading } = useMyListings();
  const listings = data?.listings ?? [];
  const { data: purchases } = useBuyerOrders();
  const { data: earningsData } = useSellerEarnings();
  const { data: pendingOrders } = useSellerOrders("paid");
  const recentPurchases = (purchases ?? []).slice(0, 3);

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "available").length,
    sold: listings.filter((l) => l.status === "sold").length,
    donated: listings.filter((l) => l.status === "donated").length,
  };

  const sliderRef = useRef<HTMLDivElement>(null);
  function scrollSlider(dir: "left" | "right") {
    sliderRef.current?.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-text">
          {greeting}
          {me?.name ? `, ${me.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-text-muted mt-1">
          Here&apos;s what&apos;s happening with your listings.
        </p>
      </motion.div>

      {/* Stats slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Stats</p>
          <div className="flex gap-1">
            <button
              onClick={() => scrollSlider("left")}
              className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => scrollSlider("right")}
              className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div ref={sliderRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        <motion.div {...fadeUp(0)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Total earnings"
            value={earningsData ? `₦${earningsData.summary.total_net.toLocaleString()}` : "—"}
            icon={Banknote}
            color="text-amber-600"
            bgColor="bg-amber-500/10"
            lineColor="bg-amber-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.07)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Pending orders"
            value={pendingOrders ? pendingOrders.length : "—"}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-500/10"
            lineColor="bg-orange-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.14)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Available"
            value={isLoading ? "—" : stats.active}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-500/10"
            lineColor="bg-green-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.21)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Total listings"
            value={isLoading ? "—" : stats.total}
            icon={Package}
            color="text-primary"
            bgColor="bg-primary/10"
            lineColor="bg-primary"
          />
        </motion.div>
        <motion.div {...fadeUp(0.28)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Sold"
            value={isLoading ? "—" : stats.sold}
            icon={ShoppingBag}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
            lineColor="bg-blue-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.35)} className="w-72 shrink-0 snap-start">
          <StatCard
            label="Donated"
            value={isLoading ? "—" : stats.donated}
            icon={Eye}
            color="text-purple-600"
            bgColor="bg-purple-500/10"
            lineColor="bg-purple-500"
          />
        </motion.div>
        </div>
      </div>

      <OnboardingChecklist me={me} listings={listings} isLoadingListings={isLoading} isLoadingMe={isLoadingMe} />

      {/* Quick actions */}
      <motion.div {...fadeUp(0.42)}>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle mb-3">Quick actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          <Link href="/dashboard/listings/new" className="group">
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(55,48,163,0.12)" }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="bg-card rounded-xl border border-border p-5 cursor-pointer flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PlusCircle size={18} className="text-primary" strokeWidth={1.75} />
                </div>
                <ArrowUpRight size={15} className="text-border-strong group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 mt-0.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text group-hover:text-primary transition-colors duration-150">New listing</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">Sell, give away, or donate an item</p>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/listings" className="group">
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(55,48,163,0.12)" }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="bg-card rounded-xl border border-border p-5 cursor-pointer flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package size={18} className="text-primary" strokeWidth={1.75} />
                </div>
                <ArrowUpRight size={15} className="text-border-strong group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 mt-0.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text group-hover:text-primary transition-colors duration-150">My listings</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">Manage and update your items</p>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/profile" className="group">
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(55,48,163,0.12)" }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="bg-card rounded-xl border border-border p-5 cursor-pointer flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCircle size={18} className="text-primary" strokeWidth={1.75} />
                </div>
                <ArrowUpRight size={15} className="text-border-strong group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 mt-0.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text group-hover:text-primary transition-colors duration-150">Your profile</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">Update your account details</p>
              </div>
            </motion.div>
          </Link>

        </div>
      </motion.div>

      <PendingOrdersCard />

      {/* Recent listings + purchases */}
      {(listings.length > 0 || recentPurchases.length > 0) && (
        <motion.div {...fadeUp(0.49)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {listings.length > 0 && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text">Recent listings</h2>
                <Link href="/dashboard/listings" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="space-y-2">
                {listings.slice(0, 4).map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-border overflow-hidden shrink-0">
                      {listing.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_80,h_80,c_fill/${listing.images[0]}`}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">
                        {listing.title}
                      </p>
                      <p className="text-xs text-text-muted">{listing.area}</p>
                    </div>
                    <span
                      className={[
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        listing.status === "available"
                          ? "bg-success/10 text-success"
                          : listing.status === "sold"
                            ? "bg-accent/10 text-accent"
                            : "bg-border text-text-muted",
                      ].join(" ")}
                    >
                      {listing.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentPurchases.length > 0 && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text">Recent purchases</h2>
                <Link href="/dashboard/orders?tab=purchases" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="space-y-2">
                {recentPurchases.map((order) => {
                  const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending;
                  const firstItem = order.order_items?.[0];
                  const extraCount = (order.order_items?.length ?? 1) - 1;
                  const label = firstItem
                    ? extraCount > 0
                      ? `${firstItem.listing.title} +${extraCount} more`
                      : firstItem.listing.title
                    : "Order";
                  return (
                    <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors group">
                      <div className="relative w-10 h-10 rounded-lg bg-border overflow-hidden shrink-0">
                        {firstItem?.listing.images?.[0] ? (
                          <ListingImage src={firstItem.listing.images[0]} fill sizes="40px" className="object-cover" alt={firstItem.listing.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">{label}</p>
                        <p className="text-xs text-text-muted">₦{order.total_price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={statusStyle}>
                          {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
                        </span>
                        <span style={{ color: "#c8c2bb" }}>
                          {order.delivery_type === "delivery" ? <Truck size={12} strokeWidth={1.5} /> : <MapPin size={12} strokeWidth={1.5} />}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && listings.length === 0 && (
        <motion.div
          {...fadeUp(0.42)}
          className="bg-card rounded-xl shadow-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-text mb-1">No listings yet</h3>
          <p className="text-sm text-text-muted mb-6">
            Start by creating your first listing — it only takes a minute.
          </p>
          <Button href="/dashboard/listings/new" size="md">
            Create your first listing
          </Button>
        </motion.div>
      )}
    </div>
  );
}
