import { createContext, useContext, type ReactNode } from "react";

import { useSession, type Session } from "@/lib/auth-client";

type AuthContextType = {
  user: Session["user"] | null;
  session: Session["session"] | null;
  isPending: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        session: data?.session ?? null,
        isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
