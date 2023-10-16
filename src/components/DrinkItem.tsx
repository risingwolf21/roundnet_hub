import { Avatar, Box, IconButton, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import React from 'react';
import { Drink } from '../types/supabase';

type Props = {
    drink: Drink,
    count: number,
    onAddClick: (drink: Drink) => any,
    onMinusClick: (drink: Drink) => any
}

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }: Props) => {
    return <ListItem key={drink.id} onClick={() => onAddClick(drink)}>
        <ListItemAvatar>
            <Avatar>
                {
                    drink.imageUrl
                        ? <img src={drink.imageUrl} alt="logo" width={40} height={40} />
                        : <LocalDrinkIcon />
                }
            </Avatar>
        </ListItemAvatar>
        <ListItemText primary={drink.name} secondary={drink.price + " €"} />
        <ListItemSecondaryAction>
            <Box sx={{ display: "flex", flexDirection: "row" }}>
                {
                    (count > 0) && <>
                        <IconButton disableRipple onClick={() => onMinusClick(drink)}>
                            <RemoveIcon fontSize="inherit" sx={{ fontSize: "28px" }} />
                        </IconButton>
                        <Typography sx={{ p: 1, fontSize: "20px", color: "rgba(0,0,0,0.54)" }}>{count}</Typography>
                    </>
                }
                <IconButton disableRipple onClick={() => onAddClick(drink)} >
                    <AddIcon fontSize="inherit" sx={{ fontSize: "28px" }} />
                </IconButton>
            </Box>
        </ListItemSecondaryAction>
    </ListItem>
}

export default DrinkItem;
