import type { auth } from "../auth";

export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;

export type AppVariables = {
  user: AuthUser;
  session?: AuthSession;
  skillCaller?: boolean;
};
