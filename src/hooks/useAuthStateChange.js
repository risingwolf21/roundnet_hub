import { useEffect } from 'react'
import { useClient } from 'react-supabase'


export function useAuthStateChange(callback) {
    const client = useClient()

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        client.auth.onAuthStateChange(callback)
    }, [])
    /* eslint-enable react-hooks/exhaustive-deps */
}