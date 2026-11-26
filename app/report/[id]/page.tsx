import type { Metadata } from "next";
import { ReportLoader } from "@/components/report/report-loader";
import { getServerLanguage } from "@/lib/server-language";
import { UI_STRINGS } from "@/lib/ui-strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: UI_STRINGS[await getServerLanguage()].meta.report };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportLoader id={id} />;
}
