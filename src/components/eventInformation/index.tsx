import { AccountCircle, ArrowBack, CheckCircleOutline, Delete, DoNotDisturb, DoNotDisturbOff, Edit, MoreVert, Refresh, RemoveCircleOutline, Send, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { Alert, AlertTitle, AppBar, Avatar, Box, Button, Card, CardContent, CardHeader, CardMedia, CircularProgress, Divider, IconButton, InputAdornment, List, ListItem, ListItemAvatar, ListItemIcon, ListItemSecondaryAction, ListItemText, Menu, MenuItem, Snackbar, TextField, Toolbar, Typography } from "@mui/material";
import moment from "moment";
import React, { createRef, useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { editEvent, fetchEventAttendanceAsync, fetchSingleEventAsync, onEventErrorRead, updateAttendanceAsync, upsertCommentToEventAsync } from "../../redux/eventSlice";
import { EventAttendance, answerDeadlineExpired, maxAttendeesExceeded } from "../../types/supabaseTypes";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { SwipeableDialog } from "../SwipeableDialog";
import { DeleteEventType, EventInformationProps } from "./types";
import EventAttendanceDialog from "./EventAttendanceDialog";
import { CancelTrainingDialog } from "./CancelTrainingDialog";
import { can } from "src/utils/PermissionService";

const EventInformation = ({ dispatch, selectedEvent, attendanceLoading, error, user, selectedEventPlace, repository, t }: EventInformationProps) => {

    const [eventAttendanceState, setEventAttendanceState] = useState({ open: false, index: 0 });
    const [cancelTrainingOpen, setCancelTrainingOpen] = useState(false);
    const [deleteTrainingOpen, setDeleteTrainingOpen] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const navigate = useNavigate();
    const inputRef = createRef<HTMLInputElement>();
    const [anchorEl, setAnchorEl] = useState<EventTarget & HTMLButtonElement | null>(null);

    useEffect(() => {
        dispatch(fetchEventAttendanceAsync({ repository, eventId: selectedEvent.id }))
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
        console.log(comment)
        if (!comment)
            return;

        dispatch(upsertCommentToEventAsync({ repository, user, eventId: selectedEvent.id, comment: comment.toString() }));
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
            startTimeTranslation = t("events.information.startTimeAndEndTime", { startTime: new Date(startingDateTime), endTime: new Date(end_at) });
        }

        if (meetingDateTime) {
            return <ListItemText sx={{ m: 0 }} primary={t("events.information.meetTime", { meetTime: new Date(meetingDateTime) })} secondary={startTimeTranslation} />
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
        <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} />
                <IconButton color="inherit" onClick={() => navigate("/user")}>
                    <AccountCircle />
                </IconButton>
                <IconButton color="inherit" onClick={() => dispatch(fetchSingleEventAsync({ repository, eventId: selectedEvent.id, userId: user.userId }))}>
                    <Refresh />
                </IconButton>
                {(user?.role === "admin" || user?.role === "trainer" || can("edit", "training")) && <>
                    <IconButton sx={{ color: "inherit", pr: 0 }} onClick={handleClick}>
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
                <Box pl={1} pr={1}>
                    {
                        selectedEvent.isCancelled && <Alert sx={{ mt: 2 }} severity="error">
                            <AlertTitle>Absage</AlertTitle>
                            Dieses Event wurde <strong>abgesagt</strong>
                        </Alert>
                    }
                    <Card sx={{ mt: 2, mb: 2, p: 0 }} variant="elevation" elevation={3}>
                        {
                            selectedEventPlace && <CardMedia sx={{ maxHeight: "15%", borderRadius: 5 }}>
                                <Box sx={{ width: "100%", maxHeight: "15%", alignSelf: "center" }}>
                                    <MapContainer
                                        style={{ width: "100%", height: "200px", borderRadius: "16px" }}
                                        center={[selectedEventPlace.lat, selectedEventPlace.lon]}
                                        zoom={15}
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
                        <CardHeader title={selectedEvent.title} subheader={createCardSubHeader()} />

                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>

                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                Beschreibung
                            </Typography>
                            <Typography pb={1}>{selectedEvent?.description}</Typography>
                        </CardContent>
                    </Card>

                    {
                        selectedEvent.maxAttendees <= selectedEvent.attendance.filter(x => x.state === "Attending").length && selectedEvent.userAttendance !== "Waiting" && selectedEvent.userAttendance !== "Attending" &&
                        <Alert sx={{ mt: 2 }} severity="info">
                            <AlertTitle>Warteliste</AlertTitle>
                            Die maximale Anzahl der Teilnehmer ist erreicht. Du kannst trotzdem der Warteliste beitreten.
                            <Button sx={{ alignContent: "end" }} variant="contained" onClick={() => updateAttendance("Waiting", selectedEvent.userAttendance)}>
                                Beitreten
                            </Button>
                        </Alert>
                    }

                    {
                        selectedEvent.userAttendance === "Waiting" && <Alert sx={{ mt: 2 }} severity="info">
                            <AlertTitle>{t("events.information.waitingListPlace", { place: selectedEvent.attendance.filter(x => x.state === "Waiting").sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()).findIndex(x => x.user.userId === user.userId) + 1, waitingListLength: selectedEvent.attendance.filter(x => x.state === "Waiting").length })}</AlertTitle>
                            {t("events.information.waitingListAccepted")}
                            <Button sx={{ alignContent: "end" }} variant="contained" onClick={() => updateAttendance("Declined", selectedEvent.userAttendance)}>
                                Verlassen
                            </Button>
                        </Alert>
                    }

                    {
                        answerDeadlineExpired(selectedEvent) && selectedEvent.answerDeadline && <Alert sx={{ mt: 2 }} severity="info">
                            <AlertTitle>{t("events.information.answerDeadlineExceededTitle")}</AlertTitle>
                            {t("events.information.answerDeadlineExceeded", { answerDeadline: new Date(selectedEvent.answerDeadline) })}
                        </Alert>
                    }

                    <Card sx={{ mt: 2, mb: 2, pb: 0 }} variant="elevation" elevation={3}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                Teilnehmer
                            </Typography>
                            <List sx={{ p: 0 }}>
                                <ListItem key={"attendEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 0 })}>
                                    <ListItemAvatar>
                                        {
                                            attendanceLoading ? <CircularProgress size={"20px"} /> : <CheckCircleOutline color="success" />
                                        }
                                    </ListItemAvatar>
                                    <ListItemText primary={(selectedEvent.attendance.filter(x => x.state === "Attending").length) + " zusagen"} />
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => updateAttendance("Attending", selectedEvent.userAttendance)} disabled={selectedEvent.isCancelled || maxAttendeesExceeded(selectedEvent) || answerDeadlineExpired(selectedEvent)}>
                                            {
                                                selectedEvent.userAttendance === "Attending"
                                                    ? <ThumbUpAlt fontSize="inherit" sx={{ fontSize: "28px", color: "green" }} />
                                                    : <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                            }
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem key={"declineEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 1 })}>
                                    <ListItemAvatar sx={{ justifyContent: "left", alignItems: "center", display: "flex" }}>
                                        {
                                            attendanceLoading ? <CircularProgress size={"20px"} /> : <RemoveCircleOutline color="error" />
                                        }
                                    </ListItemAvatar>
                                    <ListItemText primary={(selectedEvent?.attendance?.filter(x => x.state === "Declined").length ?? 0) + " absagen"} />
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => updateAttendance("Declined", selectedEvent.userAttendance)} disabled={selectedEvent.isCancelled}>
                                            {
                                                selectedEvent.userAttendance === "Declined"
                                                    ? <ThumbDownAlt fontSize="inherit" sx={{ fontSize: "28px", color: "red" }} />
                                                    : <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: "28px" }} />
                                            }
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>

                    <Card sx={{ mt: 2, mb: 2, pb: 0 }} onClick={() => setCommentsOpen(true)} variant="elevation" elevation={3}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                {`Kommentare ${selectedEvent.comments.length}`}
                            </Typography>
                            <ListItem dense sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ width: 25, height: 25 }}>
                                        <Typography fontSize={12}>{user.displayName?.charAt(0)}</Typography>
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText>
                                    <TextField
                                        fullWidth
                                        disabled
                                        onClick={() => {
                                            setCommentsOpen(true);
                                            inputRef.current?.focus();
                                        }}
                                        placeholder="Write a comment..."
                                        sx={{
                                            width: "100%", '& fieldset': { borderRadius: "30px" }, '& input': { pt: 0, pb: 0 }, '& .MuiInputBase-input.Mui-disabled': {
                                                WebkitTextFillColor: "#000000",
                                            },
                                        }} />
                                </ListItemText>
                            </ListItem>
                        </CardContent>
                    </Card>

                    <SwipeableDialog open={commentsOpen} onClose={() => setCommentsOpen(false)} setOpen={setCommentsOpen} title={"Kommentare"} minHeight={40}>
                        <Box sx={{ display: "flex", px: 2, flexDirection: "column" }}>
                            <List sx={{ mb: 8 }}>
                                {
                                    selectedEvent.comments && selectedEvent.comments.map((x, index) => <ListItem divider dense key={index} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                                        <ListItemAvatar>
                                            <Avatar>
                                                {
                                                    x.pending
                                                        ? <CircularProgress size={"20px"} />
                                                        : <Typography style={{ fontWeight: "bold" }}>{x.displayName?.charAt(0)}</Typography>
                                                }
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText primaryTypographyProps={{ fontWeight: "bold", fontSize: "11pt" }} primary={x.displayName} secondary={x.comment} />
                                        <ListItemSecondaryAction sx={{ height: "100%" }}>
                                            <Typography style={{ fontSize: "10pt", color: "rgba(0,0,0,0.6)", marginTop: "8px", alignContent: "baseline" }}>{moment(x.created_at).format("HH:mm")}</Typography>
                                        </ListItemSecondaryAction>
                                    </ListItem>)
                                }
                            </List>
                            <Box sx={{ position: "absolute", background: "#fff", bottom: 0, left: 0, right: 0, p: 2 }} component={"form"} onSubmit={handleCommentSubmit}>
                                <TextField
                                    ref={inputRef}
                                    id="comment"
                                    name="comment"
                                    fullWidth
                                    placeholder="Write a comment..."
                                    sx={{ '& fieldset': { borderRadius: "30px" }, '& input': { pt: 1.5, pb: 1.5 } }}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">
                                            <IconButton edge="end" type="submit">
                                                <Send />
                                            </IconButton>
                                        </InputAdornment>,
                                    }} />
                            </Box>
                        </Box>
                    </SwipeableDialog>

                </Box>
            </Box>

            <EventAttendanceDialog
                open={eventAttendanceState.open}
                index={eventAttendanceState.index}
                setOpen={(value) => setEventAttendanceState({ open: value, index: 0 })}
                event={selectedEvent} />

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
        <Snackbar sx={{ position: "fixed", right: "16px", }} open={error !== null} >
            <Alert severity={"error"} sx={{ width: '100%' }} onClose={() => dispatch(onEventErrorRead(null))}>
                {error}
            </Alert>
        </Snackbar>
    </Box >
}

export default EventInformation;