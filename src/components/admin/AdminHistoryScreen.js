import { Grid, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { useRealtime } from "../../hooks/useRealtime";
import { Loading } from "../Loading";
import { Error } from "../Error";
import { groupBy } from "../../utils";

const AdminHistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item,index) => <ListItem dense key={header + index + "sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink.name} secondary={item.user.displayName} />
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{(item.drink.price * item.count)} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const AdminHistoryScreen = () => {

    const [{ data: history, error, fetching }] = useRealtime(
        'history',
        {
            select: {
                columns: 'count, created_at, drink ( name, price, stock ), user ( displayName )'
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
                <List sx={{ width: "100%" }} >
                    {
                        Object.entries(groupBy(history, x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                            .map((x) => <AdminHistoryItem key={x[0]} items={x[1]} header={x[0]} />)
                    }
                </List>
            </>
        }
    </Grid>
}

export default AdminHistoryScreen;