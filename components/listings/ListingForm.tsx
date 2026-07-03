"use client";

import { useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, FileText, Tag, Camera, Check, Sparkles, Link2 } from "lucide-react";
import { Button } from "@/components/ui";
import { StepQuickStart } from "./steps/StepQuickStart";
import { StepType } from "./steps/StepType";
import { StepDetails } from "./steps/StepDetails";
import { StepPricing } from "./steps/StepPricing";
import { StepReview } from "./steps/StepReview";
import { StepRequests } from "./steps/StepRequests";
import { StepPhotos } from "./steps/StepPhotos";
import type { ListingFormData, ListingType } from "@/types";

export interface ListingFormProps {
  initialValues?: Partial<ListingFormData>;
  onSubmit: (data: ListingFormData) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
  requestIds?: string[];
  onRequestChange?: (ids: string[]) => void;
}

type StepId = "quickstart" | "type" | "details" | "requests" | "pricing" | "review" | "photos";

interface FormState {
  step: StepId;
  history: StepId[];
  direction: 1 | -1;
  data: Partial<ListingFormData>;
}

type FormAction =
  | { type: "NEXT"; to: StepId; payload: Partial<ListingFormData> }
  | { type: "BACK" };

interface StepMeta {
  id: StepId;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  color: string;
  bgColor: string;
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "NEXT":
      return {
        step: action.to,
        history: [...state.history, state.step],
        direction: 1,
        data: { ...state.data, ...action.payload },
      };
    case "BACK": {
      const prevStep = state.history[state.history.length - 1] ?? state.step;
      return {
        ...state,
        step: prevStep,
        history: state.history.slice(0, -1),
        direction: -1,
      };
    }
  }
}

const QUICKSTART_STEP: StepMeta = { id: "quickstart", label: "Quick Start", hint: "Let AI draft it (optional)", icon: Sparkles, color: "text-primary", bgColor: "bg-primary/10" };
const REQUESTS_STEP: StepMeta = { id: "requests", label: "Requests", hint: "Link a request (optional)", icon: Link2, color: "text-blue-600", bgColor: "bg-blue-500/10" };
const PHOTOS_STEP: StepMeta = { id: "photos", label: "Photos", hint: "Upload final images", icon: Camera, color: "text-purple-600", bgColor: "bg-purple-500/10" };

const MANUAL_STEPS: StepMeta[] = [
  QUICKSTART_STEP,
  { id: "type",    label: "Type",    hint: "Choose listing intent", icon: ShoppingBag, color: "text-primary",   bgColor: "bg-primary/10"   },
  { id: "details", label: "Details", hint: "Describe your item",    icon: FileText,    color: "text-amber-600", bgColor: "bg-amber-500/10" },
  { id: "pricing", label: "Pricing", hint: "Set amount and area",   icon: Tag,         color: "text-green-600", bgColor: "bg-green-500/10" },
  REQUESTS_STEP,
  PHOTOS_STEP,
];

const AI_STEPS: StepMeta[] = [
  QUICKSTART_STEP,
  { id: "review", label: "Review", hint: "Check the AI draft", icon: Check, color: "text-amber-600", bgColor: "bg-amber-500/10" },
  REQUESTS_STEP,
  PHOTOS_STEP,
];

