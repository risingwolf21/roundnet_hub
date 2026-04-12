'use client'

import { useQuery } from '@tanstack/react-query';

import { SUPABASE_PROJECT_REF } from '@/utils';
import { listTablesSql } from '../lib/pg-meta';
import { runQuery } from './use-run-query';

// LIST Tables
const listTables = ({ projectRef, schemas }: { projectRef: string; schemas?: string[] }) => {
  const sql = listTablesSql(schemas)
  return runQuery({
    projectRef,
    query: sql
  })
}

export const useListTables = (schemas?: string[]) => {
  return useQuery({
    queryKey: ['tables', SUPABASE_PROJECT_REF, schemas],
    queryFn: () => listTables({ projectRef: SUPABASE_PROJECT_REF, schemas }),
    enabled: !!SUPABASE_PROJECT_REF,
  })
}
