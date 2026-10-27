import market from '../../assets/market-artwork.png';
import rewards from '../../assets/reward-artwork.jpg';
import cards from '../../assets/card-artwork.png';
import productsLower from '../../assets/products-lower-artwork.jpg';
import homePromotion from '../../assets/home-promotion-artwork.jpg';

const sources = { market: { src: market, width: 1206, height: 2622 }, rewards: { src: rewards, width: 706, height: 1536 }, cards: { src: cards, width: 1206, height: 2622 }, productsLower: { src: productsLower, width: 588, height: 1280 }, homePromotion: { src: homePromotion, width: 588, height: 1280 } };
/** Only isolated artwork is displayed. Layout, typography, controls and surfaces are React/CSS. */
export function Artwork({ source, region, className = '' }: { source: keyof typeof sources; region: [number, number, number, number]; className?: string }) {
  const asset = sources[source];
  return <svg className={`artwork ${className}`} viewBox={region.join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href={asset.src} width={asset.width} height={asset.height} /></svg>;
}
