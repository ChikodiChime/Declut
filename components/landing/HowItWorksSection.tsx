import { Search, Handshake, RefreshCw } from "lucide-react";

const STEPS = [
  {
    number: "1",
    icon: Search,
    title: "Find something you love",
    body: "Browse listings by category or search. No account needed.",
  },
  {
    number: "2",
    icon: Handshake,
    title: "Connect with the seller",
    body: "Claim a free item, buy securely, or see a donated item find a new home.",
  },
  {
    number: "3",
    icon: RefreshCw,
    title: "Repeat",
    body: "List your own stuff and pass it forward.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      className="bg-card py-24 px-4"
      style={{ clipPath: "polygon(0 5%, 100% 0, 100% 100%, 0 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-text mb-16">How it works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative pl-2">
                {/* Watermark number */}
                <span
                  className="absolute -top-4 -left-2 text-[120px] font-black text-primary leading-none select-none pointer-events-none"
                  style={{ opacity: 0.06 }}
                >
                  {step.number}
                </span>

                {/* Content */}
                <div className="relative space-y-3 pt-10">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Icon size={20} className="text-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-text">{step.title}</h3>
                  <p className="text-text-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
