import { Divider, List, ListSubheader } from '@mui/material';
import React from 'react';
import { DrinkCounter } from '@/types/supabaseTypes';
import DrinkItem from './DrinkItem';
import { groupBy, nameOfProductType } from '@/utils';

type DrinkListProps = {
  drinks: Drink[];
  onAddDrinkClick: (drink: Drink) => void;
  onRemoveDrinkClick: (drink: Drink) => void;
  addedDrinks: DrinkCounter[];
  visibleTypes: ProductType[];
};

const DrinkList = ({ drinks, onAddDrinkClick, onRemoveDrinkClick, addedDrinks, visibleTypes }: DrinkListProps) => {
  return (
    <List sx={{ pb: 10 }}>
      {Array.from(
        groupBy(
          drinks.filter((x: Drink) => !x.deleted && x.active && visibleTypes.some((y) => y === x.type)),
          (x) => x.type
        )
      )
        .sort()
        .map(([key, mappedDrinks]) => (
          <List
            key={key}
            subheader={
              <ListSubheader
                sx={{ zIndex: '-1', fontWeight: 'bold', lineHeight: 'normal', my: 1 }}
                id="nested-list-subheader"
              >
                {nameOfProductType(key as ProductType)}
              </ListSubheader>
            }
          >
            {mappedDrinks.map((drink: Drink, index: number) => (
              <div key={key + index}>
                <DrinkItem
                  drink={drink}
                  onAddClick={() => onAddDrinkClick(drink)}
                  onMinusClick={() => onRemoveDrinkClick(drink)}
                  count={addedDrinks[drink.id]?.count ?? 0}
                />
                <Divider />
              </div>
            ))}
          </List>
        ))}
    </List>
  );
};

export default DrinkList;
