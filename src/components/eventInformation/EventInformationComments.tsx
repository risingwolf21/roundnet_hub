import { ArrowRight, Comment, Send } from "@mui/icons-material"
import { Typography, ListItemButton, ListItemAvatar, Container, ListItemText, ListItemSecondaryAction, IconButton, Box, List, ListItem, Avatar, CircularProgress, TextField, InputAdornment, Divider } from "@mui/material"
import { SwipeableDialog } from "../SwipeableDialog"
import { useEffect, useState } from "react"
import React from "react"
import { EventCommentUpdate, FullComment } from "src/types/supabaseTypes"
import moment from "moment"
import { useAppDispatch } from "src/redux/store"
import { useClient } from "react-supabase"
import { onEventCommentDelete, onEventCommentUpdate } from "src/redux/events/eventCommentsSlice"

type EventInformationCommentsProps = {
    comments: FullComment[],
    handleCommentSubmit: (event: React.FormEvent<HTMLFormElement>) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    eventId: number
}

const EventInformationComments = ({ comments, inputRef, handleCommentSubmit, eventId }: EventInformationCommentsProps) => {
    const [commentsOpen, setCommentsOpen] = useState(false);
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
        <ListItemButton onClick={() => setCommentsOpen(true)}
            sx={{ '&.MuiListItemButton-root': { paddingLeft: 0 } }}>
            <ListItemAvatar>
                <Comment sx={{ color: "rgba(0, 0, 0, 0.54)", fontSize: "1.5rem" }} />
            </ListItemAvatar>
            <ListItemText
                primary={`${comments.length} ${comments.length === 1 ? "Kommentar" : "Kommentare"}`} />
            <ListItemSecondaryAction>
                <IconButton>
                    <ArrowRight />
                </IconButton>
            </ListItemSecondaryAction>
        </ListItemButton>
        <Divider />
        <SwipeableDialog open={commentsOpen} onClose={() => setCommentsOpen(false)}
            setOpen={setCommentsOpen} title={"Kommentare"} minHeight={40}>
            <Box sx={{ display: "flex", px: 2, flexDirection: "column" }}>
                <List sx={{ mb: 8 }}>
                    {
                        comments && comments.map((x, index) => <ListItem divider dense key={index}
                            sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                            <ListItemAvatar>
                                <Avatar>
                                    {
                                        x.pending
                                            ? <CircularProgress size={"20px"} />
                                            : <Typography
                                                style={{ fontWeight: "bold" }}>{x.displayName?.charAt(0)}</Typography>
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
                                }}>{moment(x.created_at).format("HH:mm")}</Typography>
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
        </SwipeableDialog>
    </Container>
}

export default EventInformationComments;