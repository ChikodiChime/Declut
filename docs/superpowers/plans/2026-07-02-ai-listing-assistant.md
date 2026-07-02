# AI Listing Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional "Quick Start with AI" step to the listing-creation wizard that drafts title, description, category, condition, listing type, and a comp-based price suggestion from uploaded photos, fully editable by the seller before publishing.

**Architecture:** A new auth-gated API route (`app/api/listings/ai-draft`) uses Gemini vision via the AI SDK's `generateObject` (one-shot structured output, not the existing chat tool-calling loop) to draft listing fields from photo URLs, then computes a price suggestion server-side from real comparable listings already in the database. A new wizard step (`StepQuickStart`) collects photos and calls this route; its output pre-fills the existing 4-step wizard's reducer state, renumbered to steps 2–5.

**Tech Stack:** Next.js 16 App Router, `ai` (Vercel AI SDK) `generateObject`, `@ai-sdk/google` (`gemini-2.5-flash`), Zod, Supabase (`supabaseAdmin`), existing Cloudinary upload pipeline, Vitest.

## Global Constraints

- Reuse `VALID_CATEGORIES`, `VALID_CONDITIONS`, `VALID_LISTING_TYPES` from `app/api/listings/utils.ts` — do not redefine these enums.
- AI output is a pre-fill only. Final validation on submit still goes through the existing `validateListingBody()` — never trust AI output directly into the database.
- No new dependencies — `ai`, `@ai-sdk/google`, `zod` are already installed.
- Price suggestion requires at least 3 comparable listings; otherwise return `null` rather than guessing.
- All new/modified files use the project's existing Tailwind + `lucide-react` + `framer-motion` visual conventions — match surrounding code, don't introduce a new UI pattern.

---

### Task 1: Price comparison pure function

**Files:**
- Create: `lib/listings/priceComp.ts`
- Test: `__tests__/lib/listings/priceComp.test.ts`

**Interfaces:**
- Produces: `computePriceSuggestion(targetCondition: string, comps: { price: number | null; condition: string }[]): { suggested_price: number | null; price_range: { min: number; max: number } | null; comp_count: number }` — used by Task 3's API route.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/listings/priceComp.test.ts
import { describe, it, expect } from 'vitest'
import { computePriceSuggestion } from '@/lib/listings/priceComp'

