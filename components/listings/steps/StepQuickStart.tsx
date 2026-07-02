"use client";

import { useRef, useState } from "react";
import { CldImage } from "next-cloudinary";
import { ArrowRight, ImagePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { ImageCropper } from "../ImageCropper";
import { useUploadImage } from "@/lib/hooks/useListings";
import type { Condition, ListingFormData, ListingType } from "@/types";

const MAX_PHOTOS = 5;

interface AiDraftResponse {
  title: string;
  description: string;
  category: string;
  condition: Condition;
  listing_type: ListingType;
  suggested_price: number | null;
  price_range: { min: number; max: number } | null;
  comp_count: number;
  images: string[];
}

interface StepQuickStartProps {
  onNext: (
    draft: Partial<ListingFormData>,
    aiFields: (keyof ListingFormData)[],
    comp: { price_range: { min: number; max: number } | null; comp_count: number },
  ) => void;
  onSkip: () => void;
}

export function StepQuickStart({ onNext, onSkip }: StepQuickStartProps) {
  const [images, setImages] = useState<string[]>([]);
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage();

  const currentCrop = cropQueue[0] ?? null;
  const canAddMore = images.length < MAX_PHOTOS && cropQueue.length === 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - images.length;
    const urls = files.slice(0, remaining).map((f) => URL.createObjectURL(f));
    setCropQueue((prev) => [...prev, ...urls]);
    e.target.value = "";
  }

  async function handleCropDone(blob: Blob) {
    const doneSrc = cropQueue[0];
    setCropQueue((prev) => prev.slice(1));
    if (doneSrc) URL.revokeObjectURL(doneSrc);
    try {
      const { public_id } = await uploadImage(blob);
      setImages((prev) => [...prev, public_id]);
    } catch {
      // error toast handled inside useUploadImage onError
    }
  }

  function handleCancelCrop() {
    const doneSrc = cropQueue[0];
    if (doneSrc) URL.revokeObjectURL(doneSrc);
    setCropQueue((prev) => prev.slice(1));
  }

  function handleRemove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (images.length === 0) {
      toast.error("Add at least one photo first");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/listings/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_ids: images }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to generate draft");

      const draft = json.data as AiDraftResponse;
      const aiFields: (keyof ListingFormData)[] = [
        "title",
        "description",
        "category",
        "condition",
        "listing_type",
      ];
      if (draft.suggested_price != null) aiFields.push("price");

      onNext(
        {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          condition: draft.condition,
          listing_type: draft.listing_type,
          price: draft.suggested_price,
          images: draft.images,
        },
        aiFields,
        { price_range: draft.price_range, comp_count: draft.comp_count },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" strokeWidth={1.75} />
          <h2 className="text-xl font-bold text-text">Quick start with AI</h2>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          Upload photos and we&apos;ll draft the title, description, category, condition,
          and price for you — everything stays editable before you publish.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((id, i) => (
          <div key={id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-border">
            <CldImage
              src={id}
              fill
              sizes="(max-width: 640px) 33vw, 20vw"
              className="object-cover"
              alt={`Photo ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {isUploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <ImagePlus size={22} strokeWidth={1.5} />
                <span className="text-xs font-medium">Add photos</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {currentCrop && (
        <ImageCropper
          imageSrc={currentCrop}
          queueRemaining={cropQueue.length - 1}
          onCropDone={handleCropDone}
          onCancel={handleCancelCrop}
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onSkip}
          disabled={isGenerating}
        >
          Skip, I&apos;ll fill this in myself
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={handleGenerate}
          loading={isGenerating}
          disabled={isGenerating || isUploading || cropQueue.length > 0 || images.length === 0}
        >
          {isGenerating ? "Generating…" : "Generate draft"} <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
