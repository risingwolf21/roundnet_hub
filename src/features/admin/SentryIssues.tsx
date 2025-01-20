import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import React from "react";
import { useEffect, useState } from "react"
import Layout from "src/components/Layout";
import { SentryIssue, SentryRepository } from "src/repository/SentryRepository"

export const SentryIssueList = () => {
    const [issues, setIssues] = useState<SentryIssue[]>([]);

    useEffect(() => {
        SentryRepository.fetchIssues().then((result) => {
            setIssues(result)
        })
    }, []);

    return <Layout>
        <List>
            {
                issues.length > 0 && issues.map(x => <ListItem>
                    <Box sx={{ display: "flex", flexDirection: "row", width: "100%", paddingRight: 2 }}>
                        <Box sx={{
                            display: "flex", flexGrow: 1, flexDirection: "column", whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            <Typography sx={{
                                fontSize: '1rem', color: 'rgba(0,0,0,0.87)', whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{x.title}</Typography>
                            <Typography sx={{
                                fontSize: '0.875rem', color: 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{x.culprit}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", width: "10%", flexDirection: "column", alignItems: "end", justifyContent: "center" }}>
                            <Typography sx={{ fontSize: '18pt', color: 'rgba(0,0,0,0.87)' }}>{x.count}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", width: "10%", flexDirection: "column", alignItems: "end", justifyContent: "center" }}>
                            <Typography sx={{ fontSize: '18pt', color: 'rgba(0,0,0,0.87)' }}>{x.count}</Typography>
                        </Box>
                    </Box>
                </ListItem>)
            }
            {
                issues.length <= 0 && <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
                    <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
                    <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
                </Box>
            }
        </List>
    </Layout >
}