describe('computePriceSuggestion', () => {
  it('returns null suggestion when fewer than 3 comps exist', () => {
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
    ])
    expect(result).toEqual({ suggested_price: null, price_range: null, comp_count: 2 })
  })

  it('ignores comps with null or zero price when counting', () => {
    const result = computePriceSuggestion('good', [
      { price: null, condition: 'good' },
      { price: 0, condition: 'good' },
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
      { price: 3000, condition: 'good' },
    ])
    expect(result.comp_count).toBe(3)
  })

  it('returns a price suggestion and min/max range when 3 or more valid comps exist', () => {
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
      { price: 3000, condition: 'good' },
    ])
    expect(result.comp_count).toBe(3)
    expect(result.suggested_price).not.toBeNull()
    expect(result.price_range).toEqual({ min: 1000, max: 3000 })
  })

  it('weights comps matching the target condition more heavily in the median', () => {
    // 2 low-priced 'poor' comps vs 1 high-priced 'good' comp (target condition).
    // Without weighting the median would land on the poor price (1000).
    // With the matching-condition comp counted twice, the median shifts to 5000.
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'poor' },
      { price: 1000, condition: 'poor' },
      { price: 5000, condition: 'good' },
    ])
    expect(result.suggested_price).toBe(5000)
    expect(result.price_range).toEqual({ min: 1000, max: 5000 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/lib/listings/priceComp.test.ts`
Expected: FAIL with "Failed to resolve import @/lib/listings/priceComp" (module doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```typescript
// lib/listings/priceComp.ts

const MIN_COMPS_FOR_SUGGESTION = 3

interface CompListing {
  price: number | null
  condition: string
}

interface PriceSuggestion {
  suggested_price: number | null
  price_range: { min: number; max: number } | null
  comp_count: number
}

export function computePriceSuggestion(
  targetCondition: string,
  comps: CompListing[],
): PriceSuggestion {
  const validPrices = comps.filter(
    (c): c is CompListing & { price: number } => c.price != null && c.price > 0,
  )

  if (validPrices.length < MIN_COMPS_FOR_SUGGESTION) {
    return { suggested_price: null, price_range: null, comp_count: validPrices.length }
  }

  // Count condition-matching comps twice so the suggestion leans toward
  // items in the same condition as the one being priced.
  const weighted = validPrices.flatMap((c) =>
    c.condition === targetCondition ? [c.price, c.price] : [c.price],
  )
  const sorted = [...weighted].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  const rawPrices = validPrices.map((c) => c.price)

  return {
    suggested_price: Math.round(median),
    price_range: { min: Math.min(...rawPrices), max: Math.max(...rawPrices) },
    comp_count: validPrices.length,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/lib/listings/priceComp.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/listings/priceComp.ts __tests__/lib/listings/priceComp.test.ts
git commit -m "feat: add price comparison function for AI listing drafts"
```

---

### Task 2: Dedupe CategoryPicker's category list

**Files:**
- Modify: `components/ui/CategoryPicker.tsx`

**Interfaces:**
- Consumes: `VALID_CATEGORIES: string[]` from `app/api/listings/utils.ts` (already exists).
- Produces: `CategoryPicker` renders the same 9 categories as before — no visual or behavioral change, only the data source moves.

**Why now:** Task 3's AI schema must offer the model exactly these 9 categories. Fixing the duplication here means the AI schema and the picker UI are guaranteed to agree.

- [ ] **Step 1: Replace the hardcoded category values with the shared constant**

Read the current `CATEGORIES` array in `components/ui/CategoryPicker.tsx` (lines 15–25) — it hardcodes `value`/`label`/`icon` triples. Keep the icon mapping (icons aren't part of `VALID_CATEGORIES`), but derive `value` and `label` from the shared list so the two can never drift:

```typescript
// components/ui/CategoryPicker.tsx
"use client";
import { motion } from "framer-motion";
import {
  Smartphone,
  Armchair,
  Shirt,
  Plug,
  BookOpen,
  Baby,
  Dumbbell,
  Car,
  Package,
} from "lucide-react";
import { VALID_CATEGORIES } from "@/app/api/listings/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  "Electronics": Smartphone,
  "Furniture & Home": Armchair,
  "Clothing & Accessories": Shirt,
  "Appliances": Plug,
  "Books & Stationery": BookOpen,
  "Kids & Baby": Baby,
  "Sports & Outdoors": Dumbbell,
  "Vehicles & Parts": Car,
  "Other": Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  "Electronics": "Electronics",
  "Furniture & Home": "Furniture",
  "Clothing & Accessories": "Clothing",
  "Appliances": "Appliances",
  "Books & Stationery": "Books",
  "Kids & Baby": "Kids & Baby",
  "Sports & Outdoors": "Sports",
  "Vehicles & Parts": "Vehicles",
  "Other": "Other",
};

const CATEGORIES = VALID_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value] ?? value,
  icon: CATEGORY_ICONS[value] ?? Package,
}));
```

Leave the rest of the component (the `interface CategoryPickerProps`, the `CategoryPicker` function body, the JSX) exactly as it is — only the `CATEGORIES` array definition at the top changes.

- [ ] **Step 2: Verify no other file imports the old inline category list**

Run: `grep -rn "Furniture & Home" --include="*.tsx" --include="*.ts" components/ app/ | grep -v node_modules`
Expected: only matches inside `app/api/listings/utils.ts` (the source of truth) and `components/ui/CategoryPicker.tsx` (now referencing `CATEGORY_LABELS`/`CATEGORY_ICONS` keys, not a duplicate list)

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, navigate to `/dashboard/listings/new`, advance to the Details step, confirm all 9 category buttons render with the same icons and labels as before.

- [ ] **Step 4: Commit**

```bash
git add components/ui/CategoryPicker.tsx
git commit -m "refactor: derive CategoryPicker options from VALID_CATEGORIES"
```

---

### Task 3: AI draft API route

**Files:**
- Create: `app/api/listings/ai-draft/route.ts`

**Interfaces:**
- Consumes: `computePriceSuggestion` from `lib/listings/priceComp.ts` (Task 1); `VALID_CATEGORIES`, `VALID_CONDITIONS`, `VALID_LISTING_TYPES` from `app/api/listings/utils.ts`; `getAuthUser` from `@/lib/auth`; `supabaseAdmin` from `@/lib/supabase`; `ok`/`err` from `@/lib/api-response`.
- Produces: `POST /api/listings/ai-draft` accepting `{ public_ids: string[] }`, returning `{ data: { title: string; description: string; category: string; condition: Condition; listing_type: ListingType; suggested_price: number | null; price_range: { min: number; max: number } | null; comp_count: number; images: string[] } }` on success.

- [ ] **Step 1: Write the route**

```typescript
// app/api/listings/ai-draft/route.ts
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { computePriceSuggestion } from '@/lib/listings/priceComp'
import { VALID_CATEGORIES, VALID_CONDITIONS, VALID_LISTING_TYPES } from '../utils'
import type { Condition, ListingType } from '@/types'

