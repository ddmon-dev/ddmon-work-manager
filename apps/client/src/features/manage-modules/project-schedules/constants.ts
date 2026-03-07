import type { TaskCategory } from "@packages/schemas";

export const TASK_CATEGORY_CONFIG: Record<TaskCategory, {
  label: string;
  bg: string;
  bgActive: string;
  dot: string;
}> = {
  planning:    { label: "기획", bg: "bg-blue-500/15", bgActive: "bg-blue-500/25", dot: "bg-blue-500" },
  design:      { label: "디자인", bg: "bg-purple-500/15", bgActive: "bg-purple-500/25", dot: "bg-purple-500" },
  development: { label: "개발", bg: "bg-green-500/15", bgActive: "bg-green-500/25", dot: "bg-green-500" },
  revision:    { label: "수정", bg: "bg-orange-500/15", bgActive: "bg-orange-500/25", dot: "bg-orange-500" },
  delivery:    { label: "납품", bg: "bg-gray-500/15", bgActive: "bg-gray-500/25", dot: "bg-gray-500" },
};

export function getCategoryConfig(category: string) {
  return TASK_CATEGORY_CONFIG[category as TaskCategory] ?? TASK_CATEGORY_CONFIG.development;
}
