import { useEffect } from 'react';
import { useNavigate } from 'react-router';

const gamesUrl = `${import.meta.env.BASE_URL}games/points-games.html?embed`;

export function PointsGames() {
  const navigate = useNavigate();
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'points-games:close') return;
      if (window.history.state?.idx > 0) navigate(-1); else navigate('/more');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);
  return <iframe className="games-frame" src={gamesUrl} title="Points Challenges" />;
}
