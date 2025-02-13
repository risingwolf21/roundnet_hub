import { Close, NotificationsRounded } from "@mui/icons-material";
import { AppBar, Box, Button, Card, CardActionArea, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, MenuItem, Radio, Select, SelectChangeEvent, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React, { useEffect, useState } from "react";
import { SwipeableDialog } from "src/components/SwipeableDialog";

type Calendar = {
  id: string;
  summaryOverride: string;
  summary?: string;
}

type CalendarSettingsPayload = {
  provider_token: string | null
}
export type CalendarSettingsResult = {
  calendar_id: string | null;
  minutes_to_remind: number | null;
}
export const CalendarSettingsDialog = ({ payload, open, onClose }: DialogProps<CalendarSettingsPayload, CalendarSettingsResult | null>) => {

  const [reminderOpen, setReminderOpen] = useState(false);
  const [minutesToRemind, setMinutesToRemind] = useState<number | null>(null)
  const [calendarList, setCalendarList] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);

  useEffect(() => {
    if (payload.provider_token) {
      fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + payload.provider_token,
        }
      })
        .then((res) => {
          if (res.ok)
            return res.json();
          return null
        })
        .then((res) => {
          if (res) {
            setCalendarList(res.items.map((x: Calendar) => ({ id: x.id, summaryOverride: x.summary ?? x.summaryOverride })))
          }
        })
        .catch(err => console.error(err))
    }
  }, [payload.provider_token]);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedCalendar(calendarList.find(x => x.id === event.target.value) ?? null)
  };


  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => onClose(null)}>
          <Close />
        </IconButton>
        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
          Kalender-Einstellungen
        </Typography>
        <Button autoFocus color="inherit" onClick={() => onClose({ calendar_id: selectedCalendar?.id ?? null, minutes_to_remind: minutesToRemind })}>
          Speichern
        </Button>
      </Toolbar>
    </AppBar>
    {
      (<Box sx={{ p: 2 }}>
        <Select
          fullWidth
          value={selectedCalendar?.id}
          label="Kalendar"
          onChange={handleChange}
        >
          {
            calendarList.map(x => <MenuItem value={x.id}>{x.summaryOverride}</MenuItem>)
          }
          <MenuItem value={undefined}>Nicht in Kalendar eintragen</MenuItem>
        </Select>
        <Card sx={{ borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
            <ListItem onClick={() => setReminderOpen(true)}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <NotificationsRounded />
              </ListItemAvatar>
              <ListItemText primary={minutesToRemind ? `${minutesToRemind} Minuten vor dem Event` : "Keine Benachrichtigung vor dem Event"} />
            </ListItem>
          </CardActionArea>
        </Card>
        <SwipeableDialog
          open={reminderOpen}
          onClose={() => setReminderOpen(false)}
          setOpen={() => setReminderOpen(true)}
          title={'Benachrichtigung vor dem Event'}
        >
          <List>
            {[null, 30, 60, 90, 120].map((x, index) => (
              <ListItemButton
                key={index}
                onClick={() => {
                  setMinutesToRemind(x);
                  setReminderOpen(false);
                }}
              >
                <ListItemAvatar>
                  <Radio checked={x === minutesToRemind}></Radio>
                </ListItemAvatar>
                <ListItemText primary={x ? `${x} Minuten` : "Keine Benachrichtigung vor dem Event"} />
              </ListItemButton>
            ))}
          </List>
        </SwipeableDialog>
      </Box>)
    }
  </Dialog>
}