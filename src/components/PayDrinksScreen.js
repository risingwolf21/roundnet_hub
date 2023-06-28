import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded, useFirestore } from "react-redux-firebase";
import { Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { HISTORY_ITEM_NOT_PAID, HISTORY_ITEM_PAY_IN_PROGRESS, PAYPAL_ME_ADDRESS } from "../constants";
import _ from "lodash";
import { useState } from "react";
import { captureException } from "@sentry/react";
import EuroIcon from '@mui/icons-material/Euro';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Add, Warning } from "@mui/icons-material";

const userDrinks = 'userDrinks';
const drinksInPayment = 'drinksInPayment';
const drinksUnpaid = 'drinksUnpaid';
const pendingPayment = 'pendingPayment';

const totalAmountToPay = (drinks) => {
    if (!drinks)
        return 0;
    return Object.values(drinks)
        .flatMap(x => x.drinks)
        .reduce((prev, curr) => prev + (curr.count * curr.price), 0);
}

const PayDrinksButton = ({ paypalActive, drinks, auth }) => {

    const firestore = useFirestore();
    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO)
    const [alertOpen, setAlertOpen] = useState(false);

    const payOnClick = async () => {
        setLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            firestore.set(`payments/${auth.uid}`, {
                userId: auth.uid,
                displayName: auth?.displayName ?? auth.email,
                email: auth.email,
                amountToPay: totalAmountToPay(drinks)
            });
        } catch (error) {
            setAlertInfo(ERROR_MESSAGE_INFO);
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("path", `payments/${auth.uid}`);
                scope.setExtra("data", JSON.stringify(updatingDrinks));
                return scope;
            });
            return null;
        }

        let updatingDrinks = [];

        for (let [k, v] of Object.entries(drinks)) {
            firestore.update(`users/${auth.uid}/drinks/${k}`, { state: HISTORY_ITEM_PAY_IN_PROGRESS })
                .catch(error => {
                    setAlertInfo(ERROR_MESSAGE_INFO);
                    captureException(error, (scope) => {
                        scope.clear();
                        scope.setExtra("path", `users/${auth.uid}/drinks/${k}`);
                        scope.setExtra("data", JSON.stringify(v));
                        return scope;
                    });
                });
        }

        await firestore.waitForPendingWrites();

        setAlertOpen(true);
        setLoading(false);
    }

    return <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, flexDirection: "column", justifyContent: "end", display: "flex", textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
        <Snackbar sx={{ position: "unset" }} open={alertOpen} autoHideDuration={1500} onClose={() => setAlertOpen(false)}>
            <Alert onClose={() => setAlertOpen(false)} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
        {
            paypalActive ?
                <Button variant="contained" fullWidth sx={{ marginTop: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}
                    onClick={() => {
                        const newWindow = window.open(`https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${totalAmountToPay(drinks)}EUR`, '_blank', 'noopener,noreferrer')
                        if (newWindow) newWindow.opener = null
                    }}
                    startIcon={<EuroIcon />}>Mit Paypal bezahlen</Button>
                :
                <Button onClick={payOnClick} variant="contained" fullWidth sx={{ borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}>
                    {
                        loading ? <CircularProgress color="secondary" /> : "Bezahlen"
                    }
                </Button>

        }
    </Box>
}

const PayDrinksSummary = ({ drinks, unpaidDrinks, auth }) => {

    const firestore = useFirestore();
    const [unpaidDrinksOpen, setUnpaidDrinksOpen] = useState(false);
    const [dialogAddDrinksOpen, setDialogAddDrinksOpen] = useState(false);
    const [dialogAddDrinksLoading, setDialogAddDrinksLoading] = useState(false);

    const handleOpenUnpaidDrinksClick = () => {
        setUnpaidDrinksOpen(!unpaidDrinksOpen);
    }

    const addUnpaidDrinksToPayment = async () => {
        setDialogAddDrinksLoading(true);

        for (let [k, v] of Object.entries(unpaidDrinks)) {
            firestore.update(`users/${auth.uid}/drinks/${k}`, { state: HISTORY_ITEM_PAY_IN_PROGRESS })
                .catch(error => {
                    captureException(error, (scope) => {
                        scope.clear();
                        scope.setExtra("path", `users/${auth.uid}/drinks/${k}`);
                        scope.setExtra("data", JSON.stringify(v));
                        return scope;
                    });
                });
        }
        firestore.update(`payments/${auth.uid}`, {
            amountToPay: firestore.FieldValue.increment(totalAmountToPay(unpaidDrinks))
        });

        setDialogAddDrinksLoading(false);
        setDialogAddDrinksOpen(false);
    }

    return <Box>
        <List>
            {
                drinks && _.chain(Object.values(drinks)
                    .flatMap(x => x.drinks))
                    // Group the elements of Array based on `name` property
                    .groupBy("name")
                    // `key` is group's name (name), `value` is the array of objects
                    .map((value, key) => ({ name: key, count: value.reduce((prev, curr) => prev + curr.count, 0), priceSingle: value[0]?.price ?? "NaN", priceTotal: value.reduce((prev, curr) => prev + (curr.count * curr.price), 0), drinks: value }))
                    .value()
                    .map((x, index) => <ListItem key={"drinks" + index}>
                        <ListItemAvatar>
                            <Typography>{x.count + " x"}</Typography>
                        </ListItemAvatar>
                        <ListItemText primary={x.name} secondary={x.priceSingle + " €"} />
                        <ListItemSecondaryAction>
                            <Typography>{x.priceTotal} €</Typography>
                        </ListItemSecondaryAction>
                    </ListItem>)
            }
            <Divider />
            <ListItem>
                <ListItemText primaryTypographyProps={{ fontWeight: "bold" }} primary={"Gesamtkosten"} />
                <ListItemSecondaryAction>
                    <Typography sx={{ fontWeight: "bold" }}>
                        {totalAmountToPay(drinks)} €
                    </Typography>
                </ListItemSecondaryAction>
            </ListItem>
            {
                (unpaidDrinks && Object.entries(unpaidDrinks).length > 0) && <>
                    <ListItemButton onClick={handleOpenUnpaidDrinksClick}>
                        <ListItemText primary={"Offene Getränke"} />
                        {unpaidDrinksOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={unpaidDrinksOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {
                                unpaidDrinks && [<ListItem>
                                    <ListItemAvatar>
                                        <Warning color="warning" />
                                    </ListItemAvatar>
                                    <ListItemText primary={"Diese Getränke sind in der aktuellen Zahlung noch nicht enthalten."} />
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => setDialogAddDrinksOpen(true)}>
                                            <Add />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>, <Divider />].concat(_.chain(Object.values(unpaidDrinks)
                                    .flatMap(x => x.drinks))
                                    // Group the elements of Array based on `name` property
                                    .groupBy("name")
                                    // `key` is group's name (name), `value` is the array of objects
                                    .map((value, key) => ({ name: key, count: value.reduce((prev, curr) => prev + curr.count, 0), priceSingle: value[0]?.price ?? "NaN", priceTotal: value.reduce((prev, curr) => prev + (curr.count * curr.price), 0), drinks: value }))
                                    .value()
                                    .map((x, index) => <ListItem key={"drinks" + index}>
                                        <ListItemAvatar>
                                            <Typography>{x.count + " x"}</Typography>
                                        </ListItemAvatar>
                                        <ListItemText primary={x.name} secondary={x.priceSingle + " €"} />
                                        <ListItemSecondaryAction>
                                            <Typography>{x.priceTotal} €</Typography>
                                        </ListItemSecondaryAction>
                                    </ListItem>))
                            }
                        </List>
                    </Collapse>
                </>
            }
        </List>
        <Dialog open={dialogAddDrinksOpen} onClose={() => setDialogAddDrinksOpen(false)} title="Getränke hinzufügen">
            <DialogTitle id="alert-dialog-title">
                {"Getränke hinzufügen"}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {unpaidDrinks && `Es ${Object.entries(unpaidDrinks).length === 1 ? "wird " + Object.entries(unpaidDrinks).length + " Getränk" : "werden " + Object.entries(unpaidDrinks).length + " Getränke "}
                     mit einem Gesamtpreis von ${totalAmountToPay(unpaidDrinks)} € deiner aktuellen Rechnung hinzugefügt`}
                </Typography>
            </DialogContent>
            {
                dialogAddDrinksLoading ?
                    <CircularProgress />
                    :
                    <DialogActions>
                        <Button onClick={() => setDialogAddDrinksOpen(false)}>Abbrechen</Button>
                        <Button onClick={addUnpaidDrinksToPayment} autoFocus>
                            Bestätigen
                        </Button>
                    </DialogActions>
            }
        </Dialog>
    </Box>
}

const SUCCESS_MESSAGE_INFO = { message: "Zahlung erfolgreich angefragt! Jetzt auf Paypal senden", severity: "success" };
const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const PayDrinksScreen = ({ drinks, auth, pendingPayment, drinksInPayment, drinksUnpaid }) => {


    if (!isLoaded(drinksUnpaid, pendingPayment, drinks, drinksInPayment)) {
        return <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}>
            <CircularProgress />
        </Grid>
    }

    if (!drinks || drinks.length < 1) {
        return <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}>
            <Typography>Keine offenen Getränke gefunden</Typography>
        </Grid>
    }

    const drinkItems = () => {
        if (drinksInPayment) {
            return Object.values(drinksInPayment).length > 0 ? drinksInPayment : drinks;
        }
        return drinks;
    }

    return (
        <Box>
            <PayDrinksSummary drinks={drinkItems()} unpaidDrinks={drinksUnpaid} auth={auth} />
            <PayDrinksButton
                auth={auth}
                drinks={drinkItems()}
                paypalActive={drinksInPayment && Object.values(drinksInPayment).length > 0 ? true : false} />
        </Box>
    );
}

