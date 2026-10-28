import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AnalystSprite } from '../screens/Analyst/AnalystSprite';

/** Shown after every completed payment: Barq gives an OK sign over the success panel. */
export function PaymentDone({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="success-panel payment-done" role="status">
    <AnalystSprite pose="ok" className="payment-mascot" />
    <CheckCircle2 />
    <h2>{title}</h2>
    {children}
  </div>;
}
