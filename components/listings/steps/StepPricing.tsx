"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { MapPin, ArrowRight, Banknote } from "lucide-react";
import { Input, Button } from "@/components/ui";
import type { ListingType } from "@/types";

interface StepPricingData {
  price: number | null;
  area: string;
}

type PlacePrediction = { description: string };

type AutocompleteService = {
  getPlacePredictions: (
    request: {
      input: string;
      types?: ["(regions)"];
      componentRestrictions?: { country: string };
    },
    callback: (predictions: PlacePrediction[] | null, status: string) => void,
  ) => void;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => AutocompleteService;
        };
      };
    };
  }
}

interface StepPricingProps {
  listingType: ListingType;
  defaultValues?: Partial<StepPricingData>;
  onNext: (data: StepPricingData) => void;
  onBack: () => void;
}

function normalizeAreaSuggestion(description: string) {
  const parts = description
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return parts[0] ?? description.trim();
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
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues });
  const [areaInput, setAreaInput] = useState(defaultValues?.area ?? "");
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [isPlacesReady, setIsPlacesReady] = useState(false);
  const serviceRef = useRef<AutocompleteService | null>(null);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!isPlacesReady || serviceRef.current) return;
    const AutocompleteServiceCtor =
      window.google?.maps?.places?.AutocompleteService;
    if (!AutocompleteServiceCtor) return;
    serviceRef.current = new AutocompleteServiceCtor();
  }, [isPlacesReady]);

  useEffect(() => {
    const query = areaInput.trim();
    if (!query || query.length < 2 || !serviceRef.current) return;

    const timeout = window.setTimeout(() => {
      serviceRef.current?.getPlacePredictions(
        {
          input: query,
          types: ["(regions)"],
          componentRestrictions: { country: "ng" },
        },
        (predictions, status) => {
          if (!predictions || status !== "OK") {
            setAreaSuggestions([]);
            return;
          }

          const uniqueSuggestions = Array.from(
            new Set(
              predictions.map((item) =>
                normalizeAreaSuggestion(item.description),
              ),
            ),
          ).slice(0, 6);

          setAreaSuggestions(uniqueSuggestions);
        },
      );
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [areaInput]);

  function chooseSuggestion(suggestion: string) {
    setAreaInput(suggestion);
    setValue("area", suggestion, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setAreaSuggestions([]);
  }

  const areaField = register("area", {
    required: "Area is required",
    onChange: (event) => {
      const value = event.target.value as string;
      setAreaInput(value);
      if (value.trim().length < 2) {
        setAreaSuggestions([]);
      }
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {mapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setIsPlacesReady(true)}
        />
      )}

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

      <div className="relative">
        <Input
          label="Area"
          placeholder="e.g. Ajah, Lagos"
          error={errors.area?.message}
          autoComplete="off"
          leadingIcon={<MapPin size={16} className="text-text-muted" />}
          {...areaField}
        />

        {areaSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-border bg-card shadow-card overflow-hidden">
            {areaSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface transition-colors"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

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
