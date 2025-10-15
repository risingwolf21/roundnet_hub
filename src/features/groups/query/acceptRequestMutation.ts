import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { FullUserMapping, GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AppBar from '@mui/material/AppBar';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import List from '@mui/material/List';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import Grid from '@mui/material/Grid';
import ThumbUp from '@mui/icons-material/ThumbUp';
import AccountBox from '@mui/icons-material/AccountBox';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import Check from '@mui/icons-material/Check';
import ThumbDown from '@mui/icons-material/ThumbDown';
import Article from '@mui/icons-material/Article';
import Close from '@mui/icons-material/Close';
import ColorLens from '@mui/icons-material/ColorLens';
import Group from '@mui/icons-material/Group';
import Groups from '@mui/icons-material/Groups';
import Title from '@mui/icons-material/Title';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Delete from '@mui/icons-material/Delete';

export const useAcceptRequestMutation = (group: Group | null) =>
  useMutation({
    mutationFn: async (user: User) => {
      if (!group) {
        return Promise.resolve(null);
      }
      const result = await supabase
        .from('group_user_mapping')
        .update({ role: 'user' })
        .eq('group', group.id)
        .eq('user', user.userId)
        .eq('role', 'joinRequested')
        .select('*')
        .throwOnError();

      return result.data;
    },
    onMutate: async (user: User) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: ['group', group.id] });
      await queryClient.cancelQueries({ queryKey: ['group', 'joinRequested'] });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(['group', group.id]);
      const previousRequested = queryClient.getQueryData<GroupUserMapping[]>(['group', 'joinRequested']);

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
          ...previousGroup,
          users: [
            ...previousGroup.users.map((x: FullUserMapping) => {
              if (x.user.userId === user.userId) {
                return {
                  user: user,
                  map: {
                    group: group.id,
                    role: 'user',
                    user: user.userId,
                  },
                } as FullUserMapping;
              } else {
                return x;
              }
            }),
          ],
        });
      }

      if (previousRequested) {
        queryClient.setQueryData<GroupUserMapping[]>(
          ['groups', 'joinRequested'],
          previousRequested.filter((x) => x.user !== user.userId && x.group !== group.id)
        );
      }

      return { previousGroup, previousRequested };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGroup && group) {
        queryClient.setQueryData(['group', group.id], context.previousGroup);
      }
      if (context?.previousRequested) {
        queryClient.setQueryData(['group', 'joinRequested'], context.previousRequested);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: ['group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['group', 'joinRequested'] });
    },
  });
