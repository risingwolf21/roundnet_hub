import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import React from "react";
import { useEffect, useState } from "react"
import { supabase } from "src/components/services/supabase/supabaseClient"

type Calendar = {
  id: string;
  summaryOverride: string;
  summary?: string;
}

export const CalendarList = () => {

  const [calendarList, setCalendarList] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(result => {
      const provider_token = result.data.session?.user.user_metadata["provider_token"]
      if (provider_token) {
        fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + provider_token,
          }
        })
          .then((res) => res.json())
          .then((res) => {
            setCalendarList(res.items.map((x: Calendar) => ({ id: x.id, summaryOverride: x.summary ?? x.summaryOverride })))
          })
          .catch(err => console.error(err))
      } else {
        console.log("no provider token")
      }
    })

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