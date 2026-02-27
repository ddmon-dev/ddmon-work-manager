import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function parsePagination(
  query: Record<string, string | string[] | undefined>
): PaginationQuery {
  const result = paginationSchema.safeParse(query);
  if (!result.success) {
    return { page: 1, pageSize: 20, search: undefined };
  }
  return result.data;
}

export function calcOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
