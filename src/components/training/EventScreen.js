import { Box, Fab, Grid, LinearProgress, ListItem, ListItemAvatar, ListItemText, Paper, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { Error } from "../Error";
import { useNavigate } from 'react-router-dom';
import React from "react";
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
        <Grid container sx={{ overflowY: "scroll", background: "#eee", pl: 2, pr: 2, pt: 2, justifyContent: "center", alignItems: "center" }} width="100%" direction="row">
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
