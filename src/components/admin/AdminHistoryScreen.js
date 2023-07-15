import { Box, Grid, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Toolbar, Typography } from "@mui/material"
import moment from "moment/moment";
import { useRealtime } from "../../hooks/useRealtime";
import { Loading } from "../Loading";
import { Error } from "../Error";
import _ from "lodash";

const AdminHistoryItem = ({ items, header }) => {
    return <Box sx={{ margin: 2, listStyleType: "none" }}>
        <Typography typography="h6" fontWeight={"bold"}>{header}</Typography>
        {
            items.map(item => <ListItem dense key={"sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink.name} secondary={item.user.displayName} />
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{(item.drink.price * item.count)} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </Box>
}

const groupBy = (items, getter) => items.reduce(
    (result, item) => ({
        ...result,
        [getter(item)]: [
            ...(result[getter(item)] || []),
            item,
        ],
    }),
    {},
);

const AdminHistoryScreen = () => {

    const [{ data: history, error, fetching }] = useRealtime(
        'history',
        {
            select: {
                columns: 'count, state, created_at, drink ( name, price, stock ), user ( displayName )'
            }
        },
        (data, payload) => data.id === payload.id);

    if (fetching)
        return <Loading />
    if (error)
        return <Error message={error} />

    if (history)
        console.log(Object.entries(groupBy(history, x => moment(new Date(x.created_at)).format("DD MMMM yyyy"))))

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
                        Object.entries(groupBy(history, x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                            .map((x) => <AdminHistoryItem key={x[0]} items={x[1]} header={x[0]} />)
                    }
                    <Toolbar />
                </Grid>
            </>
        }
    </Grid>
}

export default AdminHistoryScreen;