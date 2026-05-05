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

const CATEGORIES = [
  { value: "Electronics",              label: "Electronics",       icon: Smartphone },
  { value: "Furniture & Home",         label: "Furniture",         icon: Armchair   },
  { value: "Clothing & Accessories",   label: "Clothing",          icon: Shirt      },
  { value: "Appliances",               label: "Appliances",        icon: Plug       },
  { value: "Books & Stationery",       label: "Books",             icon: BookOpen   },
  { value: "Kids & Baby",              label: "Kids & Baby",       icon: Baby       },
  { value: "Sports & Outdoors",        label: "Sports",            icon: Dumbbell   },
  { value: "Vehicles & Parts",         label: "Vehicles",          icon: Car        },
  { value: "Other",                    label: "Other",             icon: Package    },
];

interface CategoryPickerProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">Category</label>

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
                size={20}
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
