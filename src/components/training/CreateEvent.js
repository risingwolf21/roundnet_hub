import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography, TextField, ListItem, ListItemAvatar, ListItemText, DialogTitle, DialogContent, FormControl, FormControlLabel, RadioGroup, Radio, Divider, Checkbox, DialogActions, List, InputAdornment, Snackbar, Alert } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { AccessTime, Article, Close, Event, Map } from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { DatePicker } from "@mui/x-date-pickers";
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useState } from "react";
import moment from "moment";
import { FORTNIGHTLY, MONTHLY, NON_REPEAT, WEEKLY } from "../../constants";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useClient } from "react-supabase";
import { withTranslation } from 'react-i18next';
import { useEffect } from "react";
import { connect } from "react-redux";
import SearchPlacesDialog from "./SearchPlacesDialog";
import { MapContainer, Popup, TileLayer, Marker, useMap } from "react-leaflet";

const CreateEvent = ({ t, dispatch, eventToEdit }) => {

    const navigate = useNavigate();
    const client = useClient();

    const [startDate, setStartDate] = useState(moment());
    const [startTime, setStartTime] = useState(moment());
    const [meetingTime, setMeetingTime] = useState(moment());
    const [stopRepeatDateTime, setStopRepeatDateTime] = useState(moment());
    const [stopRepeatDisabled, setStopRepeatDisabled] = useState(true);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [repeat, setRepeat] = useState(WEEKLY);
    const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: "" });
    const [searchPlacesDialogOpen, setSearchPlacesDialogOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState({ lat: 49.0226481, lon: 8.416547971872856, name: "MTV Karlsruhe" });

    useEffect(() => {
        if (eventToEdit) {
            setStartDate(moment(eventToEdit.startingDateTime));
            setStartTime(moment(eventToEdit.startingDateTime));
            setMeetingTime(moment(eventToEdit.meetingDateTime));
            setStopRepeatDateTime(eventToEdit["end_at"] ?? moment());
            setStopRepeatDisabled(!eventToEdit["end_at"]);
            setRepeat(eventToEdit.recurring);
        }
    }, [eventToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData(e.currentTarget);
            let startingDateTime = startDate.set(startTime.hour(), "hour").set(startTime.minute(), "minute").set(0, "seconds").format("yyyy-MM-DD HH:mm:ssZ");
            let meetingDateTime = startDate.set(meetingTime.hour(), "hour").set(meetingTime.minute(), "minute").set(0, "seconds").format("yyyy-MM-DD HH:mm:ssZ");
            let event = {
                title: data.get("eventTitle"),
                description: data.get("eventDescription"),
                startingDateTime: startingDateTime,
                meetingDateTime: meetingDateTime,
                recurring: repeat,
                place: JSON.stringify(selectedPlace),
                "end_at": stopRepeatDisabled ? null : stopRepeatDateTime.format("yyyy-MM-DD HH:mm:ssZ")
            }
            if (data.get("eventTitle").length < 6)
                throw new Error(t("events.creation.titleTooShort"))

            if (data.get("eventDescription").length < 1)
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
        } catch (error) {
            setErrorSnackbar({ open: true, message: error.message })
        }
    }

    function SetViewOnClick({ place }) {
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
                        InputProps={{ startAdornment: (<InputAdornment position="start"><Event /></InputAdornment>) }}
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
                                style={{ width: "100%", height: "150px", borderRadius: "16px", zIndex: -1 }}
                                center={[selectedPlace.lat, selectedPlace.lon]}
                                zoom={15}
                                dragging={false}
                                doubleClickZoom={false}
                                scrollWheelZoom={false}
                                attributionControl={false}
                                zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <SetViewOnClick place={selectedPlace} />
                                <Marker position={[selectedPlace.lat, selectedPlace.lon]} interactive={false} />
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

                <ListItem disabled={repeat === NON_REPEAT} onClick={() => setStopRepeatDialogOpen(true)}>
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
                            setRepeat(e.target.value);
                            setRepeatDialogOpen(false);
                        }}
                        name="radio-buttons-group">
                        <FormControlLabel value={NON_REPEAT} control={<Radio />} label="Gar nicht" />
                        <FormControlLabel value={WEEKLY} control={<Radio />} label="Wöchentlich" />
                        <FormControlLabel value={FORTNIGHTLY} control={<Radio />} label="Alle 2 Wochen" />
                        <FormControlLabel value={MONTHLY} control={<Radio />} label="Monatlich" />
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
                setSelectedPlace({
                    name: place.raw.name,
                    lat: place.raw.lat,
                    lon: place.raw.lon
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

const mapStateToProps = (state) => {
    return {
        eventToEdit: state.events.eventToEdit
    }
}

export default connect(mapStateToProps)(withTranslation()(CreateEvent));