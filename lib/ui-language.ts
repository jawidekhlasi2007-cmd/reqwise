/** Interface language. Stored in a cookie so the server renders pages in the right language from the first paint. */
export type UiLanguage = "en" | "ru";

export const UI_LANGUAGE_COOKIE = "reqwise-lang";

export function parseUiLanguage(value: string | undefined | null): UiLanguage {
  return value === "ru" ? "ru" : "en";
}

export function sampleReportId(language: UiLanguage): string {
  return language === "ru" ? "sample-ru" : "sample";
}
