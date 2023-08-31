import { Alert, CircularProgress, Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Snackbar, Typography } from "@mui/material"
import moment from "moment/moment";
import { Loading } from "./Loading";
import { Error } from "./Error";
import { groupBy } from "../utils";
import { useDispatch, useSelector } from "react-redux";
import { Component, useRef, useState } from "react";
import { useEffect } from "react";
import { fetchHistoryAsync } from "../redux/historyReducer";
import { useClient } from "react-supabase";
import { useAuth } from "../hooks/useAuth";
import { debounce, isUndefined } from "lodash";

const HistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader component="div" id="nested-list-subheader">{header}</ListSubheader>}>
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

export const InfiniteScrollList = ({ children, fetch, error, loading, endReached }) => {

    const [snackbarOpen, setSnackbarOpen] = useState(isUndefined(error));
    const observerTarget = useRef(null);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    useEffect(() => {
        let pagesCounter = 1
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !endReached && !loading) {
                    fetch(pagesCounter)
                    pagesCounter++
                }
            },
            { threshold: 1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget]);

    return <div style={{ width: "100%" }}>
        <List sx={{ overflowY: "auto" }}>
            {children}
            <div ref={observerTarget}></div>
        </List>
        {
            <Snackbar sx={{ position: "absolute", right: "16px", bottom: "16px" }} open={snackbarOpen} onClose={handleClose}>
                <Alert onClose={handleClose} severity={"error"} sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        }
    </div>
}

const HistoryScreen = () => {
    const { items: history, loading, error, endReached } = useSelector((state) => state.history);
    const { items: drinks } = useSelector((state) => state.drinks);
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
            loading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <InfiniteScrollList fetch={(page) => dispatch(fetchHistoryAsync({ client, user, page }))} error={error} loading={loading} endReached={endReached}>
            {
                Object.entries(groupBy(historyItems.filter(x => x.drink), x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                    .map((x) => <HistoryItem key={x[0]} items={x[1]} header={x[0]} />)
            }
        </InfiniteScrollList>
    </Grid>
}

export default HistoryScreen