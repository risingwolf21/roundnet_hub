import { GroupRemove } from "@mui/icons-material"
import { Card, CardActionArea, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material"
import { useMutation, useQuery } from "@tanstack/react-query"
import React, { useState } from "react"
import { queryClient } from "src/App"
import { supabase } from "src/components/services/supabase/supabaseClient"
import { SelectFeaturePermissionDialog } from "./SelectFeaturePermissionDialog"

export const PublicGroupfeatures = ({ group }: { group: Group }) => {
  const [open, setOpen] = useState(false)

  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ["group", group.id, "features"],
    queryFn: async () => {
      const result = await supabase
        .from("group_features")
        .select("*, feature: features(name, description)")
        .eq("group", group.id)
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
        const result = await supabase.from("group_features").upsert({ feature: feature.name, group: group.id });
        return result.data;
      } else {
        const result = await supabase.from("group_features").delete().eq("feature", feature.name).eq("group", group.id);
        return result.data;
      }
    },
    onMutate: async ({ feature, value }) => {
      await queryClient.cancelQueries({ queryKey: ["group", group.id, "features"] })

      const prevGroupFeatuers = queryClient.getQueryData<Feature[]>(["group", group.id, "features"])

      if (prevGroupFeatuers) {
        const newGroupFeatures = value
          ? [...prevGroupFeatuers, feature]
          : prevGroupFeatuers.filter(x => x.name !== feature.name)

        queryClient.setQueryData(["group", group.id, "features"], newGroupFeatures)
      }
      return { prevGroupFeatuers }
    },
    onError(error, variables, context) {
      queryClient.setQueryData(["group", group.id, "features"], context?.prevGroupFeatuers)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["group", group.id, "features"] })
    }
  })

  return <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 0, m: 1 }}>
    <CardActionArea sx={{ px: 1 }} onClick={() => {
      setOpen(true);
    }}>
      <ListItem
        secondaryAction={<Typography>{!isLoading ? features.length : "..."}</Typography>}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <GroupRemove />
        </ListItemAvatar>
        <ListItemText primary="Features bearbeiten" />
      </ListItem>
    </CardActionArea>
    <SelectFeaturePermissionDialog
      open={open}
      onClose={() => setOpen(false)}
      list={available_features}
      enabled={features}
      toggle={(feature, value) => updateFeatureMutation.mutate({
        feature,
        value
      })}
      title={"Features bearbeiten für " + group.name}
    />
  </Card>
}