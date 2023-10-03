import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { NON_REPEAT } from "../constants";
import { useState } from "react";

export const THIS_EVENT = "THIS_EVENT";
export const THIS_AND_FOLLOWING_EVENT = "THIS_AND_FOLLOWING_EVENT";

export const DeleteEventDialog = ({ open, handleClose, selectedEvent }) => {

    const [deletion, setDeletion] = useState(THIS_EVENT);

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
                        defaultValue={deletion}
                        onChange={(e) => {
                            setDeletion(e.target.value);
                        }}
                        name="radio-buttons-group">
                        <FormControlLabel value={THIS_EVENT} control={<Radio />} label="This event" />
                        <FormControlLabel value={THIS_AND_FOLLOWING_EVENT} control={<Radio />} label="This and following events" />
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