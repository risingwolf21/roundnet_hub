import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
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
