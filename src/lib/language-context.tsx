import { createContext, useContext, useEffect, useState } from "react";

import type { Language } from "@/server/db/models";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // Detect browser language
    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "es") {
      setLanguage("es");
    } else {
      setLanguage("en");
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Utility function to get localized text
export function getLocalized<T extends { en: string; es: string }>(
  text: T,
  language: Language,
): string {
  return text[language];
}
