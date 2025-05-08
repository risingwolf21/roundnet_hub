import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { GamesRepository } from 'src/repository/GamesRepository';

type GamesSliceState = {
  matches: FullUserMatch[];
  loadingMatches: boolean;
  matchesError: string | null;
  players: PlayerWithSimpleUser[];
  loadingPlayers: boolean;
  playersError: string | null;
};

const initialState = {
  matches: [],
  loadingMatches: false,
  matchesError: null,
  players: [],
  loadingPlayers: false,
  playersError: null,
} as GamesSliceState;

const gamesSlice = createSlice({
  name: 'games',
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatchesAsync.pending, (state, action) => {
        state.loadingMatches = true;
        state.matchesError = null;
      })
      .addCase(fetchMatchesAsync.fulfilled, (state, action) => {
        state.loadingMatches = false;
        state.matchesError = null;
        state.matches = action.payload;
      })
      .addCase(fetchMatchesAsync.rejected, (state, action) => {
        state.loadingMatches = false;
        state.matchesError = action.error.message ?? '';
      })

      .addCase(fetchPlayersAsync.pending, (state, action) => {
        state.loadingPlayers = true;
        state.playersError = null;
      })
      .addCase(fetchPlayersAsync.fulfilled, (state, action) => {
        state.loadingPlayers = false;
        state.playersError = null;
        state.players = action.payload;
      })
      .addCase(fetchPlayersAsync.rejected, (state, action) => {
        state.loadingPlayers = false;
        state.playersError = action.error.message ?? '';
      });
  },
});

export const fetchMatchesAsync = createAsyncThunk('fetchMatchesAsync', async () => {
  const response = await GamesRepository.fetchGamesForUser();
  return response?.data ?? [];
});

export const fetchPlayersAsync = createAsyncThunk('fetchPlayersAsync', async () => {
  const response = await GamesRepository.fetchAvailablePlayers();
  return response ?? [];
});

export default gamesSlice.reducer;
