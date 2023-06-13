import { Box, CircularProgress, Grid, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Toolbar, Typography } from "@mui/material"
import moment from "moment/moment";
import { connect } from "react-redux"
import { firestoreConnect, isLoaded } from "react-redux-firebase"
import { compose } from "redux";
import BottomInformation from "./BottomInformation";

const userHistory = 'userHistory';

const HistoryItem = ({ item }) => {
    return <Box sx={{ width: "100%" }}>
        <Paper key={item} sx={{ margin: 2, padding: 1 }}>
            <Box sx={{ width: "100%" }}>
                <Typography typography="h6" fontWeight={"bold"}>{moment(new Date(item.date)).format("DD MMMM yyyy HH:mm")}</Typography>
                {
                    item.drinks.map(x => <ListItem>
                        <ListItemAvatar>
                            <Typography>{x.count} x</Typography>
                        </ListItemAvatar>
                        <ListItemSecondaryAction>
                            <Typography fontWeight={"bold"}>{(x.price * x.count)} €</Typography>
                        </ListItemSecondaryAction>
                        <ListItemText primary={x.name} secondary={x.price + " €"} />
                    </ListItem>)
                }
            </Box>
        </Paper>
    </Box>
}

const HistoryList = ({ authId, history }) => {
    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ overflow: "auto" }}>
        {

            isLoaded(history) ? history ? <>
                <Grid width="100%">
                    {
                        Object.values(history).sort((a, b) => b.date - a.date).map(x => <HistoryItem item={x} />)
                    }
                    <Toolbar />
                </Grid>
                {
                    <BottomInformation title={"Zusammenfassung"} totalPrice={Object.values(history).flatMap(x => x.drinks).reduce((prev, res) => prev + (res.price * res.count), 0) + "€"} />
                }
            </>
                : <h1>No data found</h1>
                : <CircularProgress />
        }
    </Grid>
}

export default compose(
    firestoreConnect((props) => [
        {
            collection: `users/${props.authId}/history`,
            storeAs: userHistory
        }
    ]),
    connect(({ firestore: { data } }, props) => ({
        history: data.userHistory
    }))
)(HistoryList)