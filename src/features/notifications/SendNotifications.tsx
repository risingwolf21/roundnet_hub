import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { useUsers } from '@/tanstack/admin';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useNotifications } from '@toolpad/core';
import { useState } from 'react';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;

const SendNotifications = () => {
  const { data: users = [] } = useUsers();
  const notifcations = useNotifications();

  const [selectedUsers, setSelectedUsers] = useState<SimpleUser[]>([]);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [scope, setScope] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedUsers(
      typeof event.target.value === 'string'
        ? event.target.value
            .split(',')
            .map((x) => users.find((y) => y.id === x))
            .filter((x): x is SimpleUser => !!x)
        : event.target.value.map((x) => users.find((y) => y.id === x)).filter((x): x is SimpleUser => !!x)
    );
  };

  return (
    <Layout>
      <List>
        <ListItem>
          <Select
            id="demo-multiple-checkbox"
            multiple
            fullWidth
            value={selectedUsers.map((x) => x.id)}
            onChange={handleChange}
            input={<OutlinedInput label="Tag" />}
            renderValue={(selected) =>
              selected
                .map((x) => users.find((y) => x === y.id))
                .filter((x) => x)
                .map((x) => x?.name)
                .join(', ')
            }
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                  width: 250,
                },
              },
            }}
          >
            {users.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                <Checkbox checked={selectedUsers.findIndex((y) => y.id === x.id) !== -1} />
                <ListItemText primary={x.name} />
              </MenuItem>
            ))}
          </Select>
          <Button variant="contained" sx={{ ml: 2 }} onClick={() => setSelectedUsers(users)}>
            Alle
          </Button>
        </ListItem>
        <ListItem>
          <TextField
            label={'Titel'}
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Body'}
            fullWidth
            variant="outlined"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Topic'}
            fullWidth
            variant="outlined"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Scope'}
            fullWidth
            variant="outlined"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Data'}
            fullWidth
            variant="outlined"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Source Type'}
            fullWidth
            variant="outlined"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
          />
        </ListItem>
        <ListItem>
          <TextField
            label={'Source Id'}
            fullWidth
            variant="outlined"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          />
        </ListItem>
        <Button
          fullWidth
          variant="contained"
          sx={{ m: 2 }}
          onClick={() => {
            supabase
              .schema('notifications')
              .rpc('notify_users', {
                p_body: body,
                p_title: title,
                p_topic: topic,
                p_scope: scope,
                p_data: JSON.parse(data || '{}'),
                p_source_type: sourceType,
                p_source_id: sourceId,
                p_users: selectedUsers.map((x) => x.id),
              })
              .then(({ error }) => {
                if (error) {
                  notifcations.show('Fehler: ' + error.message, { severity: 'error' });
                } else {
                  notifcations.show('Benachrichtigungen gesendet');
                  setTitle('');
                  setBody('');
                  setTopic('');
                  setScope('');
                  setData('');
                  setSourceType('');
                  setSourceId('');
                  setSelectedUsers([]);
                }
              });
          }}
        >
          Send Notifications
        </Button>
      </List>
    </Layout>
  );
};

export default SendNotifications;
