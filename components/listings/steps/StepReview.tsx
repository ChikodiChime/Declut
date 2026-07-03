"use client";

import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { AiDraftBanner } from "../AiDraftBanner";
import { StepType } from "./StepType";
import { StepDetails } from "./StepDetails";
import { StepPricing } from "./StepPricing";
import type { ReviewFormData } from "./reviewTypes";

interface StepReviewProps {
  defaultValues?: Partial<ReviewFormData>;
  onNext: (data: ReviewFormData) => void;
  onBack: () => void;
  priceHint?: { price_range: { min: number; max: number } | null; comp_count: number } | null;
}

export function StepReview({
  defaultValues,
  onNext,
  onBack,
  priceHint,
}: StepReviewProps) {
  const formMethods = useForm<ReviewFormData>({ defaultValues });
  const { handleSubmit, watch } = formMethods;
  const listingType = watch("listing_type");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text">Review your AI draft</h2>
        <p className="text-sm text-text-muted mt-1">
          Everything below was drafted from your photos — check it over and adjust anything before continuing.
        </p>
      </div>

      <AiDraftBanner message="Listing type, details, and pricing were all pre-filled by AI." />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Listing type</p>
        <StepType formMethods={formMethods} hideChrome />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Item details</p>
        <StepDetails formMethods={formMethods} hideChrome />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Pricing &amp; location</p>
        <StepPricing formMethods={formMethods} hideChrome listingType={listingType} priceHint={priceHint} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          Next <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
