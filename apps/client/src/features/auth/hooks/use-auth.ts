import { useEffect } from "react";
import { useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";
import { APP_CONFIG } from "@/app.config";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  superAdmin?: boolean;
  phone?: string | null;
};

export type AuthState =
  | {
      user: AuthUser;
      status: "authenticated";
      isLoading: false;
      isSuperAdmin: boolean;
      refetch: () => void;
    }
  | {
      user: undefined;
      status: "loading" | "unauthenticated";
      isLoading: boolean;
      isSuperAdmin: false;
      refetch: () => void;
    };

export function useAuth(): AuthState {
  const { data, isPending, refetch } = authClient.useSession();

  if (isPending) {
    return {
      user: undefined,
      status: "loading",
      isLoading: true,
      isSuperAdmin: false,
      refetch,
    };
  }

  if (!data?.user) {
    return {
      user: undefined,
      status: "unauthenticated",
      isLoading: false,
      isSuperAdmin: false,
      refetch,
    };
  }

  const user = data.user as AuthUser;

  return {
    user,
    status: "authenticated",
    isLoading: false,
    isSuperAdmin: user.superAdmin ?? false,
    refetch,
  };
}

interface UseRequireAuthOptions {
  requireSuper?: boolean;
}

export function useRequireAuth(options?: UseRequireAuthOptions): AuthState {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      navigate(APP_CONFIG.AUTH.PATHS.SIGN_IN, { replace: true });
    }
    if (
      options?.requireSuper &&
      auth.status === "authenticated" &&
      !auth.isSuperAdmin
    ) {
      navigate(APP_CONFIG.AUTH.PATHS.FORBIDDEN, { replace: true });
    }
  }, [auth.status, auth.isSuperAdmin, options, navigate]);

  return auth;
}
