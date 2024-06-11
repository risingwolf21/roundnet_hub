import {
    Avatar,
    Button,
    Divider,
    Fab,
    Grid,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Typography
} from "@mui/material";
import CustomAppBar from "../AppBar";
import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ChallengeRepository } from "../../repository/ChallengeRepository";
import { FullChallenge, User } from "../../types/supabaseTypes";
import { captureException } from "@sentry/react";
import { AlertMessage, AlertSnackbar } from "../AlertSnackbar";
import { Box } from "@mui/system";
import { AccountBox } from "@mui/icons-material";
import { can } from "../../utils/PermissionService";
import EditIcon from "@mui/icons-material/Edit";
import { SwipeableDialog } from "../SwipeableDialog";
import { withTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useSelector } from "react-redux";
import { AppDispatch, RootState, useAppDispatch } from "../../redux/store";
import { useClient } from "react-supabase";
import { TablesInsert, TablesUpdate } from "../../types/supabase-generated.types";
import {
    challengeSelector,
    fetchChallengeStatsSingleAsync,
    onChallengeDelete,
    onChallengeInsert,
    onChallengeStatsDelete,
    onChallengeStatsInsert,
    onChallengeStatsUpdate,
    onChallengeUpdate
} from "../../redux/challengeSlice";
import { SupabaseClient } from "@supabase/supabase-js";

const ChallengeInformationProvider = ({ t }: { t: TFunction }) => {
    const { challengeId } = useParams();
    const challenge = useSelector((root: RootState) => challengeSelector.selectById(root, challengeId ?? 0));
    const { user } = useSelector((state: RootState) => state.application);
    const client = useClient();
    const dispatch = useAppDispatch();


    useEffect(() => {
        if (!challengeId)
            return;
        dispatch(fetchChallengeStatsSingleAsync({ challengeId }));

        const subscription = client
            .channel("public:challenge_stats")
            .on<TablesUpdate<'challenge_stats'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenge_stats'
            }, payload => ChallengeRepository
                .fetchChallengeStatsSingle(payload.new.challenge ?? -1, payload.new.user ?? "")
                .then(result => dispatch(onChallengeStatsUpdate(result.data))))
            .on<TablesInsert<'challenge_stats'>>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'challenge_stats'
            }, payload => ChallengeRepository
                .fetchChallengeStatsSingle(payload.new.challenge ?? -1, payload.new.user ?? "")
                .then(result => dispatch(onChallengeStatsInsert(result.data))))
            // .on('postgres_changes', {
            //     event: 'DELETE',
            //     schema: 'public',
            //     table: 'challenge_stats'
            // }, payload => dispatch(onChallengeStatsDelete(payload.old)))

            .on<TablesUpdate<'challenge'>>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'challenge'
            }, payload => dispatch(onChallengeUpdate(payload.new)))
            .on<TablesInsert<'challenge'>>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'challenge'
            }, payload => ChallengeRepository
                .fetchChallengeStats(payload.new.id?.toString() ?? "-1")
                .then(result => dispatch(onChallengeInsert(result.data))))
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'challenge'
            }, payload => dispatch(onChallengeDelete(payload.old.id)))
            .subscribe();

        return () => {
            subscription.unsubscribe();
        }
    }, []);

    if (!challenge)
        return <Navigate to={"/challenges"} replace={true} />

    return <ChallengeInformation t={t} dispatch={dispatch} challenge={challenge} user={user} client={client} />
}

type ChallengeInformationProps = {
    t: TFunction,
    dispatch: AppDispatch,
    challenge: FullChallenge,
    user: User,
    client: SupabaseClient
}

