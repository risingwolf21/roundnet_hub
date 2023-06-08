import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import { connect } from "react-redux";
import { firestoreConnect, isLoaded } from "react-redux-firebase"
import { compose } from "redux"
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";

const pendingPayments = "pendingPayments";

const PaymentsPendingAdmin = ({ pendingPayments, auth }) => {

    const [open, setOpen] = useState(false);
    const [currentPayment, setPayment] = useState({});

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
        setOpen(false);
    }

    return <Box>
        <List>
            {
                pendingPayments && Object.values(pendingPayments).map(x => {
                    return <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                        <ListItem>
                            <ListItemText primary={x.displayName ?? x.email} secondary={x.displayName ? "Benutzername" : "Email"} />
                            <ListItemAvatar>
                                <Typography fontWeight={"bold"}>{x.amountToPay} €</Typography>
                            </ListItemAvatar>
                        </ListItem>
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                            <IconButton disableRipple>
                                <CheckIcon onClick={() => selectedPayment(x)} fontSize={"large"} />
                            </IconButton>
                        </Box>
                    </Box>
                })
            }
        </List>
        <Dialog open={open} onClose={() => setOpen(false)} title="Zahlung bestätigen">
            <DialogTitle id="alert-dialog-title">
                {"Zahlung bestätigen"}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Mit der Bestätigung dieses Dialogs bestätigst du, dass
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

export default compose(
    firestoreConnect((props) => [
        {
            collection: `payments`,
            storeAs: pendingPayments
        }
    ]),
    connect(({ firestore: { data } }, props) => ({
        pendingPayments: data.pendingPayments
    }))
)(PaymentsPendingAdmin)