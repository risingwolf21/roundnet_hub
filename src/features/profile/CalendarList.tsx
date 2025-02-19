import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import React from "react";
import { useEffect, useState } from "react"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "@toolpad/core/useNotifications";

type Calendar = {
  id: string;
  summaryOverride: string;
  summary?: string;
  accessRole: string;
}

export const CalendarList = () => {

  const { provider_token } = useAuth();
  const [calendarList, setCalendarList] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const notifications = useNotifications();

  useEffect(() => {
    if (provider_token) {
      fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + provider_token,
        }
      })
        .then((res) => res.json())
        .then((res) => {
          setCalendarList(Array.from<Calendar>(res
            .items)
            .map((x: Calendar) => ({ id: x.id, summaryOverride: x.summary ?? x.summaryOverride, accessRole: x.accessRole }))
            .filter((x: Calendar) => x.accessRole === "owner"))
        })
        .catch(err => notifications.show(err.message, { severity: "error" }))
    }
  }, []);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedCalendar(calendarList.find(x => x.id === event.target.value) ?? null)
  };

  return <Select
    labelId="demo-simple-select-label"
    id="demo-simple-select"
    value={selectedCalendar?.id}
    label="Age"
    onChange={handleChange}
  >
    {
      calendarList.map(x => <MenuItem value={x.id}>{x.summaryOverride}</MenuItem>)
    }
  </Select>
}