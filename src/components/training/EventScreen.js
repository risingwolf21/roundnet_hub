import { Alert, Avatar, Box, CircularProgress, Fab, Grid, IconButton, LinearProgress, ListItem, ListItemAvatar, ListItemText, Paper, Snackbar, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { Loading } from "../Loading";
import { Error } from "../Error";
import { useNavigate } from 'react-router-dom';
import { useState } from "react";
import { selectEvent } from "../../redux/eventReducer";
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from "../../hooks/useAuth";

const EventItem = ({ event, onClick }) => {
    return <Paper sx={{ width: "100%", borderLeft: "4px solid red", mb: 1 }}>
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
                    primary={event.title}
                    secondary={moment(new Date(event.meetingDateTime)).format("dddd [at] HH:mm")} />
            </ListItem>
        </Box>
    </Paper>
}

const EventScreen = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { items: events, loading, error } = useSelector((state) => state.events);
    const { user } = useAuth();

    if (error)
        return <Error message={error} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <Grid container sx={{ overflowY: "scroll", background: "#eee" }} width="100%" direction="row" alignItems="center" justifyContent="center" paddingTop={2} paddingLeft={2} paddingRight={2}>
            {
                events && events.map((event, index) => <EventItem key={"Drink" + index} event={event} onClick={() => {
                    dispatch(selectEvent(event));
                    navigate("event")
                }} />)
            }
        </Grid>
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
