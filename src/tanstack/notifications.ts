import { useQuery } from "@tanstack/react-query";
import { Notification } from "types/supabase";
import { SupabaseUserRepository } from "src/repository/UserRepository";

export const useAllNotifications = (user: User) => useQuery<Notification[]>({
  queryKey: ["notifications"],
  queryFn: () => SupabaseUserRepository.loadNotifications(user)
});