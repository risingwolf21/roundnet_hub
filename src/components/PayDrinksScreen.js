import { Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { NOT_PAID, IN_PROGRESS, PAYPAL_ME_ADDRESS } from "../constants";
import _ from "lodash";
import { useState } from "react";
import { captureException } from "@sentry/react";
import EuroIcon from '@mui/icons-material/Euro';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Add, Warning } from "@mui/icons-material";
import { groupBy, totalAmountToPay } from '../utils';
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { useClient } from "react-supabase";
import { Error } from "./Error";

const PayDrinksButton = ({ paypalActive, drinks }) => {

    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO)
    const [alertOpen, setAlertOpen] = useState(false);

    const payOnClick = async () => {
        setLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // let { writingError } = await supabase.from("payments").upsert(
            //     {
            //         userId: user.id,
            //         amountToPay: totalAmountToPay(drinks)
            //     })

            let { updatingError } = await supabase.from("drink").update(
                Object.values(drinks).map((value) => ({ id: value.id, state: IN_PROGRESS }))
            )

            console.log(updatingError)

            if (updatingError)
                throw new Error(updatingError)
            // if (writingError)
            //     throw new Error(writingError)

        } catch (error) {
            setAlertInfo(ERROR_MESSAGE_INFO);
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("path", `payments/${user.id}`);
                scope.setExtra("data", JSON.stringify(drinks));
                return scope;
            });
            return null;
        }

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

const PayDrinksSummary = ({ inPaymentDrinks, unpaidDrinks }) => {

    const [unpaidDrinksOpen, setUnpaidDrinksOpen] = useState(false);
    const [dialogAddDrinksOpen, setDialogAddDrinksOpen] = useState(false);
    const [dialogAddDrinksLoading, setDialogAddDrinksLoading] = useState(false);
    const client = useClient();

    const handleOpenUnpaidDrinksClick = () => {
        setUnpaidDrinksOpen(!unpaidDrinksOpen);
    }

    const addUnpaidDrinksToPayment = async () => {
        setDialogAddDrinksLoading(true);

        let { updatingError } = await supabase.from("history").upsert(
            Object.values(unpaidDrinks).map((value) => ({ id: value.id, state: IN_PROGRESS }))
        )

        // for (let [k, v] of Object.entries(unpaidDrinks)) {
        //     firestore.update(`users/${auth.uid}/drinks/${k}`, { state: IN_PROGRESS })
        //         .catch(error => {
        //             captureException(error, (scope) => {
        //                 scope.clear();
        //                 scope.setExtra("path", `users/${auth.uid}/drinks/${k}`);
        //                 scope.setExtra("data", JSON.stringify(v));
        //                 return scope;
        //             });
        //         });
        // }
        // firestore.update(`payments/${auth.uid}`, {
        //     amountToPay: firestore.FieldValue.increment(totalAmountToPay(unpaidDrinks))
        // });

        setDialogAddDrinksLoading(false);
        setDialogAddDrinksOpen(false);
    }

    return <Box>
        <List>
            {
                inPaymentDrinks && Object.entries(groupBy(inPaymentDrinks, x => x.drink?.name))
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
                inPaymentDrinks &&
                <ListItem key={"totalAmount"}>
                    <ListItemText primaryTypographyProps={{ fontWeight: "bold" }} primary={"Gesamtkosten"} />
                    <ListItemSecondaryAction>
                        <Typography sx={{ fontWeight: "bold" }}>
                            {totalAmountToPay(Object.values(inPaymentDrinks).map(x => ({ count: x.count, price: x.drink?.price ?? 0 })))} €
                        </Typography>
                    </ListItemSecondaryAction>
                </ListItem>
            }
            {
                (unpaidDrinks && Object.entries(unpaidDrinks).length > 0) && <>
                    <ListItemButton key={"unpaidDrink"} onClick={handleOpenUnpaidDrinksClick}>
                        <ListItemText primary={"Offene Getränke"} />
                        {unpaidDrinksOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={unpaidDrinksOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {
                                unpaidDrinks && [<ListItem key={"warning"}>
                                    <ListItemAvatar>
                                        <Warning color="warning" />
                                    </ListItemAvatar>
                                    <ListItemText primary={"Diese Getränke sind in der aktuellen Zahlung noch nicht enthalten."} />
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => setDialogAddDrinksOpen(true)}>
                                            <Add />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>, <Divider />].concat(Object.entries(groupBy(unpaidDrinks, x => x.drink.name))
                                    .map((value) => {
                                        return {
                                            name: value[0],
                                            count: value[1].reduce((prev, curr) => prev + curr.count, 0),
                                            priceSingle: value[1][0]?.drink?.price ?? "NaN",
                                            priceTotal: value[1].reduce((prev, curr) => prev + (curr.count * curr.drink.price), 0),
                                        }
                                    })
                                    .map((x, index) => <ListItem key={"unpaidDrinks" + index}>
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
                     mit einem Gesamtpreis von ${totalAmountToPay(Object.values(unpaidDrinks).map(x => ({ count: x.count, price: x.drink.price })))} € deiner aktuellen Rechnung hinzugefügt`}
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

const PayDrinksScreen = () => {

    const { user } = useAuth();

    const [{ data: unpaidDrinks }] = useRealtime(
        'history',
        {
            select: {
                columns: 'id, count, created_at, state, user_id, drink ( name, price )',
                filter: (query) => query.eq('state', NOT_PAID).eq('user_id', user.id),
            }
        },
        (data, payload) => data.id === payload.id);

    const [{ data: inPaymentDrinks }] = useRealtime(
        'history',
        {
            select: {
                columns: 'id, count, created_at, state, user_id, drink ( name, price )',
                filter: (query) => query.eq('state', IN_PROGRESS).eq('user_id', user.id),
            }
        },
        (data, payload) => data.id === payload.id);

    if ((!inPaymentDrinks || inPaymentDrinks.length < 1) && (!unpaidDrinks || unpaidDrinks.length < 1)) {
        return <Error message={"Keine offenen Getränke gefunden"} />
    }

    const drinkItems = () => {
        if (inPaymentDrinks) {
            return Object.values(inPaymentDrinks).length > 0 ? inPaymentDrinks : unpaidDrinks;
        }
        return unpaidDrinks;
    }

    return (
        <Box>
            <PayDrinksSummary inPaymentDrinks={inPaymentDrinks} unpaidDrinks={unpaidDrinks} user={user} />
            <PayDrinksButton
                drinks={drinkItems()}
                paypalActive={inPaymentDrinks && Object.values(inPaymentDrinks).length > 0 ? true : false} />
        </Box>
    );
}

export default PayDrinksScreen;