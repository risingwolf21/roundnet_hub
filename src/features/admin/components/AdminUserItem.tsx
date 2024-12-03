import {Avatar, Box, IconButton, ListItem, ListItemAvatar, ListItemText, Typography} from "@mui/material";
import {AccountBox, Edit, Verified} from "@mui/icons-material";
import React, {Fragment} from "react";

export const AdminUserItem = ({user, onEditClick}: { user: User, onEditClick: () => void }) => {
    return <ListItem divider
                     secondaryAction={<IconButton onClick={onEditClick}>
                         <Edit/>
                     </IconButton>}>
        <ListItemAvatar>
            <Avatar sx={{borderRadius: 2}}>
                {
                    user.avatarUrl
                        ?
                        <img src={user.avatarUrl} alt="logo" width={"100%"}
                             height={"100%"}/>
                        : <AccountBox/>
                }
            </Avatar>
        </ListItemAvatar>
        <ListItemText primary={<Fragment>
            <Box sx={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                <Typography>{user.displayName}</Typography>
                {
                    user.verified && <Verified sx={{ml: 1, color: "rgba(0, 0, 0, 0.54)", fontSize: "12px"}}/>
                }
            </Box>
        </Fragment>}
                      secondary={user.email}/>
    </ListItem>
}