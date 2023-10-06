import { Box, Button, Divider, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { PAYPAL_ME_ADDRESS } from "../constants";
import EuroIcon from '@mui/icons-material/Euro';
import { groupBy } from '../utils';
import { Error } from "./Error";
import { Loading } from "./Loading";
import CustomAppBar from "./AppBar";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchDrinksToPayAsync, fetchPaymentAsync } from "../redux/drinksSlice";
import { useClient } from "react-supabase";

const PayDrinksButton = ({ amountToPay }) => {

    const onPayClick = () => {
        const newWindow = window.open(`https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${amountToPay}EUR`, '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
    }

    return <Box sx={{ position: "fixed", bottom: "60px", left: 0, right: 0, flexDirection: "column", justifyContent: "end", display: "flex", textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
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
                            priceTotal: value[1].reduce((prev, curr) => prev + (curr.count), 0),
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
                            {drinks.reduce((prev, curr) => prev + curr.amount, 0)} €
                        </Typography>
                    </ListItemSecondaryAction>
                </ListItem>
            }
        </List>
    </Box>
}

const PayDrinksScreen = () => {

    const { user } = useSelector(state => state.application);
    const dispatch = useDispatch();
    const client = useClient();

    const { paymentHistory, paymentError, paymentLoading } = useSelector(state => state.drinks);

    useEffect(() => {
        dispatch(fetchDrinksToPayAsync({ client, user }));
        dispatch(fetchPaymentAsync({ client, user }));
    }, [dispatch, user, client]);

    if (paymentError)
        return <Error message={paymentError} />

    if (paymentLoading)
        return <Loading />

    if (!paymentHistory || paymentHistory.length < 1) {
        return <Error message={"Keine offenen Getränke gefunden"} />
    }

    return (
        <Box>
            <CustomAppBar navigateBack />
            <PayDrinksSummary drinks={paymentHistory} user={user} />
            <PayDrinksButton amountToPay={paymentHistory.reduce((prev, curr) => prev + curr.amount, 0)} />
        </Box>
    );
}

export default PayDrinksScreen;