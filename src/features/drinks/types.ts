export type DrinkListScreenProps = {
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
