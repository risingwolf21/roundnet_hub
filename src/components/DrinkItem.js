import { Avatar, Badge, Box, IconButton, LinearProgress, ListItem, ListItemAvatar, ListItemText, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { isNumber } from 'lodash';

const StockIndicator = ({stock}) => {
    if (!stock || !isNumber(stock) || stock <= 0) {
        return <></>;
    }
    return <LinearProgress variant='determinate' value={stock} />
}

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }) => {
    return <Badge sx={{ marginBottom: 2, width: "100%", "& .MuiBadge-badge": { fontSize: 14 } }} color="secondary" badgeContent={count ?? 0}>
        <Paper sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                <ListItem>
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
                </ListItem>
                <Box sx={{ display: "flex", flexDirection: "row" }}>
                    {
                        (count > 0) && <IconButton disableRipple onClick={onMinusClick}>
                            <RemoveIcon fontSize={"large"} />
                        </IconButton>
                    }
                    <IconButton disableRipple onClick={onAddClick} >
                        <AddIcon fontSize={"large"} />
                    </IconButton>
                </Box>
            </Box>
            <StockIndicator stock={drink?.stock}/>
        </Paper> 
    </Badge>
}

export default DrinkItem;
