import { Search, Handshake, RefreshCw } from "lucide-react";

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
    <section className="bg-white py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-display text-5xl md:text-6xl text-[#0F0F0F] leading-tight">
            How it works
          </h2>
          <p className="text-text-muted mt-3 text-base max-w-sm">
            Three steps from clutter to clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="px-0 md:px-10 first:pl-0 last:pr-0 py-10 md:py-0">
                {/* Step number */}
                <span className="block text-[72px] font-black text-neutral-100 leading-none mb-6 select-none">
                  {step.number}
                </span>

                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#4F46E5]/10">
                    <Icon size={18} className="text-[#4F46E5]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-bold text-[#0F0F0F] leading-snug">{step.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
