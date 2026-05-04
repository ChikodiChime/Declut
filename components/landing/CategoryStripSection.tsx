import Link from "next/link";
import { Cpu, Sofa, Shirt, Plug, BookOpen, Baby, Dumbbell, Car, Package } from "lucide-react";

const BG   = "#0B0A09";
const TEXT = "#F0EEE9";

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
    <section className="py-20" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 mb-10">
        <h2
          className="font-display leading-tight"
          style={{ fontSize: "clamp(40px,5vw,60px)", color: TEXT }}
        >
          Shop by category
        </h2>
      </div>

      <div className="overflow-x-auto no-scrollbar px-5 md:px-8">
        <div className="flex gap-3 w-max pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/listings?category=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col items-center justify-center gap-3 w-28 h-36 rounded-2xl shrink-0 px-3 text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "rgba(240,238,233,0.03)",
                  border: "1px solid rgba(240,238,233,0.07)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${cat.color}18` }}
                >
                  <Icon size={22} strokeWidth={1.75} style={{ color: cat.color }} />
                </div>
                <span
                  className="text-xs font-medium leading-tight transition-colors group-hover:opacity-90"
                  style={{ color: "rgba(240,238,233,0.5)" }}
                >
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
