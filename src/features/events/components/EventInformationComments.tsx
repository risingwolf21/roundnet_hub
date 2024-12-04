import {AccountBox, Send} from "@mui/icons-material"
import {
    Avatar,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
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
import {formatDistanceToNowStrict} from "date-fns"
import {SupabaseEventRepository} from "../../../repository/EventRepository";
import {useTranslation} from "react-i18next";
import {de} from "date-fns/locale"
import {useNavigate} from "react-router-dom";

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
    const {t} = useTranslation();
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
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

    return <Box sx={{p: 0, pb: 2, alignSelf: "center"}}>
        <Typography sx={{fontSize: 16, fontWeight: "bold", mt: 2}} color="text.secondary" gutterBottom>
            Kommentare
        </Typography>
        <Box sx={{display: "flex", flexDirection: "column"}}>
            <List sx={{mb: 4}}>
                {
                    comments && comments.map((x, index) =>
                        <ListItem
                            divider={index !== comments.length - 1} dense
                            key={index}
                            sx={{
                                justifyContent: "space-between",
                                "&.MuiListItem-root": {
                                    paddingLeft: 0
                                },
                            }}>
                            <ListItemAvatar onClick={(e) => {
                                e.stopPropagation();
                                navigate("/user/" + x.user.userId)
                            }}>
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
                            <Box sx={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "start",
                                alignContent: "start",
                                mt: "6px",
                                mb: "6px"
                            }}>
                                <Box sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    width: "100%",
                                }}>
                                    <Typography style={{
                                        fontWeight: "bold",
                                        fontSize: "10pt",
                                        color: "rgba(0,0,0,0.8)"
                                    }}>{x.displayName}</Typography>
                                    <Typography style={{
                                        fontSize: "10pt",
                                        color: "rgba(0,0,0,0.6)"
                                    }}>{t("events.information.commentTimeAgo", {
                                        time: formatDistanceToNowStrict(x.created_at, {locale: de})
                                    })}</Typography>
                                </Box>
                                <Typography sx={{
                                    margin: 0,
                                    fontFamily: '"Roboto", "Helvetica", "Arial"," sans-serif"',
                                    fontWeight: 400,
                                    fontSize: "0.875rem",
                                    lineHeight: "1.43",
                                    color: "rgba(0, 0, 0, 0.6)"
                                }}>{x.comment}</Typography>
                            </Box>
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
                    slotProps={{
                        input: {
                            endAdornment: <InputAdornment position="end">
                                <IconButton edge="end" type="submit" disabled={eventInThePast}>
                                    <Send/>
                                </IconButton>
                            </InputAdornment>
                        }
                    }}/>
            </Box>
        </Box>
    </Box>
}

export default EventInformationComments;