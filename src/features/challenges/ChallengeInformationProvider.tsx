import React, {useEffect} from "react";
import {Navigate, useParams} from "react-router-dom";
import {ChallengeRepository} from "../../repository/ChallengeRepository";
import {withTranslation} from "react-i18next";
import {TFunction} from "i18next";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "../../redux/store";
import {useClient} from "react-supabase";
import {TablesInsert, TablesUpdate} from "../../types/supabase-generated.types";
import {
    challengeSelector,
    fetchChallengeStatsSingleAsync,
    onChallengeDelete,
    onChallengeInsert,
    onChallengeUpdate
} from "./slices/challengeSlice";
import {ChallengeInformation} from "./ChallengeInformation";
import {useAuth} from "../auth/AuthContext";

const ChallengeInformationProvider = ({t}: { t: TFunction }) => {
    const {challengeId} = useParams();
    const challenge = useSelector((root: RootState) => challengeSelector.selectById(root, challengeId ?? 0));
    const user = useAuth();
    const client = useClient();
    const dispatch = useAppDispatch();


    useEffect(() => {
        if (!challengeId)
            return;
        dispatch(fetchChallengeStatsSingleAsync({challengeId}));

        const subscription = client
            .channel("public:challenge_stats")
            .on<TablesUpdate<'challenge_stats'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenge_stats',
                filter: `id=eq.${challengeId}`
            }, payload => dispatch(fetchChallengeStatsSingleAsync({challengeId})))
            .on<TablesInsert<'challenge_stats'>>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'challenge_stats',
                filter: `id=eq.${challengeId}`
            }, payload => dispatch(fetchChallengeStatsSingleAsync({challengeId})))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'challenge_stats',
                filter: `id=eq.${challengeId}`
            }, payload => dispatch(fetchChallengeStatsSingleAsync({challengeId})))

            .on<TablesUpdate<'challenge'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenge'
            }, payload => dispatch(onChallengeUpdate(payload.new)))
            .on<TablesInsert<'challenge'>>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'challenge'
            }, payload => ChallengeRepository
                .fetchChallengeStats(payload.new.id?.toString() ?? "-1")
                .then(result => dispatch(onChallengeInsert(result.data))))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'challenge'
            }, payload => dispatch(onChallengeDelete(payload.old.id)))
            .subscribe();

        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client, challengeId]);

    if (!challenge)
        return <Navigate to={"/challenges"} replace={true}/>

    return <ChallengeInformation t={t} challenge={challenge} user={user}/>
}

export default withTranslation()(ChallengeInformationProvider)