import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography, TextField, ListItem, ListItemAvatar, ListItemText, DialogTitle, DialogContent, FormControl, FormControlLabel, RadioGroup, Radio, Divider, Checkbox, DialogActions, List, InputAdornment, Snackbar, Alert, ListItemButton } from "@mui/material"
import { AccessTime, Article, Close, FiberManualRecord, Map } from "@mui/icons-material";
import EventIcon from "@mui/icons-material/Event";
import { useNavigate } from 'react-router-dom';
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { FormEvent, useState } from "react";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import React, { useEffect } from "react";
import SearchPlacesDialog from "./SearchPlacesDialog";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { EventInsert, EventRecurrence, FullEvent } from "../../types/supabaseTypes";
import { format, isBefore, set } from "date-fns";
import _, { toNumber } from "lodash";
import { CreateEventProps, PlaceType } from "./types";
import { SelectGroupDialog } from "./SelectGroupDialog";
import { dayjsFromDb, formatDateToDatabase } from "src/utils";

const emptyEvent = {
    title: "",
    description: "",
    startingDateTime: formatDateToDatabase(set(new Date(), { seconds: 0, milliseconds: 0 })),
    recurrence: "None",
    maxAttendees: -1,
    answerDeadline: null,
    group: null,
    place: "",
} as FullEvent;

