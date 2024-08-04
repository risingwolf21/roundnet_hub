import {FullHistory} from "../../../types/supabaseTypes";
import {
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    ListSubheader,
    Typography
} from "@mui/material";
import React from "react";

export const AdminHistoryItem = ({items, header}: { items: FullHistory[], header: string }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{zIndex: "-1"}} component="div"
                                                                                  id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={header + index + "sublist"}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={item.user?.displayName}/>
                <ListItemSecondaryAction>
                    <Typography fontWeight={"bold"}>{((item.drink?.price ?? 0) * (item.count ?? 0))} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}