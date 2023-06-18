import { Avatar, Badge, Box, Fab, Grid, IconButton, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { isLoaded, useFirestore, withFirestore } from "react-redux-firebase";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import EditDrinkDialog from "./EditDrinkDialog";
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { useState } from "react";
import _ from "lodash";
import { lifecycle, withHandlers } from "recompose";

const AdminDrinkItem = ({ drink, onEditClick }) => {
    return <Paper sx={{ width: "100%", marginBottom: 2, listStyleType: "none" }}>
        <ListItem>
            <ListItemAvatar>
                <Badge color={drink?.active ? "success" : "warning"} variant="dot">
                    <Avatar>
                        {
                            drink?.imageUrl
                                ? <img src={drink.imageUrl} alt="logo" width={40} height={40} />
                                : <LocalDrinkIcon />
                        }
                    </Avatar>
                </Badge>
            </ListItemAvatar>
            <ListItemText primary={drink.name} secondary={drink.price + " €"} />
            <ListItemSecondaryAction>
                <IconButton disableRipple onClick={onEditClick}>
                    <EditIcon fontSize={"medium"} />
                </IconButton>
            </ListItemSecondaryAction>
        </ListItem>
    </Paper>
}

const EMPTY_DRINK = { "imageUrl": "", name: "", price: 0, active: false };

const AdminDrinkList = ({ dispatch, drinks, profile, auth }) => {

    const [open, setOpen] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState();
    const firestore = useFirestore();

    const selectDrink = (drink) => {
        setSelectedDrink(drink);
        setOpen(true);
    }

    const onDrinkEditFinished = (drink) => {
        if (drink.id) {
            firestore.update(`drinks/${drink.id}`, _.omit(drink, ["id"]));
        } else {
            firestore.add("drinks", _.omit(drink, ["id"]));
        }

        setOpen(false);
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ paddingTop: 2 }}>
        <Grid container width="100%" direction="column" alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
            {
                isLoaded(drinks) && drinks.map((drink, index) => <AdminDrinkItem
                    key={"drink" + index}
                    drink={drink}
                    onEditClick={() => selectDrink(drink)} />)
            }
            <Box height={"64px"} width={"100%"} />
        </Grid>
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "8px", bottom: "8px" }} onClick={() => selectDrink(EMPTY_DRINK)}>
            <AddIcon sx={{ color: "white" }} />
        </Fab>
        <EditDrinkDialog drink={selectedDrink} open={open} handleClose={() => setOpen(false)} onDrinkEditFinished={onDrinkEditFinished} />
    </Grid>);
}

const enhance = compose(
    withFirestore,
    withHandlers({
        loadDrinks: (props) => (path) => props.firestore.get({ collection: path }),
    }),
    lifecycle({
        componentDidMount() {
            this.props.loadDrinks("drinks");
            this.props.firestore.setListener("drinks");
        },
        componentWillUnmount() {
            this.props.firestore.unsetListener("drinks");
        }
    }),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
);

export default enhance(AdminDrinkList);