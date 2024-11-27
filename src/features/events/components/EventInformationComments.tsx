import {AccountBox, Send} from "@mui/icons-material"
import {
    Avatar,
    Box,
    CircularProgress,
    Container,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    TextField,
    Typography
} from "@mui/material"
import React, {useEffect} from "react"
import {FullComment} from "src/types/supabaseTypes"
import {useAppDispatch} from "src/redux/store"
import {useClient} from "react-supabase"
import {
    onEventCommentDelete,
    onEventCommentInsert,
    onEventCommentUpdate
} from "src/features/events/slices/eventCommentsSlice"
import {formatDistanceToNow} from "date-fns"
import {SupabaseEventRepository} from "../../../repository/EventRepository";

type EventInformationCommentsProps = {
    comments: FullComment[],
    handleCommentSubmit: (event: React.FormEvent<HTMLFormElement>) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    eventId: string,
    eventInThePast: boolean
}

const EventInformationComments = ({
                                      comments,
                                      inputRef,
                                      handleCommentSubmit,
                                      eventId,
                                      eventInThePast
                                  }: EventInformationCommentsProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    useEffect(() => {

        let subscription = client.channel("public:event_comments")
            .on<EventCommentUpdate>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'event_comments',
                filter: `event=eq.${eventId}`
            }, payload => dispatch(onEventCommentUpdate(payload.new)))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'event_comments',
                filter: `event=eq.${eventId}`
            }, payload => dispatch(onEventCommentDelete(payload.old.id)))
            .on<EventCommentInsert>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'events',
                filter: `event=eq.${eventId}`
            }, payload => {
                if (payload.new.id)
                    SupabaseEventRepository.fetchSingleComment(payload.new.id).then(result => {
                        if (result.data)
                            dispatch(onEventCommentInsert(result.data))
                    })
            })
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, eventId]);

    return <Container sx={{p: 0, alignSelf: "center"}}>
        <Typography sx={{fontSize: 16, fontWeight: "bold", mt: 2}} color="text.secondary" gutterBottom>
            Kommentare
        </Typography>
        <Box sx={{display: "flex", flexDirection: "column"}}>
            <List sx={{mb: 4}}>
                {
                    comments && comments.map((x, index) => <ListItem divider={index !== comments.length - 1} dense
                                                                     key={index}
                                                                     sx={{'&.MuiListItem-root': {paddingLeft: 0}}}>
                        <ListItemAvatar>
                            <Avatar sx={{borderRadius: 2}}>
                                {
                                    x.pending
                                        ? <CircularProgress size={"20px"}/>
                                        : x.user?.avatarUrl
                                            ? <img src={x.user?.avatarUrl} alt="logo" width={"100%"} height={"100%"}/>
                                            : <AccountBox/>
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primaryTypographyProps={{fontWeight: "bold", fontSize: "11pt"}}
                                      primary={x.displayName} secondary={x.comment}/>
                        <ListItemSecondaryAction sx={{height: "100%"}}>
                            <Typography style={{
                                fontSize: "10pt",
                                color: "rgba(0,0,0,0.6)",
                                marginTop: "8px",
                                alignContent: "baseline"
                            }}>{formatDistanceToNow(x.created_at)} ago</Typography>
                        </ListItemSecondaryAction>
                    </ListItem>)
                }
            </List>
            <Box component={"form"} onSubmit={handleCommentSubmit}>
                <TextField
                    ref={inputRef}
                    disabled={eventInThePast}
                    id="comment"
                    name="comment"
                    fullWidth
                    placeholder="Write a comment..."
                    sx={{'& fieldset': {borderRadius: 4}, '& input': {pt: 1.5, pb: 1.5}}}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">
                            <IconButton edge="end" type="submit" disabled={eventInThePast}>
                                <Send/>
                            </IconButton>
                        </InputAdornment>,
                    }}/>
            </Box>
        </Box>
    </Container>
}

export default EventInformationComments;