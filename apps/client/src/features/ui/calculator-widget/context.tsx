import { createContext, use, useRef, useState } from "react";

interface CalculatorContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const CalculatorContext = createContext<CalculatorContextType | null>(null);

export function useCalculator() {
  const ctx = use(CalculatorContext);
  if (!ctx) throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
}

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <CalculatorContext.Provider value={{ isOpen, open, close, toggle, triggerRef }}>
      {children}
    </CalculatorContext.Provider>
  );
}
