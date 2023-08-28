import { AppBar, Box, Button, Container, Dialog, Divider, IconButton, ListItem, ListItemAvatar, ListItemText, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils";
import { ArrowBack, CalendarMonth, Check, CheckCircle, CheckCircleOutline, Close, DoNotDisturb, HelpOutline, Pending, RemoveCircleOutline } from "@mui/icons-material";
import { useSelector } from "react-redux";
import moment from "moment";
import { useEffect } from "react";
import { useState } from "react";
import { ATTENDING, DECLINED, UNANSWERED } from "../../constants";
import { useNavigate } from "react-router-dom";
import { useClient } from "react-supabase";
import { useAuth } from "../../hooks/useAuth";

const EventInformation = ({ open, handleClose }) => {

    const { selectedEvent } = useSelector((state) => state.events);
    const client = useClient();
    const { user } = useAuth();

    const [attendanceState, setAttendanceState] = useState(UNANSWERED);

    const attendEvent = () => {
        client.from("event_attendance_user_mapping").upsert({
            user: user.id,
            event: selectedEvent.id,
            state: ATTENDING
        }).then(value => setAttendanceState(ATTENDING))
    }

    const declineEvent = () => {
        client.from("event_attendance_user_mapping").upsert({
            user: user.id,
            event: selectedEvent.id,
            state: DECLINED
        }).then(value => setAttendanceState(DECLINED))
    }

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
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <CalendarMonth />
                    </ListItemAvatar>
                    <ListItemText>{moment(new Date(selectedEvent?.meetingDateTime)).format("DD-MM-yyyy [at] HH:mm")}</ListItemText>
                </ListItem>
                <Typography variant="h6" fontWeight="bold">Beschreibung</Typography>
                <Typography pb={2}>{selectedEvent?.description}</Typography>
                <Divider />
                <Box pt={2} pb={2} pr={2} sx={{ flex: 2, flexDirection: "row", display: "flex" }}>
                    <Button variant={attendanceState === ATTENDING ? "contained" : "outlined"} color="success" sx={{ flex: 1 }} onClick={attendEvent} startIcon={<CheckCircleOutline />}>Teilnehmen</Button>
                    <Container sx={{ padding: 0, width: "16px", height: 1 }} />
                    <Button variant={attendanceState === DECLINED ? "contained" : "outlined"} color="error" sx={{ flex: 1 }} onClick={declineEvent} startIcon={<Close />}>Absagen</Button>
                </Box>
                <Divider />
                <Typography pt={2} variant="h6" fontWeight="bold">Teilnehmer</Typography>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <CheckCircleOutline color="success" />
                    </ListItemAvatar>
                    <ListItemText>{selectedEvent.attendance.filter(x => x.state === ATTENDING).length} zusagen</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <HelpOutline color="warning" />
                    </ListItemAvatar>
                    <ListItemText>0 unbeantwortet</ListItemText>
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <ListItemAvatar>
                        <RemoveCircleOutline color="error" />
                    </ListItemAvatar>
                    <ListItemText>{selectedEvent.attendance.filter(x => x.state === DECLINED).length} absagen</ListItemText>
                </ListItem>
                <Divider />
            </Box>
        </Box>
    </Dialog>
}

export default EventInformation;