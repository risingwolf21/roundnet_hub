import {SwipeableDialog} from "../../../components/SwipeableDialog";
import React from "react";
import {Box} from "@mui/material";

type Props = {
    open: boolean;
    title: string;
}

export const EventCommentConversationDialog = ({open, title}: Props) => {
    return <SwipeableDialog open={open} title={title}>
        <Box></Box>
    </SwipeableDialog>
}