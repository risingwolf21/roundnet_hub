import { List, ListItem, ListItemAvatar, ListItemText, ListSubheader, Typography } from '@mui/material';
import React from 'react';

export const AdminHistoryItem = ({ items, header }: { items: FullHistory[]; header: string }) => {
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
      {items.map((item, index) => (
        <ListItem
          dense
          key={header + index + 'sublist'}
          secondaryAction={
            <Typography fontWeight={'bold'}>{(item.drink?.price ?? 0) * (item.count ?? 0)} €</Typography>
          }
        >
          <ListItemAvatar>
            <Typography>{item.count} x</Typography>
          </ListItemAvatar>
          <ListItemText primary={item.drink?.name} secondary={item.user?.displayName} />
        </ListItem>
      ))}
    </List>
  );
};
