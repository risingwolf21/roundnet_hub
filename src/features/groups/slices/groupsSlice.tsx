import {createAsyncThunk, createEntityAdapter, createSlice} from "@reduxjs/toolkit";
import {GroupWithUsers} from "../../../types/supabaseTypes";
import {SupabaseClient} from "@supabase/supabase-js";
import {AdminUsersRepository} from "src/repository/AdminUsersRepository";
import {RootState} from "../../../redux/store";
import {captureException} from "@sentry/react";

const groupsAdapter = createEntityAdapter({
    selectId: (group: GroupWithUsers) => group.id
});

export const groupsSelector = groupsAdapter.getSelectors((st: RootState) => st.groups);

const groupsSlice = createSlice({
    name: "groups",
    initialState: groupsAdapter.getInitialState({
        loading: false,
        error: null as string | null
    }),
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchGroupsAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchGroupsAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                groupsAdapter.removeAll(state);
                groupsAdapter.addMany(state, action.payload);
            })
            .addCase(fetchGroupsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(fetchSingleGroupAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;

                if (!action.payload.data)
                    return;

                groupsAdapter.setOne(state, action.payload.data);
            })
    }
});

export const fetchGroupsAsync = createAsyncThunk("fetchGroupsAsync", async ({client}: { client: SupabaseClient }) => {
    const response = await client.from("event_group")
        .select("*, users: group_user_mapping ( user ( userId, email, displayName ) )");

    return response.data?.map(x => {
        return {...x, users: x.users.map((y: any) => y.user)} as GroupWithUsers
    }) ?? [];
});

export const fetchSingleGroupAsync = createAsyncThunk("fetchSingleGroupAsync", async ({id}: {
    id: number
}, {rejectWithValue}) => {
    // returns {id, description, name, color, users: { user:{}[] }
    return AdminUsersRepository.fetchSingleGroupWithUsers(id).then(response => {
        return {
            data: {
                ...response.data,
                users: response.data?.users?.map((x: any) => x.user) ?? []
            } as GroupWithUsers,
            id
        }
    }).catch(error => {
        captureException(error);
        return rejectWithValue(error);
    })
});

export default groupsSlice.reducer;