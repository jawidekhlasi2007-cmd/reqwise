"use client";

import Link from "next/link";
import { BrandLink } from "@/components/brand";
import { useUi } from "@/components/language-provider";
import { LanguageSwitch } from "@/components/language-switch";
import { buttonClasses } from "@/components/ui/button";
import { sampleReportId } from "@/lib/ui-language";

/** Top bar. On the landing page it also shows section links. */
export function SiteHeader({ landing = false, showStart = true }: { landing?: boolean; showStart?: boolean }) {
  const { t, language } = useUi();
  const links = landing
    ? [
        { href: "#features", label: t.nav.features },
        { href: "#how-it-works", label: t.nav.how },
        { href: "#standards", label: t.nav.standards },
        { href: "#faq", label: t.nav.faq },
      ]
    : [];

  return (
    <header className="glass-bar no-print sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <BrandLink />
        {links.length > 0 ? (
          <nav aria-label={t.nav.main} className="hidden items-center gap-6 text-sm text-fg-muted lg:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="rounded-md transition-colors hover:text-fg">
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="flex items-center gap-2">
          <Link
            href={`/report/${sampleReportId(language)}`}
            className={buttonClasses({ variant: "ghost", size: "sm", className: "hidden md:inline-flex" })}
          >
            {t.nav.sample}
          </Link>
          <LanguageSwitch />
          {showStart ? (
            <Link href="/dashboard" className={buttonClasses({ size: "sm", className: "hidden sm:inline-flex" })}>
              {t.nav.start}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
