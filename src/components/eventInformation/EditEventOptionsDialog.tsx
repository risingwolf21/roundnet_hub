import { Box, Button, DialogContent, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { useState } from "react";
import React from "react";
import { EditEventOptionsDialogProps } from "./types";
import { SwipeableDialog } from "../SwipeableDialog";
import { CreateEventOption } from "../eventCreation/types";

export const EditEventOptionsDialog = ({ open, handleClose, setOpen }: EditEventOptionsDialogProps) => {

    const [saveEventOption, setSaveEventOption] = useState<CreateEventOption>("UpdateSingle");

    return <SwipeableDialog open={open} setOpen={setOpen} onClose={() => handleClose(null)} title={"Event aktualisieren"}>
        <DialogContent>

            <FormControl sx={{ m: 1, minWidth: 120 }}>
                <RadioGroup
                    aria-labelledby="demo-radio-buttons-group-label"
                    value={saveEventOption}
                    onChange={(e) => {
                        setSaveEventOption(e.target.value as CreateEventOption);
                    }}
                    name="radio-buttons-group">
                    <FormControlLabel value={"OnlyThis"} control={<Radio />} label={"Nur dieses Event aktualisieren"} key={"OnlyThis"} />
                    <FormControlLabel value={"EveryRecurrence"} control={<Radio />} label={"Dieses und alle folgenden Events aktualisieren"} key={"EveryRecurrence"} />
                </RadioGroup>
            </FormControl>

        </DialogContent>
        <Box sx={{ display: "flex", flexDirection: "row", flexGrow: 1, position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => handleClose(null)}>Abbrechen</Button>
            <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2 }} onClick={() => handleClose(saveEventOption)}>Bestätigen</Button>
        </Box>
    </SwipeableDialog>
}