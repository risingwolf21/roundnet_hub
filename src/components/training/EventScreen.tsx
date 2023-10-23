import { Alert, Box, CircularProgress, Divider, Fab, Grid, IconButton, LinearProgress, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from 'react-router-dom';
import React from "react";
import { fetchEventsAsync, onEventErrorRead, updateAttendanceAsync } from "../../redux/eventSlice";
import AddIcon from '@mui/icons-material/Add';
import { ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { useClient } from "react-supabase";
import { useState } from "react";
import { useEffect } from "react";
import { InfiniteScrollList } from "../InfiniteScrollList";
import CustomAppBar from "../AppBar";
import { EventAttendance, FullEvent } from "../../types/supabaseTypes";
import { RootState } from "../../redux/store";
import { useAppDispatch } from "../..";

type EventItemProps = {
    attendanceUpdating: boolean,
    event: FullEvent,
    onClick: () => void,
    attendEvent: () => void,
    declineEvent: () => void
}

const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating }: EventItemProps) => {

    return <ListItem sx={{ p: 1 }} onClick={onClick}>
        <ListItemAvatar>
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "left" }}>
                <Typography fontSize={10} textAlign={"center"}>
                    {
                        moment(event.meetingDateTime).format("MMM").toUpperCase()
                    }
                </Typography>
                <Typography variant="h6" fontWeight={"bold"} textAlign={"center"}>
                    {
                        moment(event.meetingDateTime).format("D")
                    }
                </Typography>
            </Box>
        </ListItemAvatar>
        <ListItemText primary={event.title} secondary={event.isCancelled ? "Event abgesagt" : moment(event.meetingDateTime).format("dddd [at] HH:mm")} />
        <ListItemSecondaryAction>
            {
                attendanceUpdating
                    ? <CircularProgress />
                    : <Box sx={{ display: "flex", flexDirection: "row" }}>
                        <IconButton onClick={declineEvent} disabled={event.isCancelled}>
                            {
                                event.userAttendance === "Declined"
                                    ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                    : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                            }
                        </IconButton>
                        <IconButton onClick={attendEvent} disabled={event.isCancelled}>
                            {
                                event.userAttendance === "Attending"
                                    ? <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                                    : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                            }
                        </IconButton>
                    </Box>
            }
        </ListItemSecondaryAction>
    </ListItem>
}

const EventScreen = () => {

    const { items: events, userGroups, loading, error, endReached } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.application);
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [eventsUpdatingAttendance, setEventsUpdatingAttendance] = useState<number[]>([]);

    useEffect(() => {
        console.log("fetching events")
        dispatch(fetchEventsAsync({ client, user, userGroups, page: 0, count: 20 }));
    }, [dispatch, client, user, userGroups]);

    const updateAttendance = async (eventId: number, state: EventAttendance, oldState: EventAttendance) => {
        setEventsUpdatingAttendance([...eventsUpdatingAttendance, eventId]);

        dispatch(updateAttendanceAsync({ client, user, eventId, state, oldState }));

        setEventsUpdatingAttendance([...eventsUpdatingAttendance.filter(x => x === eventId)]);
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar onRefresh={() => dispatch(fetchEventsAsync({ client, user, userGroups, page: 0, count: 20 }))} />
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <InfiniteScrollList fetch={(page) => dispatch(fetchEventsAsync({ client, user, userGroups, page, count: 20 }))} error={error ?? ""} loading={loading} endReached={endReached}>
            {
                events && events.map((event, index) => <div key={"Drink" + index}>
                    <EventItem
                        event={event}
                        attendanceUpdating={eventsUpdatingAttendance.some(x => x === event.id)}
                        attendEvent={() => updateAttendance(event.id, "Attending", event.userAttendance)}
                        declineEvent={() => updateAttendance(event.id, "Declined", event.userAttendance)}
                        onClick={() => {
                            navigate("/training/event/" + event.id);
                        }} />
                    <Divider />
                </div>)
            }
        </InfiniteScrollList>
        {
            user?.role === "admin" && <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
                onClick={() => navigate("create")}>
                {
                    <AddIcon sx={{ color: "white" }} />
                }
            </Fab>
        }

        {
            error && <Snackbar sx={{ position: "fixed", right: "16px", }} open={true} >
                <Alert severity={"error"} sx={{ width: '100%' }} onClose={() => dispatch(onEventErrorRead(null))}>
                    {error}
                </Alert>
            </Snackbar>
        }
    </Grid >);
}

export default EventScreen;
