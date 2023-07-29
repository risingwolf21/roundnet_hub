import { Grid, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import BottomInformation from "./BottomInformation";
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { Loading } from "./Loading";
import { Error } from "./Error";
import { groupBy } from "../utils";

const HistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item,index) => <ListItem dense key={"sublist"+index}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink.name} />
                <ListItemSecondaryAction>
                    <Typography>{item.amount} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const HistoryScreen = () => {

    const { user } = useAuth();

    const [{ data: history, error, fetching }] = useRealtime(
        'history',
        {
            select: {
                columns: 'count, amount, created_at, drink ( name, price, stock )',
                filter: (query) => query.eq('user', user.id),
            }
        },
        (data, payload) => data.id === payload.id);

    if (fetching)
        return <Loading />
    if (error)
        return <Error message={error.message} />

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ overflow: "auto" }}>
        {

            history && <>
                <List sx={{ width: "100%" }} >
                    {
                        Object.entries(groupBy(history, x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                            .map((x) => <HistoryItem key={x[0]} items={x[1]} header={x[0]} />)
                    }
                </List>
                {
                    <BottomInformation title={"Zusammenfassung"} totalPrice={Object.values(history).reduce((prev, res) => prev + (res.drink.price * res.count), 0) + " €"} />
                }
            </>
        }
    </Grid>
}

export default HistoryScreen