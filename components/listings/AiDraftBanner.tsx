"use client";

import { Sparkles } from "lucide-react";

interface AiDraftBannerProps {
  message?: string;
}

export function AiDraftBanner({
  message = "Drafted by AI — review and edit before continuing.",
}: AiDraftBannerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/6 px-3 py-2">
      <Sparkles size={14} className="shrink-0 text-primary" strokeWidth={2} />
      <p className="text-xs font-medium text-primary">{message}</p>
    </div>
  );
}
