import { supabase } from "@/lib/supabase";
import { fetchSimpleUser } from "@/repository/UserRepository";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const useUsers = () =>
  useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const result = await fetchSimpleUser().throwOnError();

      return result.data ?? [];
    },
  });

export const useInfiniteLogsList = (count: number = 50) =>
  useInfiniteQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async ({ pageParam }) => {
      const result = await supabase
        .schema("audit")
        .from("log")
        .select("*")
        .order("at", { ascending: false })
        .range(pageParam * count, pageParam * count + count - 1);

      const hasMore = (result.data?.length ?? 0) === count;

      return {
        data: result.data ?? [],
        nextPage: hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  }); 