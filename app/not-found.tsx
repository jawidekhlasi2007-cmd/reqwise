"use client";

import Link from "next/link";
import { useUi } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useUi();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-semibold text-fg">{t.notFound.title}</h1>
        <p className="mt-2 text-fg-muted">{t.notFound.text}</p>
        <Link href="/" className={buttonClasses({ className: "mt-6" })}>
          {t.notFound.home}
        </Link>
      </main>
    </>
  );
}
