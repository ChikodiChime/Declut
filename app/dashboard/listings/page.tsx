"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  Search,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui";
import { ListingCard } from "@/components/listings";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMyListings } from "@/lib/hooks/useListings";

export default function DashboardListingsPage() {
  const { data, isLoading, error } = useMyListings();
  const listings = data?.listings ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "sold" | "claimed" | "donated"
  >("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const availableListings = listings.filter(
    (l) => l.status === "available",
  ).length;
  const soldListings = listings.filter((l) => l.status === "sold").length;
  const claimedListings = listings.filter((l) => l.status === "claimed").length;
  const donatedListings = listings.filter((l) => l.status === "donated").length;

  // Filter listings based on search query and status filter
  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      searchQuery === "" ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.area?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || listing.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">My Listings</h1>
          <p className="text-text-muted mt-1">
            {isLoading
              ? "Loading…"
              : `${listings.length} total listing${listings.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button href="/dashboard/listings/new" size="lg" className="gap-2">
          <Package size={18} />
          Create New Listing
        </Button>
      </div>
      {/* Stats Cards */}
      {!isLoading && listings.length > 0 && (
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <StatCard
            label="Total"
            value={listings.length}
            icon={Package}
            color="text-primary"
            bgColor="bg-primary/10"
            lineColor="bg-primary"
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            label="Available"
            value={availableListings}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-500/10"
            lineColor="bg-green-500"
            onClick={() => setStatusFilter("available")}
          />
          <StatCard
            label="Sold"
            value={soldListings}
            icon={DollarSign}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
            lineColor="bg-blue-500"
            onClick={() => setStatusFilter("sold")}
          />
          <StatCard
            label="Claimed"
            value={claimedListings}
            icon={Clock}
            color="text-amber-600"
            bgColor="bg-amber-500/10"
            lineColor="bg-amber-500"
            onClick={() => setStatusFilter("claimed")}
          />
          <StatCard
            label="Donated"
            value={donatedListings}
            icon={Package}
            color="text-purple-600"
            bgColor="bg-purple-500/10"
            lineColor="bg-purple-500"
            onClick={() => setStatusFilter("donated")}
          />
        </motion.div>
      )}
      {/* Filter Bar */}
      {!isLoading && listings.length > 0 && (
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
              size={18}
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder="Search by title, description, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-11 py-3 bg-card border border-border/60 rounded-2xl text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/50 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/60 hover:text-text hover:bg-border/30 rounded-lg p-1 transition-all"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="default"
              className="gap-2 h-12 px-4 rounded-2xl border-border/60 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} strokeWidth={1.75} />
              <span className="font-medium">Filter</span>
              {statusFilter !== "all" && (
                <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
              )}
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                className="transition-transform duration-200"
                style={{
                  transform: showFilterDropdown
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </Button>
            {showFilterDropdown && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowFilterDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl z-10 overflow-hidden ring-1 ring-border/40"
                >
                  <div className="px-4 py-3 border-b border-border/40 bg-surface/30">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Filter by Status
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                        statusFilter === "all"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text hover:bg-border/30"
                      }`}
                    >
                      <span>All Listings</span>
                      {statusFilter === "all" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                    <div className="h-px bg-border/30 mx-4" />
                    <button
                      onClick={() => {
                        setStatusFilter("available");
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                        statusFilter === "available"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text hover:bg-border/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Available
                      </span>
                      {statusFilter === "available" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                    <div className="h-px bg-border/30 mx-4" />
                    <button
                      onClick={() => {
                        setStatusFilter("sold");
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                        statusFilter === "sold"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text hover:bg-border/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Sold
                      </span>
                      {statusFilter === "sold" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                    <div className="h-px bg-border/30 mx-4" />
                    <button
                      onClick={() => {
                        setStatusFilter("claimed");
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                        statusFilter === "claimed"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text hover:bg-border/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Claimed
                      </span>
                      {statusFilter === "claimed" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                    <div className="h-px bg-border/30 mx-4" />
                    <button
                      onClick={() => {
                        setStatusFilter("donated");
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all ${
                        statusFilter === "donated"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text hover:bg-border/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        Donated
                      </span>
                      {statusFilter === "donated" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      )}
      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl shadow-card overflow-hidden animate-pulse border border-border/50"
            >
              <div className="aspect-4/3 bg-border/60" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-border/60 rounded w-3/4" />
                <div className="h-4 bg-border/60 rounded w-1/2" />
                <div className="h-3 bg-border/60 rounded w-1/3 mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Error State */}
      {error && (
        <motion.div
          className="bg-error-bg/50 border border-error/20 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-error font-medium">
            Failed to load listings. Please refresh.
          </p>
        </motion.div>
      )}
      &apos;
      {/* Empty State */}
      {!isLoading && !error && filteredListings.length === 0 && (
        <motion.div
          className="bg-card rounded-3xl shadow-card p-16 text-center border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/10">
            <Package size={36} className="text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-text mb-2">
            No listings yet
          </h3>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Start selling by creating your first listing. It's quick and easy to
            get started.
          </p>
          <Button href="/dashboard/listings/new" size="lg" className="gap-2">
            <Package size={18} />
            Create Your First Listing
          </Button>
        </motion.div>
      )}
      {/* Listings Grid */}
      {!isLoading && filteredListings.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {filteredListings.map((listing) => (
            <motion.div
              key={listing.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: "easeOut" },
                },
              }}
            >
              <ListingCard listing={listing} basePath="/dashboard/listings" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
