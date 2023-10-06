import { Box, Dialog, IconButton, List, ListItem, ListItemText, TextField, Toolbar } from "@mui/material";
import { SlideUpTransition } from "../../utils"
import { ArrowBack } from "@mui/icons-material";
import { useState } from "react";
import { OpenStreetMapProvider } from 'leaflet-geosearch';

const SearchPlacesDialog = ({ open, handleClose, placeSelected }) => {

    const [value, setValue] = useState("");
    const [results, setResults] = useState([]);

    const provider = new OpenStreetMapProvider();

    const search = () => {
        provider.search({ query: value }).then(function (results) {
            setResults(results);
        });
    }

    const keyPress = (e) => {
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
                    InputProps={{ style: { pl: 0 }, startAdornment: <IconButton onClick={handleClose}><ArrowBack /></IconButton> }}
                    sx={{ pt: 1, pb: 1, pl: 0, '& fieldset': { borderRadius: "30px" }, '& input': { pt: 1.5, pb: 1.5 }, '& div': { pl: 1 } }}
                    placeholder="Search here"
                    value={value}
                    onKeyDown={keyPress}
                    onChange={(e) => setValue(e.target.value)}
                />
            </Toolbar>
            <List>
                {
                    results.map((result) => <ListItem key={result.label} onClick={() => placeSelected(result)} divider>
                        <ListItemText primary={result.label} />
                    </ListItem>)
                }
            </List>
        </Box>
    </Dialog>
}

export default SearchPlacesDialog;