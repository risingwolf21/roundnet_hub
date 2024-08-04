import {Box, Dialog, IconButton, List, ListItem, ListItemText, TextField, Toolbar} from "@mui/material";
import {SlideUpTransition} from "../../../utils"
import {ArrowBack} from "@mui/icons-material";
import React, {useState} from "react";
import {OpenStreetMapProvider} from 'leaflet-geosearch';
import {SearchResult} from "leaflet-geosearch/dist/providers/provider";
import {RawResult} from "leaflet-geosearch/dist/providers/openStreetMapProvider";
import {toNumber} from "lodash";
import {PlaceType, SearchPlacesDialogProps} from "../types";

const SearchPlacesDialog = ({ open, handleClose, placeSelected }: SearchPlacesDialogProps) => {

    const [value, setValue] = useState("");
    const [results, setResults] = useState<SearchResult<RawResult>[]>();

    const provider = new OpenStreetMapProvider();

    const search = () => {
        provider.search({ query: value }).then(function (results) {
            setResults(results);
        });
    }

    const keyPress = (e: any) => {
        if (e.keyCode === 13) {
            search();
        }
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box>
            <Toolbar>
                <TextField
                    fullWidth
                    InputProps={{ style: { paddingLeft: 0 }, startAdornment: <IconButton onClick={handleClose}><ArrowBack /></IconButton> }}
                    sx={{ pt: 1, pb: 1, pl: 0, '& fieldset': { borderRadius: "30px" }, '& input': { pt: 1.5, pb: 1.5 }, '& div': { pl: 1 } }}
                    placeholder="Search here"
                    value={value}
                    onKeyDown={keyPress}
                    onChange={(e) => setValue(e.target.value)}
                />
            </Toolbar>
            <List>
                {
                    results && results.map((result) => <ListItem key={result.label} onClick={() => placeSelected({ name: result.raw.display_name, lat: toNumber(result.raw.lat), lon: toNumber(result.raw.lon) } as PlaceType)} divider>
                        <ListItemText primary={result.label} />
                    </ListItem>)
                }
            </List>
        </Box>
    </Dialog>
}

export default SearchPlacesDialog;