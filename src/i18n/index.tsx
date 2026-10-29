// English / Arabic. English text is the key; src/i18n/ar.ts holds the Arabic. The app remounts when the language
// changes (see LanguageProvider), so every screen can read the current language with plain functions.
import { createContext, Fragment, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ar } from './ar';

export type Lang = 'en' | 'ar';
type Vars = Record<string, string | number>;
const STORAGE_KEY = 'barq.lang';

function stored(): Lang {
  try { return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
}
let current: Lang = stored();
export const getLang = () => current;
export const isArabic = () => current === 'ar';

/** Sets `lang` and `dir` on <html>, so the whole page (and the browser) knows the language and direction. */
export function applyDocument(lang: Lang = current) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

// --- Numbers and dates: Arabic uses Arabic-Indic digits and the Gregorian calendar ---------------------------

const numberLocale = () => current === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US';
const dateLocale = () => current === 'ar' ? 'ar-SA-u-ca-gregory-nu-arab' : 'en-GB';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const num = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(numberLocale(), options).format(value);
/** 1,365.00 / ١٬٣٦٥٫٠٠ */
export const amountText = (value: number) => num(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "SAR 1,500" / "١٬٥٠٠ ريال" for amounts inside sentences. */
export const sar = (value: number) => current === 'ar' ? `${num(value, { maximumFractionDigits: 2 })} ريال` : `SAR ${num(value, { maximumFractionDigits: 2 })}`;
export const percent = (fraction: number) => num(fraction, { style: 'percent', maximumFractionDigits: 0 });
/** Converts the digits in text such as "19:30" or "2027". */
export const digits = (text: string) => current === 'ar' ? text.replace(/[0-9]/g, d => ARABIC_DIGITS[Number(d)]) : text;
/** Accepts Arabic-Indic and Persian digits (and the Arabic decimal sign) typed into number fields. */
export const latinDigits = (text: string) => text.replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/٫/g, '.').replace(/٬/g, '');
export const formatDate = (value: Date | number | string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(dateLocale(), options).format(new Date(value));

// --- Text ------------------------------------------------------------------------------------------------------

// In Arabic, filled-in text with Latin letters (names of people and places) is wrapped in Unicode isolates so it keeps
// its own direction inside the sentence.
const isolate = (text: string) => current === 'ar' && /[A-Za-z]/.test(text) ? `\u2068${text}\u2069` : text;
const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => name in vars ? (typeof vars[name] === 'number' ? num(vars[name] as number) : isolate(String(vars[name]))) : match) : text;
function lookup(en: string) {
  if (current !== 'ar') return en;
  const entry = ar[en];
  if (entry === undefined) { if (import.meta.env.DEV) console.warn(`[i18n] Missing Arabic for: ${en}`); return en; }
  return typeof entry === 'string' ? entry : entry.other;
}
/** Translates English text. `{name}` placeholders are filled from `vars`; numbers are formatted for the language. */
export function t(en: string, vars?: Vars) { return fill(lookup(en), vars); }

/** Counted text: English picks `one` or `other`; Arabic uses its plural forms (zero, one, two, few, many, other). */
export function tp(count: number, one: string, other: string, vars?: Vars) {
  const all = { n: count, ...vars };
  if (current !== 'ar') return fill(count === 1 ? one : other, all);
  const entry = ar[other];
  if (entry && typeof entry === 'object') {
    const form = new Intl.PluralRules('ar').select(count) as keyof typeof entry;
    return fill(entry[form] ?? entry.other, all);
  }
  return fill(lookup(other), all);
}

/** Like t(), but placeholders can be React elements (for example an amount with the riyal sign). */
export function tn(en: string, nodes: Record<string, ReactNode>): ReactNode {
  return lookup(en).split(/(\{\w+\})/).map((part, i) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1];
    const node = name && name in nodes ? nodes[name] : part;
    return <Fragment key={i}>{name && typeof node === 'string' ? <bdi>{node}</bdi> : node}</Fragment>;
  });
}

// --- Provider --------------------------------------------------------------------------------------------------

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current);
  useLayoutEffect(() => applyDocument(lang), [lang]);
  const setLang = useCallback((next: Lang) => {
    current = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable: the choice lasts for this tab */ }
    setState(next);
  }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  // Remounting on a language change re-renders every screen in the new language and direction.
  return <LanguageContext.Provider value={value}><Fragment key={lang}>{children}</Fragment></LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is required');
  return context;
}
