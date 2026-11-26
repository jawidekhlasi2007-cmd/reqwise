import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { getServerLanguage } from "@/lib/server-language";
import { UI_STRINGS } from "@/lib/ui-strings";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

// Loaded without preloading so every script it covers (Latin and Cyrillic) is fetched on demand.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = UI_STRINGS[await getServerLanguage()];
  return {
    title: { default: t.meta.title, template: "%s | ReqWise" },
    description: t.meta.description,
  };
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = await getServerLanguage();
  return (
    <html lang={language} className={`${plex.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh antialiased">
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
