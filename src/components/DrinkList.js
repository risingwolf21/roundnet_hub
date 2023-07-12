import { Alert, Box, CircularProgress, Fab, Grid, Snackbar } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import DrinkItem from "./DrinkItem";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import BottomInformation from "./BottomInformation";
import { NOT_PAID } from "../constants";
import { captureException } from "@sentry/react";
import { supabase } from "../supabaseClient";
import { drink_deleted, drink_updated, drinks_changed } from "../redux/actions";

const SUCCESS_MESSAGE_INFO = { message: "Getränke erfolgreich gebucht!", severity: "success" };
const ERROR_MESSAGE_INFO = { message: "Es ist ein Fehler aufgetreten, versuche es bitte erneut!", severity: "error" };

const DrinkList = ({ dispatch, drinks, user }) => {

    useEffect(() => {
        supabase
            .from('drinks')
            .select()
            .then((res) => dispatch(drinks_changed(res.data)))

        supabase
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, payload => {
                switch (payload.eventType) {
                    case "DELETE":
                        dispatch(drink_deleted(payload.old.id));
                        break;
                    case "UPDATE":
                    case "INSERT":
                        dispatch(drink_updated(payload.new))
                        break;
                }
            })
            .subscribe();
    }, [dispatch]);

    const [addedDrinks, setAddedDrinks] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO)

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
            const { data, error } = await supabase.from("history").insert(
                Object.values(addedDrinks).map(drink => {
                    return {
                        user_id: user.userId,
                        drink_id: drink.id,
                        count: drink.count,
                        state: NOT_PAID
                    }
                })
            );
            if (error)
                throw Error(error.message);

            // TODO: update stocks

            setLoading(false);
            setAddedDrinks({});
            confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        }
        catch (error) {
            setLoading(false);
            confirmDrinksDialog({ message: error.message, severity: "error" });
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

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <Grid container sx={{ overflowY: "scroll", }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingTop={2} paddingLeft={2} paddingRight={2}>
            {
                drinks.map((drink, index) => <DrinkItem key={"Drink" + index} drink={drink} count={addedDrinks[drink.id]?.count} onAddClick={() => onAddDrinkClick(drink)} onMinusClick={() => onRemoveDrinkClick(drink)} />)
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

const enhance = compose(
    connect((state) => ({
        drinks: state.drinkList.drinks,
        user: state.application.user,
        auth: state.firebase.auth
    }))
);
export default enhance(DrinkList);
