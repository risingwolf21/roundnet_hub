import { Box, Typography } from "@mui/material";
import { captureException } from "@sentry/react";
import React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import Layout from "./layout/Layout";

const ErrorRouteElement = () => {
  const error = useRouteError();

  React.useEffect(() => {
    captureException(error);
  }, [error]);

  return <Layout appBarConfig={{ showProfile: false, navigateBackPath: "/home" }}>
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