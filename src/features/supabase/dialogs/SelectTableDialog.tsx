import { DialogProps } from '@toolpad/core';
import { Table } from '../SupabaseClient';

import { groupBy } from '@/utils';
import Close from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type SelectTableDialogPayload = {
  tables: Table[];
};

export const SelectTableDialog = ({ payload, open, onClose }: DialogProps<SelectTableDialogPayload, Table | null>) => {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(null)}
      scroll={'paper'}
      sx={{
        '.MuiDialog-container > .MuiPaper-root': {
          margin: 0,
          maxHeight: '75vh',
          minHeight: `40vh`,
          width: '100%',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        '.MuiDialog-container': {
          position: 'absolute',
          m: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          alignItems: 'end',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="close drawer"
            onClick={() => onClose(null)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <Close />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tabelle auswählen
          </Typography>
        </Toolbar>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <List>
          {Object.entries(groupBy<Table>(payload.tables, (x) => x.schema)).map(([key, values]: [string, Table[]]) => (
            <List subheader={<ListSubheader sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{key}</ListSubheader>}>
              {values
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((x) => (
                  <ListItemButton
                    divider
                    key={x.schema + '/' + x.name}
                    onClick={() => {
                      onClose(x);
                    }}
                  >
                    <ListItemText primary={x.name} secondary={x.schema} />
                  </ListItemButton>
                ))}
            </List>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};
