import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { NON_REPEAT } from "../constants";
import { useState } from "react";
import React from "react";
import { Event } from "../types/supabase";

export const THIS_EVENT = "THIS_EVENT";
export const THIS_AND_FOLLOWING_EVENT = "THIS_AND_FOLLOWING_EVENT";

export enum DeletionType {
    ThisEvent,
    ThisAndFollowingEvents
}

type DeleteEventDialogProps = {
    open: boolean,
    handleClose: (result: DeletionType | null) => any,
    selectedEvent: Event
}

export const DeleteEventDialog = ({ open, handleClose, selectedEvent }: DeleteEventDialogProps) => {

    const [deletion, setDeletion] = useState(DeletionType.ThisEvent);

    return <Dialog open={open} onClose={() => handleClose(null)}>
        <DialogTitle>
            {
                selectedEvent.recurring === NON_REPEAT
                    ? "Delete event"
                    : "Delete recurring event"
            }
        </DialogTitle>
        {
            selectedEvent.recurring !== NON_REPEAT &&
            <DialogContent>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        value={deletion}
                        onChange={(e) => {
                            if (e.target.value === "0")
                                setDeletion(DeletionType.ThisEvent);
                            else
                                setDeletion(DeletionType.ThisAndFollowingEvents);
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