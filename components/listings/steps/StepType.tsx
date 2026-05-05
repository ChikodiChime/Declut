"use client";

import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ShoppingBag, Gift, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import type { ListingType } from "@/types";

interface StepTypeData { listing_type: ListingType }
interface StepTypeProps {
  defaultValues?: Partial<StepTypeData>;
  onNext: (data: StepTypeData) => void;
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

export function StepType({ defaultValues, onNext }: StepTypeProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<StepTypeData>({ defaultValues });
  const selected = watch("listing_type");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">What kind of listing?</h2>
        <p className="text-sm text-text-muted mt-1">You can&apos;t change this after publishing.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;

          return (
            <motion.label
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className={[
                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150",
                isSelected
                  ? `${opt.activeBorder} ${opt.activeBg} shadow-sm`
                  : "border-border bg-card hover:border-border-strong",
              ].join(" ")}
            >
              <input
                type="radio"
                value={opt.value}
                className="sr-only"
                {...register("listing_type", { required: "Please select a listing type" })}
              />
              <div className={`w-11 h-11 rounded-xl ${opt.bg} flex items-center justify-center shrink-0`}>
                <Icon size={22} className={opt.color} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">{opt.label}</p>
                <p className="text-sm text-text-muted">{opt.description}</p>
              </div>
              <div className={[
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                isSelected ? `border-current bg-current ${opt.color}` : "border-border",
              ].join(" ")}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </motion.label>
          );
        })}
      </div>

      {errors.listing_type && (
        <p className="text-sm text-error">{errors.listing_type.message}</p>
      )}

      <Button type="submit" className="w-full gap-2">
        Next <ArrowRight size={16} strokeWidth={2} />
      </Button>
    </form>
  );
}
