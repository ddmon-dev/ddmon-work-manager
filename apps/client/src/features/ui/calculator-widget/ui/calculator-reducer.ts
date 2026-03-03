// --- Calculator State & Reducer ---

interface CalculatorSnapshot {
  display: string;
  expression: string;
  previousValue: number | null;
  operator: string | null;
  waitingForOperand: boolean;
}

export interface CalculatorState extends CalculatorSnapshot {
  history: CalculatorSnapshot[];
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

const INITIAL_SNAPSHOT: CalculatorSnapshot = {
  display: "0",
  expression: "",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
};

export const initialState: CalculatorState = {
  ...INITIAL_SNAPSHOT,
  history: [],
};

function parseDisplay(display: string): number {
  return parseFloat(display.replace(/,/g, ""));
}

const operatorSymbol: Record<string, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

function calculate(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? 0 : a / b;
    default: return b;
  }
}

function formatDisplay(value: number): string {
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
  // Backspace: 문자 삭제 + 상태 undo 혼합 (macOS 계산기 방식)
  if (action.type === "BACKSPACE") {
    const raw = state.display.replace(/,/g, "");
    const isAtomic = raw === "0" || raw === "오류" || /^-?\d$/.test(raw);

    // 연산자 대기 중(두 번째 피연산자 입력 전): 연산자 제거 (상태 undo)
    if (state.waitingForOperand && state.operator !== null) {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return { ...prev, history: state.history.slice(0, -1) };
    }

    // 여러 자릿수: 마지막 문자 삭제
    if (!isAtomic) {
      const trimmed = raw.slice(0, -1);
      const newDisplay = trimmed === "" || trimmed === "-" ? "0" : trimmed;
      return {
        ...state,
        display: newDisplay,
        expression: state.expression.endsWith("=") ? "" : state.expression,
        waitingForOperand: false,
      };
    }

    // 단일 자릿수(0 제외): 히스토리 undo 또는 "0"으로 리셋
    if (raw !== "0") {
      if (state.history.length > 0) {
        const prev = state.history[state.history.length - 1];
        return { ...prev, history: state.history.slice(0, -1) };
      }
      return {
        ...state,
        display: "0",
        expression: state.expression.endsWith("=") ? "" : state.expression,
        waitingForOperand: false,
      };
    }

    // "0" 상태: 히스토리 undo 또는 no-op
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1];
    return { ...prev, history: state.history.slice(0, -1) };
  }

  // Clear: 전체 초기화 (히스토리 포함)
  if (action.type === "CLEAR") return initialState;

  // 나머지 액션: 현재 상태를 히스토리에 push 후 처리
  const { history, ...snapshot } = state;
  const newHistory = state.expression.endsWith("=")
    ? [INITIAL_SNAPSHOT]
    : [...history, snapshot];

  switch (action.type) {
    case "DIGIT": {
      if (state.waitingForOperand) {
        return {
          ...state,
          history: newHistory,
          display: action.digit,
          expression: state.expression.endsWith("=") ? "" : state.expression,
          waitingForOperand: false,
        };
      }
      if (state.display === "0") {
        return { ...state, history: newHistory, display: action.digit };
      }
      return { ...state, display: state.display + action.digit };
    }

    case "DECIMAL": {
      if (state.waitingForOperand) {
        return {
          ...state,
          history: newHistory,
          display: "0.",
          expression: state.expression.endsWith("=") ? "" : state.expression,
          waitingForOperand: false,
        };
      }
      if (state.display.includes(".")) return state;
      if (state.display === "0") {
        return { ...state, history: newHistory, display: "0." };
      }
      return { ...state, display: state.display + "." };
    }

    case "OPERATOR": {
      const currentValue = parseDisplay(state.display);
      const sym = operatorSymbol[action.operator] ?? action.operator;

      // 연쇄 연산: 이전 연산자 + 새 피연산자가 있으면 즉시 계산
      if (state.operator && !state.waitingForOperand) {
        const result = calculate(state.previousValue!, state.operator, currentValue);
        return {
          history: newHistory,
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
          history: newHistory,
          expression: state.expression.slice(0, -1) + sym,
          operator: action.operator,
        };
      }

      // 첫 연산자 입력
      return {
        ...state,
        history: state.expression.endsWith("=")
          ? [...newHistory, { ...snapshot, expression: "", waitingForOperand: false }]
          : newHistory,
        expression: `${state.display}${sym}`,
        previousValue: currentValue,
        operator: action.operator,
        waitingForOperand: true,
      };
    }

    case "EQUALS": {
      if (state.operator === null || state.previousValue === null) return state;
      const currentValue = parseDisplay(state.display);
      const result = calculate(state.previousValue, state.operator, currentValue);
      return {
        history: [],
        display: formatDisplay(result),
        expression: `${state.expression}${state.display}=`,
        previousValue: null,
        operator: null,
        waitingForOperand: true,
      };
    }

    case "CLEAR_ENTRY":
      return {
        ...state,
        history: newHistory,
        display: "0",
        expression: state.expression.endsWith("=") ? "" : state.expression,
        waitingForOperand: true,
      };

    case "NEGATE": {
      if (state.display === "0" || state.waitingForOperand) return state;
      const negated = state.display.startsWith("-")
        ? state.display.slice(1)
        : "-" + state.display;
      return { ...state, history: newHistory, display: negated };
    }

    case "PERCENT": {
      if (state.waitingForOperand) return state;
      const value = parseDisplay(state.display) / 100;
      return { ...state, history: newHistory, display: formatDisplay(value) };
    }

    default:
      return state;
  }
}
