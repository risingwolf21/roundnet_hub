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
                    <ListItemText primary={x.title} secondary={x.culprit} />
                </ListItem>)
            }
            {
                issues.length <= 0 && <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
                    <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
                    <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
                </Box>
            }
        </List>
    </Layout>
}