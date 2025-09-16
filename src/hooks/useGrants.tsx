import React from "react";
import { useGrants } from "src/features/auth/GrantsContext";
import { Feature, Permission } from "src/generated/supabase-types";

type HasProps = {
  perm?: Permission | Permission[];
  feat?: Feature | Feature[];
  /** Wenn true: es reicht eines (ANY). Standard: alle (ALL) müssen vorhanden sein. */
  any?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export const Has: React.FC<HasProps> = ({ perm, feat, any = false, fallback = null, children }) => {
  const { hasPerm, hasFeat, loading } = useGrants();
  if (loading) return null; // optional: oder Spinner/Fallback

  const permOk = perm ? hasPerm(perm, any ? "any" : "all") : true;
  const featOk = feat ? hasFeat(feat, any ? "any" : "all") : true;

  if (!permOk || !featOk) return <>{fallback}</>;
  return <>{children}</>;
};
