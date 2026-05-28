"use client";

import Link from "next/link";
import { Cpu, Sofa, Shirt, Plug, BookOpen, Baby, Dumbbell, Car, Package } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = [
  {
    label: "Electronics",
    slug: "Electronics",
    icon: Cpu,
    gradient: "linear-gradient(135deg, #3730a3 0%, #6366f1 100%)",
    colSpan: 3,
    pattern: "dots",
  },
  {
    label: "Furniture & Home",
    slug: "Furniture & Home",
    icon: Sofa,
    gradient: "linear-gradient(135deg, #92400e 0%, #f59e0b 100%)",
    colSpan: 2,
    pattern: "lines",
  },
  {
    label: "Clothing",
    slug: "Clothing & Accessories",
    icon: Shirt,
    gradient: "linear-gradient(135deg, #9d174d 0%, #ec4899 100%)",
    colSpan: 1,
    pattern: "none",
  },
  {
    label: "Appliances",
    slug: "Appliances",
    icon: Plug,
    gradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
    colSpan: 2,
    pattern: "dots",
  },
  {
    label: "Books & Stationery",
    slug: "Books & Stationery",
    icon: BookOpen,
    gradient: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
    colSpan: 2,
    pattern: "none",
  },
  {
    label: "Kids & Baby",
    slug: "Kids & Baby",
    icon: Baby,
    gradient: "linear-gradient(135deg, #7c2d12 0%, #f97316 100%)",
    colSpan: 2,
    pattern: "lines",
  },
  {
    label: "Sports",
    slug: "Sports & Outdoors",
    icon: Dumbbell,
    gradient: "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)",
    colSpan: 1,
    pattern: "none",
  },
  {
    label: "Vehicles & Parts",
    slug: "Vehicles & Parts",
    icon: Car,
    gradient: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
    colSpan: 3,
    pattern: "dots",
  },
  {
    label: "Other",
    slug: "Other",
    icon: Package,
    gradient: "linear-gradient(135deg, #44403c 0%, #a8a09a 100%)",
    colSpan: 2,
    pattern: "none",
  },
];

const PATTERN_STYLE: Record<string, React.CSSProperties> = {
  dots: {
    backgroundImage: "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)",
    backgroundSize: "20px 20px",
  },
  lines: {
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 0, transparent 50%)",
    backgroundSize: "20px 20px",
  },
  none: {},
};

function colSpanClass(n: number) {
  if (n === 2) return "md:col-span-2";
  if (n === 3) return "md:col-span-3";
  return "";
}

export function CategoryStripSection() {
  return (
    <section
      className="bg-[#fafaf8] py-20"
      style={{ borderTop: "1px solid #e8e4dc" }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="font-display leading-tight text-[#16130f]"
            style={{ fontSize: "clamp(36px, 4.5vw, 56px)" }}
          >
            Shop by category
          </h2>
          <p className="text-sm text-[#8c857f] sm:text-right">
            Everything second-hand, nothing second-rate.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map((cat, index) => {
            const Icon = cat.icon;
            const isWide = cat.colSpan >= 2;

            return (
              <motion.div
                key={cat.slug}
                className={`col-span-1 ${colSpanClass(cat.colSpan)}`}
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.055,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={`/listings?category=${encodeURIComponent(cat.slug)}`}
                  className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
                  style={{ background: cat.gradient }}
                >
                  {/* Texture overlay */}
                  <div className="absolute inset-0" style={PATTERN_STYLE[cat.pattern]} />

                  {/* Watermark icon on wide tiles */}
                  {isWide && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-3 -right-3"
                    >
                      <Icon size={84} strokeWidth={0.8} className="text-white opacity-[0.09]" />
                    </div>
                  )}

                  {/* Shine on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_60%)]" />

                  {/* Icon */}
                  <div className="relative">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/15 ring-1 ring-white/20">
                      <Icon size={19} strokeWidth={1.8} className="text-white" />
                    </div>
                  </div>

                  {/* Label + arrow */}
                  <div className="relative">
                    <span className="block text-[13px] font-semibold leading-tight text-white">
                      {cat.label}
                    </span>
                    <span className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-white/50 transition-all duration-200 group-hover:text-white/80 group-hover:gap-1.5">
                      Browse
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
