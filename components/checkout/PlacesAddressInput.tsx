"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export type PlaceResult = {
  formatted_address: string;
  city: string | null;
  state: string | null;
};

type PlacePrediction = google.maps.places.PlacePrediction;

type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  onSelect: (result: PlaceResult) => void;
  onClear?: () => void;
};

export default function PlacesAddressInput({
  defaultValue = "",
  placeholder = "Search for your address",
  label,
  error,
  required,
  onSelect,
  onClear,
}: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showStateFallback, setShowStateFallback] = useState(false);
  const [pendingResult, setPendingResult] = useState<PlaceResult | null>(null);
  const [stateOverride, setStateOverride] = useState("");

  const placesLib = useMapsLibrary("places");
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userTypingRef = useRef(false);

  useEffect(() => {
    const query = inputValue.trim();
    if (!query || query.length < 3 || !placesLib || !userTypingRef.current) {
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }

    const timer = window.setTimeout(async () => {
      try {
        const { suggestions } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ["ng"],
            sessionToken: sessionTokenRef.current!,
          });
        setPredictions(
          suggestions
            .slice(0, 5)
            .map((s) => s.placePrediction)
            .filter((p): p is PlacePrediction => p !== null),
        );
      } catch {
        setPredictions([]);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [inputValue, placesLib]);

  const handleSelect = useCallback(
    async (prediction: PlacePrediction) => {
      userTypingRef.current = false;
      setInputValue(prediction.text.toString());
      setPredictions([]);

      const token = sessionTokenRef.current ?? undefined;
      sessionTokenRef.current = null;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ["formattedAddress", "addressComponents"],
        });

        const components = place.addressComponents ?? [];
        const city =
          components.find((c) => c.types.includes("locality"))?.longText ?? null;
        const state =
          components.find((c) =>
            c.types.includes("administrative_area_level_1"),
          )?.longText ?? null;

        const result: PlaceResult = {
          formatted_address: place.formattedAddress ?? prediction.text.toString(),
          city,
          state,
        };

        if (!state) {
          setPendingResult(result);
          setShowStateFallback(true);
        } else {
          onSelect(result);
        }
      } catch {
        setPredictions([]);
      }
    },
    [onSelect],
  );

  const confirmStateOverride = useCallback(() => {
    if (!pendingResult || !stateOverride.trim()) return;
    onSelect({ ...pendingResult, state: stateOverride.trim() });
    setShowStateFallback(false);
    setPendingResult(null);
    setStateOverride("");
  }, [pendingResult, stateOverride, onSelect]);

  useEffect(() => {
    if (predictions.length === 0) return;

    function handleClose(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setPredictions([]);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleClose);
    };
  }, [predictions.length]);

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <MapPin size={16} className="text-text-muted" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            userTypingRef.current = true;
            setInputValue(e.target.value);
            if (!e.target.value) {
              setPredictions([]);
              onClear?.();
            } else if (e.target.value.trim().length < 3) {
              setPredictions([]);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none transition-colors"
        />

        {predictions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {predictions.map((p) => (
              <button
                key={p.placeId}
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                {p.text.toString()}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStateFallback && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-xs text-text-muted">
            We couldn&apos;t detect the state automatically. Please enter it:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={stateOverride}
              onChange={(e) => setStateOverride(e.target.value)}
              placeholder="e.g. Lagos"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={confirmStateOverride}
              className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
