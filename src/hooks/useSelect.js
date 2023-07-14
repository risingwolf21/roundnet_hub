import { useCallback, useEffect, useRef, useState } from "react"
import { useClient } from "react-supabase"

export const useSelect = (table, config) => {
    const client = useClient()
    const isMounted = useRef(false)
    const [state, setState] = useState({
        count: undefined,
        data: undefined,
        error: undefined,
        fetching: false,
        stale: false,
    })

    const execute = useCallback(async () => {
        if (!config || config.pause) return null

        setState((x) => ({
            ...state,
            data: x.data,
            stale: true,
            fetching: true,
        }))

        const source = client
            .from(table)
            .select(config.columns ?? "*", config.options ?? {})

        const { count, data, error } = await (config.filter
            ? config.filter(source)
            : source)

        if (isMounted.current)
            setState({ count, data, error, stale: false, fetching: false })

        return { count, data, error }
    }, [client, config, table]);

    useEffect(() => {
        isMounted.current = true
        execute()
        return () => {
            isMounted.current = false
        }
    }, [table])

    return [state, execute]
}