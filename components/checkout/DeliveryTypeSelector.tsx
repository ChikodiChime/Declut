import { Truck, MapPin } from "lucide-react";

type Props = {
  value: "delivery" | "pickup";
  onChange: (value: "delivery" | "pickup") => void;
};

export default function DeliveryTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-text mb-4">
        Delivery option
      </p>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onChange("delivery")}
          className={[
            "rounded-xl border-2 p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]",
            value === "delivery"
              ? "border-primary bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] shadow-sm"
              : "border-border bg-card hover:border-border-strong",
          ].join(" ")}
        >
          <div className={[
            "h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-all duration-200",
            value === "delivery" 
              ? "bg-primary/10" 
              : "bg-surface"
          ].join(" ")}>
            <Truck
              size={20}
              className={
                value === "delivery" ? "text-primary" : "text-text-muted"
              }
            />
          </div>
          <p className="font-semibold text-sm text-text">Delivery</p>
          <p className="text-xs text-text-muted mt-1">
            Calculated at checkout
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange("pickup")}
          className={[
            "rounded-xl border-2 p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]",
            value === "pickup"
              ? "border-primary bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] shadow-sm"
              : "border-border bg-card hover:border-border-strong",
          ].join(" ")}
        >
          <div className={[
            "h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-all duration-200",
            value === "pickup" 
              ? "bg-primary/10" 
              : "bg-surface"
          ].join(" ")}>
            <MapPin
              size={20}
              className={value === "pickup" ? "text-primary" : "text-text-muted"}
            />
          </div>
          <p className="font-semibold text-sm text-text">Pickup</p>
          <p className="text-xs text-text-muted mt-1">
            Free — coordinate with seller
          </p>
        </button>
      </div>
    </div>
  );
}
