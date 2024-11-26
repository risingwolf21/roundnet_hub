import {Avatar, ListItem, ListItemAvatar, ListItemText, Typography} from "@mui/material";
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
    else
        return (index + 1).toString()
}

export const ChallengeStatItem = ({challengeStatWithUser, index}: {
    challengeStatWithUser: ChallengeStatWithUser,
    index: number
}) => {
    return <ListItem key={challengeStatWithUser.user.userId}
                     secondaryAction={<Typography>{challengeStatWithUser.count}</Typography>}>
        <ListItemAvatar sx={{flexDirection: "row", display: "flex", alignItems: "center", mr: 2}}>
            <Avatar sx={{borderRadius: 2, backgroundColor: "transparent"}}>
                <Typography sx={{
                    fontSize: index < 3 ? "22pt" : "18pt",
                    fontWeight: "bold",
                    mr: 1,
                    color: "black"
                }}>{medalForPlace(index)}</Typography>
            </Avatar>
            <Avatar sx={{borderRadius: 2}}>
                {
                    challengeStatWithUser.user.avatarUrl
                        ?
                        <img src={challengeStatWithUser.user.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                        : <AccountBox/>
                }
            </Avatar>
        </ListItemAvatar>
        <ListItemText primaryTypographyProps={{fontWeight: "bold"}} primary={challengeStatWithUser.user.displayName}/>
    </ListItem>
}