import { useLocation, useNavigate, useSearchParams } from 'react-router';
import type { SheetName } from '../types';
export function useSheet() {
  const navigate = useNavigate(); const location = useLocation(); const [params] = useSearchParams();
  return {
    sheet: params.get('sheet') as SheetName | null,
    open: (name: SheetName) => { const query = new URLSearchParams(location.search); query.set('sheet', name); navigate(`${location.pathname}?${query}`, { state: { sheetOpened: true } }); },
    close: () => { if (location.state?.sheetOpened) navigate(-1); else { const query = new URLSearchParams(location.search); query.delete('sheet'); navigate(`${location.pathname}?${query}`, { replace: true }); } },
  };
}
