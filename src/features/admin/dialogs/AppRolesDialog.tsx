import { SlideUpTransition } from '../../../utils';
import { Box } from '@mui/system';
import {
  AppBar,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import React, { useEffect, useState } from 'react';
import { AdminPermissionsRepository } from '../../../repository/AdminPermissionsRepository';

type AppRolesDialogProps = {
  open: boolean;
  roles: AppRole[];
  handleClose: () => void;
  handleSubmit: (roles: AppRole[]) => void;
};

export const AppRolesDialog = ({ open, handleClose, handleSubmit, roles }: AppRolesDialogProps) => {
  const [selectedAppRoles, setSelectedAppRoles] = useState<AppRole[]>([]);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    AdminPermissionsRepository.fetchAllAppRoles().then((result) => {
      setAllRoles(result.data ?? []);
      setSelectedAppRoles(roles);
    });
  }, [roles]);

  const handleRoleChange = (checked: boolean, role: AppRole) => {
    if (checked) {
      setSelectedAppRoles([...new Set([...selectedAppRoles, role])]);
    } else {
      setSelectedAppRoles(selectedAppRoles.filter((x) => x !== role));
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box component="form" noValidate>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Benutzer rollen bearbeiten
            </Typography>
            <Button sx={{ color: 'white' }} onClick={() => handleSubmit(selectedAppRoles)}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        <Box>
          <Toolbar />
          <Table>
            <TableBody>
              {allRoles.map((x) => (
                <TableRow key={x.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ p: 1 }}>
                    <Checkbox
                      checked={selectedAppRoles.find((y) => y.id === x.id) !== undefined}
                      onChange={(e, checked) => handleRoleChange(checked, x)}
                    />
                  </TableCell>
                  <TableCell sx={{ p: 1 }}>{x.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Dialog>
  );
};
