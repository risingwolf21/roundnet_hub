import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update} from "@reduxjs/toolkit";
import {RootState} from "./store";
import {ChallengeRepository} from "../repository/ChallengeRepository";
import {FullChallenge} from "../types/supabaseTypes";
import {TablesInsert, TablesUpdate} from "../types/supabase-generated.types";

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
        onChallengeStatsUpdate: (state, action: PayloadAction<TablesUpdate<'challenge_stats'>>) => {

        },
        onChallengeStatsInsert: (state, action: PayloadAction<TablesInsert<'challenge_stats'>>) => {

        },
        onChallengeStatsDelete: (state, action: PayloadAction<number>) => {

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
                challengeAdapter.addMany(state, action.payload);
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
    return response.data?.map(x => {
        return {
            ...x,
            stats: x.stats.sort((a, b) => a.count < b.count ? 1 : -1)
        }
    }) ?? [];
});

export const fetchChallengeStatsSingleAsync = createAsyncThunk("fetchChallengeStatsSingleAsync", async ({challengeId}: {
    challengeId: string
}) => {
    const response = await ChallengeRepository.fetchChallengeStats(challengeId);
    return {
        challengeId,
        data: {
            ...response.data,
            stats: response.data?.stats.sort((a, b) => a.count < b.count ? 1 : -1)
        }
    }
});

export const {onChallengeStatsUpdate, onChallengeStatsInsert, onChallengeStatsDelete} = challengeSlice.actions;

export default challengeSlice.reducer;