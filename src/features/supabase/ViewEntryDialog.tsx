import { DialogProps, useDialogs, useNotifications } from '@toolpad/core';
import _ from 'lodash';

import Close from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import React from 'react';
type ViewEntryDialogPayload = {
  entry: object;
};

const DialogContent = ({ payload, open, onClose }: DialogProps<ViewEntryDialogPayload, 'delete' | null>) => {
  const dialogs = useDialogs();
  const notifications = useNotifications();

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <AppBar sx={{ position: 'static', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Eintrag
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        {Object.entries(payload.entry).map(([key, value]) => {
          const obj = JSON.parse(JSON.stringify(value));
          if (obj && Object.keys(obj).includes('old') && Object.keys(obj).includes('new')) {
            return (
              <React.Fragment key={key}>
                <ListItem key={key + 'diff'}>
                  <ListItemText
                    primary={
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(
                          _.fromPairs(
                            _.differenceWith(
                              _.toPairs(obj.old),
                              _.toPairs(_.pick(obj.new ?? {}, Object.keys(obj.old))),
                              _.isEqual
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    }
                    secondary={'Diff'}
                  />
                </ListItem>
                <ListItem key={key + 'obj'}>
                  <ListItemText
                    primary={
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(
                          _.fromPairs(
                            _.intersectionWith(
                              _.toPairs(obj.old),
                              _.toPairs(_.pick(obj.new ?? {}, Object.keys(obj.old))),
                              _.isEqual
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    }
                    secondary={'Objekt'}
                  />
                </ListItem>
              </React.Fragment>
            );
          }
          return (
            <ListItem key={key} divider secondaryAction={<IconButton onClick={() => {
              navigator.clipboard.writeText(value);
              notifications.show("In die Zwischenablage kopiert", { severity: "info" })
            }}>
              <ContentCopyIcon />
            </IconButton>}>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography sx={{ fontWeight: 'bold' }}>{JSON.stringify(value, null, 2)}</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: "small", whiteSpace: 'pre-wrap' }}>
                  {key}
                </Typography>
              </Box>
            </ListItem>
          )
        })}
        <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, m: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={() =>
                dialogs.confirm('Wirklich löschen?').then((result) => {
                  if (result) {
                    onClose('delete');
                  }
                })
              }
            >
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Delete />
              </ListItemAvatar>
              <ListItemText primary="Löschen" />
            </ListItem>
          </CardActionArea>
        </Card>
      </List>
    </Dialog>
  );
};

const ViewEntryDialog = (props: DialogProps<ViewEntryDialogPayload, 'delete' | null>) => {
  return (
    <DialogContent {...props} />
  );
};

export default ViewEntryDialog;