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
import {EventCommentUpdate, FullComment} from "src/types/supabaseTypes"
import {useAppDispatch} from "src/redux/store"
import {useClient} from "react-supabase"
import {onEventCommentDelete, onEventCommentUpdate} from "src/redux/events/eventCommentsSlice"
import {formatDistanceToNow} from "date-fns"

type EventInformationCommentsProps = {
    comments: FullComment[],
    handleCommentSubmit: (event: React.FormEvent<HTMLFormElement>) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    eventId: number
}

const EventInformationComments = ({ comments, inputRef, handleCommentSubmit, eventId }: EventInformationCommentsProps) => {
    const client = useClient();
    const dispatch = useAppDispatch();
    useEffect(() => {

        let subscription = client.channel("public:event_comments")
            .on<EventCommentUpdate>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments', filter: `event=eq.${eventId}` }, payload => dispatch(onEventCommentUpdate(payload.new)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments', filter: `event=eq.${eventId}` }, payload => dispatch(onEventCommentDelete(payload.old.id)))
            // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, eventId]);

    return <Container sx={{ p: 0, alignSelf: "center" }}>
        <Typography sx={{ fontSize: 16, fontWeight: "bold", mt: 2 }} color="text.secondary" gutterBottom>
            Kommentare
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
            <List sx={{ mb: 4 }}>
                {
                    comments && comments.map((x, index) => <ListItem divider={index !== comments.length - 1} dense key={index}
                        sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                        <ListItemAvatar>
                            <Avatar sx={{ borderRadius: 2 }}>
                                {
                                    x.pending
                                        ? <CircularProgress size={"20px"} />
                                        : x.user?.avatarUrl
                                            ? <img src={x.user?.avatarUrl} alt="logo" width={"100%"} height={"100%"} />
                                            : <AccountBox />
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primaryTypographyProps={{ fontWeight: "bold", fontSize: "11pt" }}
                            primary={x.displayName} secondary={x.comment} />
                        <ListItemSecondaryAction sx={{ height: "100%" }}>
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
                    id="comment"
                    name="comment"
                    fullWidth
                    placeholder="Write a comment..."
                    sx={{ '& fieldset': { borderRadius: 4 }, '& input': { pt: 1.5, pb: 1.5 } }}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">
                            <IconButton edge="end" type="submit">
                                <Send />
                            </IconButton>
                        </InputAdornment>,
                    }} />
            </Box>
        </Box>
        {/* <SwipeableDialog open={commentsOpen} onClose={() => setCommentsOpen(false)}
            setOpen={setCommentsOpen} title={"Kommentare"} minHeight={40}>
            <Box sx={{ display: "flex", px: 2, flexDirection: "column" }}>
                <List sx={{ mb: 8 }}>
                    {
                        comments && comments.map((x, index) => <ListItem divider dense key={index}
                            sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                            <ListItemAvatar>
                                <Avatar sx={{ borderRadius: 2 }}>
                                    {
                                        x.pending
                                            ? <CircularProgress size={"20px"} />
                                            : x.user?.avatarUrl
                                                ? <img src={x.user?.avatarUrl} alt="logo" width={"100%"} height={"100%"} />
                                                : <AccountBox />
                                    }
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primaryTypographyProps={{ fontWeight: "bold", fontSize: "11pt" }}
                                primary={x.displayName} secondary={x.comment} />
                            <ListItemSecondaryAction sx={{ height: "100%" }}>
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
                <Box sx={{ position: "absolute", background: "#fff", bottom: 0, left: 0, right: 0, p: 2 }}
                    component={"form"} onSubmit={handleCommentSubmit}>
                    <TextField
                        ref={inputRef}
                        id="comment"
                        name="comment"
                        fullWidth
                        placeholder="Write a comment..."
                        sx={{ '& fieldset': { borderRadius: "30px" }, '& input': { pt: 1.5, pb: 1.5 } }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">
                                <IconButton edge="end" type="submit">
                                    <Send />
                                </IconButton>
                            </InputAdornment>,
                        }} />
                </Box>
            </Box>
        </SwipeableDialog> */}
    </Container>
}

export default EventInformationComments;