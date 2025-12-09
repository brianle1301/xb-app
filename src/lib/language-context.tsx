import React from "react";

import type { Language } from "@/types/shared";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(
  undefined,
);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const browserLang = navigator.language.split("-")[0];
  return browserLang === "es" ? "es" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = React.useState<Language>(getInitialLanguage);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Utility function to get localized text
export function getLocalized(
  text: { en?: string; es?: string } | null | undefined,
  language: Language,
): string {
  return text?.[language] ?? "";
}
