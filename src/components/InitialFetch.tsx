import {useEffect} from "react";
import {useDependency} from "../hooks/useDependency";
import {RootState, useAppDispatch} from "../redux/store";
import {fetchInsertedKeyHolderAsync, fetchKeysAsync} from "../redux/keysSlice";
import {IKeysRepository} from "../repository/IKeysRepository";
import {useClient} from "react-supabase";
import {IEventRepository} from "../repository/IEventRepository";
import {fetchEventsAsync, fetchSingleEventAsync} from "../redux/events/eventsSlice";
import {useSelector} from "react-redux";

export const useInitialFetch = () => {
    const keysRepository = useDependency<IKeysRepository>("IKeysRepository");
    const eventRepository = useDependency<IEventRepository>("IEventRepository");
    const dispatch = useAppDispatch();
    const client = useClient();
    const {user} = useSelector((state: RootState) => state.application);

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

    useEffect(() => {
        if (!eventRepository || !user)
            return;
        let subscription = client.channel("public:events")
            .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'events'
                }, payload => dispatch(fetchSingleEventAsync({
                    repository: eventRepository,
                    eventId: payload.new.id,
                    userId: user.userId
                }))
            )
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'key_holders'
            }, payload => dispatch(fetchSingleEventAsync({
                repository: eventRepository,
                eventId: payload.new.id,
                userId: user.userId
            })))
            .subscribe(x => console.log(x));
        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client, eventRepository, user]);

}