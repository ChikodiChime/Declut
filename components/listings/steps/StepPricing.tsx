"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Truck,
  Package,
  MapPin,
} from "lucide-react";
import { Input, Button, AddressPickerModal } from "@/components/ui";
import { useAddresses } from "@/lib/hooks/useAddresses";
import { AiDraftBanner } from "../AiDraftBanner";
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
  priceHint?: { price_range: { min: number; max: number } | null; comp_count: number } | null;
}

export function StepPricing({
  listingType,
  defaultValues,
  onNext,
  onBack,
  priceHint,
}: StepPricingProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues });

  const [pickupError, setPickupError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const watchedPickupAddress = watch('pickup_address');
  const { data: addresses = [] } = useAddresses();

  useEffect(() => {
    if (defaultValues?.pickup_address) return;
    const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
    if (!defaultAddr) return;
    setValue('pickup_address', defaultAddr.address, { shouldValidate: false });
    setValue('area', defaultAddr.address_state ?? '');
  }, [addresses]); // eslint-disable-line react-hooks/exhaustive-deps

  const [priceDisplay, setPriceDisplay] = useState(
    defaultValues?.price != null
      ? defaultValues.price.toLocaleString("en-NG")
      : "",
  );

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const numeric = raw === "" ? null : parseInt(raw, 10);
    setValue("price", numeric, { shouldValidate: true });
    setPriceDisplay(raw === "" ? "" : parseInt(raw, 10).toLocaleString("en-NG"));
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

      {priceHint && listingType === "for_sale" && (
        <AiDraftBanner
          message={
            priceHint.price_range
              ? `AI suggested this price based on ${priceHint.comp_count} similar listings (₦${priceHint.price_range.min.toLocaleString("en-NG")}–₦${priceHint.price_range.max.toLocaleString("en-NG")}) — feel free to adjust.`
              : "AI suggested this price — feel free to adjust."
          }
        />
      )}

      {listingType === "for_sale" && (
        <>
          <input
            type="hidden"
            {...register("price", {
              required: "Price is required for For Sale listings",
              min: { value: 1, message: "Price must be greater than 0" },
              setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
            })}
          />
          <Input
            label="Price (₦)"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 15,000"
            value={priceDisplay}
            onChange={handlePriceChange}
            error={errors.price?.message}
            leadingIcon={<Banknote size={16} className="text-text-muted" />}
          />
        </>
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

      {/* Hidden fields — set programmatically */}
      <input type="hidden" {...register("pickup_address")} />
      <input type="hidden" {...register("area")} />

      {/* Pickup address */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Pickup address <span className="text-error">*</span>
        </label>
        <div
          className={[
            'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
            watchedPickupAddress ? 'border-border bg-card' : 'border-border bg-surface',
          ].join(' ')}
        >
          <MapPin size={15} className="shrink-0 text-text-muted" strokeWidth={2} />
          <span className={`flex-1 text-sm truncate ${watchedPickupAddress ? 'text-text' : 'text-text-subtle'}`}>
            {watchedPickupAddress || 'No address selected'}
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {watchedPickupAddress ? 'Change' : 'Choose'}
          </button>
        </div>
        {pickupError && <p className="text-sm text-error">{pickupError}</p>}
      </div>

      <AddressPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose pickup address"
        currentAddress={watchedPickupAddress || null}
        onConfirm={(address, state) => {
          setValue('pickup_address', address, { shouldValidate: true });
          setValue('area', state ?? '');
          setPickupError('');
        }}
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
