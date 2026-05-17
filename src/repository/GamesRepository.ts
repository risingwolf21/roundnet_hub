import { supabase } from '@/lib/supabase';
import { GamesTable } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';
import { fetchSimpleUser } from './UserRepository';

export const fetchMatch = () =>
  supabase.schema('games').from('match').select(`
      *,
      a_player_1: players!a_player_1(*),
      a_player_2: players!a_player_2(*),
      b_player_1: players!b_player_1(*),
      b_player_2: players!b_player_2(*),
      sets(*)
  `);

export const GamesRepository = {

  async fetchGamesForEvent(eventId: string): Promise<FullMatch[]> {
    const result = await fetchMatch().eq('event', eventId).throwOnError();
    return result.data ?? [];
  },

  async fetchAvailablePlayers(): Promise<(PlayerWithSimpleUser | Player)[]> {
    const { data: simpleUsers } = await fetchSimpleUser();
    const { data: players } = await supabase.schema('games').from('players').select('*');

    const usersById = _.keyBy(simpleUsers || [], 'id');

    const combinedPlayers = (players || []).map((player) => {
      if (player.linked_user_id && usersById[player.linked_user_id]) {
        return {
          ...player,
          ...usersById[player.linked_user_id],
        } as PlayerWithSimpleUser;
      }
      return { ...player } as Player;
    });

    return combinedPlayers.sort((x, y) => (x.display_name || '').localeCompare(y.display_name || ''));
  },

  async reportScores(
    {
      sets, team_a, team_b, event, created_by, is_public, player_names
    }: {
      sets: { team_a_score: number; team_b_score: number }[],
      team_a: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      },
      team_b: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      },
      event?: string,
      created_by?: string,
      is_public?: boolean,
      player_names?: { [key: string]: string }
    }
  ): Promise<PostgrestSingleResponse<string>> {
    return supabase
      .schema('games')
      .rpc('add_match_with_sets', {
        match_sets: sets.map((x) => ({ team_a_score: x.team_a_score, team_b_score: x.team_b_score })),
        player_1a: team_a.player_1,
        player_1a_rating: team_a.player_1_rating,
        player_2a: team_a.player_2,
        player_2a_rating: team_a.player_2_rating,
        player_1b: team_b.player_1,
        player_1b_rating: team_b.player_1_rating,
        player_2b: team_b.player_2,
        player_2b_rating: team_b.player_2_rating,
        event,
        created_by,
        is_public,
        player_names
      })
      .throwOnError();
  },

  async fetchLeaderboard(minMatches: number) {
    const result = await supabase
      .schema('games')
      .from('leaderboard')
      .select('*')
      .gte('matches_played', minMatches)
      .order('rating', { ascending: false })
      .throwOnError();
    return result.data ?? [];
  },

  async fetchMatchWithDetails(matchId: string) {
    const { data: match, error } = await supabase
      .schema('games')
      .from('match')
      .select(`
        *,
        sets(*),
        elo_calc_log(*),
        elo_history!elo_history_match_fkey(*)
      `)
      .eq('id', matchId)
      .maybeSingle();

    if (error) throw error;
    if (!match) return null;

    const playerIds = [match.a_player_1, match.a_player_2, match.b_player_1, match.b_player_2].filter(Boolean);

    const { data: players } = await supabase
      .schema('games')
      .from('players')
      .select('*')
      .in('player', playerIds);

    const userIds = players?.map(p => p.linked_user_id).filter(x => x !== null) || [];

    const { data: users } = await supabase
      .from('user')
      .select('*')
      .in('id', userIds);

    const getUser = (playerId: string) => {
      const player = players?.find(p => p.player === playerId) ?? null;
      const user = users?.find(u => u.id === player?.linked_user_id) ?? null;
      return { player, user };
    };

    return {
      ...match,
      player_1a: getUser(match.a_player_1),
      player_2a: getUser(match.a_player_2),
      player_1b: getUser(match.b_player_1),
      player_2b: getUser(match.b_player_2),
    };
  },

  async fetchUserMatches(): Promise<UserMatchesView[]> {
    const result = await supabase
      .schema('games')
      .from('user_matches')
      .select('*')
      .returns<UserMatchesView[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchPlayerMatches(playerId: string) {
    const result = await supabase
      .schema('games')
      .from('user_matches')
      .select('*')
      .or(`team_a_p1.eq.${playerId},team_a_p2.eq.${playerId},team_b_p1.eq.${playerId},team_b_p2.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .throwOnError();
    return result.data ?? [];
  },

  async createMatchWithSets(params: {
    sets: { team_a_score: number; team_b_score: number }[];
    team_a: {
      player_1: string;
      player_1_rating: number;
      player_2: string;
      player_2_rating: number;
      name: string;
    };
    team_b: {
      player_1: string;
      player_1_rating: number;
      player_2: string;
      player_2_rating: number;
      name: string;
    };
    event?: string;
    rated: boolean;
    is_public: boolean;
    created_by?: string;
    player_names: { [key: string]: string };
  }): Promise<PostgrestSingleResponse<string>> {
    return supabase
      .schema('games')
      .rpc('add_match_with_sets', {
        match_sets: params.sets.map((x) => ({ team_a_score: x.team_a_score, team_b_score: x.team_b_score })),
        player_1a: params.team_a.player_1,
        player_1a_rating: params.team_a.player_1_rating,
        player_2a: params.team_a.player_2,
        player_2a_rating: params.team_a.player_2_rating,
        player_1b: params.team_b.player_1,
        player_1b_rating: params.team_b.player_1_rating,
        player_2b: params.team_b.player_2,
        player_2b_rating: params.team_b.player_2_rating,
        event: params.event,
        rated: params.rated,
        is_public: params.is_public,
        created_by: params.created_by,
        player_names: params.player_names,
      })
      .throwOnError();
  },

  async upsertSetsToMatch(matchId: string, sets: GamesTable<'sets'>[]) {
    const result = await supabase
      .schema('games')
      .from('sets')
      .upsert(sets)
      .select('*')
      .throwOnError();

    await supabase
      .schema('games')
      .from('sets')
      .delete()
      .not('id', 'in', `(${sets.map((x) => `${x.id}`).join(',')})`)
      .eq('match', matchId)
      .throwOnError();

    return result.data;
  },

  async deleteMatch(matchId: string) {
    const result = await supabase
      .schema('games')
      .from('match')
      .delete()
      .eq('id', matchId)
      .select('*')
      .throwOnError();
    return result.data;
  },
};
