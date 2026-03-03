import { cn } from "@/shared/utils/classnames";
import type { CalculatorAction } from "./calculator-reducer";

interface CalculatorKeypadProps {
  dispatch: React.Dispatch<CalculatorAction>;
  showAC: boolean;
}

type ButtonVariant = "function" | "operator" | "number";

interface KeyDef {
  label: string;
  variant: ButtonVariant;
  action: CalculatorAction;
  colSpan?: number;
}

const variantStyles: Record<ButtonVariant, string> = {
  function: cn(
    "bg-secondary/65 text-foreground hover:bg-secondary active:bg-muted-dark",
    "dark:bg-[#a5a5a5] dark:text-black dark:hover:bg-[#c0c0c0] dark:active:bg-[#d4d4d4]",
  ),
  operator: "bg-[#ff9f0a] text-white hover:bg-[#ffb640] active:bg-[#ffc766]",
  number: cn(
    "bg-muted/75 text-secondary-foreground hover:bg-muted active:bg-muted-dark",
    "dark:bg-[#333333] dark:text-white dark:hover:bg-[#4a4a4a] dark:active:bg-[#5a5a5a]",
  ),
};

export function CalculatorKeypad({ dispatch, showAC }: CalculatorKeypadProps) {
  const keys: KeyDef[][] = [
    [
      { label: showAC ? "AC" : "C", variant: "function", action: showAC ? { type: "CLEAR" } : { type: "CLEAR_ENTRY" } },
      { label: "+/-", variant: "function", action: { type: "NEGATE" } },
      { label: "%", variant: "function", action: { type: "PERCENT" } },
      { label: "÷", variant: "operator", action: { type: "OPERATOR", operator: "/" } },
    ],
    [
      { label: "7", variant: "number", action: { type: "DIGIT", digit: "7" } },
      { label: "8", variant: "number", action: { type: "DIGIT", digit: "8" } },
      { label: "9", variant: "number", action: { type: "DIGIT", digit: "9" } },
      { label: "×", variant: "operator", action: { type: "OPERATOR", operator: "*" } },
    ],
    [
      { label: "4", variant: "number", action: { type: "DIGIT", digit: "4" } },
      { label: "5", variant: "number", action: { type: "DIGIT", digit: "5" } },
      { label: "6", variant: "number", action: { type: "DIGIT", digit: "6" } },
      { label: "-", variant: "operator", action: { type: "OPERATOR", operator: "-" } },
    ],
    [
      { label: "1", variant: "number", action: { type: "DIGIT", digit: "1" } },
      { label: "2", variant: "number", action: { type: "DIGIT", digit: "2" } },
      { label: "3", variant: "number", action: { type: "DIGIT", digit: "3" } },
      { label: "+", variant: "operator", action: { type: "OPERATOR", operator: "+" } },
    ],
    [
      { label: "0", variant: "number", action: { type: "DIGIT", digit: "0" }, colSpan: 2 },
      { label: ".", variant: "number", action: { type: "DECIMAL" } },
      { label: "=", variant: "operator", action: { type: "EQUALS" } },
    ],
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 p-4 pt-2">
      {keys.flat().map((key) => {
        const isWide = key.colSpan === 2;
        return (
          <button
            key={key.label}
            type="button"
            onClick={() => dispatch(key.action)}
            className={cn(
              variantStyles[key.variant],
              "flex items-center rounded-full text-xl font-medium transition-colors cursor-pointer",
              isWide
                ? "col-span-2 px-6 text-left justify-start"
                : "aspect-square justify-center",
            )}
          >
            {key.label}
          </button>
        );
      })}
    </div>
  );
}
