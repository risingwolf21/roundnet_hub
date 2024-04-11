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
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useClient} from "react-supabase";
import {fetchHistoryAsync, onHistoryDelete, onHistoryInsert, onHistoryUpdate} from "../redux/drinksSlice";
import {RootState, useAppDispatch} from "../redux/store";
import {Drink, FullHistory, User} from "../types/supabaseTypes";
import {groupBy} from "../utils";
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar";
import CustomAppBar from "./AppBar";
import EditHistoryEntryDialog from "./EditHistoryEntryDialog";
import {InfiniteScrollList} from "./InfiniteScrollList";
import {captureException} from "@sentry/react";
import {SupabaseDrinkRepository} from "./services/supabase/DrinkRepository";

export type FullHistoryUpdate = FullHistory & {
    newCount: number
}

type HistoryItemProps = {
    header: string
    items: FullHistory[],
    onClick: (entry: FullHistory) => any
}

const HistoryItem = ({items, header, onClick}: HistoryItemProps) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{zIndex: "-1"}} component="div"
                                                                                  id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item: FullHistory, index: number) => <ListItem dense key={"sublist" + index}
                                                                      onClick={() => onClick(item)}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name}
                              secondary={moment(new Date((item.created_at ?? ""))).format("HH:mm")}/>
                <ListItemSecondaryAction>
                    <Typography>{(item.count ?? 0) * (item.drink?.price ?? 1)} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const HistoryScreenProvider = () => {
    const {
        history,
        drinks,
        historyLoading,
        historyError,
        historyEndReached
    } = useSelector((state: RootState) => state.drinks);
    const {user} = useSelector((state: RootState) => state.application);

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <HistoryScreen
        history={history}
        drinks={drinks}
        historyEndReached={historyEndReached}
        historyError={historyError ?? ""}
        historyLoading={historyLoading}
        user={user}/>
}

type HistoryScreenProps = {
    history: FullHistory[],
    drinks: Drink[],
    historyLoading: boolean,
    historyEndReached: boolean,
    historyError: string,
    user: User
}

const HistoryScreen = ({
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
    const client = useClient();
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    useEffect(() => {
        let subscription = client.channel("public:history")
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'history',
                filter: "user=eq." + user.userId
            }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'history',
                filter: "user=eq." + user.userId
            }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'history',
                filter: "user=eq." + user.userId
            }, payload => dispatch(onHistoryInsert(payload)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

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

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack={true}/>
        {
            historyLoading && <LinearProgress style={{position: "fixed", left: 0, top: 56, right: 0}}/>
        }
        <InfiniteScrollList fetch={fetchForPage} error={historyError ?? ""} loading={historyLoading}
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
    </Grid>
}

export default HistoryScreenProvider;