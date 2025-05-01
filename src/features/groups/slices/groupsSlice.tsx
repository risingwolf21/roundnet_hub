import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update } from '@reduxjs/toolkit';
import { captureException } from '@sentry/react';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { AdminUsersRepository } from 'src/repository/AdminUsersRepository';
import { Tables } from 'src/types/supabase-generated.types';
import { RootState } from '../../../redux/store';
import { FullUserMapping, GroupWithUserMappings } from 'src/types/supabaseTypes';

const groupsAdapter = createEntityAdapter({
  selectId: (group: GroupWithUserMappings) => group.id,
});

export const groupsSelector = groupsAdapter.getSelectors((st: RootState) => st.groups);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: groupsAdapter.getInitialState({
    loading: false,
    error: null as string | null,
  }),
  reducers: {
    onEventMappingUserAdded(state, action: PayloadAction<{ user: User, result: Tables<"group_user_mapping"> }>) {
      let groupsSlice = groupsAdapter.getSelectors().selectById(state, action.payload.result.group);
      if (!groupsSlice) return;

      let changes = {
        id: groupsSlice.id,
        changes: {
          users: [...groupsSlice.users, { user: action.payload.user, map: action.payload.result }] as FullUserMapping[]
        }
      } as Update<GroupWithUserMappings>;

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

export const fetchGroupsAsync = createAsyncThunk('fetchGroupsAsync', async () => {
  const response = await supabase
    .from('event_groups_view')
    .select('*');

  return (
    response.data?.map((x) => {
      return { ...x, user_group_role: x.role, users: [] } as GroupWithUserMappings;
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
            users: response.data?.mapping?.map((x: any) => ({ user: x.user, map: { group: x.group, role: x.role } })) ?? [],
          } as GroupWithUserMappings,
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
