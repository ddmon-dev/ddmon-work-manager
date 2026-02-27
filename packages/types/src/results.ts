export type ActionResult<T> =
  | { success: true; data: T; error?: string }
  | { success: false; error: string; data?: T };
