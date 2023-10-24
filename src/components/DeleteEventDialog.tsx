import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { useState } from "react";
import React from "react";
import { Event } from "../types/supabaseTypes";
import { DeleteEventType } from "./training/EventInformation";

export const THIS_EVENT = "THIS_EVENT";
export const THIS_AND_FOLLOWING_EVENT = "THIS_AND_FOLLOWING_EVENT";

export enum DeletionType {
    ThisEvent,
    ThisAndFollowingEvents
}

type DeleteEventDialogProps = {
    open: boolean,
    handleClose: (result: DeleteEventType | null) => any,
    selectedEvent: Event
}

export const DeleteEventDialog = ({ open, handleClose, selectedEvent }: DeleteEventDialogProps) => {

    const [deletion, setDeletion] = useState<DeleteEventType>("This Event");

    return <Dialog open={open} onClose={() => handleClose(null)}>
        <DialogTitle>
            {
                selectedEvent.recurrence === "None"
                    ? "Delete event"
                    : "Delete recurring event"
            }
        </DialogTitle>
        {
            selectedEvent.recurrence !== "None" &&
            <DialogContent>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        value={deletion}
                        onChange={(e) => {
                            if (e.target.value === "0")
                                setDeletion("This Event");
                            else
                                setDeletion("This and following events");
                        }}
                        name="radio-buttons-group">
                        <FormControlLabel value={DeletionType.ThisEvent} control={<Radio />} label="This event" />
                        <FormControlLabel value={DeletionType.ThisAndFollowingEvents} control={<Radio />} label="This and following events" />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
        }
        <DialogActions>
            <Button onClick={() => handleClose(null)}>Cancel</Button>
            <Button onClick={() => handleClose(deletion)}>Delete</Button>
        </DialogActions>
    </Dialog>
}