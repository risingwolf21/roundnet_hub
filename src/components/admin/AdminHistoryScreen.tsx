import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { groupBy } from "../../utils";
import { useSelector } from "react-redux";
import { InfiniteScrollList } from "../InfiniteScrollList";
import { fetchAdminHistoryAsync } from "../../redux/adminDrinksSlice";
import { useContext, useState } from "react";
import { useEffect } from "react";
import { useClient } from "react-supabase";
import CustomAppBar from "../AppBar";
import { DependencyContext, useAppDispatch } from "../..";
import React from "react";
import { FullHistory } from "../../types/supabaseTypes";
import { IAdminDrinksRepository } from "../../repository/IAdminDrinksRepository";

const AdminHistoryItem = ({ items, header }: { items: FullHistory[], header: string }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{ zIndex: "-1" }} component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={header + index + "sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={item.user?.displayName} />
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{(item.drink?.price ?? 0 * (item.count ?? 0))} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const AdminHistoryScreen = () => {

    const { container } = useContext(DependencyContext);

    const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector((state: any) => state.adminDrinks);
    const [historyItems, setHistoryItems] = useState([]);
    const dispatch = useAppDispatch();
    const client = useClient();

    useEffect(() => {
        fetchForPage(0);
    }, [client, dispatch, container]);

    useEffect(() => {
        let mappedEntries = history?.map((x: any) => {
            return {
                ...x,
                drink: drinks.find((y: any) => y.id === x.drinkId)
            }
        });
        setHistoryItems(mappedEntries);
    }, [history, drinks]);

    const fetchForPage = (page: number) => {
        if (container)
            dispatch(fetchAdminHistoryAsync({ repository: container.get<IAdminDrinksRepository>("IAdminDrinksRepository"), page, count: 20 }))
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        {
            historyLoading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <InfiniteScrollList fetch={fetchForPage} error={historyError} loading={historyLoading} endReached={historyEndReached}>
            {
                Array.from(groupBy(historyItems, (x: FullHistory) => moment(new Date(x.created_at ?? "")).format("DD MMMM yyyy")))
                    .map(([key, value]) => <AdminHistoryItem key={key} items={value} header={key} />)
            }
        </InfiniteScrollList>
    </Grid>
}

export default AdminHistoryScreen;