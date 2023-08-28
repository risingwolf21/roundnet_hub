import { Alert, Avatar, Box, CircularProgress, Fab, Grid, IconButton, ListItem, ListItemAvatar, ListItemText, Paper, Snackbar, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { Loading } from "../Loading";
import { Error } from "../Error";
import EventInformation from "./EventInformation";
import React, { useState } from "react";
import { selectEvent } from "../../redux/eventReducer";

const EventItem = ({ event, onClick }) => {
    return <Paper sx={{ width: "100%", borderLeft: "4px solid red", marginBottom: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <ListItem sx={{ paddingLeft: 1 }} onClick={onClick}>
                <ListItemAvatar>
                    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography fontSize={12} textAlign={"center"}>
                            {
                                moment(new Date(event.meetingDateTime)).format("MMM").toUpperCase()
                            }
                        </Typography>
                        <Typography variant="h5" fontWeight={"bold"} textAlign={"center"}>
                            {
                                moment(new Date(event.meetingDateTime)).format("D")
                            }
                        </Typography>
                    </Box>
                </ListItemAvatar>
                <ListItemText
                    sx={{ paddingLeft: 2 }}
                    primary={<React.Fragment>
                        <Typography fontWeight={"bold"}>{event.title}</Typography>
                    </React.Fragment>}
                    secondary={<React.Fragment>
                        <Typography fontSize={14}>
                            {moment(new Date(event.meetingDateTime)).format("dddd [at] HH:mm")}
                        </Typography>
                        <Typography fontSize={14}>
                            Roundnet Karlsruhe
                        </Typography>
                    </React.Fragment>} />
            </ListItem>
        </Box>
    </Paper>
}

const EventScreen = () => {

    const dispatch = useDispatch();
    const [eventInfoOpen, setEventInfoOpen] = useState(false);

    const { items: events, loading, error } = useSelector((state) => state.events);

    if (loading)
        return <Loading />
    if (error)
        return <Error message={error} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <Grid container sx={{ overflowY: "scroll", background: "#eee" }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingTop={2} paddingLeft={2} paddingRight={2}>
            {
                events && events.map((event, index) => <EventItem key={"Drink" + index} event={event} onClick={() => {
                    dispatch(selectEvent(event));
                    setEventInfoOpen(true);
                }} />)
            }
            <Box height={"128px"} width={"100%"} />
        </Grid>
        <EventInformation open={eventInfoOpen} handleClose={() => setEventInfoOpen(false)} />
    </Grid >);
}

export default EventScreen;
