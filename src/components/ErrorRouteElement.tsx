import React from "react";
import { isRouteErrorResponse, Navigate, useRouteError } from "react-router"
import { useApplication } from "src/features/auth/AuthContext";
import Layout from "./Layout";
import { Box, Typography } from "@mui/material";

const ErrorRouteElement = () => {
  const error = useRouteError();
  const { user } = useApplication();

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout appBarConfig={{ showProfile: false }}>
    <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⚠️404⚠️</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold', textAlign: "center" }}>Die Seite wurde nicht gefunden</Typography>
      <Typography sx={{ fontSize: '14pt', fontWeight: 'bold', textAlign: "center" }}>
        {
          isRouteErrorResponse(error) ? error.data || error.statusText : "Unknown error message"
        }
      </Typography>
    </Box>
  </Layout>
}
export default ErrorRouteElement;