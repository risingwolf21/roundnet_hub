import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded, useFirestore } from "react-redux-firebase";
import { Box, Button, CircularProgress, Divider, Grid, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { HISTORY_ITEM_NOT_PAID, HISTORY_ITEM_PAY_IN_PROGRESS } from "../constants";
import _ from "lodash";

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
        <Typography>{JSON.stringify(pendingPayment)}</Typography>
    </Grid>
}

const PayDrinksScreen = ({ drinks, auth, pendingPayment }) => {

    const firestore = useFirestore();

    const payOnClick = () => {

        let updatingDrinks = [];

        for (let [k, v] of Object.entries(drinks)) {
            const promise = firestore.update(`users/${auth.uid}/drinks/${k}`, { state: HISTORY_ITEM_PAY_IN_PROGRESS });
            updatingDrinks.push(promise);
        }

        Promise.all(updatingDrinks).then((v) => {
            firestore.set(`payments/${auth.uid}`, {
                userId: auth.uid,
                displayName: auth.displayName,
                email: auth.email,
                amountToPay: totalAmountToPay()
            });
        });

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
            style={{ minHeight: '100vh' }}
        >
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
                        .map(x => <ListItem>
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
                    Bezahlen
                </Button>
            </Box>
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