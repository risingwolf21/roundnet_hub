import { CreateOrUpdateGroupDialog } from '@/features/groups/dialogs/CreateOrUpdateGroupDialog';
import { customEnLocale } from '@/lib/date-fns';
import { useGroups } from '@/tanstack/groups';
import { UserWithGroups } from '@/types/supabaseTypes';
import { formatDateFromDatabase, formatDateToDatabase } from '@/utils';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DialogProps, NotificationsProvider, useDialogs, useNotifications } from '@toolpad/core';
import { useMemo, useState } from 'react';

import Add from '@mui/icons-material/Add';
import Article from '@mui/icons-material/Article';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Groups from '@mui/icons-material/Groups';
import Remove from '@mui/icons-material/Remove';
import Title from '@mui/icons-material/Title';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type CreateChallengePayload = {
  user: UserWithGroups;
  challenge?: Challenge | null;
};

const EMPTY_CHALLENGE: Challenge = {
  name: '',
  automated: false,
  description: '',
  id: '',
  created_at: '',
  end_date: null,
  group: '',
  max_points_per_week: null,
  max_points_per_day: 1,
  category_enabled: false,
  comments_enabled: false,
  show_all_members: false,
  category_options: []
};

const Content = ({ payload, onClose }: DialogProps<CreateChallengePayload, Challenge | null>) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const [categoryOptionsOpen, setCategoryOptionsOpen] = useState(false);

  const [data, setData] = useState<Challenge>(payload.challenge ?? EMPTY_CHALLENGE);

  const { data: groups = [], isLoading } = useGroups();

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === data.group) ?? null;
  }, [groups, data.group]);

  return (
    <>
      <AppBar sx={{ position: 'static', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {payload.challenge ? 'Challenge aktualisieren' : 'Neue Challenge erstellen'}
          </Typography>
          <Button
            color="inherit"
            onClick={async () => {
              if (!selectedGroup) {
                notifications.show('Der Challenge muss eine Gruppe zugeordnet sein.', { severity: 'warning' });
                return;
              }
              if (data.name.length < 6) {
                notifications.show('Der Name der Challenge muss aus mindestens 6 Zeichen bestehen.', {
                  severity: 'warning',
                });
                return;
              }
              if (data.description.length < 6) {
                notifications.show('Die Beschreibung der Challenge muss aus mindestens 6 Zeichen bestehen.', {
                  severity: 'warning',
                });
                return;
              }

              onClose(data);
            }}
          >
            {payload.challenge ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </Toolbar>
      </AppBar>
      <List sx={{ pb: 10 }}>
        <ListItem sx={{ pt: 0, pb: 0 }} key={'title'}>
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              <Title />
            </Avatar>
          </ListItemAvatar>
          <TextField
            fullWidth
            variant="outlined"
            label="Challenge Titel"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            margin="normal"
          />
        </ListItem>
        <ListItem sx={{ pt: 0, pb: 0 }} key={'description'}>
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              <Article />
            </Avatar>
          </ListItemAvatar>
          <TextField
            fullWidth
            variant="outlined"
            label="Challenge Beschreibung"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            margin="normal"
          />
        </ListItem>
        <ListItem sx={{ pt: 0, pb: 0 }} key={'group'}>
          <ListItemAvatar>
            {selectedGroup && (
              <Avatar sx={{ backgroundColor: selectedGroup.color, borderRadius: 2 }}>
                <Groups />
              </Avatar>
            )}
          </ListItemAvatar>
          <Select
            sx={{ mt: 2, mb: 1 }}
            fullWidth
            value={selectedGroup?.id ?? payload.challenge?.group ?? 'none'}
            onChange={async (e) => {
              if (e.target.value === 'create') {
                const result = await dialogs.open(CreateOrUpdateGroupDialog, { user: payload.user });
                if (result && result !== 'closed') {
                  setData({ ...data, group: result.id });
                } else {
                  notifications.show('Es wurde keine Gruppe erstellt.', { severity: 'error' });
                }
              } else {
                setData({ ...data, group: e.target.value });
              }
            }}
          >
            {groups
              .filter((x) => x.user_group_role === 'admin')
              .map((x) => (
                <MenuItem key={x.id} value={x.id}>
                  {x.name}
                </MenuItem>
              ))}
            {isLoading && <MenuItem value="loading">Wird geladen...</MenuItem>}
            {!isLoading && !selectedGroup && <MenuItem value="none">Keine</MenuItem>}
            {!isLoading && <MenuItem value="create">Gruppe erstellen</MenuItem>}
          </Select>
        </ListItem>

        <ListSubheader
          sx={{
            fontWeight: 'bold',
            lineHeight: 'normal',
            my: 1,
            color: 'rgba(0,0,0,0.87)',
          }}
        >
          Optionale Einstellungen
        </ListSubheader>

        <ListItem
          sx={{ pt: 0, pb: 0 }}
          key={'maxPointsPerWeek'}
          secondaryAction={
            data.max_points_per_week && (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                  <IconButton
                    sx={{ pr: 0 }}
                    disableRipple
                    disabled={data.max_points_per_week <= 1}
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_week: (data.max_points_per_week ?? 1) - 1,
                      });
                      event.stopPropagation();
                    }}
                  >
                    <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                  </IconButton>
                  <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>
                    {data.max_points_per_week}
                  </Typography>
                  <IconButton
                    sx={{ pl: 0, pr: 0 }}
                    disableRipple
                    disabled={data.max_points_per_week === null}
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_week: (data.max_points_per_week ?? 0) + 1,
                      });
                      event.stopPropagation();
                    }}
                  >
                    <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                  </IconButton>
                </Box>
              </Box>
            )
          }
        >
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.max_points_per_week !== null}
              onChange={() =>
                setData({
                  ...data,
                  max_points_per_week: data.max_points_per_week === null ? 1 : null,
                })
              }
            />
          </ListItemAvatar>
          <ListItemText
            primary="Max. Punkte pro Woche"
          />
        </ListItem>

        <ListItem
          sx={{ pt: 0, pb: 0 }}
          key={'maxPointsPerDay'}
          secondaryAction={
            data.max_points_per_day && (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                  <IconButton
                    sx={{ pr: 0 }}
                    disableRipple
                    disabled={data.max_points_per_day <= 1}
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_day: (data.max_points_per_day ?? 1) - 1,
                      });
                      event.stopPropagation();
                    }}
                  >
                    <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                  </IconButton>
                  <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>
                    {data.max_points_per_day}
                  </Typography>
                  <IconButton
                    sx={{ pl: 0, pr: 0 }}
                    disableRipple
                    disabled={data.max_points_per_day === null}
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_day: (data.max_points_per_day ?? 0) + 1,
                      });
                      event.stopPropagation();
                    }}
                  >
                    <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                  </IconButton>
                </Box>
              </Box>
            )
          }
        >
          <ListItemAvatar></ListItemAvatar>
          <ListItemText
            primary="Max. Punkte pro Tag"
          />
        </ListItem>

        <ListItem sx={{ pt: 0, pb: 0 }} key={'endDate'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.end_date !== null}
              onChange={() =>
                setData({
                  ...data,
                  end_date: data.end_date === null ? formatDateToDatabase(Date.now()) : null,
                })
              }
            />
          </ListItemAvatar>
          <DatePicker
            sx={{ width: '100%', mt: 2, mb: 1 }}
            label="Enddatum"
            disabled={data.end_date === null}
            disablePast
            format="dd MMMM yyyy"
            onChange={(val) => {
              if (!val) return;
              setData({
                ...data,
                end_date: formatDateToDatabase(val),
              });
            }}
            value={formatDateFromDatabase(data.end_date)}
          />
        </ListItem>
        <ListItem key={'show_all_members'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.show_all_members}
              onChange={(e) =>
                setData({
                  ...data,
                  show_all_members: e.target.checked,
                })
              }
            />
          </ListItemAvatar>
          <ListItemText primary="Zeigt alle Teilnehmer der Challenge an (auch mit 0 Punkten)" />
        </ListItem>
        <ListItem key={'comments_enabled'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.comments_enabled}
              onChange={(e) =>
                setData({
                  ...data,
                  comments_enabled: e.target.checked,
                })
              }
            />
          </ListItemAvatar>
          <ListItemText primary="Kommentare aktiviert" />
        </ListItem>
        <ListItem key={'category_enabled'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.category_enabled}
              onChange={(e) =>
                setData({
                  ...data,
                  category_enabled: e.target.checked,
                })
              }
            />
          </ListItemAvatar>
          <ListItemText primary="Kategorien aktiviert" />
        </ListItem>
        <ListItem key={'category_options'} onClick={() => setCategoryOptionsOpen(true)}>
          <ListItemText
            primary={"Kategorien"}
            secondary={data.category_options.map((x) => (
              <Chip key={x} sx={{ mr: 1 }} size="small" label={x} />
            ))}
          />
        </ListItem>
      </List>
      <Dialog open={categoryOptionsOpen} onClose={() => setCategoryOptionsOpen(false)}>
        <List>
          {data.category_options.map((item, index) => (
            <ListItem divider key={item}>
              <ListItemAvatar>
                <IconButton
                  onClick={() => {
                    const newItems = [...data.category_options];
                    newItems.splice(index, 1);
                    setData({
                      ...data,
                      category_options: newItems
                    });
                  }}
                >
                  <Delete />
                </IconButton>
              </ListItemAvatar>
              <TextField
                fullWidth
                variant="outlined"
                label="Gegenstand"
                value={item}
                onChange={(e) => {
                  const newItems = [...data.category_options];
                  newItems[index] = e.target.value;
                  setData({
                    ...data,
                    category_options: newItems
                  });
                }}
                sx={{ mr: 2 }}
                margin="normal"
              />
            </ListItem>
          ))}
          <ListItem
            onClick={() => {
              setData({
                ...data,
                category_options: [...data.category_options, ""]
              })
            }}
          >
            <ListItemAvatar>
              <IconButton>
                <Add />
              </IconButton>
            </ListItemAvatar>
            <ListItemText primary={'Kategorie hinzufügen'} />
          </ListItem>
        </List>
      </Dialog>
    </>
  );
};

export const CreateOrUpdateChallengeDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<CreateChallengePayload, Challenge | null>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <NotificationsProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
          <Content onClose={onClose} open={open} payload={payload} />
        </LocalizationProvider>
      </NotificationsProvider>
    </Dialog>
  );
};
