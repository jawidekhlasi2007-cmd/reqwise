"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { useUi } from "@/components/language-provider";
import { sampleReportId } from "@/lib/ui-language";

export function SiteFooter() {
  const { t, language } = useUi();
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="font-semibold text-fg">ReqWise</span>
        </div>
        <nav aria-label={t.nav.footer} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
          <Link href="/dashboard" className="hover:text-fg">
            {t.nav.start}
          </Link>
          <Link href={`/report/${sampleReportId(language)}`} className="hover:text-fg">
            {t.nav.sample}
          </Link>
          <a href="#faq" className="hover:text-fg">
            {t.nav.faq}
          </a>
        </nav>
      </div>
    </footer>
  );
}
