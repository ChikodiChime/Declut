"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  lineColor?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  lineColor = "bg-primary",
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative bg-card rounded-2xl p-6 shadow-card overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Top colored line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${lineColor}`} />

      {/* Blurred icon cut off at top right */}
      <div
        className={`absolute -right-16 -top-16 w-56 h-56 rounded-full ${bgColor} blur-[100px] opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
      />

      {/* Large faded icon */}
      <div
        className={`absolute -right-8 -top-12 opacity-4 group-hover:opacity-8 transition-opacity duration-300 -rotate-12`}
      >
        <Icon size={180} className={color} strokeWidth={0.5} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div
          className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-4 shadow-sm`}
        >
          <Icon size={24} className={color} strokeWidth={1.75} />
        </div>
        <p className="text-3xl font-bold text-text mb-1">{value}</p>
        <p className="text-sm font-medium text-text-muted/80">{label}</p>
      </div>

      {/* Hover glow effect */}
      <motion.div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}
