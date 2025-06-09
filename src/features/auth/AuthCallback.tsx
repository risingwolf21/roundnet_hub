import { Box, CircularProgress, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { BRANDING } from "src/utils";

const AuthCallback = () => {

  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    const parsedParams: Map<string, string> = new Map();
    for (const [key, value] of hashParams.entries()) {
      parsedParams.set(key, value)
    }

    supabase.auth.refreshSession({ refresh_token: parsedParams.get("refresh_token")! }).then(result => {
      const provider_token = parsedParams.get("provider_token");
      if (provider_token)
        supabase.auth.updateUser({ data: { provider_token: provider_token } })
    })

  }, [navigate]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography variant="h5" component="div" sx={{ mb: 2, textAlign: 'center' }}>
        🐺<br></br>{BRANDING.title}
      </Typography>
      <CircularProgress variant={'indeterminate'} size={50}></CircularProgress>
    </Box>
  );
}
export default AuthCallback;