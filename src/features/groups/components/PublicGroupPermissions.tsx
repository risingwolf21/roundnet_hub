import { GroupRemove } from "@mui/icons-material"
import { Card, CardActionArea, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useDialogs } from "@toolpad/core"
import React from "react"
import { queryClient } from "src/App"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { SelectFeaturePermissionDialog } from "./SelectFeaturePermissionDialog"

export const PublicGroupPermissions = ({ groupId }: { groupId: string }) => {

  const dialogs = useDialogs();

  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ["group", groupId, "permissions"],
    queryFn: async () => {
      const result = await supabase
        .from("group_permissions")
        .select("*, permission: permissions(*)")
        .eq("group", groupId)
        .throwOnError();

      return (result.data ?? []).map(x => x.permission)
    }
  })

  const { data: available_features = [] } = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const result = await supabase
        .from("permissions")
        .select("*")
        .throwOnError();

      return result.data ?? [];
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permission, value }: { permission: Permission, value: boolean }) => {
      if (value) {
        const result = await supabase.from("group_permissions").upsert({ permission: permission.name, group: groupId });
        return result.data;
      } else {
        const result = await supabase.from("group_permissions").delete().eq("permission", permission.name).eq("group", groupId);
        return result.data;
      }
    },
    onMutate: async ({ permission, value }) => {
      await queryClient.cancelQueries({ queryKey: ["group", groupId, "permissions"] })

      const prevGroupPermissions = queryClient.getQueryData<Permission[]>(["group", groupId, "permissions"])

      if (prevGroupPermissions) {
        const newGroupPermissions = value
          ? [...prevGroupPermissions, permission]
          : prevGroupPermissions.filter(x => x.name !== permission.name)

        queryClient.setQueryData(["group", groupId, "permissions"], newGroupPermissions)
      }
      return { prevGroupPermissions }
    },
    onError(error, variables, context) {
      queryClient.setQueryData(["group", groupId, "permissions"], context?.prevGroupPermissions)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "permissions"] })
    }
  })

  return <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 0, m: 1 }}>
    <CardActionArea sx={{ px: 1 }} onClick={async () => {
      await dialogs.open(SelectFeaturePermissionDialog, {
        list: available_features,
        enabled: permissions,
        toggle: (permission, value) => updatePermissionMutation.mutate({
          permission,
          value
        }),
        title: "Features bearbeiten"
      })
    }}>
      <ListItem
        secondaryAction={<Typography>{!isLoading ? permissions.length : "..."}</Typography>}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <GroupRemove />
        </ListItemAvatar>
        <ListItemText primary="Permissions bearbeiten" />
      </ListItem>
    </CardActionArea>
  </Card>
}