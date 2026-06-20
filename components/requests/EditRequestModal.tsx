"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { MapPin, ShoppingBag, Gift, Sparkles } from "lucide-react";
import { Modal, Input, CategoryPicker } from "@/components/ui";
import { useUpdateRequest } from "@/lib/hooks/useRequests";
import type { UpdateRequestData } from "@/lib/hooks/useRequests";
import type { ItemRequest, ListingType } from "@/types";

const TYPE_OPTIONS: { value: ListingType | ""; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "",         label: "Any",      icon: Sparkles,    color: "#56524d", bg: "#f5f1eb" },
  { value: "for_sale", label: "For Sale", icon: ShoppingBag, color: "#4f46e5", bg: "rgba(79,70,229,0.09)" },
  { value: "free",     label: "Free",     icon: Gift,        color: "#059669", bg: "rgba(5,150,105,0.09)" },
];

interface FormData {
  title: string;
  description: string;
  category: string;
  area: string;
  max_price: string;
}

export function EditRequestModal({
  request,
  onClose,
}: {
  request: ItemRequest;
  onClose: () => void;
}) {
  const { mutateAsync: updateRequest, isPending } = useUpdateRequest(request.id);
  const [editType, setEditType] = useState<ListingType | "">(request.listing_type ?? "");
  const [priceDisplay, setPriceDisplay] = useState(
    request.max_price ? request.max_price.toLocaleString() : ""
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: request.title,
      description: request.description ?? "",
      category: request.category ?? "",
      area: request.area ?? "",
      max_price: request.max_price ? String(request.max_price) : "",
    },
  });

  const titleValue = watch("title") ?? "";

  async function onSubmit(values: FormData) {
    const payload: UpdateRequestData = {
      title: values.title,
      description: values.description || undefined,
      category: values.category || undefined,
      listing_type: editType || undefined,
      area: values.area || undefined,
      max_price: editType === "for_sale" && values.max_price ? Number(values.max_price) : null,
    };
    await updateRequest(payload);
    onClose();
  }

  return (
    <Modal open title="Edit request" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
              Item name
            </label>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: titleValue.length > 85 ? "#ef4444" : "#c4bdb5" }}
            >
              {titleValue.length}/100
            </span>
          </div>
          <Input
            placeholder="e.g. Vintage dining chair…"
            error={errors.title?.message}
            {...register("title", {
              required: "Please describe what you need",
              minLength: { value: 3, message: "At least 3 characters" },
              maxLength: { value: 100, message: "Max 100 characters" },
            })}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
            More details{" "}
            <span className="font-normal" style={{ color: "#a8a09a" }}>(optional)</span>
          </label>
          {(() => {
            const { onBlur: rhfOnBlur, ...descRest } = register("description", { maxLength: { value: 500, message: "Max 500 characters" } });
            return (
              <textarea
                rows={3}
                placeholder="Size, colour, condition you prefer…"
                className="w-full px-4 py-3 rounded-xl border text-[13px] leading-relaxed resize-none focus:outline-none"
                style={{ borderColor: "#e0dbd3", color: "#16130f" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0dbd3";
                  e.currentTarget.style.boxShadow = "none";
                  rhfOnBlur(e);
                }}
                {...descRest}
              />
            );
          })()}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
            Category{" "}
            <span className="font-normal" style={{ color: "#a8a09a" }}>(optional)</span>
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategoryPicker hideLabel value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
            Preferred type{" "}
            <span className="font-normal" style={{ color: "#a8a09a" }}>(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const selected = editType === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditType(opt.value)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-2 border text-[12px] font-medium transition-all"
                  style={{
                    borderColor: selected ? opt.color : "#e0dbd3",
                    background: selected ? opt.bg : "white",
                    color: selected ? opt.color : "#78726c",
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} style={{ color: selected ? opt.color : "#a8a09a" }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Area */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
            Your area{" "}
            <span className="font-normal" style={{ color: "#a8a09a" }}>(optional)</span>
          </label>
          <Input
            placeholder="e.g. Lagos, Abuja…"
            leadingIcon={<MapPin size={14} strokeWidth={2} style={{ color: "#a8a09a" }} />}
            {...register("area")}
          />
        </div>

        {/* Max price */}
        {editType === "for_sale" && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
              Max budget{" "}
              <span className="font-normal" style={{ color: "#a8a09a" }}>(optional)</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="15,000"
              value={priceDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setPriceDisplay(raw ? Number(raw).toLocaleString() : "");
                setValue("max_price", raw);
              }}
              leadingIcon={
                <span className="text-[13px] font-medium select-none" style={{ color: "#a8a09a" }}>₦</span>
              }
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-[13px] font-medium transition-colors hover:bg-[#f5f1eb]"
            style={{ borderColor: "#e0dbd3", color: "#56524d" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "#4f46e5" }}
            onMouseEnter={(e) => { if (!isPending) (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
