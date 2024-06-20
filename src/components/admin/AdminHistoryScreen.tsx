import {
    Grid,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    ListSubheader,
    Typography
} from "@mui/material";
import moment from "moment/moment";
import React, {useCallback, useEffect} from "react";
import {useSelector} from "react-redux";
import {useDependency} from "../../hooks/useDependency";
import {fetchAdminHistoryAsync} from "../../redux/adminDrinksSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {FullHistory} from "../../types/supabaseTypes";
import {groupBy} from "../../utils";
import {AlertSnackbar} from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import {InfiniteScrollList} from "../InfiniteScrollList";

const AdminHistoryItem = ({items, header}: { items: FullHistory[], header: string }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{zIndex: "-1"}} component="div"
                                                                                  id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={header + index + "sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={item.user?.displayName}/>
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{(item.drink?.price ?? 0 * (item.count ?? 0))} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const AdminHistoryScreen = () => {

    const {
        history,
        historyLoading,
        historyError,
        historyEndReached
    } = useSelector((state: RootState) => state.adminDrinks);
    const dispatch = useAppDispatch();

    const fetchForPage = useCallback((page: number) => {
        dispatch(fetchAdminHistoryAsync({page, count: 20}))
    }, [dispatch]);

    useEffect(() => {
        fetchForPage(0);
    }, [fetchForPage]);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack/>
        {
            historyLoading && <LinearProgress style={{position: "fixed", left: 0, top: 56, right: 0}}/>
        }
        <InfiniteScrollList fetch={fetchForPage} error={historyError} loading={historyLoading}
                            endReached={historyEndReached}>
            {
                Array.from(groupBy(history, (x: FullHistory) => moment(new Date(x.created_at ?? "")).format("DD MMMM yyyy")))
                    .map(([key, value]) => <AdminHistoryItem key={key} items={value} header={key}/>)
            }
        </InfiniteScrollList>
    </Grid>
}

export default AdminHistoryScreen;