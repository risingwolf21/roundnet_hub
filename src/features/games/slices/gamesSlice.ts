import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  reducers: {
    onSetsAdded: (state, action: PayloadAction<{ sets: MatchSet[], match: FullUserMatch }>) => {
      const index = state.matches.findIndex(x => x.id === action.payload.match.id);
      if (index === -1)
        state.matches = [
          ...state.matches,
          {
            ...action.payload.match,
            set_results: action.payload.sets.map(x => `${x.team_a_score}:${x.team_b_score}`).join(",")
          },
        ]
      else
        state.matches = state.matches.map(x => x.id === action.payload.match.id ? {
          ...action.payload.match,
          set_results: action.payload.sets.map(x => `${x.team_a_score}:${x.team_b_score}`).join(",")
        } : x)
    }
  },
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

export const { onSetsAdded } = gamesSlice.actions;

export default gamesSlice.reducer;
