import {Avatar, Badge, IconButton, ListItem, ListItemAvatar, ListItemText} from "@mui/material";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import React from "react";

type AdminDrinkItemProps = {
    drink: Drink,
    onEditClick: () => any,
    onDeleteClick: () => any,
}

export const AdminDrinkItem = ({drink, onEditClick, onDeleteClick}: AdminDrinkItemProps) => {
    return <ListItem divider={true} secondaryAction={<>
        <IconButton onClick={onEditClick}>
            <EditIcon fontSize={"medium"}/>
        </IconButton>
        <IconButton onClick={onDeleteClick}>
            <DeleteIcon fontSize={"medium"}/>
        </IconButton>
    </>}>
        <ListItemAvatar>
            <Badge color={drink?.active ? "success" : "warning"} variant="dot">
                <Avatar sx={{borderRadius: 2}}>
                    {
                        drink?.imageUrl
                            ? <img src={drink.imageUrl} alt="logo" width={40} height={40}/>
                            : <LocalDrinkIcon/>
                    }
                </Avatar>
            </Badge>
        </ListItemAvatar>
        <ListItemText primary={drink.name} secondary={drink.price + " €"}/>
    </ListItem>
}