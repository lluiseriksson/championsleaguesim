
import { useCallback } from 'react';

interface UseBackToTournamentProps {
  onBackClick: () => void;
}

export const useBackToTournament = ({ onBackClick }: UseBackToTournamentProps) => {
  const handleBackClick = useCallback(() => {
    onBackClick();
  }, [onBackClick]);

  return { handleBackClick };
};
