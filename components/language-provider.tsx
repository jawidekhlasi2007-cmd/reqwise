"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UI_LANGUAGE_COOKIE, type UiLanguage } from "@/lib/ui-language";
import { UI_STRINGS, type UiStrings } from "@/lib/ui-strings";

interface LanguageContextValue {
  language: UiLanguage;
  t: UiStrings;
  setLanguage: (language: UiLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Holds the interface language. The server passes the cookie value, so the first render is already in the right language. */
export function LanguageProvider({ initialLanguage, children }: { initialLanguage: UiLanguage; children: React.ReactNode }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<UiLanguage>(initialLanguage);

  const setLanguage = useCallback(
    (next: UiLanguage) => {
      setLanguageState(next);
      document.cookie = `${UI_LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      // Re-renders server parts such as the page title; client state (an uploaded document) is kept.
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ language, t: UI_STRINGS[language], setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useUi(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useUi must be used inside LanguageProvider");
  return context;
}
