import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";
import { FULFILLED, OPEN } from "../../constants";
import { useRealtime } from "../../hooks/useRealtime";
import { Loading } from "../Loading";
import { useAuth } from "../../hooks/useAuth";
import { Error } from "../Error";
import { useClient } from "react-supabase";


const PaymentsPendingAdmin = () => {

    const [open, setOpen] = useState(false);
    const [currentPayment, setPayment] = useState({});
    const { user } = useAuth();
    const client = useClient();

    const [{ data: payments, error, fetching }] = useRealtime(
        "payments",
        {
            select: {
                columns: 'id, created_at, user (userId, displayName, email), history (*)',
                filter: (query) => query.eq("state", OPEN)
            }
        },
        (data, payload) => data.id === payload.id, false);

    if (fetching)
        return <Loading />

    if (error)
        return <Error message={error} />

    const selectedPayment = (payment) => {
        setPayment(payment);
        setOpen(true);
    }

    const confirmPayment = (payment) => {
        client.from("payments").update({ state: FULFILLED }).eq("userId", payment?.user?.userId).then(res => {
            setOpen(false);
        });
    }

    return <Box>
        {
            payments && <List>
                {
                    Object.values(payments).map(x => {
                        return <ListItem key={x.user.email}>
                            <ListItemAvatar>
                                <Typography fontWeight={"bold"}>{x.history.reduce((prev, curr) => prev + curr.amount, 0)} €</Typography>
                            </ListItemAvatar>
                            <ListItemText primary={x.user?.displayName ?? x.user.email} secondary={x.user.displayName ? "Benutzername" : "Email"} />
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
        <Dialog open={open} onClose={() => setOpen(false)} title="Zahlung bestätigen">
            <DialogTitle id="alert-dialog-title">
                {"Zahlung bestätigen"}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Hiermit bestätigst du, dass
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.user?.displayName}`}
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.user?.email}`}
                </Typography>
                <Typography>
                    eine Zahlung in Höhe von
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.history?.reduce((prev, curr) => prev + curr.amount, 0)} €`}
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