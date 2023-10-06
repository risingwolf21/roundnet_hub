import { Alert, Box, CircularProgress, Divider, Fab, Grid, IconButton, LinearProgress, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Snackbar, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { Error } from "../Error";
import { useNavigate } from 'react-router-dom';
import React from "react";
import { fetchEventsAsync } from "../../redux/eventReducer";
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from "../../hooks/useAuth";
import { ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { ATTENDING, DECLINED } from "../../constants";
import { useClient } from "react-supabase";
import { useState } from "react";
import { useEffect } from "react";
import { InfiniteScrollList } from "../InfiniteScrollList";
import CustomAppBar from "../AppBar";

const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating }) => {

    return <ListItem sx={{ p: 1 }} onClick={onClick}>
        <ListItemAvatar>
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "left" }}>
                <Typography fontSize={10} textAlign={"center"}>
                    {
                        moment(new Date(event.meetingDateTime)).format("MMM").toUpperCase()
                    }
                </Typography>
                <Typography variant="h6" fontWeight={"bold"} textAlign={"center"}>
                    {
                        moment(new Date(event.meetingDateTime)).format("D")
                    }
                </Typography>
            </Box>
        </ListItemAvatar>
        <ListItemText primary={event.title} secondary={event.isCancelled ? "Event abgesagt" : moment(new Date(event.meetingDateTime)).format("dddd [at] HH:mm")} />
        <ListItemSecondaryAction>
            {
                attendanceUpdating
                    ? <CircularProgress />
                    : <Box sx={{ display: "flex", flexDirection: "row" }}>
                        <IconButton onClick={declineEvent} disabled={event.isCancelled}>
                            {
                                event.userAttendance === DECLINED
                                    ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                    : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                            }
                        </IconButton>
                        <IconButton onClick={attendEvent} disabled={event.isCancelled}>
                            {
                                event.userAttendance === ATTENDING
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

    const { items: events, loading, error, endReached } = useSelector((state) => state.events);
    const { user } = useAuth();
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [eventUpdateError, setUpdateEventError] = useState("");
    const [eventsUpdatingAttendance, setEventsUpdatingAttendance] = useState({});

    useEffect(() => {
        dispatch(fetchEventsAsync({ client, user }));
    }, [dispatch, client, user]);

    if (error)
        return <Error message={error} />

    const updateAttendance = async (eventId, state) => {
        setEventsUpdatingAttendance({ ...eventsUpdatingAttendance, eventId: true });
        const { error } = await client.from("event_attendance_user_mapping").upsert({
            user: user.id,
            event: eventId,
            state: state
        });
        setUpdateEventError(error?.message ?? "");
        setEventsUpdatingAttendance({ ...eventsUpdatingAttendance, eventId: false });
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar />
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <InfiniteScrollList fetch={(page) => dispatch(fetchEventsAsync({ client, user, page }))} error={error} loading={loading} endReached={endReached}>
            {
                events && events.map((event, index) => <div key={"Drink" + index}>
                    <EventItem
                        event={event}
                        attendanceUpdating={eventsUpdatingAttendance[event.id]}
                        attendEvent={() => updateAttendance(event.id, ATTENDING)}
                        declineEvent={() => updateAttendance(event.id, DECLINED)}
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

        <Snackbar sx={{ position: "fixed", right: "16px", }} open={eventUpdateError !== ""} autoHideDuration={2500}>
            <Alert severity={"error"} sx={{ width: '100%' }}>
                {eventUpdateError}
            </Alert>
        </Snackbar>
    </Grid >);
}

export default EventScreen;
