import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { UserWithGroups } from '../../../types/supabaseTypes';
import { AdminUsersRepository } from 'src/repository/AdminUsersRepository';
import { captureException } from '@sentry/react';

type AdminUsersSliceState = {
  users: UserWithGroups[];
  loading: boolean;
  error: string | null;
  notVerifiedUsers: number;
};

const initialState = {
  users: [],
  notVerifiedUsers: 0,
  loading: false,
  error: null,
} as AdminUsersSliceState;

const adminUsersSlice = createSlice({
  name: 'admin-users',
  initialState,
  reducers: {
    onUserUpdate: (state: AdminUsersSliceState, action) => {
      let index = state.users.findIndex((x) => x.userId === action.payload.new.userId);
      if (index !== -1) {
        state.users[index] = Object.assign(state.users[index], action.payload.new);
      }
    },
    onUserDeleted: (state: AdminUsersSliceState, action) => {
      let index = state.users.findIndex((x) => x.userId === action.payload.old.userId);
      if (index !== -1) {
        delete state.users[index];
      }
    },
    onUserInserted: (state: AdminUsersSliceState, action) => {
      state.users = [...(state.users ?? []), action.payload.new];
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchAdminUsersAsync.pending, (state: AdminUsersSliceState, action) => {
        state.loading = true;
      })
      .addCase(fetchAdminUsersAsync.fulfilled, (state: AdminUsersSliceState, action) => {
        state.loading = false;
        state.error = '';
        state.users = action.payload ?? [];
        state.notVerifiedUsers = (action.payload ?? []).filter((x) => !x.verified).length;
      })
      .addCase(fetchAdminUsersAsync.rejected, (state: AdminUsersSliceState, action) => {
        state.loading = false;
        state.error = action.error.message ?? '';
      })

      .addCase(fetchNotVerifiedUsersAsync.fulfilled, (state, action) => {
        state.notVerifiedUsers = action.payload.length;
      });
  },
});

export const fetchAdminUsersAsync = createAsyncThunk('fetchAdminUsersAsync', async (_, { rejectWithValue }) => {
  try {
    const response = await AdminUsersRepository.fetchAllUsersWithGroups();
    return (response.data?.map((x: any) => {
      return {
        ...x,
        groups: x.groups.map((x: any) => x.group),
      };
    }) ?? []) as UserWithGroups[];
  } catch (e) {
    captureException(e);
    return rejectWithValue(e);
  }
});

export const fetchNotVerifiedUsersAsync = createAsyncThunk(
  'fetchNotVerifiedUsersAsync',
  async (_, { rejectWithValue }) => {
    try {
      const response = await AdminUsersRepository.fetchNotVerifiedUsers();
      return response.data ?? [];
    } catch (e) {
      captureException(e);
      return rejectWithValue(e);
    }
  }
);

export default adminUsersSlice.reducer;
