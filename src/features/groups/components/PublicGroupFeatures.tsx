import { GroupRemove } from "@mui/icons-material"
import { Card, CardActionArea, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useDialogs } from "@toolpad/core"
import React from "react"
import { queryClient } from "src/App"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { SelectFeaturePermissionDialog } from "./SelectFeaturePermissionDialog"

export const PublicGroupfeatures = ({ groupId }: { groupId: string }) => {

  const dialogs = useDialogs();

  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ["group", groupId, "features"],
    queryFn: async () => {
      const result = await supabase
        .from("group_features")
        .select("*, feature: features(name, description)")
        .eq("group", groupId)
        .throwOnError();

      return (result.data ?? []).map(x => x.feature)
    }
  });

  const { data: available_features = [] } = useQuery<Feature[]>({
    queryKey: ["features"],
    queryFn: async () => {
      const result = await supabase
        .from("features")
        .select("*")
        .throwOnError();

      return result.data ?? [];
    }
  });

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ feature, value }: { feature: Feature, value: boolean }) => {
      if (value) {
        const result = await supabase.from("group_features").upsert({ feature: feature.name, group: groupId });
        return result.data;
      } else {
        const result = await supabase.from("group_features").delete().eq("feature", feature.name).eq("group", groupId);
        return result.data;
      }
    },
    onMutate: async ({ feature, value }) => {
      await queryClient.cancelQueries({ queryKey: ["group", groupId, "features"] })

      const prevGroupFeatuers = queryClient.getQueryData<Feature[]>(["group", groupId, "features"])

      if (prevGroupFeatuers) {
        const newGroupFeatures = value
          ? [...prevGroupFeatuers, feature]
          : prevGroupFeatuers.filter(x => x.name !== feature.name)

        queryClient.setQueryData(["group", groupId, "features"], newGroupFeatures)
      }
      return { prevGroupFeatuers }
    },
    onError(error, variables, context) {
      queryClient.setQueryData(["group", groupId, "features"], context?.prevGroupFeatuers)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["group", groupId, "features"] })
    }
  })

  return <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 0, m: 1 }}>
    <CardActionArea sx={{ px: 1 }} onClick={async () => {
      await dialogs.open(SelectFeaturePermissionDialog, {
        list: available_features,
        enabled: features,
        toggle: (feature, value) => updateFeatureMutation.mutate({
          feature,
          value
        }),
        title: "Features bearbeiten"
      })
    }}>
      <ListItem
        secondaryAction={<Typography>{!isLoading ? features.length : "..."}</Typography>}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <GroupRemove />
        </ListItemAvatar>
        <ListItemText primary="Features bearbeiten" />
      </ListItem>
    </CardActionArea>
  </Card>
}