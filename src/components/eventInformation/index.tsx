import {
    AccountCircle,
    ArrowBack, ArrowRight,
    CheckCircleOutline,
    Comment,
    Delete,
    DoNotDisturb,
    DoNotDisturbOff,
    Edit,
    MoreVert,
    Refresh,
    RemoveCircleOutline,
    Send,
    ThumbDownAlt,
    ThumbDownOffAlt,
    ThumbUpAlt,
    ThumbUpOffAlt
} from "@mui/icons-material";
import {
    Alert,
    AlertTitle,
    AppBar,
    Avatar,
    Box,
    Button,
    CardContent,
    CardHeader,
    CardMedia,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemIcon,
    ListItemSecondaryAction,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import moment from "moment";
import React, { createRef, useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { EventAttendance, answerDeadlineExpired, maxAttendeesExceeded } from "../../types/supabaseTypes";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { SwipeableDialog } from "../SwipeableDialog";
import { DeleteEventType, EventInformationProps } from "./types";
import EventAttendanceDialog from "./EventAttendanceDialog";
import { CancelTrainingDialog } from "./CancelTrainingDialog";
import { can } from "src/utils/PermissionService";
import { fetchEventAttendanceAsync, updateAttendanceAsync } from "src/redux/events/eventAttendanceSlice";
import { formatDateToDatabase } from "src/utils";
import { fetchEventCommentsAsync, upsertCommentToEventAsync } from "src/redux/events/eventCommentsSlice";
import { editEvent, fetchSingleEventAsync, onEventErrorRead } from "src/redux/events/eventsSlice";
import EventInformationAttendance from "./EventInformationAttendance";
import EventInformationComments from "./EventInformationComments";

const EventInformation = ({
    dispatch,
    selectedEvent,
    attendanceLoading,
    error,
    user,
    selectedEventPlace,
    repository,
    t,
    attendance,
    comments
}: EventInformationProps) => {

    const [eventAttendanceState, setEventAttendanceState] = useState({ open: false, index: 0 });
    const [cancelTrainingOpen, setCancelTrainingOpen] = useState(false);
    const [deleteTrainingOpen, setDeleteTrainingOpen] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const navigate = useNavigate();
    const inputRef = createRef<HTMLInputElement>();
    const [anchorEl, setAnchorEl] = useState<EventTarget & HTMLButtonElement | null>(null);

    useEffect(() => {
        dispatch(fetchEventAttendanceAsync({ repository, eventId: selectedEvent.id }));
        dispatch(fetchEventCommentsAsync({ repository, eventId: selectedEvent.id }));
    }, [dispatch, repository, selectedEvent.id]);

    const cancelTraining = async () => {
        await repository.updateCancellationForEvent(selectedEvent.id, !selectedEvent.isCancelled)
        dispatch(fetchSingleEventAsync({ repository, eventId: selectedEvent.id, userId: user.userId }));
        setCancelTrainingOpen(false);
    }

    const deleteEvent = async (value: DeleteEventType | null) => {
        if (!value) {
            return;
        } else if (value === "This Event") {
            await repository.deleteEvent(selectedEvent.id);
            navigate("/training", { replace: true });
        } else if (value === "This and following events") {
            await repository.deleteEventAndUpcomingEvents(selectedEvent.id, selectedEvent.key, selectedEvent.startingDateTime)
            navigate("/training", { replace: true });
        }
    }

    const updateAttendance = async (state: EventAttendance, oldState: EventAttendance) => {
        dispatch(updateAttendanceAsync({ repository, user, eventId: selectedEvent.id, state, oldState }));
    }

    const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const comment = data.get("comment")?.toString();
        if (!comment)
            return;

        dispatch(upsertCommentToEventAsync({
            repository,
            user,
            eventId: selectedEvent.id,
            comment: comment.toString(),
            created_at: formatDateToDatabase(new Date())
        }));
        event.currentTarget.reset();
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const createCardSubHeader = () => {
        const { meetingDateTime, startingDateTime, end_at } = selectedEvent;

        var startTimeTranslation = t("events.information.startTime", { startTime: new Date(startingDateTime) });
        if (end_at) {
            startTimeTranslation = t("events.information.startTimeAndEndTime", {
                startTime: new Date(startingDateTime),
                endTime: new Date(end_at)
            });
        }

        if (meetingDateTime) {
            return <ListItemText sx={{ m: 0 }}
                primary={t("events.information.meetTime", { meetTime: new Date(meetingDateTime) })}
                secondary={startTimeTranslation} />
        } else {
            return <ListItemText sx={{ m: 0 }} primary={startTimeTranslation} />
        }

    }

    return <Box
        sx={{
            width: "100%",
            direction: "column",
            alignItems: "center",
            justifyContent: "center"
        }}>
        <AppBar sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            width: "100%",
        }} elevation={0} position="sticky">
            <Toolbar>
                <IconButton
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{ mr: 2, color: "#fff" }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>{selectedEvent.title}</Typography>
                {(user?.role === "admin" || user?.role === "trainer" || can("edit", "training")) && <>
                    <IconButton sx={{ color: "#fff", pr: 0 }} onClick={handleClick}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        id="simple-menu"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleClose}>
                        <MenuItem onClick={() => {
                            dispatch(editEvent(selectedEvent));
                            navigate("/training/create", { replace: true })
                        }}>
                            <ListItemIcon>
                                <Edit />
                            </ListItemIcon>
                            <ListItemText primary="Bearbeiten" />
                        </MenuItem>
                        <MenuItem onClick={() => {
                            setCancelTrainingOpen(true);
                            handleClose();
                        }}>
                            <ListItemIcon>
                                {
                                    selectedEvent.isCancelled ? <DoNotDisturbOff /> : <DoNotDisturb />
                                }
                            </ListItemIcon>
                            <ListItemText primary={selectedEvent.isCancelled ? "Stattfinden" : "Absagen"} />
                        </MenuItem>
                        <MenuItem onClick={() => {
                            setDeleteTrainingOpen(true);
                            handleClose();
                        }}>
                            <ListItemIcon>
                                <Delete />
                            </ListItemIcon>
                            <ListItemText primary="Löschen" />
                        </MenuItem>
                    </Menu>
                </>
                }
            </Toolbar>
        </AppBar>
        <Box sx={{ justifyContent: "space-between", display: "flex", flexDirection: "column" }}>
            <Box>
                <Box>
                    {
                        selectedEventPlace && <CardMedia sx={{ maxHeight: "10%" }}>
                            <Box sx={{ width: "100%", maxHeight: "10%", alignSelf: "center" }}>
                                <Box component="button" onClick={() => {
                                    window.open("https://maps.google.com?q=" + selectedEventPlace.lat + "," + selectedEventPlace.lon, '_blank');
                                }} sx={{ position: "absolute", zIndex: 999, width: "100%", height: "150px", border: "none", background: "transparent" }}></Box>
                                <MapContainer
                                    style={{ width: "100%", height: "150px" }}
                                    center={[selectedEventPlace.lat, selectedEventPlace.lon]}
                                    zoom={15}
                                    tap={false}
                                    dragging={false}
                                    doubleClickZoom={false}
                                    scrollWheelZoom={false}
                                    attributionControl={false}
                                    zoomControl={false}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker
                                        position={[selectedEventPlace.lat, selectedEventPlace.lon]}
                                        interactive={false} />
                                </MapContainer>
                            </Box>
                        </CardMedia>
                    }
                    {
                        selectedEvent.isCancelled && <Alert sx={{ ml: 2, mr: 2, mt: 2 }} severity="error">
                            Dieses Event wurde <strong>abgesagt</strong>
                        </Alert>
                    }
                    {
                        answerDeadlineExpired(selectedEvent) && selectedEvent.answerDeadline &&
                        <Alert sx={{ ml: 2, mr: 2, mt: 2 }} severity="info">
                            {t("events.information.answerDeadlineExceeded", { answerDeadline: new Date(selectedEvent.answerDeadline) })}
                        </Alert>
                    }
                    <CardHeader subheader={createCardSubHeader()} sx={{ pb: 0 }} />

                    <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>

                        <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                            Beschreibung
                        </Typography>
                        <Typography pb={1}>{selectedEvent?.description}</Typography>
                        <Divider />

                        {
                            selectedEvent.maxAttendees <= attendance.filter(x => x.state === "Attending").length && selectedEvent.userAttendance !== "Waiting" && selectedEvent.userAttendance !== "Attending" &&
                            <Alert sx={{ mt: 2 }} severity="info">
                                <AlertTitle>Warteliste</AlertTitle>
                                Die maximale Anzahl der Teilnehmer ist erreicht. Du kannst trotzdem der Warteliste
                                beitreten.
                                <Button sx={{ alignContent: "end" }} variant="contained"
                                    onClick={() => updateAttendance("Waiting", selectedEvent.userAttendance)}>
                                    Beitreten
                                </Button>
                            </Alert>
                        }

                        {
                            selectedEvent.userAttendance === "Waiting" && <Alert sx={{ mt: 2 }} severity="warning" action={
                                <Button variant="contained" size="small" sx={{ backgroundColor: "#934b00" }} onClick={() => updateAttendance("Declined", selectedEvent.userAttendance)}>
                                    Verlassen
                                </Button>
                            }>
                                {t("events.information.waitingListAccepted", {
                                    place: attendance.filter(x => x.state === "Waiting").sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()).findIndex(x => x.user.userId === user.userId) + 1,
                                    waitingListLength: attendance.filter(x => x.state === "Waiting").length
                                })}
                            </Alert>
                        }
                        <EventInformationAttendance
                            user={user}
                            attendance={attendance}
                            attendanceLoading={attendanceLoading}
                            selectedEvent={selectedEvent}
                            setEventAttendanceState={setEventAttendanceState}
                            updateAttendance={updateAttendance} />
                        <Divider />
                        <EventInformationComments
                            eventId={selectedEvent.id}
                            comments={comments}
                            handleCommentSubmit={handleCommentSubmit}
                            inputRef={inputRef} />
                        <Divider />
                    </CardContent>
                </Box>
            </Box>

            <EventAttendanceDialog
                open={eventAttendanceState.open}
                index={eventAttendanceState.index}
                setOpen={(value) => setEventAttendanceState({ open: value, index: 0 })}
                attendance={attendance} />

            <CancelTrainingDialog
                cancelTrainingOpen={cancelTrainingOpen}
                setCancelTrainingOpen={setCancelTrainingOpen}
                cancelTraining={cancelTraining}
                selectedEvent={selectedEvent} />

            <DeleteEventDialog
                selectedEvent={selectedEvent}
                setOpen={() => setDeleteTrainingOpen(true)}
                open={deleteTrainingOpen}
                handleClose={(e) => {
                    deleteEvent(e);
                    setDeleteTrainingOpen(false);
                }} />
        </Box>
        <Snackbar sx={{ position: "fixed", right: "16px", }} open={error !== null}>
            <Alert severity={"error"} sx={{ width: '100%' }} onClose={() => dispatch(onEventErrorRead(null))}>
                {error}
            </Alert>
        </Snackbar>
    </Box>
}

export default EventInformation;