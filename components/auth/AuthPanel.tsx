"use client";
import { motion } from "framer-motion";
import { ShoppingBag, Recycle, Heart } from "lucide-react";

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Sell with ease",
    desc: "List in minutes, get paid directly to your account.",
  },
  {
    icon: Recycle,
    title: "Give it a second life",
    desc: "List items for free — declutter and help your community.",
  },
  {
    icon: Heart,
    title: "Donate to charity",
    desc: "Connect your unwanted items with organisations that need them.",
  },
];

export function AuthPanel() {
  return (
    <div className="hidden lg:flex flex-col sticky top-0 h-screen px-10 xl:px-14 py-12 bg-primary relative overflow-hidden">
      {/* Grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Logo */}
      <div className="relative z-10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="declut" className="h-8 xl:h-9" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em] mb-5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Nigeria&apos;s declutter marketplace
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-white leading-[1.05] tracking-tight mb-8"
          style={{ fontSize: "clamp(30px, 3vw, 50px)" }}
        >
          Less clutter,
          <br />
          more{" "}
          <em style={{ color: "#f59e0b", fontStyle: "italic" }}>meaning.</em>
        </motion.h2>

        <div className="flex flex-col gap-3 max-w-xl">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="flex items-start gap-4 rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: "easeOut" }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-white text-[14px] xl:text-[15px]">{f.title}</p>
                  <p className="text-[13px] xl:text-sm leading-relaxed mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 shrink-0">
        <p className="text-[11px] xl:text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          © {new Date().getFullYear()} Declut · Nigeria&apos;s secondhand marketplace
        </p>
      </div>
    </div>
  );
}
