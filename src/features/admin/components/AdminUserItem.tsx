import {
    Box,
    IconButton,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Typography
} from "@mui/material";
import {AccountCircle, AdminPanelSettings, Edit, EuroRounded, Liquor, Verified} from "@mui/icons-material";
import React, {Fragment} from "react";

export const AdminUserItem = ({user, onEditClick}: { user: User, onEditClick: () => void }) => {
    let color = "rgba(0, 0, 0, 0.54)";
    return <ListItem divider>
        <ListItemAvatar>
            {
                user.role === "user" && <AccountCircle htmlColor={color}/>
            }
            {
                user.role === "finance" && <EuroRounded htmlColor={color}/>
            }
            {
                user.role === "procure" && <Liquor htmlColor={color}/>
            }
            {
                user.role === "admin" && <AdminPanelSettings htmlColor={color}/>
            }
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
        <ListItemSecondaryAction>
            <IconButton onClick={onEditClick}>
                <Edit/>
            </IconButton>
        </ListItemSecondaryAction>
    </ListItem>
}