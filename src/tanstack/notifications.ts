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