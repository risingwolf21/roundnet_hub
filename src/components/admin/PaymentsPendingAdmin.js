import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";
import { NOT_PAID, IN_PROGRESS } from "../../constants";
import AddPaymentsForEveryoneDialog from "./AddPaymentsForEveryoneDialog";
import { useRealtime } from "../../hooks/useRealtime";
import { Loading } from "../Loading";
import { useAuth } from "../../hooks/useAuth";
import { Error } from "../Error";
import { useClient } from "react-supabase";


const PaymentsPendingAdmin = () => {

    const [open, setOpen] = useState(false);
    const [paymentEveryoneLoading, setPaymentEveryoneLoading] = useState(false);
    const [paymentEveryoneDialog, setPaymentEveryoneDialog] = useState(false);
    const [currentPayment, setPayment] = useState({});
    const { user } = useAuth();
    const client = useClient();

    const [{ data: payments, error, fetching }] = useRealtime(
        "payments",
        {
            select: {
                columns: 'id, created_at, amountToPay, user (userId, displayName, email)',
                filter: (query) => query
            }
        },
        (data, payload) => data.id === payload.id);

    if (fetching)
        return <Loading />

    if (error)
        return <Error message={error} />

    const selectedPayment = (payment) => {
        setPayment(payment);
        setOpen(true);
    }

    const onUsersSelected = (users) => {
        setPaymentEveryoneDialog(false);
        users.forEach(async user => {

            const { data, error: updatingError } = await client.from("history")
                .update({ state: IN_PROGRESS })
                .eq("user_id", user.userId)
                .eq("state", NOT_PAID)
                .select("count, drink (name, price)");

            console.log(data)

            const { data: currentPayment } = await client.from("payments")
                .select()
                .eq("user_id", user.userId);

            if (currentPayment) {
                const { error: updateError } = await client.from("payments")
                    .update({ amountToPay: currentPayment.amountToPay + data.reduce((prev, curr) => prev + (curr.count * curr.drink.price), 0) })
                    .eq("user_id", user.userId);
            } else {
                let { writingError } = await client.from("payments").insert(
                    {
                        user_id: user.id,
                        amountToPay: data.reduce((prev, curr) => prev + (curr.count * curr.drink.price), 0)
                    })
                console.log(writingError);
            }

            // firestore.collection(`users/${user.id}/drinks`).get().then(async drinks => {
            //     let filteredDrinks = drinks.docs.filter(x => x.data().state === NOT_PAID);
            //     filteredDrinks.forEach(drink => {
            //         firestore.update(`users/${user.id}/drinks/${drink.id}`, { state: IN_PROGRESS })
            //     });

            //     firestore.set(`payments/${user.id}`, {
            //         email: user.email,
            //         userId: user.id,
            //         displayName: user?.displayName ?? user.email,
            //         amountToPay: firestore.FieldValue.increment(totalAmountToPay(filteredDrinks.map(x => x.data())))
            //     }, { merge: true });
            // });
        });
    }

    const startPaymentsForEveryone = () => {
        setPaymentEveryoneDialog(true);
    }

    const confirmPayment = (payment) => {
        const { error } = client.from("payments").delete().eq("user_id", user.userId).then(res => {
            setOpen(false);
        });
        // firestore.collection(`users/${payment.userId}/drinks`).get().then((snapshot) => {
        //     snapshot.docs.reduce((prev, curr) => [curr.id, ...prev], []).forEach(x => {
        //         firestore.delete(`users/${auth.uid}/drinks/${x}`)
        //     });
        //     firestore.delete(`payments/${payment.userId}`);
        //     firestore.add(`users/${payment.userId}/paymentHistory`, payment);
        //     setOpen(false);
        // });
    }

    return <Box>
        {
            payments && <List>
                {
                    Object.values(payments).map(x => {
                        return <ListItem key={x.user.email}>
                            <ListItemAvatar>
                                <Typography fontWeight={"bold"}>{x.amountToPay} €</Typography>
                            </ListItemAvatar>
                            <ListItemText primary={x.user.displayName ?? x.user.email} secondary={x.user.displayName ? "Benutzername" : "Email"} />
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
            payments?.length < 1 && <Grid
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
        <AddPaymentsForEveryoneDialog open={paymentEveryoneDialog} handleClose={() => setPaymentEveryoneDialog(false)} onUsersSelected={onUsersSelected} />
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

export default PaymentsPendingAdmin