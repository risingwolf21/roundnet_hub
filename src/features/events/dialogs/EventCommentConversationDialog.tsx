import {SwipeableDialog} from "../../../components/SwipeableDialog";
import React from "react";
import {List} from "@mui/material";
import {FullComment} from "../../../types/supabaseTypes";
import {CommentItem} from "../components/CommentItem";
import {TFunction} from "i18next";

type Props = {
    comment: FullComment | null;
    title: string;
    setOpen?: (value: boolean) => void;
    onClose?: () => void;
    t: TFunction
}

export const EventCommentConversationDialog = ({comment, title, setOpen, onClose, t}: Props) => {
    return <SwipeableDialog minHeight={90} open={comment !== null} title={title} setOpen={setOpen} onClose={onClose}>
        <List>
            {
                comment && <CommentItem comment={comment} t={t} replyToPressed={() => {
                }}/>
            }
            {
                comment && comment.replies.length > 0 && comment.replies
                    .map(x => <CommentItem comment={x} t={t}
                                           replyToPressed={() => {
                                           }}/>)
            }
        </List>
    </SwipeableDialog>
}