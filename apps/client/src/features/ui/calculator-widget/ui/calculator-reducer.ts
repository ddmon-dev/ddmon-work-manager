// --- Calculator State & Reducer ---

export interface CalculatorState {
  display: string;
  expression: string;
  previousValue: number | null;
  operator: string | null;
  waitingForOperand: boolean;
}

export type CalculatorAction =
  | { type: "DIGIT"; digit: string }
  | { type: "DECIMAL" }
  | { type: "OPERATOR"; operator: string }
  | { type: "EQUALS" }
  | { type: "CLEAR" }
  | { type: "CLEAR_ENTRY" }
  | { type: "BACKSPACE" }
  | { type: "NEGATE" }
  | { type: "PERCENT" };

export const initialState: CalculatorState = {
  display: "0",
  expression: "",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
};

export const operatorSymbol: Record<string, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

export function calculate(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? 0 : a / b;
    default: return b;
  }
}

export function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) return "오류";

  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return value.toLocaleString("ko-KR");
  }

  const str = parseFloat(value.toPrecision(10)).toString();
  const parts = str.split(".");
  parts[0] = Number(parts[0]).toLocaleString("ko-KR");
  return parts.join(".");
}

export function reducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "DIGIT": {
      if (state.waitingForOperand) {
        return {
          ...state,
          display: action.digit,
          waitingForOperand: false,
        };
      }
      const newDisplay = state.display === "0" ? action.digit : state.display + action.digit;
      return { ...state, display: newDisplay };
    }

    case "DECIMAL": {
      if (state.waitingForOperand) {
        return { ...state, display: "0.", waitingForOperand: false };
      }
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + "." };
    }

    case "OPERATOR": {
      const currentValue = parseFloat(state.display);
      const sym = operatorSymbol[action.operator] ?? action.operator;

      // 연쇄 연산: 이전 연산자 + 새 피연산자가 있으면 즉시 계산
      if (state.operator && !state.waitingForOperand) {
        const result = calculate(state.previousValue!, state.operator, currentValue);
        return {
          display: formatDisplay(result),
          expression: `${state.expression}${state.display}${sym}`,
          previousValue: result,
          operator: action.operator,
          waitingForOperand: true,
        };
      }

      // 연산자 교체 (이미 연산자가 눌린 상태에서 다른 연산자 입력)
      if (state.waitingForOperand && state.previousValue !== null) {
        return {
          ...state,
          expression: state.expression.replace(/\S+$/, sym),
          operator: action.operator,
        };
      }

      // 첫 연산자 입력
      return {
        ...state,
        expression: `${state.display}${sym}`,
        previousValue: currentValue,
        operator: action.operator,
        waitingForOperand: true,
      };
    }

    case "EQUALS": {
      if (state.operator === null || state.previousValue === null) return state;
      const currentValue = parseFloat(state.display);
      const result = calculate(state.previousValue, state.operator, currentValue);
      return {
        display: formatDisplay(result),
        expression: `${state.expression}${state.display}=`,
        previousValue: null,
        operator: null,
        waitingForOperand: true,
      };
    }

    case "CLEAR":
      return initialState;

    case "CLEAR_ENTRY":
      return { ...state, display: "0", waitingForOperand: true };

    case "BACKSPACE": {
      if (state.waitingForOperand) return state;
      const trimmed = state.display.slice(0, -1);
      return { ...state, display: trimmed === "" || trimmed === "-" ? "0" : trimmed };
    }

    case "NEGATE": {
      if (state.display === "0") return state;
      const negated = state.display.startsWith("-")
        ? state.display.slice(1)
        : "-" + state.display;
      return { ...state, display: negated };
    }

    case "PERCENT": {
      const value = parseFloat(state.display) / 100;
      return { ...state, display: formatDisplay(value) };
    }

    default:
      return state;
  }
}
