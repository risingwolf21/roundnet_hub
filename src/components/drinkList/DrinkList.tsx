import { Divider, List } from "@mui/material";
import React from "react";
import { Drink, DrinkCounter } from "src/types/supabaseTypes";
import DrinkItem from "./DrinkItem";


type DrinkListProps = {
    drinks: Drink[],
    onAddDrinkClick: (drink: Drink) => void,
    onRemoveDrinkClick: (drink: Drink) => void,
    addedDrinks: DrinkCounter[]
}

const DrinkList = ({ drinks, onAddDrinkClick, onRemoveDrinkClick, addedDrinks }: DrinkListProps) => {

    return <List sx={{ width: "100%" }}>
        {
            drinks.filter((x: Drink) => !x.deleted && x.active).map((drink: Drink, index: number) => {
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
}

export default DrinkList;
