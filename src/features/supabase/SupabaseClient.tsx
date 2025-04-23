import { Cancel, Edit, ExpandMoreOutlined, Save, Visibility } from '@mui/icons-material';
import { Box, List, ListItem, ListItemButton, ListItemText, ListSubheader, styled } from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridColType,
  GridFilterModel,
  GridPaginationModel,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridSortModel,
  GridValidRowModel
} from '@mui/x-data-grid';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import { groupBy, isNull, omit, omitBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useClient } from 'react-supabase';
import Layout from 'src/components/Layout';
import { LoadingIndicator } from 'src/components/LoadingIndicator';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { formatDateFromDatabase } from 'src/utils';
import { EditEntryDialog } from './EditEntryDialog';
import { ViewEntryDialog } from './ViewEntryDialog';

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

const SupabaseClient = () => {
  const [tables, setTables] = useState<{ table_name: string, table_schema: string }[]>([]);
  const [enums, setEnums] = useState<Map<string, string[]>>(new Map<string, string[]>());
  const [selectedTable, setSelectedTable] = useState<{ table_name: string, table_schema: string } | null>(null);
  const [selectTableOpen, setSelectTableOpen] = useState(false);
  const client = useClient();
  const notifications = useNotifications();
  const dialog = useDialogs();
  const [loading, setLoading] = useState(false);
  const [selectedTableData, setSelectedTableData] = useState<any[]>([]);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({});
  const [users, setUsers] = useState<{ displayName: string; userId: string }[]>([]);
  const [groups, setGroups] = useState<{ name: string; id: number }[]>([]);
  const [rowCount, setRowCount] = useState(0);

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>();
  const [sortModel, setSortModel] = React.useState<GridSortModel>();

  const [columns, setColumns] = useState<{
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    foreign_key_schema_name: string;
    foreign_key_table_name: string;
    foreign_key_column_name: string;
  }[]>([]);

  const fetcher = async (table_name: string, table_schema: string) => {
    setLoading(true); 
    const columnsResult = await supabase.rpc("get_column_info", { schema_name: table_schema, selected_table: table_name });

    let query = supabase
      // @ts-ignore
      .schema(table_schema)
      // @ts-ignore
      .from(table_name)
      .select('*', { count: "exact" });

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
      notifications.show(columnsResult.error?.message, { severity: "error" });
      notifications.show(error?.message, { severity: "error" });
    } else {
      setColumns(columnsResult.data ?? []);
      setRowCount(count ?? 0);
      setSelectedTableData(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase
      .rpc('get_public_table_names')
      .select('*')
      .then((result) => {
        if (result.data) {
          setTables(result.data);
          setSelectedTable(result.data[0] ?? null);
        }
      });
    supabase
      .rpc('get_enum_types')
      .select('*')
      .then((result) => {
        if (result.data) {
          let loaded = new Map<string, string[]>();
          result.data.forEach((x) => loaded.set(x.enum_name, x.enum_values));
          setEnums(loaded);
        }
      });
    supabase
      .from('user')
      .select('displayName,userId')
      .returns<
        {
          displayName: string;
          userId: string;
        }[]
      >()
      .then((result) => {
        setUsers(result.data ?? []);
      });
    supabase
      .from('event_group')
      .select('*')
      .returns<{ name: string; id: number }[]>()
      .then((result) => {
        setGroups(result.data ?? []);
      });
  }, [client]);

  useEffect(() => {
    if (selectedTable)
      fetcher(selectedTable.table_name, selectedTable.table_schema)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel, sortModel, filterModel])

  const tableSelectionChanged = (table_name: string, table_schema: string) => {
    setPaginationModel({ page: 0, pageSize: 50 });
    setFilterModel(undefined);
    setSortModel(undefined);
    setSelectedTable({ table_name, table_schema });
    fetcher(table_name, table_schema);
  }

  function getRowId(row: any) {
    switch (selectedTable?.table_name) {
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
      default:
        return row.id;
    }
  }

  // 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'singleSelect' | 'actions';
  function getRowTypeOptions(key: {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
  }): {
    type?: GridColType;
    valueOptions?: any[];
    valueGetter?: (params: any) => any;
    editable?: boolean;
  } | null {
    switch (key.column_name) {
      case 'type':
        if (selectedTable?.table_name === 'items') {
          return {
            type: 'singleSelect',
            valueOptions: enums.get('ItemType'),
            editable: true,
          };
        } else if (selectedTable?.table_name === 'drink') {
          return {
            type: 'singleSelect',
            valueOptions: enums.get('ProductType'),
            editable: true,
          };
        } else {
          return { editable: false };
        }
      case 'paymentState':
        return {
          type: 'singleSelect',
          valueOptions: enums.get('PaymentState'),
          editable: true,
        };
      case 'state':
        return {
          type: 'singleSelect',
          valueOptions: enums.get('EventAttendance'),
          editable: true,
        };
      case 'recurrence':
        return {
          type: 'singleSelect',
          valueOptions: enums.get('EventRecurrence'),
          editable: true,
        };
      case 'role':
        return {
          type: 'singleSelect',
          valueOptions: enums.get('UserRole'),
          editable: true,
        };
      case 'created_at':
      case 'lastUpdate':
      case 'meetingDateTime':
      case 'startingDateTime':
      case 'answerDeadline':
      case 'endDateTime':
      case 'recurrenceEnd':
        return {
          type: 'dateTime',
          valueGetter: (params) => {
            return params ? formatDateFromDatabase(params) : null;
          },
          editable: true,
        };
      case 'active':
      case 'deleted':
      case 'isCancelled':
      case 'verified':
      case 'disabled':
        return {
          type: 'boolean',
          editable: true,
        };
      case 'displayName':
      case 'description':
      case 'color':
      case 'imageUrl':
      case 'name':
      case 'body':
      case 'title':
        return {
          type: 'string',
          editable: true,
        };
      case 'price':
      case 'stock':
      case 'minutes_to_remind':
        return {
          type: 'number',
          editable: true,
        };
      case 'user':
      case 'author':
      case 'currentUser':
      case 'pastUser':
      case 'current_holder':
        return {
          type: 'singleSelect',
          editable: true,
          valueOptions: users.map((x) => ({
            value: x.userId,
            label: x.displayName,
          })),
          valueGetter: (params) => users.find((x) => x.userId === params)?.userId ?? 'Not found',
        };
      case 'group':
        return {
          type: 'singleSelect',
          editable: true,
          valueOptions: groups.map((x) => ({
            value: x.id,
            label: x.name,
          })),
          valueGetter: (params) => groups.find((x) => x.id === params)?.id,
        };
      case 'drink':
      case 'event':
      case 'payment':
      case 'key':
      case 'place':
      default:
        return { editable: false };
    }
  }

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id: GridRowId, row: GridValidRowModel) => async () => {

    let query = supabase
      // @ts-ignore
      .schema(selectedTable?.table_schema)
      // @ts-ignore
      .from(selectedTable?.table_name)
      .delete()

    Object.entries(row).forEach(element => {
      query = query.eq(element[0], element[1])
    });

    await query;

    setSelectedTableData(selectedTableData.filter((row) => getRowId(row) !== id));
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = selectedTableData.find((row) => row.id === id);
    if (editedRow && editedRow!.isNew) {
      setSelectedTableData(selectedTableData.filter((row) => row.id !== id));
    }
  };

  const processRowUpdate = (newRow: GridRowModel) => {
    let updatedRow = { ...newRow, isNew: false };

    // @ts-ignore
    if (updatedRow['id'] === -1) {
      // @ts-ignore
      updatedRow = omitBy(omit(updatedRow, ['id']), isNull);
      supabase
        // @ts-ignore
        .schema(selectedTable?.table_schema)
        // @ts-ignore
        .from(selectedTable?.table_name)
        // @ts-ignore
        .insert(omit(updatedRow, ['isNew']))
        .select('*')
        .single()
        .then((result) => {
          if (!result.error) {
            // @ts-ignore
            updatedRow = { ...result.data, isNew: false };
            setSelectedTableData(selectedTableData.map((row) => (row.id === -1 ? result.data : row)));
          } else notifications.show(result.error.message, { severity: 'error' });
        });
    }

    supabase
      // @ts-ignore
      .schema(selectedTable?.table_schema)
      // @ts-ignore
      .from(selectedTable?.table_name)
      // @ts-ignore
      .upsert(omit(updatedRow, ['isNew']))
      .then((result) => {
        if (!result.error)
          setSelectedTableData(selectedTableData.map((row) => (row.id === newRow.id ? updatedRow : row)));
        else notifications.show(result.error.message, { severity: 'error' });
      });
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  return (
    <Layout>
      <LoadingIndicator loading={loading} />
      <ListItem dense onClick={() => setSelectTableOpen(true)} secondaryAction={<ExpandMoreOutlined />}>
        <ListItemText primary={selectedTable?.table_name} secondary={selectedTable?.table_schema} />
      </ListItem>

      <DataGrid
        columns={[
          ...columns.map((x) => {
            return {
              field: x.column_name,
              headerName: x.column_name,
              hideable: true,
              width: 150,
              ...getRowTypeOptions(x),
            } as GridColDef;
          })
        ].concat(columns.length > 0 ? [{
          field: 'actions',
          type: 'actions',
          headerName: 'Actions',
          width: 100,
          cellClassName: 'actions',
          getActions: ({ id, row }) => {
            const isInEditMode = row.mode === GridRowModes.Edit;

            if (isInEditMode) {
              return [
                <GridActionsCellItem
                  icon={<Save />}
                  label="Save"
                  sx={{
                    color: 'primary.main',
                  }}
                  onClick={handleSaveClick(id)}
                />,
                <GridActionsCellItem
                  icon={<Cancel />}
                  label="Cancel"
                  className="textPrimary"
                  onClick={handleCancelClick(id)}
                  color="inherit"
                />,
              ];
            }

            return [
              <GridActionsCellItem
                icon={<Visibility />}
                label="View"
                onClick={async () => {
                  const result = await dialog.open(ViewEntryDialog, { entry: row });
                  if (result === "delete") {
                    handleDeleteClick(id, row)
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
                  if(result)
                    console.log(result)
                }}
                color="inherit"
              />
            ];
          },
        }] : [])}
        slots={{ noRowsOverlay: CustomNoRowsOverlay }}
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
          mb: "max(56px,env(safe-area-inset-bottom))",
          maxHeight: "calc(100% - 61px)"
        }}
        processRowUpdate={processRowUpdate}
        onRowModesModelChange={handleRowModesModelChange}
      />

      <SwipeableDialog
        open={selectTableOpen}
        onClose={() => setSelectTableOpen(false)}
        setOpen={() => setSelectTableOpen(true)}
        title={'Tablle auswählen'}
      >
        <List>
          {Object.entries(groupBy(tables, (x) => x.table_schema)).map(([key, values]) => (
            <List subheader={<ListSubheader sx={{ fontWeight: "bold", fontSize: "1rem" }}>{key}</ListSubheader>}>
              {
                values.sort((a, b) => a.table_name.localeCompare(b.table_name)).map(x => <ListItemButton
                  divider
                  key={x.table_schema + "/" + x.table_name}
                  onClick={() => {
                    tableSelectionChanged(x.table_name, x.table_schema);
                    setSelectTableOpen(false);
                  }}
                >
                  <ListItemText primary={x.table_name} secondary={x.table_schema} />
                </ListItemButton>)
              }
            </List>
          ))}
        </List>
      </SwipeableDialog>
    </Layout>
  );
};
export default SupabaseClient;