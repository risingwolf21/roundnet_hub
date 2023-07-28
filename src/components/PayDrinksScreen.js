import { Alert, Box, Button, Divider, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { PAYPAL_ME_ADDRESS, OPEN } from "../constants";
import { useState } from "react";
import EuroIcon from '@mui/icons-material/Euro';
import { groupBy, totalAmountToPay } from '../utils';
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { Error } from "./Error";

const PayDrinksButton = ({ payment }) => {

    const [alertInfo] = useState(SUCCESS_MESSAGE_INFO)
    const [alertOpen, setAlertOpen] = useState(false);

    const onPayClick = () => {
        const newWindow = window.open(`https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${payment.amountToPay}EUR`, '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
    }

    return <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, flexDirection: "column", justifyContent: "end", display: "flex", textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
        <Snackbar sx={{ position: "unset" }} open={alertOpen} autoHideDuration={1500} onClose={() => setAlertOpen(false)}>
            <Alert onClose={() => setAlertOpen(false)} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
        <Button variant="contained" fullWidth sx={{ marginTop: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}
            onClick={onPayClick}
            startIcon={<EuroIcon />}>Mit Paypal bezahlen</Button>
    </Box>
}

const PayDrinksSummary = ({ drinks }) => {
    return <Box>
        <List>
            {
                drinks && Object.entries(groupBy(drinks, x => x.drink?.name))
                    .map((value) => {
                        return {
                            name: value[0],
                            count: value[1].reduce((prev, curr) => prev + curr.count, 0),
                            priceSingle: value[1][0]?.drink?.price ?? "NaN",
                            priceTotal: value[1].reduce((prev, curr) => prev + (curr.count * curr.drink?.price ?? 0), 0),
                        }
                    })
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
            {
                drinks &&
                <ListItem key={"totalAmount"}>
                    <ListItemText primaryTypographyProps={{ fontWeight: "bold" }} primary={"Gesamtkosten"} />
                    <ListItemSecondaryAction>
                        <Typography sx={{ fontWeight: "bold" }}>
                            {totalAmountToPay(Object.values(drinks).map(x => ({ count: x.count, price: x.drink?.price ?? 0 })))} €
                        </Typography>
                    </ListItemSecondaryAction>
                </ListItem>
            }
        </List>
    </Box>
}

const SUCCESS_MESSAGE_INFO = { message: "Zahlung erfolgreich angefragt! Jetzt auf Paypal senden", severity: "success" };
//const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const PayDrinksScreen = () => {

    const { user } = useAuth();

    const [{ data: drinks }] = useRealtime(
        'history',
        {
            select: {
                columns: 'id, count, created_at, user, drink ( name, price ), payment(*)',
                filter: (query) => query.eq('payment.state', OPEN).eq('user', user.id),
            }
        },
        (data, payload) => data.id === payload.id, true);

    const [{ data: payment }] = useRealtime(
        'payments',
        {
            select: {
                columns: 'id, userId, amountToPay, state',
                filter: (query) => query.select().eq("userId", user.id).limit(1).single()
            }
        },
        (data, payload) => data.id === payload.id);

    if (!drinks || drinks.length < 1) {
        return <Error message={"Keine offenen Getränke gefunden"} />
    }

    return (
        <Box>
            <PayDrinksSummary drinks={drinks} user={user} />
            <PayDrinksButton drinks={drinks} payment={payment} />
        </Box>
    );
}

export default PayDrinksScreen;