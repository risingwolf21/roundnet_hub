import { ArrowBack } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Box, Checkbox, Dialog, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux"
import { Search, SearchIconWrapper, StyledInputBase } from "./SearchBar";
import { useState } from "react";
import { useClient } from "react-supabase";
import { SlideUpTransition } from "../utils";

const SearchAndSelectUserDialog = ({ open, handleClose, handleSubmit, users, loading }) => {

    const [searchString, setSearchString] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const client = useClient();
    const dispatch = useDispatch();

    const handleChange = (e, user) => {
        console.log(selectedUsers, user)
        if (selectedUsers.includes(x => x.userId === user.userId)) {
            setSelectedUsers(selectedUsers.filter(y => y.userId !== user.userId))
        } else {
            setSelectedUsers([...selectedUsers, user])
        }
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box
            width="100%"
            direction="column"
            alignItems="center"
            justifyContent="center">
            <AppBar position="sticky">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        onClick={handleClose}>
                        <ArrowBack />
                    </IconButton>
                    <Search>
                        <SearchIconWrapper>
                            <SearchIcon />
                        </SearchIconWrapper>
                        <StyledInputBase
                            placeholder="Search…"
                            onChange={(e) => setSearchString(e.target.value)}
                            inputProps={{ 'aria-label': 'search' }}
                        />
                    </Search>
                    <Typography sx={{ ml: 2 }}>Speichern</Typography>
                </Toolbar>
            </AppBar>
            {loading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}

            <List sx={{ width: "100%" }}>
                {
                    users && users.map((user, index) => <ListItem key={index}>
                        <ListItemIcon>
                            <Checkbox checked={selectedUsers.includes(x => x.userId === user.userId)} onChange={e => handleChange(e, user)} />
                        </ListItemIcon>
                        <ListItemText>{user.displayName}</ListItemText>
                    </ListItem>)
                }
            </List>
        </Box>

    </Dialog>
}

export default SearchAndSelectUserDialog;