"use client";

import { ArrowRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui";
import { RequestPicker } from "@/components/requests/RequestPicker";

interface StepRequestsProps {
  category?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepRequests({ category, value, onChange, onNext, onBack }: StepRequestsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <Link2 size={18} className="text-blue-600" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">Someone&apos;s looking for this?</h2>
          <p className="text-sm text-text-muted mt-1">
            Optional — tag a matching request and everyone following it gets notified the moment you publish.
          </p>
        </div>
      </div>

      <RequestPicker value={value} onChange={onChange} category={category} />

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="button" className="flex-1 gap-2" onClick={onNext}>
          {value.length > 0 ? `Next · ${value.length} linked` : "Skip for now"}
          <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
