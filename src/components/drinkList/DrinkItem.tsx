import { Avatar, Box, IconButton, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import React, { Fragment } from 'react';
import { LocalDrink } from '@mui/icons-material';
import { Drink } from 'src/types/supabaseTypes';

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

export const LoadingDrinkItem = () => {
    return <ListItem>
        <ListItemAvatar>
            <Avatar sx={{ background: "#eee" }}>
                <LocalDrink sx={{ color: "#eee" }} />
            </Avatar>
        </ListItemAvatar>
        <ListItemText sx={{ paddingRight: "10px" }} primary={<Fragment>
            <Box sx={{ width: "60%", background: "#eee", height: "15px", borderRadius: "4px" }} />
        </Fragment>} secondary={<Fragment>
            <Box sx={{ width: "60%", background: "#eee", height: "12px", borderRadius: "4px", marginTop: 1 }} />
        </Fragment>} />
        <ListItemSecondaryAction>
            <Box sx={{ width: "28px", height: "28px", background: "#eee", margin: "8px", borderRadius: "4px" }} />
        </ListItemSecondaryAction>
    </ListItem>
}

export default DrinkItem;
