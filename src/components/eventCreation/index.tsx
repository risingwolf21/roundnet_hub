import {
    Alert,
    AppBar,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Radio,
    RadioGroup,
    Snackbar,
    TextField,
    Toolbar,
    Typography
} from "@mui/material"
import {AccessTime, Article, Close, FiberManualRecord, Map} from "@mui/icons-material";
import EventIcon from "@mui/icons-material/Event";
import {useNavigate} from 'react-router-dom';
import {DatePicker, DateTimePicker} from "@mui/x-date-pickers";
import {TimePicker} from '@mui/x-date-pickers/TimePicker';
import React, {FormEvent, Ref, useEffect, useRef, useState} from "react";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import SearchPlacesDialog from "./SearchPlacesDialog";
import {MapContainer, Marker, TileLayer, useMap} from "react-leaflet";
import {EventInsert, EventRecurrence, FullEvent} from "../../types/supabaseTypes";
import {format, isAfter, isBefore, set} from "date-fns";
import _ from "lodash";
import {CreateEventProps, PlaceType} from "./types";
import {SelectGroupDialog} from "./SelectGroupDialog";
import {dayjsFromDb, formatDateToDatabase} from "src/utils";
import {NumberInput} from "../mui/NumberInput";
import {LoadingIndicator} from "../LoadingIndicator";

const emptyEvent = {
    title: "",
    description: "",
    startingDateTime: formatDateToDatabase(set(new Date(), {seconds: 0, milliseconds: 0})),
    meetingDateTime: null,
    endDateTime: null,
    recurrence: "None",
    maxAttendees: -1,
} as FullEvent;

