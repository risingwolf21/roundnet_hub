import { Alert, AppBar, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, InputAdornment, List, ListItem, ListItemAvatar, ListItemIcon, ListItemSecondaryAction, ListItemText, Menu, MenuItem, Snackbar, TextField, Toolbar, Typography } from "@mui/material"
import { AccountCircle, ArrowBack, CalendarMonth, CheckCircleOutline, Delete, DoNotDisturb, DoNotDisturbOff, Edit, Info, Map, MoreVert, Refresh, RemoveCircleOutline, Send, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from "@mui/icons-material";
import { connect, useSelector } from "react-redux";
import moment from "moment";
import { ChangeEvent, useState } from "react";
import EventAttendanceDialog from "./EventAttendanceDialog";
import { useEffect } from "react";
import { editEvent, fetchEventAttendanceAsync, fetchSingleEventAsync, onEventErrorRead, updateAttendanceAsync, upsertCommentToEventAsync } from "../../redux/eventSlice";
import { useClient } from "react-supabase";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toInteger, toNumber } from "lodash";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { DeleteEventDialog } from "../DeleteEventDialog";
import React, { Fragment } from "react";
import { AppDispatch, useAppDispatch } from "../..";
import { EventAttendance, FullEvent, User } from "../../types/supabaseTypes";
import { RootState } from "../../redux/store";
import { PlaceType } from "./CreateEvent";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { useDependency } from "src/hooks/useDependency";
import { IEventRepository } from "src/repository/IEventRepository";

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
        if (!repository)
            return;
        let found = items.find(x => x.id === toInteger(selectedEventId));
        if (!found) {
            dispatch(fetchSingleEventAsync({ repository, eventId: toNumber(selectedEventId) }));
        } else {
            setSelectedEvent(found);
            setSelectedEventPlace(JSON.parse(found.place?.toString() ?? "") as PlaceType)
        }
    }, [items, selectedEventId, dispatch, repository]);

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />

    if (!selectedEvent || !selectedEventPlace || !repository)
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
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<EventTarget & HTMLButtonElement | null>(null);

    useEffect(() => {
        dispatch(fetchEventAttendanceAsync({ repository, eventId: selectedEvent.id }))
    }, [dispatch, repository]);

    const cancelTraining = async () => {
        await repository.updateCancellationForEvent(selectedEvent.id, !selectedEvent.isCancelled)
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

        const comment = data.get("comment");

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
                <IconButton color="inherit" onClick={() => dispatch(fetchSingleEventAsync({ repository, eventId: selectedEvent.id }))}>
                    <Refresh />
                </IconButton>
                {(user?.role === "admin" || user?.role === "trainer") && <>
                    <IconButton sx={{ color: "inherit" }} onClick={handleClick}>
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
                        <ListItemText primary={moment(selectedEvent?.startingDateTime ?? "").format("DD.MM.yyyy [um] HH:mm")} secondary={"Startzeit"} />
                    </ListItem>
                    {
                        selectedEvent?.startingDateTime !== selectedEvent?.meetingDateTime &&
                        <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pt: 0, pb: 0 } }}>
                            <ListItemAvatar />
                            <ListItemText primary={moment(selectedEvent?.meetingDateTime ?? "").format("DD.MM.yyyy [um] HH:mm")} secondary={"Treffpunkt"} />
                        </ListItem>
                    }

                    <Divider />
                    {
                        selectedEventPlace && <>
                            <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0 } }}>
                                <ListItemAvatar>
                                    <Map />
                                </ListItemAvatar>
                                <ListItemText sx={{ whiteSpace: 'normal' }} primary={selectedEventPlace.name} />
                            </ListItem>
                            <ListItem sx={{ '&.MuiListItem-root': { pl: 0, pb: 0, pt: 0 } }}>
                                <ListItemAvatar>
                                </ListItemAvatar>
                                <ListItemText>
                                    <Box sx={{ width: "100%", height: "150px" }}>
                                        <MapContainer
                                            style={{ width: "100%", height: "150px", borderRadius: "16px" }}
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
                                </ListItemText>
                            </ListItem>
                        </>
                    }

                    <Typography variant="h6" fontWeight="bold">Beschreibung</Typography>
                    <Typography pb={1}>{selectedEvent?.description}</Typography>
                    <Divider />
                    <List subheader={<Typography pt={1} variant="h6" fontWeight="bold">Teilnehmer</Typography>}>
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
                        <ListItem key={"declineEvent"} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} onClick={() => attendanceLoading ? {} : setEventAttendanceState({ open: true, index: 1 })}>
                            <ListItemAvatar>
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
                    <Divider />
                    <List sx={{ marginBottom: 15 }} subheader={<Typography pt={2} variant="h6" fontWeight="bold">Kommentare</Typography>}>
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
                                <ListItemText primary={<Fragment>
                                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                        <Typography style={{ fontWeight: "bold", fontSize: "11pt" }}>{x.displayName}</Typography>
                                    </Box>
                                </Fragment>} secondary={<Fragment>
                                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                        <Typography style={{ color: "#000" }}>{x.comment}</Typography>
                                    </Box>
                                </Fragment>} />
                                <ListItemSecondaryAction sx={{ height: "100%" }}>
                                    <Typography style={{ fontSize: "10pt", color: "rgba(0,0,0,0.6)", marginTop: "8px", alignContent: "baseline" }}>{moment(x.created_at).format("HH:mm")}</Typography>
                                </ListItemSecondaryAction>
                            </ListItem>)
                        }
                    </List>
                    <Box component={"form"} onSubmit={handleCommentSubmit} sx={{ pb: 2, pr: 2 }}>
                        <TextField
                            id="comment"
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

            <DeleteEventDialog selectedEvent={selectedEvent} open={deleteTrainingOpen} handleClose={(e) => {
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

const mapStateToProps = (state: RootState) => {
    return {
        events: state.events.items,
        error: state.events.error,
        attendanceLoading: state.events.attendanceLoading
    }
};

export default connect(mapStateToProps)(EventInformation);