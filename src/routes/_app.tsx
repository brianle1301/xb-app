import { createFileRoute, Outlet } from "@tanstack/react-router";

import { MobileNav } from "@/components/mobile-nav";
import { LanguageProvider } from "@/lib/language-context";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background pb-16">
        <Outlet />
        <MobileNav />
      </div>
    </LanguageProvider>
  );
}
