import type { InputHTMLAttributes } from 'react';
import { digits, latinDigits } from '../i18n';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & { value: string; onChange: (value: string) => void };

/** A number field that shows Arabic-Indic digits in Arabic and accepts both kinds; `value` stays in Western digits. */
export function NumberField({ value, onChange, ...props }: Props) {
  return <input {...props} type="text" inputMode="decimal" autoComplete="off" value={digits(value)} onChange={e => onChange(latinDigits(e.target.value))} />;
}