export function ListingForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
  requestIds,
  onRequestChange,
}: ListingFormProps) {
  const [state, dispatch] = useReducer(formReducer, {
    step: "quickstart",
    history: [],
    direction: 1,
    data: initialValues ?? {},
  });

  const [tookAiPath, setTookAiPath] = useState(false);
  const [aiFields, setAiFields] = useState<Set<keyof ListingFormData>>(new Set());
  const [priceComp, setPriceComp] = useState<{
    price_range: { min: number; max: number } | null;
    comp_count: number;
  } | null>(null);

  function next(to: StepId, payload: Partial<ListingFormData>) {
    dispatch({ type: "NEXT", to, payload });
  }

  function back() {
    dispatch({ type: "BACK" });
  }

  function handleQuickStartNext(
    draft: Partial<ListingFormData>,
    fields: (keyof ListingFormData)[],
    comp: { price_range: { min: number; max: number } | null; comp_count: number },
  ) {
    setTookAiPath(true);
    setAiFields(new Set(fields));
    setPriceComp(comp);
    next("review", draft);
  }

  function handleQuickStartSkip() {
    setTookAiPath(false);
    next("type", {});
  }

  async function handleFinalSubmit(images: string[]) {
    const finalData = { ...state.data, images } as ListingFormData;
    await onSubmit(finalData);
  }

  const variants = {
    enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
  };

  const activeSteps = tookAiPath ? AI_STEPS : MANUAL_STEPS;
  const currentIndex = activeSteps.findIndex((s) => s.id === state.step);
  const progress = ((currentIndex + 1) / activeSteps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5 h-fit">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">
              Steps
            </p>
            <span className="text-xs text-text-muted">{currentIndex + 1} of {activeSteps.length}</span>
          </div>

          <div className="h-1 bg-border rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </div>

          <div className="space-y-2">
            {activeSteps.map((step, i) => {
              const isActive = i === currentIndex;
              const isDone = i < currentIndex;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={[
                    "flex items-center gap-3 rounded-xl p-3 transition-all duration-150",
                    isActive
                      ? "bg-primary/8 border border-primary/20"
                      : isDone
                        ? "border border-transparent opacity-60"
                        : "border border-transparent hover:bg-surface",
                  ].join(" ")}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-success/10" : step.bgColor}`}>
                    {isDone
                      ? <Check size={15} className="text-success" strokeWidth={2.5} />
                      : <Icon size={16} className={step.color} strokeWidth={1.75} />
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold leading-tight ${isDone ? "line-through text-text-muted" : isActive ? "text-text" : "text-text-muted"}`}>
                      {step.label}
                    </p>
                    {!isDone && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{step.hint}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {onCancel && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full gap-2 text-text-muted hover:text-text"
              >
                <X size={16} strokeWidth={2} /> Cancel
              </Button>
            </div>
          )}
        </aside>

        <section className="bg-card rounded-2xl border border-border shadow-card px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">

          {/* Animated step content */}
          <div className="overflow-x-hidden overflow-y-visible px-1 -mx-1">
            <AnimatePresence mode="wait" custom={state.direction}>
              <motion.div
                key={state.step}
                custom={state.direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {state.step === "quickstart" && (
                  <StepQuickStart
                    onNext={handleQuickStartNext}
                    onSkip={handleQuickStartSkip}
                  />
                )}
                {state.step === "type" && (
                  <StepType
                    defaultValues={{ listing_type: state.data.listing_type }}
                    onNext={(data) => next("details", data)}
                    onBack={back}
                  />
                )}
                {state.step === "details" && (
                  <StepDetails
                    defaultValues={{
                      title: state.data.title,
                      description: state.data.description,
                      category: state.data.category,
                      condition: state.data.condition,
                    }}
                    onNext={(data) => next("pricing", data)}
                    onBack={back}
                  />
                )}
                {state.step === "requests" && (
                  <StepRequests
                    category={state.data.category}
                    value={requestIds ?? []}
                    onChange={onRequestChange ?? (() => {})}
                    onNext={() => next("photos", {})}
                    onBack={back}
                  />
                )}
                {state.step === "pricing" && (
                  <StepPricing
                    listingType={state.data.listing_type as ListingType}
                    defaultValues={{
                      price: state.data.price,
                      area: state.data.area,
                      size_category: state.data.size_category,
                      pickup_address: state.data.pickup_address,
                    }}
                    onNext={(data) => next("requests", data)}
                    onBack={back}
                  />
                )}
                {state.step === "review" && (
                  <StepReview
                    defaultValues={{
                      listing_type: state.data.listing_type,
                      title: state.data.title,
                      description: state.data.description,
                      category: state.data.category,
                      condition: state.data.condition,
                      price: state.data.price,
                      area: state.data.area,
                      size_category: state.data.size_category,
                      pickup_address: state.data.pickup_address,
                    }}
                    onNext={(data) => next("requests", data)}
                    onBack={back}
                    priceHint={aiFields.has("price") ? priceComp : null}
                  />
                )}
                {state.step === "photos" && (
                  <StepPhotos
                    defaultImages={state.data.images}
                    onNext={handleFinalSubmit}
                    onBack={back}
                    isPending={isPending}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