const MAX_PHOTOS = 5

const draftSchema = z.object({
  title: z.string().min(1).max(100).describe('A concise, buyer-friendly title for the item'),
  description: z
    .string()
    .max(1000)
    .describe('A short description covering what the item is, notable features, and visible condition details'),
  category: z
    .enum(VALID_CATEGORIES as [string, ...string[]])
    .describe('The single best-fitting category from the allowed list'),
  condition: z
    .enum(VALID_CONDITIONS as [Condition, ...Condition[]])
    .describe('The item condition, judged from the photos'),
  listing_type: z
    .enum(VALID_LISTING_TYPES as [ListingType, ...ListingType[]])
    .describe(
      'for_sale for anything with resale value; free for low-value but usable items; donate for items better suited to a charity than an individual buyer',
    ),
})

const DRAFT_PROMPT = `You are helping a seller on Declutter, a Nigeria-focused secondhand marketplace, draft a listing from photos of their item.

Look at the photos and produce:
- A clear, specific title (not generic — include brand/model/color if visible)
- A short honest description mentioning visible condition, notable features, and any flaws
- The single best category from the allowed list
- The condition, judged conservatively from what's visible
- The listing_type: choose "for_sale" for anything with resale value, "free" for low-value but still usable items, or "donate" if the item would be better suited to a charity than an individual buyer

Never invent details you can't see in the photos. If the photos are unclear, keep the description general rather than guessing specifics.`

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: { public_ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400)
  }

  const publicIds = body.public_ids
  if (
    !Array.isArray(publicIds) ||
    publicIds.length === 0 ||
    publicIds.length > MAX_PHOTOS ||
    !publicIds.every((id) => typeof id === 'string')
  ) {
    return err(`public_ids must be an array of 1 to ${MAX_PHOTOS} strings`, 'VALIDATION_ERROR', 400)
  }

  const imageUrls = publicIds.map(
    (id) => `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${id}`,
  )

  let draft: z.infer<typeof draftSchema>
  try {
    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: draftSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DRAFT_PROMPT },
            ...imageUrls.map((url) => ({ type: 'image' as const, image: url })),
          ],
        },
      ],
    })
    draft = result.object
  } catch (aiError) {
    console.error('AI listing draft generation failed:', aiError)
    return err('Could not analyze these photos — please fill in the listing manually', 'SERVER_ERROR', 502)
  }

  let priceSuggestion = { suggested_price: null as number | null, price_range: null as { min: number; max: number } | null, comp_count: 0 }
  if (draft.listing_type === 'for_sale') {
    const { data: comps } = await supabaseAdmin
      .from('listings')
      .select('price, condition')
      .eq('status', 'available')
      .eq('listing_type', 'for_sale')
      .eq('category', draft.category)
      .limit(50)

    priceSuggestion = computePriceSuggestion(draft.condition, comps ?? [])
  }

  return ok({
    ...draft,
    ...priceSuggestion,
    images: publicIds,
  })
}
```

- [ ] **Step 2: Manually verify with a real request**

Run `npm run dev`, sign in as a seller, upload 1–2 photos via the existing `/dashboard/listings/new` flow's photo step to get real `public_ids` (or use an existing listing's `images` value from the DB), then:

```bash
curl -X POST http://localhost:3000/api/listings/ai-draft \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your session cookie>" \
  -d '{"public_ids":["declut/listings/<real-id>"]}'
