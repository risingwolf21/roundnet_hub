// src/features/grants/useUserGrantsQuery.ts
import { supabase } from '@/lib/supabase';
import { QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export type GrantsState = { perm: Set<string>; feat: Set<string> };
export type Mode = 'all' | 'any';

const qk = (userId: string | null): QueryKey => ['user-grants', userId];
const empty: GrantsState = { perm: new Set(), feat: new Set() };

export function useUserGrantsQuery(userId: string) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: qk(userId),
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_grants_view")
        .select('kind,key')
        .eq('user', userId);

      if (error) throw error;

      return data.reduce((prev, curr) => {
        if (curr.key && curr.kind) {
          switch (curr.kind) {
            case 'perm': return { feat: prev.feat, perm: prev.perm.add(curr.key) }
            case 'feat': return { feat: prev.feat.add(curr.key), perm: prev.perm }
          }
        }
        return prev;
      }, { perm: new Set<string>(), feat: new Set<string>() })
    },
    placeholderData: empty,
    refetchOnWindowFocus: false,
  });

  const timerRef = useRef<number | null>(null);
  const invalidateSoon = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: qk(userId) });
      timerRef.current = null;
    }, 150);
  }, [qc, userId]);

  useEffect(() => {
    const subs: ReturnType<typeof supabase.channel>[] = [];
    let mounted = true;

    (async () => {
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id ?? null;
      if (!mounted || !uid) return;

      subs.push(supabase.channel(`rt:udg:${uid}`).on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_direct_grants', filter: `user=eq.${uid}` },
        invalidateSoon
      ).subscribe());
      subs.push(supabase.channel(`rt:gum:${uid}`).on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_user_mapping', filter: `user=eq.${uid}` },
        invalidateSoon
      ).subscribe());

      subs.push(supabase.channel(`rt:gp`).on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_permissions' },
        invalidateSoon
      ).subscribe());
      subs.push(supabase.channel(`rt:gf`).on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_features' },
        invalidateSoon
      ).subscribe());
    })();

    return () => {
      mounted = false;
      subs.forEach((c) => supabase.removeChannel(c));
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [userId, qc, invalidateSoon]);

  const toArray = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const check = (need: string[], set: Set<string>, mode: Mode) =>
    need.length === 0 ? true : mode === 'any' ? need.some((k) => set.has(k)) : need.every((k) => set.has(k));

  const has = useMemo(() => {
    const hasPerm = (k: string | string[], mode: Mode = 'all') => check(toArray(k), q.data?.perm ?? empty.perm, mode);
    const hasFeat = (k: string | string[], mode: Mode = 'all') => check(toArray(k), q.data?.feat ?? empty.feat, mode);
    return { hasPerm, hasFeat };
  }, [q.data]);

  return { refetchUserGrants: q.refetch, loading: q.isLoading, grants: q.data ?? empty, ...has };
}
