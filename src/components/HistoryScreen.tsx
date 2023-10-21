import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { groupBy } from "../utils";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";
import { fetchHistoryAsync } from "../redux/drinksSlice";
import { useClient } from "react-supabase";
import { InfiniteScrollList } from "./InfiniteScrollList";
import CustomAppBar from "./AppBar";
import EditHistoryEntryDialog from "./EditHistoryEntryDialog";
import React from "react";
import { Drink, FullHistory } from "../types/supabaseTypes";
import { useAppDispatch } from "..";

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

const HistoryScreen = () => {
    const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector((state: any) => state.drinks);
    const { user } = useSelector((state: any) => state.application);
    const dispatch = useAppDispatch();
    const client = useClient();

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

    const handleEntryUpdate = async (newEntry: FullHistory) => {
        setEditHistoryEntryOpen(false);
        await client.from("history")
            .update({ count: newEntry.count, amount: (newEntry.count ?? 0) * (newEntry.drink.price ?? 1) })
            .eq("id", newEntry.id);
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
        <InfiniteScrollList fetch={(page: number) => dispatch(fetchHistoryAsync({ client, user, page, count: 20 }))} error={historyError} loading={historyLoading} endReached={historyEndReached}>
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

export default HistoryScreen