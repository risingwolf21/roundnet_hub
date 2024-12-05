import { AppDispatch } from 'src/redux/store';
import { FullHistory } from 'src/types/supabaseTypes';

export type DrinkListScreenProps = {
  dispatch: AppDispatch;
  user: User;
  drinks: Drink[];
  drinksLoading: boolean;
  drinksError: string;
};

export type FullHistoryUpdate = FullHistory & {
  newCount: number;
};

export type HistoryItemProps = {
  header: string;
  items: FullHistory[];
  onClick: (entry: FullHistory) => any;
};

export type HistoryScreenProps = {
  history: FullHistory[];
  drinks: Drink[];
  historyLoading: boolean;
  historyEndReached: boolean;
  historyError: string;
  user: User;
};
