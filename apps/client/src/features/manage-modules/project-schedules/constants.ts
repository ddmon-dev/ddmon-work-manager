import type { TaskCategory } from "@packages/schemas";

export const PRESET_COLORS: Record<TaskCategory, { label: string; color: string }> = {
  planning:    { label: "기획",   color: "#3b82f6" },
  design:      { label: "디자인", color: "#a855f7" },
  development: { label: "개발",   color: "#22c55e" },
  revision:    { label: "수정",   color: "#f97316" },
  delivery:    { label: "납품",   color: "#6b7280" },
};

export const CUSTOM_COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#6b7280",
] as const;

export function getCategoryConfig(category: string, categoryColor?: string | null) {
  const preset = PRESET_COLORS[category as TaskCategory];
  const color = categoryColor ?? preset?.color ?? PRESET_COLORS.development.color;
  const label = preset?.label ?? category;
  return { label, color };
}
