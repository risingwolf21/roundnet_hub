import { Box, Button, Divider, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { PAYPAL_ME_ADDRESS, OPEN } from "../constants";
import EuroIcon from '@mui/icons-material/Euro';
import { groupBy, totalAmountToPay } from '../utils';
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { Error } from "./Error";
import { Loading } from "./Loading";

const PayDrinksButton = ({ amountToPay }) => {

    const onPayClick = () => {
        const newWindow = window.open(`https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${amountToPay}EUR`, '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
    }

    return <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, flexDirection: "column", justifyContent: "end", display: "flex", textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
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
                            priceTotal: value[1].reduce((prev, curr) => prev + (curr.amount), 0),
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

const PayDrinksScreen = () => {

    const { user } = useAuth();

    const [{ data: drinks, error: drinksError, fetching: drinksFetching }] = useRealtime(
        'history',
        {
            select: {
                columns: 'id, count, created_at, user, amount, drink ( name, price ), payments ( state )',
                filter: (query) => query.eq('payments.state', OPEN).not("payments", "is", null).eq('user', user.id),
            }
        },
        (data, payload) => data.id === payload.id, true);

    if (drinksError)
        return <Error message={drinksError} />

    if (drinksFetching)
        return <Loading />

    if (!drinks || drinks.length < 1) {
        return <Error message={"Keine offenen Getränke gefunden"} />
    }

    return (
        <Box>
            <PayDrinksSummary drinks={drinks} user={user} />
            <PayDrinksButton amountToPay={drinks.reduce((prev, curr) => prev + curr.amount, 0)} />
        </Box>
    );
}

export default PayDrinksScreen;