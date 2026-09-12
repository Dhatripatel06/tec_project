/**
 * English / Gujarati content (PRD F10: "Store both title fields; fall back to
 * English if translation missing").
 *
 * The fallback is one-directional by design. Gujarati missing → show English.
 * The reverse is not a fallback we want silently: if an item were Gujarati-only
 * the English reader still gets the Gujarati text rather than an empty card,
 * but the response says so via `resolvedLang`, so the client can mark it.
 */

export const LANGUAGES = ['en', 'gu'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'en';

export interface LocalisedField {
  value: string | null;
  /** Which language the returned value is actually in. */
  resolvedLang: Lang | null;
  /** True when the requested language was unavailable. */
  fellBack: boolean;
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'gu';
}

function blank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}

/** Picks the best available text for `lang`, reporting what it actually returned. */
export function localiseField(
  en: string | null | undefined,
  gu: string | null | undefined,
  lang: Lang,
): LocalisedField {
  if (lang === 'gu') {
    if (!blank(gu)) return { value: gu!, resolvedLang: 'gu', fellBack: false };
    if (!blank(en)) return { value: en!, resolvedLang: 'en', fellBack: true };
    return { value: null, resolvedLang: null, fellBack: true };
  }
  if (!blank(en)) return { value: en!, resolvedLang: 'en', fellBack: false };
  if (!blank(gu)) return { value: gu!, resolvedLang: 'gu', fellBack: true };
  return { value: null, resolvedLang: null, fellBack: true };
}

/** The plain value, for the common case where the caller only needs text. */
export function localise(
  en: string | null | undefined,
  gu: string | null | undefined,
  lang: Lang,
): string | null {
  return localiseField(en, gu, lang).value;
}

export interface BilingualSource {
  title: string;
  title_gu?: string | null;
  description?: string | null;
  description_gu?: string | null;
  hook?: string | null;
  hook_gu?: string | null;
}

export interface LocalisedContent {
  title: string;
  description: string | null;
  hook: string | null;
  lang: Lang;
  /** Fields that had no translation in the requested language. */
  fallbacks: string[];
}

/**
 * Resolves a listing's bilingual fields in one pass. `title` is non-null in the
 * database, so the result always has a title to show.
 */
export function localiseListing(source: BilingualSource, lang: Lang): LocalisedContent {
  const fallbacks: string[] = [];

  const title = localiseField(source.title, source.title_gu, lang);
  if (title.fellBack) fallbacks.push('title');

  const description = localiseField(source.description, source.description_gu, lang);
  if (description.fellBack && description.value !== null) fallbacks.push('description');

  const hook = localiseField(source.hook, source.hook_gu, lang);
  if (hook.fellBack && hook.value !== null) fallbacks.push('hook');

  return {
    title: title.value ?? source.title,
    description: description.value,
    hook: hook.value,
    lang,
    fallbacks,
  };
}
