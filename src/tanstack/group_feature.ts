import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { FullGroupFeature } from "src/types/supabaseTypes";

export const useGroupFeatures = () => useQuery({
  queryKey: ["group_features"],
  queryFn: async () => {
    const result = await supabase
      .from("group_feature")
      .select("*, fullGroup: group(*)")
      .not("fullGroup", "is", null)
      .returns<FullGroupFeature[]>()
      .throwOnError();

    return result.data ?? []
  }
});

export const useUpdateGroupFeature = () => useMutation({
  mutationFn: async ({ group, feature, is_enabled }: { group: string, feature: string, is_enabled: boolean }) => {
    const result = await supabase.from("group_feature").update({ is_enabled })
      .eq("group", group).eq("feature", feature).throwOnError();

    return result.data;
  },
  onMutate: async ({ group, feature, is_enabled }) => {
    await queryClient.cancelQueries({ queryKey: ['group_features'] })

    const prevFeatures = queryClient.getQueryData<FullGroupFeature[]>(['group_features'])

    if (prevFeatures) {
      const newFeatures = prevFeatures.map(x => {
        if (x.group === group && x.feature === feature) {
          return { ...x, is_enabled }
        }
        return x;
      })
      queryClient.setQueryData(['group_features'], newFeatures)
    }
    return { prevFeatures }
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['group_features'], context?.prevFeatures)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['group_features'] })
  },
})

export const useRemoveGroupFeature = () => useMutation({
  mutationFn: async ({ group, feature, is_enabled }: { group: string, feature: string, is_enabled: boolean }) => {
    const result = await supabase.from("group_feature").delete()
      .eq("group", group).eq("feature", feature).throwOnError();

    return result.data;
  },
  onMutate: async ({ group, feature, is_enabled }) => {
    await queryClient.cancelQueries({ queryKey: ['group_features'] })

    const prevFeatures = queryClient.getQueryData<FullGroupFeature[]>(['group_features'])

    if (prevFeatures) {
      const newFeatures = prevFeatures.filter(x => x.group !== group && x.feature !== feature)
      queryClient.setQueryData(['group_features'], newFeatures)
    }
    return { prevFeatures }
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['group_features'], context?.prevFeatures)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['group_features'] })
  },
})

export const useAddGroupFeature = () => useMutation({
  mutationFn: async ({ group, feature, is_enabled }: { group: string, feature: Feature, is_enabled: boolean }) => {
    const result = await supabase
      .from("group_feature")
      .insert({ group, feature, is_enabled })
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ group, feature, is_enabled }) => {
    await queryClient.cancelQueries({ queryKey: ['group_features'] })

    const prevFeatures = queryClient.getQueryData<FullGroupFeature[]>(['group_features'])

    if (prevFeatures) {
      const newFeatures = [
        ...prevFeatures,
        {
          group,
          feature,
          is_enabled
        }
      ]
      queryClient.setQueryData(['group_features'], newFeatures)
    }
    return { prevFeatures }
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['group_features'], context?.prevFeatures)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['group_features'] })
  },
})