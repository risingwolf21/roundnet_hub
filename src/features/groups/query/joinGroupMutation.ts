import { queryClient } from '@/lib/queryClient';
import { GroupsRepository } from '@/repository/GroupsRepository';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
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

export const useJoinGroup = (groupId: string, user: User, role: 'user' | 'admin' | 'joinRequested') => {
  return useMutation({
    mutationFn: async () => {
      const result = await GroupsRepository.addUserToGroup(groupId, user.userId, role);

      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const prevGroup = queryClient.getQueryData(['group', groupId]);
      const prevGroups = queryClient.getQueryData(['groups']);

      queryClient.setQueryData(['group', groupId], (old: GroupWithUserMappings) => ({
        ...old,
        users: [
          ...old.users,
          {
            user: user,
            map: {
              group: groupId,
              role: role,
              user: user.userId,
            },
          },
        ],
      }));

      queryClient.setQueryData(['groups'], (old: GroupWithUserMappings[]) =>
        old.map((group) =>
          group.id === groupId
            ? {
              ...group,
              users: [
                ...group.users,
                {
                  user: user,
                  map: {
                    group: groupId,
                    role: role,
                    user: user.userId,
                  },
                },
              ],
            }
            : group
        )
      );

      return { prevGroup, prevGroups };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['group', groupId], context?.prevGroup);
      queryClient.setQueryData(['groups'], context?.prevGroups);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};
