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

const COLUMNS: GridColDef[] = [
  {
    field: 'at',
    headerName: 'Datum',
    width: 180,
    // Nutze valueGetter für stabile Datenverarbeitung
    valueGetter: (value) => value ? new Date(value) : null,
    valueFormatter: (value) => value ? format(value, 'dd.MM.yyyy HH:mm:ss') : '',
  },
  {
    field: 'table_name',
    headerName: 'Tabelle',
    width: 130,
  },
  {
    field: 'op',
    headerName: 'Operation',
    width: 110,
  },
  {
    field: 'changed_cols',
    headerName: 'Änderungen',
    flex: 150,
    valueFormatter: (value: any) => Array.isArray(value) ? value.join(', ') : '',
  }
];

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
          '--DataGrid-overlayHeight': 'calc(100% - env(safe-area-inset-bottom))',
          height: 'calc(100% - env(safe-area-inset-bottom))',
          '& .MuiDataGrid-virtualScroller': {
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'none',
          },
        }}
        rows={logs.rows}
        columns={COLUMNS}
        rowCount={logs.count}
        loading={isLoading || isFetching}
        slots={{
          noRowsOverlay: NoRowsOverlay
        }}
        // Sorting
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(newModel) => {
          if (newModel.length) setSortModel(newModel);
        }}
        // Filtering
        filterMode='server'
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        // Pagination
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}

        density='compact'
        getRowId={(row) => row.id}
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
    </Layout>
  );
};

export default withTranslation()(LogsList);
