import { Tune } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import { Checkbox, CircularProgress, Fab, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { captureException } from '@sentry/react';
import React, { useEffect, useState } from 'react';
import { AlertMessage, AlertSnackbar } from 'src/components/AlertSnackbar';
import { DrinkCounter } from 'src/types/supabaseTypes';
import { nameOfProductType } from 'src/utils';
import { Error } from '../../components/Error';
import { SwipeableDialog } from '../../components/SwipeableDialog';
import DrinkList from './components/DrinkList';
import { DrinkListScreenProps } from './types';
import { SupabaseDrinkRepository } from '../../repository/DrinkRepository';
import VoucherCard from './components/Voucher';
import Layout from '../../components/Layout';
import { fetchVouchersAsync } from './slices/drinksSlice';
import { useAppDispatch } from '../../redux/store';
import { LoadingDrinkItem } from './components/LoadingDrinkItem';

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: 'Getränke erfolgreich gebucht!', severity: 'success' };

const DrinkListScreen = ({ user, drinks, drinksLoading, drinksError }: DrinkListScreenProps) => {
  const dispatch = useAppDispatch();
  const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(
    (localStorage.getItem('visibleTypes')?.split(';') as ProductType[]) ?? ['Drink']
  );

  useEffect(() => {
    if (drinksError) {
      setAlertInfo({ message: drinksError, severity: 'error' });
    }
  }, [drinksError]);

  const confirmDrinksDialog = (message: AlertMessage) => {
    setAlertInfo(message);
    setLoading(false);
  };

  const resetDrinks = (message: string) => {
    setLoading(false);
    confirmDrinksDialog({ message, severity: 'error' });
    captureException(Error({ message }), (scope) => {
      scope.clear();
      scope.setExtra('drinks', JSON.stringify(addedDrinks));
      return scope;
    });
  };

  const confirmDrinks = async () => {
    setLoading(true);
    SupabaseDrinkRepository.insertHistoryItems(Object.values(addedDrinks))
      .then(() => {
        setLoading(false);
        setAddedDrinks([]);
        confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        dispatch(fetchVouchersAsync());
      })
      .catch((error) => {
        captureException(error);
        let message = error?.message ?? 'Drink could not be added';
        resetDrinks(message);
      });
  };

  const onAddDrinkClick = (drink: Drink) => {
    var temp = addedDrinks;
    if (drink.id in temp) {
      temp[drink.id].count = temp[drink.id].count + 1;
    } else {
      temp[drink.id] = { count: 1, ...drink };
    }
    setAddedDrinks({ ...temp });
  };

  const onRemoveDrinkClick = (drink: Drink) => {
    var temp = addedDrinks;
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
    let newValue = e.target.checked ? [...visibleTypes, x] : visibleTypes.filter((y) => y !== x);
    setVisibleTypes(newValue);
    localStorage.setItem('visibleTypes', newValue.join(';'));
  };

  return (
    <Layout>
      <VoucherCard />
      {loading ? (
        Array.from({ length: 10 }, (v, k) => k + 1).map(() => <LoadingDrinkItem />)
      ) : (
        <DrinkList
          drinks={drinks}
          onAddDrinkClick={onAddDrinkClick}
          onRemoveDrinkClick={onRemoveDrinkClick}
          addedDrinks={addedDrinks}
          visibleTypes={visibleTypes}
        />
      )}
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
          {loading ? <CircularProgress /> : <CheckIcon sx={{ color: 'white' }} />}
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

      <AlertSnackbar close={() => setAlertInfo(null)} alertInfo={alertInfo} />
    </Layout>
  );
};

export default DrinkListScreen;
