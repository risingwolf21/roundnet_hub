import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { connect } from "react-redux";
import { firestoreConnect, isLoaded, useFirestore, withFirestore } from "react-redux-firebase"
import { compose } from "redux"
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";
import { lifecycle, withHandlers } from "recompose";

const pendingPayments = "pendingPayments";

const PaymentsPendingAdmin = ({ pendingPayments, auth }) => {

    const [open, setOpen] = useState(false);
    const [currentPayment, setPayment] = useState({});

    const firestore = useFirestore();

    if (!isLoaded(pendingPayments)) {
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

    const selectedPayment = (payment) => {
        setPayment(payment);
        setOpen(true);
    }

    const confirmPayment = (payment) => {
        firestore.collection(`users/${payment.userId}/drinks`).onSnapshot((snapshot) => {
            const postData = [];
            snapshot.forEach((doc) => postData.push({ ...doc.data(), id: doc.id }));
            const functions = []
            for (let [k, post] of Object.entries(postData)) {
                functions.push(firestore.delete(`users/${payment.userId}/drinks/${post.id}`));
            }
            functions.push(firestore.delete(`payments/${payment.userId}`));
            functions.push(firestore.add(`users/${payment.userId}/paymentHistory`, payment));

            Promise.all(functions).then(result => {
                setOpen(false);
            }).catch(error => {
                console.log(error);
            });
        });
    }

    return <Box>
        <List>
            {
                pendingPayments && Object.values(pendingPayments).map(x => {
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
        </List>
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
        },
        componentWillUnmount() {
            this.props.firestore.unsetListener(listener);
        }
    }),
    connect((state) => ({
        pendingPayments: state.firestore.ordered.pendingPayments,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
);

export default enhance(PaymentsPendingAdmin)