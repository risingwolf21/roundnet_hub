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

const CreateEvent = ({ t }) => {

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
    const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: "" })

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData(e.currentTarget);
            let startingDateTime = startDate.format("yyyy-MM-DD") + " " + startTime.format("HH:mm:ss");
            let meetingDateTime = startDate.format("yyyy-MM-DD") + " " + meetingTime.format("HH:mm:ss");
            let event = {
                title: data.get("eventTitle"),
                description: data.get("eventDescription"),
                startingDateTime: startingDateTime,
                meetingDateTime: meetingDateTime,
                recurring: repeat,
                location: data.get("eventPlace"),
            }
            if (data.get("eventTitle").length)
                throw new Error(t("event.creation.titleEmpty"))
            
            if (data.get("eventDescription").length)
                throw new Error(t("event.creation.descriptionEmpty"))

            if (meetingDateTime < startingDateTime)
                throw new Error(t("event.creation.meetingTimeBeforeStartTime"))

            const { error } = await client.from("events").insert(event);

            if (error) throw error;

            navigate("/training", { replace: true });
            setErrorSnackbar({ open: false, message: "" });
        } catch (error) {
            setErrorSnackbar({ open: true, message: error.message })
        }
    }

    return <Dialog
        fullScreen
        open={true}
        onClose={() => navigate("/training", { replace: true })}
        TransitionComponent={SlideUpTransition}>
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

                <Divider sx={{ mb: 2, mt: 2 }} />

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }}>
                    <ListItemAvatar>
                        <AccessTime />
                    </ListItemAvatar>

                    <DatePicker sx={{ width: "100%" }} label="Datum" disablePast format="DD MMMM YYYY" onChange={(val) => setStartDate(val)} defaultValue={startDate} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0, mb: 2 }}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} label="Startzeit" onChange={(val) => setStartTime(val)} defaultValue={startTime} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemAvatar />

                    <TimePicker sx={{ width: "100%" }} views={['hours', 'minutes']} ampm={false} label="Treffpunkt" onChange={(val) => setMeetingTime(val)} defaultValue={meetingTime} />
                </ListItem>

                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemAvatar>
                        <Map />
                    </ListItemAvatar>

                    <TextField
                        fullWidth
                        id="eventPlace"
                        name="eventPlace"
                        variant="outlined"
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

        <Snackbar sx={{ position: "fixed", right: "16px", }} open={errorSnackbar.open} autoHideDuration={1500}>
            <Alert severity={"error"} sx={{ width: '100%' }}>
                {errorSnackbar.message}
            </Alert>
        </Snackbar>

    </Dialog >
}

export default withTranslation()(CreateEvent);