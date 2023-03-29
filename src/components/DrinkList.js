import { Fab, Grid, Paper } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded, useFirebase, useFirestore } from "react-redux-firebase";
import DrinkItem from "./DrinkItem";
import { useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";

const DrinkList = ({ dispatch, drinks, profile, auth }) => {

    const firestore = useFirestore();

    const [addedDrinks, setAddedDrinks] = useState({});

    const confirmDrinks = () => {
        firestore.add("history", addedDrinks).then((result) => {
            firestore.set(`users/${auth.uid}/history/${result.id}`, addedDrinks);
        });
        setAddedDrinks({});
    }

    const onAddDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            temp[drink.id].count = temp[drink.id].count + 1;
        } else {
            temp[drink.id] = { count: 1, item: drink };
        }
        setAddedDrinks({ ...temp });
    }

    const onRemoveDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            temp[drink.id].count = temp[drink.id].count - 1 > 0 ? temp[drink.id].count - 1 : 0;
        }
        setAddedDrinks({ ...temp });
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
                isLoaded(drinks) && drinks.map(drink => <DrinkItem drink={drink} count={addedDrinks[drink.id]?.count} onAddClick={() => onAddDrinkClick(drink)} onMinusClick={() => onRemoveDrinkClick(drink)} />)
            }
        </Grid>
        <BottomInformation totalPrice={Object.values(addedDrinks).reduce((prev, res) => prev + (res.item.price * res.count), 0)} />
        <Fab sx={{ background: "#66bb6a", position: "absolute", right: "8px", bottom: "64px" }} onClick={confirmDrinks}>
            <CheckIcon sx={{ color: "white" }} />
        </Fab>
    </Grid>);
}

export default compose(
    firestoreConnect(() => ['drinks']),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(DrinkList);