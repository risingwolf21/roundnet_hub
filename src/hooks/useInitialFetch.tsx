import { useContext, useEffect } from "react";
import { useSelector } from "react-redux";
import { DependencyContext } from "src";
import { fetchDrinksAsync } from "src/redux/adminDrinksSlice";
import { fetchAdminUsersAsync } from "src/redux/adminUserSlice";
import { RootState, useAppDispatch } from "src/redux/store";
import { IAdminDrinksRepository } from "src/repository/IAdminDrinksRepository";
import { IAdminUsersRepository } from "src/repository/IAdminUsersRepository";

export function useInitialFetch() {

    const dispatch = useAppDispatch();
    const { container } = useContext(DependencyContext);
    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        // fetchAdminUsers();
        // fetchAdminDrinks();
    }, []);


    function fetchAdminDrinks() {
        if (user && user.role === "admin") {
            let adminDrinksRepository = container?.get<IAdminDrinksRepository>("IAdminDrinksRepository");
            if (adminDrinksRepository)
                dispatch(fetchDrinksAsync(adminDrinksRepository));
        }
    }

    function fetchAdminUsers() {
        if (user && user.role === "admin") {
            let adminUsersRepository = container?.get<IAdminUsersRepository>("IAdminUsersRepository");
            if (adminUsersRepository)
                dispatch(fetchAdminUsersAsync(adminUsersRepository));
        }
    }
    // useEffect(() => {
    //     if (!user)
    //         return;
    //     let userId = user.userId;
    //     let subscription = client
    //         .channel('public:drink')

    //         // .on<Payment>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentUpdated(payload.new)))
    //         // .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentDeleted(payload.old.id)))

    //         // .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload)))
    //         // .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload)))
    //         // .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload)))

    //         .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserUpdate(payload)))
    //         .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserDelete(payload)))
    //         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserInsert(payload)))

    //         .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentUpdate(payload)))
    //         .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentDelete(payload)))
    //         .on<Comment>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentInsert(payload.new)))

    //         .subscribe();

    //     return () => {
    //         subscription.unsubscribe();
    //     }
    // }, [client, dispatch, user]);
}