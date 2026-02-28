import { z } from "zod";

export const adminCreateSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    username: z.string().min(1, "사용자명을 입력해주세요."),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요."),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

export const adminUpdateSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    phone: z.string().optional(),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다.").optional().or(z.literal("")),
    passwordConfirm: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.passwordConfirm;
      }
      return true;
    },
    {
      message: "비밀번호가 일치하지 않습니다.",
      path: ["passwordConfirm"],
    }
  );

export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