export default compose(
    firestoreConnect((props) => [
        {
            collection: `users/${props.auth.uid}/drinks`,
            storeAs: userDrinks
        },
        {
            collection: `users/${props.auth.uid}/drinks`,
            where: [["state", "==", HISTORY_ITEM_PAY_IN_PROGRESS]],
            storeAs: drinksInPayment
        },
        {
            collection: `users/${props.auth.uid}/drinks`,
            where: [["state", "==", HISTORY_ITEM_NOT_PAID]],
            storeAs: drinksUnpaid
        },
        {
            collection: `payments`,
            doc: props.auth.uid,
            storeAs: pendingPayment
        }
    ]),
    connect(({ firestore: { data } }, props) => ({
        drinks: data.userDrinks,
        drinksInPayment: data.drinksInPayment,
        drinksUnpaid: data.drinksUnpaid,
        pendingPayment: data.pendingPayment
    }))
)(PayDrinksScreen)

// const enhance = compose(
//     withFirestore,
//     withHandlers({
//         loadUserDrinks: (props) => (collection) => props.firestore.get({ collection, storeAs: userDrinks }),
//         loadPayment: (props) => (docId) => props.firestore.get({ collection: "payments", doc: docId, storeAs: pendingPayment }),
//     }),
//     lifecycle({
//         componentDidMount() {
//             this.props.loadUserDrinks(`users/${this.props.auth.uid}/drinks`);
//             this.props.loadPayment(this.props.auth.uid);

//             this.props.firestore.setListeners([`users/${this.props.auth.uid}/drinks`, `payments/${this.props.auth.uid}`])
//         },
//         componentWillUnmount() {
//             this.props.firestore.unsetListeners([`users/${this.props.auth.uid}/drinks`, `payments/${this.props.auth.uid}`])
//         }
//     }),
//     connect((state) => ({
//         drinks: state.firestore.ordered.userDrinks,
//         pendingPayment: state.firestore.ordered.pendingPayment
//     }))
// )

// export default enhance(PayDrinksScreen)