import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { groupBy } from "../utils";
import { useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";
import { fetchHistoryAsync } from "../redux/drinksSlice";
import { InfiniteScrollList } from "./InfiniteScrollList";
import CustomAppBar from "./AppBar";
import EditHistoryEntryDialog from "./EditHistoryEntryDialog";
import React from "react";
import { Drink, FullHistory, User } from "../types/supabaseTypes";
import { useAppDispatch } from "..";
import { useDependency } from "../hooks/useDependency";
import { IDrinkRepository } from "../repository/IDrinkRepository";
import { RootState } from "../redux/store";
import { AlertSnackbar } from "./AlertSnackbar";

export type FullHistoryUpdate = FullHistory & {
    newCount: number
}

type HistoryItemProps = {
    header: string
    items: FullHistory[],
    onClick: (entry: FullHistory) => any
}

const HistoryItem = ({ items, header, onClick }: HistoryItemProps) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{ zIndex: "-1" }} component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item: FullHistory, index: number) => <ListItem dense key={"sublist" + index} onClick={() => onClick(item)}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={moment(new Date((item.created_at ?? ""))).format("HH:mm")} />
                <ListItemSecondaryAction>
                    <Typography>{(item.count ?? 0) * (item.drink?.price ?? 1)} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

export const HistoryScreenProvider = () => {
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector((state: RootState) => state.drinks);
    const { user } = useSelector((state: RootState) => state.application);

    if (!drinksRepository || !user)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <HistoryScreen
        history={history}
        drinks={drinks}
        historyEndReached={historyEndReached}
        historyError={historyError ?? ""}
        historyLoading={historyLoading}
        user={user}
        drinksRepository={drinksRepository} />
}

type HistoryScreenProps = {
    history: FullHistory[],
    drinks: Drink[],
    historyLoading: boolean,
    historyEndReached: boolean,
    historyError: string,
    user: User,
    drinksRepository: IDrinkRepository
}

const HistoryScreen = ({ drinksRepository, history, drinks, historyLoading, historyError, historyEndReached, user }: HistoryScreenProps) => {
    const dispatch = useAppDispatch();

    const [historyItems, setHistoryItems] = useState<FullHistory[]>([]);
    const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
    const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);

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
    }, [drinksRepository]);

    const fetchForPage = (page: number) => {
        dispatch(fetchHistoryAsync({ repository: drinksRepository, userId: user.userId, page, count: 20 }))
    }

    const handleEntryUpdate = async (newEntry: FullHistory) => {
        await drinksRepository.updateHistoryItem(newEntry.id, newEntry.count ?? 0, (newEntry.count ?? 0) * (newEntry.drink.price ?? 1))
        setEditHistoryEntryOpen(false);
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
        <CustomAppBar navigateBack={true} />
        {
            historyLoading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <InfiniteScrollList fetch={fetchForPage} error={historyError ?? ""} loading={historyLoading} endReached={historyEndReached}>
            {
                Array.from(groupBy(historyItems.filter(x => x.drink), (x: FullHistory) =>
                    moment(new Date(x.created_at ?? "")).format("DD MMMM yyyy")))
                    .map(([key, value]) => <HistoryItem
                        key={key}
                        items={value}
                        header={key}
                        onClick={handleEntryOnClick} />)
            }
        </InfiniteScrollList>
        <EditHistoryEntryDialog
            open={editHistoryEntryOpen}
            handleClose={() => setEditHistoryEntryOpen(false)}
            entry={historyEntryToEdit}
            handleSubmit={(newEntry) => handleEntryUpdate(newEntry)} />
    </Grid>
}