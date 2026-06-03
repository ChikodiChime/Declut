"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Truck,
  Package,
} from "lucide-react";
import { Input, Button } from "@/components/ui";
import PlacesAddressInput, { type PlaceResult } from "@/components/checkout/PlacesAddressInput";
import type { ListingType, SizeCategory } from "@/types";

interface StepPricingData {
  price: number | null;
  area: string;
  size_category: SizeCategory;
  pickup_address: string;
}

const SIZE_OPTIONS: {
  value: SizeCategory;
  label: string;
  description: string;
  vehicle: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
}[] = [
  {
    value: "small",
    label: "Small",
    description: "Fits in a bag — clothes, phones, accessories",
    vehicle: "Motorbike",
    icon: Bike,
  },
  {
    value: "medium",
    label: "Medium",
    description: "Boxed items — small appliances, shoes",
    vehicle: "Car",
    icon: Car,
  },
  {
    value: "large",
    label: "Large",
    description: "Bulky items — TVs, large appliances",
    vehicle: "Van",
    icon: Truck,
  },
  {
    value: "extra_large",
    label: "Extra Large",
    description: "Heavy/oversized — furniture, fridges",
    vehicle: "Large Van",
    icon: Package,
  },
];

interface StepPricingProps {
  listingType: ListingType;
  defaultValues?: Partial<StepPricingData>;
  onNext: (data: StepPricingData) => void;
  onBack: () => void;
}

export function StepPricing({
  listingType,
  defaultValues,
  onNext,
  onBack,
}: StepPricingProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues });

  const [pickupError, setPickupError] = useState("");

  function handlePickupSelect(result: PlaceResult) {
    setValue("pickup_address", result.formatted_address, { shouldValidate: true });
    const area = result.city
      ? `${result.city}, ${result.state ?? ""}`.trim().replace(/,\s*$/, "")
      : result.state ?? "";
    setValue("area", area);
    setPickupError("");
  }

  function onSubmit(data: StepPricingData) {
    if (!data.pickup_address) {
      setPickupError("Please search for and select a pickup address");
      return;
    }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Pricing &amp; location</h2>
        <p className="text-sm text-text-muted mt-1">
          {listingType === "for_sale"
            ? "Set your price and where pickup is."
            : "Let buyers know where to collect."}
        </p>
      </div>

      {listingType === "for_sale" && (
        <Input
          label="Price (₦)"
          type="number"
          min="1"
          placeholder="e.g. 15000"
          error={errors.price?.message}
          leadingIcon={<Banknote size={16} className="text-text-muted" />}
          {...register("price", {
            required: "Price is required for For Sale listings",
            valueAsNumber: true,
            min: { value: 1, message: "Price must be greater than 0" },
          })}
        />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text">
          Item size{" "}
          <span className="text-text-muted text-xs font-normal">
            — determines delivery vehicle
          </span>
        </label>
        <Controller
          name="size_category"
          control={control}
          rules={{ required: "Please select a size" }}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = field.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={[
                      "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border-strong",
                    ].join(" ")}
                  >
                    <div
                      className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-text-muted"}`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-text-muted leading-snug">
                        {opt.description}
                      </p>
                      <p
                        className={`text-xs font-medium mt-1 ${isSelected ? "text-primary" : "text-text-muted"}`}
                      >
                        via {opt.vehicle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.size_category && (
          <p className="text-sm text-error">{errors.size_category.message}</p>
        )}
      </div>

      {/* Hidden fields — set programmatically from PlacesAddressInput */}
      <input type="hidden" {...register("pickup_address")} />
      <input type="hidden" {...register("area")} />

      <PlacesAddressInput
        label="Pickup address"
        placeholder="Search for your pickup address"
        defaultValue={defaultValues?.pickup_address ?? ""}
        onSelect={handlePickupSelect}
        onClear={() => {
          setValue("pickup_address", "");
          setValue("area", "");
        }}
        error={pickupError}
        required
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          Next <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
