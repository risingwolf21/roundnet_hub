import { useEffect } from 'react'
import { useClient } from 'react-supabase'

export const useSubscription = (config, callback) => {

    const client = useClient();

    useEffect(() => {
        let subscription = client
            .channel("*")
            .on('*', { event: config.event ?? '*', table: config.table ?? "*" }, callback)
            .subscribe()
        return () => {
            subscription.unsubscribe()
        }
    }, [callback, client, config]);
}