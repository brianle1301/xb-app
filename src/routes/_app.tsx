import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { MobileNav } from "@/components/mobile-nav";
import { hashContent } from "@/lib/hash";
import { LanguageProvider } from "@/lib/language-context";
import { documentBySlugQuery } from "@/queries/documents";
import { getSession } from "@/server/rpc/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    // Check post-registration document (client-side only due to localStorage)
    if (typeof window !== "undefined") {
      const postRegDoc = await context.queryClient.ensureQueryData(
        documentBySlugQuery("post-registration"),
      );

      if (postRegDoc?.status === "published") {
        const currentHash = hashContent(postRegDoc.content);
        const seenHash = localStorage.getItem("postRegistrationSeenHash");

        if (seenHash !== currentHash) {
          throw redirect({
            to: "/$slug",
            params: { slug: "post-registration" },
            search: { redirect: "/" },
          });
        }
      }
    }

    return { user: session.user };
  },
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
