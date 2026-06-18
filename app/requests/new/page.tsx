"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Bell,
  ShoppingBag,
  Gift,
  MapPin,
  Tag,
  FileText,
  Sparkles,
} from "lucide-react";
import { CategoryPicker, Input } from "@/components/ui";
import { useCreateRequest, CreateRequestData } from "@/lib/hooks/useRequests";
import type { ListingType } from "@/types";

const TYPE_OPTIONS: { value: ListingType | ""; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "",         label: "Any type",  icon: Sparkles,    color: "#56524d", bg: "#f5f1eb" },
  { value: "for_sale", label: "For Sale",  icon: ShoppingBag, color: "#4f46e5", bg: "rgba(79,70,229,0.09)" },
  { value: "free",     label: "Free",      icon: Gift,        color: "#059669", bg: "rgba(5,150,105,0.09)" },
];

const STEPS = [
  { icon: FileText, text: "Your request appears on the community board" },
  { icon: Bell,     text: "Sellers browsing requests are notified" },
  { icon: ShoppingBag, text: "When a matching item is listed, you get alerted" },
];

interface FormData {
  title: string;
  description: string;
  category: string;
  listing_type: ListingType | "";
  area: string;
  max_price: string;
}

function NewRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync: createRequest, isPending } = useCreateRequest();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: searchParams.get("title") ?? "",
      listing_type: "",
      category: "",
    },
  });

  const [listingType, setListingType] = useState<ListingType | "">("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const titleValue = watch("title") ?? "";

  async function onSubmit(values: FormData) {
    const payload: CreateRequestData = {
      title: values.title,
      description: values.description || undefined,
      category: values.category || undefined,
      listing_type: listingType || undefined,
      area: values.area || undefined,
      max_price:
        listingType === "for_sale" && values.max_price
          ? Number(values.max_price)
          : undefined,
    };

    await createRequest(payload);
    router.push("/requests");
  }

  return (
    <main className="min-h-screen" style={{ background: "#faf8f4", paddingTop: 76 }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">

        {/* Back link */}
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-8 transition-colors"
          style={{ color: "#a8a09a" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#16130f")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a8a09a")}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Community Requests
        </Link>

        <div className="grid lg:grid-cols-[1fr_620px] gap-8 lg:gap-12 items-start">

          {/* ── Left: Info panel ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="hidden lg:flex flex-col gap-8 sticky top-28"
          >
            {/* Hero card */}
            <div
              className="relative overflow-hidden rounded-3xl px-8 py-10"
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
              }}
            >
              {/* Dot grid */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Community Requests
              </p>

              <h2
                className="font-bold text-white leading-tight mb-3"
                style={{ fontSize: "clamp(22px, 2.5vw, 30px)" }}
              >
                Can&apos;t find it?
                <br />
                <span style={{ color: "#a5b4fc" }}>Ask the community.</span>
              </h2>

              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                Post what you&apos;re looking for. Sellers browsing the
                community board will see your request and can list a
                matching item.
              </p>
            </div>

            {/* How it works */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-5" style={{ color: "#a8a09a" }}>
                How it works
              </p>
              <div className="flex flex-col">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === STEPS.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
                      className="flex gap-4"
                    >
                      {/* Number + connector */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 shrink-0"
                          style={{ borderColor: "#4f46e5", color: "#4f46e5", background: "white" }}
                        >
                          {i + 1}
                        </div>
                        {!isLast && (
                          <div
                            className="w-px flex-1 mt-1 mb-1"
                            style={{ background: "rgba(79,70,229,0.18)", minHeight: 20 }}
                          />
                        )}
                      </div>

                      {/* Icon + text */}
                      <div className={`flex items-start gap-2.5 ${isLast ? "pb-0" : "pb-5"}`}>
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(79,70,229,0.08)" }}
                        >
                          <Icon size={13} strokeWidth={1.75} style={{ color: "#4f46e5" }} />
                        </div>
                        <p className="text-[13px] leading-snug pt-1" style={{ color: "#56524d" }}>
                          {step.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* ── Right: Form ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            {/* Mobile header */}
            <div className="lg:hidden mb-6">
              <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>
                Post a request
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: "#78726c" }}>
                Tell the community what you&apos;re looking for.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-3xl border bg-white shadow-sm overflow-hidden"
              style={{ borderColor: "#e8e4dc" }}
            >
              {/* Section: What you need */}
              <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
                <div className="flex items-center gap-2 mb-5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(79,70,229,0.10)" }}
                  >
                    <FileText size={13} strokeWidth={1.75} style={{ color: "#4f46e5" }} />
                  </div>
                  <p className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
                    What you need
                  </p>
                </div>

                {/* Title */}
                <div className="mb-4">
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
                    placeholder="e.g. Vintage dining chair, Nike Air Force 1 size 43…"
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
                    <span className="font-normal" style={{ color: "#a8a09a" }}>
                      (optional)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Size, colour, condition you prefer, how urgent — the more detail, the better the match"
                    className="w-full px-4 py-3 rounded-xl border text-[13px] leading-relaxed resize-none transition-all focus:outline-none placeholder:text-[#c4bdb5]"
                    style={{ borderColor: "#e0dbd3", color: "#16130f" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#4f46e5";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.10)";
                    }}
                    {...register("description", {
                      maxLength: { value: 500, message: "Max 500 characters" },
                      onBlur: (e) => {
                        e.currentTarget.style.borderColor = "#e0dbd3";
                        e.currentTarget.style.boxShadow = "none";
                      },
                    })}
                  />
                  {errors.description && (
                    <p className="text-[12px]" style={{ color: "#ef4444" }}>
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 sm:mx-7 h-px" style={{ background: "#f0ece6" }} />

              {/* Section: Help sellers find you */}
              <div className="px-6 py-5 sm:px-7 space-y-5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(5,150,105,0.10)" }}
                  >
                    <Tag size={13} strokeWidth={1.75} style={{ color: "#059669" }} />
                  </div>
                  <p className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
                    Help sellers find you
                  </p>
                </div>

                {/* Category */}
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
                        Category{" "}
                        <span className="font-normal" style={{ color: "#a8a09a" }}>
                          (optional)
                        </span>
                      </label>
                      <CategoryPicker
                        hideLabel
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.category?.message}
                      />
                    </div>
                  )}
                />

                {/* Listing type — inline pills */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
                    Preferred type{" "}
                    <span className="font-normal" style={{ color: "#a8a09a" }}>
                      (optional)
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TYPE_OPTIONS.map((opt) => {
                      const selected = listingType === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setListingType(opt.value)}
                          className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border text-[12px] font-medium transition-all duration-150"
                          style={{
                            borderColor: selected ? opt.color : "#e0dbd3",
                            background: selected ? opt.bg : "white",
                            color: selected ? opt.color : "#78726c",
                          }}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            style={{ color: selected ? opt.color : "#a8a09a" }}
                          />
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
                    <span className="font-normal" style={{ color: "#a8a09a" }}>
                      (optional)
                    </span>
                  </label>
                  <Input
                    placeholder="e.g. Lagos, Abuja, Port Harcourt…"
                    leadingIcon={<MapPin size={14} strokeWidth={2} style={{ color: "#a8a09a" }} />}
                    {...register("area")}
                  />
                </div>

                {/* Max price — only when For Sale selected */}
                {listingType === "for_sale" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5"
                  >
                    <label className="text-[13px] font-semibold" style={{ color: "#16130f" }}>
                      Max budget{" "}
                      <span className="font-normal" style={{ color: "#a8a09a" }}>
                        (optional)
                      </span>
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
                        <span className="text-[13px] font-medium select-none" style={{ color: "#a8a09a" }}>
                          ₦
                        </span>
                      }
                    />
                  </motion.div>
                )}
              </div>

              {/* Submit footer */}
              <div
                className="px-6 py-5 sm:px-7 border-t"
                style={{ borderColor: "#f0ece6", background: "#faf8f4" }}
              >
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "#4f46e5" }}
                  onMouseEnter={(e) => {
                    if (!isPending)
                      (e.currentTarget as HTMLElement).style.background = "#4338ca";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#4f46e5";
                  }}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      />
                      Posting…
                    </span>
                  ) : (
                    <>
                      <Send size={15} strokeWidth={2} />
                      Post request
                    </>
                  )}
                </button>
                <p className="mt-3 text-center text-[11px]" style={{ color: "#a8a09a" }}>
                  Your request will be visible to all sellers on the community board.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense>
      <NewRequestContent />
    </Suspense>
  );
}
