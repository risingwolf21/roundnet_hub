import { Edit } from "@mui/icons-material"
import { Card, CardActionArea, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import { useMutation, useQuery } from "@tanstack/react-query"
import React, { useState } from "react"
import { queryClient } from "src/App"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { SelectFeaturePermissionDialog } from "./SelectFeaturePermissionDialog"

export const PublicGroupPermissions = ({ group }: { group: Group }) => {

  const [open, setOpen] = useState(false)

  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ["group", group.id, "permissions"],
    queryFn: async () => {
      const result = await supabase
        .from("group_permissions")
        .select("*, permission: permissions(*)")
        .eq("group", group.id)
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
        const result = await supabase.from("group_permissions").upsert({ permission: permission.name, group: group.id }, {
          onConflict: 'group,permission',
          ignoreDuplicates: true,
        });
        return result.data;
      } else {
        const result = await supabase.from("group_permissions").delete().eq("permission", permission.name).eq("group", group.id);
        return result.data;
      }
    },
    onMutate: async ({ permission, value }) => {
      await queryClient.cancelQueries({ queryKey: ["group", group.id, "permissions"] })

      const prevGroupPermissions = queryClient.getQueryData<Permission[]>(["group", group.id, "permissions"])

      if (prevGroupPermissions) {
        const newGroupPermissions = value
          ? [...prevGroupPermissions, permission]
          : prevGroupPermissions.filter(x => x.name !== permission.name)

        queryClient.setQueryData(["group", group.id, "permissions"], newGroupPermissions)
      }
      return { prevGroupPermissions }
    },
    onError(error, variables, context) {
      queryClient.setQueryData(["group", group.id, "permissions"], context?.prevGroupPermissions)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["group", group.id, "permissions"] })
    }
  })

  return <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
    <CardActionArea sx={{ px: 1 }} onClick={() => {
      setOpen(true)
    }}>
      <ListItem
        secondaryAction={<Typography>{!isLoading ? permissions.length : "..."}</Typography>}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <Edit />
        </ListItemAvatar>
        <ListItemText primary="Permissions bearbeiten" />
      </ListItem>
    </CardActionArea>
    <SelectFeaturePermissionDialog
      open={open}
      onClose={() => setOpen(false)}
      list={available_features}
      enabled={permissions}
      toggle={(permission, value) => updatePermissionMutation.mutate({
        permission,
        value
      })}
      title={"Features bearbeiten für " + group.name}
    />
  </Card>
}