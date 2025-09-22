import Layout from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { supabase } from '@/lib/supabase';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridFilterModel,
  GridPaginationModel,
  GridRowId,
  GridSortModel,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { ErrorBoundary } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SelectTableDialog } from './dialogs/SelectTableDialog';
import { EditEntryDialog } from './EditEntryDialog';
import { ViewEntryDialog } from './ViewEntryDialog';

import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Visibility from '@mui/icons-material/Visibility';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import styled from '@mui/material/styled';
import Toolbar from '@mui/material/Toolbar';

const StyledGridOverlay = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  '& .no-rows-primary': {
    fill: '#3D4751',
    ...theme.applyStyles('light', {
      fill: '#AEB8C2',
    }),
  },
  '& .no-rows-secondary': {
    fill: '#1D2126',
    ...theme.applyStyles('light', {
      fill: '#E8EAED',
    }),
  },
}));

function CustomNoRowsOverlay() {
  return (
    <StyledGridOverlay>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        width={96}
        viewBox="0 0 452 257"
        aria-hidden
        focusable="false"
      >
        <path
          className="no-rows-primary"
          d="M348 69c-46.392 0-84 37.608-84 84s37.608 84 84 84 84-37.608 84-84-37.608-84-84-84Zm-104 84c0-57.438 46.562-104 104-104s104 46.562 104 104-46.562 104-104 104-104-46.562-104-104Z"
        />
        <path
          className="no-rows-primary"
          d="M308.929 113.929c3.905-3.905 10.237-3.905 14.142 0l63.64 63.64c3.905 3.905 3.905 10.236 0 14.142-3.906 3.905-10.237 3.905-14.142 0l-63.64-63.64c-3.905-3.905-3.905-10.237 0-14.142Z"
        />
        <path
          className="no-rows-primary"
          d="M308.929 191.711c-3.905-3.906-3.905-10.237 0-14.142l63.64-63.64c3.905-3.905 10.236-3.905 14.142 0 3.905 3.905 3.905 10.237 0 14.142l-63.64 63.64c-3.905 3.905-10.237 3.905-14.142 0Z"
        />
        <path
          className="no-rows-secondary"
          d="M0 10C0 4.477 4.477 0 10 0h380c5.523 0 10 4.477 10 10s-4.477 10-10 10H10C4.477 20 0 15.523 0 10ZM0 59c0-5.523 4.477-10 10-10h231c5.523 0 10 4.477 10 10s-4.477 10-10 10H10C4.477 69 0 64.523 0 59ZM0 106c0-5.523 4.477-10 10-10h203c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 153c0-5.523 4.477-10 10-10h195.5c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 200c0-5.523 4.477-10 10-10h203c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 247c0-5.523 4.477-10 10-10h231c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10Z"
        />
      </svg>
      <Box sx={{ mt: 2 }}>No rows</Box>
    </StyledGridOverlay>
  );
}

export type Table = { name: string; schema: string };

