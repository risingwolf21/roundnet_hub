import { Avatar, Badge, Box, IconButton, ListItem, ListItemAvatar, ListItemText, Paper } from '@mui/material';
import logo from '../images/coca_cola_logo.svg';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }) => {

    return <Badge sx={{ marginBottom: 2, width: "100%", "& .MuiBadge-badge": { fontSize: 14 } }} key={drink} color="secondary" badgeContent={count ?? 0} showZero>
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
                        (count > 0) && <IconButton disableRipple>
                            <RemoveIcon onClick={onMinusClick} fontSize={"large"} />
                        </IconButton>
                    }
                    <IconButton disableRipple>
                        <AddIcon onClick={onAddClick} fontSize={"large"} />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    </Badge>
}

export default DrinkItem;