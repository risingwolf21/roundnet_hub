import Layout from '../../components/Layout';
import React, {useCallback, useEffect, useState} from 'react';
import {AdminPermissionsRepository} from '../../repository/AdminPermissionsRepository';
import {AlertMessage, AlertSnackbar} from '../../components/AlertSnackbar';
import _ from 'lodash';
import {
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import {Add, Delete, Restore, Save} from '@mui/icons-material';
import {SwipeableDialog} from '../../components/SwipeableDialog';
import {supabase} from '../../components/services/supabase/supabaseClient';
import {FullRolePermission} from '../../types/supabaseTypes';

export const PermissionList = () => {
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [permissions, setPermissions] = useState<FullRolePermission[]>([]);
  const [allAppPermissions, setAllAppPermissions] = useState<AppPermission[]>([]);

  const [markedToDelete, setMarkedToDelete] = useState<FullRolePermission[]>([]);
  const [addedPermissions, setAddedPermissions] = useState<FullRolePermission[]>([]);
  const [addPermissionsOpen, setAddPermissionsOpen] = useState<{ key: AppRole; value: AppPermission[] } | null>(null);

  const savePermissions = async () => {
    for (const x of markedToDelete) {
      await supabase
        .from('role_permissions')
        .delete()
        .eq('app_permission', x.app_permission.id)
        .eq('app_role', x.app_role.id)
        .eq('id', x.id);
    }
    await supabase.from('role_permissions').insert(
      addedPermissions.map((x) => {
        return {
          app_role: x.app_role.id,
          app_permission: x.app_permission.id,
        };
      })
    );
    fetchRolesAndPermissions();
    setMarkedToDelete([]);
    setAddedPermissions([]);
  };

  const markDeleted = (x: FullRolePermission) => {
    if (x.id === '') {
      setAddedPermissions(
        addedPermissions.filter(
          (y) => !(y.app_role.id === x.app_role.id && y.app_permission.id === x.app_permission.id)
        )
      );
      return;
    }
    if (markedToDelete.includes(x)) setMarkedToDelete(markedToDelete.filter((y) => y.id !== x.id));
    else setMarkedToDelete([...markedToDelete, x]);
  };

  const fetchRolesAndPermissions = useCallback(() => {
    AdminPermissionsRepository.fetchPermissions()
      .then((result) => {
        setPermissions(result.data ?? []);
      })
      .catch((error) => setAlertInfo({ message: error.message, severity: 'error' }));
    AdminPermissionsRepository.fetchAllAppPermissions()
      .then((result) => {
        setAllAppPermissions(result.data ?? []);
      })
      .catch((error) => setAlertInfo({ message: error.message, severity: 'error' }));
  }, []);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  return (
    <Layout appBarConfig={{ showBackButton: true }}>
      <List sx={{ pb: 10 }}>
        {Object.entries(_.groupBy([...permissions, ...addedPermissions], (x) => JSON.stringify(x.app_role))).map(
          ([key, value]) => (
            <List
              key={key}
              subheader={
                <ListSubheader sx={{ fontWeight: 'bold', fontSize: '16pt' }}>{JSON.parse(key).name}</ListSubheader>
              }
            >
              {value.map((x) => {
                let deleted = x.id ? markedToDelete.includes(x) : false;
                let added = !x.id;
                return (
                  <ListItem
                    sx={{ backgroundColor: deleted ? 'indianred' : added ? 'lightgreen' : 'white' }}
                    key={x.app_permission.id}
                    divider
                    secondaryAction={
                      <IconButton onClick={() => markDeleted(x)}>{deleted ? <Restore /> : <Delete />}</IconButton>
                    }
                  >
                    <ListItemText primary={x.app_permission.name} />
                  </ListItem>
                );
              })}
              <ListItemButton
                key={key + ' add'}
                onClick={() => {
                  setAddPermissionsOpen({
                    key: JSON.parse(key) as AppRole,
                    value: allAppPermissions.filter((y) => !value.map((x) => x.app_permission.id).includes(y.id)),
                  });
                }}
              >
                <ListItemAvatar>
                  <Add />
                </ListItemAvatar>
                <ListItemText primary={'Hinzufügen'} />
              </ListItemButton>
            </List>
          )
        )}
      </List>
      <SwipeableDialog
        title={`Berechtigung zu "${addPermissionsOpen?.key.name}" hinzufügen`}
        open={addPermissionsOpen !== null}
        onClose={() => setAddPermissionsOpen(null)}
      >
        {addPermissionsOpen &&
          addPermissionsOpen.value.map((x) => (
            <ListItemButton
              key={x.id}
              divider
              onClick={() => {
                setAddedPermissions([
                  ...addedPermissions,
                  {
                    id: '',
                    app_role: addPermissionsOpen.key,
                    app_permission: x,
                  } satisfies FullRolePermission,
                ]);
                setAddPermissionsOpen(null);
              }}
            >
              <ListItemText primary={x.name} />
            </ListItemButton>
          ))}
      </SwipeableDialog>
      {(markedToDelete.length > 0 || addedPermissions.length > 0) && (
        <Fab
          variant={'extended'}
          color={'primary'}
          sx={{
            color: '#fff',
            backgroundColor: (theme) => theme.palette.primary.main,
            position: 'fixed',
            right: '16px',
            bottom: 'calc(56px + env(safe-area-inset-bottom))',
            mb: '16px',
          }}
          onClick={savePermissions}
        >
          <Save sx={{ color: 'white', mr: 1 }} />
          Speichern
        </Fab>
      )}
      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </Layout>
  );
};
