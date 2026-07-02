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

interface CategoryPickerProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  hideLabel?: boolean;
}

export function CategoryPicker({ value, onChange, error, hideLabel }: CategoryPickerProps) {
  return (
    <div className="space-y-2">
      {!hideLabel && <label className="block text-sm font-medium text-text">Category</label>}

      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = value === cat.value;

          return (
            <motion.button
              key={cat.value}
              type="button"
              onClick={() => onChange(cat.value)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={[
                "relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border-2 text-center",
                "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30",
                isSelected
                  ? "border-primary bg-primary/6 text-primary"
                  : "border-border bg-card text-text-muted hover:border-primary/40 hover:text-text",
              ].join(" ")}
            >
              <Icon
                size={32}
                strokeWidth={isSelected ? 2 : 1.75}
                className={isSelected ? "text-primary" : "text-text-muted"}
              />
              <span className={`text-[11px] font-medium leading-tight ${isSelected ? "text-primary" : "text-text"}`}>
                {cat.label}
              </span>
              {isSelected && (
                <motion.span
                  layoutId="category-selection"
                  className="absolute inset-0 rounded-lg ring-2 ring-primary/30"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
