export const SCHEDULE_COLORS = [
  { key: "default", label: "기본", bg: "bg-primary/15", bgActive: "bg-primary/25", dot: "bg-primary" },
  { key: "red", label: "빨강", bg: "bg-red-500/15", bgActive: "bg-red-500/25", dot: "bg-red-500" },
  { key: "orange", label: "주황", bg: "bg-orange-500/15", bgActive: "bg-orange-500/25", dot: "bg-orange-500" },
  { key: "yellow", label: "노랑", bg: "bg-yellow-500/15", bgActive: "bg-yellow-500/25", dot: "bg-yellow-500" },
  { key: "green", label: "초록", bg: "bg-green-500/15", bgActive: "bg-green-500/25", dot: "bg-green-500" },
  { key: "blue", label: "파랑", bg: "bg-blue-500/15", bgActive: "bg-blue-500/25", dot: "bg-blue-500" },
  { key: "purple", label: "보라", bg: "bg-purple-500/15", bgActive: "bg-purple-500/25", dot: "bg-purple-500" },
  { key: "pink", label: "분홍", bg: "bg-pink-500/15", bgActive: "bg-pink-500/25", dot: "bg-pink-500" },
  { key: "gray", label: "회색", bg: "bg-gray-500/15", bgActive: "bg-gray-500/25", dot: "bg-gray-500" },
] as const;

export type ScheduleColorKey = (typeof SCHEDULE_COLORS)[number]["key"];

export function getColorConfig(key: string) {
  return SCHEDULE_COLORS.find((c) => c.key === key) ?? SCHEDULE_COLORS[0];
}
