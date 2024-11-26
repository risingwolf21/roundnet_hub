import CustomAppBar from "../../components/AppBar";
import {Grid, LinearProgress, List, ListItem, ListItemText} from "@mui/material";
import React, {useEffect} from "react";
import {RootState, useAppDispatch} from "../../redux/store";
import {
    challengeSelector,
    fetchChallengesAsync,
    onChallengeDelete,
    onChallengeInsert,
    onChallengeUpdate
} from "./slices/challengeSlice";
import {Challenge} from "../../types/supabaseTypes";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {TablesInsert, TablesUpdate} from "src/types/supabase-generated.types";
import {useClient} from "react-supabase";
import {ChallengeRepository} from "src/repository/ChallengeRepository";

const ChallengeListProvider = () => {
    const dispatch = useAppDispatch();
    const client = useClient();
    const challenges = useSelector((state: RootState) => challengeSelector.selectAll(state));

    useEffect(() => {
        dispatch(fetchChallengesAsync());

        const subscription = client
            .channel("public:challenge_stats")

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
    }, [dispatch, client]);

    return <ChallengeList loading={false} challenges={challenges} />
}

type ChallengeListProps = {
    loading: boolean,
    challenges: Challenge[]
}

const ChallengeList = ({ loading, challenges }: ChallengeListProps) => {
    const navigate = useNavigate();
    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar/>
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <List sx={{ width: "100%" }}>
            {
                challenges.map(entry => <ListItem key={entry.id} onClick={() => navigate("/challenges/" + entry.id)}>
                    <ListItemText primary={entry.name} secondary={entry.description} />
                </ListItem>)
            }
        </List>
    </Grid>
}

export default ChallengeListProvider;