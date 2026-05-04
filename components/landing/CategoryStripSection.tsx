import Link from "next/link";
import { Cpu, Sofa, Shirt, Plug, BookOpen, Baby, Dumbbell, Car, Package } from "lucide-react";

const CATEGORIES = [
  { label: "Electronics",            slug: "Electronics",            icon: Cpu,      color: "#818CF8" },
  { label: "Furniture & Home",       slug: "Furniture & Home",       icon: Sofa,     color: "#FCD34D" },
  { label: "Clothing & Accessories", slug: "Clothing & Accessories", icon: Shirt,    color: "#F9A8D4" },
  { label: "Appliances",             slug: "Appliances",             icon: Plug,     color: "#A5B4FC" },
  { label: "Books & Stationery",     slug: "Books & Stationery",     icon: BookOpen, color: "#6EE7B7" },
  { label: "Kids & Baby",            slug: "Kids & Baby",            icon: Baby,     color: "#FCA5A5" },
  { label: "Sports & Outdoors",      slug: "Sports & Outdoors",      icon: Dumbbell, color: "#5EEAD4" },
  { label: "Vehicles & Parts",       slug: "Vehicles & Parts",       icon: Car,      color: "#94A3B8" },
  { label: "Other",                  slug: "Other",                  icon: Package,  color: "#CBD5E1" },
];

export function CategoryStripSection() {
  return (
    <section className="bg-[#0F0F0F] py-16">
      <div className="max-w-6xl mx-auto px-4 md:px-8 mb-10">
        <h2 className="font-display text-5xl md:text-6xl text-white leading-tight">
          Shop by category
        </h2>
      </div>

      <div className="overflow-x-auto no-scrollbar px-4 md:px-8">
        <div className="flex gap-3 w-max pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/listings?category=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col items-center justify-center gap-3 w-28 h-36 rounded-2xl border border-white/10 hover:border-white/25 hover:-translate-y-1 transition-all duration-200 shrink-0 px-3 text-center"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${cat.color}18` }}
                >
                  <Icon size={22} strokeWidth={1.75} style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-medium text-white/60 group-hover:text-white/90 leading-tight transition-colors">
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
