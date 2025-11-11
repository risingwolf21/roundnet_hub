import { ProfileDialog } from '@/components/Profile';
import { useGrants } from '@/features/auth/GrantsContext';
import { Direction, useTheme } from '@mui/material/styles';
import { useDialogs } from '@toolpad/core';
import { compareDesc, isBefore } from 'date-fns';
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { FullAttendance } from '../../../types/supabaseTypes';
import { EventAttendanceDialogProps } from '../types';

import { Has } from '@/hooks/useGrants';
import AccountBox from '@mui/icons-material/AccountBox';
import Key from '@mui/icons-material/Key';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

export const TabPanel = (props: PropsWithChildren & { value: number, index: number, dir: Direction }) => {
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
};

const AttendanceItem = ({
  attendance,
  onClick,
  required_item,
  acceptAttendance,
}: {
  attendance: FullAttendance;
  onClick: () => void;
  required_item?: Item;
  acceptAttendance?: ((value: FullAttendance) => void) | null;
}) => {
  const { t } = useTranslation();
  return (
    <ListItem
      onClick={onClick}
      secondaryAction={
        acceptAttendance ? (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              acceptAttendance(attendance);
            }}
          >
            Akzeptieren
          </Button>
        ) : (
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
        )
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
  usersWithRequiredItem,
  acceptAttendance,
}: EventAttendanceDialogProps) => {
  const [value, setValue] = useState(index ?? 0);
  const theme = useTheme();
  const dialogs = useDialogs();
  const { user, hasPerm, hasFeat } = useGrants();

  const attending = useMemo(() => attendance.filter(x => x.state === "Attending" || x.state === "AttendingAsTrainer" || x.state === "RequestedAttendance"), [attendance]);
  const declined = useMemo(() => attendance.filter(x => x.state === "Declined"), [attendance]);
  const attendingAsTrial = useMemo(() => attendance.filter(x => x.state === "AttendingAsTrial"), [attendance]);
  const waitingList = useMemo(() => attendance.filter(x => x.state === "Waiting"), [attendance]);
  const waitingAsTrial = useMemo(() => attendance.filter(x => x.state === "WaitingAsTrial"), [attendance]);

  const showWaitingListTab = useMemo(() => waitingList.length > 0 || waitingAsTrial.length > 0, [waitingAsTrial, waitingList]);
  const showAttendingAsTrialTab = useMemo(() => attendingAsTrial.length > 0, [attendingAsTrial]);

  const canSeeTrial = hasFeat('events.trials') && showAttendingAsTrialTab;

  useEffect(() => {
    setValue(index);
  }, [index]);

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, value: number) => {
    setValue(value);
  };

  return (
    <SwipeableDialog title="Teilnehmer" open={open} onClose={() => setOpen(false)} minHeight={60} setOpen={setOpen}>
      <Box sx={{ paddingLeft: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ '&.MuiAppBar-root': { backgroundColor: '#fff', color: '#000' } }}>
          <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="inherit" variant="scrollable" scrollButtons allowScrollButtonsMobile>
            <Tab sx={{ minHeight: "unset" }} label="Zusagen" icon={<Chip label={attending.length} size='small' />} iconPosition='end' />
            <Tab sx={{ minHeight: "unset" }} label="Absagen" icon={<Chip label={declined.length} size='small' />} iconPosition='end' />
            {canSeeTrial && <Tab sx={{ minHeight: "unset" }} label="Probetraining" icon={<Chip label={attendingAsTrial.length} size='small' />} iconPosition='end' />}
            {showWaitingListTab && <Tab sx={{ minHeight: "unset" }} label="Warteliste" icon={<Chip label={waitingList.length + waitingAsTrial.length} size='small' />} iconPosition='end' />}
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
              .filter((x: FullAttendance) => x.state === 'RequestedAttendance')
              .sort((a, b) => compareDesc(a.lastUpdate, b.lastUpdate))
              .map((x: FullAttendance, index: number) => (
                <AttendanceItem
                  attendance={x}
                  key={x.user.userId + index}
                  onClick={() => dialogs.open(ProfileDialog, { user, userId: x.user.userId })}
                  required_item={usersWithRequiredItem.find((y) => y.user === x.user.userId)?.item}
                  acceptAttendance={hasPerm('event.manage.attendees') ? acceptAttendance : null}
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
        <Has feat={"events.trials"}>
          {
            attendingAsTrial.length > 0 && <TabPanel value={value} index={2} dir={theme.direction}>
              <List sx={{ pb: 8 }}>
                {attendingAsTrial
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
          }
        </Has>
        {showWaitingListTab && (
          <TabPanel value={value} index={2 + (showAttendingAsTrialTab ? 1 : 0)} dir={theme.direction}>
            <List sx={{ pb: 8 }}>
              {
                waitingList.length > 0 && <List subheader={<ListSubheader>Warteliste</ListSubheader>}>
                  {
                    waitingList
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
                      ))
                  }
                </List>
              }
              {
                waitingAsTrial.length > 0 && <List subheader={<ListSubheader>Warteliste Probetraining</ListSubheader>}>
                  {
                    waitingAsTrial
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
                      ))
                  }
                </List>
              }
            </List>
          </TabPanel>
        )}
      </Box>
    </SwipeableDialog>
  );
};

export default EventAttendanceDialog;
