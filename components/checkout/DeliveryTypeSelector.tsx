import { Truck, MapPin } from "lucide-react";

type Props = {
  value: "delivery" | "pickup";
  onChange: (value: "delivery" | "pickup") => void;
};

export default function DeliveryTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-text-muted mb-3">
        Delivery option
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("delivery")}
          className={[
            "rounded-xl border-2 p-4 text-left transition-all duration-150",
            value === "delivery"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card hover:border-border-strong",
          ].join(" ")}
        >
          <Truck
            size={18}
            className={
              value === "delivery" ? "text-primary" : "text-text-muted"
            }
          />
          <p className="font-semibold text-sm mt-2 text-text">Delivery</p>
          <p className="text-xs text-text-muted mt-0.5">
            Calculated at checkout
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange("pickup")}
          className={[
            "rounded-xl border-2 p-4 text-left transition-all duration-150",
            value === "pickup"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card hover:border-border-strong",
          ].join(" ")}
        >
          <MapPin
            size={18}
            className={value === "pickup" ? "text-primary" : "text-text-muted"}
          />
          <p className="font-semibold text-sm mt-2 text-text">Pickup</p>
          <p className="text-xs text-text-muted mt-0.5">
            Free — coordinate with seller
          </p>
        </button>
      </div>
    </div>
  );
}
