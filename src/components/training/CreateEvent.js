import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography, Grid, TextField, ListItem, ListItemAvatar, ListItemText, DialogTitle, DialogContent, FormControl, InputLabel, Select, OutlinedInput, FormControlLabel, RadioGroup, Radio, Divider, Checkbox, DialogActions } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { CalendarMonth, Close, LockClockOutlined, Map } from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";
import { useState } from "react";
import moment, { isDate, now } from "moment";
import { FORTNIGHTLY, MONTHLY, WEEKLY } from "../../constants";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { isBoolean, isNull } from "lodash";
import { useClient } from "react-supabase";

const CreateEvent = ({ }) => {

    const navigate = useNavigate();
    const client = useClient();

    const [startDateTime, setStartDateTime] = useState(moment());
    const [stopRepeatDateTime, setStopRepeatDateTime] = useState(moment());
    const [stopRepeatDisabled, setStopRepeatDisabled] = useState(true);
    const [stopRepeatDialogOpen, setStopRepeatDialogOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [repeat, setRepeat] = useState(WEEKLY);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        let event = {
            title: data.get("eventTitle"),
            description: data.get("eventDescription"),
            startingDateTime: startDateTime.format("yyyy-MM-DD HH:mm:ss"),
            recurring: repeat,
            location: data.get("eventPlace"),
        }
        await client.from("events").insert(event);
    }

    const handleRepeatClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            setRepeatDialogOpen(false);
        }
    };

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
            <Grid
                container
                p={2}
                pt={0}>
                <TextField
                    fullWidth
                    id="eventTitle"
                    name="eventTitle"
                    variant="filled"
                    label="Event-Titel"
                    margin="normal" />
                <TextField
                    fullWidth
                    id="eventDescription"
                    name="eventDescription"
                    variant="filled"
                    label="Beschreibung"
                    margin="normal" />

                <ListItem sx={{ pl: 0, pr: 0 }}>
                    <ListItemAvatar>
                        <LockClockOutlined />
                    </ListItemAvatar>

                    <DateTimePicker sx={{ mt: 2, mb: 2, width: "100%" }} label="Startzeit" onChange={(val) => setStartDateTime(val)} defaultValue={startDateTime} />
                </ListItem>

                <Divider />

                <ListItem sx={{ pl: 0, pr: 0 }} onClick={() => setRepeatDialogOpen(true)}>
                    <ListItemAvatar>
                        <EventRepeatIcon />
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung"} secondary={repeat} />
                </ListItem>

                <ListItem sx={{ pl: 0, pr: 0 }} onClick={() => setStopRepeatDialogOpen(true)}>
                    <ListItemAvatar>
                        <EventRepeatIcon />
                    </ListItemAvatar>
                    <ListItemText primary={"Wiederholung stoppen"} secondary={moment(stopRepeatDateTime).format("DD MMMM yyyy")} />
                </ListItem>

                <Divider />

                <ListItem sx={{ pl: 0, pr: 0 }}>
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

            </Grid>
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