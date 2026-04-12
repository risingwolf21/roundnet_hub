'use client'

import { useEffect } from 'react'

import { AppBar } from '@/components/ui/appbar'
import { useGrants } from '@/features/auth/GrantsContext'
import { SUPABASE_PROJECT_REF } from '@/utils'
import { useRunQuery } from '../hooks/use-run-query'
import { ResultsTable } from './results-table'

export function UsersManager() {
  const { user } = useGrants();
  const defaultSql = `SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 100;`

  const { mutate: runQuery, data, isPending, error } = useRunQuery()

  useEffect(() => {
    runQuery({ projectRef: SUPABASE_PROJECT_REF, query: defaultSql })
  }, [runQuery, defaultSql])

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={"User Manager"}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="pb-8">

          <ResultsTable data={data} onRowClick={(row) => { }} />

        </div>
      </main>
    </div>
  )
}
