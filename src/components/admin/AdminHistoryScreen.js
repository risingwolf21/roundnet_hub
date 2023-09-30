import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { groupBy } from "../../utils";
import { useDispatch, useSelector } from "react-redux";
import { InfiniteScrollList } from "../InfiniteScrollList";
import { fetchAdminHistoryAsync } from "../../redux/adminDrinksSlice";
import { useState } from "react";
import { useEffect } from "react";
import { useClient } from "react-supabase";

const AdminHistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={header + index + "sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={item.user?.displayName} />
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{(item.drink?.price ?? 0 * item.count)} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const AdminHistoryScreen = () => {

    const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector((state) => state.adminDrinks);
    const [historyItems, setHistoryItems] = useState([]);
    const dispatch = useDispatch();
    const client = useClient();

    useEffect(() => {
        dispatch(fetchAdminHistoryAsync({ client }))
    }, []);

    useEffect(() => {
        let mappedEntries = history?.map(x => {
            return {
                ...x,
                drink: drinks.find(y => y.id === x.drinkId)
            }
        });
        setHistoryItems(mappedEntries);
    }, [history, drinks]);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ overflow: "auto" }}>
        {
            historyLoading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <InfiniteScrollList fetch={(page) => dispatch(fetchAdminHistoryAsync({ client, page }))} error={historyError} loading={historyLoading} endReached={historyEndReached}>
            {
                Object.entries(groupBy(historyItems, x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                    .map((x) => <AdminHistoryItem key={x[0]} items={x[1]} header={x[0]} />)
            }
        </InfiniteScrollList>
    </Grid>
}

export default AdminHistoryScreen;