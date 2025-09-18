import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from 'src/lib/queryClient';
import { supabase } from "src/lib/supabase";
import { GamesRepository } from "src/repository/GamesRepository";
import { GamesTable, UserMatchesView } from "src/types/supabaseTypes";
import { formatDateToDatabase } from "src/utils";

export const useMatch = (matchId?: string) => useQuery({
  queryKey: ["matches", matchId],
  queryFn: async () => {
    if (!matchId)
      return null;
    const result = await supabase
      .schema("games")
      .from('match')
      .select("*, team_a: teams!team_a(*, player_1: players!player_1(*), player_2: players!player_2(*)), team_b: teams!team_b(*, player_1: players!player_1(*), player_2: players!player_2(*)), sets: sets(*), elo_calc_log: elo_calc_log(*), elo_history: elo_history!elo_history_match_fkey(*)")
      .eq("id", matchId)
      .maybeSingle();

    if (!result.data)
      return null;

    const p1a = await supabase.from("user").select("*").eq("userId", result.data.team_a.player_1.player).single()
    const p1b = await supabase.from("user").select("*").eq("userId", result.data.team_b.player_1.player).single()
    const p2a = await supabase.from("user").select("*").eq("userId", result.data.team_a.player_2.player).single()
    const p2b = await supabase.from("user").select("*").eq("userId", result.data.team_b.player_2.player).single()

    return {
      ...result.data,
      player_1a: p1a.data,
      player_1b: p1b.data,
      player_2a: p2a.data,
      player_2b: p2b.data
    }
  }
})

export const useMatches = () => useQuery<UserMatchesView[]>({
  queryKey: ['matches'],
  queryFn: async () => {
    const result = await supabase
      .schema('games')
      .from('user_matches')
      .select("*")
      .returns<UserMatchesView[]>();

    return result.data ?? [];
  }
});

export const usePlayers = () => useQuery<PlayerWithSimpleUser[]>({
  queryKey: ['players'],
  queryFn: GamesRepository.fetchAvailablePlayers
})

export const useTeams = () => useQuery<GamesTable<'teams'>[]>({
  queryKey: ['teams'],
  queryFn: async () => {
    const result = await supabase
      .schema("games")
      .from("teams")
      .select("*");

    return result.data ?? [];
  }
})

export const useCreateMatch = () => useMutation({
  mutationFn: async ({ sets, team_a, team_b, event, rating_enabled, created_by }: {
    sets: { team_a_score: number; team_b_score: number }[],
    team_a: {
      player_1: string,
      player_2: string,
      name: string,
    },
    team_b: {
      player_1: string,
      player_2: string,
      name: string
    },
    event?: string,
    rating_enabled: boolean,
    created_by?: string
  }) => {
    const result = await supabase
      .schema('games')
      .rpc('add_match_with_sets', {
        match_sets: sets.map((x) => ({ team_a_score: x.team_a_score, team_b_score: x.team_b_score })),
        player_1a: team_a.player_1,
        player_2a: team_a.player_2,
        player_1b: team_b.player_1,
        player_2b: team_b.player_2,
        team_a: team_a.name,
        team_b: team_b.name,
        event: event,
        rated: rating_enabled,
        created_by: created_by
      })
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ sets, team_a, team_b }) => {
    await queryClient.cancelQueries({ queryKey: ['matches'] });

    const previousMatches = queryClient.getQueryData<UserMatchesView[]>(['matches']);

    if (previousMatches) {
      const newMatches = [
        ...previousMatches,
        {
          team_a_name: team_a.name,
          team_b_name: team_b.name,
          set_results: sets.map(x => x.team_a_score + ":" + x.team_b_score).join(", "),
          created_at: formatDateToDatabase(new Date()),
        }
      ] as UserMatchesView[];
      queryClient.setQueryData<UserMatchesView[]>(['matches'], newMatches);
    }

    return { previousMatches };
  },
  onError: (_e, _v, context) => {
    if (context?.previousMatches) {
      queryClient.setQueryData(['matches'], context.previousMatches);
    }
  },
  onSettled: (_d, _e, _v, context) => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  },
})

export const useUpsertSetsToMatch = (matchId: string) => useMutation({
  mutationFn: async ({ sets }: { sets: MatchSet[] }) => {
    const result = await supabase
      .schema("games")
      .from("sets")
      .upsert(sets.map(x => ({
        set_number: x.set_number,
        match: matchId,
        team_a_score: x.team_a_score,
        team_b_score: x.team_b_score,
      })))
      .select("*")
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ sets }) => {
    await queryClient.cancelQueries({ queryKey: ['matches'] });

    const previousMatches = queryClient.getQueryData<FullUserMatch[]>(['matches']);

    if (previousMatches) {
      const newMatches = previousMatches.map(x => {
        if (x.id === matchId) {
          return {
            ...x,
            set_results: sets.map(x => x.team_a_score + ":" + x.team_b_score).join(", ")
          }
        }
        return x;
      })
      queryClient.setQueryData<FullUserMatch[]>(['matches'], newMatches);
    }

    return { previousMatches };
  },
  onError: (_e, _v, context) => {
    if (context?.previousMatches) {
      queryClient.setQueryData(['matches'], context.previousMatches);
    }
  },
  onSettled: (_d, _e, _v, context) => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  },
})