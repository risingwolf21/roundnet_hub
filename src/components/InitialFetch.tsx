import {useEffect} from "react";
import {useDependency} from "../hooks/useDependency";
import {useAppDispatch} from "../redux/store";
import {fetchInsertedKeyHolderAsync, fetchKeysAsync} from "../redux/keysSlice";
import {IKeysRepository} from "../repository/IKeysRepository";
import { useClient } from "react-supabase";

export const useInitialFetch = () => {
    const keysRepository = useDependency<IKeysRepository>("IKeysRepository");
    const dispatch = useAppDispatch();
    const client = useClient();

    // useEffect(() => {
    //     if (sentryRepository) {
    //         sentryRepository.loadUnresolvedIssues().then((result) => {
    //             console.log(result);
    //         })
    //     }
    // }, [sentryRepository]);

    useEffect(() => {
        if (!keysRepository)
            return;
        let subscription = client.channel("public:key_holders")
            .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'key_holders'
                }, payload => dispatch(fetchInsertedKeyHolderAsync({
                    keysRepository,
                    key: payload.new.key,
                    user: payload.new.user
                }))
            )
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'key_holders'
            }, payload => dispatch(fetchInsertedKeyHolderAsync({
                keysRepository,
                key: payload.new.key,
                user: payload.new.user
            })))
            .subscribe(x => console.log(x));
        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client, keysRepository]);

    useEffect(() => {
        if (keysRepository)
            dispatch(fetchKeysAsync(keysRepository))
    }, [dispatch, keysRepository]);
}