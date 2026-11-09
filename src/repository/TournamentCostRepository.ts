import { supabase } from '@/lib/supabase';

export type TournamentCostRow = {
  id: string;
  user_id: string;
  tournament: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  created_at: string;
};

export type TournamentCostInsert = Omit<TournamentCostRow, 'id' | 'user_id' | 'created_at'>;
export type TournamentCostUpdate = Partial<TournamentCostInsert>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabase as any).from('tournament_costs');

export const TournamentCostRepository = {
  async fetchAll(userId: string): Promise<TournamentCostRow[]> {
    const { data } = await db()
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .throwOnError();
    return (data ?? []) as TournamentCostRow[];
  },

  async insert(userId: string, row: TournamentCostInsert): Promise<TournamentCostRow> {
    const { data } = await db()
      .insert({ ...row, user_id: userId })
      .select()
      .single()
      .throwOnError();
    return data as TournamentCostRow;
  },

  async update(id: string, patch: TournamentCostUpdate): Promise<void> {
    await db().update(patch).eq('id', id).throwOnError();
  },

  async remove(id: string): Promise<void> {
    await db().delete().eq('id', id).throwOnError();
  },
};
