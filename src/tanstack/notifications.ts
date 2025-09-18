import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from 'src/lib/queryClient';
import { supabase } from "src/lib/supabase";
import { Tables } from "src/types/supabase-generated.types";
import { Notification } from "types/supabase";

export const useAllNotifications = (user: User | null) => useQuery<Notification[]>({
  queryKey: ["notifications"],
  enabled: !!user,
  queryFn: async () => {
    const result = await supabase
      .from('notifications')
      .select('*')
      .eq('user', user!.userId)
      .throwOnError()
      .returns<Notification[]>();

    return result.data ?? [];
  }
});

export const useMarkNotificationsAsRead = (userId: string) => useMutation({
  mutationFn: async () => {
    const result = await supabase.from('notifications')
      .delete()
      .eq('user', userId)
      .throwOnError();

    return result;
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ["notifications"] });
    const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications"]);


    queryClient.setQueriesData({ queryKey: ["notifications"] }, []);

    return { previousNotifications }
  },
  onError: (err, _vars, context) => {
    if (context?.previousNotifications) {
      queryClient.setQueryData(["notifications"], context.previousNotifications);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  },
})

export const useNotificationTags = (user: User) => useQuery<Tables<"user_notification_preferences">[]>({
  queryKey: ["notifications", user.userId, "preferences"],
  queryFn: async () => {
    const result = await supabase
      .from('user_notification_preferences')
      .select("*")
      .eq("user", user.userId)
      .throwOnError();

    return result.data ?? []
  }
})

export const useNotificationTopics = () => useQuery<Tables<"notification_topics">[]>({
  queryKey: ["notifications", "topics"],
  queryFn: async () => {
    const result = await supabase
      .from('notification_topics')
      .select("*")
      .throwOnError();

    return result.data ?? []
  }
})

export const useUpdateNotificationPreferences = (user: User) => useMutation({
  mutationFn: async ({ topic, enabled, channel = 'webpush', scopeType, scopeId }: { topic: string, enabled: boolean, channel?: string, scopeType: string, scopeId?: string }) => {
    const result = await supabase.rpc('set_notification_pref', {
      p_topic: topic,
      p_enabled: enabled,
      p_channel: channel,
      p_scope_type: scopeType,
      p_scope_id: scopeId
    })
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ topic, enabled, channel, scopeType, scopeId }) => {
    await queryClient.cancelQueries({ queryKey: ["notifications", user.userId, "tags"] });
    const previousNotificationTags = queryClient.getQueryData<Tables<"user_notification_preferences">[]>(["notifications", user.userId, "preferences"]);

    if (previousNotificationTags) {
      const newNotificationTags = [
        ...previousNotificationTags,
        {
          topic,
          enabled,
          channel,
          scope_id: scopeId,
          scope_type: scopeType
        }
      ] as Tables<"user_notification_preferences">[]
      queryClient.setQueriesData({ queryKey: ["notifications", user.userId, "preferences"] }, newNotificationTags);
    }

    return { previousNotificationTags }
  },
  onError: (err, _vars, context) => {
    if (context?.previousNotificationTags) {
      queryClient.setQueryData(["notifications", user.userId, "preferences"], context.previousNotificationTags);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["notifications", user.userId, "preferences"] });
  },
})