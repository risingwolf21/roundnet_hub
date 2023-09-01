import { Avatar, Box, IconButton, LinearProgress, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { isNumber } from 'lodash';

const StockIndicator = ({ stock }) => {
    if (!stock || !isNumber(stock) || stock <= 0) {
        return <></>;
    }
    return <LinearProgress variant='determinate' value={stock} />
}

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }) => {
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
