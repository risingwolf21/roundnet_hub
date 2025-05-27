import { useMutation } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { FullUserMapping, GroupWithUserMappings } from "src/types/supabaseTypes";

export const useAcceptRequestMutation = (group: Group | null) => useMutation({
  mutationFn: async (user: User) => {
    if (!group) {
      return Promise.resolve(null);
    }
    const result = await supabase
      .from("group_user_mapping")
      .update({ role: "user" })
      .eq("group", group.id)
      .eq("user", user.userId)
      .eq("role", "joinRequested")
      .select("*")
      .throwOnError();

    return result.data;
  },
  onMutate: async (user: User) => {
    if (!group)
      return null;

    await queryClient.cancelQueries({ queryKey: ['group', group.id] });

    const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(['group', group.id]);

    if (previousGroup) {
      queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
        ...previousGroup,
        users: [...previousGroup.users.map(x => {
          if (x.user.userId === user.userId) {
            return {
              user: user,
              map: {
                group: group.id,
                role: "user",
                user: user.userId
              }
            } as FullUserMapping
          } else {
            return x;
          }
        })]
      });
    }

    return { previousGroup };
  },
  onError: (err, variables, context) => {
    if (context?.previousGroup && group) {
      queryClient.setQueryData(['group', group.id], context.previousGroup);
    }
  },
  onSettled: () => {
    if (group)
      queryClient.invalidateQueries({ queryKey: ['group', group.id] });
  },
});