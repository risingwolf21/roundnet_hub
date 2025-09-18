import { AddOutlined, EditOffOutlined, EditOutlined } from '@mui/icons-material';
import { Alert, Box, Fab, List } from '@mui/material';
import { captureException } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useAllItems, useHandoverKeyMutation } from '@/tanstack/items';
import Layout from '../../components/layout/Layout';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { useGrants } from '../auth/GrantsContext';
import { ItemHolderItem } from './components/ItemHolderItem';
import { EditOrAddItemDialog } from './dialogs/EditOrAddItemDialog';
import { ItemHistoryDialog } from './dialogs/ItemHistoryDialog';
import { KeyHandOverDialog } from './dialogs/KeyHandOverDialog';
import { SearchUserDialog } from './dialogs/SearchUserDialog';
import { Has } from '@/hooks/useGrants';

const EMPTY_KEY: ItemUpdate = { name: '', color: '#000000', created_at: '', current_holder: null };

const ItemHolderScreen = () => {
  const [searchUserOpen, setSearchUserOpen] = useState(false);
  const [addOrUpdateKeysOpen, setAddOrUpdateKeysOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedKeyHolder, setSelectedKeyHolder] = useState<FullItemHolder | null>(null);
  const [isEditingMode, setEditingMode] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemUpdate | null>(null);
  const [searchParams] = useSearchParams();

  const notifications = useNotifications();
  const dialogs = useDialogs();
  const { user, hasPerm } = useGrants();
  const { t } = useTranslation();

  const handoverKeyMutation = useHandoverKeyMutation();
  const { data: keyHolders = [], isLoading, refetch } = useAllItems();

  const selectKeyToHandOver = useCallback((key: FullItemHolder) => {
    setSearchUserOpen(true);
    setSelectedKeyHolder(key);
  }, []);

  const selectKeyToReceive = useCallback(
    (key: FullItemHolder) => {
      setSelectedKeyHolder(key);
      setSelectedUser(user);
    },
    [user]
  );

  useEffect(() => {
    if (!hasPerm('items.update.holder')) return;
    const type = searchParams.get('type');
    const key = searchParams.get('key');
    if (!key || !type) {
      return;
    }
    const keyId = +key;
    const keyHolder = keyHolders.find((x) => x.id === keyId);
    if (!keyHolder) return;

    if (type === 'handover') {
      selectKeyToHandOver(keyHolder);
    }
    if (type === 'take') {
      selectKeyToReceive(keyHolder);
    }
  }, [searchParams, keyHolders, user, selectKeyToReceive, selectKeyToHandOver, hasPerm]);

  const userSelected = (user: User) => {
    setSearchUserOpen(false);
    setSelectedUser(user);
  };

  const confirmKeyHandOver = () => {
    if (!selectedKeyHolder || !selectedUser) {
      notifications.show(t('keyHandOverError', { error: '' }), { severity: 'error' });
      return;
    }
    handoverKeyMutation.mutate(
      { keyHolder: selectedKeyHolder, user: selectedUser },
      {
        onSuccess: () => setSelectedUser(null),
        onError: (error) => {
          captureException(error);
          notifications.show(t('keyHandOverError', { error: error.message }), { severity: 'error' });
        },
      }
    );
  };

  return (
    <Layout>
      <LoadingIndicator loading={isLoading} />
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
            openHistoryDialog={async () => {
              await dialogs.open(ItemHistoryDialog, x);
            }}
            {...(hasPerm('items.update.holder')
              ? {
                  selectKeyToHandOver,
                  selectKeyToReceive,
                }
              : {})}
          />
        ))}
      </List>

      <Has perm={'items.manage'}>
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
            sx={{ background: 'primary.light', mr: 2 }}
            onClick={() => {
              setItemToEdit(EMPTY_KEY);
              setAddOrUpdateKeysOpen(true);
            }}
          >
            <AddOutlined sx={{ color: '#fff' }} />
          </Fab>
          <Fab sx={{ background: 'primary.light' }} onClick={() => setEditingMode(!isEditingMode)}>
            {isEditingMode ? <EditOffOutlined sx={{ color: '#fff' }} /> : <EditOutlined sx={{ color: '#fff' }} />}
          </Fab>
        </Box>
      </Has>

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
          refetch();
        }}
        itemToEdit={itemToEdit}
      />
    </Layout>
  );
};

export default ItemHolderScreen;
