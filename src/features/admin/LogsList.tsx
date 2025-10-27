import Layout from "@/components/layout/Layout";
import { useInfiniteLogsList } from "@/tanstack/admin";
import CloseIcon from '@mui/icons-material/Close';
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useDialogs } from "@toolpad/core";
import { TFunction } from "i18next";
import { withTranslation } from "react-i18next";

const LogsList = ({ t }: { t: TFunction }) => {
  const dialogs = useDialogs();
  const {
    data: logs,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteLogsList();

  if (isLoading) {
    return <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />;
  }

  if ((logs?.pages.flatMap((x) => x.data) ?? []).length <= 0) {
    return (
      <Layout>
        <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
          <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
          <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
        </Box>
      </Layout>
    );
  }

  return <Layout>
    <List>
      {
        logs?.pages.flatMap(page => page.data).map(log => (
          <ListItem divider key={log.id} alignItems="flex-start" onClick={() => {
            dialogs.open(({ payload: { log }, open, onClose }) => <Dialog open={open} onClose={onClose} fullScreen>
              <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
                <Toolbar>
                  <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                    <CloseIcon />
                  </IconButton>
                  <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                    Log Eintrag
                  </Typography>
                </Toolbar>
              </AppBar>
              <List>
                {Object.entries(log).map(([key, value]) => (
                  <ListItem key={key} divider>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography sx={{ fontWeight: 'bold' }}>{key}</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: "small", whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(value, null, 2)}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Dialog>, { log })
          }}>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'start',
                alignContent: 'start',
                mt: '6px',
                mb: '6px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <Typography
                  style={{
                    fontWeight: 'bold',
                    fontSize: '10pt',
                    color: 'rgba(0,0,0,0.8)',
                  }}
                >
                  {log.schema_name}.{log.table_name} - {log.op}
                </Typography>
                <Typography
                  style={{
                    fontSize: '10pt',
                    color: 'rgba(0,0,0,0.6)',
                  }}
                >
                  {t('format.distanceToNow', { date: new Date(log.at) })}
                </Typography>
              </Box>
              <Typography
                sx={{
                  margin: 0,
                  fontFamily: '"Roboto", "Helvetica", "Arial"," sans-serif"',
                  fontWeight: 400,
                  fontSize: '0.875rem',
                  lineHeight: '1.43',
                  color: 'rgba(0, 0, 0, 0.6)',
                }}
              >
                {log.changed_cols.join(', ')}
              </Typography>
            </Box>
          </ListItem>
        ))
      }
      {
        hasNextPage && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button variant="contained" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>Load more</Button>
        </Box>
      }
    </List>
  </Layout>
};

export default withTranslation()(LogsList);