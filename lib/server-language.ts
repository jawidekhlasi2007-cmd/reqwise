import { cookies } from "next/headers";
import { UI_LANGUAGE_COOKIE, parseUiLanguage, type UiLanguage } from "./ui-language";

/** Reads the interface language on the server (layout, metadata). */
export async function getServerLanguage(): Promise<UiLanguage> {
  const store = await cookies();
  return parseUiLanguage(store.get(UI_LANGUAGE_COOKIE)?.value);
}
