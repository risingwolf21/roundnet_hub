import React, {useEffect, useState} from 'react';
import {Button, List, ListItem, ListItemButton, ListItemText} from '@mui/material';
import {useClient} from 'react-supabase';
import {Cancel, Delete, Edit, ExpandMoreOutlined, Save} from '@mui/icons-material';
import {SwipeableDialog} from './SwipeableDialog';
import {LoadingIndicator} from './LoadingIndicator';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridColType,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  GridSlots,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import {AlertMessage, AlertSnackbar} from './AlertSnackbar';
import {isNull, omit, omitBy} from 'lodash';
import {supabase} from './services/supabase/supabaseClient';
import AddIcon from '@mui/icons-material/Add';
import {formatDateFromDatabase} from '../utils';
import Layout from './Layout';

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

export const SupabaseClient = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [enums, setEnums] = useState<Map<string, string[]>>(new Map<string, string[]>());
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectTableOpen, setSelectTableOpen] = useState(false);
  const client = useClient();
  const [loading, setLoading] = useState(false);
  const [selectedTableData, setSelectedTableData] = useState<any[]>([]);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({});
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [users, setUsers] = useState<{ displayName: string; userId: string }[]>([]);
  const [groups, setGroups] = useState<{ name: string; id: number }[]>([]);

  useEffect(() => {
    supabase
      .rpc('get_public_table_names')
      .select('*')
      .then((result) => {
        if (result.data) {
          let loadedTables = result.data as string[];
          setTables(loadedTables);
          setSelectedTable(loadedTables[0] ?? '');
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
    supabase
      // @ts-ignore
      .from(selectedTable)
      .select('*')
      .then((result) => {
        if (result.data) {
          setSelectedTableData(result.data);
          console.log(result.data);
          setLoading(false);
        }
      });
  }, [selectedTable, client]);

  function getRowId(row: any) {
    switch (selectedTable) {
      case 'event_attendance_user_mapping':
        return row.user + ' ' + row.event;
      case 'group_user_mapping':
        return row.user + ' ' + row.group;
      case 'item_holders':
        return row.key + ' ' + row.user;
      case 'user':
        return row.userId;
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
        if (selectedTable === 'items') {
          return {
            type: 'singleSelect',
            valueOptions: enums.get('ItemType'),
            editable: true,
          };
        } else if (selectedTable === 'drink') {
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
            console.log(params);
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
        return {
          type: 'string',
          editable: true,
        };
      case 'price':
      case 'stock':
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

  const handleDeleteClick = (id: GridRowId) => () => {
    setSelectedTableData(selectedTableData.filter((row) => row.id !== id));
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
        .from(selectedTable)
        .insert(omit(updatedRow, ['isNew']))
        .select('*')
        .single()
        .then((result) => {
          if (!result.error) {
            updatedRow = { ...result.data, isNew: false };
            setSelectedTableData(selectedTableData.map((row) => (row.id === -1 ? result.data : row)));
          } else setAlertInfo({ message: result.error.message, severity: 'error' });
        });
    }

    supabase
      // @ts-ignore
      .from(selectedTable)
      .upsert(omit(updatedRow, ['isNew']))
      .then((result) => {
        if (!result.error)
          setSelectedTableData(selectedTableData.map((row) => (row.id === newRow.id ? updatedRow : row)));
        else setAlertInfo({ message: result.error.message, severity: 'error' });
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
        <ListItemText primary={selectedTable} />
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
              getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

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
                    onClick={handleDeleteClick(id)}
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
              key={x}
              onClick={() => {
                setSelectedTable(x);
                setSelectTableOpen(false);
              }}
            >
              <ListItemText primary={x} />
            </ListItemButton>
          ))}
        </List>
      </SwipeableDialog>

      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </Layout>
  );
};
