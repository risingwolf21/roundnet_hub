import { Alert, Box, CircularProgress, Fab, Grid, Snackbar } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { isLoaded, useFirestore, withFirestore } from "react-redux-firebase";
import DrinkItem from "./DrinkItem";
import { useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";
import { HISTORY_ITEM_NOT_PAID } from "../constants";
import { lifecycle, withHandlers } from "recompose";
import { captureException } from "@sentry/react";

const drinks = "drinks";
const SUCCESS_MESSAGE_INFO = { message: "Getränke erfolgreich gebucht!", severity: "success" };
const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const DrinkList = ({ dispatch, drinks, profile, auth, addDrinks, addToHistory, updateStocks }) => {

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
        let drinks = await addDrinks(auth.uid, data)
            .catch(error => {
                captureException(error, (scope) => {
                    scope.clear();
                    scope.setExtra("path", `users/${auth.uid}/drinks`);
                    scope.setExtra("data", JSON.stringify(data));
                    return scope;
                });
                return null;
            });
        let history = await addToHistory(auth.uid, data)
            .catch(error => {
                captureException(error, (scope) => {
                    scope.clear();
                    scope.setExtra("path", `users/${auth.uid}/history`);
                    scope.setExtra("data", JSON.stringify(data));
                    return scope;
                });
                return null;
            });

        if ((drinks.path && !(await firestore.get(drinks.path)).exists) || (history.path && !(await firestore.get(history.path)).exists)) {
            firestore.delete(history.path);
            firestore.delete(drinks.path);

            confirmDrinksDialog(ERROR_MESSAGE_INFO);
            return;
        }

        updateStocks(addedDrinks).catch(error => {
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("data", JSON.stringify(data));
                return scope;
            });
            confirmDrinksDialog(ERROR_MESSAGE_INFO);
            return null;
        });

        setAddedDrinks({});
        confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
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

        <Snackbar sx={{ position: "fixed", right: "16px", bottom: alertInfo.severity === "success" ? "16px" : "72px" }} open={successMessageOpen} autoHideDuration={1000} onClose={handleClose}>
            <Alert onClose={handleClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
    </Grid >);
}

const listeners = [{
    collection: "drinks",
    where: ["active", "==", true],
    storeAs: drinks
}]

const enhance = compose(
    withFirestore,
    withHandlers({
        loadDrinks: (props) => (path, where, storeAs) => props.firestore.get({ collection: path, where, storeAs }),
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
            this.props.loadDrinks(
                "drinks",
                ["active", "==", true],
                drinks
            );
            this.props.firestore.setListeners(listeners);
        },
        componentWillUnmount() {
            this.props.firestore.unsetListeners(listeners)
        }
    }),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
);
export default enhance(DrinkList);