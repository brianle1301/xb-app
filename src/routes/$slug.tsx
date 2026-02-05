import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { z } from "zod";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { hashContent } from "@/lib/hash";
import { documentBySlugQuery } from "@/queries/documents";
import { DOCUMENT_SLUGS } from "@/server/rpc/documents";
import type { Language } from "@/types/shared";

function getBrowserLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const browserLang = navigator.language.split("-")[0];
  return browserLang === "es" ? "es" : "en";
}

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/$slug")({
  validateSearch: searchSchema,
  beforeLoad: ({ params }) => {
    // Only allow predefined document slugs
    const isValidSlug = DOCUMENT_SLUGS.some((s) => s.slug === params.slug);
    if (!isValidSlug) {
      throw notFound();
    }
  },
  component: DocumentPage,
});

function DocumentPage() {
  const { slug } = Route.useParams();
  const { redirect: redirectTo } = useSearch({ from: "/$slug" });
  const navigate = useNavigate();
  const { data: document, isLoading } = useQuery(documentBySlugQuery(slug));
  const [language] = React.useState(getBrowserLanguage);

  const isPreRegistration = slug === "pre-registration";
  const isPostRegistration = slug === "post-registration";
  const isTracked = isPreRegistration || isPostRegistration;

  // If document isn't published and it's a tracked document, redirect back
  React.useEffect(() => {
    if (!isLoading && !document && isTracked) {
      navigate({ to: redirectTo ?? "/login" });
    }
  }, [isLoading, document, isTracked, redirectTo, navigate]);

  if (isLoading) {
    return null;
  }

  if (!document) {
    if (!isTracked) {
      return null;
    }
    return null;
  }

  const title = language === "en" ? document.title.en : document.title.es;
  const content = language === "en" ? document.content.en : document.content.es;

  const handleContinue = () => {
    const contentHash = hashContent(document.content);
    if (isPreRegistration) {
      localStorage.setItem("preRegistrationSeenHash", contentHash);
    } else if (isPostRegistration) {
      localStorage.setItem("postRegistrationSeenHash", contentHash);
    }
    navigate({ to: redirectTo ?? "/login" });
  };

  // Non-tracked documents (like lab-overview) show a back button
  if (!isTracked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <Link
            to="/experiments"
            className="flex items-center gap-2 text-primary mb-6 hover:underline"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {language === "en" ? "Back to Labs" : "Volver a Labs"}
          </Link>
          <h1 className="text-2xl font-bold mb-6">{title}</h1>
          <MarkdownRenderer content={content} />
        </div>
      </div>
    );
  }

  // Tracked documents show Continue button at bottom
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{title}</h1>
          <MarkdownRenderer content={content} />
        </div>
      </div>
      <div className="p-4 border-t bg-background">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full" onClick={handleContinue}>
            {language === "en" ? "Continue" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
