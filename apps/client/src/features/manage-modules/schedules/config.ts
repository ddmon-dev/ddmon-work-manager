export const CONFIG = {
  moduleName: "일정",
} as const;

export const SCHEDULE_COLORS = [
  { value: "default", label: "기본", className: "bg-gray-400" },
  { value: "red", label: "빨강", className: "bg-red-500" },
  { value: "orange", label: "주황", className: "bg-orange-500" },
  { value: "yellow", label: "노랑", className: "bg-yellow-500" },
  { value: "green", label: "초록", className: "bg-green-500" },
  { value: "blue", label: "파랑", className: "bg-blue-500" },
  { value: "purple", label: "보라", className: "bg-purple-500" },
  { value: "pink", label: "분홍", className: "bg-pink-500" },
  { value: "gray", label: "회색", className: "bg-gray-500" },
] as const;

export const RECURRENCE_LABELS: Record<string, string> = {
  none: "없음",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  yearly: "매년",
};

export function getColorClassName(color: string): string {
  return SCHEDULE_COLORS.find((c) => c.value === color)?.className ?? "bg-gray-400";
}
