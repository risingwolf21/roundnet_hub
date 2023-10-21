import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography, TextField, ListItem, ListItemAvatar, ListItemText, DialogTitle, DialogContent, FormControl, FormControlLabel, RadioGroup, Radio, Divider, Checkbox, DialogActions, List, InputAdornment, Snackbar, Alert } from "@mui/material"
import { AccessTime, Article, Close, Map } from "@mui/icons-material";
import EventIcon from "@mui/icons-material/Event";
import { useNavigate } from 'react-router-dom';
import { DatePicker } from "@mui/x-date-pickers";
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { FormEvent, useState } from "react";
import moment, { Moment } from "moment";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useClient } from "react-supabase";
import { withTranslation } from 'react-i18next';
import React, { useEffect } from "react";
import { connect } from "react-redux";
import SearchPlacesDialog from "./SearchPlacesDialog";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { TFunction } from "i18next";
import { EventRecurrence, FullEvent } from "../../types/supabaseTypes";
import { RootState } from "../../redux/store";

export type PlaceType = {
    name: string,
    lat: number,
    lon: number
}

const CreateEvent = ({ t, eventToEdit }: { t: TFunction, eventToEdit: FullEvent | null }) => {

    const navigate = useNavigate();
    const client = useClient();

    const [startDate, setStartDate] = useState<Moment | null>(moment());
    const [startTime, setStartTime] = useState<Moment | null>(moment());
    const [meetingTime, setMeetingTime] = useState<Moment | null>(moment());
    const [stopRepeatDateTime, setStopRepeatDateTime] = useState<Moment | null>(moment());
    const [stopRepeatDisabled, setStopRepeatDisabled] = useState(true);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [repeat, setRepeat] = useState<EventRecurrence>("None");
    const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: "" });
    const [searchPlacesDialogOpen, setSearchPlacesDialogOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<PlaceType>({ lat: 49.0226481, lon: 8.416547971872856, name: "MTV Karlsruhe" });

    useEffect(() => {
        if (eventToEdit) {
            setStartDate(moment(eventToEdit.startingDateTime));
            setStartTime(moment(eventToEdit.startingDateTime));
            setMeetingTime(moment(eventToEdit.meetingDateTime));
            setStopRepeatDateTime(moment(eventToEdit["end_at"]) ?? moment());
            setStopRepeatDisabled(!eventToEdit["end_at"]);
            setRepeat(eventToEdit.recurrence);
        }
    }, [eventToEdit]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const data = new FormData(e.currentTarget);
            if (!startDate || !startTime)
                throw new Error(t("events.creation.startDateCannotBeNull"))
            if (!meetingTime)
                setMeetingTime(startTime);
            let startingDateTime = startDate.set("hour", startTime.hour()).set("minute", startTime.minute()).set("seconds", 0).format("yyyy-MM-DD HH:mm:ssZ");
            let meetingDateTime = startDate.set("hour", meetingTime?.hour() ?? 0).set("minute", meetingTime?.minute() ?? 0).set("seconds", 0).format("yyyy-MM-DD HH:mm:ssZ");

            let eventTitle = data.get("eventTitle")?.toString();
            let eventDescription = data.get("eventDescription")?.toString();
            let event = {
                title: eventTitle,
                description: eventDescription,
                startingDateTime: startingDateTime,
                meetingDateTime: meetingDateTime,
                recurring: repeat,
                place: JSON.stringify(selectedPlace),
                "end_at": (stopRepeatDisabled || !stopRepeatDateTime)
                    ? null
                    : stopRepeatDateTime.format("yyyy-MM-DD HH:mm:ssZ")
            }
            if (!eventTitle || eventTitle.length < 6)
                throw new Error(t("events.creation.titleTooShort"))

            if (!eventDescription || eventDescription.length < 1)
                throw new Error(t("events.creation.descriptionEmpty"))

            if (meetingDateTime > startingDateTime)
                throw new Error(t("events.creation.meetingTimeBeforeStartTime"))

            const { error } = await client.from("events").insert(event);

            if (error) throw error;

            // update old event to end_at now
            if (eventToEdit) {
                await client.from("events").update({
                    "end_at": moment().format("yyyy-MM-DD HH:mm:ssZ")
                }).eq("id", eventToEdit.id)
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
            <AppBar sx={{ position: "relative" }}>
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
                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <TextField
                        fullWidth
                        defaultValue={eventToEdit?.title ?? ""}
                        id="eventTitle"
                        name="eventTitle"
                        variant="standard"
                        label="Event-Titel"
                        InputProps={{ startAdornment: (<InputAdornment position="start"><EventIcon /></InputAdornment>) }}
                        margin="normal" />
                </ListItem>
                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <TextField
                        fullWidth
                        multiline
                        defaultValue={eventToEdit?.description ?? ""}
                        id="eventDescription"
                        name="eventDescription"
                        variant="standard"
                        label="Beschreibung"
                        InputProps={{ startAdornment: (<InputAdornment position="start"><Article /></InputAdornment>) }}
                        margin="normal" />
                </ListItem>

                <Divider sx={{ mb: 2, mt: 2 }} />

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }}>
                    <ListItemAvatar>
                        <AccessTime />
                    </ListItemAvatar>

                    <DatePicker sx={{ width: "100%" }} label="Datum" disablePast format="DD MMMM YYYY" onChange={(val) => setStartDate(val)} value={startDate} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} label="Startzeit" onChange={(val) => setStartTime(val)} value={startTime} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} label="Treffpunkt" onChange={(val) => setMeetingTime(val)} value={meetingTime} />
                </ListItem>

                <ListItem onClick={() => setSearchPlacesDialogOpen(true)}>
                    <ListItemAvatar>
                        <Map />
                    </ListItemAvatar>

                    <ListItemText primary={selectedPlace?.name ?? "Nothing selected"} />
                </ListItem>
                <ListItem sx={{ '&.MuiListItem-root': { pb: 1, pt: 0 } }} onClick={() => setSearchPlacesDialogOpen(true)}>
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

                <ListItem onClick={() => setRepeatDialogOpen(true)}>
                    <ListItemAvatar>
                        <EventRepeatIcon />
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung"} secondary={repeat} />
                </ListItem>

                <ListItem disabled={repeat === "None"} onClick={() => setStopRepeatDialogOpen(true)}>
                    <ListItemAvatar />
                    <ListItemText primary={"Wiederholung stoppen"} secondary={stopRepeatDisabled ? "Niemals" : moment(stopRepeatDateTime).format("DD MMMM yyyy")} />
                </ListItem>

            </List>
        </Box>
        <Dialog open={repeatDialogOpen} onClose={() => setRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        defaultValue={repeat}
                        onChange={(e) => {
                            setRepeat(e.target.value as EventRecurrence);
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
                                .map(item => <FormControlLabel value={item.value} control={<Radio />} label={item.label} />)
                        }
                    </RadioGroup>
                </FormControl>
            </DialogContent>
        </Dialog>

        <Dialog open={stopRepeatDialogOpen} onClose={() => setStopRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>

                <FormControlLabel control={<Checkbox checked={stopRepeatDisabled} onChange={(e) => setStopRepeatDisabled(e.target.checked)} />} label="Niemals" />

                <DatePicker sx={{ mt: 2, mb: 2, width: "100%" }} label="Start"
                    onChange={(val) => setStopRepeatDateTime(val)}
                    disabled={stopRepeatDisabled}
                    defaultValue={stopRepeatDateTime} />

                <Typography>Es werden Termine erstellt bis einschließlich diesem Tag. Alles danach entfällt</Typography>

            </DialogContent>
            <DialogActions>
                <Button onClick={() => setStopRepeatDialogOpen(false)}>Bestätigen</Button>
            </DialogActions>
        </Dialog>

        <SearchPlacesDialog
            open={searchPlacesDialogOpen}
            handleClose={() => setSearchPlacesDialogOpen(false)}
            placeSelected={(place) => {
                console.log(place);
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

const mapStateToProps = (state: RootState) => {
    return {
        eventToEdit: state.events.eventToEdit
    }
}

export default connect(mapStateToProps)(withTranslation()(CreateEvent));