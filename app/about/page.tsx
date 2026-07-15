"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Tag,
  Handshake,
  Heart,
  Repeat2,
  Sprout,
  Users,
} from "lucide-react";

// ─── Animation primitive ──────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const LISTING_TYPES = [
  {
    icon: Tag,
    label: "For Sale",
    number: "01",
    color: "#4f46e5",
    bg: "rgba(79,70,229,0.05)",
    border: "rgba(79,70,229,0.12)",
    iconBg: "#4f46e5",
    description:
      "Price it yourself. Connect directly with buyers in your city. No middlemen, no platform fees on basic listings.",
  },
  {
    icon: Heart,
    label: "Free",
    number: "02",
    color: "#10b981",
    bg: "rgba(16,185,129,0.05)",
    border: "rgba(16,185,129,0.12)",
    iconBg: "#10b981",
    description:
      "Pass it on at zero cost. Someone in your neighbourhood needs exactly what you no longer use.",
  },
  {
    icon: Handshake,
    label: "Donate",
    number: "03",
    color: "#d97706",
    bg: "rgba(217,119,6,0.05)",
    border: "rgba(217,119,6,0.12)",
    iconBg: "#d97706",
    description:
      "Route items to verified charities. Track where your donation goes and get acknowledgement for your generosity.",
  },
];

const VALUES = [
  {
    number: "01",
    icon: Repeat2,
    title: "Nothing goes to waste",
    body: "Every item that finds a new owner is one less thing in a landfill. We make that handoff as frictionless as possible.",
  },
  {
    number: "02",
    icon: Users,
    title: "Community over profit",
    body: "Free and donate listings exist alongside paid ones — because not every exchange needs to be transactional.",
  },
  {
    number: "03",
    icon: Sprout,
    title: "Small acts, real impact",
    body: "A single listing is a small act. Thousands of them reshape how a city thinks about ownership and waste.",
  },
];

