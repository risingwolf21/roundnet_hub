import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { connect } from "react-redux";
import { isLoaded, useFirestore, withFirestore } from "react-redux-firebase"
import { compose } from "redux"
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";
import { lifecycle, withHandlers } from "recompose";
import { HISTORY_ITEM_NOT_PAID, HISTORY_ITEM_PAY_IN_PROGRESS } from "../../constants";

const pendingPayments = "pendingPayments";

const totalAmountToPay = (drinks) => {
    if (!drinks)
        return 0;
    return Object.values(drinks)
        .flatMap(x => x.drinks)
        .reduce((prev, curr) => prev + (curr.count * curr.price), 0);
}

const PaymentsPendingAdmin = ({ pendingPayments, auth }) => {

    const [open, setOpen] = useState(false);
    const [paymentEveryoneLoading, setPaymentEveryoneLoading] = useState(false);
    const [currentPayment, setPayment] = useState({});

    const firestore = useFirestore();

    if (!isLoaded(pendingPayments)) {
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

    const selectedPayment = (payment) => {
        setPayment(payment);
        setOpen(true);
    }

    const startPaymentsForEveryone = () => {
        setPaymentEveryoneLoading(true);
        firestore.collection("users").get().then(result => {
            result.docs.forEach(user => {
                if (user.id === "Ym0OlVXoISbSNWrukaEsSjiDF9k2") {
                    firestore.collection(`users/${user.id}/drinks`).get().then(drinks => {
                        let filteredDrinks = drinks.docs.filter(x => x.data().state === HISTORY_ITEM_NOT_PAID);
                        filteredDrinks.forEach(drink => {
                            firestore.update(`users/${user.id}/drinks/${drink.id}`, { state: HISTORY_ITEM_PAY_IN_PROGRESS })
                        });
                        firestore.update(`payments/${user.id}`, {
                            email: user.data().email,
                            userId: user.id,
                            displayName: user.data()?.displayName ?? user.data().email,
                            amountToPay: firestore.FieldValue.increment(totalAmountToPay(filteredDrinks.map(x => x.data())))
                        });
                    });
                }
            });
            setPaymentEveryoneLoading(false);
        });
    }

    const confirmPayment = (payment) => {
        firestore.collection(`users/${payment.userId}/drinks`).get().then((snapshot) => {
            snapshot.docs.reduce((prev, curr) => [curr.id, ...prev], []).forEach(x => {
                firestore.delete(`users/${auth.uid}/drinks/${x}`)
            });
            firestore.delete(`payments/${payment.userId}`);
            firestore.add(`users/${payment.userId}/paymentHistory`, payment);
            setOpen(false);
        });
    }

    return <Box>
        {
            pendingPayments.length > 0 && <List>
                {
                    Object.values(pendingPayments).map(x => {
                        return <ListItem key={x.email}>
                            <ListItemAvatar>
                                <Typography fontWeight={"bold"}>{x.amountToPay} €</Typography>
                            </ListItemAvatar>
                            <ListItemText primary={x.displayName ?? x.email} secondary={x.displayName ? "Benutzername" : "Email"} />
                            <ListItemSecondaryAction >
                                <IconButton onClick={() => selectedPayment(x)}>
                                    <CheckIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    })
                }
            </List>
        }
        {
            pendingPayments.length < 1 && <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: '100vh' }}>
                <Typography>Keine aktiven Zahlungen gefunden</Typography>
            </Grid>
        }
        <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, flexDirection: "column", justifyContent: "end", display: "flex", textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
            <Button variant="contained" fullWidth sx={{ marginTop: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}
                onClick={startPaymentsForEveryone}>
                {
                    paymentEveryoneLoading ? <CircularProgress /> : "Zahlungen anfordern"
                }
            </Button>
        </Box>
        <Dialog open={open} onClose={() => setOpen(false)} title="Zahlung bestätigen">
            <DialogTitle id="alert-dialog-title">
                {"Zahlung bestätigen"}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Hiermit bestätigst du, dass
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment.displayName}`}
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment.email}`}
                </Typography>
                <Typography>
                    eine Zahlung in Höhe von
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment.amountToPay} €`}
                </Typography>
                <Typography>
                    getätigt hat.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={() => confirmPayment(currentPayment)} autoFocus>
                    Bestätigen
                </Button>
            </DialogActions>
        </Dialog>
    </Box>

}

const listener = {
    collection: "payments",
    storeAs: pendingPayments
}

// export default compose(
//     firestoreConnect((props) => [
//         {
//             collection: `payments`,
//             storeAs: pendingPayments
//         }
//     ]),
//     connect((state) => ({
//         pendingPayments: state.firestore.ordered.pendingPayments,
//         profile: state.firebase.profile,
//         auth: state.firebase.auth
//     }))
// )(PaymentsPendingAdmin);

const enhance = compose(
    withFirestore,
    withHandlers({
        loadPayments: (props) => (collection, storeAs) => props.firestore.get({ collection, storeAs })
    }),
    lifecycle({
        componentDidMount() {
            this.props.loadPayments(
                "payments",
                pendingPayments
            );
            this.props.firestore.setListener(listener);
        }
    }),
    connect((state) => ({
        pendingPayments: state.firestore.ordered.pendingPayments,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)

export default enhance(PaymentsPendingAdmin)