import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update} from "@reduxjs/toolkit";
import {RootState} from "../../../redux/store";
import {ChallengeRepository} from "../../../repository/ChallengeRepository";
import {ChallengeStatWithUser, FullChallenge} from "../../../types/supabaseTypes";
import {TablesUpdate} from "../../../types/supabase-generated.types";

const challengeAdapter = createEntityAdapter({
    selectId: (challenge: FullChallenge) => challenge.id
});

export const challengeSelector = challengeAdapter.getSelectors((st: RootState) => st.challenges);

const challengeSlice = createSlice({
    name: "challenges",
    initialState: challengeAdapter.getInitialState({
        loading: false,
        error: null as string | null
    }),
    reducers: {
        onChallengeStatsUpdate: (state, action: PayloadAction<ChallengeStatWithUser | null>) => {
            if (!action.payload)
                return;
            let challenge = challengeAdapter.getSelectors().selectById(state, action.payload.id ?? -1);
            if (!challenge)
                return;
            let update = {
                id: challenge.id,
                changes: {
                    ...challenge,
                    stats: [...(challenge.stats.filter(x => x.id !== action.payload?.id ?? -1)), action.payload]
                }
            } as Update<FullChallenge>;
            challengeAdapter.updateOne(state, update);
        },
        onChallengeStatsInsert: (state, action: PayloadAction<ChallengeStatWithUser | null>) => {
            if (!action.payload)
                return;
            let challenge = challengeAdapter.getSelectors().selectById(state, action.payload.id ?? -1);
            if (!challenge)
                return;

            let update = {
                id: challenge.id,
                changes: {
                    ...challenge,
                    stats: [...challenge.stats, action.payload]
                }
            } as Update<FullChallenge>;
            challengeAdapter.updateOne(state, update);
        },
        onChallengeStatsDelete: (state, action: PayloadAction<number>) => {
            // let challenge = challengeAdapter
            //     .getSelectors()
            //     .selectById(state, action.payload.id?.toString() ?? -1);
            // if (!challenge)
            //     return;

            // let update = {
            //     id: challenge.id,
            //     changes: {
            //         ...challenge,
            //         stats: challenge.stats.filter(x => x.id !== action.payload)
            //     }
            // } as Update<FullChallenge>;
            // challengeAdapter.updateOne(state, update);
        },

        onChallengeUpdate: (state, action: PayloadAction<TablesUpdate<'challenge'>>) => {
            let fullChallenge = challengeAdapter
                .getSelectors()
                .selectById(state, action.payload.id?.toString() ?? "-1");
            if (!fullChallenge)
                return;
            let update = {
                id: action.payload.id,
                changes: {
                    ...fullChallenge,
                    description: action.payload.description,
                    name: action.payload.name,
                }
            } as Update<FullChallenge>;
            challengeAdapter.updateOne(state, update);
        },
        onChallengeInsert: (state, action: PayloadAction<FullChallenge | null>) => {
            if (!action.payload)
                return;
            challengeAdapter.upsertOne(state, action.payload);
        },
        onChallengeDelete: (state, action: PayloadAction<number>) => {
            challengeAdapter.removeOne(state, action.payload)
        },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchChallengesAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchChallengesAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                challengeAdapter.removeAll(state);
                challengeAdapter.addMany(state, action.payload.map(x =>({
                    ...x,
                    stats:[]
                })));
            })
            .addCase(fetchChallengesAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })
            .addCase(fetchChallengeStatsSingleAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchChallengeStatsSingleAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                // Nothing to update
                if (!action.payload.data)
                    return;
                let update = {
                    id: action.payload.challengeId,
                    changes: {
                        id: action.payload.data.id,
                        stats: action.payload.data.stats,
                        description: action.payload.data.description,
                        name: action.payload.data.name,
                        group: action.payload.data.group
                    }
                } as Update<FullChallenge>;
                challengeAdapter.updateOne(state, update);
            })
            .addCase(fetchChallengeStatsSingleAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })
    }
});

export const fetchChallengesAsync = createAsyncThunk("fetchChallengesAsync", async () => {
    const response = await ChallengeRepository.fetchChallenges();
    return response.data ?? [];
});

export const fetchArchivedChallenges = createAsyncThunk("fetchArchivedChallenges", async () => {
    const response = await ChallengeRepository.fetchArchivedChallenges();
    return response.data ?? [];
});

export const fetchChallengeStatsSingleAsync = createAsyncThunk("fetchChallengeStatsSingleAsync", async ({challengeId}: {
    challengeId: string
}) => {
    const response = await ChallengeRepository.fetchChallengeStats(challengeId);
    return {
        challengeId,
        data: {
            ...response.data,
            stats: [
                ...response.data?.stats?.reduce(reduceChallengeStats, new Map<string, ChallengeStatWithUser>()).values() ?? []
            ].sort(sortChallengeStats)
        }
    }
});

const sortChallengeStats = (a: ChallengeStatWithUser, b: ChallengeStatWithUser) => {
    return a.count < b.count ? 1 : -1
}

const reduceChallengeStats = (acc: Map<string, ChallengeStatWithUser>, curr: ChallengeStatWithUser) => {
    let x = acc.get(curr.user.userId);
    if (x) {
        acc.set(curr.user.userId, {
            ...x,
            count: x.count + curr.count
        })
    } else {
        acc.set(curr.user.userId, curr);
    }
    return acc;
}

export const {
    onChallengeStatsUpdate,
    onChallengeStatsInsert,
    onChallengeStatsDelete,
    onChallengeDelete,
    onChallengeInsert,
    onChallengeUpdate
} = challengeSlice.actions;

export default challengeSlice.reducer;