import Link from "next/link";
import { Cpu, Sofa, Shirt, Plug, BookOpen, Baby, Dumbbell, Car, Package } from "lucide-react";

const CATEGORIES = [
  { label: "Electronics",            slug: "Electronics",            icon: Cpu,      color: "#4F46E5", bg: "rgba(79,70,229,0.08)"   },
  { label: "Furniture & Home",       slug: "Furniture & Home",       icon: Sofa,     color: "#F59E0B", bg: "rgba(245,158,11,0.08)"  },
  { label: "Clothing & Accessories", slug: "Clothing & Accessories", icon: Shirt,    color: "#EC4899", bg: "rgba(236,72,153,0.08)"  },
  { label: "Appliances",             slug: "Appliances",             icon: Plug,     color: "#6366F1", bg: "rgba(99,102,241,0.08)"  },
  { label: "Books & Stationery",     slug: "Books & Stationery",     icon: BookOpen, color: "#10B981", bg: "rgba(16,185,129,0.08)"  },
  { label: "Kids & Baby",            slug: "Kids & Baby",            icon: Baby,     color: "#F97316", bg: "rgba(249,115,22,0.08)"  },
  { label: "Sports & Outdoors",      slug: "Sports & Outdoors",      icon: Dumbbell, color: "#14B8A6", bg: "rgba(20,184,166,0.08)"  },
  { label: "Vehicles & Parts",       slug: "Vehicles & Parts",       icon: Car,      color: "#64748B", bg: "rgba(100,116,139,0.08)" },
  { label: "Other",                  slug: "Other",                  icon: Package,  color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
];

export function CategoryStripSection() {
  return (
    <section className="py-16 bg-surface">
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <h2 className="text-4xl font-bold text-text">
          What&apos;s{" "}
          <span className="border-b-[3px] border-primary pb-0.5">waiting</span>{" "}
          for you
        </h2>
      </div>

      {/* Full-bleed scrollable strip */}
      <div className="overflow-x-auto no-scrollbar px-4">
        <div className="flex gap-3 w-max pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/listings?category=${encodeURIComponent(cat.slug)}`}
                className="flex flex-col items-center justify-center gap-3 w-28 h-36 rounded-2xl border border-border hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 shrink-0 px-3 text-center"
                style={{ background: cat.bg }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${cat.color}18` }}
                >
                  <Icon size={22} strokeWidth={1.75} style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-semibold text-text leading-tight">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
