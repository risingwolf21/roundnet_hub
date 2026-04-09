'use client'

import { useMutation } from '@tanstack/react-query'
import { type AxiosError } from 'axios'
import { toast } from 'sonner'
import { invokeManagementApi } from '../lib/management-api'


// RUN SQL Query
export const runQuery = async ({
  projectRef,
  query,
  readOnly,
}: {
  projectRef: string
  query: string
  readOnly?: boolean
}) => {
  const { data, error } = await invokeManagementApi(`/v1/projects/${projectRef}/database/query`, 'POST', {
    query,
    read_only: readOnly,
  })

  if (error) {
    throw error
  }

  return data as any
}

export const useRunQuery = () => {
  return useMutation({
    mutationFn: runQuery,
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || 'There was a problem with your query.')
    },
  })
}