```

Expected: `200` with a JSON body containing `title`, `description`, `category` (one of the 9 valid values), `condition`, `listing_type`, `suggested_price`, `price_range`, `comp_count`, `images`.

Also verify the 401 path:

```bash
curl -X POST http://localhost:3000/api/listings/ai-draft -H "Content-Type: application/json" -d '{"public_ids":["x"]}'
```

Expected: `401` with `{"error":{"message":"Unauthorized",...}}`

- [ ] **Step 3: Commit**

```bash
git add app/api/listings/ai-draft/route.ts
git commit -m "feat: add AI listing draft API route"
```

---

### Task 4: Shared AI-suggested banner component

**Files:**
- Create: `components/listings/AiDraftBanner.tsx`
- Modify: `components/listings/index.ts`

**Interfaces:**
- Produces: `AiDraftBanner({ message?: string })` — a small inline banner, consumed by Task 7.

- [ ] **Step 1: Write the component**

```tsx
// components/listings/AiDraftBanner.tsx
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
```

- [ ] **Step 2: Add it to the barrel export**

In `components/listings/index.ts`, add this line alongside the other exports:

```typescript
export { AiDraftBanner } from './AiDraftBanner'
```

- [ ] **Step 3: Commit**

```bash
git add components/listings/AiDraftBanner.tsx components/listings/index.ts
git commit -m "feat: add AiDraftBanner shared component"
```

---

### Task 5: StepQuickStart wizard step

**Files:**
- Create: `components/listings/steps/StepQuickStart.tsx`
- Modify: `components/listings/index.ts`

**Interfaces:**
- Consumes: `useUploadImage` from `@/lib/hooks/useListings` (existing); `ImageCropper` from `../ImageCropper` (existing); `ListingFormData`, `Condition`, `ListingType` from `@/types`.
- Produces: `StepQuickStart({ onNext, onSkip })` where `onNext: (draft: Partial<ListingFormData>, aiFields: (keyof ListingFormData)[], comp: { price_range: { min: number; max: number } | null; comp_count: number }) => void` and `onSkip: () => void` — consumed by Task 6.

- [ ] **Step 1: Write the component**

```tsx
// components/listings/steps/StepQuickStart.tsx
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
```

- [ ] **Step 2: Add it to the barrel export**

In `components/listings/index.ts`, add:

```typescript
export { StepQuickStart } from './steps/StepQuickStart'
```

- [ ] **Step 3: Commit**

```bash
git add components/listings/steps/StepQuickStart.tsx components/listings/index.ts
git commit -m "feat: add StepQuickStart wizard step for AI-assisted listing drafts"
```

---

### Task 6: Wire Quick Start into the listing wizard

**Files:**
- Modify: `components/listings/ListingForm.tsx`

**Interfaces:**
- Consumes: `StepQuickStart` (Task 5) with the exact `onNext`/`onSkip` signature defined there.
- Produces: the wizard now has 5 steps (`1` = Quick Start, `2` = Type, `3` = Details, `4` = Pricing, `5` = Photos); `aiFields: Set<keyof ListingFormData>` and `priceComp` become available as local state, passed down as new optional props in Task 7.

- [ ] **Step 1: Update imports and `FormState`/`STEPS`**

In `components/listings/ListingForm.tsx`, change the imports and types at the top of the file:

```typescript
"use client";

import { useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, FileText, Tag, Camera, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { StepQuickStart } from "./steps/StepQuickStart";
import { StepType } from "./steps/StepType";
import { StepDetails } from "./steps/StepDetails";
import { StepPricing } from "./steps/StepPricing";
import { StepPhotos } from "./steps/StepPhotos";
import type { ListingFormData, ListingType } from "@/types";
```

Update `FormState` and the reducer's bounds:

```typescript
interface FormState {
  step: 1 | 2 | 3 | 4 | 5;
  direction: 1 | -1;
  data: Partial<ListingFormData>;
}

type FormAction =
  | { type: "NEXT"; payload: Partial<ListingFormData> }
  | { type: "BACK" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "NEXT":
      return {
        step: Math.min(state.step + 1, 5) as FormState["step"],
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
```

Update `STEPS` to prepend the Quick Start entry:

```typescript
const STEPS: StepMeta[] = [
  { label: "Quick Start", hint: "Let AI draft it (optional)", icon: Sparkles, color: "text-primary",    bgColor: "bg-primary/10"    },
  { label: "Type",        hint: "Choose listing intent",      icon: ShoppingBag, color: "text-primary",    bgColor: "bg-primary/10"    },
  { label: "Details",     hint: "Describe your item",         icon: FileText,    color: "text-amber-600",  bgColor: "bg-amber-500/10"  },
  { label: "Pricing",     hint: "Set amount and area",        icon: Tag,         color: "text-green-600",  bgColor: "bg-green-500/10"  },
  { label: "Photos",      hint: "Upload final images",        icon: Camera,      color: "text-purple-600", bgColor: "bg-purple-500/10" },
];
```

- [ ] **Step 2: Add AI-tracking state and handlers inside `ListingForm`**

Right after the `useReducer` call inside the `ListingForm` function body, add:

```typescript
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    direction: 1,
    data: initialValues ?? {},
  });

  const [aiFields, setAiFields] = useState<Set<keyof ListingFormData>>(new Set());
  const [priceComp, setPriceComp] = useState<{
    price_range: { min: number; max: number } | null;
    comp_count: number;
  } | null>(null);

  function next(payload: Partial<ListingFormData>) {
    dispatch({ type: "NEXT", payload });
  }

  function back() {
    dispatch({ type: "BACK" });
  }

  function handleQuickStartNext(
    draft: Partial<ListingFormData>,
    fields: (keyof ListingFormData)[],
    comp: { price_range: { min: number; max: number } | null; comp_count: number },
  ) {
    setAiFields(new Set(fields));
    setPriceComp(comp);
    next(draft);
  }

  function handleQuickStartSkip() {
    next({});
  }
```

(This replaces the existing `next`/`back` function declarations — keep them, just add the two new handlers alongside.)

- [ ] **Step 3: Renumber the step conditionals and render `StepQuickStart`**

In the `AnimatePresence` block, change the step-number conditionals from `1/2/3/4` to `1/2/3/4/5`, with `1` now rendering the new step:

```tsx
                {state.step === 1 && (
                  <StepQuickStart
                    onNext={handleQuickStartNext}
                    onSkip={handleQuickStartSkip}
                  />
                )}
                {state.step === 2 && (
                  <StepType
                    defaultValues={{ listing_type: state.data.listing_type }}
                    onNext={(data) => next(data)}
                    aiSuggested={aiFields.has("listing_type")}
                  />
                )}
                {state.step === 3 && (
                  <StepDetails
                    defaultValues={{
                      title: state.data.title,
                      description: state.data.description,
                      category: state.data.category,
                      condition: state.data.condition,
                    }}
                    onNext={(data) => next(data)}
                    onBack={back}
                    requestIds={requestIds}
                    onRequestChange={onRequestChange}
                    aiSuggested={aiFields.has("title") || aiFields.has("category") || aiFields.has("condition")}
                  />
                )}
                {state.step === 4 && (
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
                    priceHint={aiFields.has("price") ? priceComp : null}
                  />
                )}
                {state.step === 5 && (
                  <StepPhotos
                    defaultImages={state.data.images}
                    onNext={handleFinalSubmit}
                    onBack={back}
                    isPending={isPending}
                  />
                )}
```

Note: `StepType`, `StepDetails`, and `StepPricing` don't accept `aiSuggested`/`priceHint` props yet — Task 7 adds them. This task's code won't type-check until Task 7 is done; that's expected since they're part of the same feature landing together. Do Task 7 immediately after this one before running the type checker.

- [ ] **Step 4: Commit (after Task 7 makes this type-check)**

Hold this commit until Task 7 is complete — see Task 7's commit step, which stages both files together.

---

### Task 7: Show AI-suggested banners in Type, Details, and Pricing steps

**Files:**
- Modify: `components/listings/steps/StepType.tsx`
- Modify: `components/listings/steps/StepDetails.tsx`
- Modify: `components/listings/steps/StepPricing.tsx`

**Interfaces:**
- Consumes: `AiDraftBanner` from `../AiDraftBanner` (Task 4).
- Produces: `StepType` gains an optional `aiSuggested?: boolean` prop; `StepDetails` gains an optional `aiSuggested?: boolean` prop; `StepPricing` gains an optional `priceHint?: { price_range: { min: number; max: number } | null; comp_count: number } | null` prop. These match exactly what Task 6 passes in.

- [ ] **Step 1: Update `StepType.tsx`**

Add the import and prop, and render the banner under the header:

```typescript
import { AiDraftBanner } from "../AiDraftBanner";
```

```typescript
interface StepTypeProps {
  defaultValues?: Partial<StepTypeData>;
  onNext: (data: StepTypeData) => void;
  aiSuggested?: boolean;
}

export function StepType({ defaultValues, onNext, aiSuggested }: StepTypeProps) {
```

In the JSX, right after the header `<div>` block (the one containing the `<h2>What kind of listing?</h2>`), add:

```tsx
      {aiSuggested && <AiDraftBanner message="AI suggested this listing type — feel free to change it." />}
```

- [ ] **Step 2: Update `StepDetails.tsx`**

Add the import and prop:

```typescript
import { AiDraftBanner } from "../AiDraftBanner";
```

```typescript
interface StepDetailsProps {
  defaultValues?: Partial<StepDetailsData>;
  onNext: (data: StepDetailsData) => void;
  onBack: () => void;
  requestIds?: string[];
  onRequestChange?: (ids: string[]) => void;
  aiSuggested?: boolean;
}

export function StepDetails({ defaultValues, onNext, onBack, requestIds, onRequestChange, aiSuggested }: StepDetailsProps) {
```

In the JSX, right after the header `<div>` block (the one containing `<h2>Item details</h2>`), add:

```tsx
      {aiSuggested && <AiDraftBanner message="AI drafted the title, category, and condition — review and edit as needed." />}
```

- [ ] **Step 3: Update `StepPricing.tsx`**

Add the import and prop:

```typescript
import { AiDraftBanner } from "../AiDraftBanner";
```

```typescript
interface StepPricingProps {
  listingType: ListingType;
  defaultValues?: Partial<StepPricingData>;
  onNext: (data: StepPricingData) => void;
  onBack: () => void;
  priceHint?: { price_range: { min: number; max: number } | null; comp_count: number } | null;
}

export function StepPricing({
  listingType,
  defaultValues,
  onNext,
  onBack,
  priceHint,
}: StepPricingProps) {
```

In the JSX, right after the header `<div>` block (the one containing `<h2>Pricing &amp; location</h2>`), add:

```tsx
      {priceHint && listingType === "for_sale" && (
        <AiDraftBanner
          message={
            priceHint.price_range
              ? `AI suggested this price based on ${priceHint.comp_count} similar listings (₦${priceHint.price_range.min.toLocaleString("en-NG")}–₦${priceHint.price_range.max.toLocaleString("en-NG")}) — feel free to adjust.`
              : "AI suggested this price — feel free to adjust."
          }
        />
      )}
```

- [ ] **Step 4: Type-check the whole feature**

Run: `npx tsc --noEmit`
Expected: no errors in `components/listings/` or `app/api/listings/ai-draft/`

- [ ] **Step 5: Manual browser verification of the full flow**

Run: `npm run dev`, sign in as a seller, go to `/dashboard/listings/new`:
1. On "Quick Start", upload 1-3 real photos of an item, click "Generate draft" — confirm the button shows a loading state and doesn't error.
2. Confirm you land on "Type" with a listing type pre-selected and the AI banner visible.
3. Advance to "Details" — confirm title/category/condition are pre-filled with the banner visible, and that every field is editable.
4. Advance to "Pricing" — if the listing type is `for_sale`, confirm a price is pre-filled with the comp-based banner message (or the fallback message if fewer than 3 comps exist for that category).
5. Advance to "Photos" — confirm the photos uploaded in Quick Start already appear, reorder/remove still works.
6. Publish the listing and confirm it's created correctly.
7. Start a second new listing and click "Skip, I'll fill this in myself" on Quick Start — confirm the wizard behaves exactly as it did before this feature (no banners, empty fields).

- [ ] **Step 6: Commit**

```bash
git add components/listings/ListingForm.tsx components/listings/steps/StepType.tsx components/listings/steps/StepDetails.tsx components/listings/steps/StepPricing.tsx
git commit -m "feat: wire AI-suggested banners and Quick Start into the listing wizard"
```

---

## Self-Review Notes

- **Spec coverage:** Quick Start entry point (Task 5/6), comp-based pricing (Task 1/3), listing_type suggestion (Task 3 schema/prompt), CategoryPicker dedupe (Task 2), error handling/fallback-to-manual (Task 3 catch block + Task 5's toast-and-continue), skip path preserves old flow (Task 6 `handleQuickStartSkip`), testing (Task 1 unit tests + manual pass in Task 7) — all covered.
- **Deviation from spec, noted explicitly:** the design doc says "every AI-sourced field shows a small badge." This plan implements one banner per wizard step instead of a badge per individual field, to avoid invasive changes to every `register()` call across three existing forms in a first iteration. The banner still clearly communicates which step's values came from AI and prompts review, which was the underlying intent.
- **No route-level auth test added:** the codebase's existing test suite (`__tests__/api/**`) only tests pure validation/formatting functions, never Next.js route handlers directly (no established mocking pattern for `getAuthUser`/request objects exists). Adding one now would introduce a new testing pattern out of proportion to this feature; Task 3's manual verification step covers the 401 case instead, consistent with how `/api/upload` (which has the identical auth gate) is verified today.
