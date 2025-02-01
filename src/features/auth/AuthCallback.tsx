import { Box, CircularProgress, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "src/components/services/supabase/supabaseClient";

export const AuthCallback = () => {

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"))
    const refresh_token = params.get("refresh_token");
    if (refresh_token) {
      supabase.auth.refreshSession({ refresh_token }).then(result => console.log("Refreshed session", result))
    }
  }, []);

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
        🐺<br></br>Roundnet Karlsruhe
      </Typography>
      <CircularProgress variant={'indeterminate'} size={50}></CircularProgress>
    </Box>
  );
}