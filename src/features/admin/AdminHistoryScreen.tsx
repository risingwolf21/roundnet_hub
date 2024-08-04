import {Grid, LinearProgress} from "@mui/material";
import moment from "moment/moment";
import React, {useCallback, useEffect} from "react";
import {useSelector} from "react-redux";
import {fetchAdminHistoryAsync} from "./slices/adminDrinksSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {FullHistory} from "../../types/supabaseTypes";
import {groupBy} from "../../utils";
import CustomAppBar from "../../components/AppBar";
import {InfiniteScrollList} from "../../components/InfiniteScrollList";
import {AdminHistoryItem} from "./components/AdminHistoryItem";


const AdminHistoryScreen = () => {

    const {
        history,
        historyLoading,
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
        <InfiniteScrollList fetch={fetchForPage}
                            loading={historyLoading}
                            endReached={historyEndReached}>
            {
                Array.from(groupBy(history, (x: FullHistory) => moment(new Date(x.created_at ?? "")).format("DD MMMM yyyy")))
                    .map(([key, value]) => <AdminHistoryItem key={key} items={value} header={key}/>)
            }
        </InfiniteScrollList>
    </Grid>
}

export default AdminHistoryScreen;