import {Box, Button, Typography} from "@mui/material";
import {SwipeableDialog} from "../../../components/SwipeableDialog";
import React from "react";
import {FullItemHolder} from "../../../types/supabaseTypes";
import {TFunction} from "i18next";

type KeyHandOverDialogProps = {
    user: User,
    selectedUser: User | null,
    selectedKeyHolder: FullItemHolder | null,
    t: TFunction,
    setSelectedUser: (user: User | null) => void,
    confirmKeyHandOver: () => void,

}

export const KeyHandOverDialog = ({
                                      user,
                                      selectedUser,
                                      t,
                                      selectedKeyHolder,
                                      setSelectedUser,
                                      confirmKeyHandOver
                                  }: KeyHandOverDialogProps) => {
    return <SwipeableDialog open={selectedUser !== null} setOpen={() => {
    }} onClose={() => setSelectedUser(null)} title={t("keyHandOver")}>
        <Typography m={2}>
            {
                selectedUser?.userId === user.userId ?
                    t("confirmKeyTaken", {
                        keyName: selectedKeyHolder?.name,
                        userName: selectedKeyHolder?.current_holder?.displayName ?? ""
                    }) :
                    t("confirmKeyHandover", {
                        keyName: selectedKeyHolder?.name,
                        userName: selectedKeyHolder?.current_holder?.displayName ?? ""
                    })
            }
        </Typography>
        <Box sx={{
            display: "flex",
            flexDirection: "row",
            flexGrow: 1,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0
        }}>
            <Button variant="outlined" fullWidth sx={{
                ml: 2,
                mr: 1,
                mb: 2,
                borderRadius: "50px !important",
                fontSize: "16px",
                fontFamily: "sans-serif",
                lineSpacing: "24px"
            }} onClick={() => setSelectedUser(null)}>{t("cancel")}</Button>
            <Button variant="contained" fullWidth sx={{
                ml: 1,
                mr: 2,
                mb: 2,
                borderRadius: "50px !important",
                fontSize: "16px",
                fontFamily: "sans-serif",
                lineSpacing: "24px"
            }} onClick={confirmKeyHandOver} autoFocus>
                {t("confirm")}
            </Button>
        </Box>
    </SwipeableDialog>
}