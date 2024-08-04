import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {toInteger} from "lodash";
import {EventCommentUpdate, FullComment, User} from "src/types/supabaseTypes";
import {PostgrestError} from "@supabase/supabase-js";
import {SupabaseEventRepository} from "../../../repository/EventRepository";
import {Tables} from "../../../types/supabase-generated.types";

type SliceComments = {
    id: number,
    comments: FullComment[]
}

const eventsCommentsAdapter = createEntityAdapter({
    selectId: (event: SliceComments) => event.id
})

export const eventsCommentsSelector = eventsCommentsAdapter.getSelectors();

const eventCommentsSlice = createSlice({
    name: 'eventAttendance',
    initialState: eventsCommentsAdapter.getInitialState({
        loading: false,
        error: ""
    }),
    reducers: {
        onEventCommentUpdate: (state, action: PayloadAction<EventCommentUpdate>) => {
            let commentsSlice = eventsCommentsAdapter.getSelectors().selectById(state, action.payload.event ?? -1);
            let index = commentsSlice?.comments.findIndex(x => x.id === action.payload.id);
            if (!commentsSlice || !action.payload.event || !index)
                return;

            eventsCommentsAdapter.upsertOne(state, {
                id: action.payload.event,
                comments: commentsSlice.comments.map((x, i) =>
                    i === index ? {
                        ...x,
                        comment: action.payload.comment ?? x.comment,
                        created_at: action.payload.created_at ?? x.created_at,
                        displayName: action.payload.displayName ?? x.displayName,
                        event: action.payload.event ?? x.event,
                        id: action.payload.id ?? x.id,
                        user: action.payload.user ?? x.user
                    } as FullComment : x
                )
            } as SliceComments);
        },
        onEventCommentDelete: (state, action: PayloadAction<number>) => {
            eventsCommentsAdapter.removeOne(state, action.payload)
        },
        onEventCommentInsert: (state, action: PayloadAction<FullComment>) => {
            let commentsSlice = eventsCommentsAdapter.getSelectors().selectById(state, action.payload.event);
            if (commentsSlice)
                eventsCommentsAdapter.addOne(state, {
                    id: action.payload.event,
                    comments: [...commentsSlice.comments, action.payload]
                })
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchEventCommentsAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = "";
                eventsCommentsAdapter.upsertOne(state, {
                    id: action.payload.eventId,
                    comments: action.payload.data ?? []
                })
            })
            .addCase(fetchEventCommentsAsync.pending, (state, action) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchEventCommentsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message ?? "";
            })

            .addCase(upsertCommentToEventAsync.pending, (state, action) => {
                state.loading = true
                let newComment: FullComment = {
                    id: -1,
                    pending: true,
                    comment: action.meta.arg.comment,
                    event: toInteger(action.meta.arg.eventId),
                    displayName: action.meta.arg.user.displayName,
                    user: action.meta.arg.user,
                    userId: action.meta.arg.user.userId,
                    created_at: action.meta.arg.created_at,
                };

                let comments = eventsCommentsAdapter.getSelectors().selectById(state, action.meta.arg.eventId)?.comments ?? [];
                let sliceAttendance = {
                    id: action.meta.arg.eventId,
                    comments: [...comments, newComment]
                } as SliceComments;

                eventsCommentsAdapter.upsertOne(state, sliceAttendance);
            })
            .addCase(upsertCommentToEventAsync.rejected, (state, action) => {
                let comments = eventsCommentsAdapter.getSelectors().selectById(state, action.meta.arg.eventId)?.comments ?? [];
                let sliceAttendance = {
                    id: action.meta.arg.eventId,
                    comments: [...comments.filter(x => x.created_at === action.meta.arg.created_at)]
                } as SliceComments;
                eventsCommentsAdapter.upsertOne(state, sliceAttendance);
            })
            .addCase(upsertCommentToEventAsync.fulfilled, (state, action) => {
                state.loading = false;

                let comments = eventsCommentsAdapter.getSelectors().selectById(state, action.meta.arg.eventId)?.comments ?? [];
                let sliceAttendance = {
                    id: action.meta.arg.eventId,
                    comments: [...comments.map(x =>
                        x.created_at === action.meta.arg.created_at ? {
                            ...x, id: action.payload.data?.id, pending: false
                        } : x)]
                } as SliceComments;

                eventsCommentsAdapter.upsertOne(state, sliceAttendance);
            })
    },
});

type UpsertCommentProps = { user: User, eventId: number, comment: string, created_at: string }
type DataErrorReturned = { data: Tables<'event_comments'> | null, error: PostgrestError | null }
export const upsertCommentToEventAsync = createAsyncThunk("upsertCommentToEventAsync", async ({
                                                                                                  user,
                                                                                                  eventId,
                                                                                                  comment
                                                                                              }: UpsertCommentProps) => {
    const response = await SupabaseEventRepository.insertComment(user, eventId, comment);

    return {data: response.data, error: response.error, commmentId: response.data?.id} as DataErrorReturned;
});

type ClientEventId = { eventId: number }
export const fetchEventCommentsAsync = createAsyncThunk("fetchEventCommentsAsync", async ({eventId}: ClientEventId) => {
    const attendance = await SupabaseEventRepository.fetchEventComments(eventId);
    return {data: attendance.data, eventId};
});

export const {onEventCommentUpdate, onEventCommentDelete, onEventCommentInsert} = eventCommentsSlice.actions;

export default eventCommentsSlice.reducer;