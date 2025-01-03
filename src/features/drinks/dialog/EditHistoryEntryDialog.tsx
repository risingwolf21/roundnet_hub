import {
  Avatar,
  Box,
  Button,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { Add, LocalDrink, Remove } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { FullHistoryUpdate } from '../types';

type Props = {
  open: boolean;
  setOpen: () => void;
  handleClose: () => any;
  entry: FullHistory | null;
  handleSubmit: (newEntry: FullHistoryUpdate) => any;
};

const EditHistoryEntryDialog = ({ open, handleClose, setOpen, entry, handleSubmit }: Props) => {
  const [newCount, setNewCount] = useState<number>(0);

  useEffect(() => {
    setNewCount(entry?.count ?? 0);
  }, [entry]);

  if (!entry) return;

  return (
    <SwipeableDialog title="Getränk bearbeiten" open={open} setOpen={setOpen} onClose={handleClose}>
      <DialogContent sx={{ pl: 0, pr: 0 }}>
        <Box sx={{ width: '100%' }}>
          <List sx={{ width: '100%' }}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  {entry.drink?.imageUrl ? (
                    <img src={entry?.drink?.imageUrl} alt="logo" width={40} height={40} />
                  ) : (
                    <LocalDrink />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={entry.drink?.name} secondary={entry.drink?.price + ' €'} />
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                {newCount > 0 && (
                  <>
                    <IconButton disableRipple onClick={() => setNewCount(newCount - 1)}>
                      <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                    </IconButton>
                    <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>{newCount}</Typography>
                  </>
                )}
                <IconButton disableRipple onClick={() => setNewCount(newCount + 1)}>
                  <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
              </Box>
            </ListItem>
            <Divider />
            <ListItem
              key={'totalAmount'}
              secondaryAction={
                <Typography sx={{ fontWeight: 'bold' }}>{newCount * (entry.drink?.price ?? 1) + ' €'}</Typography>
              }
            >
              <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={'Gesamtkosten'} />
            </ListItem>
          </List>
        </Box>
      </DialogContent>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexGrow: 1,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Button
          variant="outlined"
          fullWidth
          sx={{
            ml: 2,
            mr: 1,
            mb: 2,
            borderRadius: '50px !important',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            lineSpacing: '24px',
          }}
          onClick={() => handleSubmit({ ...entry, count: newCount, newCount })}
        >
          Abbrechen
        </Button>
        <Button
          variant="contained"
          fullWidth
          sx={{
            ml: 1,
            mr: 2,
            mb: 2,
            borderRadius: '50px !important',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            lineSpacing: '24px',
          }}
          onClick={handleClose}
          autoFocus
        >
          Bestätigen
        </Button>
      </Box>
    </SwipeableDialog>
  );
};
export default EditHistoryEntryDialog;
