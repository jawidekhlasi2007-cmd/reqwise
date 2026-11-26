import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getServerLanguage } from "@/lib/server-language";
import { UI_STRINGS } from "@/lib/ui-strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: UI_STRINGS[await getServerLanguage()].meta.dashboard };
}

export default function DashboardPage() {
  return <DashboardClient />;
}
