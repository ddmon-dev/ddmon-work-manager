import { Check } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { SCHEDULE_COLORS } from "./constants";

interface ColorSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorSelect({ value, onChange }: ColorSelectProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {SCHEDULE_COLORS.map((color) => (
        <button
          key={color.key}
          type="button"
          className={cn(
            "size-7 rounded-full transition-all flex items-center justify-center",
            color.dot,
            value === color.key
              ? "ring-2 ring-offset-2 ring-offset-background ring-ring"
              : "opacity-50 hover:opacity-80 hover:scale-110"
          )}
          title={color.label}
          onClick={() => onChange(color.key)}
        >
          {value === color.key && (
            <Check className="size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
          )}
        </button>
      ))}
    </div>
  );
}
