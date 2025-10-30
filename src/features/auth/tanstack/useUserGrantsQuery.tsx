// src/features/grants/useUserGrantsQuery.ts
import { supabase } from '@/lib/supabase';
import { QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

export type GrantsState = { perm: Set<string>; feat: Set<string> };
export type Mode = 'all' | 'any';

const qk = (userId: string | null): QueryKey => ['user-grants', userId];
const empty: GrantsState = { perm: new Set(), feat: new Set() };

function rowsToSets(rows: Array<{ kind: 'perm' | 'feat'; key: string }>): GrantsState {
  const perm = new Set<string>();
  const feat = new Set<string>();
  for (const r of rows ?? []) (r.kind === 'perm' ? perm : feat).add(r.key);
  return { perm, feat };
}

export function useUserGrantsQuery(userId: string) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: qk(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_grants_view")
        .select('kind,key')
        .eq('user', userId);
      console.log(data, error)
      if (error) throw error;
      return rowsToSets((data ?? []) as any[]);
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`user_grants:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_grants', filter: `user=eq.${userId}` },
        (payload) => {
          qc.setQueryData<GrantsState>(qk(userId), (prev) => {
            const base = prev ?? empty;
            const next: GrantsState = { perm: new Set(base.perm), feat: new Set(base.feat) };
            const kind = ((payload.new as any)?.kind ?? (payload.old as any)?.kind) as 'perm' | 'feat' | undefined;
            const keyNew = (payload.new as any)?.key as string | undefined;
            const keyOld = (payload.old as any)?.key as string | undefined;
            if (kind !== 'perm' && kind !== 'feat') return base;
            const target = kind === 'perm' ? next.perm : next.feat;
            switch (payload.eventType) {
              case 'INSERT': if (keyNew) target.add(keyNew); break;
              case 'UPDATE': if (keyOld) target.delete(keyOld); if (keyNew) target.add(keyNew); break;
              case 'DELETE': if (keyOld) target.delete(keyOld); break;
            }
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const toArr = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const check = (need: string[], set: Set<string>, mode: Mode) =>
    need.length === 0 ? true : mode === 'any' ? need.some((k) => set.has(k)) : need.every((k) => set.has(k));

  const has = useMemo(() => {
    const hasPerm = (k: string | string[], mode: Mode = 'all') => check(toArr(k), q.data?.perm ?? empty.perm, mode);
    const hasFeat = (k: string | string[], mode: Mode = 'all') => check(toArr(k), q.data?.feat ?? empty.feat, mode);
    return { hasPerm, hasFeat };
  }, [q.data]);

  return { refetchUserGrants: q.refetch, loading: q.isLoading, grants: q.data ?? empty, ...has };
}
