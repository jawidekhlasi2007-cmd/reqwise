"use client";

import { useEffect, useState } from "react";
import { listReports, subscribeToReports, type ReportSummary } from "@/lib/storage";

/** The saved report history, kept in sync across tabs. Empty until mounted, so server and client render the same markup. */
export function useReports(): { reports: ReportSummary[]; ready: boolean } {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setReports(listReports());
    load();
    setReady(true);
    return subscribeToReports(load);
  }, []);

  return { reports, ready };
}
