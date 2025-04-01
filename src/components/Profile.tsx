import {
  Avatar,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { AddPhotoAlternateOutlined, FiberManualRecord, Launch } from '@mui/icons-material';
import { useParams } from 'react-router';
import { LoadingIndicator } from './LoadingIndicator';
import { SupabaseUserRepository } from '../repository/UserRepository';
import Layout from './Layout';
import { useApplication } from '../features/auth/AuthContext';
import pzLogo from '../images/pz_logo.svg';

const UserScreen = () => {
  const { userId } = useParams();
  const { user } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserWithGroupsAndPlayerData | null>(null);
  const [overlappingGroups, setOverlappingGroups] = useState<Group[]>([]);

  const loadUserData = async (userId: string) => {

    const userResult = await SupabaseUserRepository.fetchUserWithGroups(user!.userId);
    const result = await SupabaseUserRepository.fetchUserWithGroups(userId);

    return { result, userResult }
  }

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadUserData(userId).then(({ result, userResult }) => {
        setOverlappingGroups(
          result.data?.groups?.filter((x: Group) => userResult.data?.groups.some((y: Group) => y.id === x.id)) ?? []
        );
        setCurrentUser(result.data);
        setLoading(false);
      });
    }
  }, [userId, user]);

  return (
    <Layout>
      <LoadingIndicator loading={loading} />
      <List sx={{ pl: 2, pr: 2, pb: 8 }}>
        <Container
          key={'avatar'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            m: 2,
            p: 0,
            width: 'auto',
          }}
        >
          <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
            {currentUser?.avatarUrl ? (
              <img src={currentUser?.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
            ) : (
              <AddPhotoAlternateOutlined sx={{ fontSize: '50px' }} />
            )}
          </Avatar>
          <Typography variant={'h5'} sx={{ mt: 4 }}>
            {currentUser?.displayName}
          </Typography>
        </Container>
        {
          currentUser?.player_data?.rg_id && currentUser.player_data?.rg_link && <>
            <ListItem
              key={'rg_id'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
              secondaryAction={
                <IconButton
                  onClick={() =>
                    window.open(currentUser.player_data?.rg_link ?? undefined, '_blank', 'noopener,noreferrer')
                  }
                >
                  <Launch />
                </IconButton>
              }
            >
              <ListItemAvatar>
                <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
              </ListItemAvatar>
              <ListItemText primary={currentUser.player_data.rg_id} secondary={'Roundnet Germany ID'} />
            </ListItem>
            <ListItem
              key={'rgx'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
            >
              <ListItemAvatar>
                <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
              </ListItemAvatar>
              <ListItemText primary={currentUser.player_data.rg_index} secondary={'Roundnet Germany Index'} />
            </ListItem>
          </>
        }
        <List
          key={'groups'}
          subheader={
            <ListSubheader sx={{ zIndex: '-1', fontWeight: 'bold', lineHeight: 'normal', my: 2, pl: 0 }}>
              Gemeinsame Gruppen
            </ListSubheader>
          }
        >
          {overlappingGroups.map((group, index) => (
            <ListItem
              key={`${group.name} ${index}`}
              sx={{ '&.MuiListItem-root': { p: 0 } }}
              divider={index !== overlappingGroups.length - 1}
            >
              <ListItemAvatar>
                <FiberManualRecord sx={{ color: group.color }} />
              </ListItemAvatar>
              <ListItemText primary={group.name} secondary={group.description} />
            </ListItem>
          ))}
        </List>
      </List>
    </Layout>
  );
};
export default UserScreen;
