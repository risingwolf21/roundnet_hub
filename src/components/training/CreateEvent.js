import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography, TextField, ListItem, ListItemAvatar, ListItemText, DialogTitle, DialogContent, FormControl, FormControlLabel, RadioGroup, Radio, Divider, Checkbox, DialogActions, List, InputAdornment } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { AccessTime, Article, Close, Event, Map } from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";
import { useState } from "react";
import moment from "moment";
import { FORTNIGHTLY, MONTHLY, WEEKLY } from "../../constants";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { toInteger } from "lodash";
import { useClient } from "react-supabase";

const CreateEvent = () => {

    const navigate = useNavigate();
    const client = useClient();

    const [startDateTime, setStartDateTime] = useState(moment());
    const [stopRepeatDateTime, setStopRepeatDateTime] = useState(moment());
    const [stopRepeatDisabled, setStopRepeatDisabled] = useState(true);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [repeat, setRepeat] = useState(WEEKLY);
    const [meetingTime, setMeetingTime] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        let event = {
            title: data.get("eventTitle"),
            description: data.get("eventDescription"),
            startingDateTime: startDateTime.format("yyyy-MM-DD HH:mm:ss"),
            meetingDateTime: startDateTime.add(meetingTime, "minutes").format("yyyy-MM-DD HH:mm:ss"),
            recurring: repeat,
            location: data.get("eventPlace"),
        }
        await client.from("events").insert(event);
    }

    const handleMeetingTimeChange = (event) => {
        event.preventDefault();
        if (event.target.value < 60) {
            setMeetingTime(toInteger(event.target.value));
        }
    }

    return <Dialog
        fullScreen
        open={true}
        onClose={() => navigate("/training")}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate("/training")}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Event erstellen
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
                        id="eventDescription"
                        name="eventDescription"
                        variant="standard"
                        label="Beschreibung"
                        InputProps={{ startAdornment: (<InputAdornment position="start"><Article /></InputAdornment>) }}
                        margin="normal" />
                </ListItem>

                <Divider />

                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemAvatar>
                        <AccessTime />
                    </ListItemAvatar>

                    <DateTimePicker sx={{ mt: 2, mb: 2, width: "100%" }} label="Startzeit" onChange={(val) => setStartDateTime(val)} defaultValue={startDateTime} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemAvatar />

                    <TextField
                        fullWidth
                        type="number"
                        id="meetingTime"
                        name="meetingTime"
                        variant="standard"
                        value={meetingTime}
                        onChange={handleMeetingTimeChange}
                        label="Treffpunkt vor Training (Minuten)"
                        margin="normal" />
                </ListItem>

                <ListItem>
                    <ListItemAvatar>
                        <Map />
                    </ListItemAvatar>

                    <TextField
                        fullWidth
                        id="eventPlace"
                        name="eventPlace"
                        variant="standard"
                        label="Ort"
                        margin="normal" />
                </ListItem>

                <Divider />

                <ListItem onClick={() => setRepeatDialogOpen(true)}>
                    <ListItemAvatar>
                        <EventRepeatIcon />
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung"} secondary={repeat} />
                </ListItem>

                <ListItem onClick={() => setStopRepeatDialogOpen(true)}>
                    <ListItemAvatar />
                    <ListItemText primary={"Wiederholung stoppen"} secondary={moment(stopRepeatDateTime).format("DD MMMM yyyy")} />
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

                <FormControlLabel control={<Checkbox value={stopRepeatDisabled} onChange={(e) => setStopRepeatDisabled(e.target.checked)} />} label="Niemals" />

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
    </Dialog >
}

export default CreateEvent;