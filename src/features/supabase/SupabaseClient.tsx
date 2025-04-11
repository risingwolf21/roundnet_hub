import { Cancel, Delete, Edit, ExpandMoreOutlined, Save } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridColType,
  GridFilterModel,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  GridSlots,
  GridSortModel,
  GridToolbarContainer,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { useNotifications } from '@toolpad/core/useNotifications';
import { isNull, omit, omitBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useClient } from 'react-supabase';
import Layout from 'src/components/Layout';
import { LoadingIndicator } from 'src/components/LoadingIndicator';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { formatDateFromDatabase } from 'src/utils';

interface EditToolbarProps {
  setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
  setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
}

function EditToolbar(props: EditToolbarProps) {
  const { setRows, setRowModesModel } = props;

  const handleClick = () => {
    const id = -1;
    setRows((oldRows) => [...oldRows, { id, isNew: true }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
    }));
  };

  return (
    <GridToolbarContainer>
      <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
        Add record
      </Button>
    </GridToolbarContainer>
  );
}

const SupabaseClient = () => {
  const [tables, setTables] = useState<{ table_name: string, table_schema: string }[]>([]);
  const [enums, setEnums] = useState<Map<string, string[]>>(new Map<string, string[]>());
  const [selectedTable, setSelectedTable] = useState<{ table_name: string, table_schema: string } | null>(null);
  const [selectTableOpen, setSelectTableOpen] = useState(false);
  const client = useClient();
  const notifications = useNotifications();
  const [loading, setLoading] = useState(false);
  const [selectedTableData, setSelectedTableData] = useState<any[]>([]);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({});
  const [rowFilterModel, setRowFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [rowSortModel, setRowSortModel] = React.useState<GridSortModel>();
  const [users, setUsers] = useState<{ displayName: string; userId: string }[]>([]);
  const [groups, setGroups] = useState<{ name: string; id: number }[]>([]);

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
    setLoading(true);
    if (selectedTable)
      supabase
        // @ts-ignore
        .schema(selectedTable.table_schema)
        // @ts-ignore
        .from(selectedTable.table_name)
        .select('*')
        .then((result) => {
          if (result.data) {
            setSelectedTableData(result.data);
            setLoading(false);
          }
        });
  }, [selectedTable, rowSortModel]);

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
  function getRowTypeOptions(key: string): {
    type?: GridColType;
    valueOptions?: any[];
    valueGetter?: (params: any) => any;
    editable?: boolean;
  } | null {
    switch (key) {
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
      case 'previousDrink':
        return {
          type: 'number',
          editable: true,
        };
      case 'user':
      case 'currentUser':
      case 'pastUser':
      case 'userId':
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

    const result = await query;

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
      <ListItem onClick={() => setSelectTableOpen(true)} secondaryAction={<ExpandMoreOutlined />}>
        <ListItemText primary={selectedTable?.table_name} secondary={selectedTable?.table_schema} />
      </ListItem>

      {selectedTableData[0] && (
        <DataGrid
          columns={[
            ...Object.keys(selectedTableData[0]).map((x) => {
              return {
                field: x,
                headerName: x,
                hideable: true,
                width: 150,
                ...getRowTypeOptions(x),
              } as GridColDef;
            }),
            {
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
                    icon={<Edit />}
                    label="Edit"
                    className="textPrimary"
                    onClick={handleEditClick(id)}
                    color="inherit"
                  />,
                  <GridActionsCellItem
                    icon={<Delete />}
                    label="Delete"
                    onClick={handleDeleteClick(id, row)}
                    color="inherit"
                  />,
                ];
              },
            },
          ]}
          slots={{
            toolbar: EditToolbar as GridSlots['toolbar'],
          }}
          slotProps={{
            toolbar: { setRows: setSelectedTableData, setRowModesModel },
          }}
          rows={selectedTableData}
          density={'compact'}
          editMode={'row'}
          rowModesModel={rowModesModel}
          filterModel={rowFilterModel}
          getRowId={getRowId}
          showCellVerticalBorder
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 50,
              },
            },
          }}
          sx={{
            pb: "max(56px,env(safe-area-inset-bottom))"
          }}
          processRowUpdate={processRowUpdate}
          onRowModesModelChange={handleRowModesModelChange}
          onProcessRowUpdateError={(error) => console.log(error)}
        />
      )}

      <SwipeableDialog
        open={selectTableOpen}
        onClose={() => setSelectTableOpen(false)}
        setOpen={() => setSelectTableOpen(true)}
        title={'Tablle auswählen'}
      >
        <List>
          {tables.map((x) => (
            <ListItemButton
              key={x.table_schema + "/" + x.table_name}
              onClick={() => {
                setSelectedTable(x);
                setSelectTableOpen(false);
              }}
            >
              <ListItemText primary={x.table_name} secondary={x.table_schema} />
            </ListItemButton>
          ))}
        </List>
      </SwipeableDialog>
    </Layout>
  );
};
export default SupabaseClient;