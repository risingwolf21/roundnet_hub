import { format } from 'date-fns';
import { HistoryItemProps } from '../types';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';

export const HistoryItem = ({ items, header, onClick }: HistoryItemProps) => {
  return (
    <List
      dense
      component={'div'}
      disablePadding
      subheader={
        <ListSubheader sx={{ zIndex: '-1' }} component="div" id="nested-list-subheader">
          {header}
        </ListSubheader>
      }
    >
      {items.map((item: FullHistory, index: number) => (
        <ListItem
          dense
          key={'sublist' + index}
          onClick={() => onClick(item)}
          secondaryAction={<Typography>{(item.count ?? 0) * (item.drink?.price ?? 1)} €</Typography>}
        >
          <ListItemAvatar>
            <Typography>{item.count} x</Typography>
          </ListItemAvatar>
          <ListItemText primary={item.drink?.name} secondary={format(item.created_at ?? '', 'HH:mm')} />
        </ListItem>
      ))}
    </List>
  );
};
