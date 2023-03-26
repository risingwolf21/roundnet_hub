import { IconButton, List, ListItem, ListItemAvatar, ListItemText, Paper } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded } from "react-redux-firebase";
import logo from '../images/coca_cola_logo.svg';
import AddIcon from '@mui/icons-material/Add';

const DrinkCheckList = ({ dispatch, drinks }) => {

    return <Paper elevation={3} sx={{ display: "inline-block", width: "100%" }}>
        <List>
            {
                isLoaded(drinks) && drinks.map(drink => <ListItem divider secondaryAction={
                    <IconButton edge="end" aria-label="delete">
                        <AddIcon />
                    </IconButton>
                }>
                    <ListItemAvatar>
                        <img src={logo} alt="logo" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText>{drink.name}</ListItemText>
                </ListItem>)
            }
        </List>
    </Paper>
}

export default compose(
    firestoreConnect(() => ['drinks']),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks
    }))
)(DrinkCheckList);