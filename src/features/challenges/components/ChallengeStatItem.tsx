import {Avatar, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography} from "@mui/material";
import {AccountBox} from "@mui/icons-material";
import React from "react";
import {ChallengeStatWithUser} from "../../../types/supabaseTypes";

const medalForPlace = (index: number) => {
    if (index === 0)
        return "🥇"
    else if (index === 1)
        return "🥈"
    else if (index === 2)
        return "🥉"
    return ""
}

export const ChallengeStatItem = ({challengeStatWithUser, index}: {
    challengeStatWithUser: ChallengeStatWithUser,
    index: number
}) => {
    return <ListItem key={challengeStatWithUser.user.userId}>
        <ListItemAvatar>
            <Avatar sx={{borderRadius: 2}}>
                {
                    challengeStatWithUser.user.avatarUrl
                        ?
                        <img src={challengeStatWithUser.user.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                        : <AccountBox/>
                }
            </Avatar>
        </ListItemAvatar>
        <ListItemText primary={challengeStatWithUser.user.displayName + " " + medalForPlace(index)}/>
        <ListItemSecondaryAction>
            <Typography>{challengeStatWithUser.count}</Typography>
        </ListItemSecondaryAction>
    </ListItem>
}