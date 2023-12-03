import { Avatar, Box, Collapse, Divider, IconButton, List, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import React, { useState } from "react";
import { Drink, DrinkCounter } from "src/types/supabaseTypes";
import DrinkItem from "./DrinkItem";
import { ExpandLess, ExpandMore, Stars } from "@mui/icons-material";


type DrinkListProps = {
    drinks: Drink[],
    onAddDrinkClick: (drink: Drink) => void,
    onRemoveDrinkClick: (drink: Drink) => void,
    addedDrinks: DrinkCounter[]
}

const DrinkList = ({ drinks, onAddDrinkClick, onRemoveDrinkClick, addedDrinks }: DrinkListProps) => {

    const [specialOpen, setSpecialOpen] = useState(false);

    return <List sx={{ width: "100%" }}>
        {
            drinks.filter((x: Drink) => !x.deleted && x.active && x.type === "Drink").map((drink: Drink, index: number) => {
                return <div key={index}>
                    <DrinkItem
                        drink={drink}
                        onAddClick={() => onAddDrinkClick(drink)}
                        onMinusClick={() => onRemoveDrinkClick(drink)}
                        count={addedDrinks[drink.id]?.count ?? 0} />
                    <Divider />
                </div>
            })
        }
        {
            drinks.filter((x: Drink) => !x.deleted && x.active && x.type === "Special").length > 0 && <>
                <ListItemButton key={"editUserRole"} onClick={() => setSpecialOpen(!specialOpen)}>
                    <ListItemAvatar>
                        <Avatar>
                            <Stars />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={"Special"} secondary={"Alles außer Getränke"} />
                    <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                            <IconButton disableRipple onClick={() => setSpecialOpen(!specialOpen)} >
                                {specialOpen ? <ExpandLess fontSize="inherit" sx={{ fontSize: "28px" }} /> : <ExpandMore fontSize="inherit" sx={{ fontSize: "28px" }} />}
                            </IconButton>
                        </Box>
                    </ListItemSecondaryAction>
                </ListItemButton>
                <Divider />
                <Collapse in={specialOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {
                            drinks.filter((x: Drink) => !x.deleted && x.active && x.type === "Special").map((drink: Drink, index: number) => {
                                return <div key={index}>
                                    <DrinkItem
                                        drink={drink}
                                        onAddClick={() => onAddDrinkClick(drink)}
                                        onMinusClick={() => onRemoveDrinkClick(drink)}
                                        count={addedDrinks[drink.id]?.count ?? 0} />
                                    <Divider />
                                </div>
                            })
                        }
                    </List>
                </Collapse>
            </>
        }
    </List>
}

export default DrinkList;
