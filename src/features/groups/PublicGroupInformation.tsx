import { AccountBox } from "@mui/icons-material";
import { Avatar, Chip, Divider, List, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Layout from "src/components/Layout";
import { LoadingIndicator } from "src/components/LoadingIndicator";
import { GroupsRepository } from "src/repository/GroupsRepository";

const PublicGroupInformation = () => {

  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupWithUsersBase | null>(null)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (groupId) {
      setLoading(true)
      GroupsRepository.fetchSingleGroupWithUsers(groupId).then(result => {
        setGroup(result?.data ?? null);
        setLoading(false)
      })
    }
  }, [groupId])

  return <Layout>
    <List>
      <LoadingIndicator loading={loading} />
      <Typography pl={2} variant="h6" fontWeight="bold">
        Beschreibung
      </Typography>
      <Typography pl={2} pb={1}>
        {group?.description}
      </Typography>
      <Divider />
      <Typography pl={2} pt={1} variant="h6" fontWeight="bold">
        Mitglieder{group && " · " + group?.users.length}
      </Typography>
      {
        group?.users.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName)).map(x => <ListItemButton
          divider
          onClick={() => navigate("/user/" + x.user.userId)}
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
          <ListItemText
            primary={<Stack direction={"row"} spacing={2}>
              <Typography>{x.user.displayName}</Typography>
              {
                x.user.role === "admin" && <Chip variant='outlined' size="small" label="Admin" color='info' />
              }
            </Stack>}
          />
        </ListItemButton>)
      }
    </List>
  </Layout>
}

export default PublicGroupInformation