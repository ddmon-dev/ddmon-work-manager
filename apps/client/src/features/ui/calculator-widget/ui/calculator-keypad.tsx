import { cn } from "@/shared/utils/classnames";

interface CalculatorKeypadProps {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperator: (op: string) => void;
  onEquals: () => void;
  onClear: () => void;
  onClearEntry: () => void;
  onNegate: () => void;
  onPercent: () => void;
  showAC: boolean;
}

type ButtonVariant = "function" | "operator" | "number";

interface KeyDef {
  label: string;
  variant: ButtonVariant;
  action: () => void;
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

export function CalculatorKeypad({
  onDigit,
  onDecimal,
  onOperator,
  onEquals,
  onClear,
  onClearEntry,
  onNegate,
  onPercent,
  showAC,
}: CalculatorKeypadProps) {
  const keys: KeyDef[][] = [
    [
      { label: showAC ? "AC" : "C", variant: "function", action: showAC ? onClear : onClearEntry },
      { label: "+/-", variant: "function", action: onNegate },
      { label: "%", variant: "function", action: onPercent },
      { label: "÷", variant: "operator", action: () => onOperator("/") },
    ],
    [
      { label: "7", variant: "number", action: () => onDigit("7") },
      { label: "8", variant: "number", action: () => onDigit("8") },
      { label: "9", variant: "number", action: () => onDigit("9") },
      { label: "×", variant: "operator", action: () => onOperator("*") },
    ],
    [
      { label: "4", variant: "number", action: () => onDigit("4") },
      { label: "5", variant: "number", action: () => onDigit("5") },
      { label: "6", variant: "number", action: () => onDigit("6") },
      { label: "-", variant: "operator", action: () => onOperator("-") },
    ],
    [
      { label: "1", variant: "number", action: () => onDigit("1") },
      { label: "2", variant: "number", action: () => onDigit("2") },
      { label: "3", variant: "number", action: () => onDigit("3") },
      { label: "+", variant: "operator", action: () => onOperator("+") },
    ],
    [
      { label: "0", variant: "number", action: () => onDigit("0"), colSpan: 2 },
      { label: ".", variant: "number", action: onDecimal },
      { label: "=", variant: "operator", action: onEquals },
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
            onClick={key.action}
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
