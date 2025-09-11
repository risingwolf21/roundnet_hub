// GrantsContext.tsx
import { captureException } from "@sentry/react";
import * as React from "react";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { UserWithGroups } from "src/types/supabaseTypes";

type GrantsState = { perm: Set<string>; feat: Set<string> };
type Mode = "all" | "any";

type GrantsContextValue = {
  user: UserWithGroups;
  grants: GrantsState;
  hasPerm: (k: string | string[], mode?: Mode) => boolean;
  hasFeat: (k: string | string[], mode?: Mode) => boolean;
  loading: boolean;
  signOut: () => void;
};

const GrantsContext = React.createContext<GrantsContextValue | null>(null);

const toArr = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const check = (need: string[], set: Set<string>, mode: Mode) =>
  need.length === 0 ? true : mode === "any" ? need.some(k => set.has(k)) : need.every(k => set.has(k));

export const GrantsProvider: React.FC<{ children: React.ReactNode; user: UserWithGroups }> = ({ children, user }) => {
  const [state, setState] = React.useState<GrantsState>({ perm: new Set(), feat: new Set() });
  const [loading, setLoading] = React.useState(true);
  const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) userId einmal bestimmen
      const uid = user.userId ?? null;
      userIdRef.current = uid;

      if (!uid) {
        setState({ perm: new Set(), feat: new Set() });
        setLoading(false);
        return;
      }

      // 2) initial fetch
      const { data, error } = await supabase
        .from("user_grants")
        .select("kind,key")
        .eq("user", uid);

      if (!cancelled) {
        if (!error && data) {
          const perm = new Set<string>();
          const feat = new Set<string>();
          for (const r of data) (r.kind === "perm" ? perm : feat).add(r.key);
          setState({ perm, feat });
        }
        setLoading(false);
      }

      // 3) single realtime subscription (diff-basiert, kein Re-Fetch)
      // cleanup evtl. altes Abo
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const chName = `user_grants:${uid}`;
      const ch = supabase
        .channel(chName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_grants", filter: `user=eq.${uid}` },
          (payload) => {
            setState((prev) => {
              const next = { perm: new Set(prev.perm), feat: new Set(prev.feat) };
              const kind = ((payload.new as any).key ?? (payload.old as any).key) as "perm" | "feat";
              const target = kind === "perm" ? next.perm : next.feat;

              if (payload.eventType === "INSERT") {
                target.add((payload.new as any).key);
              } else if (payload.eventType === "DELETE") {
                target.delete((payload.old as any).key);
              } else if (payload.eventType === "UPDATE") {
                // key könnte sich ändern
                if (payload.old?.key) target.delete((payload.old as any).key);
                if (payload.new?.key) target.add((payload.new as any).key);
              }
              return next;
            });
          }
        )
        .subscribe();
      channelRef.current = ch;
    };

    init();

    // bei Auth-Wechsel Grants neu laden
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      const newUid = session?.user?.id ?? null;
      if (newUid !== userIdRef.current) {
        userIdRef.current = newUid;
        setLoading(true);
        // re-init
        init();
      }
    });

    return () => {
      cancelled = true;
      authSub?.subscription?.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const hasPerm = React.useCallback(
    (k: string | string[], mode: Mode = "all") => check(toArr(k), state.perm, mode),
    [state.perm]
  );
  const hasFeat = React.useCallback(
    (k: string | string[], mode: Mode = "all") => check(toArr(k), state.feat, mode),
    [state.feat]
  );

  const signOut = async () => {
    try {
      const session = supabase.auth.getSession(); // Prüfen, ob eine Sitzung vorhanden ist
      if (!session) {
        captureException(Error('Session not found while signing out.'));
        setState({ perm: new Set(), feat: new Set() });
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
    } catch (error: any) {
      setState({ perm: new Set(), feat: new Set() });
      setLoading(false);
      captureException(error);
    } finally {
      await queryClient.invalidateQueries();
      queryClient.removeQueries();
    }
  };

  const value = React.useMemo<GrantsContextValue>(
    () => ({ grants: state, hasPerm, hasFeat, loading, user, signOut }),
    [state, hasPerm, hasFeat, loading]
  );

  return <GrantsContext.Provider value={value}>{children}</GrantsContext.Provider>;
};

export function useGrants() {
  const ctx = React.useContext(GrantsContext);
  if (!ctx) throw new Error("useGrants must be used within <GrantsProvider>");
  return ctx;
}