const SupabaseClient = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const notifications = useNotifications();
  const dialog = useDialogs();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedTableData, setSelectedTableData] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>();
  const [sortModel, setSortModel] = React.useState<GridSortModel>();

  const [columns, setColumns] = useState<
    {
      column_name: string;
      data_type: string;
      is_nullable: boolean;
      foreign_key_schema_name: string;
      foreign_key_table_name: string;
      foreign_key_column_name: string;
    }[]
  >([]);

  const CustomToolbar = () => (
    <Toolbar>
      <Button
        size="small"
        startIcon={<Add />}
        onClick={async () => {
          const result = await dialog.open(EditEntryDialog, { entry: {}, columns });
          if (result && selectedTable) {
            const r = await supabase
              // @ts-ignore
              .schema(selectedTable.schema)
              // @ts-ignore
              .from(selectedTable.name)
              .insert(result)
              .select('*');

            if (!r.error) {
              notifications.show('Erfolgreich erstellt.', { severity: 'success' });
            } else {
              notifications.show('Der Eintrag konnte nicht erstellt werden. ' + r.error.message, { severity: 'error' });
            }
          }
        }}
      >
        Erstellen
      </Button>
    </Toolbar>
  );

  const fetcher = useCallback(
    async (table: Table) => {
      setLoading(true);
      const columnsResult = await supabase.rpc('get_column_info', {
        schema_name: table.schema,
        selected_table: table.name,
      });

      let query = supabase
        // @ts-ignore
        .schema(table.schema)
        // @ts-ignore
        .from(table.name)
        .select('*', { count: 'exact' });

      for (const filter of filterModel?.items ?? []) {
        const { field, operator, value } = filter;
        if (operator === 'contains') {
          query = query.ilike(field, `%${value}%`);
        } else if (operator === '=') {
          query = query.eq(field, value);
        } else if (operator === '!=') {
          query = query.neq(field, value);
        }
        // Weitere Operatoren bei Bedarf
      }

      if (sortModel?.length) {
        for (const sort of sortModel) {
          query = query.order(sort.field, { ascending: sort.sort === 'asc' });
        }
      }

      if (paginationModel) {
        const { page, pageSize } = paginationModel;
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (columnsResult.error || error) {
        notifications.show(columnsResult.error?.message, { severity: 'error' });
        notifications.show(error?.message, { severity: 'error' });
      } else {
        setColumns(columnsResult.data ?? []);
        setRowCount(count ?? 0);
        setSelectedTableData(data);
      }
      setLoading(false);
    },
    [filterModel, paginationModel, sortModel, notifications]
  );

  useEffect(() => {
    supabase
      .rpc('get_public_table_names')
      .select('*')
      .then((result) => {
        if (result.data) {
          setTables(result.data.map((x) => ({ name: x.table_name, schema: x.table_schema })));

          const table = searchParams.get('table');
          const schema = searchParams.get('schema');

          if (
            table &&
            schema &&
            result.data.filter((x) => x.table_name === table && x.table_schema === schema).length > 0
          ) {
            setSelectedTable({ name: table, schema });
          }
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (selectedTable) fetcher(selectedTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel, sortModel, filterModel, selectedTable]);

  const tableSelectionChanged = (table: Table) => {
    setPaginationModel({ page: 0, pageSize: 50 });
    setFilterModel(undefined);
    setSortModel(undefined);
    setSelectedTable(table);
    var newurl =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname +
      `?schema=${table.schema}&table=${table.name}`;
    window.history.pushState({ path: newurl }, '', newurl);
  };

  function getRowId(row: any) {
    switch (selectedTable?.name) {
      case 'event_attendance_user_mapping':
        return row.user + ' ' + row.event;
      case 'group_user_mapping':
        return row.user + ' ' + row.group;
      case 'item_holders':
        return row.key + ' ' + row.user;
      case 'user':
        return row.userId;
      case 'user_calender_settings':
        return row.user;
      case 'players':
        return row.player;
      default:
        return row.id;
    }
  }

  const handleDelete = async (id: GridRowId, row: GridValidRowModel) => {
    let query = supabase
      // @ts-ignore
      .schema(selectedTable?.schema)
      // @ts-ignore
      .from(selectedTable?.name)
      .delete();

    Object.entries(row).forEach((element) => {
      query = query.eq(element[0], element[1]);
    });

    const result = await query;

    if (!result.error) setSelectedTableData(selectedTableData.filter((row) => getRowId(row) !== id));
    else notifications.show('Could not delete row. ' + result.error, { severity: 'error' });
  };

  const handleUpdate = async (id: GridRowId, row: GridValidRowModel, update: any) => {
    let query = supabase
      // @ts-ignore
      .schema(selectedTable?.schema)
      // @ts-ignore
      .from(selectedTable?.name)
      // @ts-ignore
      .update(update);

    Object.entries(row).forEach((element) => {
      query = query.eq(element[0], element[1]);
    });

    const result = await query.select('*');

    if (result.data) {
      const index = selectedTableData.findIndex((row) => getRowId(row) !== id);
      setSelectedTableData([
        ...selectedTableData.slice(0, index),
        { ...result.data },
        ...selectedTableData.slice(index),
      ]);
    } else {
      notifications.show('Could not update row. ' + result.error, { severity: 'error' });
    }
  };

  return (
    <Layout>
      <LoadingIndicator loading={loading} />
      <ListItem
        dense
        onClick={async () => {
          const result = await dialog.open(SelectTableDialog, { tables });
          if (result) tableSelectionChanged(result);
        }}
        secondaryAction={<ExpandMoreOutlined />}
      >
        <ListItemText
          primary={selectedTable?.name ?? 'Nicht gewählt'}
          secondary={selectedTable?.schema ?? 'Nicht gewählt'}
        />
      </ListItem>
      <ErrorBoundary
        fallback={CustomNoRowsOverlay}
        onError={(error) => {
          notifications.show(JSON.stringify(error), { severity: 'error' });
        }}
      >
        <DataGrid
          columns={[
            ...columns.map((x) => {
              return {
                field: x.column_name,
                headerName: x.column_name,
                hideable: true,
                width: 150,
              } as GridColDef;
            }),
          ].concat(
            columns.length > 0
              ? [
                {
                  field: 'actions',
                  type: 'actions',
                  headerName: 'Actions',
                  width: 100,
                  cellClassName: 'actions',
                  getActions: ({ id, row }) => [
                    <GridActionsCellItem
                      icon={<Visibility />}
                      label="View"
                      onClick={async () => {
                        const result = await dialog.open(ViewEntryDialog, { entry: row });
                        if (result === 'delete') {
                          handleDelete(id, row);
                        }
                      }}
                      color="inherit"
                    />,
                    <GridActionsCellItem
                      icon={<Edit />}
                      label="Edit"
                      className="textPrimary"
                      onClick={async () => {
                        const result = await dialog.open(EditEntryDialog, { entry: row, columns });
                        if (result) {
                          handleUpdate(id, row, result);
                        }
                      }}
                      color="inherit"
                    />,
                  ],
                },
              ]
              : []
          )}
          slots={{ noRowsOverlay: CustomNoRowsOverlay, toolbar: CustomToolbar }}
          loading={loading}
          rowCount={rowCount}
          rows={selectedTableData}
          density={'compact'}
          editMode={'row'}
          getRowId={getRowId}
          showCellVerticalBorder
          pagination
          sortingMode="server"
          filterMode="server"
          paginationMode="server"
          paginationModel={paginationModel}
          sortModel={sortModel}
          filterModel={filterModel}
          onPaginationModelChange={setPaginationModel}
          onSortModelChange={setSortModel}
          onFilterModelChange={setFilterModel}
          sx={{
            '--DataGrid-overlayHeight': '300px',
            mb: 'max(56px,env(safe-area-inset-bottom))',
            maxHeight: 'calc(100% - 61px - env(safe-area-inset-bottom))',
          }}
        />
      </ErrorBoundary>
    </Layout>
  );
};
export default SupabaseClient;
