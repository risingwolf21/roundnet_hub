import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded, useFirestore, withFirestore } from "react-redux-firebase";
import { Alert, Box, Button, CircularProgress, Divider, Grid, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { HISTORY_ITEM_PAY_IN_PROGRESS, PAYPAL_ME_ADDRESS } from "../constants";
import _ from "lodash";
import { useState } from "react";
import { captureException } from "@sentry/react";
import { lifecycle, withHandlers } from "recompose";

const userDrinks = 'userDrinks';
const pendingPayment = 'pendingPayment';

const PaymentInProgress = ({ pendingPayment }) => {
    return <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}
    >
        <Typography>Aktive ausstehende Zahlung</Typography>
        <Button variant="contained" sx={{ marginTop: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }} onClick={() => {
            const newWindow = window.open(`https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${pendingPayment.amountToPay}EUR`, '_blank', 'noopener,noreferrer')
            if (newWindow) newWindow.opener = null
        }}>Mit Paypal bezahlen</Button>
    </Grid>
}

const SUCCESS_MESSAGE_INFO = { message: "Zahlung erfolgreich angefragt! Jetzt auf Paypal senden", severity: "success" };
const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };


const PayDrinksScreen = ({ drinks, auth, pendingPayment }) => {

    const firestore = useFirestore();

    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO)
    const [alertOpen, setAlertOpen] = useState(false);

    const payOnClick = async () => {
        setLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1000));

        let updatingDrinks = [];

        for (let [k, _] of Object.entries(drinks)) {
            const promise = firestore.update(`users/${auth.uid}/drinks/${k}`, { state: HISTORY_ITEM_PAY_IN_PROGRESS });
            updatingDrinks.push(promise);
        }

        let result = await Promise.all(updatingDrinks).then((v) => {
            firestore.set(`payments/${auth.uid}`, {
                userId: auth.uid,
                displayName: auth.displayName,
                email: auth.email,
                amountToPay: totalAmountToPay()
            }).catch(error => {
                setAlertInfo(ERROR_MESSAGE_INFO);
                captureException(error, (scope) => {
                    scope.clear();
                    scope.setExtra("path", `payments/${auth.uid}`);
                    scope.setExtra("data", JSON.stringify(updatingDrinks));
                    return scope;
                });
                return null;
            })
        });

        setAlertOpen(true);

        if (result === null) {
            setLoading(false);
        }

        // Just add the amount you want to request to the end of your link. For example, use PayPal.Me/DiaRusso/25 to request 25.00 USD. The request will be made in your default currency, which you can change at any time in your PayPal Account settings.
        //You can request a specific currency by adding its code to the amount. To ask for Australian Dollars, for example, you would use PayPal.Me/DiaRusso/25AUD.  
        // const newWindow = window.open("https://www.paypal.me/karlwolf2706/2EUR", '_blank', 'noopener,noreferrer')
        // if (newWindow) newWindow.opener = null
    }

    if (isLoaded(pendingPayment) && pendingPayment) {
        return <PaymentInProgress pendingPayment={pendingPayment} />
    }

    if (isLoaded(drinks) && (!drinks || drinks.length < 1)) {
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

    if (!isLoaded(drinks)) {
        return <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}
        >
            <CircularProgress />
        </Grid>
    }

    const totalAmountToPay = () => {
        if (!drinks)
            return 0;
        return Object.values(drinks)
            .flatMap(x => x.drinks)
            .reduce((prev, curr) => prev + (curr.count * curr.price), 0);
    }

    return (
        <Box>
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
                    <ListItemText primary={"Gesamtkosten"} />
                    <ListItemSecondaryAction>
                        <Typography>
                            {totalAmountToPay()} €
                        </Typography>
                    </ListItemSecondaryAction>
                </ListItem>
            </List>
            <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
                <Button onClick={payOnClick} variant="contained" fullWidth sx={{ borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}>
                    {
                        loading ? <CircularProgress color="secondary" /> : "Bezahlen"
                    }
                </Button>
            </Box>
            <Snackbar sx={{ position: "fixed", right: "16px", bottom: alertInfo.severity === "success" ? "16px" : "72px" }} open={alertOpen} autoHideDuration={4000} onClose={() => setAlertOpen(false)}>
                <Alert onClose={() => setAlertOpen(false)} severity={alertInfo.severity} sx={{ width: '100%' }}>
                    {alertInfo.message}
                </Alert>
            </Snackbar>
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
            collection: `payments`,
            doc: props.auth.uid,
            storeAs: pendingPayment
        }
    ]),
    connect(({ firestore: { data } }, props) => ({
        drinks: data.userDrinks,
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