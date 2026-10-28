import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { cards } from '../../data/mock';
import { Artwork } from '../../components/ui/Artwork';
import { PageHeader, IconButton } from '../../components/ui/Primitives';
import { useSheet } from '../../hooks/useSheet';
import type { CardId } from '../../types';

const regions: Record<CardId, [number, number, number, number]> = { national: [165, 568, 243, 164], mada: [165, 896, 243, 165], barq: [165, 1211, 243, 165] };
export function CardArtwork({ id }: { id: CardId }) { return <Artwork source="cards" region={regions[id]} className="card-art" />; }
export function Cards() {
  const { open } = useSheet();
  return <><PageHeader title="Cards"><IconButton label="Add card" onClick={() => open('add-card')}><Plus /></IconButton></PageHeader><div className="cards-content"><h2 className="section-title">Your Cards</h2><div className="your-cards">{cards.map(card => <Link to={`/cards/${card.id}`} key={card.id} className="card-row"><CardArtwork id={card.id} /><div><h3>{card.name}</h3><p>*{card.last4}</p></div></Link>)}</div></div></>;
}
