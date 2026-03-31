// components/ui/CustomDropdown.tsx
import { useState, useRef, useEffect, useId } from "react";

export interface DropdownOption {
  value: string;
  label: string;
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
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = `dropdown-${generatedId}`;

  const currentOption = value
    ? options.find((opt) => opt.value === value) || null
    : selectedOption;

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
    setSelectedOption(option);
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
          onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={[
            "block w-full px-4 py-3 text-left bg-card border rounded-md shadow-sm",
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
          <span className={`block truncate ${currentOption ? "text-text" : "text-text-muted"}`}>
            {currentOption ? currentOption.label : placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={`h-5 w-5 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-elevated max-h-60 overflow-auto">
            <ul className="py-1" role="listbox">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={currentOption?.value === option.value}
                    className={[
                      "w-full px-4 py-2.5 text-left focus:outline-none transition-colors",
                      option.disabled
                        ? "text-text-muted cursor-not-allowed"
                        : "cursor-pointer",
                      currentOption?.value === option.value
                        ? "bg-indigo-50 text-primary font-medium border-l-2 border-primary pl-3.5"
                        : "text-text hover:bg-indigo-50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {helperText && !error && <p className="text-sm text-text-muted">{helperText}</p>}
    </div>
  );
};

export { CustomDropdown };
