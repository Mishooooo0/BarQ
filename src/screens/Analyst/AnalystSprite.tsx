import hero from '../../assets/analyst/hero.png';
import thumbs from '../../assets/analyst/thumbs.png';
import think from '../../assets/analyst/think.png';
import idea from '../../assets/analyst/idea.png';
import celebrate from '../../assets/analyst/celebrate.png';
import coin from '../../assets/analyst/coin.png';
import laptop from '../../assets/analyst/laptop.png';
import receipt from '../../assets/analyst/receipt.png';
import places from '../../assets/analyst/places.png';
import ok from '../../assets/analyst/ok.png';
import growth from '../../assets/analyst/growth.png';
import type { Pose } from '../../types/api';

// Poses of the AI Analyst character, cut from the supplied character sheet.
// "ok" (thumb-and-finger OK sign) celebrates completed payments.
const poses: Record<Pose, string> = { hero, thumbs, think, idea, celebrate, coin, laptop, receipt, places, growth, ok };
export function AnalystSprite({ pose, className = '' }: { pose: Pose; className?: string }) {
  return <img className={`analyst-sprite ${className}`} src={poses[pose] ?? poses.thumbs} alt="" draggable={false} />;
}
