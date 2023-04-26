import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded } from "react-redux-firebase";
import { Box, Button, CircularProgress, Grid, List, ListItem, ListItemText } from "@mui/material";
import { HISTORY_ITEM_NOT_PAID } from "../constants";

const userHistory = 'userHistory';

const PayDrinksScreen = ({ history, auth }) => {

    const payOnClick = () => {
        // Just add the amount you want to request to the end of your link. For example, use PayPal.Me/DiaRusso/25 to request 25.00 USD. The request will be made in your default currency, which you can change at any time in your PayPal Account settings.
        //You can request a specific currency by adding its code to the amount. To ask for Australian Dollars, for example, you would use PayPal.Me/DiaRusso/25AUD.  
        const newWindow = window.open("https://www.paypal.me/karlwolf2706/2EUR", '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
    }

    if (!isLoaded(history)) {
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

    return (
        <Box>
            <List>
                {
                    history && Object.values(history).map(x => <ListItem><ListItemText primary={x.name}/></ListItem>)
                }
            </List>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", pl: 2, pr: 2, pb: 2 }}>
                <Button onClick={payOnClick} variant="contained" fullWidth sx={{ borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}>
                    Bezahlen
                </Button>
            </Box>
        </Box>
    );
}
export default compose(
    firestoreConnect((props) => [
        {
            collection: `users/${props.auth.uid}/history`,
            where: ["state", "==", HISTORY_ITEM_NOT_PAID],
            storeAs: userHistory
        }
    ]),
    connect(({ firestore: { data } }, props) => ({
        history: data.userHistory
    }))
)(PayDrinksScreen)