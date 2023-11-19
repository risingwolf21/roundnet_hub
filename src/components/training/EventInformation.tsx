import { Alert, AppBar, Avatar, Box, Button, Card, CardContent, CircularProgress, DialogContent, DialogContentText, Divider, IconButton, InputAdornment, List, ListItem, ListItemAvatar, ListItemIcon, ListItemSecondaryAction, ListItemText, Menu, MenuItem, Snackbar, TextField, Toolbar, Typography } from "@mui/material"
import { AccountCircle, ArrowBack, CalendarMonth, CheckCircleOutline, Delete, DoNotDisturb, DoNotDisturbOff, Edit, Info, MoreVert, Refresh, RemoveCircleOutline, Send, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { connect, useSelector } from "react-redux";
import moment from "moment";
import { createRef, useState } from "react";
import EventAttendanceDialog from "./EventAttendanceDialog";
import { useEffect } from "react";
import { editEvent, fetchEventAttendanceAsync, fetchSingleEventAsync, onEventErrorRead, updateAttendanceAsync, upsertCommentToEventAsync } from "../../redux/eventSlice";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toInteger, toNumber } from "lodash";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { DeleteEventDialog } from "../DeleteEventDialog";
import React, { Fragment } from "react";
import { useAppDispatch } from "../..";
import { EventAttendance, FullEvent, User } from "../../types/supabaseTypes";
import { RootState } from "../../redux/store";
import { PlaceType } from "./CreateEvent";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { useDependency } from "src/hooks/useDependency";
import { IEventRepository } from "src/repository/IEventRepository";
import { SwipeableDialog } from "../SwipeableDialog";

type EventInformationProps = {
    selectedEvent: FullEvent,
    attendanceLoading: boolean,
    error: string | null,
    user: User,
    dispatch: ThunkDispatch<RootState, undefined, AnyAction>,
    selectedEventPlace: PlaceType,
    repository: IEventRepository
}

export type DeleteEventType = "This Event" | "This and following events";

export const EventInformationProvider = () => {
    const { items, error, attendanceLoading } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.application);
    const { selectedEventId } = useParams();
    const dispatch = useAppDispatch();
    const [selectedEvent, setSelectedEvent] = useState<FullEvent>();
    const [selectedEventPlace, setSelectedEventPlace] = useState<PlaceType>();
    const repository = useDependency<IEventRepository>("IEventRepository");

    useEffect(() => {
        if (!repository || !user)
            return;
        let found = items.find(x => x.id === toInteger(selectedEventId));
        if (!found) {
            dispatch(fetchSingleEventAsync({ repository, eventId: toNumber(selectedEventId), userId: user.userId }));
        } else {
            setSelectedEvent(found);
            setSelectedEventPlace(JSON.parse(found.place?.toString() ?? "") as PlaceType)
        }
    }, [items, selectedEventId, dispatch, repository, user]);

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />

    if (!selectedEvent || !selectedEventPlace || !repository || !user)
        return <Box
            sx={{
                width: "100%",
                height: "100%",
                direction: "column",
                alignItems: "center",
                justifyContent: "center"
            }}>
            <Typography>{`Event mit ID ${selectedEventId} nicht gefunden`}</Typography>
        </Box>

    return <EventInformation
        selectedEvent={selectedEvent}
        selectedEventPlace={selectedEventPlace}
        repository={repository}
        attendanceLoading={attendanceLoading}
        error={error}
        user={user}
        dispatch={dispatch} />
}

