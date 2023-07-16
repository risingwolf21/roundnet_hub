import { Box, Grid, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Toolbar, Typography } from "@mui/material"
import moment from "moment/moment";
import BottomInformation from "./BottomInformation";
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { Loading } from "./Loading";
import { Error } from "./Error";

const HistoryItem = ({ item }) => {
    return <Box sx={{ width: "100%" }}>
        <Paper key={item} sx={{ margin: 2, padding: 1 }}>
            <Box sx={{ width: "100%", listStyleType: "none" }}>
                <Typography typography="h6" fontWeight={"bold"}>{moment(new Date(item.created_at)).format("DD MMMM yyyy HH:mm")}</Typography>
                <ListItem key={"sublist"}>
                        <ListItemAvatar>
                            <Typography>{item.count} x</Typography>
                        </ListItemAvatar>
                        <ListItemText primary={item.drink.name} secondary={item.drink.price + " €"} />
                        <ListItemSecondaryAction>
                            <Typography fontWeight={"bold"}>{(item.drink.price * item.count)} €</Typography>
                        </ListItemSecondaryAction>
                    </ListItem>
            </Box>
        </Paper>
    </Box>
}

const HistoryScreen = () => {

    const { user } = useAuth();

    const [{ data: history, error, fetching }] = useRealtime(
        'history',
        {
            select: {
                columns: 'count, state, created_at, drink ( name, price, stock )',
                filter: (query) => query.eq('user_id', user.id),
            }
        },
        (data, payload) => data.id === payload.id);

    if (fetching)
        return <Loading />
    if (error)
        return <Error message={error} />

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ overflow: "auto" }}>
        {

            history && <>
                <Grid width="100%">
                    {
                        Object.values(history).sort((a, b) => b.date - a.date).map((x, index) => <HistoryItem key={index} item={x} />)
                    }
                    <Toolbar />
                </Grid>
                {
                    <BottomInformation title={"Zusammenfassung"} totalPrice={Object.values(history).reduce((prev, res) => prev + (res.drink.price * res.count), 0) + " €"} />
                }
            </>
        }
    </Grid>
}

export default HistoryScreen