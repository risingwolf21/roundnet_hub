import { Close } from "@mui/icons-material";
import { AppBar, Box, Button, Checkbox, CircularProgress, Dialog, Grid, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Slide, Toolbar, Typography } from "@mui/material";
import React, { useState } from "react";
import { connect } from "react-redux";
import { isLoaded, withFirestore } from "react-redux-firebase";
import { compose, lifecycle, withHandlers } from "recompose";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const users = "users";

const AddPaymentsForEveryoneDialog = ({ open, handleClose, users, onUsersSelected }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);

    const handleUserClick = (user) => {
        if (!selectedUsers.includes(user)) {
            setSelectedUsers([...selectedUsers, user]);
        } else {
            setSelectedUsers([...selectedUsers.filter(x => x !== user)]);
        }
    }

    const handleSubmit = () => {
        onUsersSelected(selectedUsers);
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}>
        <Box>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Zahlungen starten
                    </Typography>
                    <Button autoFocus color="inherit" onClick={handleSubmit}>
                        Ausführen
                    </Button>
                </Toolbar>
            </AppBar>
            {
                isLoaded(users) && users && <List>
                    {
                        users.map((user, index) => {
                            const labelId = `checkbox-list-label-${index}`;
                            return <ListItemButton role={undefined} onClick={() => handleUserClick(user)}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedUsers.includes(user)}
                                        tabIndex={-1}
                                        disableRipple
                                        inputProps={{ 'aria-labelledby': labelId }} />
                                </ListItemIcon>
                                <ListItemText primary={user?.displayName ? user.displayName : user.email} secondary={user.email} />
                            </ListItemButton>
                        })
                    }
                </List>
            }
            {
                !isLoaded(users) && <Grid
                    container
                    width="100%"
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ overflow: "auto" }}>
                    <CircularProgress />
                </Grid>
            }
        </Box>
    </Dialog>
}

const enhance = compose(
    withFirestore,
    withHandlers({
        loadUsers: (props) => () => props.firestore.get({ collection: "users", storeAs: users })
    }),
    lifecycle({
        componentDidMount() {
            this.props.loadUsers();
            this.props.firestore.setListener("users");
        }
    }),
    connect((state) => ({
        users: state.firestore.ordered.users,
    }))
);

export default enhance(AddPaymentsForEveryoneDialog);