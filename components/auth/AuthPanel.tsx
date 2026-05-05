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
    <div className="hidden lg:flex flex-col justify-between h-full px-10 py-12 bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5"
        />
        <div
          className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/5"
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/3"
        />
      </div>

      <div className="relative z-10">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="declut" className="h-8" />
      </div>

      {/* Feature list */}
      <div className="relative z-10 space-y-7">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: "easeOut" }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-white" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{f.title}</p>
                <p className="text-white/65 text-sm leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} Declut · Nigeria&apos;s secondhand marketplace
        </p>
      </div>
    </div>
  );
}
