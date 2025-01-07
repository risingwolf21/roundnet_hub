import { Autocomplete, Box, Grid2 as Grid, Select, TextField, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import Layout from "src/components/Layout"
import { SupabaseUserRepository } from "src/repository/UserRepository";

export const ReportScore = () => {

    const [loadingUsers, setLoadingUsers] = useState(false);
    const [simpleUsers, setSimpleUsers] = useState<SimpleUser[]>([])

    useEffect(() => {
        setLoadingUsers(true)
        SupabaseUserRepository.fetchSimpleUsers().then(result => {
            setSimpleUsers(result.data ?? []);
        }).finally(() => setLoadingUsers(false))
    }, []);

    return <Layout>
        <Grid container>
            <Grid size={6} sx={{ p: 2, alignItems: "center" }}>
                <Typography sx={{fontWeight: "bold"}}>Team A</Typography>
            </Grid>
            <Grid size={6} sx={{ p: 2, alignItems: "center" }}>
                <Typography sx={{fontWeight: "bold"}}>Team B</Typography>
            </Grid>
            <Grid size={6} sx={{ p: 2 }}>
                <Autocomplete
                    disablePortal
                    fullWidth
                    disabled={loadingUsers}
                    options={simpleUsers}
                    getOptionLabel={(option) => option.displayName}
                    renderInput={(params) => <TextField {...params} size="small" label="Player 1" />}
                />
            </Grid>
            <Grid size={6} sx={{ p: 2 }}>
                <Autocomplete
                    disablePortal
                    fullWidth
                    disabled={loadingUsers}
                    options={simpleUsers}
                    getOptionLabel={(option) => option.displayName}
                    renderInput={(params) => <TextField {...params} size="small" label="Player 1" />}
                />
            </Grid>
            <Grid size={6} sx={{ p: 2 }}>
                <Autocomplete
                    disablePortal
                    fullWidth
                    disabled={loadingUsers}
                    options={simpleUsers}
                    getOptionLabel={(option) => option.displayName}
                    renderInput={(params) => <TextField {...params} size="small" label="Player 1" />}
                />
            </Grid>
            <Grid size={6} sx={{ p: 2 }}>
                <Autocomplete
                    disablePortal
                    fullWidth
                    disabled={loadingUsers}
                    options={simpleUsers}
                    getOptionLabel={(option) => option.displayName}
                    renderInput={(params) => <TextField {...params} size="small" label="Player 1" />}
                />
            </Grid>
        </Grid>
    </Layout>
}