const CreateEvent = ({t, eventToEdit, repository, option}: CreateEventProps) => {

    const navigate = useNavigate();

    const [editedEvent, setEditedEvent] = useState<FullEvent>(eventToEdit ?? emptyEvent);
    const [loading, setLoading] = useState(false);
    const [selectGroupOpen, setSelectGroupOpen] = useState(false);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [searchPlacesDialogOpen, setSearchPlacesDialogOpen] = useState(false);
    const [errorSnackbar, setErrorSnackbar] = useState({open: false, message: ""});
    const [selectedPlace, setSelectedPlace] = useState<PlaceType>({
        lat: 49.0226481,
        lon: 8.416547971872856,
        name: "MTV Karlsruhe"
    });
    const ref = useRef<Ref<HTMLFormElement>>();

    useEffect(() => {
        if (eventToEdit) {
            setEditedEvent(eventToEdit);
        }
    }, [eventToEdit]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setLoading(true);
            const data = new FormData(e.currentTarget);

            if (!editedEvent.meetingDateTime)
                setEditedEvent({...editedEvent, meetingDateTime: editedEvent.startingDateTime});

            if (!editedEvent.endDateTime)
                setEditedEvent({...editedEvent, endDateTime: editedEvent.meetingDateTime});

            let eventTitle = data.get("eventTitle")?.toString();
            let eventDescription = data.get("eventDescription")?.toString();
            let event = {
                ...(_.omit(editedEvent, ["fullGroup", "attendance", "comments", "userAttendance", "attendanceUpdating"])),
                title: eventTitle,
                startingDateTime: editedEvent.startingDateTime,
                description: eventDescription,
                place: JSON.stringify(selectedPlace),
            } as EventInsert;

            if (!event.startingDateTime)
                throw new Error(t("events.creation.startDateCannotBeNull"))

            if (!event.group)
                throw new Error(t("events.creation.noGroupSelected"))

            if (event.answerDeadline && isBefore(event.answerDeadline, Date.now()))
                throw new Error(t("events.creation.answerDeadlineBeforeNow"))

            if (event.answerDeadline && isAfter(event.answerDeadline, event.startingDateTime))
                throw new Error(t("events.creation.answerDeadlineAfterStart"))

            if (!event.title || event.title.length < 6)
                throw new Error(t("events.creation.titleTooShort"))

            if (!event.description || event.description.length < 1)
                throw new Error(t("events.creation.descriptionEmpty"))

            if (event.meetingDateTime)
                if (isAfter(event.meetingDateTime, event.startingDateTime))
                    throw new Error(t("events.creation.meetingTimeBeforeStartTime"))

            if (option === "InsertEvent") {
                // create new event as there is no option
                const {error} = await repository.insertEvent(event)

                if (error) throw error;
            } else if (option === "UpdateSingle") {
                const {error} = await repository.updateEvent(event.id ?? -1, event)

                if (error) throw error;

            } else if (option === "UpdateRecurrence") {
                const {error} = await repository.updateEventAndAllRecurrences(event)

                if (error) throw error;
            } else {
                throw Error("There was no option provided wether this is a new event, to update only this or every recurring event. Please try again!")
            }
            setLoading(false);
            navigate("/training", {replace: true});
            setErrorSnackbar({open: false, message: ""});
        } catch (error: unknown) {
            const message = error instanceof Error ? (error as Error).message : "Unknown error."
            setErrorSnackbar({open: true, message})
        }
    }

    function SetViewOnClick({place}: { place: PlaceType }) {
        const map = useMap();
        map.setView({lat: place.lat, lng: place.lon}, map.getZoom());

        return null;
    }

    return <Box>
        <LoadingIndicator loading={loading}/>
        <Box ref={ref} component="form" onSubmit={handleSubmit} noValidate>
            <AppBar position="sticky" sx={{position: "relative"}}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate("/training", {replace: true})}
                        aria-label="close">
                        <Close/>
                    </IconButton>
                    <Typography sx={{ml: 2, flex: 1}} variant="h6" component="div">
                        Event {eventToEdit ? "bearbeiten" : "erstellen"}
                    </Typography>
                    <Button autoFocus color="inherit" type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <List>
                <ListItem sx={{pt: 0, pb: 0}} key={"title"}>
                    <TextField
                        fullWidth
                        defaultValue={editedEvent.title}
                        id="eventTitle"
                        name="eventTitle"
                        variant="standard"
                        label="Event-Titel"
                        InputProps={{startAdornment: (<InputAdornment position="start"><EventIcon/></InputAdornment>)}}
                        margin="normal"/>
                </ListItem>
                <ListItem sx={{pt: 0, pb: 0}} key={"eventDescription"}>
                    <TextField
                        fullWidth
                        multiline
                        defaultValue={editedEvent.description}
                        id="eventDescription"
                        name="eventDescription"
                        variant="standard"
                        label="Beschreibung"
                        InputProps={{startAdornment: (<InputAdornment position="start"><Article/></InputAdornment>)}}
                        margin="normal"/>
                </ListItem>

                <ListItemButton onClick={() => setSelectGroupOpen(true)} key={"group"}>
                    <ListItemAvatar>
                        {
                            editedEvent.fullGroup && <FiberManualRecord sx={{color: editedEvent.fullGroup.color}}/>
                        }
                    </ListItemAvatar>
                    <ListItemText primary={editedEvent.fullGroup?.name ?? "Keine Gruppe gewählt"}
                                  secondary={editedEvent.fullGroup?.description}/>
                </ListItemButton>

                <Divider sx={{mb: 2, mt: 2}}/>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"startDate"}>
                    <ListItemAvatar>
                        <AccessTime/>
                    </ListItemAvatar>

                    <DatePicker sx={{width: "100%"}} label="Datum" disablePast format="DD MMMM YYYY"
                                onChange={(val) => setEditedEvent({
                                    ...editedEvent,
                                    startingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), {
                                        date: val?.date(),
                                        year: val?.year(),
                                        month: val?.month(),
                                        seconds: 0,
                                        milliseconds: 0
                                    }))
                                })} value={dayjsFromDb(editedEvent.startingDateTime)}/>
                </ListItem>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"startTime"}>
                    <ListItemAvatar/>

                    <TimePicker sx={{width: "100%"}} views={['hours', 'minutes']} ampm={false} label="Startzeit"
                                onChange={(val) => setEditedEvent({
                                    ...editedEvent,
                                    startingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), {
                                        hours: val?.hour(),
                                        minutes: val?.minute(),
                                        seconds: 0,
                                        milliseconds: 0
                                    }))
                                })} value={dayjsFromDb(editedEvent.startingDateTime)}/>
                </ListItem>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"meetingTime"}>
                    <ListItemAvatar>
                        <Checkbox sx={{pl: 0}} checked={editedEvent.meetingDateTime !== null}
                                  onChange={() => setEditedEvent({
                                      ...editedEvent,
                                      meetingDateTime: editedEvent.meetingDateTime !== null ? null : formatDateToDatabase(new Date())
                                  })}/>
                    </ListItemAvatar>

                    <TimePicker slotProps={{textField: {error: false}}} disabled={editedEvent.meetingDateTime === null}
                                sx={{width: "100%"}} views={['hours', 'minutes']}
                                ampm={false} maxTime={dayjsFromDb(editedEvent.startingDateTime)} label="Treffpunkt"
                                onChange={(val) => setEditedEvent({
                                    ...editedEvent,
                                    meetingDateTime: formatDateToDatabase(set(new Date(editedEvent.startingDateTime), {
                                        hours: val?.hour(),
                                        minutes: val?.minute(),
                                        seconds: 0,
                                        milliseconds: 0
                                    }))
                                })}
                                value={editedEvent.meetingDateTime ? dayjsFromDb(editedEvent.meetingDateTime) : null}/>
                </ListItem>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"endDateTime"}>
                    <ListItemAvatar>
                        <Checkbox sx={{pl: 0}} checked={editedEvent.endDateTime !== null}
                                  onChange={() => setEditedEvent({
                                      ...editedEvent,
                                      endDateTime: editedEvent.endDateTime !== null ? null : editedEvent.startingDateTime
                                  })}/>
                    </ListItemAvatar>

                    <DateTimePicker slotProps={{textField: {error: false}}} disabled={editedEvent.endDateTime === null}
                                    sx={{width: "100%"}} views={['year', 'month', 'day', 'hours', 'minutes']}
                                    ampm={false} minDateTime={dayjsFromDb(editedEvent.startingDateTime)} label="Ende"
                                    onChange={(val) => setEditedEvent({
                                        ...editedEvent,
                                        endDateTime: formatDateToDatabase(set(new Date(), {
                                            year: val?.year(),
                                            month: val?.month(),
                                            date: val?.date(),
                                            hours: val?.hour(),
                                            minutes: val?.minute(),
                                            seconds: 0,
                                            milliseconds: 0
                                        }))
                                    })} value={editedEvent.endDateTime ? dayjsFromDb(editedEvent.endDateTime) : null}/>
                </ListItem>

                <ListItem onClick={() => setSearchPlacesDialogOpen(true)} key={"searchPlace"}>
                    <ListItemAvatar>
                        <Map/>
                    </ListItemAvatar>

                    <ListItemText primary={selectedPlace?.name ?? "Nothing selected"}/>
                </ListItem>
                <ListItem sx={{'&.MuiListItem-root': {pb: 1, pt: 0}}} onClick={() => setSearchPlacesDialogOpen(true)}
                          key={"searchPlaceMap"}>
                    <ListItemAvatar>
                    </ListItemAvatar>
                    <ListItemText>
                        <Box sx={{width: "100%", height: "150px"}}>
                            <MapContainer
                                center={[selectedPlace.lat, selectedPlace.lon]}
                                zoom={15}
                                dragging={false}
                                doubleClickZoom={false}
                                scrollWheelZoom={false}
                                attributionControl={false}
                                zoomControl={false}
                                style={{width: "100%", height: "150px", borderRadius: "16px", zIndex: -1}}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                                <SetViewOnClick place={selectedPlace}/>
                                <Marker position={[selectedPlace.lat, selectedPlace.lon]}/>
                            </MapContainer>
                        </Box>
                    </ListItemText>
                </ListItem>

                <Divider/>

                <ListItem onClick={() => setRepeatDialogOpen(true)} key={"recurrence"}>
                    <ListItemAvatar>
                        <EventRepeatIcon/>
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung"} secondary={editedEvent.recurrence}/>
                </ListItem>

                <ListItem disabled={editedEvent.recurrence === "None"} onClick={() => setStopRepeatDialogOpen(true)}
                          key={"stopRecurrence"}>
                    <ListItemAvatar/>
                    <ListItemText primary={"Wiederholung stoppen"}
                                  secondary={!editedEvent.recurrenceEnd ? "Niemals" : format(editedEvent.recurrenceEnd, "dd MMM yyyy")}/>
                </ListItem>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"answerDeadline"}>
                    <ListItemAvatar>
                        <Checkbox sx={{pl: 0}} checked={editedEvent.answerDeadline !== null}
                                  onChange={() => setEditedEvent({
                                      ...editedEvent,
                                      answerDeadline: editedEvent.answerDeadline ? null : formatDateToDatabase(set(Date.now(), {
                                          seconds: 0,
                                          milliseconds: 0
                                      }))
                                  })}/>
                    </ListItemAvatar>

                    <DateTimePicker slotProps={{textField: {error: false}}}
                                    disabled={editedEvent.answerDeadline === null} sx={{width: "100%"}}
                                    label="Answer deadline" disablePast ampm={false} format="DD MMMM YYYY HH:mm"
                                    onChange={(val) => setEditedEvent({
                                        ...editedEvent,
                                        answerDeadline: formatDateToDatabase(set(new Date(editedEvent.answerDeadline ?? ""), {
                                            date: val?.date(),
                                            month: val?.month(),
                                            year: val?.year(),
                                            hours: val?.hour(),
                                            minutes: val?.minute(),
                                            seconds: 0,
                                            milliseconds: 0
                                        }))
                                    })}
                                    value={editedEvent.answerDeadline ? dayjsFromDb(editedEvent.answerDeadline) : null}/>
                </ListItem>

                <ListItem sx={{pt: 0, pb: 0, mb: 2}} key={"maxAttendees"}>
                    <ListItemAvatar>
                        <Checkbox sx={{pl: 0}}
                                  checked={editedEvent.maxAttendees !== null && editedEvent.maxAttendees > 0}
                                  onChange={() => setEditedEvent({
                                      ...editedEvent,
                                      maxAttendees: editedEvent.maxAttendees === null || editedEvent.maxAttendees === 0 ? 1 : null
                                  })}/>
                    </ListItemAvatar>

                    <NumberInput
                        fullWidth
                        disabled={!editedEvent.maxAttendees}
                        value={editedEvent.maxAttendees ?? undefined}
                        onChange={(event, val) => {
                            if (event.type === 'click')
                                setEditedEvent({...editedEvent, maxAttendees: val ?? 0});
                        }}
                        placeholder="Max number of attendees"/>
                </ListItem>

            </List>
        </Box>
        <Dialog open={repeatDialogOpen} onClose={() => setRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>
                <FormControl sx={{m: 1, minWidth: 120}}>
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        value={editedEvent.recurrence}
                        onChange={(e) => {
                            setEditedEvent({...editedEvent, recurrence: e.target.value as EventRecurrence})
                            setRepeatDialogOpen(false);
                        }}
                        name="radio-buttons-group">
                        {
                            Array.from<{ value: EventRecurrence, label: string }>([
                                {value: "None", label: "Gar nicht"},
                                {value: "Weekly", label: "Wöchentlich"},
                                {value: "Fortnightly", label: "Alle 2 Wochen"},
                                {value: "Monthly", label: "Monatlich"},
                            ])
                                .map(item => <FormControlLabel value={item.value} control={<Radio/>} label={item.label}
                                                               key={item.value}/>)
                        }
                    </RadioGroup>
                </FormControl>
            </DialogContent>
        </Dialog>

        <Dialog open={stopRepeatDialogOpen} onClose={() => setStopRepeatDialogOpen(false)}>
            <DialogTitle>Wiederholung</DialogTitle>
            <DialogContent>

                <FormControlLabel control={<Checkbox checked={editedEvent.recurrenceEnd === null}
                                                     onChange={() => setEditedEvent({
                                                         ...editedEvent,
                                                         recurrenceEnd: editedEvent.recurrenceEnd ? null : formatDateToDatabase(set(Date.now(), {
                                                             seconds: 0,
                                                             milliseconds: 0
                                                         }))
                                                     })}/>} label="Niemals"/>

                <DatePicker sx={{mt: 2, mb: 2, width: "100%"}} label="Start"
                            disabled={editedEvent.recurrenceEnd === null}
                            onChange={(val) => setEditedEvent({
                                ...editedEvent,
                                recurrenceEnd: formatDateToDatabase(set(editedEvent.recurrenceEnd ? new Date(editedEvent.recurrenceEnd) : Date.now(), {
                                    date: val?.date(),
                                    month: val?.month(),
                                    year: val?.year(),
                                    hours: 0,
                                    minutes: 0,
                                    seconds: 0,
                                    milliseconds: 0
                                }))
                            })} value={editedEvent.recurrenceEnd ? dayjsFromDb(editedEvent.recurrenceEnd) : null}/>

                <Typography>Es werden Termine erstellt bis einschließlich diesem Tag. Alles danach entfällt</Typography>

            </DialogContent>
            <DialogActions>
                <Button onClick={() => setStopRepeatDialogOpen(false)}>Bestätigen</Button>
            </DialogActions>
        </Dialog>

        <SelectGroupDialog open={selectGroupOpen}
                           handleClose={() => setSelectGroupOpen(false)}
                           handleSubmit={(group) => {
                               setEditedEvent({...editedEvent, group: group.id, fullGroup: group})
                               setSelectGroupOpen(false);
                           }}/>

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
            }}/>

        <Snackbar sx={{position: "fixed", right: "16px",}} open={errorSnackbar.open} autoHideDuration={1500}>
            <Alert severity={"error"} sx={{width: '100%'}}>
                {errorSnackbar.message}
            </Alert>
        </Snackbar>
    </Box>
}

export default CreateEvent;