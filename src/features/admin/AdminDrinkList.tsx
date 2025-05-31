import AddIcon from '@mui/icons-material/Add';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  LinearProgress,
  List,
  Typography,
} from '@mui/material';
import { captureException } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from '@toolpad/core/useNotifications';
import _ from 'lodash';
import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { AdminDrinksRepository } from '../../repository/AdminDrinksRepository';
import { AdminDrinkItem } from './components/AdminDrinkItem';
import EditDrinkDialog from './dialogs/EditDrinkDialog';
import { supabase } from 'src/components/services/supabase/supabaseClient';

const EMPTY_DRINK: Drink = {
  imageUrl: '',
  name: '',
  price: 0,
  active: false,
  deleted: false,
  id: 0,
  previousDrink: null,
  stock: 0,
  type: 'Drink',
};

export const useAllDrinksAsAdmin = () => useQuery<Drink[]>({
  queryKey: ["drinks", "admin"],
  queryFn: async () => {
    const result = await supabase
      .from('drink')
      .select('*');
    return result.data ?? [];
  }
});

const AdminDrinkList = () => {
  const { data: drinks = [], isLoading } = useAllDrinksAsAdmin();

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink>();
  const notifications = useNotifications();

  const selectDrink = (drink: Drink) => {
    setSelectedDrink(drink);
    setOpen(true);
  };

  const deleteDrinkDialog = (drink: Drink) => {
    setSelectedDrink(drink);
    setDeleteOpen(true);
  };

  const onDeleteDrink = (drink: Drink | undefined) => {
    if (!drink) throw Error('Could not delete Drink, because it was undefined');
    AdminDrinksRepository.deleteDrink(drink.id)
      .then(() => {
        setDeleteOpen(false);
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error, { severity: 'error' });
      });
  };

  const getDrinksHistory = (drink: Drink): Drink[] => {
    if (!drinks || !drink.previousDrink) return [];

    let prev: Drink | undefined = drinks
      .filter((x: Drink) => x.deleted)
      .find((x: Drink) => x.id === drink.previousDrink);

    if (!prev) return [];

    return [prev, ...getDrinksHistory(prev)];
  };

  const onDrinkEditFinished = (drink: Drink) => {
    if (drink.id && selectedDrink) {
      if (drink.name !== selectedDrink.name || drink.price !== selectedDrink.price) {
        AdminDrinksRepository.addDrink(_.omit({ ...drink, previousDrink: selectedDrink.id }))
          .then(() => {
            AdminDrinksRepository.updateDrink({ ...selectedDrink, deleted: true, active: false }).catch((error) => {
              captureException(error);
              notifications.show(error, { severity: 'error' });
            });
          })
          .catch((error) => {
            captureException(error);
            notifications.show(error, { severity: 'error' });
          });
      } else {
        AdminDrinksRepository.updateDrink(drink).catch((error) => {
          captureException(error);
          notifications.show(error, { severity: 'error' });
        });
      }
    } else {
      AdminDrinksRepository.addDrink(_.omit(drink)).catch((error) => {
        captureException(error);
        notifications.show(error, { severity: 'error' });
      });
    }
    setOpen(false);
  };

  return (
    <Layout>
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      <List sx={{ width: '100%', paddingBottom: 12 }}>
        {drinks
          .filter((x: Drink) => !x.deleted)
          .map((drink: Drink, index: number) => (
            <AdminDrinkItem
              key={'drink' + index}
              drink={drink}
              onEditClick={() => selectDrink(drink)}
              onDeleteClick={() => deleteDrinkDialog(drink)}
            />
          ))}
      </List>
      <Fab
        sx={{
          background: '#66bb6a',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={() => selectDrink(EMPTY_DRINK)}
      >
        <AddIcon sx={{ color: 'white' }} />
      </Fab>
      {selectedDrink && (
        <EditDrinkDialog
          drink={selectedDrink}
          drinkHistory={getDrinksHistory(selectedDrink)}
          open={open}
          handleClose={() => setOpen(false)}
          onDrinkEditFinished={onDrinkEditFinished}
        />
      )}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Getränk löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchtest du dieses Getränk wirklich löschen? Alle Nutzer mit offenen Getränken von diesem Typen werden diese
            in Ihrer Historie sehen und weiterhin zahlen müssen. Eintragen lassen sich diese Getränke jedoch nicht mehr.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
          <Button onClick={() => onDeleteDrink(selectedDrink)} autoFocus>
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AdminDrinkList;
