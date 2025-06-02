import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
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

export const useNotificationTags = (user: User) => useQuery<string[]>({
  queryKey: ["notifications", user.userId, "tags"],
  queryFn: async () => {
    const result = await supabase
      .from('user_notification_settings')
      .select("notification_tag")
      .eq("user", user.userId)
      .throwOnError();

    return (result.data ?? []).map(x => x.notification_tag);
  }
})

export const useAddNotificationTag = (user: User) => useMutation({
  mutationFn: async ({ tag }: { tag: string }) => {
    const result = await supabase
      .from('user_notification_settings')
      .insert({ user: user.userId, notification_tag: tag })
      .select("*")
      .throwOnError();

    return result;
  },
  onMutate: async ({ tag }) => {
    await queryClient.cancelQueries({ queryKey: ["notifications", user.userId, "tags"] });
    const previousNotificationTags = queryClient.getQueryData<string[]>(["notifications", user.userId, "tags"]);

    if (previousNotificationTags) {
      const newNotificationTags = [
        ...previousNotificationTags,
        tag
      ]
      queryClient.setQueriesData({ queryKey: ["notifications", user.userId, "tags"] }, newNotificationTags);
    }

    return { previousNotificationTags }
  },
  onError: (err, _vars, context) => {
    if (context?.previousNotificationTags) {
      queryClient.setQueryData(["notifications", user.userId, "tags"], context.previousNotificationTags);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["notifications", user.userId, "tags"] });
  },
})

export const useRemoveNotificationTag = (user: User) => useMutation({
  mutationFn: async ({ tag }: { tag: string }) => {
    const result = await supabase
      .from('user_notification_settings')
      .delete()
      .eq('user', user.userId)
      .eq("notification_tag", tag)
      .select()
      .throwOnError();

    return result;
  },
  onMutate: async ({ tag }) => {
    await queryClient.cancelQueries({ queryKey: ["notifications", user.userId, "tags"] });
    const previousNotificationTags = queryClient.getQueryData<string[]>(["notifications", user.userId, "tags"]);

    if (previousNotificationTags) {
      const newNotificationTags = previousNotificationTags.filter(x => x !== tag)
      queryClient.setQueriesData({ queryKey: ["notifications", user.userId, "tags"] }, newNotificationTags);
    }

    return { previousNotificationTags }
  },
  onError: (err, _vars, context) => {
    if (context?.previousNotificationTags) {
      queryClient.setQueryData(["notifications", user.userId, "tags"], context.previousNotificationTags);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["notifications", user.userId, "tags"] });
  },
})