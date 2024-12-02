import {List, ListItem, ListItemAvatar, ListItemText, ListSubheader, Typography} from "@mui/material";
import {FullHistory} from "../../../types/supabaseTypes";
import moment from "moment";
import React from "react";
import {HistoryItemProps} from "../types";

export const HistoryItem = ({items, header, onClick}: HistoryItemProps) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader sx={{zIndex: "-1"}} component="div"
                                                                                  id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item: FullHistory, index: number) =>
                <ListItem
                    dense key={"sublist" + index}
                    onClick={() => onClick(item)}
                    secondaryAction={<Typography>{(item.count ?? 0) * (item.drink?.price ?? 1)} €</Typography>}>
                    <ListItemAvatar>
                        <Typography>{item.count} x</Typography>
                    </ListItemAvatar>
                    <ListItemText primary={item.drink?.name}
                                  secondary={moment(new Date((item.created_at ?? ""))).format("HH:mm")}/>
                </ListItem>)
        }
    </List>
}