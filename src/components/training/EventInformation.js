import { AppBar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Fab, IconButton, InputAdornment, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, TextField, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils";
import { ArrowBack, CalendarMonth, CheckCircleOutline, Comment, DoNotDisturb, DoNotDisturbOff, Edit, Info, Map, RemoveCircleOutline, Send, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { connect, useSelector } from "react-redux";
import moment from "moment";
import { useState } from "react";
import { ATTENDING, DECLINED } from "../../constants";
import EventAttendanceDialog from "./EventAttendanceDialog";
import { useEffect, useMemo } from "react";
import { editEvent, fetchEventAttendanceAsync } from "../../redux/eventReducer";
import { useClient } from "react-supabase";
import { useNavigate, useParams } from "react-router-dom";
import CustomAppBar from "../AppBar";
import { toInteger } from "lodash";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

const EventInformation = ({ dispatch, events, attendanceLoading, open, handleClose, attendEvent, declineEvent }) => {

    const { selectedEventId } = useParams();

    const [eventAttendanceState, setEventAttendanceState] = useState({ open: false, index: 0 });
    const [cancelTrainingOpen, setCancelTrainingOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [selectedEvent, setSelectedEvent] = useState("");
    const client = useClient();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.application);

    useEffect(() => {
        if (selectedEventId) {
            dispatch(fetchEventAttendanceAsync({ client, eventId: selectedEventId }))
        }
    }, [selectedEventId, dispatch, client]);

    useEffect(() => {
        setSelectedEvent(events.find(x => x.id === toInteger(selectedEventId)));
    }, [events, selectedEventId]);

    if (!selectedEvent)
        return <Box
            width="100%"
            height="100%"
            direction="column"
            alignItems="center"
            justifyContent="center">
            <Typography>{`Event mit ID ${selectedEventId} nicht gefunden`}</Typography>
        </Box>

    const cancelTraining = async () => {
        await client.from("events").update({ isCancelled: !selectedEvent.isCancelled }).eq("id", selectedEvent.id);
        setCancelTrainingOpen(false);
    }

    const uploadComment = async () => {
        if (!comment)
            return;
        await client.from("event_comments").insert({
            user: user.id,
            event: selectedEventId,
            comment: comment,
            displayName: user?.user_metadata?.displayName ?? "Anon"
        }).then(res => {
            setComment("");
        })
    }

    const handleCommentChange = (event) => {
        setComment(event.target.value);
    }

    return <Box
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar title={selectedEvent?.title} navigateBack />
        <Box sx={{ justifyContent: "space-between", display: "flex", flexDirection: "column" }}>
            <Box>
                <Box pl={2}>
                    {
                        selectedEvent.isCancelled && <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0 } }}>
                            <ListItemAvatar>
                                <Info color="error" />
                            </ListItemAvatar>
                            <ListItemText primary={"Dieses Event wurde abgesagt!"} />
                        </ListItem>
                    }
                    <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0 } }}>
                        <ListItemAvatar>
                            <CalendarMonth />
                        </ListItemAvatar>
                        <ListItemText primary={moment(new Date(selectedEvent?.startingDateTime)).format("DD.MM.yyyy [um] HH:mm")} secondary={"Startzeit"} />
                    </ListItem>
                    {
                        selectedEvent?.startingDateTime !== selectedEvent?.meetingDateTime &&
                        <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pt: 0, pb: 0 } }}>
                            <ListItemAvatar />
                            <ListItemText primary={moment(new Date(selectedEvent?.meetingDateTime)).format("DD.MM.yyyy [um] HH:mm")} secondary={"Treffpunkt"} />
                        </ListItem>
                    }

                    <Divider />
                    {
                        selectedEvent.place && <>
                            <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0, pt: 0 } }}>
                                <ListItemAvatar>
                                    <Map />
                                </ListItemAvatar>
                                <ListItemText sx={{ whiteSpace: 'normal' }} primary={"Männerturnverein Karlsruhe 1881 e.V."} secondary={"Kanalweg 1, Karlsruhe"} />
                            </ListItem>
                            <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0, pt: 0 } }}>
                                <ListItemAvatar>
                                </ListItemAvatar>
                                <ListItemText>
                                    <Box sx={{ width: "100%", height: "150px" }}>
                                        <MapContainer
                                            style={{ width: "100%", height: "150px", borderRadius: "16px" }}
                                            center={[selectedEvent?.place.lat, selectedEvent?.place.lon]}
                                            zoom={15}
                                            dragging={false}
                                            doubleClickZoom={false}
                                            scrollWheelZoom={false}
                                            attributionControl={false}
                                            zoomControl={false}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <Marker position={[selectedEvent?.place.lat, selectedEvent?.place.lon]} interactive={false} />
                                        </MapContainer>
                                    </Box>
                                </ListItemText>
                            </ListItem>
                        </>
                    }

                    <Typography variant="h6" fontWeight="bold">Beschreibung</Typography>
                    <Typography pb={1}>{selectedEvent?.description}</Typography>
                    {/* <Divider />
                <Box pt={2} pb={2} pr={2} sx={{ flex: 2, flexDirection: "row", display: "flex" }}>
                    <Button variant={attendanceState === ATTENDING ? "contained" : "outlined"} color="success" sx={{ flex: 1 }} onClick={attendEvent} startIcon={<CheckCircleOutline />}>Teilnehmen</Button>
                    <Container sx={{ padding: 0, width: "16px", height: 1 }} />
                    <Button variant={attendanceState === DECLINED ? "contained" : "outlined"} color="error" sx={{ flex: 1 }} onClick={declineEvent} startIcon={<Close />}>Absagen</Button>
                </Box> */}
                    <Divider />
                    <List subheader={<Typography pt={1} variant="h6" fontWeight="bold">Teilnehmer</Typography>}>
                        <ListItem key={"attendEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 0 })}>
                            <ListItemAvatar>
                                {
                                    attendanceLoading ? <CircularProgress size={"20px"} /> : <CheckCircleOutline color="success" />
                                }
                            </ListItemAvatar>
                            <ListItemText primary={(selectedEvent?.attendance?.filter(x => x.state === ATTENDING).length ?? 0) + " zusagen"} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => attendEvent(selectedEventId)} disabled={selectedEvent.isCancelled}>
                                    {
                                        selectedEvent.userAttendance === ATTENDING
                                            ? <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                                            : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                    }
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem key={"declineEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 1 })}>
                            <ListItemAvatar>
                                {
                                    attendanceLoading ? <CircularProgress size={"20px"} /> : <RemoveCircleOutline color="error" />
                                }
                            </ListItemAvatar>
                            <ListItemText primary={(selectedEvent?.attendance?.filter(x => x.state === DECLINED).length ?? 0) + " absagen"} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => declineEvent(selectedEventId)} disabled={selectedEvent.isCancelled}>
                                    {
                                        selectedEvent.userAttendance === DECLINED
                                            ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                            : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                    }
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                    <Divider />
                    <List sx={{ marginBottom: 15 }} subheader={<Typography pt={2} variant="h6" fontWeight="bold">Kommentare</Typography>}>
                        {
                            selectedEvent.comments && selectedEvent.comments.map((x, index) => <ListItem dense key={index} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                                <ListItemText primary={x.comment} secondary={x.displayName} />
                            </ListItem>)
                        }
                    </List>
                    <Box sx={{ pb: 2, pr: 2 }}>
                        <TextField
                            fullWidth
                            value={comment}
                            placeholder="Write a comment..."
                            onChange={handleCommentChange}
                            onKeyDown={(e) => {
                                if (e.keyCode === 13)
                                    uploadComment()
                            }}
                            sx={{ '& fieldset': { borderRadius: "30px" }, '& input': { pt: 1.5, pb: 1.5 } }}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    <IconButton edge="end" onClick={uploadComment}>
                                        <Send />
                                    </IconButton>
                                </InputAdornment>,
                            }} />
                    </Box>
                </Box>
            </Box>
            <EventAttendanceDialog open={eventAttendanceState.open} index={eventAttendanceState.index} handleClose={() => setEventAttendanceState({ open: false, index: 0 })} event={selectedEvent} />

            <Dialog open={cancelTrainingOpen} onClose={() => setCancelTrainingOpen(false)}>
                <DialogTitle>
                    Training {selectedEvent.isCancelled ? "aktivieren" : "absagen"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {
                            selectedEvent.isCancelled
                                ? "Möchtest du diese Training aktivieren? Spieler können anschließend dem Training wieder zu und absagen."
                                : "Möchtest du diese Training wirklich absagen? Spieler können zu dem Training weder zu noch absagen."
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color={selectedEvent.isCancelled ? "success" : "error"} onClick={cancelTraining}>{selectedEvent.isCancelled ? "Aktivieren" : "Absagen"}</Button>
                    <Button variant="contained" color="info" onClick={() => setCancelTrainingOpen(false)}>Abbrechen</Button>
                </DialogActions>
            </Dialog>
        </Box>
        {
            (user?.role === "admin" || user?.role === "trainer") && <Box sx={{ position: "fixed", right: "16px", bottom: "88px" }}>
                <Fab sx={{ background: "#ed6c02", }}
                    onClick={() => {
                        setCancelTrainingOpen(true)
                    }}>
                    {
                        selectedEvent.isCancelled ? <DoNotDisturbOff sx={{ color: "white" }} /> : <DoNotDisturb sx={{ color: "white" }} />
                    }
                </Fab>

                <Fab sx={{ background: "#66bb6a", ml: 2 }}
                    onClick={() => {
                        dispatch(editEvent(selectedEvent));
                        navigate("/training/create", { replace: true })
                    }}>
                    {
                        <Edit sx={{ color: "white" }} />
                    }
                </Fab>
            </Box>
        }
    </Box>
}

const mapStateToProps = (state) => {
    return {
        events: state.events.items,
        attendanceLoading: state.events.attendanceLoading
    }
};

export default connect(mapStateToProps)(EventInformation);