"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  PlusCircle,
  TrendingUp,
  Eye,
  ShoppingBag,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMyListings } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  };
}

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useMyListings();
  const listings = data?.listings ?? [];

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "available").length,
    sold: listings.filter((l) => l.status === "sold").length,
    donated: listings.filter((l) => l.status === "donated").length,
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 max-w-5xl">
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...fadeUp(0)}>
          <StatCard
            label="Total listings"
            value={isLoading ? "—" : stats.total}
            icon={Package}
            color="text-primary"
            bgColor="bg-primary/10"
            lineColor="bg-primary"
          />
        </motion.div>
        <motion.div {...fadeUp(0.07)}>
          <StatCard
            label="Available"
            value={isLoading ? "—" : stats.active}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-500/10"
            lineColor="bg-green-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.14)}>
          <StatCard
            label="Sold"
            value={isLoading ? "—" : stats.sold}
            icon={ShoppingBag}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
            lineColor="bg-blue-500"
          />
        </motion.div>
        <motion.div {...fadeUp(0.21)}>
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

      {/* Quick actions */}
      <motion.div
        {...fadeUp(0.28)}
        className="bg-card rounded-xl shadow-card p-6"
      >
        <h2 className="text-sm font-semibold text-text mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/listings/new">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PlusCircle
                  size={18}
                  className="text-primary"
                  strokeWidth={1.75}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                  New listing
                </p>
                <p className="text-xs text-text-muted">
                  List an item for sale, free or donate
                </p>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/listings">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Package
                  size={18}
                  className="text-text-muted"
                  strokeWidth={1.75}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                  My listings
                </p>
                <p className="text-xs text-text-muted">
                  Manage and update your items
                </p>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/profile">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Tag size={18} className="text-text-muted" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                  Your profile
                </p>
                <p className="text-xs text-text-muted">
                  Update your account details
                </p>
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Recent listings */}
      {listings.length > 0 && (
        <motion.div
          {...fadeUp(0.35)}
          className="bg-card rounded-xl shadow-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text">Recent listings</h2>
            <Link
              href="/dashboard/listings"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            >
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
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && listings.length === 0 && (
        <motion.div
          {...fadeUp(0.28)}
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