const STATS = [
  {
    value: "3×",
    label: "more items per home than a decade ago",
    aside: "We're drowning in things.",
    color: "#4f46e5",
    cardBg: "rgba(79,70,229,0.05)",
    cardBorder: "rgba(79,70,229,0.13)",
  },
  {
    value: "60%",
    label: "of household items used less than once a year",
    aside: "Most of it just sits there.",
    color: "#10b981",
    cardBg: "rgba(16,185,129,0.05)",
    cardBorder: "rgba(16,185,129,0.13)",
  },
  {
    value: "₦0",
    label: "cost to pass something on via Unstash",
    aside: "It doesn't have to.",
    color: "#d97706",
    cardBg: "rgba(217,119,6,0.05)",
    cardBorder: "rgba(217,119,6,0.13)",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main style={{ background: "#f4f4f5" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden flex flex-col"
        style={{ minHeight: "clamp(620px, 85svh, 900px)", marginTop: -76 }}
      >
        {/* Background photo */}
        <Image
          src="/hero-bg-1.png"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Gradient — dark at bottom, breathing at top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.90) 100%)",
          }}
        />
        {/* Grain texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "300px 300px",
            mixBlendMode: "overlay",
          }}
        />

        {/* Content pinned to bottom */}
        <div className="relative mt-auto w-full">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12 pb-14 md:pb-20">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-[11px] font-bold uppercase tracking-[0.22em] mb-7"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              About Unstash
            </motion.p>

            <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 44 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.9,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="font-display leading-[1.0] tracking-tight text-white"
                style={{ fontSize: "clamp(44px, 8vw, 100px)", maxWidth: 780 }}
              >
                Things that deserve
                <br />a{" "}
                <em style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  second life.
                </em>
              </motion.h1>

              {/* Right side */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.65,
                  delay: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-col gap-6 md:max-w-[300px] md:pb-2 shrink-0"
              >
                <p
                  className="text-[15px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.48)" }}
                >
                  Nigeria&apos;s marketplace for selling, giving away, and
                  donating the things you no longer need — to people who do.
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full font-semibold text-[13px] text-white self-start transition-all duration-200"
                  style={{ background: "#4f46e5" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#4338ca";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#4f46e5";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  Browse listings <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              </motion.div>
            </div>

            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.7 }}
              className="flex items-center gap-2 mt-10"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowDown size={15} strokeWidth={1.5} />
              </motion.div>
              <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
                Scroll
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Editorial pull quote ─────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid #e8e4dc" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <FadeUp>
            <blockquote
              className="font-display leading-[1.1] tracking-tight"
              style={{
                fontSize: "clamp(26px, 4.5vw, 58px)",
                color: "#16130f",
                maxWidth: 860,
              }}
            >
              &ldquo;Your spare room is a small museum
              <br className="hidden md:block" /> of things you meant to deal
              with.&rdquo;
            </blockquote>
          </FadeUp>

          <div className="mt-12 grid md:grid-cols-2 gap-10 md:gap-20">
            <FadeUp delay={0.1}>
              <p
                className="text-[15px] leading-[1.8]"
                style={{ color: "#56524d" }}
              >
                Nigerian homes are full of useful things gathering dust — that
                laptop you upgraded from, the baby clothes your child has
                outgrown, the textbooks from three years ago you keep meaning to
                sort through.
              </p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p
                className="text-[15px] leading-[1.8]"
                style={{ color: "#56524d" }}
              >
                We built Unstash because giving things away, selling them, or
                donating them shouldn&apos;t be harder than keeping them. Three
                listing types — For Sale, Free, and Donate — because not every
                transfer is the same, and the platform should respect that.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 py-10 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STATS.map((stat, i) => (
              <FadeUp key={stat.label} delay={i * 0.1}>
                <div
                  className="relative overflow-hidden rounded-2xl px-7 py-7 flex flex-col justify-between gap-6"
                  style={{
                    background: stat.cardBg,
                    border: `1px solid ${stat.cardBorder}`,
                    minHeight: 160,
                  }}
                >
                  {/* Ghost number as background texture */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-4 bottom-2 font-display leading-none select-none"
                    style={{
                      fontSize: "clamp(80px, 10vw, 120px)",
                      color: stat.color,
                      opacity: 0.07,
                    }}
                  >
                    {stat.value}
                  </span>

                  {/* Foreground number */}
                  <span
                    className="font-display leading-none relative"
                    style={{
                      fontSize: "clamp(40px, 5vw, 56px)",
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </span>

                  {/* Label */}
                  <div className="relative">
                    <p
                      className="text-[13px] leading-snug font-medium"
                      style={{ color: "#16130f", maxWidth: 180 }}
                    >
                      {stat.label}
                    </p>
                    <p
                      className="text-[11px] font-semibold mt-1.5"
                      style={{ color: stat.color }}
                    >
                      {stat.aside}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three Paths ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "#f5f2ec",
          borderTop: "1px solid #e8e4dc",
          borderBottom: "1px solid #e8e4dc",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 py-24 md:py-32">
          <FadeUp className="mb-16">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4"
              style={{ color: "#a8a09a" }}
            >
              How it works
            </p>
            <h2
              className="font-display leading-[1.1] tracking-tight"
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                color: "#16130f",
              }}
            >
              Three ways to pass things on.
            </h2>
          </FadeUp>

          <div className="flex flex-col gap-4">
            {LISTING_TYPES.map((type, i) => (
              <FadeUp key={type.label} delay={i * 0.1}>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: type.bg,
                    border: `1px solid ${type.border}`,
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-0 p-7 md:p-9">
                    {/* Ghost number */}
                    <span
                      className="font-display shrink-0 leading-none select-none hidden md:block"
                      style={{
                        fontSize: 56,
                        color: type.color,
                        opacity: 0.18,
                        minWidth: 80,
                      }}
                    >
                      {type.number}
                    </span>

                    {/* Icon + label */}
                    <div className="flex items-center gap-4 shrink-0 md:min-w-[210px]">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: type.iconBg }}
                      >
                        <type.icon size={20} strokeWidth={2} color="white" />
                      </div>
                      <span
                        className="font-semibold text-[20px]"
                        style={{ color: "#16130f" }}
                      >
                        {type.label}
                      </span>
                    </div>

                    {/* Divider */}
                    <div
                      className="hidden md:block shrink-0 w-px h-10 mx-10"
                      style={{ background: type.border }}
                    />

                    {/* Description */}
                    <p
                      className="text-[15px] leading-[1.75]"
                      style={{ color: "#56524d", maxWidth: 480 }}
                    >
                      {type.description}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values / dark manifesto ───────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#16130f" }}
      >
        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Amber atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 15% 65%, rgba(245,158,11,0.07) 0%, transparent 55%)",
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-6 md:px-12 py-24 md:py-32">
          <FadeUp className="mb-20">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] mb-5"
              style={{ color: "rgba(168,160,154,0.4)" }}
            >
              What we stand for
            </p>
            <h2
              className="font-display leading-[1.05] tracking-tight text-white"
              style={{ fontSize: "clamp(32px, 5vw, 62px)", maxWidth: 540 }}
            >
              Less clutter,
              <br />
              more{" "}
              <em style={{ color: "#f59e0b", fontStyle: "italic" }}>
                meaning.
              </em>
            </h2>
          </FadeUp>

          {/* Numbered rows */}
          <div className="flex flex-col">
            {VALUES.map((v, i) => (
              <FadeUp key={v.title} delay={i * 0.1}>
                <div
                  className="flex flex-col md:flex-row md:items-start gap-5 md:gap-12 py-10"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Number */}
                  <span
                    className="font-display shrink-0 leading-none select-none"
                    style={{
                      fontSize: "clamp(28px, 3.5vw, 40px)",
                      color: "#f59e0b",
                      opacity: 0.45,
                      minWidth: 60,
                    }}
                  >
                    {v.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <v.icon
                      size={18}
                      strokeWidth={2}
                      style={{ color: "#f59e0b" }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-[19px] text-white mb-2">
                      {v.title}
                    </h3>
                    <p
                      className="text-[14px] leading-[1.8]"
                      style={{ color: "rgba(255,255,255,0.36)" }}
                    >
                      {v.body}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <FadeUp>
          <div
            className="relative overflow-hidden rounded-3xl px-10 md:px-16 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-10"
            style={{ background: "#16130f", border: "1px solid #242018" }}
          >
            {/* Amber glow bottom-right */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 85% 60%, rgba(245,158,11,0.10) 0%, transparent 55%)",
              }}
            />

            <div className="relative">
              <h2
                className="font-display leading-[1.1] tracking-tight text-white mb-3"
                style={{ fontSize: "clamp(24px, 3.5vw, 44px)" }}
              >
                Ready to declutter?
              </h2>
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.38)", maxWidth: 400 }}
              >
                List your first item in under two minutes. Sell it, give it
                away, or send it to a cause you care about.
              </p>
            </div>

            <div className="relative flex items-center gap-3 shrink-0">
              <Link
                href="/dashboard/listings/new"
                prefetch={false}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full font-semibold text-[14px] transition-all duration-200"
                style={{ background: "#f59e0b", color: "#16130f" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#d97706";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f59e0b";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }}
              >
                List an item <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full font-semibold text-[14px] transition-all duration-200"
                style={{
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.24)";
                  (e.currentTarget as HTMLElement).style.color = "white";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.6)";
                }}
              >
                Browse
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </main>
  );
}
