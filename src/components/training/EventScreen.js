import { Box, Divider, Fab, Grid, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { Error } from "../Error";
import { useNavigate } from 'react-router-dom';
import React from "react";
import { selectEvent } from "../../redux/eventReducer";
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from "../../hooks/useAuth";
import { ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { ATTENDING, DECLINED } from "../../constants";
import { useClient } from "react-supabase";

const EventItem = ({ event, onClick, attendEvent, declineEvent }) => {

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
        <ListItemText primary={event.title} secondary={moment(new Date(event.meetingDateTime)).format("dddd [at] HH:mm")} />
        <ListItemSecondaryAction>
            <Box sx={{ display: "flex", flexDirection: "row" }}>
                <IconButton onClick={attendEvent}>
                    {
                        event.userAttendance === DECLINED
                            ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                            : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                    }
                </IconButton>
                <IconButton onClick={declineEvent}>
                    {
                        event.userAttendance === ATTENDING
                            ? <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                            : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                    }
                </IconButton>
            </Box>
        </ListItemSecondaryAction>
    </ListItem>
}

const EventScreen = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { items: events, loading, error } = useSelector((state) => state.events);
    const { user } = useAuth();
    const client = useClient();

    if (error)
        return <Error message={error} />

    const attendEvent = (eventId) => {
        client.from("event_attendance_user_mapping").upsert({
            user: user.id,
            event: eventId,
            state: ATTENDING
        });
    }

    const declineEvent = (eventId) => {
        client.from("event_attendance_user_mapping").upsert({
            user: user.id,
            event: eventId,
            state: DECLINED
        });
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <List sx={{ width: "100%" }}>
            {
                events && events.map((event, index) => <div key={"Drink" + index}>
                    <EventItem
                        event={event}
                        attendEvent={() => attendEvent(event.id)}
                        declineEvent={() => declineEvent(event.id)}
                        onClick={() => {
                            dispatch(selectEvent({ event, userId: user.id }));
                            navigate("event")
                        }} />
                    <Divider />
                </div>)
            }
        </List>
        {
            user?.role === "admin" && <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
                onClick={() => navigate("create")}>
                {
                    <AddIcon sx={{ color: "white" }} />
                }
            </Fab>
        }
    </Grid >);
}

export default EventScreen;
