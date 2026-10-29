import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n';

/** Switches the whole app between English and Arabic. The label is written in the language it switches to. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const next = lang === 'ar' ? 'en' : 'ar';
  return <button type="button" className={`language-toggle ${className}`} lang={next} onClick={() => setLang(next)}><Languages size={16} aria-hidden="true" />{next === 'ar' ? 'العربية' : 'English'}</button>;
}
