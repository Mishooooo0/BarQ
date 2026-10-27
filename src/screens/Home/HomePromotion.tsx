import { Artwork } from '../../components/ui/Artwork';
import { useSheet } from '../../hooks/useSheet';

export function HomePromotion() {
  const { open } = useSheet();
  return <div className="home-promotions">
    <button className="latest-promo" aria-label="barq Marathon — click to see your demo ranking" onClick={() => open('promotion')}>
      <Artwork source="homePromotion" region={[55, 745, 478, 259]} />
    </button>
    {/* Only the first campaign was supplied. Preserve reference pagination without inventing unseen campaigns. */}
    <div className="promotion-indicators" aria-hidden="true"><span className="current" />{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
  </div>;
}
