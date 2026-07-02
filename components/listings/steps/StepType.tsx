"use client";

import { useForm, type UseFormReturn } from "react-hook-form";
import { ShoppingBag, Gift, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { AiDraftBanner } from "../AiDraftBanner";
import type { ReviewFormData } from "./reviewTypes";
import type { ListingType } from "@/types";

interface StepTypeData { listing_type: ListingType }
interface StepTypeProps {
  defaultValues?: Partial<StepTypeData>;
  onNext?: (data: StepTypeData) => void;
  onBack?: () => void;
  aiSuggested?: boolean;
  /** Shares a parent form instance instead of managing its own — used when embedded in StepReview. */
  formMethods?: UseFormReturn<ReviewFormData>;
  /** Renders just the fields, no heading/banner/buttons — the parent (StepReview) owns those. */
  hideChrome?: boolean;
}

const OPTIONS = [
  {
    value: "for_sale" as ListingType,
    label: "For Sale",
    description: "Set a price — buyer pays via Stripe",
    icon: ShoppingBag,
    color: "text-primary",
    bg: "bg-primary/8",
    activeBorder: "border-primary",
    activeBg: "bg-primary/5",
  },
  {
    value: "free" as ListingType,
    label: "Free",
    description: "Give it away at no cost",
    icon: Gift,
    color: "text-success",
    bg: "bg-success/10",
    activeBorder: "border-success",
    activeBg: "bg-success/5",
  },
  {
    value: "donate" as ListingType,
    label: "Donate",
    description: "Donate to a charity or community",
    icon: Heart,
    color: "text-accent",
    bg: "bg-accent/10",
    activeBorder: "border-accent",
    activeBg: "bg-accent/5",
  },
];

export function StepType({ defaultValues, onNext, onBack, aiSuggested, formMethods, hideChrome }: StepTypeProps) {
  const localForm = useForm<ReviewFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState: { errors } } = formMethods ?? localForm;
  const selected = watch("listing_type");

  const fields = (
    <>
      {!hideChrome && aiSuggested && (
        <AiDraftBanner message="AI suggested this listing type — feel free to change it." />
      )}

      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;

          return (
            <label
              key={opt.value}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150",
                isSelected
                  ? `${opt.activeBorder} ${opt.activeBg} shadow-sm`
                  : "border-border bg-card hover:border-border-strong hover:bg-surface",
              ].join(" ")}
            >
              <input
                type="radio"
                value={opt.value}
                className="sr-only"
                {...register("listing_type", { required: "Please select a listing type" })}
              />
              <div className={`w-9 h-9 rounded-lg ${opt.bg} flex items-center justify-center shrink-0`}>
                <Icon size={17} className={opt.color} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{opt.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{opt.description}</p>
              </div>
              <div className={[
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                isSelected ? `${opt.activeBorder} bg-current ${opt.color}` : "border-border",
              ].join(" ")}>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </label>
          );
        })}
      </div>

      {errors.listing_type && (
        <p className="text-sm text-error">{errors.listing_type.message}</p>
      )}
    </>
  );

  if (hideChrome) return fields;

  return (
    <form onSubmit={handleSubmit(onNext!)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">What kind of listing?</h2>
        <p className="text-sm text-text-muted mt-1">You can&apos;t change this after publishing.</p>
      </div>

      {fields}

      <div className="flex gap-3">
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
