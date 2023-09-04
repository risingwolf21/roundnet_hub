import { AppBar, Box, Button, Container, Dialog, Divider, IconButton, ListItem, ListItemAvatar, ListItemText, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils";
import { ArrowBack, CalendarMonth, CheckCircleOutline, Close, HelpOutline, RemoveCircleOutline } from "@mui/icons-material";
import { useSelector } from "react-redux";
import moment from "moment";
import { useState } from "react";
import { ATTENDING, DECLINED, UNANSWERED } from "../../constants";
import EventAttendanceDialog from "./EventAttendanceDialog";

const EventInformation = ({ open, handleClose, attendEvent, declineEvent }) => {

    const { selectedEvent } = useSelector((state) => state.events);
    const [eventAttendanceOpen, setEventAttendanceOpen] = useState(false);

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <ArrowBack />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Box pl={2} pt={2}>
                <Typography variant="h5" fontWeight={"bold"}>{selectedEvent?.title}</Typography>
                <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0 } }}>
                    <ListItemAvatar>
                        <CalendarMonth />
                    </ListItemAvatar>
                    <ListItemText primary={moment(new Date(selectedEvent?.startingDateTime)).format("DD.MM.yyyy [um] HH:mm")} secondary={"Startzeit"} />
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { pl: 0 } }}>
                    <ListItemAvatar />
                    <ListItemText primary={moment(new Date(selectedEvent?.meetingDateTime)).format("DD.MM.yyyy [um] HH:mm")} secondary={"Treffpunkt"} />
                </ListItem>

                <Typography variant="h6" fontWeight="bold">Beschreibung</Typography>
                <Typography pb={2}>{selectedEvent?.description}</Typography>
                {/* <Divider />
                <Box pt={2} pb={2} pr={2} sx={{ flex: 2, flexDirection: "row", display: "flex" }}>
                    <Button variant={attendanceState === ATTENDING ? "contained" : "outlined"} color="success" sx={{ flex: 1 }} onClick={attendEvent} startIcon={<CheckCircleOutline />}>Teilnehmen</Button>
                    <Container sx={{ padding: 0, width: "16px", height: 1 }} />
                    <Button variant={attendanceState === DECLINED ? "contained" : "outlined"} color="error" sx={{ flex: 1 }} onClick={declineEvent} startIcon={<Close />}>Absagen</Button>
                </Box> */}
                <Divider />
                <Typography pt={2} variant="h6" fontWeight="bold">Teilnehmer</Typography>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => setEventAttendanceOpen(true)}>
                    <ListItemAvatar>
                        <CheckCircleOutline color="success" />
                    </ListItemAvatar>
                    <ListItemText>{selectedEvent?.attendance?.filter(x => x.state === ATTENDING).length ?? 0} zusagen</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => setEventAttendanceOpen(true)}>
                    <ListItemAvatar>
                        <HelpOutline color="warning" />
                    </ListItemAvatar>
                    <ListItemText>0 unbeantwortet</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => setEventAttendanceOpen(true)}>
                    <ListItemAvatar>
                        <RemoveCircleOutline color="error" />
                    </ListItemAvatar>
                    <ListItemText>{selectedEvent?.attendance?.filter(x => x.state === DECLINED).length ?? 0} absagen</ListItemText>
                </ListItem>
                <Divider />
            </Box>
            <EventAttendanceDialog open={eventAttendanceOpen} handleClose={() => setEventAttendanceOpen(false)} event={selectedEvent} />
        </Box>
    </Dialog>
}

export default EventInformation;