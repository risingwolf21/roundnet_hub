'use client'

import { SUPABASE_PROJECT_REF } from '@/utils'
import { useQuery } from '@tanstack/react-query'
import { invokeManagementApi } from '../lib/management-api'


// GET Logs
const getLogs = async ({
  iso_timestamp_start,
  iso_timestamp_end,
  sql,
}: {
  iso_timestamp_start?: string
  iso_timestamp_end?: string
  sql?: string
}) => {
  const queryString = Object.entries({
    sql: sql,
    iso_timestamp_start: iso_timestamp_start,
    iso_timestamp_end: iso_timestamp_end
  })
    .map(([k, v]) => {
      if (v) {
        return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
      }
      return '';
    })
    .join("&");

  const { data, error } = await invokeManagementApi(`/v1/projects/${SUPABASE_PROJECT_REF}/analytics/endpoints/logs.all?${queryString}`, 'GET')

  if (error) {
    throw error
  }

  return data as any
}

export const useGetLogs = (
  params: {
    iso_timestamp_start?: string
    iso_timestamp_end?: string
    sql?: string
  } = {}
) => {
  const queryKey = ['logs', SUPABASE_PROJECT_REF, params.sql]

  return useQuery({
    queryKey: queryKey,
    queryFn: () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const queryParams = {
        sql: params.sql,
        iso_timestamp_start: params.iso_timestamp_start ?? oneHourAgo.toISOString(),
        iso_timestamp_end: params.iso_timestamp_end ?? now.toISOString(),
      }
      return getLogs({ ...queryParams })
    },
    enabled: !!SUPABASE_PROJECT_REF,
    retry: false,
  })
}
