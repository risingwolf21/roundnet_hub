import { useQuery } from "@tanstack/react-query";
import { SupabaseUserRepository } from "src/repository/UserRepository";

export const useAllNotifications = (user: User) => useQuery({
  queryKey: ["notifications"],
  queryFn: () => SupabaseUserRepository.loadNotifications(user)
});