import { Box, Fab, Grid } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded, useFirestore } from "react-redux-firebase";
import DrinkItem from "./DrinkItem";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";
import { HISTORY_ITEM_NOT_PAID } from "../constants";

const drinks = "drinks";

const DrinkList = ({ dispatch, drinks, profile, auth }) => {

    useEffect(() => {

    }, []);

    const firestore = useFirestore();

    const [addedDrinks, setAddedDrinks] = useState({});

    const confirmDrinks = () => {
        let data = { date: Date.now(), state: HISTORY_ITEM_NOT_PAID, drinks: Object.values(addedDrinks) };

        firestore.add(`users/${auth.uid}/drinks`, data)
            .then((onfulfilled) => {
                console.log("Result: " + JSON.stringify(onfulfilled));

                firestore.add("history", data)

                Object.values(addedDrinks).forEach(drink => {
                    firestore.update(`drinks/${drink.id}`, { stock: (drink?.stock - drink.count) ?? 0 });
                });

                setAddedDrinks({});
            }, (onrejected) => {
                console.log("Reject: " + JSON.stringify(onrejected));
            }).catch((error) => {

            });
    }

    const onAddDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            temp[drink.id].count = temp[drink.id].count + 1;
        } else {
            temp[drink.id] = { count: 1, ...drink };
        }
        setAddedDrinks({ ...temp });
    }

    const onRemoveDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            if (temp[drink.id].count - 1 === 0) {
                delete temp[drink.id];
            } else {
                temp[drink.id].count = temp[drink.id].count - 1;
            }
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
        <Grid container sx={{ overflowY: "scroll", }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
            {
                isLoaded(drinks) && drinks.map(drink => <DrinkItem drink={drink} count={addedDrinks[drink.id]?.count} onAddClick={() => onAddDrinkClick(drink)} onMinusClick={() => onRemoveDrinkClick(drink)} />)
            }
            <Box height={"128px"} width={"100%"}/>
        </Grid>
        <BottomInformation title={"Gesamtpreis"} totalPrice={Object.values(addedDrinks).reduce((prev, res) => prev + (res.price * res.count), 0) + " €"} />
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={confirmDrinks}>
            <CheckIcon sx={{ color: "white" }} />
        </Fab>
    </Grid>);
}

export default compose(
    firestoreConnect((props) => [
        {
            collection: `drinks`,
            where: ["active", "==", true],
            storeAs: drinks
        }
    ]),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(DrinkList);