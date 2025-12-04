import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { MobileNav } from "@/components/mobile-nav";
import { Spinner } from "@/components/ui/spinner";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

function AuthGuard() {
  const { user, isPending } = useAuth();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background pb-16">
        <Outlet />
        <MobileNav />
      </div>
    </LanguageProvider>
  );
}
