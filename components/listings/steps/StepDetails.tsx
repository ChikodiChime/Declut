"use client";

import React from "react";
import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { Input, Button, CustomDropdown, CategoryPicker } from "@/components/ui";
import { AiDraftBanner } from "../AiDraftBanner";
import type { ReviewFormData } from "./reviewTypes";
import type { Condition } from "@/types";

interface StepDetailsData {
  title: string;
  description: string;
  category: string;
  condition: Condition;
}

interface StepDetailsProps {
  defaultValues?: Partial<StepDetailsData>;
  onNext?: (data: StepDetailsData) => void;
  onBack?: () => void;
  aiSuggested?: boolean;
  formMethods?: UseFormReturn<ReviewFormData>;
  hideChrome?: boolean;
}

function ConditionDots({ level }: { level: number }) {
  return (
    <span className="flex gap-[3px] shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < level ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

const CONDITION_OPTIONS: { value: Condition; label: string; icon: React.ReactNode }[] = [
  { value: "new",      label: "New — never used",         icon: <ConditionDots level={5} /> },
  { value: "like_new", label: "Like New — barely used",   icon: <ConditionDots level={4} /> },
  { value: "good",     label: "Good — minor signs of use",icon: <ConditionDots level={3} /> },
  { value: "fair",     label: "Fair — visible wear",      icon: <ConditionDots level={2} /> },
  { value: "poor",     label: "Poor — heavy wear",        icon: <ConditionDots level={1} /> },
];

export function StepDetails({ defaultValues, onNext, onBack, aiSuggested, formMethods, hideChrome }: StepDetailsProps) {
  const localForm = useForm<ReviewFormData>({ defaultValues });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = formMethods ?? localForm;

  const fields = (
    <>
      {!hideChrome && aiSuggested && (
        <AiDraftBanner message="AI drafted the title, category, and condition — review and edit as needed." />
      )}

      <Input
        label="Title"
        placeholder="e.g. Blue Nike Air Max size 43"
        error={errors.title?.message}
        {...register("title", {
          required: "Title is required",
          maxLength: { value: 100, message: "Max 100 characters" },
        })}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Description <span className="text-text-muted text-xs">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Describe the item — condition details, reason for selling, etc."
          className="block w-full px-4 py-3 text-sm text-text placeholder-text-muted bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200 resize-none"
          {...register("description", {
            maxLength: { value: 1000, message: "Max 1000 characters" },
          })}
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <Controller
        name="category"
        control={control}
        rules={{ required: "Please select a category" }}
        render={({ field }) => (
          <CategoryPicker
            value={field.value}
            onChange={field.onChange}
            error={errors.category?.message}
          />
        )}
      />

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
            placement="top"
          />
        )}
      />
    </>
  );

  if (hideChrome) return fields;

  return (
    <form onSubmit={handleSubmit(onNext!)} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text">Item details</h2>
        <p className="text-sm text-text-muted mt-1">Tell buyers about what you&apos;re listing.</p>
      </div>

      {fields}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          Next <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
