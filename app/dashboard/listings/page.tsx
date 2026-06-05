"use client";

import { useState, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ListingRow } from "@/components/listings/ListingCard";
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
  const sliderRef = useRef<HTMLDivElement>(null);

  function scrollSlider(dir: "left" | "right") {
    sliderRef.current?.scrollBy({
      left: dir === "right" ? 300 : -300,
      behavior: "smooth",
    });
  }

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
    <div className="space-y-8">
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
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all duration-150"
        >
          <Plus size={15} strokeWidth={2.5} />
          Create New Listing
        </Link>
      </div>
      {/* Stats skeleton */}
      {isLoading && (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden w-72 shrink-0 rounded-2xl bg-card p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="skeleton-shimmer"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
              {/* Top line */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: "#ede9e3" }}
              />
              {/* Icon tile */}
              <div
                className="w-12 h-12 rounded-xl mb-4"
                style={{ background: "#ede9e3" }}
              />
              {/* Number */}
              <div
                className="h-8 w-16 rounded mb-2"
                style={{ background: "#ede9e3" }}
              />
              {/* Label */}
              <div
                className="h-3.5 w-24 rounded"
                style={{ background: "#e8e4dc" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {!isLoading && listings.length > 0 && (
        <div>
          <div className="flex justify-end gap-1 mb-3">
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
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
          >
            {[
              {
                label: "Total",
                value: listings.length,
                icon: Package,
                color: "text-primary",
                bgColor: "bg-primary/10",
                lineColor: "bg-primary",
                filter: "all",
              },
              {
                label: "Available",
                value: availableListings,
                icon: TrendingUp,
                color: "text-green-600",
                bgColor: "bg-green-500/10",
                lineColor: "bg-green-500",
                filter: "available",
              },
              {
                label: "Sold",
                value: soldListings,
                icon: DollarSign,
                color: "text-blue-600",
                bgColor: "bg-blue-500/10",
                lineColor: "bg-blue-500",
                filter: "sold",
              },
              {
                label: "Claimed",
                value: claimedListings,
                icon: Clock,
                color: "text-amber-600",
                bgColor: "bg-amber-500/10",
                lineColor: "bg-amber-500",
                filter: "claimed",
              },
              {
                label: "Donated",
                value: donatedListings,
                icon: Package,
                color: "text-purple-600",
                bgColor: "bg-purple-500/10",
                lineColor: "bg-purple-500",
                filter: "donated",
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                className="w-72 shrink-0 snap-start"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
              >
                <StatCard
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  color={card.color}
                  bgColor={card.bgColor}
                  lineColor={card.lineColor}
                  onClick={() =>
                    setStatusFilter(card.filter as typeof statusFilter)
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {/* Filter Bar */}
      {!isLoading && listings.length > 0 && (
        <motion.div
          className="flex flex-col sm:flex-row gap-3 max-w-[60%]"
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
              size="sm"
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
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-card rounded-xl border border-border flex items-center gap-4 px-4 py-3"
            >
              <div
                className="skeleton-shimmer"
                style={{ animationDelay: `${(i % 4) * 0.12}s` }}
              />
              {/* Thumbnail */}
              <div
                className="w-14 h-14 rounded-lg shrink-0"
                style={{ background: "#ede9e3" }}
              />
              {/* Text */}
              <div className="flex-1 flex flex-col gap-2">
                <div
                  className="h-3.5 rounded w-2/5"
                  style={{ background: "#ede9e3" }}
                />
                <div
                  className="h-2.5 rounded w-1/3"
                  style={{ background: "#ede9e3" }}
                />
                <div
                  className="h-2 rounded w-1/5"
                  style={{ background: "#e8e4dc" }}
                />
              </div>
              {/* Status */}
              <div
                className="h-7 w-28 rounded-md shrink-0"
                style={{ background: "#ede9e3" }}
              />
              {/* Price */}
              <div
                className="h-3.5 w-16 rounded shrink-0"
                style={{ background: "#ede9e3" }}
              />
              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ background: "#ede9e3" }}
                />
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ background: "#ede9e3" }}
                />
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
      {/* Empty State — no listings at all */}
      {!isLoading && !error && listings.length === 0 && (
        <motion.div
          className="flex flex-col items-center text-center py-16 lg:py-24"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative mb-6 w-64 h-64 lg:w-80 lg:h-80">
            {/* Blob sits behind the image via DOM order */}
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
          <h2
            className="font-display text-xl font-bold mb-2"
            style={{ color: "var(--color-text)" }}
          >
            No listings yet
          </h2>
          <p
            className="text-sm mb-8 max-w-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Post something you no longer need and start decluttering.
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white transition-all duration-150 active:scale-95"
            style={{ background: "var(--color-primary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-primary)";
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Create your first listing
          </Link>
        </motion.div>
      )}

      {/* Empty State — has listings but filter returned nothing */}
      {!isLoading &&
        !error &&
        listings.length > 0 &&
        filteredListings.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-16 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
              style={{
                background: "rgba(55,48,163,0.07)",
                border: "1px solid rgba(55,48,163,0.12)",
              }}
            >
              <SlidersHorizontal
                size={20}
                strokeWidth={1.75}
                style={{ color: "#3730a3" }}
              />
            </div>
            <p className="text-sm font-semibold text-[#16130f] mb-1">
              No listings match your filters
            </p>
            <p className="text-xs text-[#a8a09a] mb-5">
              Try a different search or clear the filters
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:bg-[#f5f1eb]"
              style={{ borderColor: "#e8e4dc", color: "#78726c" }}
            >
              <X size={11} strokeWidth={2.5} /> Clear filters
            </button>
          </motion.div>
        )}
      {/* Listings */}
      {!isLoading && filteredListings.length > 0 && (
        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {filteredListings.map((listing) => (
            <motion.div
              key={listing.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.25, ease: "easeOut" },
                },
              }}
            >
              <ListingRow listing={listing} basePath="/dashboard/listings" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
