import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

const COLLAGE_CARDS = [
  {
    title: "iPhone 14 Pro",
    subtitle: "Excellent condition",
    badge: "For Sale",
    price: "₦180,000",
    badgeClass: "bg-primary/10 text-primary",
    rotate: "-rotate-[5deg]",
    position: "top-4 left-0",
    zIndex: "z-10",
  },
  {
    title: "Blue Leather Sofa",
    subtitle: "Pick up only · Lagos",
    badge: "Free",
    price: null,
    badgeClass: "bg-success/10 text-success",
    rotate: "rotate-[3deg]",
    position: "top-20 left-16",
    zIndex: "z-20",
  },
  {
    title: "Kids' Bicycle",
    subtitle: "Donated to charity",
    badge: "Donate",
    price: null,
    badgeClass: "bg-accent/10 text-accent",
    rotate: "rotate-[8deg]",
    position: "top-36 left-8",
    zIndex: "z-30",
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] bg-surface flex items-center overflow-hidden px-4 py-16">
      {/* Blobs */}
      <div
        className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full bg-primary pointer-events-none"
        style={{ opacity: 0.05, transform: "translate(35%, -35%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent pointer-events-none"
        style={{ opacity: 0.06, transform: "translate(-35%, 35%)" }}
      />

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text leading-[1.08]">
              Your stuff has
              <br />
              <span className="text-primary">a second story.</span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed max-w-md">
              Nigeria&apos;s marketplace to sell, give away, or donate what you
              no longer need — to real people near you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="/listings" size="lg" className="gap-2">
              Browse listings <ArrowRight size={18} strokeWidth={2} />
            </Button>
            <Button href="/auth/signup" variant="outline" size="lg">
              Start selling
            </Button>
          </div>
        </div>

        {/* Right: card collage — hidden on mobile */}
        <div className="relative h-80 hidden md:block">
          {COLLAGE_CARDS.map((card) => (
            <div
              key={card.title}
              className={`absolute ${card.position} ${card.rotate} ${card.zIndex} w-56 bg-card rounded-xl shadow-elevated p-3.5 border border-border`}
            >
              <div className="aspect-video bg-surface rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                <span className="text-3xl">📦</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-text text-sm truncate">{card.title}</p>
                  <p className="text-[11px] text-text-muted truncate">{card.subtitle}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${card.badgeClass}`}>
                  {card.badge}
                </span>
              </div>
              {card.price && (
                <p className="text-sm font-bold text-primary mt-1.5">{card.price}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
