import { Avatar, Box, Grid, IconButton, ListItem, ListItemAvatar, ListItemText, Paper } from '@mui/material';
import logo from '../images/coca_cola_logo.svg';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Container } from '@mui/system';

const DrinkItem = ({ drink, count, onAddClick, onMinusClick }) => {

    return <Paper sx={{marginBottom: 2}}>
        <Box display={"flex"} flexDirection={"row"} width={"100%"}>
            <ListItem>
                <ListItemAvatar>
                    <Avatar>
                        <img src={logo} alt="logo" width={40} height={40} />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText primary={drink.name + " - " + count} secondary={drink.price} />
            </ListItem>
            <Container>
                <IconButton>
                    <RemoveIcon onClick={onMinusClick} />
                </IconButton>
                <IconButton>
                    <AddIcon onClick={onAddClick} />
                </IconButton>
            </Container>
        </Box>
    </Paper>
}

export default DrinkItem;