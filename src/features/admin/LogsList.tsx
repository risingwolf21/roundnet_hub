import Layout from '@/components/layout/Layout';
import { useLogsList } from '@/tanstack/admin';
import { NoRowsOverlay } from '@/utils/mui-x-data-grid.utils';
import CloseIcon from '@mui/icons-material/Close';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { GridColDef, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid/models';
import { useDialogs } from '@toolpad/core';
import { format } from 'date-fns';
import { useState } from 'react';
import { withTranslation } from 'react-i18next';

const LogsList = () => {
  const dialogs = useDialogs();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    {
      field: 'at',
      sort: 'desc',
    }
  ]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

  const { data: logs = { rows: [], count: 0 }, isLoading, isFetching } = useLogsList({ paginationModel, sortModel, filterModel });

  return (
    <Layout>
      <DataGrid
        sx={{
          '--DataGrid-overlayHeight': '300px',
          mb: 'min(56px,env(safe-area-inset-bottom))',
          height: 'calc(100% - env(safe-area-inset-bottom))',
          '& .MuiDataGrid-virtualScroller': {
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'none',
          },
        }}
        rows={logs.rows}
        columns={logs.rows && logs.rows.length > 0
          ? [
            {
              field: 'at',
              headerName: 'Datum',
              width: 180,
              valueFormatter: (params: any) => format(params, 'dd.MM.yyyy HH:mm:ss'),
            },
            {
              field: 'table_name',
              headerName: 'Tabelle',
              width: 110,
            },
            {
              field: 'op',
              headerName: 'Operation',
              width: 150,
            },
            {
              field: 'changed_cols',
              headerName: 'Geänderte Spalten',
              width: 150,
              valueFormatter: (params: any) => {
                if (Array.isArray(params)) {
                  return params.join(', ');
                }
                return '';
              },
            }
          ] as GridColDef[]
          : [{ field: 'noData', headerName: 'Keine Daten', flex: 1 }]
        }
        loading={isLoading || isFetching}
        slots={{
          noRowsOverlay: NoRowsOverlay
        }}
        rowCount={logs?.count ?? 0}
        paginationMode="server"
        sortingMode='server'
        filterMode='server'
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        density='compact'
        getRowId={(row) => row.id || Object.values(row).join("_")} // Fallback ID
        disableRowSelectionOnClick
        onRowClick={(params) => {
          dialogs.open(
            ({ payload: { log }, open, onClose }) => (
              <Dialog open={open} onClose={onClose} fullScreen>
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
                <List sx={{
                  minHeight: 0,
                  maxWidth: "100vw",
                  overflow: 'auto',
                  overscrollBehavior: 'none',
                }}>
                  {Object.entries(log).map(([key, value]) => (
                    <ListItem key={key} divider>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography sx={{ fontWeight: 'bold' }}>{key}</Typography>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 'small', whiteSpace: 'pre-wrap', maxWidth: "100vw", wordBreak: "break-word" }}>
                          {JSON.stringify(value, null, 2)}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Dialog>
            ),
            { log: params.row }
          );
        }}
      />
      {/* <List>
        {logs?.pages
          .flatMap((page) => page.data)
          .map((log) => (
            <ListItem
              divider
              key={log.id}
              alignItems="flex-start"
              onClick={() => {
                dialogs.open(
                  ({ payload: { log }, open, onClose }) => (
                    <Dialog open={open} onClose={onClose} fullScreen>
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
                              <Typography sx={{ fontFamily: 'monospace', fontSize: 'small', whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(value, null, 2)}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Dialog>
                  ),
                  { log }
                );
              }}
            >
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
          ))}
        {hasNextPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Button variant="contained" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              Load more
            </Button>
          </Box>
        )}
      </List> */}
    </Layout>
  );
};

export default withTranslation()(LogsList);
