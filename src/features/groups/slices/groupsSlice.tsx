import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update } from '@reduxjs/toolkit';
import { GroupWithUsers } from '../../../types/supabaseTypes';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminUsersRepository } from 'src/repository/AdminUsersRepository';
import { RootState } from '../../../redux/store';
import { captureException } from '@sentry/react';

const groupsAdapter = createEntityAdapter({
  selectId: (group: GroupWithUsers) => group.id,
});

export const groupsSelector = groupsAdapter.getSelectors((st: RootState) => st.groups);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: groupsAdapter.getInitialState({
    loading: false,
    error: null as string | null,
  }),
  reducers: {
    onEventMappingUserAdded(state, action: PayloadAction<{ user: User, group: string }>) {
      let groupsSlice = groupsAdapter.getSelectors().selectById(state, action.payload.group);
      if (!groupsSlice) return;

      let changes = {
        id: groupsSlice.id,
        changes: {
          users: [...groupsSlice.users, action.payload.user]
        }
      } as Update<GroupWithUsers>;

      groupsAdapter.updateOne(state, changes);
    }
  },
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
        state.error = action.error.message ?? '';
      })

      .addCase(fetchSingleGroupAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        if (!action.payload.data) return;

        groupsAdapter.setOne(state, action.payload.data);
      });
  },
});

export const fetchGroupsAsync = createAsyncThunk('fetchGroupsAsync', async ({ client }: { client: SupabaseClient }) => {
  const response = await client
    .from('event_group')
    .select('*, users: group_user_mapping ( user ( userId, email, displayName ) )');

  return (
    response.data?.map((x) => {
      return { ...x, users: x.users.map((y: any) => y.user) } as GroupWithUsers;
    }) ?? []
  );
});

export const fetchSingleGroupAsync = createAsyncThunk(
  'fetchSingleGroupAsync',
  async (
    {
      id,
    }: {
      id: string;
    },
    { rejectWithValue }
  ) => {
    return AdminUsersRepository.fetchSingleGroupWithUsers(id)
      .then((response) => {
        return {
          data: {
            ...response.data,
            users: response.data?.users?.map((x: any) => x.user) ?? [],
          } as GroupWithUsers,
          id,
        };
      })
      .catch((error) => {
        captureException(error);
        return rejectWithValue(error);
      });
  }
);

export const { onEventMappingUserAdded } = groupsSlice.actions;

export default groupsSlice.reducer;
