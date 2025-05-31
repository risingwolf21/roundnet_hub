import { useQuery } from "@tanstack/react-query";
import { Notification } from "types/supabase";
import { SupabaseUserRepository } from "src/repository/UserRepository";

export const useAllNotifications = (user: User | null) => useQuery<Notification[]>({
  queryKey: ["notifications"],
  enabled: !!user,
  queryFn: () => SupabaseUserRepository.loadNotifications(user!)
});