import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export function CtaBannerSection() {
  return (
    <section
      className="relative bg-primary py-28 px-4 overflow-hidden text-center"
      style={{ clipPath: "polygon(0 6%, 100% 0, 100% 94%, 0 100%)" }}
    >
      {/* Decorative circles */}
      <div
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-white pointer-events-none"
        style={{ opacity: 0.04, transform: "translate(-30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white pointer-events-none"
        style={{ opacity: 0.04, transform: "translate(30%, 30%)" }}
      />

      <div className="relative max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Ready to explore?
        </h2>
        <p className="text-lg text-white/75">
          Everything near you, all in one place.
        </p>
        <div className="pt-4">
          <Button
            href="/listings"
            size="lg"
            className="gap-2 border border-white/40 bg-white/10 text-white hover:bg-white/20 focus:ring-white"
          >
            Browse all listings <ArrowRight size={18} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </section>
  );
}
