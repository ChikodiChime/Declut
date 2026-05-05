"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const STATS = [
  { value: "Free", sup: "", label: "To list any item" },
  { value: "3", sup: "", label: "Ways to give things\na new home" },
  { value: "NG", sup: "", label: "Nationwide\ncoverage" },
];

export function CtaBannerSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#100c04" }}
    >
      {/* Grain texture */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="cta-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cta-noise)" />
      </svg>

      {/* Amber glow — top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: "rgba(245,158,11,0.15)" }}
      />
      {/* Soft indigo glow — bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full blur-[120px]"
        style={{ background: "rgba(79,70,229,0.10)" }}
      />

      {/* Top rule */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.5) 30%, rgba(245,158,11,0.8) 50%, rgba(245,158,11,0.5) 70%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-24 md:py-32 lg:py-40">
        <div className="grid lg:grid-cols-[1fr_320px] gap-16 xl:gap-32 items-end">

          {/* ── Left: headline + CTAs ── */}
          <div>
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="mb-8 flex items-center gap-3"
            >
              <div className="h-px w-8" style={{ background: "#f59e0b" }} />
              <span
                className="text-[10px] font-bold tracking-[0.24em] uppercase"
                style={{ color: "rgba(245,158,11,0.65)" }}
              >
                Join the movement
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display leading-[0.96] tracking-tight text-white mb-8"
              style={{ fontSize: "clamp(52px, 8.5vw, 104px)" }}
            >
              Your clutter
              <br />
              is someone&apos;s
              <br />
              <span
                style={{
                  background: "linear-gradient(96deg, #f59e0b 0%, #fbbf24 45%, #fde68a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                treasure.
              </span>
            </motion.h2>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-sm leading-relaxed mb-10 max-w-xs"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              Buy, sell, give, and donate with people near you across Nigeria.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/listings"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 hover:gap-3"
                style={{ background: "#f59e0b", color: "#100c04" }}
              >
                Browse listings
                <ArrowRight
                  size={15}
                  strokeWidth={2.5}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:bg-white/8 hover:border-white/30"
                style={{
                  border: "1px solid rgba(255,255,255,0.13)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Start selling
              </Link>
            </motion.div>
          </div>

          {/* ── Right: stats column ── */}
          <div className="flex flex-row lg:flex-col gap-8 lg:gap-12 lg:pb-2">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                className="flex flex-col gap-1.5"
              >
                {/* Divider line above each stat */}
                <div
                  className="mb-2 h-px w-10"
                  style={{ background: "rgba(245,158,11,0.25)" }}
                />
                <div
                  className="font-display font-bold leading-none"
                  style={{
                    fontSize: "clamp(32px, 4.5vw, 56px)",
                    color: "#f59e0b",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-[11px] leading-snug whitespace-pre-line"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom amber accent line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.35) 25%, rgba(245,158,11,0.6) 50%, rgba(245,158,11,0.35) 75%, transparent 100%)",
        }}
      />
    </section>
  );
}
