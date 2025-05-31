import { AppDispatch } from 'src/redux/store';

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
