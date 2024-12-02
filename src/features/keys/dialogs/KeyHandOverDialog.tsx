import {Button, Typography} from "@mui/material";
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
    }} onClose={() => setSelectedUser(null)} title={t("keyHandOver")}
                            actions={<><Button onClick={() => setSelectedUser(null)}>
                                {t("cancel")}
                            </Button>
                                <Button onClick={confirmKeyHandOver} autoFocus>
                                    {t("confirm")}
                                </Button></>}>
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
    </SwipeableDialog>
}