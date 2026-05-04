import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

const BG = "#0B0A09";
const CARD_BG = "#191817";
const TEXT = "#F0EEE9";

const MOCK_CARDS = [
  { title: 'Samsung 43" Smart TV', badge: "For Sale", color: "#6366F1", price: "₦95,000",  emoji: "📺", area: "Ikeja, Lagos"    },
  { title: "Blue Leather Sofa",    badge: "Free",     color: "#34D399", price: null,        emoji: "🛋️", area: "Ajah, Lagos"     },
  { title: "iPhone 14 Pro",        badge: "For Sale", color: "#6366F1", price: "₦185,000", emoji: "📱", area: "Lekki, Lagos"    },
  { title: "Kids' Bicycle",        badge: "Donate",   color: "#FBBF24", price: null,        emoji: "🚲", area: "Yaba, Lagos"     },
  { title: "Baby Cot + Mattress",  badge: "Free",     color: "#34D399", price: null,        emoji: "🛏️", area: "Surulere, Lagos" },
];

// Arc geometry — convex upward: centre card highest, sides fall down
const R          = 720;   // arc radius in px
const ANGLE_STEP = 13;    // degrees between consecutive cards

function arcStyle(i: number, total: number): React.CSSProperties {
  const offset   = i - (total - 1) / 2;
  const rad      = (offset * ANGLE_STEP * Math.PI) / 180;
  const x        = R * Math.sin(rad);
  const y        = R * (1 - Math.cos(rad));          // positive → card falls down
  const rotate   = offset * 4.5;                      // slight individual tilt
  const scale    = 1 - Math.abs(offset) * 0.055;
  const zIndex   = total - Math.abs(offset);

  return {
    transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
    zIndex,
  };
}

export function HeroSection() {
  const total = MOCK_CARDS.length;

  return (
    // overflow-visible so arc cards bleed into the next section;
    // z-10 keeps those cards above the next section's background
    <section style={{ background: BG }} className="relative z-10 overflow-visible">

      {/* ── Centered headline ── */}
      <div className="text-center px-5 pt-24 pb-20 max-w-3xl mx-auto">
        {/* eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide"
          style={{ border: "1px solid rgba(240,238,233,0.1)", background: "rgba(240,238,233,0.04)", color: "rgba(240,238,233,0.45)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6366F1" }} />
          Nigeria&apos;s marketplace
        </div>

        {/* headline */}
        <h1
          className="font-display leading-[1.0] tracking-tight mb-5"
          style={{ fontSize: "clamp(52px, 8vw, 90px)", color: TEXT }}
        >
          Your stuff has<br />
          <em className="not-italic" style={{ color: "#6366F1" }}>a second story.</em>
        </h1>

        {/* sub */}
        <p className="text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto"
          style={{ color: "rgba(240,238,233,0.38)" }}>
          Sell, give away, or donate what you no longer need —<br className="hidden md:block" />
          directly to people in your community.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center flex-wrap gap-3">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#6366F1", color: "#fff" }}
          >
            Browse listings <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(240,238,233,0.12)", color: "rgba(240,238,233,0.55)" }}
          >
            Start selling
          </Link>
        </div>
      </div>

      {/* ── Arc carousel ──
          Container is shorter than card height so cards bleed below the hero.
          overflow-visible (inherited) lets them render into the next section.  */}
      <div className="relative h-[140px]" style={{ overflow: "visible" }}>
        {MOCK_CARDS.map((card, i) => {
          const isOuter = Math.abs(i - (total - 1) / 2) >= 2;
          return (
            <div
              key={card.title}
              className={`absolute left-1/2 top-0 w-[172px] ${isOuter ? "hidden lg:block" : ""}`}
              style={arcStyle(i, total)}
            >
              <div
                className="rounded-2xl p-3.5"
                style={{
                  background: CARD_BG,
                  border: "1px solid rgba(240,238,233,0.07)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
                }}
              >
                {/* image placeholder */}
                <div
                  className="aspect-[4/3] rounded-xl mb-3 flex items-center justify-center text-3xl"
                  style={{ background: "rgba(240,238,233,0.04)" }}
                >
                  {card.emoji}
                </div>

                {/* title + badge */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <p className="font-semibold text-xs leading-snug truncate" style={{ color: TEXT }}>
                    {card.title}
                  </p>
                  <span
                    className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: card.color, background: `${card.color}20` }}
                  >
                    {card.badge}
                  </span>
                </div>

                {/* location + price */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin size={9} style={{ color: "rgba(240,238,233,0.25)", flexShrink: 0 }} />
                    <span className="text-[10px] truncate" style={{ color: "rgba(240,238,233,0.25)" }}>
                      {card.area}
                    </span>
                  </div>
                  {card.price && (
                    <span className="text-xs font-bold shrink-0" style={{ color: card.color }}>
                      {card.price}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
