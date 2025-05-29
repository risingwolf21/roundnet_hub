import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ApplicationSliceState = {
  serviceWorkerInitialized: boolean;
  serviceWorkerUpdated: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
};

const initialState = {
  serviceWorkerInitialized: false,
  serviceWorkerUpdated: false,
  serviceWorkerRegistration: null,
} as ApplicationSliceState;

const applicationReducer = createSlice({
  name: 'application',
  initialState,
  reducers: {
    onUpdateServiceWorker: (state, action: PayloadAction<ServiceWorkerRegistration | null>) => {
      state.serviceWorkerRegistration = action.payload;
      state.serviceWorkerUpdated = !state.serviceWorkerUpdated;
    },
    onServiceWorkerInitialized: (state, action: PayloadAction<undefined>) => {
      state.serviceWorkerInitialized = !state.serviceWorkerInitialized;
    },
  },
});

export const { onUpdateServiceWorker, onServiceWorkerInitialized } =
  applicationReducer.actions;

export default applicationReducer.reducer;
