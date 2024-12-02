import {HourglassBottom, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt} from "@mui/icons-material"
import {Box, CircularProgress, IconButton, ListItem, ListItemAvatar, ListItemText, Typography} from "@mui/material"
import {toDate} from "date-fns"
import {TFunction} from "i18next"
import React from "react"
import {SliceEvent} from "src/features/events/slices/eventsSlice"
import {answerDeadlineExpired, eventInThePast} from "src/types/supabaseTypes"

export type EventItemProps = {
    attendanceUpdating: boolean,
    event: SliceEvent,
    t: TFunction,
    onClick: () => void,
    attendEvent: () => void,
    declineEvent: () => void
}

export const EventItem = ({event, onClick, attendEvent, declineEvent, attendanceUpdating, t}: EventItemProps) => {

    return <ListItem disablePadding
                     sx={{p: 1}}
                     onClick={onClick}
                     secondaryAction={attendanceUpdating
                         ? <CircularProgress size={"22px"}/>
                         : event.userAttendance === "Waiting"
                             ? <IconButton disabled={event.isCancelled || eventInThePast(event)}>
                                 <HourglassBottom fontSize="inherit" sx={{fontSize: "28px", color: "#125db2"}}/>
                             </IconButton>
                             : <Box sx={{display: "flex", flexDirection: "row"}}>
                                 <IconButton onClick={(event) => {
                                     declineEvent();
                                     event.stopPropagation();
                                 }} disabled={event.isCancelled || eventInThePast(event)}>
                                     {
                                         event.userAttendance === "Declined"
                                             ? <ThumbDownAlt fontSize="inherit" sx={{fontSize: "28px", color: "red"}}/>
                                             : <ThumbDownOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                                     }
                                 </IconButton>
                                 <IconButton onClick={(event) => {
                                     attendEvent();
                                     event.stopPropagation();
                                 }} disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}>
                                     {
                                         event.userAttendance === "Attending"
                                             ? <ThumbUpAlt fontSize="inherit" sx={{fontSize: "28px", color: "green"}}/>
                                             : <ThumbUpOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                                     }
                                 </IconButton>
                             </Box>}>
        <ListItemAvatar>
            <Box sx={{display: "flex", flexDirection: "column", justifyContent: "left"}}>
                <Typography fontSize={10} textAlign={"center"}>
                    {
                        t('events.startDateShortMonth', {date: toDate(event.startingDateTime)}).toUpperCase()
                    }
                </Typography>
                <Typography variant="h6" fontWeight={"bold"} textAlign={"center"}>
                    {
                        t('events.startDateDay', {date: toDate(event.startingDateTime)}).toUpperCase()
                    }
                </Typography>
            </Box>
        </ListItemAvatar>
        <ListItemText primary={event.title}
                      primaryTypographyProps={{
                          style: {
                              whiteSpace: 'nowrap',
                              overflow: 'clip',
                              textOverflow: 'ellipsis'
                          }
                      }}
                      secondary={event.isCancelled ? "Event abgesagt" : t('events.startTime', {date: toDate(event.startingDateTime)})}
                      secondaryTypographyProps={{
                          style: {
                              whiteSpace: 'nowrap',
                              overflow: 'clip',
                              textOverflow: 'ellipsis'
                          }
                      }}/>
    </ListItem>
}