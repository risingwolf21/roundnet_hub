import {useEffect} from "react";
import {RootState, useAppDispatch} from "../redux/store";
import {useClient} from "react-supabase";
import {EventAttendanceUpdate} from "../types/supabaseTypes";
import {useSelector} from "react-redux";

type Props = {
    children: string | JSX.Element | JSX.Element[]
}


export const InitialLoader = ({children}: Props) => {

    const dispatch = useAppDispatch();
    const client = useClient();
    const {user} = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if(!user){
            console.log("no user")
            return;
        }
        let subscription = client.channel("public")
            .on<EventAttendanceUpdate>('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'key_holders'
            }, payload => console.log(payload))
            .subscribe(x=> console.log(x));
        return () => {
            subscription.unsubscribe();
            console.log("unsubscribed!")
        }
    }, [client, dispatch, user]);

    return children;
}