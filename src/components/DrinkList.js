import { Alert, Box, CircularProgress, Fab, Grid, Snackbar } from "@mui/material";
import DrinkItem from "./DrinkItem";
import { useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";
import { NOT_PAID, OPEN } from "../constants";
import { captureException } from "@sentry/react";
import { useRealtime } from "../hooks/useRealtime";
import { Loading } from "./Loading";
import { Error } from "./Error";
import { useAuth } from "../hooks/useAuth";
import { useClient } from "react-supabase";

const SUCCESS_MESSAGE_INFO = { message: "Getränke erfolgreich gebucht!", severity: "success" };
// const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const DrinkList = () => {

    const { user } = useAuth();
    const client = useClient();

    const [{ data: drinks, error, fetching }] = useRealtime(
        'drink',
        {
            select: {
                columns: 'id, name, price, stock, imageUrl, active',
                filter: (query) => query.eq('active', true),
            }
        },
        (data, payload) => data.id === payload.id);

    const [{ data: payment }] = useRealtime(
        'payments',
        {
            select: {
                columns: 'id, userId, state',
                filter: (query) => query.eq("userId", user.id)
            }
        },
        (data, payload) => data.id === payload.id);

    const [addedDrinks, setAddedDrinks] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSuccessMessageOpen(false);
    };

    const confirmDrinksDialog = (message) => {
        setAlertInfo(message);
        setSuccessMessageOpen(true);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        let data = { date: Date.now(), state: NOT_PAID, drinks: Object.values(addedDrinks) };

        try {
            let paymentId;
            if (!payment || payment.length < 1) {
                const { data, error } = await client.from("payments").insert({
                    userId: user.id,
                    state: OPEN
                }).select().single();
                if (error)
                    throw Error(error);
                paymentId = data.id;
            } else {
                paymentId = payment[0]?.id;
            }

            if (!paymentId)
                throw Error("Payment ID could not be found")

            const { error } = await client.from("history").insert(
                Object.values(addedDrinks).map(drink => {
                    return {
                        user: user.id,
                        drink: drink.id,
                        count: drink.count,
                        payment: paymentId,
                        amount: drink.count * drink.price
                    }
                })
            );
            if (error)
                throw Error(error);

            setLoading(false);
            setAddedDrinks({});
            confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        }
        catch (error) {
            setLoading(false);
            confirmDrinksDialog({ message: error, severity: "error" });
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("data", JSON.stringify(data));
                return scope;
            });
        }
    }

    const onAddDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            temp[drink.id].count = temp[drink.id].count + 1;
        } else {
            temp[drink.id] = { count: 1, ...drink };
        }
        setAddedDrinks({ ...temp });
    }

    const onRemoveDrinkClick = (drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            if (temp[drink.id].count - 1 === 0) {
                delete temp[drink.id];
            } else {
                temp[drink.id].count = temp[drink.id].count - 1;
            }
        }
        setAddedDrinks({ ...temp });
    }

    if (fetching)
        return <Loading />
    if (error)
        return <Error message={error} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <Grid container sx={{ overflowY: "scroll", }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingTop={2} paddingLeft={2} paddingRight={2}>
            {
                drinks && drinks.map((drink, index) => <DrinkItem key={"Drink" + index} drink={drink} count={addedDrinks[drink.id]?.count} onAddClick={() => onAddDrinkClick(drink)} onMinusClick={() => onRemoveDrinkClick(drink)} />)
            }
            <Box height={"128px"} width={"100%"} />
        </Grid>
        {
            Object.values(addedDrinks).length > 0 && <>
                <BottomInformation title={"Gesamtpreis"} totalPrice={Object.values(addedDrinks).reduce((prev, res) => prev + (res.price * res.count), 0) + " €"} />
                <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
            </>
        }

        <Snackbar sx={{ position: "fixed", right: "16px", bottom: alertInfo.severity === "success" ? "16px" : "72px" }} open={successMessageOpen} autoHideDuration={1500} onClose={handleClose}>
            <Alert onClose={handleClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
    </Grid >);
}

export default DrinkList;
