"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Banknote, ImagePlus, GripVertical, MapPin } from "lucide-react";
import { CldImage } from "next-cloudinary";
import { Input, Button, CustomDropdown, CategoryPicker, AddressPickerModal } from "@/components/ui";
import { ResponsiveDrawer } from "@/components/ui/ResponsiveDrawer";
import { useAddresses } from "@/lib/hooks/useAddresses";
import { ImageCropper } from "./ImageCropper";
import { useUpdateListing, useUploadImage } from "@/lib/hooks/useListings";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Listing, ListingFormData, Condition, SizeCategory } from "@/types";

const CONDITION_OPTIONS: { value: Condition; label: string }[] = [
  { value: "new",      label: "New — never used" },
  { value: "like_new", label: "Like New — barely used" },
  { value: "good",     label: "Good — minor signs of use" },
  { value: "fair",     label: "Fair — visible wear" },
  { value: "poor",     label: "Poor — heavy wear" },
];

const SIZE_OPTIONS: { value: SizeCategory; label: string; sub: string }[] = [
  { value: "small",       label: "Small",       sub: "Clothes, phones, accessories" },
  { value: "medium",      label: "Medium",      sub: "Shoes, small appliances" },
  { value: "large",       label: "Large",       sub: "TVs, large appliances" },
  { value: "extra_large", label: "Extra Large", sub: "Furniture, fridges" },
];

// ─── Sortable photo tile ────────────────────────────────────────────────────

