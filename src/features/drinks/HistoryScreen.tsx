import {LinearProgress} from "@mui/material";
import moment from "moment/moment";
import React, {useEffect, useState} from "react";
import {fetchHistoryAsync} from "./slices/drinksSlice";
import {useAppDispatch} from "../../redux/store";
import {FullHistory} from "../../types/supabaseTypes";
import {groupBy} from "../../utils";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import EditHistoryEntryDialog from "./dialog/EditHistoryEntryDialog";
import {InfiniteScrollList} from "../../components/InfiniteScrollList";
import {captureException} from "@sentry/react";
import {SupabaseDrinkRepository} from "../../repository/DrinkRepository";
import {HistoryScreenProps} from "./types";
import {HistoryItem} from "./components/HistoryItem";
import Layout from "../../components/Layout";

export const HistoryScreen = ({
                                  history,
                                  drinks,
                                  historyLoading,
                                  historyError,
                                  historyEndReached,
                                  user
                              }: HistoryScreenProps) => {
    const dispatch = useAppDispatch();

    const [historyItems, setHistoryItems] = useState<FullHistory[]>([]);
    const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
    const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    useEffect(() => {
        setAlertInfo(historyError ? {message: historyError, severity: "error"} : null);
    }, [historyError]);

    useEffect(() => {
        let mappedEntries = history?.map((x: any) => {
            return {
                ...x,
                drink: drinks.find((y: any) => y.id === x.drinkId)
            }
        });
        setHistoryItems(mappedEntries);
    }, [history, drinks]);

    useEffect(() => {
        fetchForPage(0);
    }, []);

    const fetchForPage = (page: number) => {
        dispatch(fetchHistoryAsync({userId: user.userId, page, count: 20}))
    }

    const handleEntryUpdate = (newEntry: FullHistory) => {
        SupabaseDrinkRepository.updateHistoryItem(newEntry.id, newEntry.count ?? 0, (newEntry.count ?? 0) * (newEntry.drink.price ?? 1)).then(result => {
            setEditHistoryEntryOpen(false);
        }).catch(error => {
            captureException(error);
            setAlertInfo({message: error, severity: 'error'})
        });
    }

    const handleEntryOnClick = (entry: FullHistory) => {
        setHistoryEntryToEdit(entry);
        setEditHistoryEntryOpen(true);
    }

    return <Layout>
        {
            historyLoading && <LinearProgress style={{position: "fixed", left: 0, top: 56, right: 0}}/>
        }
        <InfiniteScrollList fetch={fetchForPage}
                            loading={historyLoading}
                            endReached={historyEndReached}>
            {
                Array.from(groupBy(historyItems.filter(x => x.drink), (x: FullHistory) =>
                    moment(new Date(x.created_at ?? "")).format("DD MMMM yyyy")))
                    .map(([key, value]) => <HistoryItem
                        key={key}
                        items={value}
                        header={key}
                        onClick={handleEntryOnClick}/>)
            }
        </InfiniteScrollList>
        <EditHistoryEntryDialog
            open={editHistoryEntryOpen}
            setOpen={() => setEditHistoryEntryOpen(true)}
            handleClose={() => setEditHistoryEntryOpen(false)}
            entry={historyEntryToEdit}
            handleSubmit={(newEntry) => handleEntryUpdate(newEntry)}/>
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Layout>
}