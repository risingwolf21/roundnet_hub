'use client'

import { useQuery } from '@tanstack/react-query'
import { invokeManagementApi } from '../lib/management-api'


// GET Logs
const getLogs = async ({
  projectRef,
  iso_timestamp_start,
  iso_timestamp_end,
  sql,
}: {
  projectRef: string
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

  const { data, error } = await invokeManagementApi(`/v1/projects/${projectRef}/analytics/endpoints/logs.all?${queryString}`, 'GET')

  if (error) {
    throw error
  }

  return data as any
}

export const useGetLogs = (
  projectRef: string,
  params: {
    iso_timestamp_start?: string
    iso_timestamp_end?: string
    sql?: string
  } = {}
) => {
  const queryKey = ['logs', projectRef, params.sql]

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
      return getLogs({ projectRef, ...queryParams })
    },
    enabled: !!projectRef,
    retry: false,
  })
}
