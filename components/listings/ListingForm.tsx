"use client";

import { useReducer, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, FileText, Tag, Camera, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { StepType } from "./steps/StepType";
import { StepDetails } from "./steps/StepDetails";
import { StepPricing } from "./steps/StepPricing";
import { StepPhotos } from "./steps/StepPhotos";
import type { ListingFormData, ListingType } from "@/types";

export interface ListingFormProps {
  initialValues?: Partial<ListingFormData>;
  onSubmit: (data: ListingFormData) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
}

interface FormState {
  step: 1 | 2 | 3 | 4;
  direction: 1 | -1;
  data: Partial<ListingFormData>;
}

type FormAction =
  | { type: "NEXT"; payload: Partial<ListingFormData> }
  | { type: "BACK" };

interface StepMeta {
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
        step: Math.min(state.step + 1, 4) as FormState["step"],
        direction: 1,
        data: { ...state.data, ...action.payload },
      };
    case "BACK":
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as FormState["step"],
        direction: -1,
      };
  }
}

const STEPS: StepMeta[] = [
  { label: "Type",    hint: "Choose listing intent",  icon: ShoppingBag, color: "text-primary",    bgColor: "bg-primary/10"    },
  { label: "Details", hint: "Describe your item",     icon: FileText,    color: "text-amber-600",  bgColor: "bg-amber-500/10"  },
  { label: "Pricing", hint: "Set amount and area",    icon: Tag,         color: "text-green-600",  bgColor: "bg-green-500/10"  },
  { label: "Photos",  hint: "Upload final images",    icon: Camera,      color: "text-purple-600", bgColor: "bg-purple-500/10" },
];

export function ListingForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: ListingFormProps) {
  const [user, setUser] = useState<{
    stripe_onboarding_complete: boolean;
  } | null>(null);
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    direction: 1,
    data: initialValues ?? {},
  });

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((res) => setUser(res.data ?? null))
      .catch(() => null);
  }, []);

  function next(payload: Partial<ListingFormData>) {
    dispatch({ type: "NEXT", payload });
  }

  function back() {
    dispatch({ type: "BACK" });
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

  const progress = (state.step / STEPS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      {user && !user.stripe_onboarding_complete && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
          You need to{" "}
          <Link href="/dashboard/billing" className="font-medium underline">
            connect your Stripe account
          </Link>{" "}
          before you can list items.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5 h-fit">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">
              Steps
            </p>
            <span className="text-xs text-text-muted">{state.step} of {STEPS.length}</span>
          </div>

          <div className="h-1 bg-border rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </div>

          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const stepNum = (i + 1) as FormState["step"];
              const isActive = stepNum === state.step;
              const isDone = stepNum < state.step;
              const Icon = step.icon;

              return (
                <div
                  key={step.label}
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
                {state.step === 1 && (
                  <StepType
                    defaultValues={{ listing_type: state.data.listing_type }}
                    onNext={(data) => next(data)}
                  />
                )}
                {state.step === 2 && (
                  <StepDetails
                    defaultValues={{
                      title: state.data.title,
                      description: state.data.description,
                      category: state.data.category,
                      condition: state.data.condition,
                    }}
                    onNext={(data) => next(data)}
                    onBack={back}
                  />
                )}
                {state.step === 3 && (
                  <StepPricing
                    listingType={state.data.listing_type as ListingType}
                    defaultValues={{
                      price: state.data.price,
                      area: state.data.area,
                      size_category: state.data.size_category,
                      pickup_address: state.data.pickup_address,
                    }}
                    onNext={(data) => next(data)}
                    onBack={back}
                  />
                )}
                {state.step === 4 && (
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
