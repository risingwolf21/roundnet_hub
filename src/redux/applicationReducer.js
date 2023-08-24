import { createSlice } from '@reduxjs/toolkit';

export const applicationReducer = createSlice({
    name: 'application',
    initialState: {
        user: {}
    },
    reducers: {
        onUserChange: (state, action) => {
            state.user = action.payload
        },
    }
});

export const { onUserChange } = applicationReducer.actions;

export default applicationReducer.reducer