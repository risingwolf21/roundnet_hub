import { Box, CircularProgress, Grid, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Toolbar, Typography } from "@mui/material"
import moment from "moment/moment";
import { connect } from "react-redux"
import { isLoaded, withFirestore } from "react-redux-firebase"
import { compose } from "redux";
import BottomInformation from "./BottomInformation";
import { lifecycle, withHandlers } from "recompose";

const userHistory = 'userHistory';

const HistoryItem = ({ item }) => {
    return <Box sx={{ width: "100%" }}>
        <Paper key={item} sx={{ margin: 2, padding: 1 }}>
            <Box sx={{ width: "100%", listStyleType: "none" }}>
                <Typography typography="h6" fontWeight={"bold"}>{moment(new Date(item.date)).format("DD MMMM yyyy HH:mm")}</Typography>
                {
                    item.drinks.map((x, index) => <ListItem key={"sublist" + index}>
                        <ListItemAvatar>
                            <Typography>{x.count} x</Typography>
                        </ListItemAvatar>
                        <ListItemText primary={x.name} secondary={x.price + " €"} />
                        <ListItemSecondaryAction>
                            <Typography fontWeight={"bold"}>{(x.price * x.count)} €</Typography>
                        </ListItemSecondaryAction>
                    </ListItem>)
                }
            </Box>
        </Paper>
    </Box>
}

const HistoryScreen = ({ history }) => {
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
                        Object.values(history).sort((a, b) => b.date - a.date).map((x, index) => <HistoryItem key={index} item={x} />)
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

const listener = (uid) => {
    return {
        collection: `users/${uid}/history`,
        storeAs: userHistory
    };
}

const enhance = compose(
    withFirestore,
    withHandlers({
        loadPayments: (props) => ({ collection, storeAs }) => props.firestore.get({ collection, storeAs })
    }),
    lifecycle({
        componentDidMount() {
            this.props.loadPayments(listener(this.props.auth.uid));
            this.props.firestore.setListener(listener(this.props.auth.uid));
        }
    }),
    connect((state) => ({
        history: state.firestore.ordered.userHistory
    }))
);

export default enhance(HistoryScreen)