function SortablePhoto({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative aspect-square rounded-lg overflow-hidden bg-border touch-none"
    >
      <CldImage src={id} fill sizes="120px" className="object-cover" alt="" />
      <button
        type="button"
        className="absolute top-1 left-1 w-5 h-5 rounded bg-black/60 text-white flex items-center justify-center cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={10} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
      >
        <X size={9} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

interface EditListingDrawerProps {
  listing: Listing | null;
  onClose: () => void;
}

export function EditListingDrawer({ listing, onClose }: EditListingDrawerProps) {
  const open = listing !== null;
  const { mutateAsync: updateListing, isPending } = useUpdateListing(listing?.id ?? "");
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } =
    useForm<ListingFormData>({
      values: listing
        ? {
            listing_type: listing.listing_type,
            title: listing.title,
            description: listing.description ?? "",
            category: listing.category,
            condition: listing.condition,
            price: listing.price,
            area: listing.area,
            size_category: listing.size_category ?? "small",
            pickup_address: listing.pickup_address ?? "",
            images: listing.images,
          }
        : undefined,
    });

  const watchedPickupAddress = watch('pickup_address');
  const { data: addresses = [] } = useAddresses();

  useEffect(() => {
    if (!listing || listing.pickup_address) return;
    const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
    if (!defaultAddr) return;
    setValue('pickup_address', defaultAddr.address);
    setValue('area', defaultAddr.address_state ?? '');
  }, [listing?.id, addresses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const next = arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string));
      setValue("images", next);
      return next;
    });
  }

  // Photo upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 5 - images.length;
    const urls = files.slice(0, remaining).map((f) => URL.createObjectURL(f));
    setCropQueue((prev) => [...prev, ...urls]);
    e.target.value = "";
  }

  async function handleCropDone(blob: Blob) {
    const src = cropQueue[0];
    setCropQueue((prev) => prev.slice(1));
    if (src) URL.revokeObjectURL(src);
    try {
      const { public_id } = await uploadImage(blob);
      setImages((prev) => {
        const next = [...prev, public_id];
        setValue("images", next);
        return next;
      });
    } catch { /* toast handled in hook */ }
  }

  function handleCancelCrop() {
    const src = cropQueue[0];
    if (src) URL.revokeObjectURL(src);
    setCropQueue((prev) => prev.slice(1));
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setValue("images", next);
      return next;
    });
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const numeric = raw === "" ? null : parseInt(raw, 10);
    setValue("price", numeric, { shouldValidate: true });
    setPriceDisplay(raw === "" ? "" : parseInt(raw, 10).toLocaleString("en-NG"));
  }

  async function onSubmit(data: ListingFormData) {
    if (images.length === 0) { toast.error("Add at least one photo"); return; }
    await updateListing({ ...data, images });
    onClose();
  }

  return (
    <>
      <ResponsiveDrawer
        open={open}
        onClose={onClose}
        label="Edit listing"
        maxWidth={512}
        lockScroll={false}
        panelStyle={{ background: "var(--color-background)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: "#16130f" }}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Editing</p>
            <p className="text-[17px] font-bold truncate" style={{ color: "#ffffff" }}>
              {listing?.title ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-full ml-4 shrink-0 transition-all duration-200"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto" data-lenis-prevent>
          <div className="px-6 py-6 space-y-5">

            {/* Photos */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text">
                Photos
                <span className="text-text-muted text-xs font-normal ml-1">— drag to reorder, first is cover</span>
              </label>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((id, i) => (
                      <SortablePhoto key={id} id={id} onRemove={() => handleRemoveImage(i)} />
                    ))}
                    {images.length < 5 && cropQueue.length === 0 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {isUploading
                          ? <span className="text-[10px]">Uploading…</span>
                          : <ImagePlus size={18} strokeWidth={1.5} />}
                      </button>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              {cropQueue[0] && (
                <ImageCropper
                  imageSrc={cropQueue[0]}
                  queueRemaining={cropQueue.length - 1}
                  onCropDone={handleCropDone}
                  onCancel={handleCancelCrop}
                />
              )}
            </div>

            {/* Title */}
            <Input
              label="Title"
              placeholder="e.g. Blue Nike Air Max size 43"
              error={errors.title?.message}
              {...register("title", {
                required: "Title is required",
                maxLength: { value: 100, message: "Max 100 characters" },
              })}
            />

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text">
                Description <span className="text-text-muted text-xs font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the item — condition details, reason for selling, etc."
                className="block w-full px-4 py-3 text-sm text-text placeholder-text-muted bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition resize-none"
                {...register("description", { maxLength: { value: 1000, message: "Max 1000 characters" } })}
              />
              {errors.description && <p className="text-sm text-error">{errors.description.message}</p>}
            </div>

            {/* Category */}
            <Controller
              name="category"
              control={control}
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <CategoryPicker value={field.value} onChange={field.onChange} error={errors.category?.message} />
              )}
            />

            {/* Condition */}
            <Controller
              name="condition"
              control={control}
              rules={{ required: "Condition is required" }}
              render={({ field }) => (
                <CustomDropdown
                  label="Condition"
                  options={CONDITION_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select condition"
                  error={errors.condition?.message}
                />
              )}
            />

            {/* Price — only for_sale */}
            {listing?.listing_type === "for_sale" && (
              <>
                <input
                  type="hidden"
                  {...register("price", {
                    required: "Price is required",
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

            {/* Size category */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text">Item size</label>
              <Controller
                name="size_category"
                control={control}
                rules={{ required: "Please select a size" }}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={[
                          "flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-150",
                          field.value === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-border-strong",
                        ].join(" ")}
                      >
                        <p className={`text-sm font-semibold ${field.value === opt.value ? "text-primary" : "text-text"}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-text-muted leading-snug mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.size_category && <p className="text-sm text-error">{errors.size_category.message}</p>}
            </div>

            {/* Pickup address */}
            <input type="hidden" {...register("pickup_address")} />
            <input type="hidden" {...register("area")} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text">
                Pickup address
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
            </div>

            <AddressPickerModal
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              title="Choose pickup address"
              currentAddress={watchedPickupAddress || null}
              onConfirm={(address, state) => {
                setValue('pickup_address', address, { shouldValidate: true });
                setValue('area', state ?? '');
              }}
            />

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t border-border bg-background flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={isPending || isUploading || cropQueue.length > 0}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>
    </>
  );
}
