import { Alert, Box, CircularProgress, Fab, Grid, Snackbar } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { isLoaded, useFirestore, withFirestore } from "react-redux-firebase";
import DrinkItem from "./DrinkItem";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";
import { HISTORY_ITEM_NOT_PAID } from "../constants";
import { lifecycle, withHandlers } from "recompose";
import { captureException } from "@sentry/react";

const drinks = "drinks";
const SUCCESS_MESSAGE_INFO = { message: "Getränke erfolgreich gebucht!", severity: "success" };
const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const DrinkList = ({ dispatch, drinks, profile, auth, payment, updateStocks }) => {

    useEffect(() => {

    }, [payment])

    const firestore = useFirestore();

    const [addedDrinks, setAddedDrinks] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO)

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSuccessMessageOpen(false);
    };

    const confirmDrinksDialog = (message) => {
        setAlertInfo(message);
        setSuccessMessageOpen(true);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        let data = { date: Date.now(), state: HISTORY_ITEM_NOT_PAID, drinks: Object.values(addedDrinks) };

        try {
            let result1 = await firestore.add({ collection: `users/${auth.uid}/drinks` }, data);
            let result2 = await firestore.add({ collection: `users/${auth.uid}/history` }, data);

            if (!(await firestore.get(result1.path)).exists || !(await firestore.get(result2.path)).exists) {
                if(result1?.path)
                    await firestore.delete(result1.path);
                if(result2?.path)
                    await firestore.delete(result2.path);
                throw Error("Could not add to /drinks or /history")
            }

            await updateStocks(addedDrinks)

            setLoading(false);
            setAddedDrinks({});
            confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        }
        catch (error) {
            setLoading(false);
            confirmDrinksDialog(ERROR_MESSAGE_INFO);
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("path", `users/${auth.uid}`);
                scope.setExtra("data", JSON.stringify(data));
                return scope;
            });
        }
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
        justifyContent="center">
        <Grid container sx={{ overflowY: "scroll", }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingTop={2} paddingLeft={2} paddingRight={2}>
            {
                isLoaded(drinks) && drinks.map((drink, index) => <DrinkItem key={"Drink" + index} drink={drink} count={addedDrinks[drink.id]?.count} onAddClick={() => onAddDrinkClick(drink)} onMinusClick={() => onRemoveDrinkClick(drink)} />)
            }
            <Box height={"128px"} width={"100%"} />
        </Grid>
        {
            Object.values(addedDrinks).length > 0 && <>
                <BottomInformation title={"Gesamtpreis"} totalPrice={Object.values(addedDrinks).reduce((prev, res) => prev + (res.price * res.count), 0) + " €"} />
                <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
            </>
        }

        <Snackbar sx={{ position: "fixed", right: "16px", bottom: alertInfo.severity === "success" ? "16px" : "72px" }} open={successMessageOpen} autoHideDuration={1500} onClose={handleClose}>
            <Alert onClose={handleClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
    </Grid >);
}

// export default compose(
//     firestoreConnect((props) => [
//         {
//             collection: `drinks`,
//             where: ["active", "==", true],
//             storeAs: drinks
//         },
//         {
//             collection: `payments`,
//             where: ["uid", "==", props.auth.uid],
//             storeAs: payment
//         }
//     ]),
//     connect((state) => ({
//         drinks: state.firestore.ordered.drinks,
//         payment: state.firestore.ordered.payment,
//         profile: state.firebase.profile,
//         auth: state.firebase.auth
//     }))
// )(DrinkList);

const enhance = compose(
    withFirestore,
    withHandlers({
        addDrinks: (props) => (uid, drinks) => {
            return props.firestore.add({ collection: `users/${uid}/drinks` }, drinks);
        },
        addToHistory: (props) => (uid, drinks) => {
            return props.firestore.add({ collection: `users/${uid}/history` }, drinks);
        },
        updateStocks: (props) => (drinks) => {
            let promises = [];
            Object.values(drinks).forEach(drink => {
                if ((drink?.stock - drink.count) > 0)
                    promises.push(props.firestore.update(`drinks/${drink.id}`, { stock: (drink?.stock - drink.count) ?? 0 }));
            });
            return Promise.all(promises)
        }
    }),
    lifecycle({
        componentDidMount() {
            this.props.firestore.get(
                {
                    collection: "drinks",
                    where: ["active", "==", true],
                    storeAs: drinks
                }
            );
            this.props.firestore.setListener("drinks");
        }
    }),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
);
export default enhance(DrinkList);