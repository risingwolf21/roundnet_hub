import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { groupBy } from "../utils";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";
import { fetchHistoryAsync } from "../redux/drinksSlice";
import { useClient } from "react-supabase";
import { useAuth } from "../hooks/useAuth";
import { InfiniteScrollList } from "./InfiniteScrollList";

const HistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{ zIndex: "-1" }} component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={"sublist" + index}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={moment(new Date(item.created_at)).format("HH:mm")} />
                <ListItemSecondaryAction>
                    <Typography>{item.count * item.drink?.price} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const HistoryScreen = () => {
    const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector((state) => state.drinks);
    const dispatch = useDispatch();
    const client = useClient();
    const { user } = useAuth();

    const [historyItems, setHistoryItems] = useState([]);

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
        <InfiniteScrollList fetch={(page) => dispatch(fetchHistoryAsync({ client, user, page }))} error={historyError} loading={historyLoading} endReached={historyEndReached}>
            {
                Object.entries(groupBy(historyItems.filter(x => x.drink), x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                    .map((x) => <HistoryItem key={x[0]} items={x[1]} header={x[0]} />)
            }
        </InfiniteScrollList>
    </Grid>
}

export default HistoryScreen