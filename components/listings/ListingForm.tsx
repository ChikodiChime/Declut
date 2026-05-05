"use client";

import { useReducer, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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
  { label: "Type", hint: "Choose listing intent" },
  { label: "Details", hint: "Describe your item" },
  { label: "Pricing", hint: "Set amount and area" },
  { label: "Photos", hint: "Upload final images" },
];

export function ListingForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
}: ListingFormProps) {
  const [user, setUser] = useState<{ stripe_onboarding_complete: boolean } | null>(null)
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    direction: 1,
    data: initialValues ?? {},
  });

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data ?? null))
      .catch(() => null)
  }, [])

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
  const currentStepMeta = STEPS[state.step - 1];

  return (
    <div className="w-full">
      {user && !user.stripe_onboarding_complete && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need to{' '}
          <Link href="/dashboard/billing" className="font-medium underline">
            connect your Stripe account
          </Link>{' '}
          before you can list items.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5 h-fit">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-text-muted">
              Progress
            </p>
            <p className="text-sm font-medium text-text mt-1">
              Step {state.step} of {STEPS.length}
            </p>
          </div>

          <div className="mt-4 h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </div>

          <div className="mt-5 space-y-2.5">
            {STEPS.map((step, i) => {
              const stepNum = (i + 1) as FormState["step"];
              const isActive = stepNum === state.step;
              const isDone = stepNum < state.step;

              return (
                <div
                  key={step.label}
                  className={[
                    "flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors",
                    isActive ? "bg-primary/8" : "hover:bg-surface",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : isDone
                          ? "bg-success/15 text-success"
                          : "bg-border text-text-muted",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm ${isActive ? "text-text font-semibold" : "text-text"}`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {step.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full gap-2 text-text-muted hover:text-text"
            >
              <X size={16} strokeWidth={2} /> Cancel
            </Button>
          )}
        </aside>

        <section className="bg-card rounded-2xl border border-border shadow-card px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase text-text-muted">
                Step {state.step} · {currentStepMeta.label}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {currentStepMeta.hint}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-text-muted">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="h-px bg-border mb-6" />

          {/* Animated step content */}
          <div className="overflow-x-hidden overflow-y-visible">
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
    </div>
  );
}
