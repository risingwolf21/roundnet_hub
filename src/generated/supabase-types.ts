// Auto-generiert – nicht manuell bearbeiten
import InputBase from '@mui/material/InputBase';

import alpha from '@mui/material/alpha';
import styled from '@mui/material/styled';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Close from '@mui/icons-material/Close';

export type Permission = | 'event.comment'
| 'event.manage.attendees'
| 'event.cancel'
| 'event.edit'
| 'event.create.constellations'
| 'drinks.select'
| 'drinks.purchase'
| 'drinks.view.own-payments'
| 'drinks.view.own-history'
| 'drinks.confirm.payments'
| 'items.update.holder'
| 'items.manage'
| 'challenges.stats.write'
| 'challenges.stats.read'
| 'challenges.edit.own-group'
| 'challenges.create.own-group'
| 'games.view.own'
| 'games.create'
| 'games.update.score'
| 'drinks.history.select'
| 'users.manage'
| 'drinks.history.admin'
| 'supabase.admin'
| 'event.delete'
| 'event.signup'
| 'event.signup.trainer'
| 'drinks.manage'
| 'groups.manage.admin'
| 'drinks.edit'
| 'grants.manage'
| 'challenge.manage';

export type Feature = 'games' | 'events' | 'items' | 'drinks' | 'challenges';
