import AddIcon from '@mui/icons-material/Add';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import RemoveIcon from '@mui/icons-material/Remove';
import { Avatar, Box, IconButton, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import React from 'react';
import { Has } from '@/hooks/useGrants';

type Props = {
  drink: Drink;
  count: number;
  onAddClick: (drink: Drink) => any;
  onMinusClick: (drink: Drink) => any;
};

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }: Props) => {
  return (
    <ListItem
      key={drink.name ?? '' + drink.id}
      onClick={() => onAddClick(drink)}
      secondaryAction={
        <Has perm={'drinks.purchase'}>
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            {count > 0 && (
              <>
                <IconButton
                  disableRipple
                  onClick={(event) => {
                    onMinusClick(drink);
                    event.stopPropagation();
                  }}
                >
                  <RemoveIcon fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
                <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>{count}</Typography>
              </>
            )}
            <IconButton
              disableRipple
              onClick={(event) => {
                onAddClick(drink);
                event.stopPropagation();
              }}
            >
              <AddIcon fontSize="inherit" sx={{ fontSize: '28px' }} />
            </IconButton>
          </Box>
        </Has>
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ borderRadius: 2 }}>
          {drink.imageUrl ? <img src={drink.imageUrl} alt="logo" width={40} height={40} /> : <LocalDrinkIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={drink.name} secondary={drink.price + ' €'} />
    </ListItem>
  );
};

export default DrinkItem;
