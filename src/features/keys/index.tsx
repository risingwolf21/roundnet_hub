import { AddOutlined, EditOffOutlined, EditOutlined } from '@mui/icons-material';
import { Alert, Box, Fab, List } from '@mui/material';
import { logEvent } from 'firebase/analytics';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchItemsAsync } from 'src/features/keys/slices/keysSlice';
import { analytics } from 'src/firebase/firebaseConfig';
import { FullItemHolder } from 'src/types/supabaseTypes';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import Layout from '../../components/Layout';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { SupabaseKeysRepository } from '../../repository/KeysRepository';
import { can } from '../../utils/PermissionService';
import { ItemHolderItem } from './components/ItemHolderItem';
import { EditOrAddItemDialog } from './dialogs/EditOrAddItemDialog';
import { ItemHistoryDialog } from './dialogs/ItemHistoryDialog';
import { KeyHandOverDialog } from './dialogs/KeyHandOverDialog';
import { SearchUserDialog } from './dialogs/SearchUserDialog';
import { ItemHolderScreenProps } from './types';

export const EMPTY_KEY: ItemUpdate = { name: '', color: '#000000', created_at: '', current_holder: null };

export const ItemHolderScreen = ({ dispatch, keyHolders, loading, user, t }: ItemHolderScreenProps) => {
  const [searchUserOpen, setSearchUserOpen] = useState(false);
  const [addOrUpdateKeysOpen, setAddOrUpdateKeysOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedKeyHolder, setSelectedKeyHolder] = useState<FullItemHolder | null>(null);
  const [isEditingMode, setEditingMode] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemUpdate | null>(null);
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [itemHistoryDialogOpen, setItemHistoryDialogOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get("type");
    const key = searchParams.get("key")
    if (!key || !type) { return; }
    const keyId = +key;
    const keyHolder = keyHolders.find(x => x.id === keyId);
    if (!keyHolder) return;

    if (type === "handover") {
      selectKeyToHandOver(keyHolder);
    }
    if (type === "take") {
      selectKeyToReceive(keyHolder);
    }
  }, [searchParams, keyHolders, user]);

  useEffect(() => {
    dispatch(fetchItemsAsync());
  }, [dispatch]);

  const userSelected = (user: User) => {
    setSearchUserOpen(false);
    setSelectedUser(user);
  };

  const confirmKeyHandOver = () => {
    if (!selectedKeyHolder || !selectedUser) {
      setAlertInfo({ message: t('keyHandOverError', { error: '' }), severity: 'error' });
      return;
    }
    SupabaseKeysRepository.giveItemToUser(selectedKeyHolder, selectedUser).then((result) => {
      if (result.error) {
        logEvent(analytics, "item_handover_error", { user: user.userId, name: user.name, error: result.error, selectedKeyHolder, selectedUser });
        setAlertInfo({ message: t('keyHandOverError', { error: result.error }), severity: 'error' });
      } else {
        logEvent(analytics, "item_handover_success", { user: user.userId, name: user.name, selectedKeyHolder, selectedUser });
        setSelectedUser(null);
        setSelectedKeyHolder(null);
        dispatch(fetchItemsAsync());
      }
    });
  };

  const selectKeyToHandOver = (key: FullItemHolder) => {
    setSearchUserOpen(true);
    setSelectedKeyHolder(key);
  };

  const selectKeyToReceive = (key: FullItemHolder) => {
    setSelectedKeyHolder(key);
    setSelectedUser(user);
  };

  return (
    <Layout>
      <LoadingIndicator loading={loading} />
      <List sx={{ width: '100%', pb: 10 }}>
        <Alert key={'alert'} sx={{ ml: 2, mr: 2, mt: 2 }} severity="info">
          Bitte euren Schlüssel gut aufbewahren und Übergaben eintragen! Wer unverschuldet den Schlüssel verloren hat
          (z.B. Diebstahl), wird von der Abteilung unterstützt. Wer den Schlüssel selbst verschuldet verliert (z.B.
          verlegt), muss für den neuen Schlüssel selbst aufkommen. Grundsätzlich ist immer die eingetragene Person für
          den Schlüssel verantwortlich!
        </Alert>
        {keyHolders.map((x: FullItemHolder) => (
          <ItemHolderItem
            key={x.id}
            x={x}
            t={t}
            user={user}
            isEditingMode={isEditingMode}
            setItemToEdit={setItemToEdit}
            setAddOrUpdateKeysOpen={setAddOrUpdateKeysOpen}
            setItemHistoryDialogOpen={setItemHistoryDialogOpen}
            selectKeyToHandOver={selectKeyToHandOver}
            selectKeyToReceive={selectKeyToReceive}
          />
        ))}
      </List>

      {can('update', 'item') && (
        <Box
          sx={{
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Fab
            sx={{ background: '#66bb6a', mr: 2 }}
            onClick={() => {
              setItemToEdit(EMPTY_KEY);
              setAddOrUpdateKeysOpen(true);
            }}
          >
            <AddOutlined sx={{ color: '#fff' }} />
          </Fab>
          <Fab sx={{ background: '#66bb6a' }} onClick={() => setEditingMode(!isEditingMode)}>
            {isEditingMode ? <EditOffOutlined sx={{ color: '#fff' }} /> : <EditOutlined sx={{ color: '#fff' }} />}
          </Fab>
        </Box>
      )}
      <ItemHistoryDialog
        open={itemHistoryDialogOpen}
        handleClose={() => setItemHistoryDialogOpen(false)}
        setOpen={() => setItemHistoryDialogOpen(true)}
        item={itemToEdit}
      />

      <SearchUserDialog
        open={searchUserOpen}
        handleClose={() => setSearchUserOpen(false)}
        user={user}
        onUserSelected={userSelected}
      />

      <KeyHandOverDialog
        user={user}
        selectedUser={selectedUser}
        selectedKeyHolder={selectedKeyHolder}
        t={t}
        setSelectedUser={setSelectedUser}
        confirmKeyHandOver={confirmKeyHandOver}
      />

      <EditOrAddItemDialog
        open={addOrUpdateKeysOpen}
        handleClose={() => {
          setAddOrUpdateKeysOpen(false);
          setEditingMode(false);
          dispatch(fetchItemsAsync());
        }}
        itemToEdit={itemToEdit}
      />

      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </Layout>
  );
};
