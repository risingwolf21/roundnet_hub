// src/features/grants/useUserGrantsQuery.ts
import { supabase } from '@/lib/supabase';
import { authKeys, useCurrentUserGrants } from '@/tanstack/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export type GrantsState = { perm: Set<string>; feat: Set<string> };
export type Mode = 'all' | 'any';

const empty: GrantsState = { perm: new Set(), feat: new Set() };

export function useUserGrantsQuery(userId: string | undefined | null) {
  const qc = useQueryClient();

  const q = useCurrentUserGrants(userId);

  const timerRef = useRef<number | null>(null);
  const invalidateSoon = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: authKeys.currentUserGrants(userId) });
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

      subs.push(
        supabase
          .channel(`rt:udg:${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_direct_grants', filter: `user=eq.${uid}` },
            invalidateSoon
          )
          .subscribe()
      );
      subs.push(
        supabase
          .channel(`rt:gum:${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'group_user_mapping', filter: `user=eq.${uid}` },
            invalidateSoon
          )
          .subscribe()
      );

      subs.push(
        supabase
          .channel(`rt:gp`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'group_permissions' }, invalidateSoon)
          .subscribe()
      );
      subs.push(
        supabase
          .channel(`rt:gf`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'group_features' }, invalidateSoon)
          .subscribe()
      );
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

  return {
    isEmpty: q.data?.perm.size === 0 && q.data.feat.size === 0,
    refetchUserGrants: q.refetch,
    loading: q.isFetching,
    grants: q.data ?? empty,
    ...has,
  };
}
