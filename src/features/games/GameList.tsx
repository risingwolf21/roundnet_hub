import { Add } from "@mui/icons-material"
import { Box, Fab, List, ListItem, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Layout from "src/components/Layout"
import { GamesRepository } from "src/repository/GamesRepository"

export const GameList = () => {

    const navigate = useNavigate();
    const [matches, setMatches] = useState<FullUserMatch[]>([]);

    useEffect(() => {
        GamesRepository.fetchGamesForUser().then(result => {
            setMatches(result.data ?? [])
        });
    }, []);

    return <Layout>
        <List>

            {
                matches.map(x => <ListItem key={x.id}>
                    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
                        <Box sx={{
                            display: "flex", flexGrow: 1, flexDirection: "column", whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            <Typography sx={{
                                fontSize: '1rem', color: 'rgba(0,0,0,0.87)', whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{x.team_a_name}</Typography>
                            <Typography sx={{
                                fontSize: '1rem', color: 'rgba(0,0,0,0.87)', whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{x.team_b_name}</Typography>
                        </Box>
                        {
                            x.set_results?.split(",").map(y => {
                                const [team_a_score, team_b_score] = y.trim().split(":");
                                let teamAWon = team_a_score > team_b_score;
                                return <Box sx={{
                                    display: "flex", ml: 2, flexDirection: "column"
                                }}>
                                    <Typography sx={{
                                        fontSize: '1rem',
                                        color: `rgba(0,0,0,${teamAWon ? "0.87" : "0.6"})`,
                                        fontWeight: teamAWon ? "bold" : "400"
                                    }}>{team_a_score}</Typography>
                                    <Typography sx={{
                                        fontSize: '1rem',
                                        color: `rgba(0,0,0,${teamAWon ? "0.6" : "0.87"})`,
                                        fontWeight: teamAWon ? "400" : "bold"
                                    }}>{team_b_score}</Typography>
                                </Box>
                            })
                        }
                    </Box>
                </ListItem>)
            }

            {
                matches.length <= 0 && <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
                    <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
                    <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
                </Box>
            }

            <Fab
                key={'addScore'}
                sx={{
                    background: '#66bb6a',
                    color: '#fff',
                    position: 'fixed',
                    right: '16px',
                    bottom: 'calc(16px + env(safe-area-inset-bottom))',
                }}
                onClick={() => navigate("/matches/report")}
            >
                <Add />
            </Fab>

        </List>
    </Layout>
}