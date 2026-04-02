import createClient from 'openapi-fetch'

import type { paths } from './management-api-schema'

export const client = createClient<paths>({
  baseUrl: 'https://api.supabase.com/',
})

// sbp_9de70eaf855f68d8965351cc3749365af6ce03b2
