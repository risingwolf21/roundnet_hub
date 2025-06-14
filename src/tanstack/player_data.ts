import { useQuery } from "@tanstack/react-query";
import { supabase } from "src/components/services/supabase/supabaseClient";

export const usePlayer = (user: User) => useQuery<Player | null>({
  queryKey: ["player_data", user.userId],
  queryFn: async () => {
    const result = await supabase
      .schema('games')
      .from('players')
      .select('*')
      .eq('player', user.userId)
      .maybeSingle()
      .throwOnError();

    return result.data;
  }
})