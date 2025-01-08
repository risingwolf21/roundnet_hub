import { Save } from "@mui/icons-material";
import { Autocomplete, Box, Button, CircularProgress, Fab, Grid2 as Grid, Select, TextField, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { AlertMessage, AlertSnackbar } from "src/components/AlertSnackbar";
import Layout from "src/components/Layout"
import { GamesRepository } from "src/repository/GamesRepository";
import { SupabaseUserRepository } from "src/repository/UserRepository";

type Props = { options: SimpleUser[], loading: boolean, label: string, onSelect: (value: SimpleUser | null) => void }
const SelectPlayer = ({ options, loading, label, onSelect }: Props) => {

    return <Autocomplete
        disablePortal
        fullWidth
        loading={loading}
        options={options}
        getOptionLabel={(option) => option.displayName}
        getOptionKey={(option) => option.userId}
        onChange={(e, v) => onSelect(v)}
        renderInput={(params) => (
            <TextField
                {...params}
                label={label}
                slotProps={{
                    input: {
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    },
                }}
            />
        )}
    />
}

export const ReportScore = () => {

    const [loadingUsers, setLoadingUsers] = useState(false);
    const [simpleUsers, setSimpleUsers] = useState<SimpleUser[]>([]);
    const [sets, setSets] = useState<MatchSet[]>([]);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    const [player1a, setPlayer1a] = useState<SimpleUser | null>();
    const [player2a, setPlayer2a] = useState<SimpleUser | null>();
    const [player1b, setPlayer1b] = useState<SimpleUser | null>();
    const [player2b, setPlayer2b] = useState<SimpleUser | null>();

    useEffect(() => {
        setLoadingUsers(true)
        SupabaseUserRepository.fetchSimpleUsers().then(result => {
            setSimpleUsers(result.data ?? []);
        }).finally(() => setLoadingUsers(false))
    }, []);

    const saveScores = () => {
        if (!player1a) {
            setAlertInfo({ message: "Player 1 of Team A not defined", severity: "error" });
            return;
        }
        if (!player2a) {
            setAlertInfo({ message: "Player 2 of Team A not defined", severity: "error" });
            return;
        }
        if (!player1b) {
            setAlertInfo({ message: "Player 1 of Team B not defined", severity: "error" });
            return;
        }
        if (!player2b) {
            setAlertInfo({ message: "Player 2 of Team B not defined", severity: "error" });
            return;
        }
        if (sets.length <= 0) {
            setAlertInfo({ message: "Need at least one recorded set of this match", severity: "error" });
            return;
        }
        for (const set of sets) {
            if (set.team_a_score === 0 && set.team_b_score === 0) {
                setAlertInfo({ message: `Scores need in ${set.set_number} set`, severity: "error" });
                return;
            }
            if (set.team_a_score === set.team_b_score) {
                setAlertInfo({ message: `Cannot have a draw in ${set.set_number} set`, severity: "error" });
                return;
            }
        }
        const [name1a, surname1a = null] = player1a.displayName.split(" ");
        const [name2a, surname2a = null] = player2a.displayName.split(" ");
        const [name1b, surname1b = null] = player1b.displayName.split(" ");
        const [name2b, surname2b = null] = player2b.displayName.split(" ");
        let team_a_name = (surname1a ?? name1a) + "/" + (surname2a ?? name2a);
        let team_b_name = (surname1b ?? name1b) + "/" + (surname2b ?? name2b);
        GamesRepository.reportScores(sets, player1a.userId, player1b.userId, player2a.userId, player2b.userId, team_a_name, team_b_name).then(result => {

        }).catch(error => setAlertInfo({ message: error.message, severity: "error" }))
    }

    return <Layout>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Grid container sx={{ maxWidth: 700 }}>
                <Grid size={6} sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: "bold" }}>Team A</Typography>
                </Grid>
                <Grid size={6} sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: "bold" }}>Team B</Typography>
                </Grid>
                <Grid size={6} sx={{ p: 2 }}>
                    <SelectPlayer label="Player 1" loading={loadingUsers} options={simpleUsers} onSelect={setPlayer1a} />
                </Grid>
                <Grid size={6} sx={{ p: 2 }}>
                    <SelectPlayer label="Player 1" loading={loadingUsers} options={simpleUsers} onSelect={setPlayer1b} />
                </Grid>
                <Grid size={6} sx={{ p: 2 }}>
                    <SelectPlayer label="Player 2" loading={loadingUsers} options={simpleUsers} onSelect={setPlayer2a} />
                </Grid>
                <Grid size={6} sx={{ p: 2 }}>
                    <SelectPlayer label="Player 2" loading={loadingUsers} options={simpleUsers} onSelect={setPlayer2b} />
                </Grid>
                <Grid size={12} sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: "bold" }}>Scores</Typography>
                </Grid>

                {
                    sets.map(x => <>
                        <Grid size={6} sx={{ p: 2 }}>
                            <TextField
                                size="small"
                                type="number"
                                value={x.team_a_score}
                                onChange={(e) => setSets([...(sets.filter(y => y.id !== x.id)), { ...x, team_a_score: Number(e.target.value) }])}
                                label={`Satz ${x.set_number} - Team A`} />
                        </Grid>
                        <Grid size={6} sx={{ p: 2 }}>
                            <TextField
                                size="small"
                                type="number"
                                value={x.team_b_score}
                                onChange={(e) => setSets([...(sets.filter(y => y.id !== x.id)), { ...x, team_b_score: Number(e.target.value) }])}
                                label={`Satz ${x.set_number} - Team B`} />
                        </Grid>
                    </>)
                }
                <Grid size={12} sx={{ p: 2 }}>
                    <Button onClick={() => setSets([...sets, { id: "", created_at: "", set_number: sets.length + 1, match: "", team_a_score: 0, team_b_score: 0 }])}>Neuen Satz erstellen</Button>
                </Grid>
            </Grid>
            <Fab
                key={'addScore'}
                sx={{
                    background: '#66bb6a',
                    color: '#fff',
                    position: 'fixed',
                    right: '16px',
                    bottom: 'calc(16px + env(safe-area-inset-bottom))',
                }}
                onClick={saveScores}>
                <Save />
            </Fab>
            <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
        </Box>
    </Layout>
} 