const ChallengeInformation = ({ t, dispatch, challenge, user, client }: ChallengeInformationProps) => {
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [open, setOpen] = useState(false);


    const medalForPlace = (index: number) => {
        if (index === 0)
            return "🥇"
        else if (index === 1)
            return "🥈"
        else if (index === 2)
            return "🥉"
        return ""
    }

    const increaseChallengePoint = () => {
        setOpen(false);
        if (!user) {
            setAlertInfo({ message: "Something went wrong! Try again later", severity: "error" });
            return;
        }
        ChallengeRepository.increasePointForUser(user.userId, challenge.id).then(() => {
            setAlertInfo({ message: "Success!", severity: "success" });
        }).catch(error => {
            captureException(error);
            setAlertInfo({ message: error, severity: 'error' })
        });
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack title={challenge.name} />

        <Grid container width="100%" spacing={3} justifyContent={"center"}>
            {
                challenge.stats.length >= 2 && <Grid item xs sx={{ maxWidth: "40%" }}>
                    <Grid>
                        <Box sx={{ height: "50px", background: "transparent" }}></Box>
                        <Typography variant={"h5"} sx={{
                            height: "50px",
                            lineHeight: "50px",
                            justifyContent: "center",
                            display: "flex",
                            verticalAlign: "bottom"
                        }}>{challenge.stats[1].user.displayName.split(" ")[0]}</Typography>
                        <Box sx={{
                            height: "100px", background: "silver", fontSize: "26pt",
                            justifyContent: "center",
                            display: "flex",
                            borderRadius: "10px"
                        }}>🥈</Box>
                    </Grid>
                </Grid>
            }
            {
                challenge.stats.length >= 1 &&
                <Grid item xs sx={{ maxWidth: "40%" }}>
                    <Grid>
                        <Typography variant={"h5"} sx={{
                            height: "50px",
                            lineHeight: "50px",
                            justifyContent: "center",
                            display: "flex",
                            verticalAlign: "bottom"
                        }}>{challenge.stats[0].user.displayName.split(" ")[0]}</Typography>
                        <Box sx={{
                            height: "150px",
                            background: "gold",
                            fontSize: "26pt",
                            justifyContent: "center",
                            display: "flex",
                            borderRadius: "10px"
                        }}>🥇</Box>
                    </Grid>
                </Grid>
            }
            {
                challenge.stats.length >= 3 &&
                <Grid item xs sx={{ maxWidth: "40%" }}>
                    <Grid>
                        <Box sx={{ height: "100px", background: "transparent" }}></Box>
                        <Typography variant={"h5"} sx={{
                            height: "50px",
                            lineHeight: "50px",
                            justifyContent: "center",
                            display: "flex",
                            verticalAlign: "bottom"
                        }}>{challenge?.stats[2].user.displayName.split(" ")[0]}</Typography>
                        <Box sx={{
                            height: "50px", background: "#a08d51", fontSize: "26pt",
                            justifyContent: "center",
                            display: "flex",
                            borderRadius: "10px"
                        }}>🥉</Box>
                    </Grid>
                </Grid>
            }
        </Grid>

        <List sx={{ width: "100%" }}>
            <Divider />
            {
                challenge.stats
                    .map((x, index) => <ListItem key={x.user.userId}>
                        <ListItemAvatar>
                            <Avatar sx={{ borderRadius: 2 }}>
                                {
                                    x.user.avatarUrl
                                        ?
                                        <img src={x.user.avatarUrl} alt="logo" width={"100%"} height={"100%"} />
                                        : <AccountBox />
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={x.user.displayName + " " + medalForPlace(index)} />
                        <ListItemSecondaryAction>
                            <Typography>{x.count}</Typography>
                        </ListItemSecondaryAction>
                    </ListItem>
                    )
            }
        </List>

        {
            can("use", "challenges") &&
            <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }}
                onClick={() => {
                    setOpen(true)
                }}>
                {
                    <EditIcon sx={{ color: "white" }} />
                }
            </Fab>
        }

        <SwipeableDialog
            title="Punkt hinzufügen"
            open={open}
            onClose={() => setOpen(false)}
            minHeight={40}
            setOpen={setOpen}>
            <Typography m={2}>Hiermit trägst du einen Punkt für die Serve Challenge ein</Typography>
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
                }} onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button variant="contained" fullWidth sx={{
                    ml: 1,
                    mr: 2,
                    mb: 2,
                    borderRadius: "50px !important",
                    fontSize: "16px",
                    fontFamily: "sans-serif",
                    lineSpacing: "24px"
                }} onClick={increaseChallengePoint}>
                    {t("confirm")}
                </Button>
            </Box>
        </SwipeableDialog>

        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </Grid>
}

export default withTranslation()(ChallengeInformationProvider)