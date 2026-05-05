// components/ui/CustomDropdown.tsx
"use client";
import { useState, useRef, useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomDropdown = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = `dropdown-${generatedId}`;

  const currentOption = options.find((opt) => opt.value === value) ?? null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return;
    setIsOpen(false);
    onChange?.(option.value);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label htmlFor={dropdownId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={dropdownId}
          onClick={() => { if (!disabled) setIsOpen((v) => !v); }}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={[
            "flex w-full items-center px-4 py-3 text-left bg-card border rounded-md shadow-sm",
            "transition duration-200 ease-in-out focus:outline-none focus:ring-2 cursor-pointer",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border focus:border-primary focus:ring-primary/20",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {currentOption?.icon && (
            <span className="mr-2.5 flex shrink-0 text-text-muted">{currentOption.icon}</span>
          )}
          <span className={`flex-1 block truncate ${currentOption ? "text-text" : "text-text-muted"}`}>
            {currentOption ? currentOption.label : placeholder}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 shrink-0 text-text-muted"
          >
            <ChevronDown size={18} strokeWidth={2} />
          </motion.span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-elevated max-h-60 overflow-auto"
            >
              <ul className="py-1" role="listbox">
                {options.map((option) => {
                  const isSelected = currentOption?.value === option.value;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => handleSelect(option)}
                        disabled={option.disabled}
                        role="option"
                        aria-selected={isSelected}
                        className={[
                          "flex w-full items-center gap-2.5 px-4 py-2.5 text-left focus:outline-none transition-colors",
                          option.disabled
                            ? "text-text-muted cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          isSelected
                            ? "bg-primary/8 text-primary font-medium"
                            : "text-text hover:bg-gray-50",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {option.icon && (
                          <span className="shrink-0 text-text-muted">{option.icon}</span>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {isSelected && (
                          <Check size={15} strokeWidth={2.5} className="shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {helperText && !error && <p className="text-sm text-text-muted">{helperText}</p>}
    </div>
  );
};

export { CustomDropdown };
