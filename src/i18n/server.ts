import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Locale } from "@/types";
import { LOCALE_COOKIE, makeT, type TFn } from "./index";

/** Resolves the visitor's language: explicit cookie first, then the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (stored === "ar" || stored === "en") return stored;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*ar\b/i.test(accept) ? "ar" : "en";
});

export async function getT(): Promise<TFn> {
  return makeT(await getLocale());
}