const EventInformation = ({ dispatch, selectedEvent, attendanceLoading, error, user, selectedEventPlace, repository }: EventInformationProps) => {

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
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {selectedEvent?.title}
                </Typography>
                <IconButton color="inherit" onClick={() => navigate("/user")}>
                    <AccountCircle />
                </IconButton>
                <IconButton color="inherit" onClick={() => dispatch(fetchSingleEventAsync({ repository, eventId: selectedEvent.id, userId: user.userId }))}>
                    <Refresh />
                </IconButton>
                {(user?.role === "admin" || user?.role === "trainer") && <>
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
                        selectedEvent.isCancelled && <Card sx={{ mt: 2, mb: 2, pb: 0, backgroundColor: "rgb(253, 237, 237)" }}>
                            <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                                <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="rgb(95, 33, 32)" gutterBottom>
                                    Absage
                                </Typography>
                                <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0 } }}>
                                    <ListItemAvatar sx={{ justifyContent: "left", alignItems: "center", display: "flex" }}>
                                        <Info sx={{ color: "#d32f2f" }} />
                                    </ListItemAvatar>
                                    <ListItemText primary={"Dieses Event wurde abgesagt!"} primaryTypographyProps={{ color: "rgb(95, 33, 32)" }} />
                                </ListItem>
                            </CardContent>
                        </Card>
                    }
                    <Card sx={{ mt: 2, mb: 2, pb: 0 }}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                Zeiten
                            </Typography>
                            <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0, pt: 0 } }}>
                                <ListItemAvatar>
                                    <CalendarMonth />
                                </ListItemAvatar>
                                <ListItemText primary={moment(selectedEvent?.startingDateTime ?? "").format("DD.MM.yyyy [um] HH:mm")} secondary={"Startzeit"} />
                            </ListItem>
                            {
                                selectedEvent?.startingDateTime !== selectedEvent?.meetingDateTime &&
                                <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pt: 0, pb: 0 } }}>
                                    <ListItemAvatar />
                                    <ListItemText primary={moment(selectedEvent?.meetingDateTime ?? "").format("DD.MM.yyyy [um] HH:mm")} secondary={"Treffpunkt"} />
                                </ListItem>
                            }
                        </CardContent>
                    </Card>

                    {
                        selectedEventPlace && <Card sx={{ mt: 2, mb: 2, pb: 0 }}>
                            <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                                <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                    {`Ort - ${selectedEventPlace.name}`}
                                </Typography>
                                <Box sx={{ width: "100%", height: "150px", alignSelf: "center" }}>
                                    <MapContainer
                                        style={{ width: "100%", height: "125px", borderRadius: "16px" }}
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
                            </CardContent>
                        </Card>
                    }

                    <Card sx={{ mt: 2, mb: 2, pb: 0 }}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                Beschreibung
                            </Typography>
                            <Typography pb={1}>{selectedEvent?.description}</Typography>
                        </CardContent>
                    </Card>

                    <Card sx={{ mt: 2, mb: 2, pb: 0 }}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                Teilnehmer
                            </Typography>
                            <List>
                                <ListItem key={"attendEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 0 })}>
                                    <ListItemAvatar>
                                        {
                                            attendanceLoading ? <CircularProgress size={"20px"} /> : <CheckCircleOutline color="success" />
                                        }
                                    </ListItemAvatar>
                                    <ListItemText primary={(selectedEvent?.attendance?.filter(x => x.state === "Attending").length ?? 0) + " zusagen"} />
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => updateAttendance("Attending", selectedEvent.userAttendance)} disabled={selectedEvent.isCancelled}>
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

                    <Card sx={{ mt: 2, mb: 2, pb: 0 }} onClick={() => setCommentsOpen(true)}>
                        <CardContent sx={{ '&.MuiCardContent-root': { paddingBottom: 1 } }}>
                            <Typography sx={{ fontSize: 16, fontWeight: "bold" }} color="text.secondary" gutterBottom>
                                {`Kommentare ${selectedEvent.comments.length}`}
                            </Typography>
                            <ListItem dense sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ width: 25, height: 25 }}>
                                        <Typography fontSize={12}>{user.displayName.charAt(0)}</Typography>
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

            <EventAttendanceDialog open={eventAttendanceState.open} index={eventAttendanceState.index} setOpen={(value) => setEventAttendanceState({ open: value, index: 0 })} event={selectedEvent} />

            <SwipeableDialog open={cancelTrainingOpen} setOpen={setCancelTrainingOpen} title={`Training ${selectedEvent.isCancelled ? "aktivieren" : "absagen"}`} onClose={() => setCancelTrainingOpen(false)}>
                <DialogContent>
                    <DialogContentText>
                        {
                            selectedEvent.isCancelled
                                ? "Möchtest du diese Training aktivieren? Spieler können anschließend dem Training wieder zu und absagen."
                                : "Möchtest du diese Training wirklich absagen? Spieler können zu dem Training weder zu noch absagen."
                        }
                    </DialogContentText>
                </DialogContent>
                <Box sx={{ display: "flex", flexDirection: "row", flexGrow: 1, position: "absolute", left: 0, right: 0, bottom: 0 }}>
                    <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }} onClick={() => setCancelTrainingOpen(false)}>Abbrechen</Button>
                    <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }} onClick={cancelTraining} autoFocus>
                        Bestätigen
                    </Button>
                </Box>
            </SwipeableDialog>

            <DeleteEventDialog selectedEvent={selectedEvent} setOpen={() => setDeleteTrainingOpen(true)} open={deleteTrainingOpen} handleClose={(e) => {
                deleteEvent(e);
                setDeleteTrainingOpen(false);
            }} />
        </Box>
        <Snackbar sx={{ position: "fixed", right: "16px", }} open={error !== null} >
            <Alert severity={"error"} sx={{ width: '100%' }} onClose={() => dispatch(onEventErrorRead(null))}>
                asdfasdfasdf
            </Alert>
        </Snackbar>
    </Box >
}

const mapStateToProps = (state: RootState) => {
    return {
        events: state.events.items,
        error: state.events.error,
        attendanceLoading: state.events.attendanceLoading
    }
};

export default connect(mapStateToProps)(EventInformation);