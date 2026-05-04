import { Search, Handshake, RefreshCw } from "lucide-react";

const BG   = "#0F0E0D";
const TEXT = "#F0EEE9";

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Find something you love",
    body: "Browse listings by category or search. No account needed.",
  },
  {
    number: "02",
    icon: Handshake,
    title: "Connect with the seller",
    body: "Claim a free item, buy securely, or see a donated item find a new home.",
  },
  {
    number: "03",
    icon: RefreshCw,
    title: "List. Give. Repeat.",
    body: "Post your own items and pass things forward to your community.",
  },
];

export function HowItWorksSection() {
  return (
    // pt-48 gives clearance for the arc cards that bleed down from the hero
    <section className="relative z-0 px-5 md:px-8 pt-48 pb-24" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h2 className="font-display leading-tight mb-3" style={{ fontSize: "clamp(40px,5vw,60px)", color: TEXT }}>
            How it works
          </h2>
          <p className="text-sm" style={{ color: "rgba(240,238,233,0.38)" }}>
            Three steps from clutter to clarity.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x"
          style={{ borderColor: "rgba(240,238,233,0.07)" }}
        >
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="py-10 md:py-0 px-0 md:px-10 first:pl-0 last:pr-0">
                <span
                  className="block text-[72px] font-black leading-none mb-6 select-none"
                  style={{ color: "rgba(240,238,233,0.06)" }}
                >
                  {step.number}
                </span>
                <div className="space-y-3">
                  <div
                    className="inline-flex w-9 h-9 rounded-lg items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.14)" }}
                  >
                    <Icon size={17} strokeWidth={1.75} style={{ color: "#818CF8" }} />
                  </div>
                  <h3 className="text-sm font-semibold leading-snug" style={{ color: TEXT }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(240,238,233,0.38)" }}>
                    {step.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
