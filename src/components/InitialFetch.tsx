import {useEffect} from "react";
import {useDependency} from "../hooks/useDependency";
import {RootState, useAppDispatch} from "../redux/store";
import {useClient} from "react-supabase";
import {IEventRepository} from "../repository/IEventRepository";
import {fetchSingleEventAsync} from "../redux/events/eventsSlice";
import {useSelector} from "react-redux";

export const useInitialFetch = () => {
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
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client, eventRepository, user]);

}