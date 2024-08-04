import React, {useEffect} from "react";
import {useSelector} from "react-redux";
import {fetchInsertedItemsAsync, keyHoldersSelector} from "src/features/keys/slices/keysSlice";
import {RootState, useAppDispatch} from "src/redux/store";
import {AlertSnackbar} from "../../components/AlertSnackbar";
import {useTranslation} from "react-i18next";
import {ItemHolderScreen} from "./index";
import {useClient} from "react-supabase";

const ItemHolderScreenProvider = () => {
    const {user} = useSelector((state: RootState) => state.application);
    const dispatch = useAppDispatch();
    const keyHolders = useSelector((state: RootState) => keyHoldersSelector.selectAll(state));
    const {loading} = useSelector((state: RootState) => state.keys);
    const {t} = useTranslation();
    const client = useClient();

    useEffect(() => {
        let subscription = client.channel("public:items")
            .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'items'
                }, payload => dispatch(fetchInsertedItemsAsync({
                    key: payload.new.key,
                    user: payload.new.user
                }))
            )
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'items'
            }, payload => dispatch(fetchInsertedItemsAsync({
                key: payload.new.key,
                user: payload.new.user
            })))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client]);

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <ItemHolderScreen
        t={t}
        dispatch={dispatch}
        user={user}
        loading={loading}
        keyHolders={keyHolders}/>
}

export default ItemHolderScreenProvider;