const CreateEvent = ({ t, eventToEdit, repository }: CreateEventProps) => {

    const navigate = useNavigate();

    const [editedEvent, setEditedEvent] = useState<FullEvent>(eventToEdit ?? emptyEvent);

    const [selectGroupOpen, setSelectGroupOpen] = useState(false);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [searchPlacesDialogOpen, setSearchPlacesDialogOpen] = useState(false);
    const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: "" });
    const [selectedPlace, setSelectedPlace] = useState<PlaceType>({ lat: 49.0226481, lon: 8.416547971872856, name: "MTV Karlsruhe" });

    useEffect(() => {
        if (eventToEdit) {
            setEditedEvent(eventToEdit);
        }
    }, [eventToEdit]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const data = new FormData(e.currentTarget);

            if (!editedEvent.meetingDateTime)
                setEditedEvent({ ...editedEvent, meetingDateTime: editedEvent.startingDateTime });

            let eventTitle = data.get("eventTitle")?.toString();
            let eventDescription = data.get("eventDescription")?.toString();
            let event = {
                ...(_.omit(editedEvent, ["fullGroup", "attendance", "comments", "userAttendance", "id"])),
                title: eventTitle,
                startingDateTime: editedEvent.startingDateTime,
                description: eventDescription,
                place: JSON.stringify(selectedPlace),
            } as EventInsert;

            if (!event.startingDateTime)
                throw new Error(t("events.creation.startDateCannotBeNull"))

            if (!event.group)
                throw new Error(t("events.creation.noGroupSelected"))

            if (event.answerDeadline && isBefore(new Date(event.answerDeadline), Date.now()))
                throw new Error(t("events.creation.answerDeadlineBeforeNow"))

            if (!event.title || event.title.length < 6)
                throw new Error(t("events.creation.titleTooShort"))

            if (!event.description || event.description.length < 1)
                throw new Error(t("events.creation.descriptionEmpty"))

            if (event.meetingDateTime)
                if (event.meetingDateTime > event.startingDateTime)
                    throw new Error(t("events.creation.meetingTimeBeforeStartTime"))

            const { error } = await repository.insertEvent(event)

            if (error) throw error;

            // update old event to end_at now
            if (eventToEdit) {
                await repository.updateEndOfOldEvent(eventToEdit.id, formatDateToDatabase(new Date()))
            }

            navigate("/training", { replace: true });
            setErrorSnackbar({ open: false, message: "" });
        } catch (error: unknown) {
            const message = error instanceof Error ? (error as Error).message : "Unknown error."
            setErrorSnackbar({ open: true, message })
        }
    }

    function SetViewOnClick({ place }: { place: PlaceType }) {
        const map = useMap();
        map.setView({ lat: place.lat, lng: place.lon }, map.getZoom());

        return null;
    }

    return <Box>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar position="sticky" sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate("/training", { replace: true })}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Event {eventToEdit ? "bearbeiten" : "erstellen"}
                    </Typography>
                    <Button autoFocus color="inherit" type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <List>
                <ListItem sx={{ pt: 0, pb: 0 }} key={"title"}>
                    <TextField
                        fullWidth
                        defaultValue={editedEvent.title}
                        id="eventTitle"
                        name="eventTitle"
                        variant="standard"
                        label="Event-Titel"
                        InputProps={{ startAdornment: (<InputAdornment position="start"><EventIcon /></InputAdornment>) }}
                        margin="normal" />
                </ListItem>
                <ListItem sx={{ pt: 0, pb: 0 }} key={"eventDescription"}>
                    <TextField
                        fullWidth
                        multiline
                        defaultValue={editedEvent.description}
                        id="eventDescription"
                        name="eventDescription"
                        variant="standard"
                        label="Beschreibung"
                        InputProps={{ startAdornment: (<InputAdornment position="start"><Article /></InputAdornment>) }}
                        margin="normal" />
                </ListItem>

                <ListItemButton onClick={() => setSelectGroupOpen(true)} key={"group"}>
                    <ListItemAvatar>
                        {
                            editedEvent.fullGroup && <FiberManualRecord sx={{ color: editedEvent.fullGroup.color }} />
                        }
                    </ListItemAvatar>
                    <ListItemText primary={editedEvent.fullGroup?.name ?? "Keine Gruppe gewählt"} secondary={editedEvent.fullGroup?.description ?? ""} />
                </ListItemButton>

                <Divider sx={{ mb: 2, mt: 2 }} />

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={"startDate"}>
                    <ListItemAvatar>
                        <AccessTime />
                    </ListItemAvatar>

                    <DatePicker sx={{ width: "100%" }} label="Datum" disablePast format="DD MMMM YYYY" onChange={(val) => setEditedEvent({
                        ...editedEvent,
                        startingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), { date: val?.date(), year: val?.year(), month: val?.month(), seconds: 0, milliseconds: 0 }))
                    })} value={dayjsFromDb(editedEvent.startingDateTime)} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={"startTime"}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} label="Startzeit" onChange={(val) => setEditedEvent({
                        ...editedEvent,
                        startingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), { hours: val?.hour(), minutes: val?.minute(), seconds: 0, milliseconds: 0 }))
                    })} value={dayjsFromDb(editedEvent.startingDateTime)} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={"meetingTime"}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} maxTime={dayjsFromDb(editedEvent.startingDateTime)} label="Treffpunkt" onChange={(val) => setEditedEvent({
                        ...editedEvent,
                        meetingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), { hours: val?.hour(), minutes: val?.minute(), seconds: 0, milliseconds: 0 }))
                    })} value={editedEvent.meetingDateTime ? dayjsFromDb(editedEvent.meetingDateTime) : null} />
                </ListItem>

                <ListItem onClick={() => setSearchPlacesDialogOpen(true)} key={"searchPlace"}>
                    <ListItemAvatar>
                        <Map />
                    </ListItemAvatar>

                    <ListItemText primary={selectedPlace?.name ?? "Nothing selected"} />
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { pb: 1, pt: 0 } }} onClick={() => setSearchPlacesDialogOpen(true)} key={"searchPlaceMap"}>
                    <ListItemAvatar>
                    </ListItemAvatar>
                    <ListItemText>
                        <Box sx={{ width: "100%", height: "150px" }}>
                            <MapContainer
                                center={[selectedPlace.lat, selectedPlace.lon]}
                                zoom={15}
                                dragging={false}
                                doubleClickZoom={false}
                                scrollWheelZoom={false}
                                attributionControl={false}
                                zoomControl={false}
                                style={{ width: "100%", height: "150px", borderRadius: "16px", zIndex: -1 }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <SetViewOnClick place={selectedPlace} />
                                <Marker position={[selectedPlace.lat, selectedPlace.lon]} />
                            </MapContainer>
                        </Box>
                    </ListItemText>
                </ListItem>

                <Divider />

                <ListItem onClick={() => setRepeatDialogOpen(true)} key={"recurrence"}>
                    <ListItemAvatar>
                        <EventRepeatIcon />
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung"} secondary={editedEvent.recurrence} />
                </ListItem>

                <ListItem disabled={editedEvent.recurrence === "None"} onClick={() => setStopRepeatDialogOpen(true)} key={"stopRecurrence"}>
                    <ListItemAvatar />
                    <ListItemText primary={"Wiederholung stoppen"} secondary={!editedEvent.end_at ? "Niemals" : format(editedEvent.end_at, "dd MMM yyyy")} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={"answerDeadline"}>
                    <ListItemAvatar>
                        <Checkbox sx={{ pl: 0 }} checked={editedEvent.answerDeadline !== null} onChange={() => setEditedEvent({ ...editedEvent, answerDeadline: editedEvent.answerDeadline ? null : formatDateToDatabase(set(Date.now(), { seconds: 0, milliseconds: 0 })) })} />
                    </ListItemAvatar>

                    <DateTimePicker disabled={editedEvent.answerDeadline === null} sx={{ width: "100%" }} label="Answer deadline" disablePast ampm={false} format="DD MMMM YYYY HH:mm"
                        onChange={(val) => setEditedEvent({
                            ...editedEvent,
                            answerDeadline: formatDateToDatabase(set(new Date(editedEvent.answerDeadline ?? ""), { date: val?.date(), month: val?.month(), year: val?.year(), hours: val?.hour(), minutes: val?.minute(), seconds: 0, milliseconds: 0 }))
                        })} value={editedEvent.answerDeadline ? dayjsFromDb(editedEvent.answerDeadline) : null} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={"maxAttendees"}>
                    <ListItemAvatar>
                        <Checkbox sx={{ pl: 0 }} checked={editedEvent.maxAttendees !== -1} onChange={() => setEditedEvent({ ...editedEvent, maxAttendees: editedEvent.maxAttendees === -1 ? 0 : -1 })} />
                    </ListItemAvatar>

                    <TextField
                        fullWidth
                        disabled={editedEvent.maxAttendees === -1}
                        value={editedEvent.maxAttendees === -1 ? "" : editedEvent.maxAttendees}
                        id="maxAttendees"
                        name="maxAttendees"
                        variant="outlined"
                        type="number"
                        onChange={(event) => {
                            if (toNumber(event.target.value) <= 0) {
                                event.target.value = ""
                            }
                            setEditedEvent({ ...editedEvent, maxAttendees: toNumber(event.target.value) })
                        }}
                        inputMode="numeric"
                        label="Max number of attendees"
                        margin="normal" />
                </ListItem>

            </List>
        </Box>
        <Dialog open={repeatDialogOpen} onClose={() => setRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        value={editedEvent.recurrence}
                        onChange={(e) => {
                            setEditedEvent({ ...editedEvent, recurrence: e.target.value as EventRecurrence })
                            setRepeatDialogOpen(false);
                        }}
                        name="radio-buttons-group">
                        {
                            Array.from<{ value: EventRecurrence, label: string }>([
                                { value: "None", label: "Gar nicht" },
                                { value: "Weekly", label: "Wöchentlich" },
                                { value: "Fortnightly", label: "Alle 2 Wochen" },
                                { value: "Monthly", label: "Monatlich" },
                            ])
                                .map(item => <FormControlLabel value={item.value} control={<Radio />} label={item.label} key={item.value} />)
                        }
                    </RadioGroup>
                </FormControl>
            </DialogContent>
        </Dialog>

        <Dialog open={stopRepeatDialogOpen} onClose={() => setStopRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>

                <FormControlLabel control={<Checkbox checked={editedEvent.end_at === null} onChange={() => setEditedEvent({ ...editedEvent, end_at: editedEvent.end_at ? null : formatDateToDatabase(set(Date.now(), { seconds: 0, milliseconds: 0 })) })} />} label="Niemals" />

                <DatePicker sx={{ mt: 2, mb: 2, width: "100%" }} label="Start"
                    disabled={editedEvent.end_at === null}
                    onChange={(val) => setEditedEvent({
                        ...editedEvent,
                        end_at: formatDateToDatabase(set(editedEvent.end_at ? new Date(editedEvent.end_at) : Date.now(), { date: val?.date(), month: val?.month(), year: val?.year(), hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }))
                    })} value={editedEvent.end_at ? dayjsFromDb(editedEvent.end_at) : null} />

                <Typography>Es werden Termine erstellt bis einschließlich diesem Tag. Alles danach entfällt</Typography>

            </DialogContent>
            <DialogActions>
                <Button onClick={() => setStopRepeatDialogOpen(false)}>Bestätigen</Button>
            </DialogActions>
        </Dialog>

        <SelectGroupDialog open={selectGroupOpen}
            handleClose={() => setSelectGroupOpen(false)}
            handleSubmit={(group) => {
                setEditedEvent({ ...editedEvent, group: group.id, fullGroup: group })
                setSelectGroupOpen(false);
            }} />

        <SearchPlacesDialog
            open={searchPlacesDialogOpen}
            handleClose={() => setSearchPlacesDialogOpen(false)}
            placeSelected={(place) => {
                setSelectedPlace({
                    name: place.name,
                    lat: place.lat,
                    lon: place.lon
                });
                setSearchPlacesDialogOpen(false)
            }} />

        <Snackbar sx={{ position: "fixed", right: "16px", }} open={errorSnackbar.open} autoHideDuration={1500}>
            <Alert severity={"error"} sx={{ width: '100%' }}>
                {errorSnackbar.message}
            </Alert>
        </Snackbar>
    </Box >
}

export default CreateEvent;