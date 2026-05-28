"use client";

import { Search, Handshake, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Find something you love",
    body: "Browse listings by category or location. No account needed to see what's available near you.",
    accent: "#4f46e5",
    accentBg: "rgba(79,70,229,0.07)",
    rotation: -3.2,
    offsetX: -12,
    shadow: "10px 22px 44px rgba(79,70,229,0.14), 2px 6px 16px rgba(22,19,15,0.08)",
    hoverShadow: "14px 30px 56px rgba(79,70,229,0.2), 2px 6px 16px rgba(22,19,15,0.08)",
  },
  {
    number: "02",
    icon: Handshake,
    title: "Connect with the seller",
    body: "Claim free items, buy securely, or watch donated items find their next home.",
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.07)",
    rotation: 2.1,
    offsetX: 16,
    shadow: "-8px 22px 44px rgba(16,185,129,0.14), -2px 6px 16px rgba(22,19,15,0.08)",
    hoverShadow: "-12px 30px 56px rgba(16,185,129,0.2), -2px 6px 16px rgba(22,19,15,0.08)",
  },
  {
    number: "03",
    icon: RefreshCw,
    title: "List. Give. Repeat.",
    body: "Post your own items in minutes — sell, give away for free, or donate to a cause.",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.07)",
    rotation: -1.4,
    offsetX: -6,
    shadow: "6px 22px 44px rgba(245,158,11,0.14), 1px 6px 16px rgba(22,19,15,0.08)",
    hoverShadow: "10px 30px 56px rgba(245,158,11,0.2), 1px 6px 16px rgba(22,19,15,0.08)",
  },
];

const DOT_GRID = "radial-gradient(circle, #cdc4b6 1px, transparent 1px)";

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-24 pt-48 sm:px-6 sm:pt-56 md:pt-64 lg:px-8">
      {/* Section-level background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -right-24 top-32 h-[420px] w-[420px] rounded-full blur-[90px]"
          style={{ background: "rgba(79,70,229,0.05)" }}
        />
        <div
          className="absolute -left-20 bottom-16 h-[380px] w-[380px] rounded-full blur-[80px]"
          style={{ background: "rgba(245,158,11,0.06)" }}
        />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="relative max-w-4xl mx-auto overflow-hidden rounded-[28px] border border-[#ece7df] bg-[linear-gradient(180deg,#fffcf8_0%,#ffffff_40%,#fbf8f3_100%)] px-5 py-10 sm:px-8 md:px-10 md:py-14 shadow-[0_18px_50px_rgba(22,19,15,0.06)]">

          {/* Inner decorative layer */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-[0.28]"
              style={{ backgroundImage: DOT_GRID, backgroundSize: "26px 26px" }}
            />

            {/* Color orbs */}
            <div
              className="absolute -left-20 -top-20 h-56 w-56 rounded-full blur-3xl"
              style={{ background: "rgba(79,70,229,0.11)" }}
            />
            <div
              className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full blur-3xl"
              style={{ background: "rgba(245,158,11,0.11)" }}
            />
            <div
              className="absolute bottom-8 left-1/3 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "rgba(16,185,129,0.08)" }}
            />

            {/* Corner dot clusters */}
            <DotCluster className="absolute right-6 top-6" />
            <DotCluster className="absolute bottom-6 left-6 rotate-90" />

            {/* Decorative rings */}
            <div className="absolute right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-[#e0d8cc] opacity-50" />
            <div className="absolute right-14 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border border-[#d4cbbc] opacity-40" />

            {/* Cross marks */}
            <CrossMark className="absolute left-8 top-16 opacity-20" color="#4f46e5" />
            <CrossMark className="absolute bottom-14 right-8 opacity-20" color="#f59e0b" />
          </div>

          {/* Header */}
          <div className="relative mb-12 text-center md:mb-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e8e2d8] bg-[#fffaf2] px-3 py-1.5">
              <span className="w-4 h-px" style={{ background: "#4f46e5" }} />
              <span
                className="text-[11px] font-bold tracking-[0.18em] uppercase"
                style={{ color: "#4f46e5" }}
              >
                How it works
              </span>
            </div>

            <h2
              className="font-display leading-[1.04] text-[#16130f]"
              style={{ fontSize: "clamp(32px, 5vw, 52px)" }}
            >
              Three steps from clutter
              <br className="hidden sm:block" />
              to clarity
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#8c857f]">
              Whether you&apos;re buying, selling, or giving away items,
              Declutter makes the handoff simple.
            </p>
          </div>

          {/* Falling card stack */}
          <div className="relative mx-auto max-w-xl space-y-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.number}
                  initial={{
                    opacity: 0,
                    y: -90,
                    rotate: step.rotation * 3.5,
                    scale: 0.88,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    rotate: step.rotation,
                    scale: 1,
                  }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    type: "spring",
                    stiffness: 110,
                    damping: 15,
                    delay: index * 0.2,
                  }}
                  whileHover={{
                    rotate: 0,
                    y: -10,
                    scale: 1.015,
                    transition: { duration: 0.3, ease: "easeOut" },
                  }}
                  style={{
                    transformOrigin: "50% 100%",
                    x: step.offsetX,
                    cursor: "default",
                  }}
                >
                  <div
                    className="relative overflow-hidden rounded-2xl border border-[#ebe5dc] bg-white px-6 py-5 transition-shadow duration-300"
                    style={{ boxShadow: step.shadow }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = step.hoverShadow;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = step.shadow;
                    }}
                  >
                    {/* Large watermark number */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 -top-2 select-none font-serif text-[88px] font-light italic leading-none tracking-tight"
                      style={{ color: step.accent, opacity: 0.055 }}
                    >
                      {step.number}
                    </span>

                    {/* Step badge */}
                    <div className="mb-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] uppercase"
                        style={{ background: step.accentBg, color: step.accent }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: step.accent }}
                        />
                        Step {step.number}
                      </span>
                    </div>

                    {/* Icon + content */}
                    <div className="flex items-start gap-4">
                      <div
                        className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                        style={{
                          background: step.accentBg,
                          boxShadow: `0 0 0 1px ${step.accent}22`,
                        }}
                      >
                        <Icon size={20} strokeWidth={1.8} style={{ color: step.accent }} />
                      </div>

                      <div>
                        <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-[#16130f]">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#78726c]">{step.body}</p>
                      </div>
                    </div>

                    {/* Bottom color line */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2.5px]"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, ${step.accent}55 40%, ${step.accent}99 60%, transparent 100%)`,
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DotCluster({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[6px] ${className ?? ""}`}>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-[6px]">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className="h-[3px] w-[3px] rounded-full bg-[#bdb4a8]"
              style={{ opacity: 0.5 - (row + col) * 0.05 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CrossMark({ className, color }: { className?: string; color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden
    >
      <line x1="7" y1="0" x2="7" y2="14" stroke={color} strokeWidth="1.5" />
      <line x1="0" y1="7" x2="14" y2="7" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
