import { fetchSimpleUser } from "@/repository/UserRepository";
import { useQuery } from "@tanstack/react-query";

export const useUsers = () =>
  useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const result = await fetchSimpleUser().throwOnError();

      return result.data ?? [];
    },
  });