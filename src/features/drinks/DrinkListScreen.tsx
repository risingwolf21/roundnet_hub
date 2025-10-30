import { Has } from '@/hooks/useGrants';
import { useDrinks, useInsertHistoryEntryMutation } from '@/tanstack/drinks';
import { DrinkCounter } from '@/types/supabaseTypes';
import { nameOfProductType } from '@/utils';
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useEffect, useState } from 'react';
import { SwipeableDialog } from '../../components/SwipeableDialog';
import { useGrants } from '../auth/GrantsContext';
import DrinkList from './components/DrinkList';
import { LoadingDrinkItem } from './components/LoadingDrinkItem';
import VoucherCard from './components/Voucher';

import Tune from '@mui/icons-material/Tune';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

const DrinkListScreen = () => {
  const { data: drinks = [], error, isLoading } = useDrinks();
  const { user } = useGrants();

  const notifications = useNotifications();
  const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(
    (localStorage.getItem('visibleTypes')?.split(';') as ProductType[]) ?? ['Drink']
  );

  const updateHistory = useInsertHistoryEntryMutation(user);

  useEffect(() => {
    if (error) {
      notifications.show(error.message, { severity: 'error' });
    }
  }, [error, notifications]);

  const confirmDrinksDialog = (message: {
    message: string;
    severity: 'error' | 'success' | 'info' | 'warning' | undefined;
  }) => {
    notifications.show(message.message, { severity: message.severity });
  };

  const resetDrinks = (message: string) => {
    confirmDrinksDialog({ message, severity: 'error' });
    captureException(Error(message), (scope) => {
      scope.clear();
      scope.setExtra('drinks', JSON.stringify(addedDrinks));
      return scope;
    });
  };

  const confirmDrinks = async () => {
    updateHistory.mutate(
      { drinks: Object.values(addedDrinks) },
      {
        onSuccess: () => {
          setAddedDrinks([]);
          confirmDrinksDialog({ message: 'Getränke erfolgreich gebucht!', severity: 'success' });
        },
        onError: (error) => {
          captureException(error);
          const message = error?.message ?? 'Drink could not be added';
          resetDrinks(message);
        },
      }
    );
  };

  const onAddDrinkClick = (drink: Drink) => {
    const temp = addedDrinks;
    if (drink.id in temp) {
      temp[drink.id].count = temp[drink.id].count + 1;
    } else {
      temp[drink.id] = { count: 1, ...drink };
    }
    setAddedDrinks({ ...temp });
  };

  const onRemoveDrinkClick = (drink: Drink) => {
    const temp = addedDrinks;
    if (drink.id in temp) {
      if (temp[drink.id].count - 1 === 0) {
        delete temp[drink.id];
      } else {
        temp[drink.id].count = temp[drink.id].count - 1;
      }
    }
    setAddedDrinks({ ...temp });
  };

  const changeVisibleTypes = (e: React.ChangeEvent<HTMLInputElement>, x: 'Drink' | 'Special' | 'None') => {
    const newValue = e.target.checked ? [...visibleTypes, x] : visibleTypes.filter((y) => y !== x);
    setVisibleTypes(newValue);
    localStorage.setItem('visibleTypes', newValue.join(';'));
  };

  if (isLoading) {
    return Array.from({ length: 10 }, (_v, k) => k + 1).map(() => <LoadingDrinkItem />);
  }

  return (
    <>
      <VoucherCard />
      <DrinkList
        drinks={drinks}
        onAddDrinkClick={onAddDrinkClick}
        onRemoveDrinkClick={onRemoveDrinkClick}
        addedDrinks={addedDrinks}
        visibleTypes={visibleTypes}
      />
      <Has perm={'drinks.purchase'}>
        {Object.values(addedDrinks).length > 0 ? (
          <Fab
            sx={{
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            color={'secondary'}
            onClick={confirmDrinks}
          >
            {isLoading ? <CircularProgress /> : <CheckIcon sx={{ color: 'white' }} />}
          </Fab>
        ) : (
          <Fab
            sx={{
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            color={'secondary'}
            onClick={() => setFilterDialogOpen(true)}
          >
            <Tune sx={{ color: 'white' }} />
          </Fab>
        )}
      </Has>
      <SwipeableDialog
        open={filterDialogOpen}
        setOpen={setFilterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        title="Filter"
      >
        <List>
          {[...new Set(drinks.map((x) => x.type))].sort().map((x) => (
            <ListItem key={x} divider>
              <ListItemAvatar>
                <Checkbox
                  disabled={x === 'Drink'}
                  checked={visibleTypes.some((y) => y === x)}
                  onChange={(e) => changeVisibleTypes(e, x)}
                />
              </ListItemAvatar>
              <ListItemText primary={nameOfProductType(x)} />
            </ListItem>
          ))}
        </List>
      </SwipeableDialog>
    </>
  );
};

export default DrinkListScreen;
