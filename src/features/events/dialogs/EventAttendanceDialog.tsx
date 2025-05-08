import { AccountBox, Key, RecordVoiceOver } from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDialogs } from '@toolpad/core';
import { compareDesc, isBefore } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileDialog } from 'src/components/Profile';
import { useAuthentication } from 'src/features/auth/AuthContext';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { FullAttendance } from '../../../types/supabaseTypes';
import { EventAttendanceDialogProps } from '../types';

export const TabPanel = (props: any) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const AttendanceItem = ({
  attendance,
  onClick,
  required_item,
}: {
  attendance: FullAttendance;
  onClick: () => void;
  required_item?: Item;
}) => {
  const { t } = useTranslation();
  return (
    <ListItem
      onClick={onClick}
      secondaryAction={
        <Typography
          style={{
            fontSize: '10pt',
            color: 'rgba(0,0,0,0.6)',
            marginTop: '8px',
            alignContent: 'baseline',
          }}
        >
          {t('format.distanceToNow', { date: new Date(attendance.lastUpdate) })}
        </Typography>
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ borderRadius: 2 }}>
          {attendance.user.avatarUrl ? (
            <img src={attendance.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
          ) : (
            <AccountBox />
          )}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {attendance.user?.displayName}
            {attendance.state === 'AttendingAsTrainer' && <RecordVoiceOver sx={{ ml: 1 }} />}
            {required_item && <Key sx={{ ml: 1, color: required_item.color }} />}
          </Box>
        }
      />
    </ListItem>
  );
};

const EventAttendanceDialog = ({
  open,
  index,
  setOpen,
  attendance,
  hasWaitingList,
  usersWithRequiredItem,
}: EventAttendanceDialogProps) => {
  const [value, setValue] = useState(index ?? 0);
  const theme = useTheme();
  const dialogs = useDialogs();
  const { user } = useAuthentication();

  useEffect(() => {
    setValue(index);
  }, [index]);

  const handleChange = (event: React.SyntheticEvent<Element, Event>, value: any) => {
    setValue(value);
  };

  return (
    <SwipeableDialog title="Teilnehmer" open={open} onClose={() => setOpen(false)} minHeight={60} setOpen={setOpen}>
      <Box sx={{ paddingLeft: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ '&.MuiAppBar-root': { backgroundColor: '#fff', color: '#000' } }}>
          <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="inherit" variant="fullWidth">
            <Tab label="Zusagen" />
            <Tab label="Absagen" />
            {hasWaitingList && <Tab label="Warteliste" />}
          </Tabs>
        </AppBar>
        <TabPanel value={value} index={0} dir={theme.direction}>
          <List sx={{ pb: 'env(safe-area-inset-bottom)' }}>
            {attendance
              .filter((x: FullAttendance) => x.state === 'AttendingAsTrainer')
              .sort((a, b) => compareDesc(a.lastUpdate, b.lastUpdate))
              .map((x: FullAttendance, index: number) => (
                <AttendanceItem
                  attendance={x}
                  key={x.user.userId + index}
                  onClick={() => dialogs.open(ProfileDialog, { user, userId: x.user.userId })}
                  required_item={usersWithRequiredItem.find((y) => y.user === x.user.userId)?.item}
                />
              ))}
            {attendance
              .filter((x: FullAttendance) => x.state === 'Attending')
              .sort((a, b) => compareDesc(a.lastUpdate, b.lastUpdate))
              .map((x: FullAttendance, index: number) => (
                <AttendanceItem
                  attendance={x}
                  key={x.user.userId + index}
                  onClick={() => dialogs.open(ProfileDialog, { user, userId: x.user.userId })}
                  required_item={usersWithRequiredItem.find((y) => y.user === x.user.userId)?.item}
                />
              ))}
          </List>
        </TabPanel>
        <TabPanel value={value} index={1} dir={theme.direction}>
          <List sx={{ pb: 8 }}>
            {attendance
              .filter((x: FullAttendance) => x.state === 'Declined')
              .sort((a, b) => compareDesc(a.lastUpdate, b.lastUpdate))
              .map((x: FullAttendance, index: number) => (
                <AttendanceItem
                  attendance={x}
                  key={x.user.userId + index}
                  onClick={() => dialogs.open(ProfileDialog, { user, userId: x.user.userId })}
                />
              ))}
          </List>
        </TabPanel>
        {hasWaitingList && (
          <TabPanel value={value} index={2} dir={theme.direction}>
            <List sx={{ pb: 8 }}>
              {attendance
                .filter((x: FullAttendance) => x.state === 'Waiting')
                .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? 1 : 0))
                .map((x: FullAttendance, index: number) => (
                  <ListItem
                    key={x.user.userId + index}
                    secondaryAction={<Typography fontWeight={'bold'}>{`${index + 1}.)`}</Typography>}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ borderRadius: 2 }}>
                        {x.user.avatarUrl ? (
                          <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                        ) : (
                          <AccountBox />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={x.user?.displayName} />
                  </ListItem>
                ))}
            </List>
          </TabPanel>
        )}
      </Box>
    </SwipeableDialog>
  );
};

export default EventAttendanceDialog;
